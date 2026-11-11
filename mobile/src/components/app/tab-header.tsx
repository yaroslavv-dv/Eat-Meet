import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Avatar } from '@/components/ui/misc';
import { Txt } from '@/components/ui/text';
import { useStore } from '@/state/store';
import { colors, radius, space } from '@/theme/tokens';

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Editorial header for tab roots with the profile / role switcher on the right. */
export function TabHeader({ overline, title, children }: { overline?: string; title: string; children?: ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          {overline ? (
            <Txt variant="overline" color="terracottaDeep">
              {overline}
            </Txt>
          ) : null}
          <Txt variant="display" accessibilityRole="header">
            {title}
          </Txt>
        </View>
        <ProfileSwitcherButton />
      </View>
      {children}
    </View>
  );
}

export function ProfileSwitcherButton() {
  const { currentUser, mode } = useStore();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Signed in as ${currentUser.firstName}, ${mode} mode. Switch profile or role`}
      onPress={() => router.push('/switch-profile')}
      style={({ pressed }) => [styles.switcher, pressed && { opacity: 0.8 }]}>
      <Avatar user={currentUser} size={34} />
      <View style={{ gap: 0 }}>
        <Txt variant="caption" weight="700" style={{ lineHeight: 14 }}>
          {currentUser.firstName}
        </Txt>
        <Txt variant="caption" color={mode === 'host' ? 'terracottaDeep' : 'forest'} style={{ fontSize: 11, lineHeight: 13 }}>
          {mode === 'host' ? 'Hosting' : 'Guest'}
        </Txt>
      </View>
      <Icon name="swap" size={12} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: 4,
    paddingRight: space.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    minHeight: 44,
    marginTop: 2,
  },
});
