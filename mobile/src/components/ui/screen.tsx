import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type ScrollViewInstance, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gutter, space, tabBarClearance } from '@/theme/tokens';

import { IconButton } from './button';
import { Txt } from './text';
import { goBack } from '@/lib/navigation';

const scrollDefaults: Partial<ScrollViewProps> = {
  keyboardShouldPersistTaps: 'handled',
  keyboardDismissMode: 'interactive',
  automaticallyAdjustKeyboardInsets: true,
  showsVerticalScrollIndicator: false,
  contentInsetAdjustmentBehavior: 'never',
};

/** Root screen of a tab: scrolls under the status bar and clears the tab bar. */
export function TabScreen({
  children,
  contentStyle,
  refreshControl,
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: ScrollViewProps['refreshControl'];
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        {...scrollDefaults}
        refreshControl={refreshControl}
        contentContainerStyle={[
          {
            // On web, NativeTabs renders its bar at the top instead of the bottom.
            paddingTop: insets.top + space.md + (Platform.OS === 'web' ? 64 : 0),
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? space.xxxl : tabBarClearance),
            paddingHorizontal: gutter,
            gap: space.xxl,
          },
          contentStyle,
        ]}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Header row with a back/close button, used by stack and modal screens. */
export function ScreenHeader({
  title,
  subtitle,
  variant = 'back',
  right,
  onClose,
  topInset = true,
}: {
  title?: string;
  subtitle?: string;
  variant?: 'back' | 'close' | 'none';
  right?: ReactNode;
  onClose?: () => void;
  topInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const close = onClose ?? (() => (goBack()));
  return (
    <View style={[styles.header, { paddingTop: (topInset ? insets.top : 0) + space.sm }]}>
      <View style={styles.headerSide}>
        {variant !== 'none' && (
          <IconButton
            icon={variant === 'close' ? 'close' : 'back'}
            label={variant === 'close' ? 'Close' : 'Back'}
            onPress={close}
            tone="sand"
            size={38}
          />
        )}
      </View>
      <View style={styles.headerTitle}>
        {title ? (
          <Txt variant="headline" align="center" numberOfLines={1}>
            {title}
          </Txt>
        ) : null}
        {subtitle ? (
          <Txt variant="caption" color="muted" align="center" numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

/**
 * Pushed or modal screen with a header, scrollable body and optional sticky
 * footer (for primary actions).
 */
export function StackScreen({
  title,
  subtitle,
  variant = 'back',
  headerRight,
  children,
  footer,
  contentStyle,
  modal = false,
  onClose,
  scrollRef,
}: {
  title?: string;
  subtitle?: string;
  variant?: 'back' | 'close' | 'none';
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** iOS page-sheet modals have no status bar inset at the top. */
  modal?: boolean;
  onClose?: () => void;
  scrollRef?: React.Ref<ScrollViewInstance>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <StatusBar style={modal ? 'light' : 'dark'} />
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        variant={variant}
        right={headerRight}
        onClose={onClose}
        topInset={!modal}
      />
      <ScrollView
        ref={scrollRef}
        {...scrollDefaults}
        contentContainerStyle={[
          {
            paddingHorizontal: gutter,
            paddingTop: space.md,
            paddingBottom: footer ? space.xxl : insets.bottom + space.xxxl,
            gap: space.xxl,
          },
          contentStyle,
        ]}>
        {children}
      </ScrollView>
      {footer ? <FooterBar>{footer}</FooterBar> : null}
    </View>
  );
}

export function FooterBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: gutter - 4,
    paddingBottom: space.sm,
    backgroundColor: colors.cream,
  },
  headerSide: { width: 76, justifyContent: 'center' },
  headerTitle: { flex: 1, alignItems: 'center' },
  footer: {
    paddingHorizontal: gutter,
    paddingTop: space.md,
    backgroundColor: colors.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineStrong,
    gap: space.sm,
  },
});
