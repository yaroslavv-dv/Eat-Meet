import { contentHash } from './document';
import type { ProfileInput, StoredProfile } from './types';

type MockDraft = ProfileInput & { embedding: number[] };

const dinner = [1, 0.05, 0];

const drafts: MockDraft[] = [
  {
    id: 'mock-guest-binnenstad',
    role: 'guest',
    summary: 'Wants a quiet weeknight dinner and talks easily about books.',
    age: 29,
    foodPreferences: ['vegetarian', 'no nuts'],
    location: 'groningen-binnenstad',
    embedding: [1, 0, 0],
  },
  {
    id: 'mock-host-binnenstad',
    role: 'host',
    summary: 'Hosts small vegetarian dinners in a walkable flat.',
    age: 34,
    foodPreferences: ['vegetarian'],
    location: 'groningen-binnenstad',
    embedding: dinner,
  },
  {
    id: 'mock-host-helpman',
    role: 'host',
    summary: 'Cooks vegetable-heavy meals and likes small groups.',
    age: 41,
    foodPreferences: ['vegetarian', 'no dairy'],
    location: 'groningen-helpman',
    embedding: [0.98, 0.08, 0],
  },
  {
    id: 'mock-host-ten-boer',
    role: 'host',
    summary: 'Hosts vegetarian dinners out in Ten Boer.',
    age: 36,
    foodPreferences: ['vegetarian'],
    location: 'groningen-ten-boer',
    embedding: dinner,
  },
  {
    id: 'mock-guest-ten-boer',
    role: 'guest',
    summary: 'Looking for a meat-friendly supper close to home.',
    age: 27,
    foodPreferences: ['meat'],
    location: 'groningen-ten-boer',
    embedding: [0, 1, 0],
  },
  {
    id: 'mock-host-ten-boer-meat',
    role: 'host',
    summary: 'Grills for friends in Ten Boer.',
    age: 38,
    foodPreferences: ['meat'],
    location: 'groningen-ten-boer',
    embedding: [0, 0.97, 0.1],
  },
];

export function mockProfiles(): StoredProfile[] {
  return drafts.map((draft) => {
    const { embedding, ...input } = draft;
    return {
      ...input,
      contentHash: contentHash(input),
      embedding,
      embeddedAt: 'mock',
    };
  });
}
