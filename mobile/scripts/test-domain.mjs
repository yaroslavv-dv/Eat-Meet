#!/usr/bin/env node
/**
 * Business-rule tests for Eat&Meet.
 *
 * Compiles src/domain + the seed data with the project's TypeScript compiler
 * into a temporary folder and runs plain node:assert checks against it.
 * No test framework or extra dependency needed:  npm run test:domain
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(join(tmpdir(), 'eatmeet-domain-'));

try {
  execFileSync(
    process.execPath,
    [
      join(root, 'node_modules/typescript/bin/tsc'),
      '--ignoreConfig',
      '--outDir', out,
      '--rootDir', join(root, 'src'),
      '--module', 'nodenext',
      '--moduleResolution', 'nodenext',
      '--target', 'es2022',
      '--strict',
      '--skipLibCheck',
      '--types', 'node',
      join(root, 'src/domain/actions.ts'),
      join(root, 'src/domain/filters.ts'),
      join(root, 'src/domain/impact.ts'),
      join(root, 'src/data/seed.ts'),
    ],
    { stdio: 'inherit' },
  );
} catch {
  // Type errors still emit JS; `npm run typecheck` is the source of truth for types.
}
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');

const require = createRequire(join(out, 'index.js'));
const A = require('./domain/actions.js');
const R = require('./domain/rules.js');
const P = require('./domain/pricing.js');
const S = require('./domain/selectors.js');
const C = require('./domain/compatibility.js');
const F = require('./domain/filters.js');
const I = require('./domain/impact.js');
const M = require('./domain/money.js');
const { createSeedData } = require('./data/seed.js');

const HOUR = 3600e3;
const now = new Date();
let passed = 0;
const results = [];
function test(name, fn) {
  try {
    fn();
    passed += 1;
    results.push(`  ✓ ${name}`);
  } catch (err) {
    results.push(`  ✗ ${name}\n      ${err.message.split('\n').join('\n      ')}`);
    process.exitCode = 1;
  }
}
const unwrap = (r) => {
  assert.ok(r.ok, `expected ok, got error: ${r.error}`);
  return r.value;
};
const ACK = { allergens: true, foodSafety: true, terms: true, dietDifference: false };
const PAY = { providerReference: 'DEMO-TEST' };

function validDraft(startsAt) {
  return {
    title: 'Test lentil stew',
    description: 'A warm lentil stew with fresh bread for a cold evening.',
    startsAt: startsAt.toISOString(),
    durationMinutes: 120,
    neighborhood: 'Binnenstad',
    areaHint: 'Near the Grote Markt',
    privateAddress: 'Teststraat 1, Groningen',
    guestSeats: 3,
    hostEats: true,
    mealImage: { kind: 'demo', key: 'meals/grain-bowl' },
    tableImage: { kind: 'demo', key: 'tables/wooden-table' },
    menu: { mainDish: 'Lentil stew', sides: ['Bread'], dessert: '', drinks: 'Water' },
    ingredients: [
      { id: 'i1', name: 'Lentils', quantity: 100, unit: 'g', scaling: 'per_serving', estimatedCostCents: 50, allergens: [] },
      { id: 'i2', name: 'Bread', quantity: 1, unit: 'pcs', scaling: 'whole_dinner', estimatedCostCents: 300, allergens: ['gluten'] },
    ],
    diet: 'vegan',
    dietaryTags: [],
    extraAllergens: [],
    alcohol: 'alcohol_free',
    social: 'eat_meet',
    ageGroup: 'any',
    houseRules: [],
    hostCompensationCents: 100,
  };
}

// ---------------------------------------------------------------------------
test('seed: every account is an adult', () => {
  const data = createSeedData(now);
  Object.values(data.users).forEach((u) => assert.ok(now.getFullYear() - u.birthYear >= 18, u.firstName));
});

test('seed: no seeded booking conflicts with a guest allergy or exceeds capacity', () => {
  const data = createSeedData(now);
  Object.values(data.reservations).forEach((r) => {
    const compat = C.assessCompatibility(data.users[r.guestId].preferences, data.dinners[r.dinnerId]);
    assert.equal(compat.blocked, false, `${r.guestId} @ ${r.dinnerId}`);
  });
  Object.values(data.dinners).forEach((d) => assert.ok(S.seatsTaken(data, d.id) <= d.guestSeats, d.id));
});

test('seed: upcoming dinners are in the future, completed ones in the past', () => {
  const data = createSeedData(now);
  assert.ok(S.discoverableDinners(data, now).length >= 7);
  Object.values(data.dinners)
    .filter((d) => d.status === 'completed')
    .forEach((d) => assert.ok(new Date(d.startsAt) < now));
});

test('money: formatting and parsing euro amounts', () => {
  assert.equal(M.formatEUR(1050), '€10.50');
  assert.equal(M.formatEUR(5), '€0.05');
  assert.equal(M.formatEUR(123456), '€1,234.56');
  assert.equal(M.parseEuroInput('7,50'), 750);
  assert.equal(M.parseEuroInput('€ 7.5'), 750);
  assert.equal(M.parseEuroInput('-3'), null);
  assert.equal(M.parseEuroInput('abc'), null);
});

test('pricing: integer cents, transparent split, host never short', () => {
  const draft = validDraft(new Date(now.getTime() + 48 * HOUR));
  const p = P.computePricing(draft);
  // 4 servings × €0.50 + €3.00 bread = €5.00 budget
  assert.equal(p.plannedServings, 4);
  assert.equal(p.ingredientBudgetCents, 500);
  assert.equal(p.ingredientShareCents, 125);
  assert.equal(p.hostCompensationCents, 100);
  assert.equal(p.platformFeeCents, 50); // 10% of €2.25 = €0.23 → minimum €0.50
  assert.equal(p.totalPerGuestCents, 275);
  for (const seats of [1, 2, 3, 5, 7, 11]) {
    const q = P.computePricing({ ...draft, guestSeats: seats, hostCompensationCents: 175 });
    [q.ingredientShareCents, q.platformFeeCents, q.totalPerGuestCents].forEach((n) => assert.ok(Number.isInteger(n)));
    assert.equal(q.totalPerGuestCents, q.ingredientShareCents + q.hostCompensationCents + q.platformFeeCents);
    assert.ok(q.ingredientShareCents * q.plannedServings >= q.ingredientBudgetCents);
  }
});

test('pricing: host compensation and platform fee are capped', () => {
  const draft = validDraft(new Date(now.getTime() + 48 * HOUR));
  const p = P.computePricing({ ...draft, hostCompensationCents: 99999 });
  assert.equal(p.hostCompensationCents, 600);
  const big = P.computePricing({ ...draft, ingredients: [{ ...draft.ingredients[0], estimatedCostCents: 5000 }] });
  assert.equal(big.platformFeeCents, 200);
});

test('shopping list: per-serving items scale with diners, whole-dinner items do not', () => {
  const data = createSeedData(now);
  const d = data.dinners.din_risotto;
  const four = P.buildShoppingList(d, 4);
  const seven = P.buildShoppingList(d, 7);
  const rice4 = four.find((l) => l.ingredient.id === 'ris_1');
  const rice7 = seven.find((l) => l.ingredient.id === 'ris_1');
  assert.equal(rice4.quantity, 360);
  assert.equal(rice7.quantity, 630);
  assert.equal(four.find((l) => l.ingredient.id === 'ris_9').quantity, 1);
  assert.equal(seven.find((l) => l.ingredient.id === 'ris_9').quantity, 1);
  assert.equal(P.formatQuantity(1250, 'g'), '1.25 kg');
});

test('publish: rejected when the dinner starts within 24 hours', () => {
  const data = createSeedData(now);
  const r = A.publishDinner(data, 'u_marieke', validDraft(new Date(now.getTime() + 23 * HOUR)), now);
  assert.equal(r.ok, false);
  assert.match(r.error, /24 hours/);
});

test('publish: impossible values are rejected', () => {
  const data = createSeedData(now);
  const start = new Date(now.getTime() + 48 * HOUR);
  const bad = [
    { ...validDraft(start), guestSeats: 0 },
    { ...validDraft(start), guestSeats: 2.5 },
    { ...validDraft(start), title: '' },
    { ...validDraft(start), mealImage: null },
    { ...validDraft(start), ingredients: [] },
    { ...validDraft(start), ingredients: [{ ...validDraft(start).ingredients[0], estimatedCostCents: -100 }] },
    { ...validDraft(start), ingredients: [{ ...validDraft(start).ingredients[0], name: 'Dry white wine' }] },
    { ...validDraft(start), menu: { ...validDraft(start).menu, drinks: 'Red wine' } },
    { ...validDraft(start), startsAt: 'not a date' },
  ];
  bad.forEach((draft, i) => assert.equal(A.publishDinner(data, 'u_marieke', draft, now).ok, false, `case ${i}`));
});

test('publish: valid dinner gets a locked price and appears in discovery', () => {
  const data = createSeedData(now);
  const { data: next, dinnerId } = unwrap(A.publishDinner(data, 'u_marieke', validDraft(new Date(now.getTime() + 25 * HOUR)), now));
  const d = next.dinners[dinnerId];
  assert.equal(d.status, 'published');
  assert.ok(d.pricing.totalPerGuestCents > 0);
  assert.ok(S.discoverableDinners(next, now).some((x) => x.id === dinnerId));
});

test('reservation: seat count decreases and a demo contribution is recorded', () => {
  const data = createSeedData(now);
  const before = S.seatsLeft(data, data.dinners.din_risotto);
  const { data: next, reservationId } = unwrap(
    A.reserveSeat(data, { dinnerId: 'din_risotto', guestId: 'u_sofia', acknowledgements: ACK, noteToHost: '' }, PAY, now),
  );
  assert.equal(S.seatsLeft(next, next.dinners.din_risotto), before - 1);
  const c = next.contributions[next.reservations[reservationId].contributionId];
  assert.equal(c.provider, 'demo');
  assert.equal(c.status, 'demo_authorized');
  assert.equal(c.totalCents, next.dinners.din_risotto.pricing.totalPerGuestCents);
  // no double booking
  const again = A.reserveSeat(next, { dinnerId: 'din_risotto', guestId: 'u_sofia', acknowledgements: ACK, noteToHost: '' }, PAY, now);
  assert.equal(again.ok, false);
});

test('reservation: fully booked dinners cannot be overbooked', () => {
  const data = createSeedData(now);
  assert.equal(S.seatsLeft(data, data.dinners.din_salmon), 0);
  const r = A.reserveSeat(data, { dinnerId: 'din_salmon', guestId: 'u_bram', acknowledgements: ACK, noteToHost: '' }, PAY, now);
  assert.equal(r.ok, false);
  assert.match(r.error, /fully booked/);
});

test('reservation: filling the last seat flips the dinner to fully booked', () => {
  let data = createSeedData(now);
  const guests = ['u_sofia', 'u_bram', 'u_lotte', 'u_mateo'];
  guests.forEach((g) => {
    data = unwrap(A.reserveSeat(data, { dinnerId: 'din_risotto', guestId: g, acknowledgements: ACK, noteToHost: '' }, PAY, now)).data;
  });
  assert.equal(S.dinnerDisplayStatus(data, data.dinners.din_risotto, now), 'fully_booked');
  const r = A.reserveSeat(data, { dinnerId: 'din_risotto', guestId: 'u_jonas', acknowledgements: ACK, noteToHost: '' }, PAY, now);
  assert.equal(r.ok, false);
});

test('reservation: declared allergen matching a guest allergy blocks booking', () => {
  const data = createSeedData(now);
  const r = A.reserveSeat(data, { dinnerId: 'din_gadogado', guestId: 'u_sofia', acknowledgements: ACK, noteToHost: '' }, PAY, now);
  assert.equal(r.ok, false);
  assert.match(r.error, /allergen/);
});

test('reservation: diet mismatch requires explicit acknowledgement', () => {
  const data = createSeedData(now);
  const input = { dinnerId: 'din_dumplings', guestId: 'u_sofia', acknowledgements: ACK, noteToHost: '' };
  assert.equal(A.reserveSeat(data, input, PAY, now).ok, false);
  assert.ok(A.reserveSeat(data, { ...input, acknowledgements: { ...ACK, dietDifference: true } }, PAY, now).ok);
});

test('reservation: host cannot book own dinner, acknowledgements are required', () => {
  const data = createSeedData(now);
  assert.equal(A.reserveSeat(data, { dinnerId: 'din_risotto', guestId: 'u_marieke', acknowledgements: ACK, noteToHost: '' }, PAY, now).ok, false);
  assert.equal(
    A.reserveSeat(data, { dinnerId: 'din_risotto', guestId: 'u_sofia', acknowledgements: { ...ACK, terms: false }, noteToHost: '' }, PAY, now).ok,
    false,
  );
});

test('cancellation: >48h full refund, seat released', () => {
  const data = createSeedData(now);
  const { data: booked, reservationId } = unwrap(
    A.reserveSeat(data, { dinnerId: 'din_dumplings', guestId: 'u_bram', acknowledgements: ACK, noteToHost: '' }, PAY, now),
  );
  const seats = S.seatsLeft(booked, booked.dinners.din_dumplings);
  const next = unwrap(A.cancelReservation(booked, reservationId, 'u_bram', now));
  assert.equal(S.seatsLeft(next, next.dinners.din_dumplings), seats + 1);
  const c = next.contributions[next.reservations[reservationId].contributionId];
  assert.equal(c.status, 'demo_refunded');
  assert.equal(c.refundedCents, c.totalCents);
});

test('cancellation: within 48h the ingredient share is retained', () => {
  const data = createSeedData(now);
  const res = Object.values(data.reservations).find((r) => r.dinnerId === 'din_shakshuka' && r.guestId === 'u_sofia');
  const later = new Date(new Date(data.dinners.din_shakshuka.startsAt).getTime() - 10 * HOUR);
  const next = unwrap(A.cancelReservation(data, res.id, 'u_sofia', later));
  const c = next.contributions[res.contributionId];
  assert.equal(c.status, 'demo_partially_refunded');
  assert.equal(c.refundedCents, c.totalCents - c.ingredientShareCents);
  assert.equal(P.netContribution(c).ingredientCents, c.ingredientShareCents);
  assert.equal(P.netContribution(c).platformCents, 0);
});

test('reviews: blocked before attendance is confirmed, allowed after, no duplicates', () => {
  const data = createSeedData(now);
  const res = Object.values(data.reservations).find((r) => r.dinnerId === 'din_soup' && r.guestId === 'u_sofia');
  const reviewInput = { reservationId: res.id, guestId: 'u_sofia', food: { quality: 5, taste: 4, overall: 5 }, hygiene: 5, comment: 'Lovely' };
  // Dinner happened yesterday but the host has not confirmed attendance.
  const early = A.submitReview(data, reviewInput, now);
  assert.equal(early.ok, false);
  assert.match(early.error, /host confirms/);
  const before = S.hostRatings(data, 'u_marieke');
  const completed = unwrap(
    A.completeDinner(
      data,
      {
        dinnerId: 'din_soup', hostId: 'u_marieke', attendance: {}, portionsPrepared: 4, portionsServed: 4,
        leftoverPortions: 0, leftoverHandling: 'none', notes: '', estimatedBudgetCents: 1000, actualSpendCents: 950,
      },
      now,
    ),
  );
  const reviewed = unwrap(A.submitReview(completed, reviewInput, now));
  const after = S.hostRatings(reviewed, 'u_marieke');
  assert.equal(after.count, before.count + 1);
  assert.notEqual(after.food, null);
  assert.equal(A.submitReview(reviewed, reviewInput, now).ok, false);
});

test('reviews: upcoming reservations cannot be reviewed; ratings come from records', () => {
  const data = createSeedData(now);
  const res = Object.values(data.reservations).find((r) => r.dinnerId === 'din_shakshuka' && r.guestId === 'u_sofia');
  assert.equal(R.reviewEligibility(data, res, now).allowed, false);
  assert.deepEqual(S.hostRatings(data, 'u_arjun'), { count: 0, food: null, hygiene: null, quality: null, taste: null, overall: null });
  const r = S.hostRatings(data, 'u_marieke');
  assert.equal(r.count, 8);
  assert.ok(r.food >= 1 && r.food <= 5);
});

test('completion: not possible before the dinner starts', () => {
  const data = createSeedData(now);
  const r = A.completeDinner(
    data,
    {
      dinnerId: 'din_risotto', hostId: 'u_marieke', attendance: {}, portionsPrepared: 3, portionsServed: 3,
      leftoverPortions: 0, leftoverHandling: 'none', notes: '', estimatedBudgetCents: 0, actualSpendCents: null,
    },
    now,
  );
  assert.equal(r.ok, false);
});

test('host cancellation refunds every confirmed guest', () => {
  const data = createSeedData(now);
  const next = unwrap(A.cancelDinner(data, 'u_arjun', 'din_curry', now));
  assert.equal(next.dinners.din_curry.status, 'cancelled');
  S.reservationsForDinner(next, 'din_curry').forEach((r) => {
    assert.equal(r.status, 'cancelled');
    assert.equal(next.contributions[r.contributionId].refundedCents, next.contributions[r.contributionId].totalCents);
  });
});

test('filters: vegetarian + alcohol-free + Eat & Meet finds the risotto, not meat or fish', () => {
  const data = createSeedData(now);
  const list = F.applyFilters(
    data,
    S.discoverableDinners(data, now),
    { ...F.DEFAULT_FILTERS, suitableFor: 'vegetarian', alcoholFreeOnly: true, social: ['eat_meet'] },
    data.users.u_sofia.preferences,
    now,
  );
  const ids = list.map((d) => d.id);
  assert.ok(ids.includes('din_risotto'));
  assert.ok(!ids.includes('din_dumplings'));
  assert.ok(!ids.includes('din_salmon'));
  list.forEach((d) => {
    assert.equal(d.alcohol, 'alcohol_free');
    assert.equal(d.social, 'eat_meet');
  });
  const matches = F.applyFilters(data, S.discoverableDinners(data, now), { ...F.DEFAULT_FILTERS, matchesMe: true }, data.users.u_sofia.preferences, now);
  assert.ok(!matches.some((d) => d.id === 'din_gadogado'));
});

test('money: fully refunded contributions are not counted as seats', () => {
  const data = createSeedData(now);
  const all = S.contributionsForDinner(data, 'din_bowls');
  assert.equal(all.length, 1); // Sofia's cancelled, fully refunded booking
  const split = P.sumContributions(all);
  assert.equal(split.count, 0);
  assert.equal(split.totalCents, 0);
  assert.equal(split.refundedCents, all[0].totalCents);
});

test('impact: aggregates are finite and come from recorded reports', () => {
  const data = createSeedData(now);
  const impact = I.computeImpact(data, { kind: 'community' }, now);
  assert.equal(impact.totals.dinnersCompleted, Object.keys(data.reports).length);
  Object.values(impact.totals).forEach((v) => assert.ok(Number.isFinite(v)));
  assert.ok(impact.totals.upcomingFullTableServings >= impact.totals.upcomingConfirmedServings);
});

test('persistence: reservations, seats and ratings survive a save/load round trip', () => {
  const data = createSeedData(now);
  const { data: booked, reservationId } = unwrap(
    A.reserveSeat(data, { dinnerId: 'din_risotto', guestId: 'u_sofia', acknowledgements: ACK, noteToHost: 'hi' }, PAY, now),
  );
  const restored = JSON.parse(JSON.stringify(booked)); // what AsyncStorage stores and returns
  assert.equal(restored.reservations[reservationId].status, 'confirmed');
  Object.values(booked.dinners).forEach((d) => {
    assert.equal(S.seatsLeft(restored, restored.dinners[d.id]), S.seatsLeft(booked, d));
    assert.equal(S.dinnerDisplayStatus(restored, restored.dinners[d.id], now), S.dinnerDisplayStatus(booked, d, now));
  });
  Object.keys(booked.users).forEach((id) => assert.deepEqual(S.hostRatings(restored, id), S.hostRatings(booked, id)));
  assert.equal(JSON.stringify(restored), JSON.stringify(booked));
});

console.log(`\nEat&Meet domain tests\n${results.join('\n')}\n\n${passed}/${results.length} passed`);
rmSync(out, { recursive: true, force: true });
