import { NativeTabs } from 'expo-router/native-tabs';

import { useStore } from '@/state/store';
import { colors } from '@/theme/tokens';

/**
 * Five tabs for both roles. Labels and icons adapt to the active mode, but the
 * routes stay the same so switching roles never remounts the navigator.
 */
export default function TabsLayout() {
  const { mode } = useStore();
  const host = mode === 'host';

  return (
    <NativeTabs tintColor={colors.forest} iconColor={{ default: colors.muted, selected: colors.forest }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{host ? 'Dashboard' : 'Discover'}</NativeTabs.Trigger.Label>
        {host ? (
          <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        ) : (
          <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
        )}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="dinners">
        <NativeTabs.Trigger.Label>My dinners</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="match">
        <NativeTabs.Trigger.Label>Match</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="groups" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="impact">
        <NativeTabs.Trigger.Label>Impact</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'leaf', selected: 'leaf.fill' }} md="eco" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
