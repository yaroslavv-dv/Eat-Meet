import { Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces/500Medium_Italic';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { LoadingView } from '@/components/ui/misc';
import { Txt } from '@/components/ui/text';
import { ToastProvider } from '@/components/ui/toast';
import { AppStoreProvider, useStore, type StoreFallbackProps } from '@/state/store';
import { colors, space } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.forest,
    background: colors.cream,
    card: colors.cream,
    text: colors.ink,
    border: colors.line,
    notification: colors.terracotta,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <AppStoreProvider fallback={StoreFallback}>
        <ToastProvider>
          <HideSplash />
          <RootNavigator />
        </ToastProvider>
      </AppStoreProvider>
    </ThemeProvider>
  );
}

function HideSplash() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return null;
}

function StoreFallback({ status, error, retry, reset }: StoreFallbackProps) {
  useEffect(() => {
    if (status === 'error') SplashScreen.hideAsync().catch(() => {});
  }, [status]);
  if (status !== 'error') return <LoadingView label="Setting the table…" />;
  return (
    <View style={styles.error}>
      <Txt variant="title1" align="center">
        Something went wrong
      </Txt>
      <Txt variant="callout" color="muted" align="center">
        {error ?? 'The demo data could not be loaded.'}
      </Txt>
      <Button title="Try again" onPress={retry} />
      <Button title="Reset demo data" variant="outline" onPress={reset} />
    </View>
  );
}

function RootNavigator() {
  const { data } = useStore();
  const onboarded = data.session.onboarded;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="dinner/[id]" />
        <Stack.Screen name="reservation/[id]" />
        <Stack.Screen name="host/dinner/[id]" />
        <Stack.Screen name="host/shopping/[id]" />
        <Stack.Screen name="reserve/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="review/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="host/create" options={{ presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="host/complete/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="preferences" options={{ presentation: 'modal' }} />
        <Stack.Screen name="report/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="switch-profile" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    justifyContent: 'center',
    padding: space.xxl,
    gap: space.lg,
    backgroundColor: colors.cream,
  },
});
