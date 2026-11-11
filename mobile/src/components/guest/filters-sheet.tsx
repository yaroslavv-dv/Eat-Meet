import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ToggleRow } from '@/components/ui/form';
import { Divider } from '@/components/ui/misc';
import { Txt } from '@/components/ui/text';
import { NEIGHBORHOODS, SOCIAL_LABEL } from '@/domain/constants';
import { DATE_FILTER_LABEL, DEFAULT_FILTERS, type DateFilter, type DiscoverFilters } from '@/domain/filters';
import { formatEUR } from '@/domain/money';
import type { DietClass, SocialStyle } from '@/domain/types';
import { colors, gutter, space } from '@/theme/tokens';

const DATES: DateFilter[] = ['any', 'today', 'tomorrow', 'week', 'weekend'];
const PRICES: (number | null)[] = [null, 600, 800, 1000];
const DIETS: { value: DietClass | null; label: string }[] = [
  { value: null, label: 'Any' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];
const SOCIALS: SocialStyle[] = ['eat_meet', 'just_eat', 'flexible'];
const SEATS = [0, 1, 2, 3];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FiltersSheet({
  visible,
  filters,
  onChange,
  onClose,
  resultCount,
}: {
  visible: boolean;
  filters: DiscoverFilters;
  onChange: (f: DiscoverFilters) => void;
  onClose: () => void;
  resultCount: number;
}) {
  const insets = useSafeAreaInsets();
  const set = <K extends keyof DiscoverFilters>(key: K, value: DiscoverFilters[K]) => onChange({ ...filters, [key]: value });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Button title="Reset" variant="ghost" size="sm" onPress={() => onChange({ ...DEFAULT_FILTERS, query: filters.query })} />
          <Txt variant="headline">Filters</Txt>
          <IconButton icon="close" label="Close filters" onPress={onClose} tone="sand" size={34} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Section title="Date">
            {DATES.map((d) => (
              <Chip key={d} label={DATE_FILTER_LABEL[d]} selected={filters.date === d} onPress={() => set('date', d)} />
            ))}
          </Section>

          <Section title="Price per guest">
            {PRICES.map((p) => (
              <Chip
                key={String(p)}
                label={p == null ? 'Any price' : `Up to ${formatEUR(p, { compact: true })}`}
                selected={filters.maxPriceCents === p}
                onPress={() => set('maxPriceCents', p)}
              />
            ))}
          </Section>

          <Section title="Suitable for" hint="Shows dishes that fit this diet – e.g. vegan dishes also suit vegetarians.">
            {DIETS.map((d) => (
              <Chip
                key={String(d.value)}
                label={d.label}
                selected={filters.suitableFor === d.value}
                onPress={() => set('suitableFor', d.value)}
                icon={d.value ? 'leaf' : undefined}
              />
            ))}
          </Section>

          <Section title="Atmosphere">
            {SOCIALS.map((s) => (
              <Chip key={s} label={SOCIAL_LABEL[s]} selected={filters.social.includes(s)} onPress={() => set('social', toggle(filters.social, s))} />
            ))}
          </Section>

          <Section title="Available seats">
            {SEATS.map((n) => (
              <Chip
                key={n}
                label={n === 0 ? 'Include full' : `${n}+ free`}
                selected={filters.minSeats === n}
                onPress={() => set('minSeats', n)}
              />
            ))}
          </Section>

          <Section title="Neighbourhood">
            {NEIGHBORHOODS.map((n) => (
              <Chip
                key={n}
                label={n}
                selected={filters.neighborhoods.includes(n)}
                onPress={() => set('neighborhoods', toggle(filters.neighborhoods, n))}
              />
            ))}
          </Section>

          <View style={{ gap: space.sm }}>
            <Divider />
            <ToggleRow
              title="Alcohol-free dinners only"
              value={filters.alcoholFreeOnly}
              onChange={(v) => set('alcoholFreeOnly', v)}
            />
            <ToggleRow
              title="Hide dinners with my allergens"
              description="Based on the allergens hosts declare. Hosts self-report – always double-check."
              value={filters.hideAllergenConflicts}
              onChange={(v) => set('hideAllergenConflicts', v)}
            />
            <ToggleRow
              title="Only dinners that fit my preferences"
              description="Diet, allergies, other dietary needs and alcohol preference."
              value={filters.matchesMe}
              onChange={(v) => set('matchesMe', v)}
            />
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <Button
            title={resultCount === 1 ? 'Show 1 dinner' : `Show ${resultCount} dinners`}
            onPress={onClose}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Txt variant="title3">{title}</Txt>
        {hint ? (
          <Txt variant="footnote" color="muted">
            {hint}
          </Txt>
        ) : null}
      </View>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter - 6,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lineStrong,
  },
  content: { padding: gutter, gap: space.xxl, paddingBottom: space.huge },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: {
    paddingHorizontal: gutter,
    paddingTop: space.md,
    backgroundColor: colors.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineStrong,
  },
});
