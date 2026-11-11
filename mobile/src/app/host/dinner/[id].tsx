import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { DinnerStatusBadge, ReservationStatusBadge } from '@/components/dinner/badges';
import { DinnerImage } from '@/components/dinner/dinner-image';
import { ReviewCard } from '@/components/dinner/review-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Avatar, Divider, EmptyState, KeyValue, Notice, ProgressBar, SectionHeader } from '@/components/ui/misc';
import { StackScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { AGE_GROUP_LABEL, ALLERGEN_LABEL, DIETARY_TAG_LABEL, GUEST_DIET_LABEL, LEFTOVER_HANDLING_LABEL, SOCIAL_LABEL } from '@/domain/constants';
import { ageFromBirthYear, formatWhen, plural } from '@/domain/dates';
import { formatEUR } from '@/domain/money';
import { dinnerPricing, ingredientBudgetCents, plannedServings, sumContributions } from '@/domain/pricing';
import { completionEligibility, hostCancellationEligibility } from '@/domain/rules';
import { contributionsForDinner, dinnerDisplayStatus, isSeatHolding, reservationsForDinner, seatsTaken } from '@/domain/selectors';
import type { Allergen, Reservation } from '@/domain/types';
import { useStore } from '@/state/store';
import { colors, radius, space } from '@/theme/tokens';

export default function ManageDinnerScreen() {
  const { id, published } = useLocalSearchParams<{ id: string; published?: string }>();
  const { data, now, currentUser, actions } = useStore();
  const toast = useToast();
  const dinner = id ? data.dinners[id] : undefined;

  if (!dinner || dinner.hostId !== currentUser.id) {
    return (
      <StackScreen title="Manage dinner">
        <EmptyState icon="forkKnife" title="Dinner not found" message="Switch to the host profile that owns this dinner." />
      </StackScreen>
    );
  }

  const status = dinnerDisplayStatus(data, dinner, now);
  const reservations = reservationsForDinner(data, dinner.id);
  const active = reservations.filter(isSeatHolding);
  const cancelled = reservations.filter((r) => r.status === 'cancelled');
  const taken = seatsTaken(data, dinner.id);
  const money = sumContributions(contributionsForDinner(data, dinner.id));
  const pricing = dinnerPricing(dinner);
  const diners = plannedServings(taken, dinner.hostEats);
  const budgetForConfirmed = ingredientBudgetCents(dinner.ingredients, diners);
  const canComplete = completionEligibility(dinner, now).allowed;
  const canCancel = hostCancellationEligibility(dinner, now).allowed;
  const report = data.reports[dinner.id];
  const reviews = Object.values(data.reviews).filter((r) => r.dinnerId === dinner.id);

  // Allergies at the table, with who has them – relevant to meal safety.
  const allergyMap = new Map<Allergen, string[]>();
  active.forEach((r) => {
    const g = data.users[r.guestId];
    g?.preferences.allergies.forEach((a) => allergyMap.set(a, [...(allergyMap.get(a) ?? []), g.firstName]));
  });

  const cancelDinner = () =>
    Alert.alert(
      'Cancel this dinner?',
      `${active.length} ${active.length === 1 ? 'guest' : 'guests'} will be notified and fully refunded (simulated). This cannot be undone.`,
      [
        { text: 'Keep dinner', style: 'cancel' },
        {
          text: 'Cancel dinner',
          style: 'destructive',
          onPress: () => {
            const r = actions.cancelDinner(dinner.id);
            if (r.ok) toast('Dinner cancelled – guests refunded');
            else toast(r.error, 'error');
          },
        },
      ],
    );

  return (
    <StackScreen title="Manage dinner" subtitle={dinner.title}>
      {published === '1' && dinner.status === 'published' ? (
        <Animated.View entering={FadeInDown.duration(350)}>
          <Card tone="forest" style={{ gap: space.sm }}>
            <View style={styles.inline}>
              <Icon name="checkCircle" size={20} color={colors.sage} />
              <Txt variant="title2" color="onDark">
                Your dinner is live
              </Txt>
            </View>
            <Txt variant="callout" color="onDarkMuted">
              Guests can find it in Discover now. Bookings and contributions will appear below.
            </Txt>
            <Button
              title="See it as a guest"
              variant="light"
              size="md"
              icon="forkKnife"
              style={{ alignSelf: 'flex-start', marginTop: space.xs }}
              onPress={() => router.push({ pathname: '/dinner/[id]', params: { id: dinner.id } })}
            />
          </Card>
        </Animated.View>
      ) : null}

      <View style={styles.head}>
        <DinnerImage image={dinner.mealImage} style={styles.thumb} showLabel={false} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="title2">{dinner.title}</Txt>
          <Txt variant="footnote" color="muted">
            {formatWhen(dinner.startsAt, now)} · {dinner.neighborhood}
          </Txt>
          <DinnerStatusBadge status={status} size="sm" />
        </View>
      </View>

      {status === 'awaiting_completion' ? (
        <Notice tone="warning" title="This dinner has taken place">
          Confirm who attended and record leftovers. Guests can review you once you do.
        </Notice>
      ) : null}

      <Card style={{ gap: space.md }}>
        <View style={styles.spread}>
          <Txt variant="title3">Seats</Txt>
          <Txt variant="title2" color="forest">
            {taken}/{dinner.guestSeats}
          </Txt>
        </View>
        <ProgressBar value={taken / dinner.guestSeats} color={colors.terracotta} height={10} />
        <Txt variant="footnote" color="muted">
          {taken >= dinner.guestSeats
            ? 'Fully booked – no further reservations are accepted.'
            : `${dinner.guestSeats - taken} ${dinner.guestSeats - taken === 1 ? 'seat' : 'seats'} still open.`}
        </Txt>
      </Card>

      <Card style={{ gap: space.sm }}>
        <View style={styles.spread}>
          <Txt variant="title3">Contributions</Txt>
          <Tag label="Simulated" tone="warning" size="sm" icon="lock" />
        </View>
        <KeyValue label={`${money.count} guest contributions`} value={formatEUR(money.totalCents)} strong />
        <Divider />
        <KeyValue label="For ingredients" value={formatEUR(money.ingredientCents)} icon="cart" />
        <KeyValue label="Your preparation fees" value={formatEUR(money.hostCents)} icon="heart" />
        <KeyValue label="Eat&Meet platform fees" value={formatEUR(money.platformCents)} icon="euro" />
        {money.refundedCents > 0 ? <KeyValue label="Refunded to guests" value={formatEUR(money.refundedCents)} muted icon="reset" /> : null}
        <Divider />
        <KeyValue label={`Est. shopping for ${plural(diners, 'plate')}`} value={formatEUR(budgetForConfirmed)} />
        <Txt variant="footnote" color="muted">
          Price per guest is locked at {formatEUR(pricing.totalPerGuestCents)}. Your own plate is part of the shopping, paid by you.
        </Txt>
      </Card>

      <View style={styles.actions}>
        {dinner.status !== 'cancelled' ? (
          <Button
            title="Shopping list"
            icon="cart"
            variant="secondary"
            onPress={() => router.push({ pathname: '/host/shopping/[id]', params: { id: dinner.id } })}
          />
        ) : null}
        {canComplete ? (
          <Button
            title="Wrap up dinner"
            icon="checklist"
            onPress={() => router.push({ pathname: '/host/complete/[id]', params: { id: dinner.id } })}
          />
        ) : null}
        {dinner.status === 'published' || dinner.status === 'completed' ? (
          <Button title="View public listing" icon="forkKnife" variant="outline" onPress={() => router.push({ pathname: '/dinner/[id]', params: { id: dinner.id } })} />
        ) : null}
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Guests" subtitle={active.length ? 'Diet and allergy details are shared with you for this dinner only.' : undefined} />
        {allergyMap.size > 0 ? (
          <Notice tone="danger" icon="warning" title="Allergies at this table">
            {[...allergyMap.entries()].map(([a, names]) => `${ALLERGEN_LABEL[a]} (${names.join(', ')})`).join(' · ')}
          </Notice>
        ) : active.length > 0 ? (
          <Notice tone="success" icon="checkCircle">No guest has listed an allergy.</Notice>
        ) : null}
        {active.length === 0 ? (
          <Card tone="sand" elevated={false}>
            <EmptyState compact icon="personAdd" title="No reservations yet" message="Guests who reserve appear here with their dietary needs." />
          </Card>
        ) : (
          active.map((r) => <GuestCard key={r.id} reservation={r} />)
        )}
        {cancelled.length > 0 ? (
          <Txt variant="footnote" color="muted">
            {cancelled.length} cancelled {cancelled.length === 1 ? 'reservation' : 'reservations'} (seats released).
          </Txt>
        ) : null}
      </View>

      {report ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Wrap-up report" />
          <Card style={{ gap: space.sm }}>
            <KeyValue label="Planned plates (full table)" value={String(report.plannedServings)} />
            <KeyValue label="Actual diners" value={String(report.actualDiners)} />
            <KeyValue label="Portions prepared" value={String(report.portionsPrepared)} />
            <KeyValue label="Portions served" value={String(report.portionsServed)} />
            <KeyValue label="Leftover portions" value={String(report.leftoverPortions)} />
            <KeyValue label="Leftovers" value={LEFTOVER_HANDLING_LABEL[report.leftoverHandling]} />
            {report.actualSpendCents != null ? (
              <KeyValue label="Actual spend vs estimate" value={`${formatEUR(report.actualSpendCents)} / ${formatEUR(report.estimatedBudgetCents)}`} />
            ) : null}
            {report.notes ? (
              <Txt variant="footnote" color="muted">
                “{report.notes}”
              </Txt>
            ) : null}
          </Card>
        </View>
      ) : null}

      {reviews.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Reviews for this dinner" />
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </View>
      ) : null}

      {canCancel ? <Button title="Cancel dinner" icon="cancel" variant="danger" onPress={cancelDinner} /> : null}
    </StackScreen>
  );
}

