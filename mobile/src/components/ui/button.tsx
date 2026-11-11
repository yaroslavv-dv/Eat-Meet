import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Icon, type IconName } from './icon';
import { Txt } from './text';

type Variant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'light';
type Size = 'lg' | 'md' | 'sm';

const VARIANTS: Record<Variant, { bg: string; fg: keyof typeof colors; border?: string }> = {
  primary: { bg: colors.forest, fg: 'onDark' },
  accent: { bg: colors.terracotta, fg: 'paper' },
  secondary: { bg: colors.sage, fg: 'forest' },
  outline: { bg: 'transparent', fg: 'ink', border: colors.lineStrong },
  ghost: { bg: 'transparent', fg: 'forest' },
  danger: { bg: colors.dangerSoft, fg: 'danger' },
  light: { bg: colors.paper, fg: 'forest' },
};

const SIZES: Record<Size, { height: number; px: number; font: 'headline' | 'callout' | 'footnote'; icon: number }> = {
  lg: { height: 54, px: space.xxl, font: 'headline', icon: 18 },
  md: { height: 46, px: space.xl, font: 'headline', icon: 16 },
  sm: { height: 36, px: space.md, font: 'footnote', icon: 14 },
};

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  haptic = true,
  style,
  accessibilityHint,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={size === 'sm' ? 6 : 0}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.px,
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
          borderRadius: size === 'sm' ? radius.pill : radius.md + 2,
        },
        fullWidth && styles.fullWidth,
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors[v.fg]} />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} size={s.icon} color={colors[v.fg]} weight="semibold" />}
          <Txt variant={s.font} color={v.fg} weight="600" numberOfLines={1}>
            {title}
          </Txt>
          {iconRight && <Icon name={iconRight} size={s.icon} color={colors[v.fg]} weight="semibold" />}
        </View>
      )}
    </Pressable>
  );
}

/** Round icon-only button (back, close, share…). 44 pt touch target. */
export function IconButton({
  icon,
  onPress,
  label,
  tone = 'paper',
  size = 40,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'paper' | 'sand' | 'clear' | 'forest';
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = { paper: colors.paper, sand: colors.sand, clear: 'transparent', forest: colors.forest }[tone];
  const fg = tone === 'forest' ? colors.onDark : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={Math.max(0, (44 - size) / 2)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        tone === 'paper' && styles.iconShadow,
        pressed && styles.pressed,
        style,
      ]}>
      <Icon name={icon} size={size * 0.42} color={fg} weight="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  iconShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
