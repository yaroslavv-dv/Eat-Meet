import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { recommendHosts, type Recommendation } from '@/matching/cluster';
import { MissingApiKeyError, getOpenAiApiKey } from '@/matching/embed';
import { FOOD_PREFERENCES, type FoodPreference } from '@/matching/parameters';
import { embedStaleProfiles, loadProfiles, upsertProfile } from '@/matching/store';
import type { Role, StoredProfile } from '@/matching/types';

export default function MatchScreen() {
  const theme = useTheme();
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('guest');
  const [ageText, setAgeText] = useState('30');
  const [summary, setSummary] = useState('');
  const [foods, setFoods] = useState<FoodPreference[]>([]);
  const [keyMissing, setKeyMissing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const loaded = await loadProfiles();
      if (!active) return;
      setProfiles(loaded);
      setSelectedId((current) => current ?? loaded.find((profile) => profile.role === 'guest')?.id ?? null);

      if (!getOpenAiApiKey()) {
        setKeyMissing(true);
        return;
      }

      try {
        const embedded = await embedStaleProfiles(loaded);
        if (!active) return;
        setProfiles(embedded);
      } catch (error) {
        if (!active) return;
        setKeyMissing(error instanceof MissingApiKeyError);
        setMessage(error instanceof Error ? error.message : 'Could not embed saved profiles');
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const selected = profiles.find((profile) => profile.id === selectedId) ?? null;
  const recommendations: Recommendation[] =
    selected?.role === 'guest' ? recommendHosts(selected.id, profiles) : [];

  function toggleFood(value: FoodPreference) {
    setFoods((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function saveProfile() {
    const age = Number(ageText);
    if (!Number.isFinite(age) || age < 0 || age > 120) {
      setMessage('Enter an age from 0 to 120.');
      return;
    }
    if (foods.length === 0) {
      setMessage('Choose at least one food preference.');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const saved = await upsertProfile({
        id: createId(),
        role,
        age,
        summary,
        foodPreferences: foods,
      });
      setProfiles(saved);
      const created = saved[saved.length - 1];
      if (created?.role === 'guest') setSelectedId(created.id);

      if (!getOpenAiApiKey()) {
        setKeyMissing(true);
        setMessage('Profile saved. Embeddings need EXPO_PUBLIC_OPENAI_API_KEY in mobile/.env.local.');
        return;
      }

      const embedded = await embedStaleProfiles(saved);
      setProfiles(embedded);
      setKeyMissing(false);
      setSummary('');
      setMessage('Profile saved and embedded.');
    } catch (error) {
      setKeyMissing(error instanceof MissingApiKeyError);
      setMessage(error instanceof Error ? error.message : 'Could not save this profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}>
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Match</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Hosts in the closest clusters are recommended to a guest.
        </ThemedText>

        {keyMissing ? (
          <ThemedView type="backgroundElement" style={styles.notice}>
            <ThemedText type="small">
              Add EXPO_PUBLIC_OPENAI_API_KEY to mobile/.env.local to create embeddings. Profiles
              are saved, and recommendations appear once vectors exist.
            </ThemedText>
          </ThemedView>
        ) : null}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">New person</ThemedText>
          <View style={styles.row}>
            {(['guest', 'host'] as const).map((value) => {
              const selectedRole = role === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedRole }}
                  onPress={() => setRole(value)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView
                    type={selectedRole ? 'backgroundSelected' : 'background'}
                    style={styles.chip}>
                    <ThemedText type="small">{value}</ThemedText>
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            accessibilityLabel="Age"
            value={ageText}
            onChangeText={setAgeText}
            keyboardType="number-pad"
            placeholder="Age"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <TextInput
            accessibilityLabel="Summary"
            value={summary}
            onChangeText={setSummary}
            placeholder="Unstructured summary"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[
              styles.input,
              styles.summary,
              { color: theme.text, borderColor: theme.backgroundSelected },
            ]}
          />

          <View style={styles.wrap}>
            {FOOD_PREFERENCES.map((preference) => {
              const selectedFood = foods.includes(preference);
              return (
                <Pressable
                  key={preference}
                  accessibilityRole="button"
                  accessibilityLabel={preference}
                  accessibilityState={{ selected: selectedFood }}
                  onPress={() => toggleFood(preference)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView
                    type={selectedFood ? 'backgroundSelected' : 'background'}
                    style={styles.chip}>
                    <ThemedText type="small">{preference}</ThemedText>
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => {
              void saveProfile();
            }}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundSelected" style={styles.saveButton}>
              <ThemedText type="smallBold">{saving ? 'Saving…' : 'Save profile'}</ThemedText>
            </ThemedView>
          </Pressable>
        </ThemedView>

        {message ? <ThemedText type="small">{message}</ThemedText> : null}

        <ThemedText type="smallBold">People</ThemedText>
        {profiles.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No one saved yet.
          </ThemedText>
        ) : (
          profiles.map((profile) => {
            const isSelected = profile.id === selectedId;
            return (
              <Pressable
                key={profile.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedId(profile.id)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView
                  type={isSelected ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.person}>
                  <ThemedText type="smallBold">{profileLabel(profile)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {profile.foodPreferences.join(', ')}
                    {profile.embedding ? ' · embedded' : ' · not embedded'}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          })
        )}

        <ThemedText type="smallBold">Recommended hosts</ThemedText>
        {selected?.role !== 'guest' ? (
          <ThemedText type="small" themeColor="textSecondary">
            Select a guest to see host recommendations.
          </ThemedText>
        ) : recommendations.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {selected.embedding
              ? 'No embedded hosts to recommend yet.'
              : 'This guest has no embedding yet.'}
          </ThemedText>
        ) : (
          recommendations.map((recommendation) => {
            const host = profiles.find((profile) => profile.id === recommendation.hostId);
            return (
              <ThemedView key={recommendation.hostId} type="backgroundElement" style={styles.person}>
                <ThemedText type="smallBold">{host ? profileLabel(host) : recommendation.hostId}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {Math.round(recommendation.similarity * 100)}% similar · cluster rank{' '}
                  {recommendation.clusterRank}
                </ThemedText>
              </ThemedView>
            );
          })
        )}
      </ThemedView>
    </ScrollView>
  );
}

function profileLabel(profile: StoredProfile): string {
  const summary = profile.summary.trim().split('\n')[0];
  const title = summary.length > 0 ? summary : 'No summary';
  return `${profile.role} · ${profile.age} · ${title}`;
}

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    gap: Spacing.three,
    width: '100%',
  },
  notice: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  summary: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  person: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
