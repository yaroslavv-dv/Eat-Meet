import { GuestDinnersScreen } from '@/features/guest/my-dinners-screen';
import { HostDinnersScreen } from '@/features/host/host-dinners-screen';
import { useStore } from '@/state/store';

export default function DinnersTab() {
  const { mode } = useStore();
  return mode === 'host' ? <HostDinnersScreen /> : <GuestDinnersScreen />;
}
