import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { DinnerImage } from '@/components/dinner/dinner-image';
import { PriceBreakdown } from '@/components/dinner/price-breakdown';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { CheckRow, TextField } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { DemoBadge, Divider, EmptyState, KeyValue, Notice } from '@/components/ui/misc';
import { StackScreen } from '@/components/ui/screen';
import { StepIndicator } from '@/components/ui/steps';
import { Txt } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { assessCompatibility } from '@/domain/compatibility';
import { ALLERGEN_LABEL, DIETARY_TAG_LABEL, GUEST_DIET_LABEL, RULES } from '@/domain/constants';
import { formatWhen, HOUR_MS } from '@/domain/dates';
import { formatEUR } from '@/domain/money';
import { checkBookable } from '@/domain/rules';
import { dinnerAllergens, seatsLeft } from '@/domain/selectors';
import { paymentProvider } from '@/services/payments';
import { useStore } from '@/state/store';
import { colors, radius, space } from '@/theme/tokens';

const STEPS = ['Safety check', 'Contribution & terms', 'Confirm'];

export default function ReserveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, now, currentUser, actions } = useStore();
  const toast = useToast();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [step, setStep] = useState(0);
  const [ack, setAck] = useState({ allergens: false, foodSafety: false, terms: false, dietDifference: false });
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dinner = id ? data.dinners[id] : undefined;
  if (!dinner || !dinner.pricing) {
    return (
      <StackScreen title="Reserve" variant="close" modal>
        <EmptyState icon="forkKnife" title="Dinner not available" message="This dinner can no longer be booked." />
      </StackScreen>
    );
  }

  const host = data.users[dinner.hostId];
  const pricing = dinner.pricing;
  const compat = assessCompatibility(currentUser.preferences, dinner);
  const booking = checkBookable(data, dinner.id, currentUser.id, now);
  const allergens = dinnerAllergens(dinner);
  const prefs = currentUser.preferences;
  const freeUntil = new Date(new Date(dinner.startsAt).getTime() - RULES.freeCancellationHours * HOUR_MS);
  const freeWindowOpen = now.getTime() < freeUntil.getTime();

  const step1Done = ack.allergens && ack.foodSafety && (!compat.needsDietAcknowledgement || ack.dietDifference);
  const canContinue = booking.ok && (step === 0 ? step1Done : step === 1 ? ack.terms : true);

  const goTo = (next: number) => {
    setStep(next);
    setError(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    const result = await actions.reserveSeat({ dinnerId: dinner.id, acknowledgements: ack, noteToHost: note });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      toast(result.error, 'error');
      return;
    }
    router.replace({ pathname: '/reservation/[id]', params: { id: result.value.reservationId, confirmed: '1' } });
  };

  const footer = (
    <View style={styles.footerRow}>
      {step > 0 ? <Button title="Back" variant="outline" onPress={() => goTo(step - 1)} disabled={submitting} style={{ flex: 1 }} /> : null}
      {step < 2 ? (
        <Button title="Continue" onPress={() => goTo(step + 1)} disabled={!canContinue} style={{ flex: 2 }} iconRight="arrowRight" />
      ) : (
        <Button
          title={`Confirm demo · ${formatEUR(pricing.totalPerGuestCents)}`}
          variant="accent"
          onPress={confirm}
          loading={submitting}
          disabled={!booking.ok}
          style={{ flex: 2 }}
        />
      )}
    </View>
  );

  return (
    <StackScreen title="Reserve a seat" subtitle={dinner.title} variant="close" modal footer={footer} scrollRef={scrollRef}>
      <StepIndicator steps={STEPS} current={step} />

      <Card padding={space.md} style={styles.summary}>
        <DinnerImage image={dinner.mealImage} style={styles.thumb} showLabel={false} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="headline" numberOfLines={1}>
            {dinner.title}
          </Txt>
          <Txt variant="footnote" color="muted">
            {formatWhen(dinner.startsAt, now)} · with {host?.firstName}
          </Txt>
          <Txt variant="footnote" color="forest" weight="600">
            {seatsLeft(data, dinner)} of {dinner.guestSeats} seats left
          </Txt>
        </View>
      </Card>

      {!booking.ok ? (
        <Notice tone="danger" title="This seat can’t be booked">
          {booking.message}
        </Notice>
      ) : null}
      {error ? <Notice tone="danger" title="Reservation failed">{error}</Notice> : null}

      {step === 0 ? (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: space.lg }}>
          <Txt variant="title2">Before you book</Txt>

          {compat.issues.length > 0 ? (
            <Card style={{ gap: space.md }}>
              {compat.issues.map((i) => (
                <View key={i.message} style={styles.line}>
                  <Icon
                    name={i.severity === 'block' ? 'hand' : i.severity === 'warn' ? 'warning' : 'info'}
                    size={16}
                    color={i.severity === 'block' ? colors.danger : i.severity === 'warn' ? colors.warning : colors.info}
                    style={{ marginTop: 2 }}
                  />
                  <Txt variant="callout" style={{ flex: 1 }}>
                    {i.message}
                  </Txt>
                </View>
              ))}
            </Card>
          ) : (
            <Notice tone="success" title="This dinner fits your preferences" />
          )}

          <View style={{ gap: space.sm }}>
            <Txt variant="title3">Declared allergens</Txt>
            {allergens.length === 0 ? (
              <Txt variant="callout" color="muted">
                The host declared no allergens.
              </Txt>
            ) : (
              <View style={styles.tags}>
                {allergens.map((a) => (
                  <Tag key={a} label={ALLERGEN_LABEL[a]} tone={prefs.allergies.includes(a) ? 'danger' : 'warning'} icon="warning" />
                ))}
              </View>
            )}
          </View>

          <CheckRow
            checked={ack.allergens}
            onChange={(v) => setAck({ ...ack, allergens: v })}
            title="I have read the allergen declaration"
            description="Allergens are self-reported by the host. A home kitchen is never allergen-free and cross-contact is possible."
          />
          {compat.needsDietAcknowledgement ? (
            <CheckRow
              checked={ack.dietDifference}
              onChange={(v) => setAck({ ...ack, dietDifference: v })}
              title="I know this dinner doesn’t match my diet"
              description={`You eat ${GUEST_DIET_LABEL[prefs.diet].toLowerCase()}. The host will not necessarily prepare an alternative.`}
              tone="danger"
            />
          ) : null}
          <CheckRow
            checked={ack.foodSafety}
            onChange={(v) => setAck({ ...ack, foodSafety: v })}
            title="I understand this is home cooking"
            description="Hosts are home cooks, not professional kitchens. Hygiene ratings come from guests, not official inspections."
          />

          <Card tone="sage" elevated={false} style={{ gap: space.sm }}>
            <View style={styles.line}>
              <Icon name="info" size={16} color={colors.forest} style={{ marginTop: 2 }} />
              <Txt variant="footnote" color="inkSoft" style={{ flex: 1 }}>
                {host?.firstName} will see your diet ({GUEST_DIET_LABEL[prefs.diet].toLowerCase()})
                {prefs.allergies.length ? `, allergies (${prefs.allergies.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(', ')})` : ''}
                {prefs.dietaryTags.length ? ` and needs (${prefs.dietaryTags.map((t) => DIETARY_TAG_LABEL[t].toLowerCase()).join(', ')})` : ''} so they can plan the meal.
              </Txt>
            </View>
          </Card>
          <TextField
            label="Note for the host"
            optional
            value={note}
            onChangeText={setNote}
            placeholder="e.g. I might be 10 minutes late"
            maxLength={200}
            multiline
          />
        </Animated.View>
      ) : null}

      {step === 1 ? (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: space.lg }}>
          <PriceBreakdown pricing={pricing} title="Your contribution" />

          <Card style={{ gap: space.md }}>
            <Txt variant="title3">Cancellation terms</Txt>
            <TermLine
              icon="checkCircle"
              color={colors.forest}
              text={
                freeWindowOpen
                  ? `Free cancellation until ${formatWhen(freeUntil, now)} (48 hours before the dinner).`
                  : 'The free cancellation window (48 hours before the dinner) has passed.'
              }
            />
            <TermLine
              icon="cart"
              color={colors.terracotta}
              text={`After that, your ingredient share (${formatEUR(pricing.ingredientShareCents)}) is kept because the host may already have shopped for you. The rest is refunded.`}
            />
            <TermLine icon="reset" color={colors.info} text="If the host cancels, you get everything back." />
            <TermLine icon="lock" color={colors.muted} text="Contributions are held until the dinner takes place (in the production version)." />
          </Card>

          <CheckRow
            checked={ack.terms}
            onChange={(v) => setAck({ ...ack, terms: v })}
            title="I agree to the contribution and cancellation terms"
          />
        </Animated.View>
      ) : null}

      {step === 2 ? (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: space.lg }}>
          <Notice tone="demo" title="Demonstration only – no real payment">
            No card details are collected and no money moves. Confirming records a simulated contribution so you can see the full flow.
          </Notice>

          <Card style={{ gap: space.md }}>
            <View style={styles.methodRow}>
              <View style={styles.methodIcon}>
                <Icon name="euro" size={20} color={colors.forest} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="headline">Simulated contribution</Txt>
                <Txt variant="footnote" color="muted">
                  {paymentProvider.isSimulated ? 'No card · no bank · no real money' : paymentProvider.name}
                </Txt>
              </View>
              <DemoBadge />
            </View>
            <Divider />
            <KeyValue label="Ingredients" value={formatEUR(pricing.ingredientShareCents)} />
            <KeyValue label="Host preparation" value={formatEUR(pricing.hostCompensationCents)} />
            <KeyValue label="Platform fee" value={formatEUR(pricing.platformFeeCents)} />
            <Divider />
            <KeyValue label="Total" value={formatEUR(pricing.totalPerGuestCents)} strong />
          </Card>

          <Txt variant="footnote" color="muted" align="center">
            In production, a regulated payment provider would collect this amount, pay the host and keep the platform fee.
          </Txt>
        </Animated.View>
      ) : null}
    </StackScreen>
  );
}

function TermLine({ icon, color, text }: { icon: 'checkCircle' | 'cart' | 'reset' | 'lock'; color: string; text: string }) {
  return (
    <View style={styles.line}>
      <Icon name={icon} size={16} color={color} style={{ marginTop: 2 }} />
      <Txt variant="callout" color="inkSoft" style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', gap: space.sm },
  summary: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  thumb: { width: 60, height: 60, borderRadius: radius.sm },
  line: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  methodIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
});
