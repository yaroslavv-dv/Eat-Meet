import { createContext, useContext, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';

import { localRepository, type AppRepository } from '@/data/repository';
import { createSeedData } from '@/data/seed';
import * as A from '@/domain/actions';
import type { DinnerDraft } from '@/domain/rules';
import { checkBookable } from '@/domain/rules';
import type { AppData, AppMode, ID, Preferences, Result, ShoppingItemState, User } from '@/domain/types';
import { paymentProvider } from '@/services/payments';

type Status = 'loading' | 'ready' | 'error';

export interface StoreActions {
  completeOnboarding(userId: ID, mode: AppMode): void;
  switchProfile(userId: ID, mode: AppMode): void;
  setMode(mode: AppMode): void;
  replayOnboarding(): void;
  updatePreferences(preferences: Preferences): Result<void>;
  saveDraft(draft: DinnerDraft, existingId?: ID): Result<{ dinnerId: ID }>;
  publishDinner(draft: DinnerDraft, existingId?: ID): Result<{ dinnerId: ID }>;
  deleteDraft(dinnerId: ID): Result<void>;
  cancelDinner(dinnerId: ID): Result<void>;
  reserveSeat(input: Omit<A.ReservationInput, 'guestId'>): Promise<Result<{ reservationId: ID; reference: string }>>;
  cancelReservation(reservationId: ID): Result<void>;
  submitReview(input: Omit<A.ReviewInput, 'guestId'>): Result<void>;
  completeDinner(input: Omit<A.CompletionInput, 'hostId'>): Result<void>;
  updateShoppingItem(dinnerId: ID, ingredientId: ID, patch: Partial<ShoppingItemState>): Result<void>;
  fileConcern(input: Omit<Parameters<typeof A.fileConcern>[1], 'reporterId'>): Result<void>;
  resetDemo(): Promise<void>;
}

interface StoreValue {
  status: Status;
  error: string | null;
  data: AppData;
  /** Shared clock, refreshed every 30 s, so time-based statuses stay current. */
  now: Date;
  currentUser: User;
  mode: AppMode;
  persistError: string | null;
  actions: StoreActions;
  retry(): void;
}

const StoreContext = createContext<StoreValue | null>(null);

export interface StoreFallbackProps {
  status: Status;
  error: string | null;
  retry: () => void;
  reset: () => void;
}

export function AppStoreProvider({
  children,
  repository = localRepository,
  fallback,
}: {
  children: ReactNode;
  repository?: AppRepository;
  /** Rendered while loading or after a load error. */
  fallback: ComponentType<StoreFallbackProps>;
}) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [attempt, setAttempt] = useState(0);
  const dataRef = useRef<AppData | null>(null);
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  // Load persisted demo data, or seed it on first launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await repository.load();
        const initial = stored ?? createSeedData(new Date());
        if (!stored) await repository.save(initial);
        if (cancelled) return;
        dataRef.current = initial;
        setData(initial);
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not load the demo data.');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, attempt]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const commit = (next: AppData) => {
    dataRef.current = next;
    setData(next);
    setNow(new Date());
    saveChain.current = saveChain.current
      .then(() => repository.save(next))
      .then(() => setPersistError(null))
      .catch((e: unknown) => setPersistError(e instanceof Error ? e.message : 'Saving failed.'));
  };

  const current = () => {
    if (!dataRef.current) throw new Error('Store not ready');
    return dataRef.current;
  };

  const voidResult = (r: Result<AppData>): Result<void> => {
    if (!r.ok) return r;
    commit(r.value);
    return { ok: true, value: undefined };
  };

  const resetAll = async () => {
    const session = dataRef.current?.session;
    const fresh = createSeedData(new Date());
    const next: AppData = session
      ? { ...fresh, session: { ...fresh.session, onboarded: session.onboarded, adultConfirmed: session.adultConfirmed, mode: session.mode, currentUserId: fresh.users[session.currentUserId] ? session.currentUserId : fresh.session.currentUserId } }
      : fresh;
    await repository.save(next);
    dataRef.current = next;
    setData(next);
    setNow(new Date());
    setError(null);
    setStatus('ready');
  };

  const actions: StoreActions = {
    completeOnboarding(userId, mode) {
      commit(A.setSession(current(), { currentUserId: userId, mode, onboarded: true, adultConfirmed: true }));
    },
    switchProfile(userId, mode) {
      const r = A.switchProfile(current(), userId, mode);
      if (r.ok) commit(r.value);
    },
    setMode(mode) {
      commit(A.setSession(current(), { mode }));
    },
    replayOnboarding() {
      commit(A.setSession(current(), { onboarded: false }));
    },
    updatePreferences(preferences) {
      const d = current();
      return voidResult(A.updatePreferences(d, d.session.currentUserId, preferences));
    },
    saveDraft(draft, existingId) {
      const d = current();
      const r = A.saveDraft(d, d.session.currentUserId, draft, new Date(), existingId);
      if (!r.ok) return r;
      commit(r.value.data);
      return { ok: true, value: { dinnerId: r.value.dinnerId } };
    },
    publishDinner(draft, existingId) {
      const d = current();
      const r = A.publishDinner(d, d.session.currentUserId, draft, new Date(), existingId);
      if (!r.ok) return r;
      commit(r.value.data);
      return { ok: true, value: { dinnerId: r.value.dinnerId } };
    },
    deleteDraft(dinnerId) {
      const d = current();
      return voidResult(A.deleteDraft(d, d.session.currentUserId, dinnerId));
    },
    cancelDinner(dinnerId) {
      const d = current();
      return voidResult(A.cancelDinner(d, d.session.currentUserId, dinnerId, new Date()));
    },
    async reserveSeat(input) {
      const before = current();
      const guestId = before.session.currentUserId;
      // Validate before "charging" so a simulated contribution is never created for an impossible booking.
      const check = checkBookable(before, input.dinnerId, guestId, new Date());
      if (!check.ok) return { ok: false, error: check.message };
      const dinner = before.dinners[input.dinnerId];
      let reference: string;
      try {
        const auth = await paymentProvider.authorizeContribution({
          dinnerId: input.dinnerId,
          guestId,
          amountCents: dinner.pricing?.totalPerGuestCents ?? 0,
        });
        reference = auth.providerReference;
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'The demo contribution could not be confirmed.' };
      }
      // Re-run against the latest state – another action may have happened while waiting.
      const r = A.reserveSeat(current(), { ...input, guestId }, { providerReference: reference }, new Date());
      if (!r.ok) return r;
      commit(r.value.data);
      return { ok: true, value: { reservationId: r.value.reservationId, reference } };
    },
    cancelReservation(reservationId) {
      const d = current();
      return voidResult(A.cancelReservation(d, reservationId, d.session.currentUserId, new Date()));
    },
    submitReview(input) {
      const d = current();
      return voidResult(A.submitReview(d, { ...input, guestId: d.session.currentUserId }, new Date()));
    },
    completeDinner(input) {
      const d = current();
      return voidResult(A.completeDinner(d, { ...input, hostId: d.session.currentUserId }, new Date()));
    },
    updateShoppingItem(dinnerId, ingredientId, patch) {
      const d = current();
      return voidResult(A.updateShoppingItem(d, d.session.currentUserId, dinnerId, ingredientId, patch));
    },
    fileConcern(input) {
      const d = current();
      return voidResult(A.fileConcern(d, { ...input, reporterId: d.session.currentUserId }, new Date()));
    },
    resetDemo: resetAll,
  };

  if (status !== 'ready' || !data) {
    const Fallback = fallback;
    return (
      <Fallback
        status={status}
        error={error}
        retry={() => {
          setStatus('loading');
          setAttempt((n) => n + 1);
        }}
        reset={() => {
          resetAll().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Reset failed.'));
        }}
      />
    );
  }

  const currentUser = data.users[data.session.currentUserId] ?? Object.values(data.users)[0];

  return (
    <StoreContext.Provider
      value={{
        status,
        error,
        data,
        now,
        currentUser,
        mode: data.session.mode,
        persistError,
        actions,
        retry: () => setAttempt((n) => n + 1),
      }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside AppStoreProvider');
  return value;
}
