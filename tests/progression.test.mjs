import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandCombos, prescribe, loadOf, labelFor } from '../public/js/core/progression.js';

const bands = [
  { id: 'y', name: 'Yellow', color: '#F5C518', kg: 5 },
  { id: 'r', name: 'Red', color: '#D92D20', kg: 10 },
  { id: 'b', name: 'Blue', color: '#1F5FD6', kg: 15 },
  { id: 'g', name: 'Green', color: '#147F45', kg: 20 },
];
const range = { min: 8, max: 15, rest: 75 };
const medium = { tier: 'medium' };
const session = (bandIds, ...reps) => ({ sets: reps.map((r) => ({ reps: r, bandIds })) });
const go = (history, exercise = medium, owned = bands) => prescribe(exercise, history, owned, range);

test('band combinations are ordered by tension and prefer fewer bands on a tie', () => {
  const combos = bandCombos(bands);
  const totals = combos.map((c) => c.kg);
  assert.deepEqual(totals, [...totals].sort((a, b) => a - b));
  assert.deepEqual(combos[0].bandIds, ['y']);
  assert.deepEqual(combos.find((c) => c.kg === 15).bandIds, ['b']);
  assert.equal(new Set(totals).size, totals.length);
});

test('band combinations never stack more than three bands', () => {
  assert.ok(bandCombos(bands).every((c) => c.bandIds.length <= 3));
  assert.equal(bandCombos(bands).at(-1).kg, 45); // r + b + g, not all four
});

test('first time starts lightest for small muscles', () => {
  const p = go([], { tier: 'light' });
  assert.deepEqual(p.bandIds, ['y']);
  assert.equal(p.repsGoal, 8);
  assert.match(p.note, /first/i);
});

test('first time starts heavier for big muscles than for small ones', () => {
  const heavy = loadOf(go([], { tier: 'heavy' }).bandIds, bands);
  const med = loadOf(go([], { tier: 'medium' }).bandIds, bands);
  const light = loadOf(go([], { tier: 'light' }).bandIds, bands);
  assert.ok(light < med && med < heavy, `${light} ${med} ${heavy}`);
});

test('hitting the top of the range on every set moves to the next band', () => {
  const p = go([session(['r'], 15, 15, 16)]);
  assert.deepEqual(p.bandIds, ['b']);
  assert.equal(p.repsGoal, 8);
  assert.match(p.note, /Blue/);
});

test('moving up can stack bands to reach the next tension', () => {
  const p = go([session(['g'], 15, 15)]);
  assert.deepEqual(p.bandIds, ['y', 'g']);
  assert.equal(p.repsGoal, 8);
});

test('at the strongest combination it asks for a slower lowering', () => {
  const single = [bands[0]];
  const p = go([session(['y'], 15, 15)], medium, single);
  assert.deepEqual(p.bandIds, ['y']);
  assert.equal(p.repsGoal, 15);
  assert.match(p.note, /slow/i);
});

test('reps inside the range ask for one more than the weakest set', () => {
  const p = go([session(['r'], 12, 11, 10)]);
  assert.deepEqual(p.bandIds, ['r']);
  assert.equal(p.repsGoal, 11);
  assert.match(p.note, /^Aim for 11 reps on every set/);
});

test('the goal never exceeds the top of the range', () => {
  assert.equal(go([session(['r'], 15, 15, 14, 15)]).repsGoal, 15);
});

test('one session under the range repeats the same band', () => {
  const p = go([session(['r'], 6, 5)]);
  assert.deepEqual(p.bandIds, ['r']);
  assert.equal(p.repsGoal, 8);
});

test('two sessions in a row under the range drop to a lighter band', () => {
  const p = go([session(['r'], 6, 5), session(['r'], 7, 6)]);
  assert.deepEqual(p.bandIds, ['y']);
  assert.equal(p.repsGoal, 8);
  assert.match(p.note, /Yellow/);
});

test('under the range on the lightest band stays there', () => {
  const p = go([session(['y'], 6, 5), session(['y'], 7, 6)]);
  assert.deepEqual(p.bandIds, ['y']);
});

test('a deleted band falls back to the closest tension still owned', () => {
  const p = go([{ sets: [{ reps: 10, bandIds: ['gone'], kg: 14 }] }]);
  assert.deepEqual(p.bandIds, ['b']);
});

test('only the last set of a session sets the band to follow', () => {
  const p = go([{ sets: [{ reps: 12, bandIds: ['b'] }, { reps: 12, bandIds: ['r'] }] }]);
  assert.deepEqual(p.bandIds, ['r']);
});

test('a set with no band is labelled as such', () => {
  assert.equal(labelFor([], bands), 'No band');
});

test('no bands returns no prescription bands instead of crashing', () => {
  assert.deepEqual(go([], medium, []).bandIds, []);
});
