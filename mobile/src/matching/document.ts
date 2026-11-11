import { EMBEDDING_MODEL, locationById } from './parameters';
import type { ProfileInput } from './types';

export function buildDocument(profile: ProfileInput): string {
  const foods = [...profile.foodPreferences].sort();
  const lines = [
    `Role: ${profile.role}`,
    `Age: ${profile.age}`,
    `Food preferences: ${foods.length > 0 ? foods.join(', ') : 'none'}`,
  ];

  if (profile.location) {
    lines.push(`Location: ${locationById(profile.location).label}`);
  }

  lines.push(`Summary: ${profile.summary.trim()}`);

  if (profile.ratings?.asHost != null) {
    lines.push(`Host rating: ${profile.ratings.asHost}`);
  }
  if (profile.ratings?.asGuest != null) {
    lines.push(`Guest rating: ${profile.ratings.asGuest}`);
  }

  return lines.join('\n');
}

export function contentHash(profile: ProfileInput, model: string = EMBEDDING_MODEL): string {
  return hashString(`${model}\n${buildDocument(profile)}`);
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
