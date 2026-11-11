import { DiscoverScreen } from '@/features/guest/discover-screen';
import { HostDashboardScreen } from '@/features/host/dashboard-screen';
import { useStore } from '@/state/store';

/** Home tab: Discover for guests, Dashboard for hosts. */
export default function HomeTab() {
  const { mode } = useStore();
  return mode === 'host' ? <HostDashboardScreen /> : <DiscoverScreen />;
}
