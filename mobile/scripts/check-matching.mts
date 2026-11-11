import assert from 'node:assert/strict';

import { clusterProfiles, recommendHosts } from '../src/matching/cluster';
import { buildDocument, contentHash } from '../src/matching/document';
import { mockProfiles } from '../src/matching/mocks';
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
assert.equal(buildDocument(base).includes('Location:'), false);
assert.match(
  buildDocument({ ...base, location: 'groningen-binnenstad' }),
  /Location: Groningen Binnenstad/,
);
assert.notEqual(contentHash(base), contentHash({ ...base, location: 'groningen-ten-boer' }));

function person(
  id: string,
  role: StoredProfile['role'],
  embedding: number[],
  location?: StoredProfile['location'],
): StoredProfile {
  return {
    id,
    role,
    summary: id,
    age: 30,
    foodPreferences: ['meat'],
    location,
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

const samePlace = [1, 0, 0];
const locatedPeople = [
  person('guest', 'guest', samePlace, 'groningen-binnenstad'),
  person('host-here', 'host', samePlace, 'groningen-binnenstad'),
  person('host-near', 'host', samePlace, 'groningen-helpman'),
  person('host-far', 'host', samePlace, 'groningen-ten-boer'),
];
const located = recommendHosts('guest', locatedPeople);

assert.deepEqual(
  located.map((item) => item.hostId),
  ['host-here', 'host-near', 'host-far'],
);
assert.equal(located[0].clusterRank, 0);
assert.ok(located[2].clusterRank > located[0].clusterRank);

const locatedClusters = clusterProfiles(locatedPeople);
const locatedGuestCluster = locatedClusters.find((cluster) => cluster.memberIds.includes('guest'));
assert.ok(locatedGuestCluster?.memberIds.includes('host-here'));
assert.ok(locatedGuestCluster?.memberIds.includes('host-near'));
assert.equal(locatedGuestCluster?.memberIds.includes('host-far'), false);

const samples = mockProfiles();
const binnenstadGuest = recommendHosts('mock-guest-binnenstad', samples);
assert.deepEqual(
  binnenstadGuest.map((item) => item.hostId).slice(0, 2),
  ['mock-host-binnenstad', 'mock-host-helpman'],
);
assert.ok(binnenstadGuest.findIndex((item) => item.hostId === 'mock-host-ten-boer') > 1);

const tenBoerGuest = recommendHosts('mock-guest-ten-boer', samples);
assert.equal(tenBoerGuest[0].hostId, 'mock-host-ten-boer-meat');
assert.ok(
  tenBoerGuest.findIndex((item) => item.hostId === 'mock-host-ten-boer') <
    tenBoerGuest.findIndex((item) => item.hostId === 'mock-host-binnenstad'),
);

console.log('matching checks passed');
