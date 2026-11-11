import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { colors, radius, shadow, space } from '@/theme/tokens';

type Tone = 'paper' | 'sage' | 'sand' | 'forest' | 'terracotta' | 'cream';

const TONES: Record<Tone, ViewStyle> = {
  paper: { backgroundColor: colors.paper, borderColor: colors.line },
  sage: { backgroundColor: colors.sageSoft, borderColor: colors.sage },
  sand: { backgroundColor: colors.sand, borderColor: colors.line },
  forest: { backgroundColor: colors.forest, borderColor: colors.forest },
  terracotta: { backgroundColor: colors.terracottaSoft, borderColor: '#F6D4C9' },
  cream: { backgroundColor: colors.cream, borderColor: colors.line },
};

export interface CardProps extends ViewProps {
  tone?: Tone;
  padding?: number;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ tone = 'paper', padding = space.lg, elevated = tone === 'paper', style, children, ...rest }: CardProps) {
  return (
    <View style={[styles.card, TONES[tone], { padding }, elevated && shadow.card, style]} {...rest}>
      {children}
    </View>
  );
}

export function PressableCard({
  tone = 'paper',
  padding = space.lg,
  elevated = tone === 'paper',
  style,
  children,
  onPress,
  accessibilityLabel,
}: CardProps & { onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        TONES[tone],
        { padding },
        elevated && shadow.card,
        pressed && styles.pressed,
        style,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
});
