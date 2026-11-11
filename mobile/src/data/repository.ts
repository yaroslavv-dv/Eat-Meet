import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppData } from '@/domain/types';

/**
 * Persistence boundary. The app only talks to this interface, so the local
 * AsyncStorage implementation can later be swapped for an API-backed one
 * (with real multi-user sync) without touching screens or business rules.
 *
 * Local storage holds non-sensitive demo data only – no payment details.
 */
export interface AppRepository {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = 'eatmeet/demo-data/v1';

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<AppData>;
  return v.schemaVersion === 1 && typeof v.users === 'object' && typeof v.dinners === 'object' && !!v.session;
}

export const localRepository: AppRepository = {
  async load() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAppData(parsed) ? parsed : null;
  },
  async save(data) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
