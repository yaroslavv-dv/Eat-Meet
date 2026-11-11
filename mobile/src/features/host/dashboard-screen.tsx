import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { greeting, TabHeader } from '@/components/app/tab-header';
import { DinnerStatusBadge } from '@/components/dinner/badges';
import { DinnerImage } from '@/components/dinner/dinner-image';
import { DinnerRow } from '@/components/dinner/dinner-row';
import { RatingSummary, ReviewCard } from '@/components/dinner/review-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { EmptyState, Notice, ProgressBar, SectionHeader } from '@/components/ui/misc';
import { TabScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { demoImage } from '@/data/images';
import { formatDistance, formatWhen, plural } from '@/domain/dates';
import { formatEUR } from '@/domain/money';
import { dinnerPricing, ingredientBudgetCents, plannedServings, sumContributions } from '@/domain/pricing';
import {
  contributionsForDinner,
  dinnerDisplayStatus,
  dinnersForHost,
  hostRatings,
  isUpcoming,
  reviewsForHost,
  seatsTaken,
} from '@/domain/selectors';
import type { Dinner } from '@/domain/types';
import { useStore } from '@/state/store';
import { colors, radius, space } from '@/theme/tokens';

export function HostDashboardScreen() {
  const { data, now, currentUser } = useStore();
  const mine = dinnersForHost(data, currentUser.id);
  const upcoming = mine.filter((d) => d.status === 'published' && isUpcoming(d, now));
  const awaiting = mine.filter((d) => d.status === 'published' && !isUpcoming(d, now));
  const drafts = mine.filter((d) => d.status === 'draft');
  const past = mine.filter((d) => d.status === 'completed').reverse();
  const reviews = reviewsForHost(data, currentUser.id);
  const ratings = hostRatings(data, currentUser.id);

  const money = sumContributions(upcoming.flatMap((d) => contributionsForDinner(data, d.id)));
  const booked = upcoming.reduce((s, d) => s + seatsTaken(data, d.id), 0);
  const seats = upcoming.reduce((s, d) => s + d.guestSeats, 0);

  const createDinner = () => router.push('/host/create');

  return (
    <TabScreen>
      <TabHeader overline={`${greeting(now)}, ${currentUser.firstName}`} title="Your table" />

      <Card tone="forest" padding={0} style={styles.hero}>
        <DinnerImage image={demoImage('onboarding/host-kitchen')} style={StyleSheet.absoluteFill} showLabel={false} />
        <View style={styles.heroScrim} />
        <View style={styles.heroContent}>
          <Txt variant="overline" color="onDarkMuted">
            Host mode
          </Txt>
          <Txt variant="title1" color="onDark">
            Cook once,{'\n'}share the table.
          </Txt>
          <Txt variant="footnote" color="onDarkMuted" style={{ maxWidth: 260 }}>
            Publish at least 24 hours ahead. Guests chip in for ingredients, you earn a small prep fee.
          </Txt>
          <Button title="Create a dinner" icon="plus" variant="accent" size="md" onPress={createDinner} style={{ alignSelf: 'flex-start', marginTop: space.sm }} />
        </View>
      </Card>

      <View style={styles.stats}>
        <Stat icon="calendar" label="Upcoming dinners" value={String(upcoming.length)} />
        <Stat icon="people" label="Guests booked" value={`${booked}/${seats}`} />
        <Stat icon="euro" label="Contributions (demo)" value={formatEUR(money.totalCents)} />
        <Stat icon="heart" label="Your prep fees" value={formatEUR(money.hostCents)} />
      </View>

      {awaiting.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Needs your attention" />
          {awaiting.map((d) => (
            <Card key={d.id} tone="sand" elevated={false} style={{ gap: space.md }}>
              <Notice tone="warning" title={`${d.title} took place ${formatDistance(d.startsAt, now)}`}>
                Confirm who attended and record leftovers. This unlocks guest reviews and feeds your impact numbers.
              </Notice>
              <Button
                title="Wrap up dinner"
                icon="checklist"
                onPress={() => router.push({ pathname: '/host/complete/[id]', params: { id: d.id } })}
              />
            </Card>
          ))}
        </View>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader
          title="Upcoming"
          subtitle={upcoming.length ? 'Bookings update live as guests reserve.' : undefined}
        />
        {upcoming.length === 0 ? (
          <Card tone="sand" elevated={false}>
            <EmptyState
              compact
              icon="forkKnife"
              title="No upcoming dinners"
              message="Create a dinner and it will appear in Discover for guests right away."
              actionLabel="Create a dinner"
              onAction={createDinner}
            />
          </Card>
        ) : (
          upcoming.map((d, i) => (
            <Animated.View key={d.id} entering={FadeInDown.delay(i * 60).duration(300)}>
              <UpcomingHostedCard dinner={d} />
            </Animated.View>
          ))
        )}
      </View>

      {drafts.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Drafts" subtitle="Only visible to you until you publish." />
          {drafts.map((d) => (
            <DinnerRow
              key={d.id}
              dinner={d}
              badge={<DinnerStatusBadge status="draft" size="sm" />}
              onPress={() => router.push({ pathname: '/host/create', params: { draftId: d.id } })}
            />
          ))}
        </View>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Guest feedback" subtitle="Calculated from saved reviews only." />
        <RatingSummary ratings={ratings} />
        {reviews.slice(0, 3).map((r) => (
          <ReviewCard key={r.id} review={r} showDinner />
        ))}
      </View>

      {past.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Past dinners" />
          {past.map((d) => (
            <DinnerRow
              key={d.id}
              dinner={d}
              badge={<DinnerStatusBadge status="completed" size="sm" />}
              trailing={`${seatsTaken(data, d.id)} guests`}
              onPress={() => router.push({ pathname: '/host/dinner/[id]', params: { id: d.id } })}
            />
          ))}
        </View>
      ) : null}
    </TabScreen>
  );
}

function Stat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <Card style={styles.stat} padding={space.lg}>
      <Icon name={icon} size={18} color={colors.terracotta} />
      <Txt variant="number" style={{ fontSize: 24, lineHeight: 28 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
      <Txt variant="caption" color="muted">
        {label}
      </Txt>
    </Card>
  );
}

function UpcomingHostedCard({ dinner }: { dinner: Dinner }) {
  const { data, now } = useStore();
  const taken = seatsTaken(data, dinner.id);
  const status = dinnerDisplayStatus(data, dinner, now);
  const diners = plannedServings(taken, dinner.hostEats);
  const budget = ingredientBudgetCents(dinner.ingredients, diners);
  const pricing = dinnerPricing(dinner);
  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Manage ${dinner.title}`}
        onPress={() => router.push({ pathname: '/host/dinner/[id]', params: { id: dinner.id } })}
        style={({ pressed }) => pressed && { opacity: 0.85 }}>
        <View style={styles.upRow}>
          <DinnerImage image={dinner.mealImage} style={styles.upThumb} showLabel={false} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="headline" numberOfLines={1}>
              {dinner.title}
            </Txt>
            <Txt variant="footnote" color="muted">
              {formatWhen(dinner.startsAt, now)} · {formatEUR(pricing.totalPerGuestCents)}/guest
            </Txt>
            <DinnerStatusBadge status={status} size="sm" />
          </View>
        </View>
        <View style={styles.upBody}>
          <View style={styles.upMeta}>
            <Txt variant="footnote" weight="600">
              {taken} of {dinner.guestSeats} seats booked
            </Txt>
            <Txt variant="footnote" color="muted">
              Shopping for {plural(diners, 'plate')} · ~{formatEUR(budget)}
            </Txt>
          </View>
          <ProgressBar value={taken / dinner.guestSeats} color={colors.terracotta} />
        </View>
      </Pressable>
      <View style={[styles.upBody, { paddingTop: 0 }]}>
        <View style={styles.upActions}>
          <Button
            title="Shopping list"
            icon="cart"
            size="sm"
            variant="secondary"
            onPress={() => router.push({ pathname: '/host/shopping/[id]', params: { id: dinner.id } })}
          />
          <Button
            title="Guests"
            icon="people"
            size="sm"
            variant="outline"
            onPress={() => router.push({ pathname: '/host/dinner/[id]', params: { id: dinner.id } })}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 230, overflow: 'hidden', borderRadius: radius.xl },
  heroScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(100deg, rgba(22,63,47,0.96) 0%, rgba(22,63,47,0.82) 48%, rgba(22,63,47,0.2) 100%)' },
  heroContent: { padding: space.xl, gap: space.sm },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { width: '47.8%', flexGrow: 1, gap: 4 },
  upRow: { flexDirection: 'row', gap: space.md, padding: space.md, alignItems: 'center' },
  upThumb: { width: 72, height: 72, borderRadius: radius.md },
  upBody: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm },
  upMeta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.xs },
  upActions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
});
