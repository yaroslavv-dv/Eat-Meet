import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useState } from 'react';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DietTag, DinnerStatusBadge, SOCIAL_ICON, SocialTag } from '@/components/dinner/badges';
import { DinnerImage } from '@/components/dinner/dinner-image';
import { PriceBreakdown } from '@/components/dinner/price-breakdown';
import { RatingSummary, ReviewCard } from '@/components/dinner/review-card';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { Avatar, Divider, EmptyState, Notice, SeatDots, SectionHeader } from '@/components/ui/misc';
import { FooterBar, StackScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { assessCompatibility } from '@/domain/compatibility';
import {
  AGE_GROUP_LABEL,
  ALCOHOL_POLICY_HINT,
  ALCOHOL_POLICY_LABEL,
  ALLERGEN_LABEL,
  DIETARY_TAG_LABEL,
  SOCIAL_HINT,
  SOCIAL_LABEL,
} from '@/domain/constants';
import { ageFromBirthYear, formatDuration, formatLongDate, formatTime } from '@/domain/dates';
import { formatEUR } from '@/domain/money';
import { dinnerPricing, formatQuantity } from '@/domain/pricing';
import { checkBookable } from '@/domain/rules';
import {
  activeReservationFor,
  dinnerAllergens,
  dinnerDisplayStatus,
  hostRatings,
  reviewsForHost,
  seatsLeft,
  seatsTaken,
} from '@/domain/selectors';
import { useStore } from '@/state/store';
import { colors, gutter, radius, space } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

export default function DinnerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, now, currentUser, mode } = useStore();
  const insets = useSafeAreaInsets();
  const dinner = id ? data.dinners[id] : undefined;
  // Solid header fades in once the hero image has scrolled away.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const barStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [220, 300], [0, 1], Extrapolation.CLAMP) }));
  // Dark status-bar text once the cream header is showing, light text over the photo.
  const [solidHeader, setSolidHeader] = useState(false);
  useAnimatedReaction(
    () => scrollY.value > 260,
    (solid, previous) => {
      if (solid !== previous) scheduleOnRN(setSolidHeader, solid);
    },
  );

  if (!dinner || dinner.status === 'draft') {
    return (
      <StackScreen title="Dinner">
        <EmptyState icon="forkKnife" title="Dinner not found" message="This dinner may have been removed." actionLabel="Back" onAction={() => goBack()} />
      </StackScreen>
    );
  }

  const host = data.users[dinner.hostId];
  const pricing = dinnerPricing(dinner);
  const left = seatsLeft(data, dinner);
  const taken = seatsTaken(data, dinner.id);
  const status = dinnerDisplayStatus(data, dinner, now);
  const allergens = dinnerAllergens(dinner);
  const isOwn = dinner.hostId === currentUser.id;
  const compat = isOwn ? null : assessCompatibility(currentUser.preferences, dinner);
  const reservation = activeReservationFor(data, dinner.id, currentUser.id);
  const booking = checkBookable(data, dinner.id, currentUser.id, now);
  const ratings = hostRatings(data, dinner.hostId);
  const reviews = reviewsForHost(data, dinner.hostId).slice(0, 3);
  const end = new Date(new Date(dinner.startsAt).getTime() + dinner.durationMinutes * 60000);

  let cta: React.ReactNode;
  if (isOwn) {
    cta = <Button title="Manage this dinner" icon="settings" onPress={() => router.push({ pathname: '/host/dinner/[id]', params: { id: dinner.id } })} />;
  } else if (reservation) {
    cta = (
      <Button
        title="View your reservation"
        icon="checkCircle"
        variant="secondary"
        onPress={() => router.push({ pathname: '/reservation/[id]', params: { id: reservation.id } })}
      />
    );
  } else if (booking.ok) {
    cta = (
      <Button
        title={mode === 'host' ? 'Reserve as guest' : 'Reserve a seat'}
        variant="accent"
        onPress={() => router.push({ pathname: '/reserve/[id]', params: { id: dinner.id } })}
      />
    );
  } else {
    const label =
      booking.code === 'full' ? 'Fully booked' : booking.code === 'allergen_conflict' ? 'Unavailable – allergen' : 'Not available';
    cta = <Button title={label} disabled variant="outline" />;
  }

  return (
    <View style={styles.root}>
      <StatusBar style={solidHeader ? 'dark' : 'light'} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.xxl }}>
        <DinnerImage image={dinner.mealImage} style={styles.hero} labelPosition="bottomRight" accessibilityLabel={dinner.menu.mainDish} />
        <View style={styles.heroShade} pointerEvents="none" />

        <View style={styles.sheet}>
          <View style={styles.tags}>
            <DietTag diet={dinner.diet} />
            <SocialTag social={dinner.social} />
            {status !== 'published' ? <DinnerStatusBadge status={status} /> : null}
          </View>

          <View style={{ gap: space.sm }}>
            <Txt variant="display">{dinner.title}</Txt>
            <Txt variant="body" color="inkSoft">
              {dinner.description}
            </Txt>
          </View>

          <View style={styles.facts}>
            <Fact icon="calendar" label="Date" value={formatLongDate(dinner.startsAt)} />
            <Fact icon="clock" label="Time" value={`${formatTime(dinner.startsAt)}–${formatTime(end)}`} detail={formatDuration(dinner.durationMinutes)} />
            <Fact
              icon="people"
              label="Seats"
              value={left === 0 ? 'Full' : `${left} of ${dinner.guestSeats} left`}
              detail={<SeatDots taken={taken} total={dinner.guestSeats} size={6} />}
            />
          </View>

          {/* Host */}
          <Card style={{ gap: space.md }}>
            <View style={styles.hostRow}>
              <Avatar user={host} size={52} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="overline" color="muted">
                  Your host
                </Txt>
                <Txt variant="title2">
                  {host?.firstName}
                  {host ? <Txt variant="callout" color="muted">{`  ·  ${ageFromBirthYear(host.birthYear, now)}`}</Txt> : null}
                </Txt>
                {host?.hostProfile ? (
                  <Txt variant="footnote" color="inkSoft">
                    {host.hostProfile.headline}
                  </Txt>
                ) : null}
              </View>
            </View>
            {host?.bio ? (
              <Txt variant="callout" color="inkSoft">
                {host.bio}
              </Txt>
            ) : null}
            <RatingSummary ratings={ratings} />
            <View style={styles.inline}>
              <Icon name="info" size={13} color={colors.muted} />
              <Txt variant="caption" color="muted" style={{ flex: 1 }}>
                Profile details are self-reported. Identity verification is not part of this demo.
              </Txt>
            </View>
          </Card>

          {/* Compatibility */}
          {compat ? (
            <View style={{ gap: space.md }}>
              <SectionHeader title="For you" subtitle="Checked against your preferences" />
              <Card style={{ gap: space.md }}>
                {compat.issues.map((issue) => (
                  <CheckLine
                    key={issue.message}
                    icon={issue.severity === 'block' ? 'hand' : issue.severity === 'warn' ? 'warning' : 'info'}
                    color={issue.severity === 'block' ? colors.danger : issue.severity === 'warn' ? colors.warning : colors.info}
                    text={issue.message}
                  />
                ))}
                {compat.positives.map((p) => (
                  <CheckLine key={p} icon="checkCircle" color={colors.forest} text={p} />
                ))}
                {compat.blocked ? (
                  <Notice tone="danger" title="Booking disabled for your safety">
                    Eat&Meet does not let you book dinners that declare one of your listed allergens.
                  </Notice>
                ) : null}
              </Card>
            </View>
          ) : null}

          {/* Location */}
          <Card style={{ gap: space.sm }}>
            <View style={styles.inline}>
              <Icon name="location" size={18} color={colors.terracotta} />
              <Txt variant="title3">{dinner.neighborhood}, Groningen</Txt>
            </View>
            {dinner.areaHint ? (
              <Txt variant="callout" color="inkSoft">
                {dinner.areaHint}
              </Txt>
            ) : null}
            {reservation || isOwn ? (
              <Notice tone="success" icon="location" title="Exact address">
                {dinner.privateAddress}
              </Notice>
            ) : (
              <View style={styles.inline}>
                <Icon name="lock" size={13} color={colors.muted} />
                <Txt variant="footnote" color="muted">
                  The exact address is shared after your reservation is confirmed.
                </Txt>
              </View>
            )}
          </Card>

          {/* Atmosphere */}
          <View style={{ gap: space.md }}>
            <SectionHeader title="Atmosphere" />
            <Card style={{ gap: space.lg }}>
              <InfoRow icon={SOCIAL_ICON[dinner.social]} title={SOCIAL_LABEL[dinner.social]} body={SOCIAL_HINT[dinner.social]} />
              <Divider />
              <InfoRow
                icon={dinner.alcohol === 'alcohol_free' ? 'tea' : 'wine'}
                title={ALCOHOL_POLICY_LABEL[dinner.alcohol]}
                body={ALCOHOL_POLICY_HINT[dinner.alcohol]}
              />
              <Divider />
              <InfoRow
                icon="people"
                title={dinner.ageGroup === 'any' ? 'All adults welcome' : `Host suggests ${AGE_GROUP_LABEL[dinner.ageGroup]}`}
                body="Age groups are a voluntary social preference. Every adult (18+) can book."
              />
            </Card>
          </View>

          {/* Menu */}
          <View style={{ gap: space.md }}>
            <SectionHeader title="On the menu" />
            <Card style={{ gap: space.md }}>
              <MenuLine label="Main" value={dinner.menu.mainDish} />
              {dinner.menu.sides.length > 0 ? <MenuLine label="Sides" value={dinner.menu.sides.join(' · ')} /> : null}
              {dinner.menu.dessert ? <MenuLine label="Dessert" value={dinner.menu.dessert} /> : null}
              {dinner.menu.drinks ? <MenuLine label="Drinks" value={dinner.menu.drinks} /> : null}
              {dinner.dietaryTags.length > 0 ? (
                <View style={styles.tags}>
                  {dinner.dietaryTags.map((t) => (
                    <Tag key={t} label={DIETARY_TAG_LABEL[t]} tone="sage" icon="check" size="sm" />
                  ))}
                </View>
              ) : null}
            </Card>
          </View>

          {/* Allergens */}
          <View style={{ gap: space.md }}>
            <SectionHeader title="Allergens" subtitle="Declared by the host (EU 14 allergens)" />
            <Card style={{ gap: space.md }}>
              {allergens.length === 0 ? (
                <Txt variant="callout">No allergens declared.</Txt>
              ) : (
                <View style={styles.tags}>
                  {allergens.map((a) => {
                    const mine = currentUser.preferences.allergies.includes(a) && !isOwn;
                    return <Tag key={a} label={ALLERGEN_LABEL[a]} tone={mine ? 'danger' : 'warning'} icon={mine ? 'hand' : 'warning'} />;
                  })}
                </View>
              )}
              <Notice tone="neutral">
                Allergen information is self-reported by the host and not verified by Eat&Meet. Home kitchens are not allergen-free;
                cross-contact is always possible.
              </Notice>
            </Card>
          </View>

          {/* Ingredients */}
          <View style={{ gap: space.md }}>
            <SectionHeader title="Ingredients" subtitle={`${dinner.ingredients.length} items · bought for confirmed diners`} />
            <Card padding={0}>
              {dinner.ingredients.map((ing, i) => (
                <View key={ing.id} style={[styles.ingredient, i > 0 && styles.ingredientBorder]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="callout" weight="600">
                      {ing.name}
                    </Txt>
                    {ing.allergens.length > 0 ? (
                      <Txt variant="caption" color="warning">
                        Contains {ing.allergens.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(', ')}
                      </Txt>
                    ) : null}
                  </View>
                  <Txt variant="footnote" color="muted" align="right">
                    {formatQuantity(ing.quantity, ing.unit)}
                    {'\n'}
                    {ing.scaling === 'per_serving' ? 'per plate' : 'whole dinner'}
                  </Txt>
                </View>
              ))}
            </Card>
          </View>

          {/* Table */}
          <View style={{ gap: space.md }}>
            <SectionHeader title="The table" subtitle="Where you will eat" />
            <DinnerImage image={dinner.tableImage} style={styles.table} labelPosition="bottomLeft" accessibilityLabel="Dinner table" />
          </View>

          {dinner.houseRules.length > 0 ? (
            <View style={{ gap: space.md }}>
              <SectionHeader title="House rules" />
              <Card style={{ gap: space.sm }}>
                {dinner.houseRules.map((r) => (
                  <View key={r} style={styles.inline}>
                    <Icon name="check" size={14} color={colors.forest} />
                    <Txt variant="callout">{r}</Txt>
                  </View>
                ))}
              </Card>
            </View>
          ) : null}

          <PriceBreakdown pricing={pricing} title="Price per guest" />

          <Notice tone="info" icon="shield" title="Safety on Eat&Meet">
            Hygiene scores reflect guest experiences, not official food-safety inspections. Eat&Meet does not verify home kitchens in
            this demo.
          </Notice>

          {reviews.length > 0 ? (
            <View style={{ gap: space.md }}>
              <SectionHeader title={`What guests say about ${host?.firstName}`} />
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} showDinner />
              ))}
            </View>
          ) : null}

          {!isOwn ? (
            <Button
              title="Report this dinner or host"
              icon="flag"
              variant="ghost"
              size="md"
              onPress={() => router.push({ pathname: '/report/[id]', params: { id: dinner.id } })}
            />
          ) : null}
        </View>
      </Animated.ScrollView>

      <Animated.View pointerEvents="none" style={[styles.bar, { height: insets.top + 56, paddingTop: insets.top }, barStyle]}>
        <Txt variant="headline" numberOfLines={1} style={{ marginHorizontal: 64 }} align="center">
          {dinner.title}
        </Txt>
      </Animated.View>

      <View style={[styles.floating, { top: insets.top + space.sm }]}>
        <IconButton icon="back" label="Back" onPress={() => goBack()} />
        {!isOwn ? (
          <IconButton icon="flag" label="Report" onPress={() => router.push({ pathname: '/report/[id]', params: { id: dinner.id } })} />
        ) : null}
      </View>

      <FooterBar>
        <View style={styles.footerRow}>
          <View style={{ gap: 0 }}>
            <Txt variant="title2" color="forest">
              {formatEUR(pricing.totalPerGuestCents)}
            </Txt>
            <Txt variant="caption" color="muted">
              per guest · {left === 0 ? 'full' : `${left} seats left`}
            </Txt>
          </View>
          <View style={{ flex: 1 }}>{cta}</View>
        </View>
      </FooterBar>
    </View>
  );
}

