import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { User } from '@/domain/types';
import { initials } from '@/domain/selectors';
import { colors, radius, space, type ColorName } from '@/theme/tokens';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Txt } from './text';

export function Avatar({ user, size = 40, ring = false }: { user: User | undefined; size?: number; ring?: boolean }) {
  return (
    <View
      accessibilityLabel={user ? `${user.firstName}'s avatar` : 'Avatar'}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: user?.avatarColor ?? colors.faint },
        ring && { borderWidth: 2.5, borderColor: colors.paper },
      ]}>
      <Txt color="paper" weight="700" style={{ fontSize: size * 0.38, lineHeight: size * 0.46 }}>
        {initials(user)}
      </Txt>
    </View>
  );
}

export function Stars({ value, size = 14, color = colors.honey }: { value: number; size?: number; color?: string }) {
  return (
    <View style={styles.stars} accessibilityLabel={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} color={value >= i - 0.25 ? color : colors.line} />
      ))}
    </View>
  );
}

export function StarInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <View style={styles.starInput} accessibilityRole="adjustable" accessibilityLabel={`${label}: ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          accessibilityRole="button"
          accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}
          hitSlop={4}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onChange(i);
          }}
          style={styles.starButton}>
          <Icon name="star" size={30} color={value >= i ? colors.honey : colors.lineStrong} />
        </Pressable>
      ))}
    </View>
  );
}

type NoticeTone = 'info' | 'warning' | 'danger' | 'success' | 'demo' | 'neutral';

const NOTICE: Record<NoticeTone, { bg: string; border: string; fg: ColorName; icon: IconName }> = {
  info: { bg: colors.infoSoft, border: '#CFE0EB', fg: 'info', icon: 'info' },
  warning: { bg: colors.warningSoft, border: '#F3DDB0', fg: 'warning', icon: 'warning' },
  danger: { bg: colors.dangerSoft, border: '#F6C9C4', fg: 'danger', icon: 'hand' },
  success: { bg: colors.successSoft, border: colors.sage, fg: 'forest', icon: 'checkCircle' },
  demo: { bg: colors.honeySoft, border: '#F1DDB6', fg: 'warning', icon: 'lock' },
  neutral: { bg: colors.sand, border: colors.line, fg: 'inkSoft', icon: 'info' },
};

export function Notice({
  tone = 'info',
  title,
  children,
  icon,
  style,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: React.ReactNode;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const t = NOTICE[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      <Icon name={icon ?? t.icon} size={18} color={colors[t.fg]} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <Txt variant="callout" weight="700" color={t.fg}>
            {title}
          </Txt>
        ) : null}
        {typeof children === 'string' ? (
          <Txt variant="footnote" color="inkSoft">
            {children}
          </Txt>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/** Explicit marker for simulated functionality. */
export function DemoBadge({ label = 'DEMO', style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.demo, style]}>
      <Txt variant="overline" color="warning" style={{ fontSize: 10, letterSpacing: 0.8 }}>
        {label}
      </Txt>
    </View>
  );
}

/** Small label placed on stock photos so they are never mistaken for a host's real home or meal. */
export function PhotoLabel({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.photoLabel, style]} accessibilityLabel="Demo stock photo">
      <Icon name="photo" size={10} color={colors.onDark} />
      <Txt variant="caption" color="onDark" style={{ fontSize: 10, lineHeight: 13 }}>
        Demo photo
      </Txt>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.empty, compact && { paddingVertical: space.xxl }]}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={26} color={colors.forest} />
      </View>
      <Txt variant="title2" align="center">
        {title}
      </Txt>
      <Txt variant="callout" color="muted" align="center" style={{ maxWidth: 300 }}>
        {message}
      </Txt>
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" size="md" style={{ marginTop: space.sm }} />
      ) : null}
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="title2" accessibilityRole="header">
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="footnote" color="muted">
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}>
          <Txt variant="footnote" weight="700" color="forest">
            {actionLabel}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

export function KeyValue({
  label,
  value,
  strong,
  muted,
  icon,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  icon?: IconName;
}) {
  return (
    <View style={styles.kv}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        {icon ? <Icon name={icon} size={15} color={colors.muted} /> : null}
        <Txt variant={strong ? 'headline' : 'callout'} color={muted ? 'muted' : 'inkSoft'} style={{ flex: 1 }}>
          {label}
        </Txt>
      </View>
      <Txt variant={strong ? 'headline' : 'callout'} weight={strong ? '700' : '500'} color={muted ? 'muted' : 'ink'} style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Txt>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function ProgressBar({
  value,
  color = colors.forest,
  track = colors.sand,
  height = 8,
}: {
  value: number;
  color?: string;
  track?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** One dot per guest seat – filled when taken. */
export function SeatDots({ taken, total, size = 8 }: { taken: number; total: number; size?: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`${taken} of ${total} seats taken`}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: i < taken ? colors.terracotta : 'transparent',
            borderWidth: 1.5,
            borderColor: i < taken ? colors.terracotta : colors.lineStrong,
          }}
        />
      ))}
    </View>
  );
}

export function LoadingView({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.forest} />
      <Txt variant="footnote" color="muted">
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  stars: { flexDirection: 'row', gap: 2 },
  starInput: { flexDirection: 'row', gap: space.xs },
  starButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1 },
  demo: {
    alignSelf: 'flex-start',
    backgroundColor: colors.honeySoft,
    borderColor: '#EED7A8',
    borderWidth: 1,
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  photoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20,26,22,0.55)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.huge, paddingHorizontal: space.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 26 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  dots: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, backgroundColor: colors.cream },
});
