import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { PhotoLabel } from '@/components/ui/misc';
import { imageSource, isDemoImage } from '@/data/images';
import type { ImageRef } from '@/domain/types';
import { colors } from '@/theme/tokens';

/** Photo with a graceful placeholder and an automatic "Demo photo" label for stock images. */
export function DinnerImage({
  image,
  style,
  showLabel = true,
  labelPosition = 'bottomRight',
  accessibilityLabel,
}: {
  image: ImageRef | null | undefined;
  style?: StyleProp<ViewStyle>;
  showLabel?: boolean;
  labelPosition?: 'bottomRight' | 'bottomLeft' | 'topLeft';
  accessibilityLabel?: string;
}) {
  const source = imageSource(image);
  return (
    <View style={[styles.wrap, style]}>
      {source ? (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          accessibilityLabel={accessibilityLabel}
        />
      ) : (
        <View style={styles.placeholder}>
          <Icon name="photo" size={28} color={colors.sageDeep} />
        </View>
      )}
      {showLabel && isDemoImage(image) ? <PhotoLabel style={[styles.label, styles[labelPosition]]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.sand },
  placeholder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sageSoft },
  label: { position: 'absolute' },
  bottomRight: { right: 10, bottom: 10 },
  bottomLeft: { left: 10, bottom: 10 },
  topLeft: { left: 10, top: 10 },
});
