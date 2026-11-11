/**
 * Pure business actions. Each takes the current AppData and returns a new
 * AppData (never mutating the input) or an error. The store calls these; a
 * future backend would run the same rules server-side.
 */
import { assessCompatibility } from './compatibility';
import { computePricing } from './pricing';
import {
  cancellationQuote,
  checkBookable,
  completionEligibility,
  draftIsPublishable,
  hostCancellationEligibility,
  reviewEligibility,
  validateDraft,
  type DinnerDraft,
} from './rules';
import { reservationsForDinner } from './selectors';
import type {
  AppData,
  AppMode,
  ConcernReason,
  Contribution,
  Dinner,
  ID,
  LeftoverHandling,
  Preferences,
  Reservation,
  Result,
  Review,
  ShoppingItemState,
} from './types';

export function makeId(prefix: string): ID {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });

// ---------------------------------------------------------------------------
// Session & profile
// ---------------------------------------------------------------------------

export function setSession(data: AppData, patch: Partial<AppData['session']>): AppData {
  return { ...data, session: { ...data.session, ...patch } };
}

export function switchProfile(data: AppData, userId: ID, mode: AppMode): Result<AppData> {
  if (!data.users[userId]) return fail('Unknown profile.');
  return ok(setSession(data, { currentUserId: userId, mode }));
}

export function updatePreferences(data: AppData, userId: ID, preferences: Preferences): Result<AppData> {
  const user = data.users[userId];
  if (!user) return fail('Unknown profile.');
  return ok({ ...data, users: { ...data.users, [userId]: { ...user, preferences } } });
}

// ---------------------------------------------------------------------------
// Dinners (host)
// ---------------------------------------------------------------------------

function applyDraft(base: Dinner, draft: DinnerDraft, nowIso: string): Dinner {
  // Keep shopping state only for ingredients that still exist.
  const ids = new Set(draft.ingredients.map((i) => i.id));
  const shopping = Object.fromEntries(Object.entries(base.shopping).filter(([id]) => ids.has(id)));
  return { ...base, ...draft, shopping, updatedAt: nowIso };
}