function GuestCard({ reservation }: { reservation: Reservation }) {
  const { data, now } = useStore();
  const guest = data.users[reservation.guestId];
  const dinner = data.dinners[reservation.dinnerId];
  if (!guest) return null;
  const p = guest.preferences;
  const awaiting = reservation.status === 'confirmed' && new Date(dinner.startsAt).getTime() <= now.getTime();
  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.inline}>
        <Avatar user={guest} size={40} />
        <View style={{ flex: 1 }}>
          <Txt variant="headline">
            {guest.firstName} {guest.lastName[0]}.
          </Txt>
          <Txt variant="footnote" color="muted">
            {ageFromBirthYear(guest.birthYear, now)} · prefers {SOCIAL_LABEL[p.social]}
            {p.ageGroups.length && !p.ageGroups.includes('any') ? ` · ${p.ageGroups.map((a) => AGE_GROUP_LABEL[a]).join(', ')}` : ''}
          </Txt>
        </View>
        <ReservationStatusBadge status={awaiting ? 'awaiting' : reservation.status} size="sm" />
      </View>
      <View style={styles.tags}>
        <Tag label={GUEST_DIET_LABEL[p.diet]} tone="sage" icon="leaf" size="sm" />
        {p.dietaryTags.map((t) => (
          <Tag key={t} label={DIETARY_TAG_LABEL[t]} tone="info" size="sm" />
        ))}
        {p.allergies.map((a) => (
          <Tag key={a} label={`Allergy: ${ALLERGEN_LABEL[a]}`} tone="danger" icon="warning" size="sm" />
        ))}
      </View>
      {p.allergyNotes ? (
        <Txt variant="footnote" color="danger">
          {p.allergyNotes}
        </Txt>
      ) : null}
      {reservation.noteToHost ? (
        <View style={styles.note}>
          <Icon name="chat" size={12} color={colors.muted} />
          <Txt variant="footnote" color="inkSoft" style={{ flex: 1 }}>
            “{reservation.noteToHost}”
          </Txt>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  thumb: { width: 84, height: 84, borderRadius: radius.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { gap: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  note: { flexDirection: 'row', gap: 6, backgroundColor: colors.sand, padding: space.sm, borderRadius: radius.sm },
});
