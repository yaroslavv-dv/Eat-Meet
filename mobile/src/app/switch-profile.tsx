import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { Avatar, Notice } from '@/components/ui/misc';
import { StackScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { GUEST_DIET_LABEL } from '@/domain/constants';
import { ageFromBirthYear } from '@/domain/dates';
import { dinnersForHost, reservationsForGuest } from '@/domain/selectors';
import type { AppMode, User } from '@/domain/types';
import { useStore } from '@/state/store';
import { space } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

/** Demo-only profile & role switcher – lets the jury follow guest and host journeys on one phone. */
export default function SwitchProfileScreen() {
  const { data, currentUser, mode, actions } = useStore();
  const toast = useToast();
  const personas = Object.values(data.users).filter((u) => u.demoPersona);

  const choose = (user: User, m: AppMode) => {
    actions.switchProfile(user.id, m);
    goBack();
    toast(`${user.firstName} · ${m === 'host' ? 'host mode' : 'guest mode'}`, 'info');
  };

  return (
    <StackScreen title="Switch profile" variant="close" modal>
      <Notice tone="demo" title="Demo profiles">
        In the real app each person signs in to their own account. For the presentation you can switch between demo people and roles
        here – data stays on this phone.
      </Notice>

      {personas.map((u) => {
        const isCurrent = u.id === currentUser.id;
        const reservations = reservationsForGuest(data, u.id).filter((r) => r.status !== 'cancelled').length;
        const hosted = dinnersForHost(data, u.id).filter((d) => d.status !== 'draft').length;
        return (
          <Card key={u.id} style={[{ gap: space.md }, isCurrent && styles.current]}>
            <View style={styles.row}>
              <Avatar user={u} size={52} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="title2">
                  {u.firstName} {u.lastName}
                </Txt>
                <Txt variant="footnote" color="muted">
                  {u.demoPersona?.label} · {ageFromBirthYear(u.birthYear)} · {GUEST_DIET_LABEL[u.preferences.diet].toLowerCase()}
                </Txt>
                <Txt variant="caption" color="muted">
                  {reservations} reservations · {hosted} hosted dinners
                </Txt>
              </View>
              {isCurrent ? <Tag label={mode === 'host' ? 'Hosting' : 'Guest'} tone="forest" size="sm" /> : null}
            </View>
            <View style={styles.row}>
              <Button
                title="As guest"
                icon="forkKnife"
                size="md"
                variant={isCurrent && mode === 'guest' ? 'primary' : 'secondary'}
                onPress={() => choose(u, 'guest')}
                style={{ flex: 1 }}
              />
              <Button
                title="As host"
                icon="home"
                size="md"
                variant={isCurrent && mode === 'host' ? 'primary' : 'secondary'}
                onPress={() => choose(u, 'host')}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        );
      })}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  current: { borderWidth: 2, borderColor: '#1F5E45' },
});
