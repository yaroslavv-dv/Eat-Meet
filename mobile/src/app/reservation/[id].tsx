import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { ReservationStatusBadge } from '@/components/dinner/badges';
import { DinnerRow } from '@/components/dinner/dinner-row';
import { PriceBreakdown } from '@/components/dinner/price-breakdown';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { DemoBadge, EmptyState, KeyValue, Notice, SectionHeader } from '@/components/ui/misc';
import { StackScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { formatDistance, formatLongDate, formatTime, formatWhen } from '@/domain/dates';
import { formatEUR } from '@/domain/money';
import { cancellationQuote, reviewEligibility } from '@/domain/rules';
import { reviewForReservation } from '@/domain/selectors';
import type { ContributionStatus } from '@/domain/types';
import { useStore } from '@/state/store';
import { colors, space } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

const CONTRIBUTION_LABEL: Record<ContributionStatus, string> = {
  demo_authorized: 'Held until the dinner (simulated)',
  demo_settled: 'Settled with the host (simulated)',
  demo_refunded: 'Fully refunded (simulated)',
  demo_partially_refunded: 'Partly refunded (simulated)',
};

export default function ReservationScreen() {
  const { id, confirmed } = useLocalSearchParams<{ id: string; confirmed?: string }>();
  const { data, now, currentUser, actions } = useStore();
  const toast = useToast();
  const reservation = id ? data.reservations[id] : undefined;
  const dinner = reservation ? data.dinners[reservation.dinnerId] : undefined;

  if (!reservation || !dinner || reservation.guestId !== currentUser.id) {
    return (
      <StackScreen title="Reservation">
        <EmptyState icon="calendar" title="Reservation not found" message="It may belong to another demo profile." />
      </StackScreen>
    );
  }

  const host = data.users[dinner.hostId];
  const contribution = data.contributions[reservation.contributionId];
  const quote = cancellationQuote(dinner, reservation, contribution, now);
  const review = reviewForReservation(data, reservation.id);
  const reviewCheck = reviewEligibility(data, reservation, now);
  const started = new Date(dinner.startsAt).getTime() <= now.getTime();
  const awaiting = reservation.status === 'confirmed' && started;
  const showSuccess = confirmed === '1' && reservation.status === 'confirmed';
  const end = new Date(new Date(dinner.startsAt).getTime() + dinner.durationMinutes * 60000);

  const cancel = () => {
    const message = quote.fullRefund
      ? `You will get the full ${formatEUR(quote.refundCents)} back (simulated).`
      : `The free cancellation window has passed. ${formatEUR(quote.retainedCents)} for ingredients goes to the host; ${formatEUR(quote.refundCents)} is refunded (simulated).`;
    Alert.alert('Cancel your seat?', message, [
      { text: 'Keep my seat', style: 'cancel' },
      {
        text: 'Cancel reservation',
        style: 'destructive',
        onPress: () => {
          const r = actions.cancelReservation(reservation.id);
          if (r.ok) toast('Reservation cancelled – seat released');
          else toast(r.error, 'error');
        },
      },
    ]);
  };

  return (
    <StackScreen title="Reservation" subtitle={dinner.title} onClose={() => (router.canGoBack() ? goBack() : router.replace('/dinners'))}>
      {showSuccess ? (
        <View style={styles.success}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.successIcon}>
            <Icon name="check" size={34} color={colors.paper} weight="bold" />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(150)} style={{ alignItems: 'center', gap: space.xs }}>
            <Txt variant="display" align="center">
              You’re at the table!
            </Txt>
            <Txt variant="callout" color="muted" align="center">
              Seat reserved at {host?.firstName}’s dinner {formatDistance(dinner.startsAt, now)}.
            </Txt>
          </Animated.View>
        </View>
      ) : null}

      <View style={styles.statusRow}>
        <ReservationStatusBadge status={awaiting ? 'awaiting' : reservation.status} />
        <Txt variant="caption" color="muted">
          Booked {formatLongDate(reservation.createdAt)}
        </Txt>
      </View>

      <DinnerRow dinner={dinner} onPress={() => router.push({ pathname: '/dinner/[id]', params: { id: dinner.id } })} />

      {reservation.status !== 'cancelled' ? (
        <Card style={{ gap: space.md }}>
          <Detail icon="calendar" title={formatLongDate(dinner.startsAt)} body={`${formatTime(dinner.startsAt)}–${formatTime(end)}`} />
          <Detail icon="location" title={dinner.privateAddress} body={`${dinner.neighborhood} · shared with you because your seat is confirmed`} />
          {reservation.noteToHost ? <Detail icon="chat" title="Your note to the host" body={reservation.noteToHost} /> : null}
        </Card>
      ) : (
        <Notice tone="neutral" icon="cancel" title={`Cancelled ${reservation.cancelledAt ? formatWhen(reservation.cancelledAt, now) : ''}`}>
          {reservation.cancelledBy === 'host' ? 'The host cancelled this dinner.' : 'You cancelled this reservation.'}
        </Notice>
      )}

      {contribution ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Contribution" />
          <PriceBreakdown
            pricing={{
              ingredientShareCents: contribution.ingredientShareCents,
              hostCompensationCents: contribution.hostCompensationCents,
              platformFeeCents: contribution.platformFeeCents,
              totalPerGuestCents: contribution.totalCents,
            }}
            title="You contributed"
            showExplainer={false}
            refundedCents={contribution.refundedCents}
          />
          <Card tone="sand" elevated={false} style={{ gap: space.sm }}>
            <View style={styles.statusRow}>
              <Txt variant="headline">{CONTRIBUTION_LABEL[contribution.status]}</Txt>
              <DemoBadge />
            </View>
            <KeyValue label="Reference" value={contribution.providerReference} muted />
            <Txt variant="footnote" color="muted">
              No real money was moved. This record only exists on this device.
            </Txt>
          </Card>
        </View>
      ) : null}

      {reservation.status === 'confirmed' && !started ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="What happens next" />
          <Card style={{ gap: space.lg }}>
            <NextStep n={1} title={`${host?.firstName} plans the shopping`} body="The shopping list scales with confirmed diners, so nobody buys for empty seats." />
            <NextStep n={2} title="Your needs are shared" body="Your diet and allergies are visible to the host for this dinner only." />
            <NextStep n={3} title="Show up hungry" body="Arrive on time and enjoy – socialise as much as you like." />
          </Card>
        </View>
      ) : null}

      {started && reservation.status !== 'cancelled' ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Your review" />
          {review ? (
            <Notice tone="success" icon="star" title="Thanks for your review">
              Your ratings are part of {host?.firstName}’s food and hygiene scores.
            </Notice>
          ) : reviewCheck.allowed ? (
            <Button
              title="Rate food & hygiene"
              icon="star"
              variant="accent"
              onPress={() => router.push({ pathname: '/review/[id]', params: { id: reservation.id } })}
            />
          ) : (
            <Notice tone="warning" icon="lock" title="Review locked">
              {reviewCheck.reason}
            </Notice>
          )}
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        {quote.allowed ? (
          <>
            <Button title="Cancel reservation" variant="danger" icon="cancel" onPress={cancel} />
            <Txt variant="footnote" color="muted" align="center">
              {quote.fullRefund
                ? `Free cancellation until ${formatWhen(quote.freeUntil, now)}.`
                : `Cancelling now refunds ${formatEUR(quote.refundCents)}; the ${formatEUR(quote.retainedCents)} ingredient share goes to the host.`}
            </Txt>
          </>
        ) : null}
        <Button
          title="Report a concern"
          icon="flag"
          variant="ghost"
          size="md"
          onPress={() => router.push({ pathname: '/report/[id]', params: { id: dinner.id } })}
        />
      </View>
    </StackScreen>
  );
}

function Detail({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View style={styles.detail}>
      <View style={styles.detailIcon}>
        <Icon name={icon} size={16} color={colors.forest} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="headline">{title}</Txt>
        <Txt variant="footnote" color="muted">
          {body}
        </Txt>
      </View>
    </View>
  );
}

function NextStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <View style={styles.detail}>
      <View style={[styles.detailIcon, { backgroundColor: colors.terracottaSoft }]}>
        <Txt variant="callout" weight="700" color="terracottaDeep">
          {n}
        </Txt>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="headline">{title}</Txt>
        <Txt variant="footnote" color="muted">
          {body}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  success: { alignItems: 'center', gap: space.lg, paddingVertical: space.lg },
  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  detail: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  detailIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
});
