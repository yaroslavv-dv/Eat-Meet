import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space, type ColorName } from '@/theme/tokens';

import { Icon, type IconName } from './icon';
import { Txt } from './text';

/** Selectable pill used for filters and preference pickers. */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  count,
  tone = 'forest',
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  count?: number;
  tone?: 'forest' | 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  const activeBg = tone === 'danger' ? colors.danger : colors.forest;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      hitSlop={4}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected ? { backgroundColor: activeBg, borderColor: activeBg } : styles.idle,
        pressed && { opacity: 0.85 },
        style,
      ]}>
      {icon && <Icon name={icon} size={14} color={selected ? colors.onDark : colors.inkSoft} weight="semibold" />}
      <Txt variant="footnote" weight="600" color={selected ? 'onDark' : 'inkSoft'}>
        {label}
      </Txt>
      {count != null && count > 0 && (
        <View style={[styles.count, { backgroundColor: selected ? colors.paper : colors.forest }]}>
          <Txt variant="caption" weight="700" color={selected ? 'forest' : 'onDark'}>
            {count}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

export type TagTone = 'neutral' | 'forest' | 'sage' | 'terracotta' | 'warning' | 'danger' | 'info' | 'dark' | 'light';

const TAG_TONES: Record<TagTone, { bg: string; fg: ColorName }> = {
  neutral: { bg: colors.sand, fg: 'inkSoft' },
  forest: { bg: colors.forest, fg: 'onDark' },
  sage: { bg: colors.sage, fg: 'forest' },
  terracotta: { bg: colors.terracottaSoft, fg: 'terracottaDeep' },
  warning: { bg: colors.warningSoft, fg: 'warning' },
  danger: { bg: colors.dangerSoft, fg: 'danger' },
  info: { bg: colors.infoSoft, fg: 'info' },
  dark: { bg: 'rgba(22,30,25,0.72)', fg: 'onDark' },
  light: { bg: 'rgba(255,255,255,0.92)', fg: 'ink' },
};

/** Static label – diet, status, allergens. */
export function Tag({
  label,
  tone = 'neutral',
  icon,
  size = 'md',
  style,
}: {
  label: string;
  tone?: TagTone;
  icon?: IconName;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const t = TAG_TONES[tone];
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: t.bg, paddingVertical: size === 'sm' ? 3 : 5, paddingHorizontal: size === 'sm' ? 7 : 10 },
        style,
      ]}>
      {icon && <Icon name={icon} size={size === 'sm' ? 11 : 13} color={colors[t.fg]} weight="semibold" />}
      <Txt variant="caption" weight="600" color={t.fg} style={size === 'sm' ? { fontSize: 11 } : undefined}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    minHeight: 36,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  idle: { backgroundColor: colors.paper, borderColor: colors.line },
  count: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
