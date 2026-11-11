import type { FoodPreference } from './parameters';

export type Role = 'host' | 'guest';

export type Ratings = {
  asHost?: number;
  asGuest?: number;
};

export type ProfileInput = {
  id: string;
  role: Role;
  summary: string;
  age: number;
  foodPreferences: FoodPreference[];
  ratings?: Ratings;
};

export type StoredProfile = ProfileInput & {
  contentHash: string;
  embedding: number[] | null;
  embeddedAt: string | null;
};
