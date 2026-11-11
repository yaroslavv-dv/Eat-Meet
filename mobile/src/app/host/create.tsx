import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { DinnerCard } from '@/components/dinner/dinner-card';
import { PriceBreakdown } from '@/components/dinner/price-breakdown';
import { IngredientEditor } from '@/components/host/ingredient-editor';
import { PhotoPicker } from '@/components/host/photo-picker';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, Tag } from '@/components/ui/chip';
import { DateTimeField } from '@/components/ui/date-time-field';
import { FieldError, Stepper, TextField, ToggleRow } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { DemoBadge, Divider, KeyValue, Notice, SectionHeader } from '@/components/ui/misc';
import { OptionCard } from '@/components/ui/option-card';
import { StackScreen } from '@/components/ui/screen';
import { StepIndicator } from '@/components/ui/steps';
import { Txt } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { MEAL_DEMO_KEYS, TABLE_DEMO_KEYS } from '@/data/images';
import { makeId } from '@/domain/actions';
import {
  AGE_GROUP_LABEL,
  ALCOHOL_POLICY_HINT,
  ALCOHOL_POLICY_LABEL,
  ALLERGEN_LABEL,
  ALLERGENS,
  DIET_LABEL,
  DIET_ORDER,
  DIETARY_TAG_LABEL,
  HOUSE_RULE_SUGGESTIONS,
  NEIGHBORHOODS,
  PRICING,
  RULES,
  SOCIAL_HINT,
  SOCIAL_LABEL,
} from '@/domain/constants';
import { atTime, combineDateAndTime, formatDistance, formatDuration, startOfDay, plural } from '@/domain/dates';
import { formatEUR } from '@/domain/money';
import {
  computePricing,
  formatQuantity,
  isCompleteIngredient,
  lineCostCents,
  lineQuantity,
  plannedServings,
  suggestHostCompensationCents,
} from '@/domain/pricing';
import { DRAFT_STEPS, meetsPublishLeadTime, validateDraft, type DinnerDraft } from '@/domain/rules';
import { dinnerAllergens } from '@/domain/selectors';
import type { AgeGroup, Allergen, Dinner, DietaryTag, Ingredient, SocialStyle, User } from '@/domain/types';
import { useStore } from '@/state/store';
import { colors, space } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

const STEP_TITLES = ['Basics', 'Photos', 'Menu & ingredients', 'Preferences', 'Capacity & costs', 'Review & publish'];
const DIETARY_TAGS: DietaryTag[] = ['halal', 'kosher', 'gluten_free', 'lactose_free', 'no_pork'];
const AGE_GROUPS: AgeGroup[] = ['any', '18_24', '25_34', '35_plus'];
const SOCIALS: SocialStyle[] = ['eat_meet', 'flexible', 'just_eat'];

function emptyIngredient(): Ingredient {
  return { id: makeId('ing'), name: '', quantity: NaN, unit: 'g', scaling: 'per_serving', estimatedCostCents: NaN, allergens: [] };
}

function initialDraft(user: User, existing: Dinner | undefined, now: Date): DinnerDraft {
  if (existing) {
    const { title, description, startsAt, durationMinutes, neighborhood, areaHint, privateAddress, guestSeats, hostEats, mealImage, tableImage, menu, ingredients, diet, dietaryTags, extraAllergens, alcohol, social, ageGroup, houseRules, hostCompensationCents } = existing;
    return { title, description, startsAt, durationMinutes, neighborhood, areaHint, privateAddress, guestSeats, hostEats, mealImage, tableImage, menu, ingredients, diet, dietaryTags, extraAllergens, alcohol, social, ageGroup, houseRules, hostCompensationCents };
  }
  return {
    title: '',
    description: '',
    startsAt: atTime(now, 2, 18, 30).toISOString(),
    durationMinutes: 150,
    neighborhood: user.neighborhood,
    areaHint: '',
    privateAddress: '',
    guestSeats: 4,
    hostEats: true,
    mealImage: null,
    tableImage: null,
    menu: { mainDish: '', sides: [], dessert: '', drinks: '' },
    ingredients: [emptyIngredient()],
    diet: 'vegetarian',
    dietaryTags: [],
    extraAllergens: [],
    alcohol: 'alcohol_free',
    social: 'eat_meet',
    ageGroup: 'any',
    houseRules: [],
    hostCompensationCents: 0,
  };
}

