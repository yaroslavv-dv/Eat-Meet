import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DinnerImage } from '@/components/dinner/dinner-image';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Txt } from '@/components/ui/text';
import { demoImage, type DemoImageKey } from '@/data/images';
import type { ImageRef } from '@/domain/types';
import { colors, gutter, radius, space } from '@/theme/tokens';

/**
 * Lets hosts pick their own photo (Expo image picker) or a clearly labelled
 * demo stock image for presentations.
 */
export function PhotoPicker({
  title,
  description,
  value,
  onChange,
  demoKeys,
  error,
  aspect,
}: {
  title: string;
  description: string;
  value: ImageRef | null;
  onChange: (ref: ImageRef | null) => void;
  demoKeys: DemoImageKey[];
  error?: string;
  aspect: [number, number];
}) {
  const [pickError, setPickError] = useState<string | null>(null);

  const pick = async () => {
    setPickError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) onChange({ kind: 'uri', uri: result.assets[0].uri });
    } catch {
      setPickError('Could not open your photo library. Choose a demo photo instead.');
    }
  };

  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Txt variant="title3">{title}</Txt>
        <Txt variant="footnote" color="muted">
          {description}
        </Txt>
      </View>

      {value ? (
        <View>
          <DinnerImage image={value} style={[styles.preview, { aspectRatio: aspect[0] / aspect[1] }]} labelPosition="bottomLeft" />
          <View style={styles.previewActions}>
            <Button title="Change" size="sm" variant="light" icon="photo" onPress={pick} />
            <Button title="Remove" size="sm" variant="light" icon="trash" onPress={() => onChange(null)} />
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose ${title.toLowerCase()} from your library`}
          onPress={pick}
          style={({ pressed }) => [styles.drop, !!error && { borderColor: colors.danger }, pressed && { opacity: 0.85 }]}>
          <View style={styles.dropIcon}>
            <Icon name="addPhoto" size={22} color={colors.forest} />
          </View>
          <Txt variant="headline" color="forest">
            Choose from your photos
          </Txt>
          <Txt variant="footnote" color="muted">
            JPG or PNG · cropped to {aspect[0]}:{aspect[1]}
          </Txt>
        </Pressable>
      )}
      <FieldError message={pickError ?? error} />

      <View style={{ gap: space.sm }}>
        <Txt variant="footnote" weight="600" color="inkSoft">
          Or use a demo photo
          <Txt variant="footnote" color="muted"> · stock images, labelled as demo</Txt>
        </Txt>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -gutter }}
          contentContainerStyle={{ paddingHorizontal: gutter, gap: space.sm }}>
          {demoKeys.map((key) => {
            const selected = value?.kind === 'demo' && value.key === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`Demo photo ${key.split('/')[1].replace('-', ' ')}`}
                accessibilityState={{ selected }}
                onPress={() => onChange(demoImage(key))}
                style={[styles.thumbWrap, selected && styles.thumbSelected]}>
                <DinnerImage image={demoImage(key)} style={styles.thumb} showLabel={false} />
                {selected ? (
                  <View style={styles.check}>
                    <Icon name="check" size={12} color={colors.paper} weight="bold" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', borderRadius: radius.lg },
  previewActions: { position: 'absolute', top: space.md, right: space.md, flexDirection: 'row', gap: space.sm },
  drop: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: space.xxl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.sageDeep,
    backgroundColor: colors.sageSoft,
  },
  dropIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  thumbWrap: { borderRadius: radius.md + 3, borderWidth: 3, borderColor: 'transparent' },
  thumbSelected: { borderColor: colors.terracotta },
  thumb: { width: 92, height: 70, borderRadius: radius.md },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
