import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { greeting, TabHeader } from '@/components/app/tab-header';
import { DinnerCard } from '@/components/dinner/dinner-card';
import { FiltersSheet } from '@/components/guest/filters-sheet';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { EmptyState } from '@/components/ui/misc';
import { TabScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { CITY } from '@/domain/constants';
import { activeFilterCount, applyFilters, DEFAULT_FILTERS, type DiscoverFilters } from '@/domain/filters';
import { discoverableDinners } from '@/domain/selectors';
import { useStore } from '@/state/store';
import { colors, gutter, radius, space } from '@/theme/tokens';

type Quick = { key: string; label: string; icon?: IconName; active: (f: DiscoverFilters) => boolean; toggle: (f: DiscoverFilters) => DiscoverFilters };

const QUICK_FILTERS: Quick[] = [
  {
    key: 'fits',
    label: 'Fits me',
    icon: 'checkCircle',
    active: (f) => f.matchesMe,
    toggle: (f) => ({ ...f, matchesMe: !f.matchesMe }),
  },
  {
    key: 'veg',
    label: 'Vegetarian',
    icon: 'leaf',
    active: (f) => f.suitableFor === 'vegetarian',
    toggle: (f) => ({ ...f, suitableFor: f.suitableFor === 'vegetarian' ? null : 'vegetarian' }),
  },
  {
    key: 'vegan',
    label: 'Vegan',
    icon: 'leaf',
    active: (f) => f.suitableFor === 'vegan',
    toggle: (f) => ({ ...f, suitableFor: f.suitableFor === 'vegan' ? null : 'vegan' }),
  },
  {
    key: 'af',
    label: 'Alcohol-free',
    icon: 'tea',
    active: (f) => f.alcoholFreeOnly,
    toggle: (f) => ({ ...f, alcoholFreeOnly: !f.alcoholFreeOnly }),
  },
  {
    key: 'meet',
    label: 'Eat & Meet',
    icon: 'chat',
    active: (f) => f.social.length === 1 && f.social[0] === 'eat_meet',
    toggle: (f) => ({ ...f, social: f.social.length === 1 && f.social[0] === 'eat_meet' ? [] : ['eat_meet'] }),
  },
  {
    key: 'just',
    label: 'Just Eat',
    icon: 'forkKnife',
    active: (f) => f.social.length === 1 && f.social[0] === 'just_eat',
    toggle: (f) => ({ ...f, social: f.social.length === 1 && f.social[0] === 'just_eat' ? [] : ['just_eat'] }),
  },
  {
    key: 'week',
    label: 'Next 7 days',
    icon: 'calendar',
    active: (f) => f.date === 'week',
    toggle: (f) => ({ ...f, date: f.date === 'week' ? 'any' : 'week' }),
  },
  {
    key: 'seats',
    label: 'Seats free',
    icon: 'people',
    active: (f) => f.minSeats >= 1,
    toggle: (f) => ({ ...f, minSeats: f.minSeats >= 1 ? 0 : 1 }),
  },
];

export function DiscoverScreen() {
  const { data, now, currentUser } = useStore();
  const [filters, setFilters] = useState<DiscoverFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const all = discoverableDinners(data, now);
  const results = applyFilters(data, all, filters, currentUser.preferences, now);
  const filterCount = activeFilterCount(filters);
  const hasAnyFilter = filterCount > 0 || filters.query.trim().length > 0;

  return (
    <TabScreen>
      <TabHeader overline={`${greeting(now)}, ${currentUser.firstName}`} title={`Dinners in ${CITY}`}>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Icon name="search" size={17} color={colors.muted} />
            <TextInput
              value={filters.query}
              onChangeText={(query) => setFilters({ ...filters, query })}
              placeholder="Dish, ingredient, host or area"
              placeholderTextColor={colors.faint}
              returnKeyType="search"
              clearButtonMode="while-editing"
              style={styles.searchInput}
              accessibilityLabel="Search dinners"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filters${filterCount ? `, ${filterCount} active` : ''}`}
            onPress={() => setShowFilters(true)}
            style={({ pressed }) => [styles.filterButton, filterCount > 0 && styles.filterButtonActive, pressed && { opacity: 0.85 }]}>
            <Icon name="filter" size={18} color={filterCount > 0 ? colors.onDark : colors.ink} />
            {filterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Txt variant="caption" weight="700" color="paper" style={{ fontSize: 10, lineHeight: 12 }}>
                  {filterCount}
                </Txt>
              </View>
            ) : null}
          </Pressable>
        </View>
      </TabHeader>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -gutter, marginTop: -space.md }}
        contentContainerStyle={{ paddingHorizontal: gutter, gap: space.sm }}>
        {QUICK_FILTERS.map((q) => (
          <Chip key={q.key} label={q.label} icon={q.icon} selected={q.active(filters)} onPress={() => setFilters(q.toggle(filters))} />
        ))}
      </ScrollView>

      {!hasAnyFilter ? <HowItWorks /> : null}

      <View style={{ gap: space.lg }}>
        <View style={styles.resultsHeader}>
          <Txt variant="title2">
            {results.length === 1 ? '1 upcoming dinner' : `${results.length} upcoming dinners`}
          </Txt>
          {hasAnyFilter ? (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setFilters(DEFAULT_FILTERS)}>
              <Txt variant="footnote" weight="700" color="forest">
                Clear all
              </Txt>
            </Pressable>
          ) : null}
        </View>

        {results.length === 0 ? (
          <Card tone="sand" elevated={false}>
            <EmptyState
              compact
              icon="search"
              title={all.length === 0 ? 'No dinners yet' : 'No dinners match'}
              message={
                all.length === 0
                  ? 'There are no upcoming dinners right now. Switch to hosting and publish the first one!'
                  : 'Try removing a filter or searching for something else.'
              }
              actionLabel={hasAnyFilter ? 'Clear filters' : undefined}
              onAction={hasAnyFilter ? () => setFilters(DEFAULT_FILTERS) : undefined}
            />
          </Card>
        ) : (
          results.map((dinner, index) => (
            <Animated.View key={dinner.id} entering={FadeInDown.delay(Math.min(index, 5) * 50).duration(320)}>
              <DinnerCard dinner={dinner} onPress={() => router.push({ pathname: '/dinner/[id]', params: { id: dinner.id } })} />
            </Animated.View>
          ))
        )}
      </View>

      <Txt variant="caption" color="faint" align="center" style={{ paddingHorizontal: space.xl }}>
        Demo listings with fictional hosts. Photos are stock images. Exact addresses are only shared after booking.
      </Txt>

      <FiltersSheet
        visible={showFilters}
        filters={filters}
        onChange={setFilters}
        onClose={() => setShowFilters(false)}
        resultCount={results.length}
      />
    </TabScreen>
  );
}

function HowItWorks() {
  const steps: { icon: IconName; title: string; body: string }[] = [
    { icon: 'forkKnife', title: 'Pick a table', body: 'Home-cooked dinners near you' },
    { icon: 'euro', title: 'Chip in', body: 'Share ingredient costs, transparently' },
    { icon: 'people', title: 'Eat (& meet)', body: 'Socialise as much as you like' },
  ];
  return (
    <Card tone="forest" padding={space.lg} style={{ gap: space.md }}>
      <Txt variant="overline" color="onDarkMuted">
        How Eat&Meet works
      </Txt>
      <View style={styles.steps}>
        {steps.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <View style={styles.stepIcon}>
              <Icon name={s.icon} size={18} color={colors.forest} />
            </View>
            <Txt variant="callout" weight="700" color="onDark">
              {i + 1}. {s.title}
            </Txt>
            <Txt variant="caption" color="onDarkMuted">
              {s.body}
            </Txt>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 50,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink, height: '100%' },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  steps: { flexDirection: 'row', gap: space.md },
  step: { flex: 1, gap: 4 },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
