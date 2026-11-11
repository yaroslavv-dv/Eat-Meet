import * as Haptics from 'expo-haptics';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow, space } from '@/theme/tokens';

import { Icon } from './icon';
import { Txt } from './text';

type ToastTone = 'success' | 'error' | 'info';
interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const show = (message: string, tone: ToastTone = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    Haptics.notificationAsync(
      tone === 'error' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
    setToast({ id: Date.now(), message, tone });
    timer.current = setTimeout(() => setToast(null), 2600);
  };

  const bg = toast?.tone === 'error' ? colors.danger : toast?.tone === 'info' ? colors.ink : colors.forest;

  return (
    <ToastContext.Provider value={show}>
      {children}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + space.sm }]}>
        {toast ? (
          <Animated.View
            key={toast.id}
            entering={FadeInUp.springify().damping(18)}
            exiting={FadeOutUp.duration(180)}
            style={[styles.toast, { backgroundColor: bg }]}
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert">
            <Icon
              name={toast.tone === 'error' ? 'warning' : toast.tone === 'info' ? 'info' : 'checkCircle'}
              size={18}
              color={colors.onDark}
            />
            <Txt variant="callout" weight="600" color="onDark" style={{ flexShrink: 1 }}>
              {toast.message}
            </Txt>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    maxWidth: '90%',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    ...shadow.raised,
  },
});
