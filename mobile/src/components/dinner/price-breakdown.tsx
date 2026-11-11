import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Divider, KeyValue } from '@/components/ui/misc';
import { Txt } from '@/components/ui/text';
import { PRICING } from '@/domain/constants';
import { plural } from '@/domain/dates';
import { formatEUR } from '@/domain/money';
import type { PriceBreakdown as Breakdown } from '@/domain/types';
import { chart, colors, radius, space } from '@/theme/tokens';

/** Transparent split of a guest's contribution. Used on details, reservation and host screens. */
export function PriceBreakdown({
  pricing,
  title = 'Your contribution',
  showExplainer = true,
  refundedCents,
}: {
  pricing: Pick<Breakdown, 'ingredientShareCents' | 'hostCompensationCents' | 'platformFeeCents' | 'totalPerGuestCents'> &
    Partial<Pick<Breakdown, 'plannedServings' | 'ingredientBudgetCents'>>;
  title?: string;
  showExplainer?: boolean;
  refundedCents?: number;
}) {
  const total = pricing.totalPerGuestCents;
  const parts = [
    { key: 'ing', value: pricing.ingredientShareCents, color: chart.series1 },
    { key: 'host', value: pricing.hostCompensationCents, color: chart.series2 },
    { key: 'fee', value: pricing.platformFeeCents, color: chart.series3 },
  ];
  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.titleRow}>
        <Txt variant="title3">{title}</Txt>
        <Txt variant="title2" color="forest">
          {formatEUR(total)}
        </Txt>
      </View>

      <View style={styles.bar} accessibilityElementsHidden>
        {parts.map((p) =>
          p.value > 0 ? <View key={p.key} style={{ flex: p.value, backgroundColor: p.color }} /> : null,
        )}
      </View>

      <View style={{ gap: space.sm }}>
        <LegendRow color={chart.series1} label="Ingredients (your share)" value={pricing.ingredientShareCents} />
        <LegendRow color={chart.series2} label="Host preparation" value={pricing.hostCompensationCents} />
        <LegendRow color={chart.series3} label="Platform service fee" value={pricing.platformFeeCents} />
      </View>
      <Divider />
      <KeyValue label="Total per guest" value={formatEUR(total)} strong />
      {refundedCents != null && refundedCents > 0 ? (
        <KeyValue label="Refunded (demo)" value={`−${formatEUR(refundedCents)}`} muted />
      ) : null}

      {showExplainer ? (
        <View style={styles.explainer}>
          <Icon name="info" size={14} color={colors.muted} />
          <Txt variant="footnote" color="muted" style={{ flex: 1 }}>
            {pricing.ingredientBudgetCents != null && pricing.plannedServings != null
              ? `The ${formatEUR(pricing.ingredientBudgetCents)} shopping budget is split over ${plural(pricing.plannedServings, 'plate')} – the host pays for their own. `
              : ''}
            Hosts earn a capped preparation fee; Eat&Meet keeps {Math.round(PRICING.platformFeeRate * 100)}% (min{' '}
            {formatEUR(PRICING.platformFeeMinCents)}, max {formatEUR(PRICING.platformFeeMaxCents)}) to run the platform. Alcohol is never
            included.
          </Txt>
        </View>
      ) : null}
    </Card>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.legend}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Txt variant="callout" color="inkSoft" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="callout" weight="600" style={{ fontVariant: ['tabular-nums'] }}>
        {formatEUR(value)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bar: { flexDirection: 'row', height: 10, borderRadius: radius.pill, overflow: 'hidden', gap: 2, backgroundColor: colors.paper },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  explainer: { flexDirection: 'row', gap: space.sm, paddingTop: space.xs },
});
