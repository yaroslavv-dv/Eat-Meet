import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Divider, EmptyState, KeyValue, Notice, ProgressBar, SectionHeader } from '@/components/ui/misc';
import { StackScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { formatWhen, plural } from '@/domain/dates';
import { centsToInput, formatEUR, parseEuroInput } from '@/domain/money';
import { buildShoppingList, formatQuantity, plannedServings, shoppingTotals, sumContributions, type ShoppingLine } from '@/domain/pricing';
import { contributionsForDinner, seatsTaken } from '@/domain/selectors';
import { useStore } from '@/state/store';
import { colors, radius, space } from '@/theme/tokens';

type Plan = 'confirmed' | 'full';

export default function ShoppingListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, now, currentUser } = useStore();
  const [plan, setPlan] = useState<Plan>('confirmed');
  const dinner = id ? data.dinners[id] : undefined;

  if (!dinner || dinner.hostId !== currentUser.id) {
    return (
      <StackScreen title="Shopping list">
        <EmptyState icon="cart" title="Shopping list not found" message="Only the host of a dinner can see its shopping list." />
      </StackScreen>
    );
  }

  const taken = seatsTaken(data, dinner.id);
  const confirmedDiners = plannedServings(taken, dinner.hostEats);
  const fullDiners = plannedServings(dinner.guestSeats, dinner.hostEats);
  const diners = plan === 'confirmed' ? confirmedDiners : fullDiners;
  const lines = buildShoppingList(dinner, diners);
  const totals = shoppingTotals(lines);
  const fullTotals = shoppingTotals(buildShoppingList(dinner, fullDiners));
  const confirmedTotals = shoppingTotals(buildShoppingList(dinner, confirmedDiners));
  const money = sumContributions(contributionsForDinner(data, dinner.id));
  const perPlate = dinner.ingredients.filter((i) => i.scaling === 'per_serving');
  const example = perPlate[0];
  const savedPlates = fullDiners - confirmedDiners;

  return (
    <StackScreen title="Shopping list" subtitle={`${dinner.title} · ${formatWhen(dinner.startsAt, now)}`}>
      <Segmented<Plan>
        value={plan}
        onChange={setPlan}
        options={[
          { value: 'confirmed', label: `Booked · ${plural(confirmedDiners, 'plate')}` },
          { value: 'full', label: `Full table · ${fullDiners}` },
        ]}
      />

      <Card tone="forest" style={{ gap: space.sm }}>
        <Txt variant="overline" color="onDarkMuted">
          Buy for real diners, not guesses
        </Txt>
        {savedPlates > 0 ? (
          <>
            <Txt variant="title2" color="onDark">
              {plural(taken, 'guest')}
              {dinner.hostEats ? ' + you' : ''} = {plural(confirmedDiners, 'plate')}, not {fullDiners}
            </Txt>
            <Txt variant="callout" color="onDarkMuted">
              Planning for confirmed bookings means {savedPlates} fewer {savedPlates === 1 ? 'plate' : 'plates'} of per-plate ingredients to buy
              right now – about {formatEUR(fullTotals.estimatedCents - confirmedTotals.estimatedCents)} less shopping
              {example ? ` (e.g. ${example.name.toLowerCase()}: ${formatQuantity(example.quantity * confirmedDiners, example.unit)} instead of ${formatQuantity(example.quantity * fullDiners, example.unit)})` : ''}.
            </Txt>
          </>
        ) : (
          <Txt variant="title2" color="onDark">
            Every seat is booked – shop for the full table of {fullDiners}.
          </Txt>
        )}
        <Txt variant="caption" color="onDarkMuted">
          This is a planning difference, not a measured waste reduction. If more guests book, the list grows automatically.
        </Txt>
      </Card>

      <Card style={{ gap: space.sm }}>
        <View style={styles.spread}>
          <Txt variant="title3">
            {totals.purchasedCount} of {totals.itemCount} bought
          </Txt>
          <Txt variant="footnote" color="muted">
            Est. {formatEUR(totals.estimatedCents)}
          </Txt>
        </View>
        <ProgressBar value={totals.itemCount ? totals.purchasedCount / totals.itemCount : 0} />
      </Card>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Ingredients" subtitle="Tap to mark as bought, then record what you actually paid." />
        <Card padding={0}>
          {lines.map((line, i) => (
            <ShoppingRow key={line.ingredient.id} line={line} dinnerId={dinner.id} diners={diners} first={i === 0} />
          ))}
        </Card>
      </View>

      <Card style={{ gap: space.sm }}>
        <Txt variant="title3">Budget check</Txt>
        <KeyValue label={`Estimated for ${plural(diners, 'plate')}`} value={formatEUR(totals.estimatedCents)} />
        <KeyValue
          label={`Actual recorded (${totals.recordedCount}/${totals.itemCount} items)`}
          value={totals.recordedCount ? formatEUR(totals.actualCents) : '—'}
        />
        <Divider />
        <KeyValue label="Guest ingredient contributions (demo)" value={formatEUR(money.ingredientCents)} />
        <Txt variant="footnote" color="muted">
          Contributions cover the guests’ plates. {dinner.hostEats ? 'Your own plate is yours to pay. ' : ''}Prices are estimates until you
          record actual costs.
        </Txt>
      </Card>

      <Notice tone="info" icon="recycle">
        After the dinner, record portions served and leftovers in “Wrap up dinner”. That data powers the Impact dashboard.
      </Notice>
    </StackScreen>
  );
}

