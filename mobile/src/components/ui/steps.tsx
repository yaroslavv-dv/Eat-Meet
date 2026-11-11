import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Txt } from './text';

/** Progress indicator for multi-step flows. */
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={{ gap: space.sm }} accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}>
      <View style={styles.bars}>
        {steps.map((s, i) => (
          <View key={s} style={[styles.bar, i <= current && { backgroundColor: i === current ? colors.terracotta : colors.forest }]} />
        ))}
      </View>
      <View style={styles.labels}>
        <Txt variant="overline" color="terracottaDeep">
          Step {current + 1} of {steps.length}
        </Txt>
        <Txt variant="footnote" weight="600" color="inkSoft">
          {steps[current]}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: colors.line },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
