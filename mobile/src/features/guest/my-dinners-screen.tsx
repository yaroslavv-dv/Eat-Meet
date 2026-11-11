import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TabHeader } from '@/components/app/tab-header';
import { ReservationStatusBadge } from '@/components/dinner/badges';
import { DinnerRow } from '@/components/dinner/dinner-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { EmptyState } from '@/components/ui/misc';
import { TabScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { formatDistance } from '@/domain/dates';
import { formatEUR } from '@/domain/money';
import { netContribution } from '@/domain/pricing';
import { reviewEligibility } from '@/domain/rules';
import { reservationsForGuest, reviewForReservation } from '@/domain/selectors';
import type { Reservation } from '@/domain/types';
import { useStore } from '@/state/store';
import { colors, space } from '@/theme/tokens';

type Tab = 'upcoming' | 'past' | 'cancelled';

export function GuestDinnersScreen() {
  const { data, now, currentUser } = useStore();
  const [tab, setTab] = useState<Tab>('upcoming');

  const all = reservationsForGuest(data, currentUser.id).filter((r) => data.dinners[r.dinnerId]);
  const startOf = (r: Reservation) => new Date(data.dinners[r.dinnerId].startsAt).getTime();
  const upcoming = all.filter((r) => r.status === 'confirmed' && startOf(r) > now.getTime());
  const past = all.filter((r) => r.status !== 'cancelled' && startOf(r) <= now.getTime()).reverse();
  const cancelled = all.filter((r) => r.status === 'cancelled').reverse();
  const list = { upcoming, past, cancelled }[tab];

  const open = (r: Reservation) => router.push({ pathname: '/reservation/[id]', params: { id: r.id } });

  return (
    <TabScreen>
      <TabHeader overline="Your reservations" title="My dinners" />

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: 'Upcoming', count: upcoming.length },
          { value: 'past', label: 'Past', count: past.length },
          { value: 'cancelled', label: 'Cancelled', count: cancelled.length },
        ]}
      />

      <View style={{ gap: space.md }}>
        {list.length === 0 ? (
          <Card tone="sand" elevated={false}>
            <EmptyState
              compact
              icon={tab === 'cancelled' ? 'cancel' : 'calendar'}
              title={tab === 'upcoming' ? 'No upcoming dinners' : tab === 'past' ? 'No past dinners yet' : 'Nothing cancelled'}
              message={
                tab === 'upcoming'
                  ? 'Find a table you like in Discover and reserve a seat.'
                  : tab === 'past'
                    ? 'Dinners you attend will show up here, ready for your review.'
                    : 'Cancelled reservations and their demo refunds appear here.'
              }
              actionLabel={tab === 'upcoming' ? 'Discover dinners' : undefined}
              onAction={tab === 'upcoming' ? () => router.navigate('/') : undefined}
            />
          </Card>
        ) : (
          list.map((r) => <ReservationItem key={r.id} reservation={r} onPress={() => open(r)} />)
        )}
      </View>
    </TabScreen>
  );
}

function ReservationItem({ reservation, onPress }: { reservation: Reservation; onPress: () => void }) {
  const { data, now } = useStore();
  const dinner = data.dinners[reservation.dinnerId];
  const contribution = data.contributions[reservation.contributionId];
  const started = new Date(dinner.startsAt).getTime() <= now.getTime();
  const awaiting = reservation.status === 'confirmed' && started;
  const review = reviewForReservation(data, reservation.id);
  const canReview = reviewEligibility(data, reservation, now).allowed;
  const net = contribution ? netContribution(contribution).totalCents : 0;

  let footer: React.ReactNode = null;
  if (reservation.status === 'confirmed' && !started) {
    footer = (
      <View style={styles.footer}>
        <Icon name="clock" size={13} color={colors.forest} />
        <Txt variant="footnote" color="forest" weight="600">
          Dinner {formatDistance(dinner.startsAt, now)}
        </Txt>
      </View>
    );
  } else if (canReview) {
    footer = (
      <Button
        title="Rate food & hygiene"
        icon="star"
        size="sm"
        variant="accent"
        onPress={() => router.push({ pathname: '/review/[id]', params: { id: reservation.id } })}
        style={{ alignSelf: 'flex-start' }}
      />
    );
  } else if (review) {
    footer = (
      <View style={styles.footer}>
        <Icon name="star" size={13} color={colors.honey} />
        <Txt variant="footnote" color="muted">
          You reviewed this dinner
        </Txt>
      </View>
    );
  } else if (awaiting) {
    footer = (
      <View style={styles.footer}>
        <Icon name="lock" size={12} color={colors.warning} />
        <Txt variant="footnote" color="warning">
          Reviews unlock once the host confirms attendance
        </Txt>
      </View>
    );
  } else if (reservation.status === 'cancelled' && contribution) {
    footer = (
      <View style={styles.footer}>
        <Icon name="reset" size={12} color={colors.muted} />
        <Txt variant="footnote" color="muted">
          Refunded {formatEUR(contribution.refundedCents)} of {formatEUR(contribution.totalCents)} (demo)
        </Txt>
      </View>
    );
  }

  return (
    <DinnerRow
      dinner={dinner}
      onPress={onPress}
      badge={<ReservationStatusBadge status={awaiting ? 'awaiting' : reservation.status} size="sm" />}
      trailing={formatEUR(net)}
      footer={footer}
    />
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
