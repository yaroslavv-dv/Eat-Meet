import assert from 'node:assert/strict';

import { clusterProfiles, recommendHosts } from '../src/matching/cluster';
import { buildDocument, contentHash } from '../src/matching/document';
import type { FoodPreference } from '../src/matching/parameters';
import type { ProfileInput, StoredProfile } from '../src/matching/types';

const base: ProfileInput = {
  id: '1',
  role: 'guest',
  summary: 'likes pasta',
  age: 30,
  foodPreferences: ['vegetarian', 'no nuts'],
};

assert.equal(buildDocument(base).includes('rating'), false);
assert.match(buildDocument({ ...base, ratings: { asGuest: 4 } }), /Guest rating: 4/);
assert.notEqual(contentHash(base), contentHash({ ...base, ratings: { asGuest: 4 } }));
assert.equal(
  contentHash(base),
  contentHash({
    ...base,
    foodPreferences: [...base.foodPreferences].reverse() as FoodPreference[],
  }),
);

function person(
  id: string,
  role: StoredProfile['role'],
  embedding: number[],
): StoredProfile {
  return {
    id,
    role,
    summary: id,
    age: 30,
    foodPreferences: ['meat'],
    contentHash: 'fixture',
    embedding,
    embeddedAt: 'fixture',
  };
}

const sameCluster = recommendHosts('guest', [
  person('guest', 'guest', [1, 0, 0]),
  person('host-close', 'host', [1, 0.05, 0]),
  person('other-guest', 'guest', [0.99, 0.02, 0]),
  person('host-far', 'host', [0, 1, 0]),
]);

assert.deepEqual(
  sameCluster.map((item) => item.hostId),
  ['host-close', 'host-far'],
);
assert.equal(sameCluster[0].clusterRank, 0);
assert.ok(sameCluster[1].clusterRank > sameCluster[0].clusterRank);

const guestAlone = person('guest', 'guest', [0, 0, 1]);
const nearer = person('nearer', 'host', [0.78, 0.05, 0.62]);
const near = person('near', 'host', [0.8, 0, 0.6]);
const far = person('far', 'host', [0, 1, 0]);
const clusters = clusterProfiles([guestAlone, nearer, near, far]);
const guestCluster = clusters.find((cluster) => cluster.memberIds.includes('guest'));

assert.ok(guestCluster);
assert.deepEqual(guestCluster?.memberIds, ['guest']);

const fallthrough = recommendHosts('guest', [guestAlone, nearer, near, far]);
assert.deepEqual(
  fallthrough.map((item) => item.hostId),
  ['nearer', 'near', 'far'],
);
assert.ok(fallthrough[0].clusterRank > 0);
assert.equal(fallthrough[0].clusterRank, fallthrough[1].clusterRank);
assert.ok(fallthrough[2].clusterRank > fallthrough[0].clusterRank);

console.log('matching checks passed');