function emptyDinner(id: ID, hostId: ID, nowIso: string): Dinner {
  return {
    id,
    hostId,
    status: 'draft',
    title: '',
    description: '',
    startsAt: nowIso,
    durationMinutes: 150,
    neighborhood: 'Binnenstad',
    areaHint: '',
    privateAddress: '',
    guestSeats: 4,
    hostEats: true,
    mealImage: null,
    tableImage: null,
    menu: { mainDish: '', sides: [], dessert: '', drinks: '' },
    ingredients: [],
    diet: 'vegetarian',
    dietaryTags: [],
    extraAllergens: [],
    alcohol: 'alcohol_free',
    social: 'eat_meet',
    ageGroup: 'any',
    houseRules: [],
    hostCompensationCents: 0,
    pricing: null,
    shopping: {},
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function saveDraft(
  data: AppData,
  hostId: ID,
  draft: DinnerDraft,
  now: Date,
  existingId?: ID,
): Result<{ data: AppData; dinnerId: ID }> {
  const nowIso = now.toISOString();
  const existing = existingId ? data.dinners[existingId] : undefined;
  if (existing && (existing.hostId !== hostId || existing.status !== 'draft'))
    return fail('Only your own drafts can be edited.');
  const id = existing?.id ?? makeId('din');
  const dinner = applyDraft(existing ?? emptyDinner(id, hostId, nowIso), draft, nowIso);
  return ok({ data: { ...data, dinners: { ...data.dinners, [id]: dinner } }, dinnerId: id });
}

export function publishDinner(
  data: AppData,
  hostId: ID,
  draft: DinnerDraft,
  now: Date,
  existingDraftId?: ID,
): Result<{ data: AppData; dinnerId: ID }> {
  if (!draftIsPublishable(draft, now)) {
    const firstError = Object.values(validateDraft(draft, now))
      .flatMap((errors) => Object.values(errors))
      .at(0);
    return fail(firstError ?? 'Please complete all required fields.');
  }
  const saved = saveDraft(data, hostId, draft, now, existingDraftId);
  if (!saved.ok) return saved;
  const nowIso = now.toISOString();
  const dinner = saved.value.data.dinners[saved.value.dinnerId];
  const published: Dinner = {
    ...dinner,
    status: 'published',
    pricing: computePricing(draft),
    publishedAt: nowIso,
    updatedAt: nowIso,
  };
  return ok({
    data: { ...saved.value.data, dinners: { ...saved.value.data.dinners, [published.id]: published } },
    dinnerId: published.id,
  });
}

export function deleteDraft(data: AppData, hostId: ID, dinnerId: ID): Result<AppData> {
  const dinner = data.dinners[dinnerId];
  if (!dinner || dinner.hostId !== hostId || dinner.status !== 'draft') return fail('Draft not found.');
  const dinners = { ...data.dinners };
  delete dinners[dinnerId];
  return ok({ ...data, dinners });
}

export function cancelDinner(data: AppData, hostId: ID, dinnerId: ID, now: Date): Result<AppData> {
  const dinner = data.dinners[dinnerId];
  if (!dinner || dinner.hostId !== hostId) return fail('Dinner not found.');
  const eligibility = hostCancellationEligibility(dinner, now);
  if (!eligibility.allowed) return fail(eligibility.reason);
  const nowIso = now.toISOString();
  const reservations = { ...data.reservations };
  const contributions = { ...data.contributions };
  reservationsForDinner(data, dinnerId)
    .filter((r) => r.status === 'confirmed')
    .forEach((r) => {
      reservations[r.id] = { ...r, status: 'cancelled', cancelledAt: nowIso, cancelledBy: 'host' };
      const c = contributions[r.contributionId];
      if (c) contributions[c.id] = { ...c, refundedCents: c.totalCents, status: 'demo_refunded', updatedAt: nowIso };
    });
  return ok({
    ...data,
    reservations,
    contributions,
    dinners: { ...data.dinners, [dinnerId]: { ...dinner, status: 'cancelled', cancelledAt: nowIso, updatedAt: nowIso } },
  });
}

export function updateShoppingItem(
  data: AppData,
  hostId: ID,
  dinnerId: ID,
  ingredientId: ID,
  patch: Partial<ShoppingItemState>,
): Result<AppData> {
  const dinner = data.dinners[dinnerId];
  if (!dinner || dinner.hostId !== hostId) return fail('Dinner not found.');
  if (patch.actualCostCents != null && (patch.actualCostCents < 0 || !Number.isInteger(patch.actualCostCents)))
    return fail('Enter a valid amount.');
  const current = dinner.shopping[ingredientId] ?? { purchased: false };
  const next: ShoppingItemState = { ...current, ...patch };
  if ('actualCostCents' in patch && patch.actualCostCents === undefined) delete next.actualCostCents;
  return ok({
    ...data,
    dinners: {
      ...data.dinners,
      [dinnerId]: { ...dinner, shopping: { ...dinner.shopping, [ingredientId]: next } },
    },
  });
}

export interface CompletionInput {
  dinnerId: ID;
  hostId: ID;
  /** reservationId → attended? */
  attendance: Record<ID, boolean>;
  /** Defaults to attended guests plus the host when omitted. */
  actualDiners?: number;
  portionsPrepared: number;
  portionsServed: number;
  leftoverPortions: number;
  leftoverHandling: LeftoverHandling;
  notes: string;
  estimatedBudgetCents: number;
  actualSpendCents: number | null;
}

export function completeDinner(data: AppData, input: CompletionInput, now: Date): Result<AppData> {
  const dinner = data.dinners[input.dinnerId];
  if (!dinner || dinner.hostId !== input.hostId) return fail('Dinner not found.');
  const eligibility = completionEligibility(dinner, now);
  if (!eligibility.allowed) return fail(eligibility.reason);
  const numbers = [input.portionsPrepared, input.portionsServed, input.leftoverPortions];
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) return fail('Portions cannot be negative.');
  if (input.portionsServed > input.portionsPrepared)
    return fail('Portions served cannot exceed portions prepared.');

  const nowIso = now.toISOString();
  const reservations = { ...data.reservations };
  const contributions = { ...data.contributions };
  const active = reservationsForDinner(data, dinner.id).filter((r) => r.status === 'confirmed');
  active.forEach((r) => {
    const attended = input.attendance[r.id] ?? true;
    reservations[r.id] = { ...r, status: attended ? 'attended' : 'no_show' };
    const c = contributions[r.contributionId];
    if (c) contributions[c.id] = { ...c, status: 'demo_settled', updatedAt: nowIso };
  });
  const attendedGuests = active.filter((r) => input.attendance[r.id] ?? true).length;
  const actualDiners =
    input.actualDiners != null && Number.isInteger(input.actualDiners) && input.actualDiners >= 0
      ? input.actualDiners
      : attendedGuests + (dinner.hostEats ? 1 : 0);

  return ok({
    ...data,
    reservations,
    contributions,
    dinners: {
      ...data.dinners,
      [dinner.id]: { ...dinner, status: 'completed', completedAt: nowIso, updatedAt: nowIso },
    },
    reports: {
      ...data.reports,
      [dinner.id]: {
        dinnerId: dinner.id,
        plannedServings: dinner.pricing?.plannedServings ?? dinner.guestSeats + (dinner.hostEats ? 1 : 0),
        actualDiners,
        portionsPrepared: input.portionsPrepared,
        portionsServed: input.portionsServed,
        allPortionsServed: input.portionsServed >= input.portionsPrepared,
        leftoverPortions: input.leftoverPortions,
        leftoverHandling: input.leftoverPortions > 0 ? input.leftoverHandling : 'none',
        notes: input.notes.trim(),
        estimatedBudgetCents: input.estimatedBudgetCents,
        actualSpendCents: input.actualSpendCents,
        recordedAt: nowIso,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Reservations (guest)
// ---------------------------------------------------------------------------

export interface ReservationInput {
  dinnerId: ID;
  guestId: ID;
  acknowledgements: Reservation['acknowledgements'];
  noteToHost: string;
}

export function reserveSeat(
  data: AppData,
  input: ReservationInput,
  payment: { providerReference: string },
  now: Date,
): Result<{ data: AppData; reservationId: ID }> {
  const check = checkBookable(data, input.dinnerId, input.guestId, now);
  if (!check.ok) return fail(check.message);
  const dinner = data.dinners[input.dinnerId];
  const guest = data.users[input.guestId];
  const compat = assessCompatibility(guest.preferences, dinner);
  const acks = input.acknowledgements;
  if (!acks.allergens || !acks.foodSafety || !acks.terms)
    return fail('Please confirm the allergen, food-safety and contribution terms.');
  if (compat.needsDietAcknowledgement && !acks.dietDifference)
    return fail('Please confirm that you understand this dinner does not match your diet.');
  if (!dinner.pricing) return fail('This dinner has no confirmed price yet.');

  const nowIso = now.toISOString();
  const reservationId = makeId('res');
  const contributionId = makeId('con');
  const p = dinner.pricing;
  const contribution: Contribution = {
    id: contributionId,
    reservationId,
    provider: 'demo',
    providerReference: payment.providerReference,
    ingredientShareCents: p.ingredientShareCents,
    hostCompensationCents: p.hostCompensationCents,
    platformFeeCents: p.platformFeeCents,
    totalCents: p.totalPerGuestCents,
    refundedCents: 0,
    status: 'demo_authorized',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const reservation: Reservation = {
    id: reservationId,
    dinnerId: dinner.id,
    guestId: guest.id,
    status: 'confirmed',
    createdAt: nowIso,
    contributionId,
    acknowledgements: acks,
    noteToHost: input.noteToHost.trim(),
  };
  return ok({
    data: {
      ...data,
      reservations: { ...data.reservations, [reservationId]: reservation },
      contributions: { ...data.contributions, [contributionId]: contribution },
    },
    reservationId,
  });
}

export function cancelReservation(data: AppData, reservationId: ID, guestId: ID, now: Date): Result<AppData> {
  const reservation = data.reservations[reservationId];
  if (!reservation || reservation.guestId !== guestId) return fail('Reservation not found.');
  const dinner = data.dinners[reservation.dinnerId];
  if (!dinner) return fail('Dinner not found.');
  const contribution = data.contributions[reservation.contributionId];
  const quote = cancellationQuote(dinner, reservation, contribution, now);
  if (!quote.allowed) return fail(quote.reason ?? 'This reservation cannot be cancelled.');
  const nowIso = now.toISOString();
  const contributions = { ...data.contributions };
  if (contribution) {
    contributions[contribution.id] = {
      ...contribution,
      refundedCents: quote.refundCents,
      status: quote.fullRefund ? 'demo_refunded' : 'demo_partially_refunded',
      updatedAt: nowIso,
    };
  }
  return ok({
    ...data,
    contributions,
    reservations: {
      ...data.reservations,
      [reservationId]: { ...reservation, status: 'cancelled', cancelledAt: nowIso, cancelledBy: 'guest' },
    },
  });
}

// ---------------------------------------------------------------------------
// Reviews & trust
// ---------------------------------------------------------------------------

export interface ReviewInput {
  reservationId: ID;
  guestId: ID;
  food: Review['food'];
  hygiene: number;
  comment: string;
}

const validStar = (n: number) => Number.isInteger(n) && n >= 1 && n <= 5;

export function submitReview(data: AppData, input: ReviewInput, now: Date): Result<AppData> {
  const reservation = data.reservations[input.reservationId];
  if (!reservation || reservation.guestId !== input.guestId) return fail('Reservation not found.');
  const eligibility = reviewEligibility(data, reservation, now);
  if (!eligibility.allowed) return fail(eligibility.reason);
  const scores = [input.food.quality, input.food.taste, input.food.overall, input.hygiene];
  if (!scores.every(validStar)) return fail('Please rate every category from 1 to 5 stars.');
  const dinner = data.dinners[reservation.dinnerId];
  const review: Review = {
    id: makeId('rev'),
    dinnerId: dinner.id,
    hostId: dinner.hostId,
    guestId: input.guestId,
    reservationId: reservation.id,
    food: input.food,
    hygiene: input.hygiene,
    comment: input.comment.trim(),
    createdAt: now.toISOString(),
  };
  return ok({ ...data, reviews: { ...data.reviews, [review.id]: review } });
}

export function fileConcern(
  data: AppData,
  input: { dinnerId: ID; reporterId: ID; reason: ConcernReason; details: string },
  now: Date,
): Result<AppData> {
  if (!data.dinners[input.dinnerId]) return fail('Dinner not found.');
  if (input.details.trim().length < 10) return fail('Please describe the concern in at least 10 characters.');
  const id = makeId('rep');
  return ok({
    ...data,
    concerns: {
      ...data.concerns,
      [id]: { id, ...input, details: input.details.trim(), createdAt: now.toISOString() },
    },
  });
}