function ShoppingRow({ line, dinnerId, diners, first }: { line: ShoppingLine; dinnerId: string; diners: number; first: boolean }) {
  const { actions } = useStore();
  const toast = useToast();
  const [text, setText] = useState(centsToInput(line.state.actualCostCents));
  const { ingredient, state } = line;

  const togglePurchased = () => {
    Haptics.selectionAsync().catch(() => {});
    const r = actions.updateShoppingItem(dinnerId, ingredient.id, { purchased: !state.purchased });
    if (!r.ok) toast(r.error, 'error');
  };

  const commitCost = () => {
    if (text.trim() === '') {
      actions.updateShoppingItem(dinnerId, ingredient.id, { actualCostCents: undefined });
      return;
    }
    const cents = parseEuroInput(text);
    if (cents == null) {
      toast('Enter an amount like 3.50', 'error');
      setText(centsToInput(state.actualCostCents));
      return;
    }
    const r = actions.updateShoppingItem(dinnerId, ingredient.id, { actualCostCents: cents, purchased: true });
    if (r.ok) setText(centsToInput(cents));
  };

  return (
    <View style={[styles.row, !first && styles.rowBorder]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state.purchased }}
        accessibilityLabel={`${ingredient.name}, ${formatQuantity(line.quantity, ingredient.unit)}`}
        onPress={togglePurchased}
        hitSlop={8}
        style={styles.rowMain}>
        <View style={[styles.check, state.purchased && styles.checkOn]}>
          {state.purchased ? <Icon name="check" size={13} color={colors.paper} weight="bold" /> : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="callout" weight="600" color={state.purchased ? 'muted' : 'ink'} style={state.purchased ? styles.struck : undefined}>
            {ingredient.name}
          </Txt>
          <Txt variant="footnote" color="muted">
            {formatQuantity(line.quantity, ingredient.unit)}
            {ingredient.scaling === 'per_serving' ? ` · ${formatQuantity(ingredient.quantity, ingredient.unit)} × ${diners}` : ' · whole dinner'}
          </Txt>
        </View>
        <Txt variant="footnote" color="muted" style={{ fontVariant: ['tabular-nums'] }}>
          est. {formatEUR(line.estimatedCostCents)}
        </Txt>
      </Pressable>
      {state.purchased ? (
        <View style={styles.actualRow}>
          <Txt variant="footnote" color="inkSoft">
            Actual cost
          </Txt>
          <View style={styles.actualInput}>
            <Txt variant="callout" color="muted">
              €
            </Txt>
            <TextInput
              value={text}
              onChangeText={setText}
              onEndEditing={commitCost}
              onSubmitEditing={commitCost}
              keyboardType="decimal-pad"
              returnKeyType="done"
              placeholder={centsToInput(line.estimatedCostCents)}
              placeholderTextColor={colors.faint}
              style={styles.actualText}
              accessibilityLabel={`Actual cost of ${ingredient.name}`}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  row: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  struck: { textDecorationLine: 'line-through' },
  actualRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 36 },
  actualInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.sand,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    height: 38,
    minWidth: 110,
  },
  actualText: { flex: 1, fontSize: 16, color: colors.ink, textAlign: 'right' },
});
