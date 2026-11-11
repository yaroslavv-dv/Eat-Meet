import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { formatLongDate, formatTime } from '@/domain/dates';
import { colors, radius, space } from '@/theme/tokens';

import { Icon } from './icon';
import { Txt } from './text';

/**
 * Native date / time picker (SwiftUI on iOS, Material 3 dialog on Android) via
 * the @expo/ui drop-in replacement – runs in Expo Go.
 */
export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.row}>
        <View style={styles.label}>
          <Icon name={mode === 'date' ? 'calendar' : 'clock'} size={16} color={colors.forest} />
          <Txt variant="callout" weight="600">
            {label}
          </Txt>
        </View>
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          minimumDate={minimumDate}
          accentColor={colors.forest}
          themeVariant="light"
          locale="en_GB"
          onValueChange={(_, date) => onChange(date)}
        />
      </View>
    );
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${mode === 'date' ? formatLongDate(value) : formatTime(value)}`}
        onPress={() => setOpen(true)}
        style={styles.row}>
        <View style={styles.label}>
          <Icon name={mode === 'date' ? 'calendar' : 'clock'} size={16} color={colors.forest} />
          <Txt variant="callout" weight="600">
            {label}
          </Txt>
        </View>
        <View style={styles.valuePill}>
          <Txt variant="callout" weight="600">
            {mode === 'date' ? formatLongDate(value) : formatTime(value)}
          </Txt>
        </View>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value}
          mode={mode}
          minimumDate={minimumDate}
          is24Hour
          accentColor={colors.forest}
          onValueChange={(_, date) => {
            setOpen(false);
            onChange(date);
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  valuePill: { backgroundColor: colors.sand, paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.sm },
});