const ing = (name: string, quantity: number, unit: Ingredient['unit'], scaling: Ingredient['scaling'], euros: number, allergens: Allergen[] = []): Ingredient => ({
  id: makeId('ing'),
  name,
  quantity,
  unit,
  scaling,
  estimatedCostCents: Math.round(euros * 100),
  allergens,
});

/** Example content so a live demo does not require typing a full menu. */
const EXAMPLE = {
  basics: {
    title: 'Pumpkin & sage gnocchi night',
    description: 'Golden roasted pumpkin with crispy sage, brown butter and homemade gnocchi. Big table, candles, and an apple crumble to finish.',
    areaHint: 'Two minutes from the Zuiderdiep',
    privateAddress: 'Example street 1, Groningen (demo)',
    guestSeats: 5,
  },
  menu: {
    mainDish: 'Gnocchi with roasted pumpkin, brown butter & sage',
    sides: ['Rocket salad with toasted hazelnuts'],
    dessert: 'Warm apple crumble',
    drinks: 'Sparkling apple juice and water',
  },
  ingredients: () => [
    ing('Potato gnocchi', 150, 'g', 'per_serving', 0.55, ['gluten', 'eggs']),
    ing('Butternut pumpkin', 150, 'g', 'per_serving', 0.4),
    ing('Butter', 15, 'g', 'per_serving', 0.14, ['milk']),
    ing('Vegetarian hard cheese', 20, 'g', 'per_serving', 0.48, ['milk']),
    ing('Rocket', 30, 'g', 'per_serving', 0.38),
    ing('Hazelnuts', 10, 'g', 'per_serving', 0.2, ['tree_nuts']),
    ing('Fresh sage', 1, 'bunch', 'whole_dinner', 1.2),
    ing('Apples, oats & butter (crumble)', 1, 'pack', 'whole_dinner', 3.6, ['gluten', 'milk']),
    ing('Sparkling apple juice', 1.5, 'l', 'whole_dinner', 2.4),
  ],
};

