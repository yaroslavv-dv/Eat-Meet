import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/misc';
import { OptionCard } from '@/components/ui/option-card';
import { StackScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import {
  AGE_GROUP_LABEL,
  ALCOHOL_PREFERENCE_LABEL,
  ALLERGEN_LABEL,
  ALLERGENS,
  DIET_ORDER,
  DIETARY_TAG_LABEL,
  GUEST_DIET_LABEL,
  SOCIAL_HINT,
  SOCIAL_LABEL,
} from '@/domain/constants';
import type { AgeGroup, AlcoholPreference, DietaryTag, Preferences, SocialStyle } from '@/domain/types';
import { useStore } from '@/state/store';
import { colors, space } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

const TAGS: DietaryTag[] = ['halal', 'kosher', 'gluten_free', 'lactose_free', 'no_pork'];
const ALCOHOL: AlcoholPreference[] = ['alcohol_free_only', 'no_preference', 'alcohol_ok'];
const SOCIAL: SocialStyle[] = ['eat_meet', 'flexible', 'just_eat'];
const AGES: AgeGroup[] = ['any', '18_24', '25_34', '35_plus'];

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function PreferencesScreen() {
  const { currentUser, actions } = useStore();
  const toast = useToast();
  const [prefs, setPrefs] = useState<Preferences>(currentUser.preferences);
  const set = (patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch }));

  const save = () => {
    const r = actions.updatePreferences(prefs);
    if (!r.ok) {
      toast(r.error, 'error');
      return;
    }
    goBack();
    toast('Preferences saved');
  };

  const toggleAge = (a: AgeGroup) => {
    if (a === 'any') return set({ ageGroups: ['any'] });
    const next = toggle(prefs.ageGroups.filter((x) => x !== 'any'), a);
    set({ ageGroups: next.length ? next : ['any'] });
  };

  return (
    <StackScreen title="Your preferences" variant="close" modal footer={<Button title="Save preferences" onPress={save} />}>
      <Section title="What do you eat?">
        <View style={styles.chips}>
          {DIET_ORDER.map((d) => (
            <Chip key={d} label={GUEST_DIET_LABEL[d]} icon="leaf" selected={prefs.diet === d} onPress={() => set({ diet: d })} />
          ))}
        </View>
        <Txt variant="footnote" color="muted">
          Other dietary requirements
        </Txt>
        <View style={styles.chips}>
          {TAGS.map((t) => (
            <Chip key={t} label={DIETARY_TAG_LABEL[t]} selected={prefs.dietaryTags.includes(t)} onPress={() => set({ dietaryTags: toggle(prefs.dietaryTags, t) })} />
          ))}
        </View>
        <TextField
          label="Anything else?"
          optional
          value={prefs.dietaryNotes}
          onChangeText={(dietaryNotes) => set({ dietaryNotes })}
          placeholder="e.g. I don’t eat mushrooms"
        />
      </Section>

      <Card tone="terracotta" elevated={false} style={{ gap: space.md }}>
        <View style={styles.head}>
          <Icon name="warning" size={18} color={colors.danger} />
          <Txt variant="title2" style={{ flex: 1 }}>
            Allergies & intolerances
          </Txt>
        </View>
        <Txt variant="footnote" color="inkSoft">
          Medical information, kept separate from diet choices. You cannot book dinners that declare one of these allergens.
        </Txt>
        <View style={styles.chips}>
          {ALLERGENS.map((a) => (
            <Chip key={a} label={ALLERGEN_LABEL[a]} tone="danger" selected={prefs.allergies.includes(a)} onPress={() => set({ allergies: toggle(prefs.allergies, a) })} />
          ))}
        </View>
        <TextField
          label="Details for hosts"
          optional
          value={prefs.allergyNotes}
          onChangeText={(allergyNotes) => set({ allergyNotes })}
          placeholder="e.g. Severe – I carry an EpiPen"
        />
        <Notice tone="neutral">
          Hosts self-report allergens. Eat&Meet cannot guarantee an allergen-free environment; cross-contact in a home kitchen is possible.
        </Notice>
      </Card>

      <Section title="Alcohol">
        {ALCOHOL.map((a) => (
          <OptionCard
            key={a}
            icon={a === 'alcohol_free_only' ? 'tea' : a === 'alcohol_ok' ? 'wine' : 'flexible'}
            title={ALCOHOL_PREFERENCE_LABEL[a]}
            selected={prefs.alcohol === a}
            onPress={() => set({ alcohol: a })}
          />
        ))}
      </Section>

      <Section title="How social do you feel?">
        {SOCIAL.map((s) => (
          <OptionCard
            key={s}
            icon={s === 'eat_meet' ? 'chat' : s === 'just_eat' ? 'forkKnife' : 'flexible'}
            title={SOCIAL_LABEL[s]}
            description={SOCIAL_HINT[s]}
            selected={prefs.social === s}
            onPress={() => set({ social: s })}
          />
        ))}
      </Section>

      <Section title="Preferred age group" hint="A social preference only – it never excludes anyone.">
        <View style={styles.chips}>
          {AGES.map((a) => (
            <Chip key={a} label={AGE_GROUP_LABEL[a]} selected={prefs.ageGroups.includes(a)} onPress={() => toggleAge(a)} />
          ))}
        </View>
      </Section>
    </StackScreen>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Txt variant="title2">{title}</Txt>
        {hint ? (
          <Txt variant="footnote" color="muted">
            {hint}
          </Txt>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
