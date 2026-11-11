import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Segmented, TextField } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Txt } from '@/components/ui/text';
import { ALLERGEN_LABEL, ALLERGENS, UNITS } from '@/domain/constants';
import { plural } from '@/domain/dates';
import { centsToInput, formatEUR, parseEuroInput } from '@/domain/money';
import { formatQuantity, lineCostCents, lineQuantity } from '@/domain/pricing';
import type { FieldErrors } from '@/domain/rules';
import type { Allergen, Ingredient, IngredientScaling } from '@/domain/types';
import { colors, space } from '@/theme/tokens';

/** One editable ingredient row with quantity, unit, scaling, price and allergens. */
export function IngredientEditor({
  ingredient,
  index,
  diners,
  errors,
  showErrors,
  onChange,
  onRemove,
}: {
  ingredient: Ingredient;
  index: number;
  diners: number;
  errors: FieldErrors;
  showErrors: boolean;
  onChange: (next: Ingredient) => void;
  onRemove: () => void;
}) {
  // Keep raw text so partially typed numbers ("1.", "0,") are not lost.
  const [qtyText, setQtyText] = useState(Number.isFinite(ingredient.quantity) && ingredient.quantity > 0 ? String(ingredient.quantity) : '');
  const [costText, setCostText] = useState(Number.isInteger(ingredient.estimatedCostCents) && ingredient.name ? centsToInput(ingredient.estimatedCostCents) : '');
  const [showAllergens, setShowAllergens] = useState(false);
  const perServing = ingredient.scaling === 'per_serving';
  const err = (field: string) => (showErrors ? errors[`ingredient.${index}.${field}`] : undefined);

  const toggleAllergen = (a: Allergen) =>
    onChange({
      ...ingredient,
      allergens: ingredient.allergens.includes(a) ? ingredient.allergens.filter((x) => x !== a) : [...ingredient.allergens, a],
    });

  const validQty = Number.isFinite(ingredient.quantity) && ingredient.quantity > 0;
  const validCost = Number.isInteger(ingredient.estimatedCostCents) && ingredient.estimatedCostCents >= 0;

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.headRow}>
        <View style={styles.index}>
          <Txt variant="caption" weight="700" color="forest">
            {index + 1}
          </Txt>
        </View>
        <TextField
          value={ingredient.name}
          onChangeText={(name) => onChange({ ...ingredient, name })}
          placeholder="Ingredient, e.g. Arborio rice"
          containerStyle={{ flex: 1 }}
          compact
          error={err('name')}
          accessibilityLabel={`Ingredient ${index + 1} name`}
        />
        <IconButton icon="trash" label={`Remove ingredient ${index + 1}`} onPress={onRemove} tone="sand" size={36} />
      </View>

      <Segmented<IngredientScaling>
        value={ingredient.scaling}
        onChange={(scaling) => onChange({ ...ingredient, scaling })}
        options={[
          { value: 'per_serving', label: 'Per plate' },
          { value: 'whole_dinner', label: 'Whole dinner' },
        ]}
      />

      <View style={styles.numbers}>
        <TextField
          label={perServing ? 'Qty per plate' : 'Quantity'}
          value={qtyText}
          onChangeText={(t) => {
            setQtyText(t);
            const n = Number(t.replace(',', '.'));
            onChange({ ...ingredient, quantity: t.trim() === '' ? NaN : n });
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          suffix={ingredient.unit}
          containerStyle={{ flex: 1 }}
          compact
          error={err('quantity')}
        />
        <TextField
          label={perServing ? 'Est. cost per plate' : 'Est. cost'}
          value={costText}
          onChangeText={(t) => {
            setCostText(t);
            const cents = parseEuroInput(t);
            onChange({ ...ingredient, estimatedCostCents: cents ?? NaN });
          }}
          keyboardType="decimal-pad"
          placeholder="0.00"
          prefix="€"
          containerStyle={{ flex: 1 }}
          compact
          error={err('cost')}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {UNITS.map((u) => (
          <Chip key={u} label={u} selected={ingredient.unit === u} onPress={() => onChange({ ...ingredient, unit: u })} style={{ minHeight: 32 }} />
        ))}
      </ScrollView>

      {validQty && validCost ? (
        <View style={styles.calc}>
          <Icon name="cart" size={13} color={colors.forest} />
          <Txt variant="footnote" color="forest" style={{ flex: 1 }}>
            {perServing
              ? `For ${plural(diners, 'plate')}: buy ${formatQuantity(lineQuantity(ingredient, diners), ingredient.unit)} · ${formatEUR(lineCostCents(ingredient, diners))}`
              : `Bought once: ${formatQuantity(ingredient.quantity, ingredient.unit)} · ${formatEUR(ingredient.estimatedCostCents)}`}
          </Txt>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => setShowAllergens(!showAllergens)}
        style={styles.allergenToggle}
        hitSlop={6}>
        <Icon name="warning" size={13} color={ingredient.allergens.length ? colors.warning : colors.muted} />
        <Txt variant="footnote" weight="600" color={ingredient.allergens.length ? 'warning' : 'muted'} style={{ flex: 1 }}>
          {ingredient.allergens.length
            ? `Contains ${ingredient.allergens.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(', ')}`
            : 'No allergens marked'}
        </Txt>
        <Txt variant="footnote" weight="700" color="forest">
          {showAllergens ? 'Done' : 'Edit allergens'}
        </Txt>
      </Pressable>
      {showAllergens ? (
        <View style={styles.allergens}>
          {ALLERGENS.map((a) => (
            <Chip key={a} label={ALLERGEN_LABEL[a]} selected={ingredient.allergens.includes(a)} onPress={() => toggleAllergen(a)} tone="danger" style={{ minHeight: 32 }} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  index: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },
  numbers: { flexDirection: 'row', gap: space.sm },
  calc: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.successSoft, padding: space.sm, borderRadius: 8 },
  allergenToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28 },
  allergens: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
