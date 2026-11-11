import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { colors, fonts } from '@/theme/tokens';

/** Eat&Meet wordmark: serif type with the terracotta ampersand, optionally with the plate mark. */
export function Wordmark({ size = 28, light = false, withMark = false }: { size?: number; light?: boolean; withMark?: boolean }) {
  const ink = light ? colors.onDark : colors.ink;
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Eat and Meet">
      {withMark ? <Image source={require('@/assets/images/icon.png')} style={{ width: size * 1.25, height: size * 1.25, borderRadius: size * 0.32 }} /> : null}
      <Txt style={{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.15, color: ink, letterSpacing: -0.5 }}>
        Eat
        <Txt style={{ fontFamily: fonts.displayItalic, fontSize: size * 1.05, color: colors.terracotta }}>&amp;</Txt>
        Meet
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
