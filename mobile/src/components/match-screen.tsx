import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TabHeader } from '@/components/app/tab-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, Tag } from '@/components/ui/chip';
import { FieldLabel, Segmented, TextField } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { EmptyState, Notice, SectionHeader } from '@/components/ui/misc';
import { TabScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { recommendHosts, type Recommendation } from '@/matching/cluster';
import { MissingApiKeyError, getOpenAiApiKey } from '@/matching/embed';
import { EMBEDDING_MODEL, FOOD_PREFERENCES, LOCATIONS, type FoodPreference, type LocationId } from '@/matching/parameters';
import { embedStaleProfiles, loadProfiles, seedMockProfiles, upsertProfile } from '@/matching/store';
import type { Role, StoredProfile } from '@/matching/types';
import { colors, radius, space } from '@/theme/tokens';

export default function MatchScreen() {
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('guest');
  const [ageText, setAgeText] = useState('30');
  const [summary, setSummary] = useState('');
  const [foods, setFoods] = useState<FoodPreference[]>([]);
  const [location, setLocation] = useState<LocationId | null>(null);
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
    // Eat&Meet is adults-only.
    if (!Number.isFinite(age) || age < 18 || age > 120) {
      setMessage('Enter an age from 18 to 120.');
      return;
    }
    if (foods.length === 0) {
      setMessage('Choose at least one food preference.');
      return;
    }
    if (!location) {
      setMessage('Choose a location.');
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
        location,
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

  async function loadSamples() {
    setSaving(true);
    setMessage(null);
    try {
      const seeded = await seedMockProfiles();
      setProfiles(seeded);
      setSelectedId('mock-guest-binnenstad');
      setKeyMissing(!getOpenAiApiKey());
      setMessage('Loaded sample hosts and guests.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load samples');
    } finally {
      setSaving(false);
    }
  }

  return (
    <TabScreen>
      <TabHeader overline="Host ↔ guest matching" title="Match">
        <Txt variant="callout" color="muted">
          Hosts near the guest, in the closest clusters, are recommended first.
        </Txt>
      </TabHeader>

      {keyMissing ? (
        <Notice tone="warning" icon="lock" title="Embeddings are off">
          Add EXPO_PUBLIC_OPENAI_API_KEY to mobile/.env.local to create embeddings. Profiles are saved, and recommendations appear once
          vectors exist.
        </Notice>
      ) : null}

      <Card style={{ gap: space.lg }}>
        <Txt variant="title3">New person</Txt>
        <Segmented<Role>
          value={role}
          onChange={setRole}
          options={[
            { value: 'guest', label: 'Guest' },
            { value: 'host', label: 'Host' },
          ]}
        />
        <TextField label="Age" value={ageText} onChangeText={setAgeText} keyboardType="number-pad" placeholder="Age" accessibilityLabel="Age" />
        <TextField
          label="Summary"
          value={summary}
          onChangeText={setSummary}
          placeholder="Unstructured summary – who you are, what you like to cook or eat"
          multiline
          accessibilityLabel="Summary"
        />
        <View style={{ gap: space.sm }}>
          <FieldLabel label="Food preferences" />
          <View style={styles.wrap}>
            {FOOD_PREFERENCES.map((preference) => (
              <Chip key={preference} label={preference} selected={foods.includes(preference)} onPress={() => toggleFood(preference)} />
            ))}
          </View>
        </View>
        <View style={{ gap: space.sm }}>
          <FieldLabel label="Location" />
          <View style={styles.wrap}>
            {LOCATIONS.map((place) => (
              <Chip key={place.id} label={place.label} icon="location" selected={location === place.id} onPress={() => setLocation(place.id)} />
            ))}
          </View>
        </View>
        <View style={styles.row}>
          <Button
            title={saving ? 'Saving…' : 'Save profile'}
            onPress={() => {
              void saveProfile();
            }}
            disabled={saving}
            size="md"
            style={{ flex: 1 }}
          />
          <Button
            title="Load samples"
            variant="secondary"
            onPress={() => {
              void loadSamples();
            }}
            disabled={saving}
            size="md"
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      {message ? <Notice tone="neutral">{message}</Notice> : null}

      <View style={{ gap: space.md }}>
        <SectionHeader title="People" subtitle={profiles.length ? 'Select a guest to see recommended hosts.' : undefined} />
        {profiles.length === 0 ? (
          <Card tone="sand" elevated={false}>
            <EmptyState compact icon="people" title="No one saved yet" message="Add a person above or load the sample hosts and guests." />
          </Card>
        ) : (
          profiles.map((profile) => {
            const isSelected = profile.id === selectedId;
            return (
              <Pressable
                key={profile.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedId(profile.id)}
                style={({ pressed }) => [styles.person, isSelected && styles.personSelected, pressed && { opacity: 0.85 }]}>
                <View style={styles.personHead}>
                  <Tag label={profile.role} tone={profile.role === 'host' ? 'terracotta' : 'sage'} size="sm" />
                  <Txt variant="callout" weight="700" numberOfLines={1} style={{ flex: 1 }}>
                    {profileLabel(profile)}
                  </Txt>
                </View>
                <Txt variant="footnote" color="muted">
                  {placeName(profile)} · {profile.foodPreferences.join(', ')}
                  {profile.embedding ? ' · embedded' : ' · not embedded'}
                </Txt>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Recommended hosts" />
        {selected?.role !== 'guest' ? (
          <Txt variant="callout" color="muted">
            Select a guest to see host recommendations.
          </Txt>
        ) : recommendations.length === 0 ? (
          <Txt variant="callout" color="muted">
            {selected.embedding ? 'No embedded hosts to recommend yet.' : 'This guest has no embedding yet.'}
          </Txt>
        ) : (
          recommendations.map((recommendation) => {
            const host = profiles.find((profile) => profile.id === recommendation.hostId);
            return (
              <Card key={recommendation.hostId} style={{ gap: space.xs }}>
                <View style={styles.personHead}>
                  <Icon name="home" size={15} color={colors.terracotta} />
                  <Txt variant="callout" weight="700" numberOfLines={1} style={{ flex: 1 }}>
                    {host ? profileLabel(host) : recommendation.hostId}
                  </Txt>
                  <Txt variant="callout" weight="700" color="forest">
                    {Math.round(recommendation.similarity * 100)}%
                  </Txt>
                </View>
                <Txt variant="footnote" color="muted">
                  {host ? placeName(host) : 'No location'} · {Math.round(recommendation.similarity * 100)}% similar · cluster rank{' '}
                  {recommendation.clusterRank}
                </Txt>
              </Card>
            );
          })
        )}
      </View>

      <Txt variant="caption" color="faint" align="center" style={{ paddingHorizontal: space.lg }}>
        Profile summaries, age, food preferences and area are sent to OpenAI ({EMBEDDING_MODEL}) to create embeddings. Clustering and
        matching run on this device.
      </Txt>
    </TabScreen>
  );
}

function profileLabel(profile: StoredProfile): string {
  const summary = profile.summary.trim().split('\n')[0];
  const title = summary.length > 0 ? summary : 'No summary';
  return `${profile.role} · ${profile.age} · ${title}`;
}

function placeName(profile: StoredProfile): string {
  return LOCATIONS.find((place) => place.id === profile.location)?.label ?? 'No location';
}

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  person: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  personSelected: { borderColor: colors.forest, backgroundColor: colors.sageSoft },
  personHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
