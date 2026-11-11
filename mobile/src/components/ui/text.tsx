import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type ColorName, type TypographyVariant } from '@/theme/tokens';

export interface TxtProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorName;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
}

/** The only text component screens should use – enforces the type scale. */
export function Txt({ variant = 'body', color = 'ink', align, weight, style, ...rest }: TxtProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      style={[typography[variant], { color: colors[color] }, align && { textAlign: align }, weight && { fontWeight: weight }, style]}
      {...rest}
    />
  );
}
