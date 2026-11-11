import { buildDocument, contentHash } from './document';
import { embedTexts } from './embed';
import type { ProfileInput, StoredProfile } from './types';

const STORAGE_KEY = 'eat-meet.matching.profiles';

type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

async function getStorage(): Promise<KeyValueStorage> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  return AsyncStorage;
}

export async function loadProfiles(): Promise<StoredProfile[]> {
  const raw = await (await getStorage()).getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as StoredProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveProfiles(profiles: StoredProfile[]): Promise<void> {
  await (await getStorage()).setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function toStoredProfile(input: ProfileInput, previous?: StoredProfile): StoredProfile {
  const nextHash = contentHash(input);
  const keepEmbedding = previous?.contentHash === nextHash && previous.embedding != null;

  return {
    ...input,
    contentHash: nextHash,
    embedding: keepEmbedding ? previous.embedding : null,
    embeddedAt: keepEmbedding ? previous.embeddedAt : null,
  };
}

export async function upsertProfile(input: ProfileInput): Promise<StoredProfile[]> {
  const profiles = await loadProfiles();
  const index = profiles.findIndex((profile) => profile.id === input.id);
  const next = toStoredProfile(input, index >= 0 ? profiles[index] : undefined);

  if (index >= 0) profiles[index] = next;
  else profiles.push(next);

  await saveProfiles(profiles);
  return profiles;
}

export async function embedStaleProfiles(profiles?: StoredProfile[]): Promise<StoredProfile[]> {
  const current = profiles ?? (await loadProfiles());
  const stale = current.filter(
    (profile) => profile.embedding == null || profile.contentHash !== contentHash(profile),
  );

  if (stale.length === 0) return current;

  const vectors = await embedTexts(stale.map((profile) => buildDocument(profile)));
  const embeddedAt = new Date().toISOString();
  const byId = new Map(stale.map((profile, index) => [profile.id, vectors[index]]));

  const next = current.map((profile) => {
    const embedding = byId.get(profile.id);
    if (!embedding) return profile;
    return {
      ...profile,
      contentHash: contentHash(profile),
      embedding,
      embeddedAt,
    };
  });

  await saveProfiles(next);
  return next;
}
