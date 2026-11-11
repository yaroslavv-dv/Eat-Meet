import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Txt } from '@/components/ui/text';
import { formatWhen } from '@/domain/dates';
import type { Dinner } from '@/domain/types';
import { useStore } from '@/state/store';
import { colors, radius, space } from '@/theme/tokens';

import { DinnerImage } from './dinner-image';

/** Compact list row: thumbnail, title, when/where, a status slot and a trailing value. */
export function DinnerRow({
  dinner,
  onPress,
  badge,
  trailing,
  footer,
}: {
  dinner: Dinner;
  onPress: () => void;
  badge?: ReactNode;
  trailing?: string;
  footer?: ReactNode;
}) {
  const { now } = useStore();
  return (
    <Card padding={space.md} style={{ gap: space.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dinner.title || 'Untitled dinner'}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
        <DinnerImage image={dinner.mealImage} style={styles.thumb} showLabel={false} />
        <View style={styles.body}>
          <Txt variant="headline" numberOfLines={1}>
            {dinner.title || 'Untitled dinner'}
          </Txt>
          <View style={styles.meta}>
            <Icon name="calendar" size={12} color={colors.muted} />
            <Txt variant="footnote" color="muted" numberOfLines={1}>
              {formatWhen(dinner.startsAt, now)} · {dinner.neighborhood}
            </Txt>
          </View>
          <View style={styles.badgeRow}>
            {badge}
            {trailing ? (
              <Txt variant="callout" weight="700" style={{ marginLeft: 'auto', fontVariant: ['tabular-nums'] }}>
                {trailing}
              </Txt>
            ) : null}
          </View>
        </View>
        <Icon name="chevronRight" size={13} color={colors.faint} />
      </Pressable>
      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  thumb: { width: 76, height: 76, borderRadius: radius.md },
  body: { flex: 1, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2 },
});
