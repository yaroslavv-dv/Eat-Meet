import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, space, typography } from '@/theme/tokens';

import { Icon } from './icon';
import { Txt } from './text';

export function FieldLabel({ label, optional, hint }: { label: string; optional?: boolean; hint?: string }) {
  return (
    <View style={styles.labelRow}>
      <Txt variant="footnote" weight="600" color="inkSoft">
        {label}
        {optional ? <Txt variant="footnote" color="faint"> · optional</Txt> : null}
      </Txt>
      {hint ? (
        <Txt variant="caption" color="muted">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorRow} accessibilityLiveRegion="polite">
      <Icon name="warning" size={12} color={colors.danger} />
      <Txt variant="footnote" color="danger" style={{ flex: 1 }}>
        {message}
      </Txt>
    </View>
  );
}

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
  containerStyle?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function TextField({
  label,
  optional,
  hint,
  error,
  prefix,
  suffix,
  multiline,
  containerStyle,
  compact,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <FieldLabel label={label} optional={optional} hint={hint} /> : null}
      <View
        style={[
          styles.inputWrap,
          compact && styles.inputCompact,
          multiline && styles.inputMultiline,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}>
        {prefix ? (
          <Txt variant="body" color="muted">
            {prefix}
          </Txt>
        ) : null}
        <TextInput
          placeholderTextColor={colors.faint}
          selectionColor={colors.forest}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, compact && { fontSize: 15 }, multiline && styles.inputMultilineText]}
          {...rest}
        />
        {suffix ? (
          <Txt variant="footnote" color="muted">
            {suffix}
          </Txt>
        ) : null}
      </View>
      <FieldError message={error} />
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  format,
  hint,
  error,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  hint?: string;
  error?: string;
}) {
  const change = (delta: number) => {
    const next = Math.round((value + delta) * 100) / 100;
    if (next < min || next > max) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(next);
  };
  return (
    <View style={styles.field}>
      {label ? <FieldLabel label={label} hint={hint} /> : null}
      <View style={styles.stepper}>
        <StepButton icon="minus" disabled={value - step < min} onPress={() => change(-step)} label="Decrease" />
        <Txt variant="title2" align="center" style={styles.stepValue} accessibilityLiveRegion="polite">
          {format ? format(value) : value}
        </Txt>
        <StepButton icon="plus" disabled={value + step > max} onPress={() => change(step)} label="Increase" />
      </View>
      <FieldError message={error} />
    </View>
  );
}

function StepButton({ icon, disabled, onPress, label }: { icon: 'minus' | 'plus'; disabled: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, disabled && { opacity: 0.35 }, pressed && { backgroundColor: colors.sage }]}>
      <Icon name={icon} size={18} color={colors.forest} weight="bold" />
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segmented, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) Haptics.selectionAsync().catch(() => {});
              onChange(o.value);
            }}
            style={[styles.segment, active && styles.segmentActive]}>
            <Txt variant="footnote" weight="600" color={active ? 'ink' : 'muted'} numberOfLines={1}>
              {o.label}
              {o.count != null ? ` · ${o.count}` : ''}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="headline">{title}</Txt>
        {description ? (
          <Txt variant="footnote" color="muted">
            {description}
          </Txt>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.forest, false: colors.lineStrong }}
        accessibilityLabel={title}
      />
    </View>
  );
}

/** Full-row checkbox used for acknowledgements. */
export function CheckRow({
  checked,
  onChange,
  title,
  description,
  tone = 'forest',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  tone?: 'forest' | 'danger';
}) {
  const accent = tone === 'danger' ? colors.danger : colors.forest;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={title}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onChange(!checked);
      }}
      style={({ pressed }) => [styles.checkRow, checked && { borderColor: accent, backgroundColor: colors.paper }, pressed && { opacity: 0.9 }]}>
      <View style={[styles.checkbox, checked && { backgroundColor: accent, borderColor: accent }]}>
        {checked && <Icon name="check" size={13} color={colors.paper} weight="bold" />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="callout" weight="600">
          {title}
        </Txt>
        {description ? (
          <Txt variant="footnote" color="muted">
            {description}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.sm },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingTop: 2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 52,
    paddingHorizontal: space.lg,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  inputCompact: { minHeight: 44, paddingHorizontal: space.md },
  inputMultiline: { alignItems: 'flex-start', paddingVertical: space.md, minHeight: 104 },
  inputFocused: { borderColor: colors.forest },
  inputError: { borderColor: colors.danger, backgroundColor: '#FFFBFA' },
  input: { flex: 1, ...typography.body, color: colors.ink, paddingVertical: 0 },
  inputMultilineText: { minHeight: 80 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.xs,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sageSoft,
  },
  stepValue: { flex: 1 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.sand,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: space.xs },
  segmentActive: {
    backgroundColor: colors.paper,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.sm },
  checkRow: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-start',
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.cream,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: colors.paper,
  },
});
