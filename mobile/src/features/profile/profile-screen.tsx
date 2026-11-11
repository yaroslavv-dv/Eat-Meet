import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { TabHeader } from '@/components/app/tab-header';
import { RatingSummary } from '@/components/dinner/review-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { Segmented } from '@/components/ui/form';
import { Icon, type IconName } from '@/components/ui/icon';
import { Avatar, DemoBadge, Divider, SectionHeader } from '@/components/ui/misc';
import { TabScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import {
  AGE_GROUP_LABEL,
  ALCOHOL_PREFERENCE_LABEL,
  ALLERGEN_LABEL,
  DIETARY_TAG_LABEL,
  GUEST_DIET_LABEL,
  PRICING,
  RULES,
  SOCIAL_LABEL,
} from '@/domain/constants';
import { ageFromBirthYear, formatShortDate } from '@/domain/dates';
import { formatEUR } from '@/domain/money';
import { dinnersForHost, hostRatings } from '@/domain/selectors';
import type { AppMode } from '@/domain/types';
import { useStore } from '@/state/store';
import { colors, space } from '@/theme/tokens';

export function ProfileScreen() {
  const { data, now, currentUser: user, mode, actions, persistError } = useStore();
  const toast = useToast();
  const p = user.preferences;
  const hosted = dinnersForHost(data, user.id).filter((d) => d.status !== 'draft');
  const ratings = hostRatings(data, user.id);

  const reset = () =>
    Alert.alert('Reset demo data?', 'All reservations, dinners and reviews return to the original demo state, with dates relative to now.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          actions
            .resetDemo()
            .then(() => toast('Demo data reset'))
            .catch(() => toast('Reset failed', 'error'));
        },
      },
    ]);

  return (
    <TabScreen>
      <TabHeader overline="Profile" title={user.firstName} />

      <Card style={{ gap: space.md }}>
        <View style={styles.identity}>
          <Avatar user={user} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="title2">
              {user.firstName} {user.lastName}
            </Txt>
            <Txt variant="footnote" color="muted">
              {ageFromBirthYear(user.birthYear, now)} · {user.neighborhood}, Groningen · member since {formatShortDate(user.joinedAt)}
            </Txt>
            <View style={styles.tags}>
              <Tag label="Adult (18+)" tone="sage" icon="checkCircle" size="sm" />
              <Tag label="Demo account" tone="warning" icon="lock" size="sm" />
            </View>
          </View>
        </View>
        {user.bio ? (
          <Txt variant="callout" color="inkSoft">
            {user.bio}
          </Txt>
        ) : null}
      </Card>

      <View style={{ gap: space.md }}>
        <SectionHeader title="How you use Eat&Meet" subtitle="One account – switch between joining and hosting anytime." />
        <Segmented<AppMode>
          value={mode}
          onChange={(m) => {
            actions.setMode(m);
            toast(m === 'host' ? 'Host mode – manage your dinners' : 'Guest mode – discover dinners', 'info');
          }}
          options={[
            { value: 'guest', label: 'Guest' },
            { value: 'host', label: 'Host' },
          ]}
        />
        <Button title="Switch demo profile" icon="swap" variant="outline" onPress={() => router.push('/switch-profile')} />
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Preferences" actionLabel="Edit" onAction={() => router.push('/preferences')} />
        <Card style={{ gap: space.md }}>
          <PrefRow icon="leaf" label="Diet" value={GUEST_DIET_LABEL[p.diet]} />
          {p.dietaryTags.length ? <PrefRow icon="check" label="Other needs" value={p.dietaryTags.map((t) => DIETARY_TAG_LABEL[t]).join(', ')} /> : null}
          <Divider />
          <View style={{ gap: space.sm }}>
            <View style={styles.prefHead}>
              <Icon name="warning" size={15} color={colors.danger} />
              <Txt variant="footnote" weight="700" color="inkSoft">
                Allergies & intolerances
              </Txt>
            </View>
            {p.allergies.length ? (
              <View style={styles.tags}>
                {p.allergies.map((a) => (
                  <Tag key={a} label={ALLERGEN_LABEL[a]} tone="danger" icon="warning" />
                ))}
              </View>
            ) : (
              <Txt variant="callout" color="muted">
                None listed
              </Txt>
            )}
            {p.allergyNotes ? (
              <Txt variant="footnote" color="muted">
                {p.allergyNotes}
              </Txt>
            ) : null}
          </View>
          <Divider />
          <PrefRow icon="tea" label="Alcohol" value={ALCOHOL_PREFERENCE_LABEL[p.alcohol]} />
          <PrefRow icon="chat" label="Social" value={SOCIAL_LABEL[p.social]} />
          <PrefRow icon="people" label="Preferred age group" value={p.ageGroups.map((a) => AGE_GROUP_LABEL[a]).join(', ') || 'Any adult age'} />
        </Card>
      </View>

      {mode === 'host' || hosted.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="As a host" subtitle={`${hosted.length} ${hosted.length === 1 ? 'dinner' : 'dinners'} published`} />
          <RatingSummary ratings={ratings} />
        </View>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader title="How Eat&Meet works financially" />
        <Card style={{ gap: space.md }}>
          <InfoLine icon="cart" title="Guests share ingredient costs" body="The shopping budget is split per plate. Hosts pay for their own plate." />
          <InfoLine
            icon="heart"
            title="Hosts earn a small preparation fee"
            body={`Set per guest, capped at ${formatEUR(PRICING.hostCompensationMaxCents)} so dinners stay cost-sharing, not a restaurant.`}
          />
          <InfoLine
            icon="euro"
            title="Eat&Meet keeps a service fee"
            body={`${Math.round(PRICING.platformFeeRate * 100)}% of each contribution (min ${formatEUR(PRICING.platformFeeMinCents)}, max ${formatEUR(PRICING.platformFeeMaxCents)}) for payments, support and trust & safety.`}
          />
          <InfoLine icon="wine" title="Alcohol is never in the budget" body="Dinners only mark whether alcohol may be present." />
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Trust & safety" />
        <Card style={{ gap: space.md }}>
          <InfoLine icon="checkCircle" title="Adults only" body="Every account confirms they are 18 or older." />
          <InfoLine icon="warning" title="Allergen declarations" body="Hosts declare the EU 14 allergens. Guests with a matching allergy cannot book." />
          <InfoLine icon="star" title="Guest-reported hygiene ratings" body="Only guests who attended can review – once per dinner." />
          <InfoLine icon="lock" title="Location privacy" body="Only the neighbourhood is public; the address is shared after booking." />
          <InfoLine icon="clock" title={`${RULES.publishLeadTimeHours}-hour publishing rule`} body="Gives guests time to plan and hosts time to shop for confirmed diners." />
          <InfoLine icon="flag" title="Report a concern" body="Every dinner has a report option." />
          <Divider />
          <Txt variant="footnote" color="muted">
            Not yet in this demo: identity verification, a payment provider, insurance, and checks against Dutch food-safety and
            privacy requirements. These are needed before a commercial launch.
          </Txt>
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <View style={styles.prefHead}>
          <Txt variant="title2" style={{ flex: 1 }}>
            Demo controls
          </Txt>
          <DemoBadge />
        </View>
        <Card style={{ gap: space.md }}>
          <Txt variant="footnote" color="muted">
            Data is stored only on this device. Nothing is synced between phones, and no real money moves.
            {Object.keys(data.concerns).length ? ` ${Object.keys(data.concerns).length} concern report(s) saved locally.` : ''}
          </Txt>
          {persistError ? (
            <Txt variant="footnote" color="danger">
              Saving failed: {persistError}
            </Txt>
          ) : null}
          <Button title="Reset demo data" icon="reset" variant="outline" onPress={reset} />
          <Button title="Replay onboarding" icon="history" variant="ghost" size="md" onPress={() => actions.replayOnboarding()} />
        </Card>
      </View>

      <Txt variant="caption" color="faint" align="center">
        Eat&Meet {Constants.expoConfig?.version ?? '1.0.0'} · Green Business Challenge 2026 prototype{'\n'}Match uses OpenAI embeddings when a key is configured · Demo photos: Unsplash
      </Txt>
    </TabScreen>
  );
}

function PrefRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.prefRow}>
      <Icon name={icon} size={15} color={colors.forest} />
      <Txt variant="footnote" color="muted" style={{ width: 120 }}>
        {label}
      </Txt>
      <Txt variant="callout" weight="600" style={{ flex: 1 }}>
        {value}
      </Txt>
    </View>
  );
}

function InfoLine({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View style={styles.info}>
      <View style={styles.infoIcon}>
        <Icon name={icon} size={15} color={colors.forest} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="callout" weight="700">
          {title}
        </Txt>
        <Txt variant="footnote" color="muted">
          {body}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  prefHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  info: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  infoIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
});
