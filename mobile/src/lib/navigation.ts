import { router } from 'expo-router';

/** Go back when there is history (e.g. a pushed screen or modal); otherwise return home. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