function Fact({ icon, label, value, detail }: { icon: IconName; label: string; value: string; detail?: React.ReactNode }) {
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={16} color={colors.terracotta} />
      <Txt variant="caption" color="muted">
        {label}
      </Txt>
      <Txt variant="callout" weight="700" numberOfLines={2}>
        {value}
      </Txt>
      {typeof detail === 'string' ? (
        <Txt variant="caption" color="muted">
          {detail}
        </Txt>
      ) : (
        detail
      )}
    </View>
  );
}

function CheckLine({ icon, color, text }: { icon: IconName; color: string; text: string }) {
  return (
    <View style={styles.checkLine}>
      <Icon name={icon} size={16} color={color} style={{ marginTop: 2 }} />
      <Txt variant="callout" style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}

function InfoRow({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View style={styles.checkLine}>
      <View style={styles.infoIcon}>
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

function MenuLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Txt variant="overline" color="terracottaDeep">
        {label}
      </Txt>
      <Txt variant="body">{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  hero: { height: 380, width: '100%' },
  heroShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 100%)',
  },
  sheet: {
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.cream,
    paddingHorizontal: gutter,
    paddingTop: space.xxl,
    gap: space.xxl,
  },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    backgroundColor: colors.cream,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lineStrong,
  },
  floating: { position: 'absolute', left: gutter - 4, right: gutter - 4, flexDirection: 'row', justifyContent: 'space-between' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  facts: { flexDirection: 'row', gap: space.sm },
  fact: {
    flex: 1,
    gap: 3,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  hostRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  checkLine: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  infoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  ingredientBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  table: { height: 210, borderRadius: radius.lg },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
});
