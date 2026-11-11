import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Segmented, Stepper, TextField } from '@/components/ui/form';
import { Avatar, EmptyState, KeyValue, Notice, SectionHeader } from '@/components/ui/misc';
import { StackScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { LEFTOVER_HANDLING_LABEL } from '@/domain/constants';
import { formatWhen, plural } from '@/domain/dates';
import { formatEUR } from '@/domain/money';
import { buildShoppingList, ingredientBudgetCents, plannedServings, shoppingTotals } from '@/domain/pricing';
import { completionEligibility } from '@/domain/rules';
import { reservationsForDinner } from '@/domain/selectors';
import type { LeftoverHandling } from '@/domain/types';
import { useStore } from '@/state/store';
import { space } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

const HANDLING: LeftoverHandling[] = ['shared_with_guests', 'stored', 'composted', 'discarded'];

export default function CompleteDinnerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, now, currentUser, actions } = useStore();
  const toast = useToast();
  const dinner = id ? data.dinners[id] : undefined;
  const confirmed = dinner ? reservationsForDinner(data, dinner.id).filter((r) => r.status === 'confirmed') : [];
  const plannedForBooked = dinner ? plannedServings(confirmed.length, dinner.hostEats) : 0;

  const [attendance, setAttendance] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(confirmed.map((r) => [r.id, true])),
  );
  const [diners, setDiners] = useState<number | null>(null);
  const [prepared, setPrepared] = useState(plannedForBooked);
  const [served, setServed] = useState<number | null>(null);
  const [leftovers, setLeftovers] = useState<number | null>(null);
  const [handling, setHandling] = useState<LeftoverHandling>('shared_with_guests');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!dinner || dinner.hostId !== currentUser.id) {
    return (
      <StackScreen title="Wrap up" variant="close" modal>
        <EmptyState icon="checklist" title="Dinner not found" message="Only the host can wrap up a dinner." />
      </StackScreen>
    );
  }

  const eligibility = completionEligibility(dinner, now);
  const attended = confirmed.filter((r) => attendance[r.id] ?? true).length;
  const defaultDiners = attended + (dinner.hostEats ? 1 : 0);
  const actualDiners = diners ?? defaultDiners;
  const portionsServed = Math.min(served ?? actualDiners, prepared);
  const leftoverPortions = leftovers ?? Math.max(0, prepared - portionsServed);
  const shopping = shoppingTotals(buildShoppingList(dinner, plannedForBooked));

  const submit = () => {
    const r = actions.completeDinner({
      dinnerId: dinner.id,
      attendance,
      actualDiners,
      portionsPrepared: prepared,
      portionsServed,
      leftoverPortions,
      leftoverHandling: handling,
      notes,
      estimatedBudgetCents: ingredientBudgetCents(dinner.ingredients, plannedForBooked),
      actualSpendCents: shopping.recordedCount > 0 ? shopping.actualCents : null,
    });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    goBack();
    toast('Dinner completed – guests can now leave reviews');
  };

  return (
    <StackScreen
      title="Wrap up dinner"
      subtitle={dinner.title}
      variant="close"
      modal
      footer={<Button title="Complete dinner" icon="checkCircle" onPress={submit} disabled={!eligibility.allowed} />}>
      <Txt variant="callout" color="muted">
        {formatWhen(dinner.startsAt, now)} · Recording what actually happened makes ratings fair and impact numbers honest.
      </Txt>
      {!eligibility.allowed ? <Notice tone="warning">{eligibility.reason}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Who came?" subtitle="Only attended guests can review the dinner." />
        {confirmed.length === 0 ? (
          <Txt variant="callout" color="muted">
            No confirmed reservations.
          </Txt>
        ) : (
          confirmed.map((r) => {
            const guest = data.users[r.guestId];
            const value = attendance[r.id] ?? true;
            return (
              <Card key={r.id} padding={space.md} style={styles.guest}>
                <Avatar user={guest} size={36} />
                <Txt variant="headline" style={{ flex: 1 }}>
                  {guest?.firstName}
                </Txt>
                <Segmented<'yes' | 'no'>
                  value={value ? 'yes' : 'no'}
                  onChange={(v) => {
                    setAttendance({ ...attendance, [r.id]: v === 'yes' });
                    setDiners(null);
                  }}
                  options={[
                    { value: 'yes', label: 'Came' },
                    { value: 'no', label: 'No-show' },
                  ]}
                  style={{ width: 170 }}
                />
              </Card>
            );
          })
        )}
      </View>

      <View style={{ gap: space.lg }}>
        <SectionHeader title="Portions" subtitle={`You shopped for ${plural(plannedForBooked, 'plate')} (booked guests${dinner.hostEats ? ' + you' : ''}).`} />
        <Stepper label="Actual number of diners" hint="Including you" value={actualDiners} min={0} max={dinner.guestSeats + 1} onChange={setDiners} />
        <Stepper label="Portions prepared" value={prepared} min={0} max={30} onChange={(v) => setPrepared(v)} />
        <Stepper label="Portions served" value={portionsServed} min={0} max={prepared} onChange={setServed} />
        <Stepper label="Leftover portions (approx.)" value={leftoverPortions} min={0} max={Math.max(prepared, 1)} step={0.5} onChange={setLeftovers} />
        {leftoverPortions > 0 ? (
          <View style={{ gap: space.sm }}>
            <Txt variant="footnote" weight="600" color="inkSoft">
              What happened to the leftovers?
            </Txt>
            <View style={styles.chips}>
              {HANDLING.map((h) => (
                <Chip key={h} label={LEFTOVER_HANDLING_LABEL[h]} selected={handling === h} onPress={() => setHandling(h)} />
              ))}
            </View>
          </View>
        ) : (
          <Notice tone="success" icon="checkCircle">
            All planned portions were served.
          </Notice>
        )}
      </View>

      <Card style={{ gap: space.sm }}>
        <Txt variant="title3">Shopping</Txt>
        <KeyValue label="Estimated budget" value={formatEUR(shopping.estimatedCents)} />
        <KeyValue
          label="Actual spend recorded"
          value={shopping.recordedCount ? `${formatEUR(shopping.actualCents)} (${shopping.recordedCount} items)` : 'Not recorded'}
        />
        <Txt variant="footnote" color="muted">
          Record actual costs in the shopping list to compare estimates with reality.
        </Txt>
      </Card>

      <TextField label="Notes" optional multiline value={notes} onChangeText={setNotes} placeholder="e.g. Packed a spare portion for a guest" maxLength={300} />
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  guest: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
