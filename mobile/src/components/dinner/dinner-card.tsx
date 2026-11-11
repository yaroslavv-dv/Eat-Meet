import { StyleSheet, View } from 'react-native';

import { PressableCard } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { SeatDots } from '@/components/ui/misc';
import { Txt } from '@/components/ui/text';
import { assessCompatibility } from '@/domain/compatibility';
import { ALLERGEN_LABEL } from '@/domain/constants';
import { dayOfMonth, formatRelativeDay, formatTime, monthShort, weekdayShort } from '@/domain/dates';
import { formatEUR } from '@/domain/money';
import { dinnerPricing } from '@/domain/pricing';
import { dinnerDisplayStatus, seatsLeft, seatsTaken } from '@/domain/selectors';
import type { Dinner } from '@/domain/types';
import { useStore } from '@/state/store';
import { colors, radius, shadow, space } from '@/theme/tokens';

import { DietTag, DinnerStatusBadge, SocialTag } from './badges';
import { DinnerImage } from './dinner-image';
import { HostLine } from './host-line';

export function DateBlock({ startsAt }: { startsAt: string }) {
  return (
    <View style={styles.dateBlock}>
      <Txt variant="overline" color="terracottaDeep" style={{ fontSize: 10 }}>
        {weekdayShort(startsAt)}
      </Txt>
      <Txt variant="title2" style={{ lineHeight: 24 }}>
        {dayOfMonth(startsAt)}
      </Txt>
      <Txt variant="caption" color="muted" style={{ fontSize: 10, lineHeight: 12 }}>
        {monthShort(startsAt)}
      </Txt>
    </View>
  );
}

/** Large listing card for the Discover feed. */
export function DinnerCard({ dinner, onPress }: { dinner: Dinner; onPress: () => void }) {
  const { data, now, currentUser } = useStore();
  const host = data.users[dinner.hostId];
  const left = seatsLeft(data, dinner);
  const taken = seatsTaken(data, dinner.id);
  const status = dinnerDisplayStatus(data, dinner, now);
  const pricing = dinnerPricing(dinner);
  const isOwn = dinner.hostId === currentUser.id;
  const compat = isOwn ? null : assessCompatibility(currentUser.preferences, dinner);

  return (
    <PressableCard
      padding={0}
      onPress={onPress}
      accessibilityLabel={`${dinner.title}, ${formatRelativeDay(dinner.startsAt, now)} at ${formatTime(dinner.startsAt)}, ${formatEUR(pricing.totalPerGuestCents)} per guest, ${left} seats left`}
      style={styles.card}>
      <View>
        <DinnerImage image={dinner.mealImage} style={styles.image} />
        <View style={styles.imageTop}>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <DateBlock startsAt={dinner.startsAt} />
            <View style={styles.timePill}>
              <Icon name="clock" size={12} color={colors.ink} />
              <Txt variant="caption" weight="700">
                {formatTime(dinner.startsAt)}
              </Txt>
            </View>
          </View>
          <View style={styles.pricePill}>
            <Txt variant="headline" color="onDark">
              {formatEUR(pricing.totalPerGuestCents)}
            </Txt>
            <Txt variant="caption" color="onDarkMuted" style={{ fontSize: 10, lineHeight: 12 }}>
              per guest
            </Txt>
          </View>
        </View>
        {status === 'fully_booked' ? (
          <View style={styles.statusOverlay}>
            <DinnerStatusBadge status={status} />
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Txt variant="title2" numberOfLines={2}>
          {dinner.title}
        </Txt>
        <HostLine host={host} size={24} />

        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Icon name="location" size={14} color={colors.muted} />
            <Txt variant="footnote" color="inkSoft">
              {dinner.neighborhood}
            </Txt>
          </View>
          <View style={styles.meta}>
            <SeatDots taken={taken} total={dinner.guestSeats} size={7} />
            <Txt variant="footnote" weight="600" color={left === 0 ? 'terracottaDeep' : left <= 2 ? 'terracottaDeep' : 'inkSoft'}>
              {left === 0 ? 'Full' : `${left} of ${dinner.guestSeats} left`}
            </Txt>
          </View>
        </View>

        <View style={styles.tags}>
          <DietTag diet={dinner.diet} size="sm" />
          <SocialTag social={dinner.social} size="sm" />
          <Tag
            size="sm"
            label={dinner.alcohol === 'alcohol_free' ? 'Alcohol-free' : 'Alcohol possible'}
            icon={dinner.alcohol === 'alcohol_free' ? 'tea' : 'wine'}
            tone="neutral"
          />
        </View>

        {isOwn ? (
          <View style={styles.compat}>
            <Icon name="home" size={14} color={colors.forest} />
            <Txt variant="footnote" weight="600" color="forest">
              You are hosting this dinner
            </Txt>
          </View>
        ) : compat?.blocked ? (
          <View style={[styles.compat, { backgroundColor: colors.dangerSoft }]}>
            <Icon name="hand" size={14} color={colors.danger} />
            <Txt variant="footnote" weight="600" color="danger" style={{ flex: 1 }}>
              Declares {compat.allergenConflicts.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(', ')} – listed in your allergies
            </Txt>
          </View>
        ) : compat?.matches ? (
          <View style={styles.compat}>
            <Icon name="checkCircle" size={14} color={colors.forest} />
            <Txt variant="footnote" weight="600" color="forest">
              Fits your preferences
            </Txt>
          </View>
        ) : compat ? (
          <View style={[styles.compat, { backgroundColor: colors.warningSoft }]}>
            <Icon name="info" size={14} color={colors.warning} />
            <Txt variant="footnote" weight="600" color="warning" numberOfLines={2} style={{ flex: 1 }}>
              {compat.issues.find((i) => i.severity === 'warn')?.message ?? 'Check the details before booking'}
            </Txt>
          </View>
        ) : null}
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: radius.xl },
  image: { height: 210, width: '100%' },
  imageTop: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateBlock: {
    width: 50,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    alignItems: 'center',
    ...shadow.soft,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pricePill: {
    backgroundColor: colors.forest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    alignItems: 'flex-end',
  },
  statusOverlay: { position: 'absolute', left: space.md, bottom: space.md },
  body: { padding: space.lg, gap: space.md },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  compat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successSoft,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
});