export default function CreateDinnerScreen() {
  const { draftId } = useLocalSearchParams<{ draftId?: string }>();
  const { data, now, currentUser, actions } = useStore();
  const toast = useToast();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const existing = draftId ? data.dinners[draftId] : undefined;

  const [draft, setDraft] = useState<DinnerDraft>(() => initialDraft(currentUser, existing, new Date()));
  const [savedId, setSavedId] = useState<string | undefined>(existing?.status === 'draft' ? existing.id : undefined);
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [compTouched, setCompTouched] = useState(Boolean(existing && existing.hostCompensationCents > 0));
  const [dirty, setDirty] = useState(false);
  const [ruleInput, setRuleInput] = useState('');

  const update = (patch: Partial<DinnerDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const basePricing = computePricing(draft);
  const suggestedComp = suggestHostCompensationCents(basePricing.ingredientShareCents);
  const effective: DinnerDraft = compTouched ? draft : { ...draft, hostCompensationCents: suggestedComp };
  const pricing = computePricing(effective);
  const servings = plannedServings(draft.guestSeats, draft.hostEats);
  const errors = validateDraft(effective, now);
  const stepErrors = (i: number) => (i < DRAFT_STEPS.length ? errors[DRAFT_STEPS[i]] : {});
  const shown = (i: number) => (attempted[i] ? stepErrors(i) : {});
  const e = shown(step);
  const startDate = new Date(draft.startsAt);
  const leadTimeOk = meetsPublishLeadTime(draft.startsAt, now);
  const derivedAllergens = dinnerAllergens({ ingredients: draft.ingredients, extraAllergens: [] });

  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });
  const goTo = (i: number) => {
    setStep(i);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const next = () => {
    if (Object.keys(stepErrors(step)).length > 0) {
      setAttempted({ ...attempted, [step]: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      scrollTop();
      return;
    }
    goTo(step + 1);
  };

  const saveDraft = (silent = false) => {
    const r = actions.saveDraft(effective, savedId);
    if (!r.ok) {
      toast(r.error, 'error');
      return false;
    }
    setSavedId(r.value.dinnerId);
    setDirty(false);
    if (!silent) toast('Draft saved – only visible to you');
    return true;
  };

  const publish = () => {
    const r = actions.publishDinner(effective, savedId);
    if (!r.ok) {
      setAttempted({ 0: true, 1: true, 2: true, 3: true, 4: true });
      toast(r.error, 'error');
      return;
    }
    setDirty(false);
    router.replace({ pathname: '/host/dinner/[id]', params: { id: r.value.dinnerId, published: '1' } });
    toast('Published – your dinner is now in Discover');
  };

  const close = () => {
    if (!dirty) {
      goBack();
      return;
    }
    Alert.alert('Leave without publishing?', 'You have unsaved changes.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => goBack() },
      {
        text: 'Save draft',
        onPress: () => {
          if (saveDraft(true)) {
            goBack();
            toast('Draft saved');
          }
        },
      },
    ]);
  };

  const setIngredient = (index: number, next: Ingredient) =>
    update({ ingredients: draft.ingredients.map((i, n) => (n === index ? next : i)) });

  const footer =
    step < 5 ? (
      <View style={styles.footerRow}>
        {step > 0 ? <Button title="Back" variant="outline" onPress={() => goTo(step - 1)} style={{ flex: 1 }} /> : null}
        <Button title={step === 4 ? 'Review' : 'Next'} iconRight="arrowRight" onPress={next} style={{ flex: 2 }} />
      </View>
    ) : (
      <View style={styles.footerRow}>
        <Button title="Save draft" variant="outline" onPress={() => saveDraft()} style={{ flex: 1 }} />
        <Button title="Publish dinner" variant="accent" icon="checkCircle" onPress={publish} style={{ flex: 2 }} />
      </View>
    );

  return (
    <StackScreen
      title={savedId ? 'Edit draft' : 'Create a dinner'}
      variant="close"
      modal
      onClose={close}
      scrollRef={scrollRef}
      headerRight={
        <Pressable accessibilityRole="button" onPress={() => saveDraft()} hitSlop={10}>
          <Txt variant="footnote" weight="700" color="forest">
            Save draft
          </Txt>
        </Pressable>
      }
      footer={footer}>
      <StepIndicator steps={STEP_TITLES} current={step} />

      {/* ------------------------------------------------------------ Basics */}
      {step === 0 ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.step}>
          <View style={styles.titleRow}>
            <Txt variant="title1" style={{ flex: 1 }}>
              Tell guests about your dinner
            </Txt>
          </View>
          {!draft.title ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                update({
                  ...EXAMPLE.basics,
                  startsAt: atTime(new Date(), 3, 18, 30).toISOString(),
                })
              }
              style={styles.exampleButton}>
              <Icon name="bulb" size={16} color={colors.warning} />
              <Txt variant="footnote" weight="600" color="warning" style={{ flex: 1 }}>
                Fill in an example for the demo
              </Txt>
              <DemoBadge />
            </Pressable>
          ) : null}

          <TextField label="Dinner name" value={draft.title} onChangeText={(title) => update({ title })} placeholder="e.g. Wild mushroom risotto night" maxLength={60} error={e.title} />
          <TextField
            label="Description"
            value={draft.description}
            onChangeText={(description) => update({ description })}
            placeholder="What are you cooking, and what kind of evening is it?"
            multiline
            maxLength={400}
            error={e.description}
          />

          <View style={{ gap: space.sm }}>
            <Txt variant="footnote" weight="600" color="inkSoft">
              When
            </Txt>
            <DateTimeField
              label="Date"
              mode="date"
              value={startDate}
              minimumDate={startOfDay(new Date())}
              onChange={(d) => update({ startsAt: combineDateAndTime(d, startDate).toISOString() })}
            />
            <DateTimeField label="Starts at" mode="time" value={startDate} onChange={(t) => update({ startsAt: combineDateAndTime(startDate, t).toISOString() })} />
            {leadTimeOk ? (
              <View style={styles.ruleOk}>
                <Icon name="checkCircle" size={14} color={colors.forest} />
                <Txt variant="footnote" color="forest" style={{ flex: 1 }}>
                  Starts {formatDistance(startDate, now)} – meets the {RULES.publishLeadTimeHours}-hour publishing rule.
                </Txt>
              </View>
            ) : (
              <FieldError
                message={
                  stepErrors(0).startsAt ??
                  `Dinners must be published at least ${RULES.publishLeadTimeHours} hours before they start.`
                }
              />
            )}
          </View>

          <Stepper
            label="Duration"
            value={draft.durationMinutes}
            min={RULES.minDurationMinutes}
            max={RULES.maxDurationMinutes}
            step={30}
            format={formatDuration}
            onChange={(durationMinutes) => update({ durationMinutes })}
            error={e.durationMinutes}
          />

          <View style={{ gap: space.sm }}>
            <Txt variant="footnote" weight="600" color="inkSoft">
              Neighbourhood
            </Txt>
            <View style={styles.chips}>
              {NEIGHBORHOODS.map((n) => (
                <Chip key={n} label={n} selected={draft.neighborhood === n} onPress={() => update({ neighborhood: n })} />
              ))}
            </View>
            <FieldError message={e.neighborhood} />
          </View>
          <TextField
            label="Approximate location"
            optional
            hint="Shown publicly"
            value={draft.areaHint}
            onChangeText={(areaHint) => update({ areaHint })}
            placeholder="e.g. Near the Noorderplantsoen"
          />
          <TextField
            label="Exact address"
            hint="Only for confirmed guests"
            value={draft.privateAddress}
            onChangeText={(privateAddress) => update({ privateAddress })}
            placeholder="Street, number, postcode"
            error={e.privateAddress}
          />

          <Stepper
            label="Guest seats"
            hint="How many guests can you comfortably seat and feed?"
            value={draft.guestSeats}
            min={1}
            max={RULES.maxGuestSeats}
            onChange={(guestSeats) => update({ guestSeats })}
            format={(v) => `${v} ${v === 1 ? 'guest' : 'guests'}`}
            error={e.guestSeats}
          />
          <Card padding={space.md}>
            <ToggleRow
              title="I’m eating with my guests"
              description="Your own plate is added to the shopping list. You pay for it yourself – guests never cover it."
              value={draft.hostEats}
              onChange={(hostEats) => update({ hostEats })}
            />
          </Card>
        </Animated.View>
      ) : null}

      {/* ------------------------------------------------------------ Photos */}
      {step === 1 ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.step}>
          <Txt variant="title1">Show the meal and the table</Txt>
          <PhotoPicker
            title="The meal"
            description="A photo that represents what you will cook."
            value={draft.mealImage}
            onChange={(mealImage) => update({ mealImage })}
            demoKeys={MEAL_DEMO_KEYS}
            aspect={[4, 3]}
            error={e.mealImage}
          />
          <Divider />
          <PhotoPicker
            title="Your dinner table"
            description="Where guests will sit. Helps guests feel comfortable before they arrive."
            value={draft.tableImage}
            onChange={(tableImage) => update({ tableImage })}
            demoKeys={TABLE_DEMO_KEYS}
            aspect={[16, 10]}
            error={e.tableImage}
          />
          <Notice tone="info" icon="photo">
            Demo photos are stock images and are labelled “Demo photo” everywhere. Real hosts upload photos of their own home and meal.
          </Notice>
        </Animated.View>
      ) : null}

      {/* ------------------------------------------------------------ Menu */}
      {step === 2 ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.step}>
          <Txt variant="title1">What’s on the menu?</Txt>
          <TextField label="Main dish" value={draft.menu.mainDish} onChangeText={(mainDish) => update({ menu: { ...draft.menu, mainDish } })} placeholder="e.g. Wild mushroom risotto" error={e.mainDish} />

          <View style={{ gap: space.sm }}>
            <Txt variant="footnote" weight="600" color="inkSoft">
              Side dishes <Txt variant="footnote" color="faint">· optional</Txt>
            </Txt>
            {draft.menu.sides.map((side, i) => (
              <View key={i} style={styles.inlineRow}>
                <TextField
                  value={side}
                  onChangeText={(t) => update({ menu: { ...draft.menu, sides: draft.menu.sides.map((s, n) => (n === i ? t : s)) } })}
                  placeholder="e.g. Green salad"
                  containerStyle={{ flex: 1 }}
                  compact
                />
                <IconButton
                  icon="close"
                  label="Remove side dish"
                  tone="sand"
                  size={36}
                  onPress={() => update({ menu: { ...draft.menu, sides: draft.menu.sides.filter((_, n) => n !== i) } })}
                />
              </View>
            ))}
            <Button title="Add side dish" icon="plus" variant="ghost" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => update({ menu: { ...draft.menu, sides: [...draft.menu.sides, ''] } })} />
          </View>

          <TextField label="Dessert" optional value={draft.menu.dessert} onChangeText={(dessert) => update({ menu: { ...draft.menu, dessert } })} placeholder="e.g. Lemon cake" />
          <TextField
            label="Drinks included"
            hint="Non-alcoholic only"
            value={draft.menu.drinks}
            onChangeText={(drinks) => update({ menu: { ...draft.menu, drinks } })}
            placeholder="e.g. Fresh mint tea and water"
            error={e.drinks}
          />

          <View style={{ gap: space.md }}>
            <SectionHeader
              title="Ingredients"
              subtitle="Per plate quantities scale with your guests. Whole-dinner items are bought once."
            />
            {draft.ingredients.length <= 1 && !draft.ingredients[0]?.name ? (
              <Pressable
                accessibilityRole="button"
                style={styles.exampleButton}
                onPress={() => update({ ingredients: EXAMPLE.ingredients(), menu: draft.menu.mainDish ? draft.menu : EXAMPLE.menu })}>
                <Icon name="bulb" size={16} color={colors.warning} />
                <Txt variant="footnote" weight="600" color="warning" style={{ flex: 1 }}>
                  Use example menu & ingredients
                </Txt>
                <DemoBadge />
              </Pressable>
            ) : null}
            <FieldError message={e.ingredients} />
            {draft.ingredients.map((ingredient, index) => (
              <IngredientEditor
                key={ingredient.id}
                ingredient={ingredient}
                index={index}
                diners={servings}
                errors={stepErrors(2)}
                showErrors={!!attempted[2]}
                onChange={(n) => setIngredient(index, n)}
                onRemove={() => update({ ingredients: draft.ingredients.filter((_, n) => n !== index) })}
              />
            ))}
            <Button title="Add ingredient" icon="plus" variant="secondary" onPress={() => update({ ingredients: [...draft.ingredients, emptyIngredient()] })} />
          </View>

          <Card tone="forest" style={{ gap: space.xs }}>
            <Txt variant="overline" color="onDarkMuted">
              Shopping budget · {plural(servings, 'plate')}
            </Txt>
            <Txt variant="display" color="onDark">
              {formatEUR(basePricing.ingredientBudgetCents)}
            </Txt>
            <Txt variant="footnote" color="onDarkMuted">
              {draft.guestSeats} guest {draft.guestSeats === 1 ? 'seat' : 'seats'}
              {draft.hostEats ? ' + your own plate (you pay for yours)' : ' (you are not eating)'}. Only valid ingredient lines are counted.
            </Txt>
          </Card>
        </Animated.View>
      ) : null}

      {/* ------------------------------------------------------------ Preferences */}
      {step === 3 ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.step}>
          <Txt variant="title1">Diet, allergens & atmosphere</Txt>

          <View style={{ gap: space.sm }}>
            <Txt variant="title3">The dish is…</Txt>
            <View style={styles.chips}>
              {DIET_ORDER.map((d) => (
                <Chip key={d} label={DIET_LABEL[d]} icon="leaf" selected={draft.diet === d} onPress={() => update({ diet: d })} />
              ))}
            </View>
            <FieldError message={stepErrors(3).diet} />
          </View>

          <View style={{ gap: space.sm }}>
            <Txt variant="title3">Also suitable for</Txt>
            <View style={styles.chips}>
              {DIETARY_TAGS.map((t) => (
                <Chip
                  key={t}
                  label={DIETARY_TAG_LABEL[t]}
                  selected={draft.dietaryTags.includes(t)}
                  onPress={() =>
                    update({ dietaryTags: draft.dietaryTags.includes(t) ? draft.dietaryTags.filter((x) => x !== t) : [...draft.dietaryTags, t] })
                  }
                />
              ))}
            </View>
          </View>

          <Card style={{ gap: space.md }}>
            <Txt variant="title3">Allergen disclosure</Txt>
            <Txt variant="footnote" color="muted">
              From your ingredients:
            </Txt>
            {derivedAllergens.length ? (
              <View style={styles.chips}>
                {derivedAllergens.map((a) => (
                  <Tag key={a} label={ALLERGEN_LABEL[a]} tone="warning" icon="warning" />
                ))}
              </View>
            ) : (
              <Txt variant="callout">None marked on ingredients.</Txt>
            )}
            <Txt variant="footnote" color="muted">
              Also present in your kitchen or possible cross-contact:
            </Txt>
            <View style={styles.chips}>
              {ALLERGENS.filter((a) => !derivedAllergens.includes(a)).map((a) => (
                <Chip
                  key={a}
                  label={ALLERGEN_LABEL[a]}
                  tone="danger"
                  selected={draft.extraAllergens.includes(a)}
                  onPress={() =>
                    update({
                      extraAllergens: draft.extraAllergens.includes(a) ? draft.extraAllergens.filter((x) => x !== a) : [...draft.extraAllergens, a],
                    })
                  }
                  style={{ minHeight: 32 }}
                />
              ))}
            </View>
            <Notice tone="neutral">Declarations are shown to guests as self-reported. Guests with a matching allergy cannot book.</Notice>
          </Card>

          <View style={{ gap: space.sm }}>
            <Txt variant="title3">Alcohol</Txt>
            {(['alcohol_free', 'alcohol_possible'] as const).map((a) => (
              <OptionCard
                key={a}
                icon={a === 'alcohol_free' ? 'tea' : 'wine'}
                title={ALCOHOL_POLICY_LABEL[a]}
                description={ALCOHOL_POLICY_HINT[a]}
                selected={draft.alcohol === a}
                onPress={() => update({ alcohol: a })}
              />
            ))}
          </View>

          <View style={{ gap: space.sm }}>
            <Txt variant="title3">Atmosphere</Txt>
            {SOCIALS.map((s) => (
              <OptionCard
                key={s}
                icon={s === 'eat_meet' ? 'chat' : s === 'just_eat' ? 'forkKnife' : 'flexible'}
                title={SOCIAL_LABEL[s]}
                description={SOCIAL_HINT[s]}
                selected={draft.social === s}
                onPress={() => update({ social: s })}
              />
            ))}
          </View>

          <View style={{ gap: space.sm }}>
            <Txt variant="title3">Intended age group</Txt>
            <Txt variant="footnote" color="muted">
              A voluntary social preference. All adults (18+) can still book.
            </Txt>
            <View style={styles.chips}>
              {AGE_GROUPS.map((a) => (
                <Chip key={a} label={AGE_GROUP_LABEL[a]} selected={draft.ageGroup === a} onPress={() => update({ ageGroup: a })} />
              ))}
            </View>
          </View>

          <View style={{ gap: space.sm }}>
            <Txt variant="title3">House rules</Txt>
            <View style={styles.chips}>
              {HOUSE_RULE_SUGGESTIONS.map((r) => (
                <Chip
                  key={r}
                  label={r}
                  selected={draft.houseRules.includes(r)}
                  onPress={() => update({ houseRules: draft.houseRules.includes(r) ? draft.houseRules.filter((x) => x !== r) : [...draft.houseRules, r] })}
                />
              ))}
              {draft.houseRules
                .filter((r) => !HOUSE_RULE_SUGGESTIONS.includes(r))
                .map((r) => (
                  <Chip key={r} label={r} selected onPress={() => update({ houseRules: draft.houseRules.filter((x) => x !== r) })} />
                ))}
            </View>
            <View style={styles.inlineRow}>
              <TextField value={ruleInput} onChangeText={setRuleInput} placeholder="Add your own rule" containerStyle={{ flex: 1 }} compact />
              <Button
                title="Add"
                size="sm"
                variant="secondary"
                disabled={ruleInput.trim().length < 3}
                onPress={() => {
                  update({ houseRules: [...draft.houseRules, ruleInput.trim()] });
                  setRuleInput('');
                }}
              />
            </View>
          </View>
        </Animated.View>
      ) : null}

      {/* ------------------------------------------------------------ Costs */}
      {step === 4 ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.step}>
          <Txt variant="title1">Capacity & costs</Txt>

          <Stepper
            label="Guest seats"
            value={draft.guestSeats}
            min={1}
            max={RULES.maxGuestSeats}
            onChange={(guestSeats) => update({ guestSeats })}
            format={(v) => `${v} ${v === 1 ? 'guest' : 'guests'}`}
            error={e.guestSeats}
          />

          <View style={{ gap: space.md }}>
            <SectionHeader title="Planned shopping" subtitle={`For a full table: ${plural(servings, 'plate')}${draft.hostEats ? ' including yours' : ''}`} />
            <Card padding={0}>
              {draft.ingredients.filter((i) => i.name && isCompleteIngredient(i)).map((i, n) => (
                <View key={i.id} style={[styles.planRow, n > 0 && styles.planBorder]}>
                  <Txt variant="callout" style={{ flex: 1 }} numberOfLines={1}>
                    {i.name}
                  </Txt>
                  <Txt variant="footnote" color="muted">
                    {formatQuantity(lineQuantity(i, servings), i.unit)}
                  </Txt>
                  <Txt variant="callout" weight="600" style={styles.planCost}>
                    {formatEUR(lineCostCents(i, servings))}
                  </Txt>
                </View>
              ))}
            </Card>
          </View>

          <Card style={{ gap: space.sm }}>
            <KeyValue label="Estimated ingredient budget" value={formatEUR(pricing.ingredientBudgetCents)} />
            <KeyValue label={`÷ ${plural(servings, 'plate')}`} value={`${formatEUR(pricing.ingredientShareCents)} per plate`} muted />
            <FieldError message={e.budget} />
          </Card>

          <View style={{ gap: space.sm }}>
            <Stepper
              label="Your preparation compensation (per guest)"
              hint={`Max ${formatEUR(PRICING.hostCompensationMaxCents)}`}
              value={effective.hostCompensationCents}
              min={0}
              max={PRICING.hostCompensationMaxCents}
              step={PRICING.hostCompensationStepCents}
              format={(v) => formatEUR(v)}
              onChange={(hostCompensationCents) => {
                setCompTouched(true);
                update({ hostCompensationCents });
              }}
              error={e.hostCompensationCents}
            />
            <Txt variant="footnote" color="muted">
              Suggested: {formatEUR(suggestedComp)} ({Math.round(PRICING.hostCompensationSuggestedRate * 100)}% of the ingredient share). Capped so Eat&Meet stays
              cost-sharing, not a restaurant.
            </Txt>
          </View>

          <PriceBreakdown pricing={pricing} title="Each guest contributes" />

          <Card tone="sage" elevated={false} style={{ gap: space.sm }}>
            <Txt variant="title3">If every seat is booked</Txt>
            <KeyValue label={`${draft.guestSeats} guests contribute`} value={formatEUR(pricing.totalPerGuestCents * draft.guestSeats)} />
            <KeyValue label="Towards ingredients" value={formatEUR(pricing.ingredientShareCents * draft.guestSeats)} />
            <KeyValue label="Your preparation fees" value={formatEUR(pricing.hostCompensationCents * draft.guestSeats)} />
            <KeyValue label="Eat&Meet platform fees" value={formatEUR(pricing.platformFeeCents * draft.guestSeats)} />
          </Card>

          <Notice tone="info" title="These are estimates">
            Prices are estimates until you shop. Per-plate quantities on your shopping list follow confirmed bookings, and you can record
            actual costs there. Alcohol is never part of the budget.
          </Notice>
        </Animated.View>
      ) : null}

      {/* ------------------------------------------------------------ Review */}
      {step === 5 ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.step}>
          <Txt variant="title1">Ready to publish?</Txt>
          <Txt variant="callout" color="muted">
            This is how guests will see your dinner in Discover.
          </Txt>

          <DinnerCard dinner={previewDinner(effective, currentUser.id, pricing, now)} onPress={() => {}} />

          <Card style={{ gap: space.md }}>
            <Txt variant="title3">Checklist</Txt>
            {STEP_TITLES.slice(0, 5).map((title, i) => {
              const errs = Object.values(stepErrors(i));
              return (
                <Pressable key={title} accessibilityRole="button" onPress={() => goTo(i)} style={styles.checkItem}>
                  <Icon name={errs.length ? 'warning' : 'checkCircle'} size={18} color={errs.length ? colors.danger : colors.forest} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="callout" weight="600">
                      {title}
                    </Txt>
                    {errs.length ? (
                      <Txt variant="footnote" color="danger" numberOfLines={2}>
                        {errs[0]}
                      </Txt>
                    ) : null}
                  </View>
                  <Icon name="chevronRight" size={14} color={colors.faint} />
                </Pressable>
              );
            })}
          </Card>

          {leadTimeOk ? (
            <Notice tone="success" icon="clock" title="Publishing deadline met">
              {`Your dinner starts ${formatDistance(startDate, now)}. Dinners must be published at least ${RULES.publishLeadTimeHours} hours ahead so guests can plan and you shop for confirmed diners.`}
            </Notice>
          ) : (
            <Notice tone="danger" icon="clock" title="Too close to publish">
              {errors.basics.startsAt ?? `Dinners must be published at least ${RULES.publishLeadTimeHours} hours before they start.`}
            </Notice>
          )}
        </Animated.View>
      ) : null}
    </StackScreen>
  );
}

function previewDinner(draft: DinnerDraft, hostId: string, pricing: Dinner['pricing'], now: Date): Dinner {
  const iso = now.toISOString();
  return {
    ...draft,
    id: 'preview',
    hostId,
    status: 'published',
    pricing,
    shopping: {},
    createdAt: iso,
    updatedAt: iso,
  };
}

const styles = StyleSheet.create({
  step: { gap: space.xl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  exampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E8C98A',
    backgroundColor: colors.honeySoft,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ruleOk: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerRow: { flexDirection: 'row', gap: space.sm },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  planBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  planCost: { width: 72, textAlign: 'right', fontVariant: ['tabular-nums'] },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
});
