import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { TabHeader } from '@/components/app/tab-header';
import { DinnerStatusBadge } from '@/components/dinner/badges';
import { DinnerRow } from '@/components/dinner/dinner-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/form';
import { EmptyState } from '@/components/ui/misc';
import { TabScreen } from '@/components/ui/screen';
import { formatEUR } from '@/domain/money';
import { sumContributions } from '@/domain/pricing';
import { contributionsForDinner, dinnerDisplayStatus, dinnersForHost, seatsTaken } from '@/domain/selectors';
import type { Dinner } from '@/domain/types';
import { useStore } from '@/state/store';
import { space } from '@/theme/tokens';

type Tab = 'upcoming' | 'drafts' | 'past' | 'cancelled';

export function HostDinnersScreen() {
  const { data, now, currentUser } = useStore();
  const [tab, setTab] = useState<Tab>('upcoming');
  const mine = dinnersForHost(data, currentUser.id);
  const groups: Record<Tab, Dinner[]> = {
    upcoming: mine.filter((d) => d.status === 'published'),
    drafts: mine.filter((d) => d.status === 'draft'),
    past: mine.filter((d) => d.status === 'completed').reverse(),
    cancelled: mine.filter((d) => d.status === 'cancelled').reverse(),
  };
  const list = groups[tab];

  const open = (d: Dinner) =>
    d.status === 'draft'
      ? router.push({ pathname: '/host/create', params: { draftId: d.id } })
      : router.push({ pathname: '/host/dinner/[id]', params: { id: d.id } });

  return (
    <TabScreen>
      <TabHeader overline="Hosting" title="My dinners">
        <Button title="Create a dinner" icon="plus" onPress={() => router.push('/host/create')} />
      </TabHeader>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: 'Active', count: groups.upcoming.length },
          { value: 'drafts', label: 'Drafts', count: groups.drafts.length },
          { value: 'past', label: 'Past', count: groups.past.length },
          { value: 'cancelled', label: 'Cancelled', count: groups.cancelled.length },
        ]}
      />

      <View style={{ gap: space.md }}>
        {list.length === 0 ? (
          <Card tone="sand" elevated={false}>
            <EmptyState
              compact
              icon="forkKnife"
              title={tab === 'drafts' ? 'No drafts' : tab === 'cancelled' ? 'Nothing cancelled' : 'Nothing here yet'}
              message="Dinners you create appear here with their bookings, budget and status."
              actionLabel={tab === 'upcoming' || tab === 'drafts' ? 'Create a dinner' : undefined}
              onAction={tab === 'upcoming' || tab === 'drafts' ? () => router.push('/host/create') : undefined}
            />
          </Card>
        ) : (
          list.map((d) => {
            const money = sumContributions(contributionsForDinner(data, d.id));
            return (
              <DinnerRow
                key={d.id}
                dinner={d}
                onPress={() => open(d)}
                badge={<DinnerStatusBadge status={dinnerDisplayStatus(data, d, now)} size="sm" />}
                trailing={d.status === 'draft' ? undefined : `${seatsTaken(data, d.id)}/${d.guestSeats} · ${formatEUR(money.totalCents)}`}
              />
            );
          })
        )}
      </View>
    </TabScreen>
  );
}
