import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, repRange, volumeFor, swapOptions, nextTemplate } from '../public/js/core/plan.js';
import { EXERCISES, exerciseById } from '../public/js/core/exercises.js';

const profile = (over = {}) => ({
  goal: 'muscle', daysPerWeek: 3, minutes: 30, hasAnchor: false, hasMini: false,
  bands: [], swaps: {}, nextIndex: 0, ...over,
});

test('three days a week rotates three full-body workouts', () => {
  const plan = buildPlan(profile({ daysPerWeek: 3 }));
  assert.deepEqual(plan.map((t) => t.name), ['Full body A', 'Full body B', 'Full body C']);
});

test('two days a week rotates two full-body workouts', () => {
  assert.equal(buildPlan(profile({ daysPerWeek: 2 })).length, 2);
});

test('four days a week splits upper and lower body', () => {
  const plan = buildPlan(profile({ daysPerWeek: 4, minutes: 45 }));
  assert.deepEqual(plan.map((t) => t.name), ['Upper body A', 'Lower body A', 'Upper body B', 'Lower body B']);
});

test('without a door anchor or mini loop the plan needs neither', () => {
  for (const daysPerWeek of [2, 3, 4]) {
    for (const t of buildPlan(profile({ daysPerWeek, minutes: 45 }))) {
      for (const id of t.exerciseIds) {
        assert.equal(exerciseById(id).anchor ?? null, null, `${id} needs an anchor`);
        assert.notEqual(exerciseById(id).mini, true, `${id} needs a mini loop`);
      }
    }
  }
});

test('owning a door anchor brings anchored exercises into the plan', () => {
  const ids = buildPlan(profile({ hasAnchor: true, minutes: 45 })).flatMap((t) => t.exerciseIds);
  assert.ok(ids.some((id) => exerciseById(id).anchor));
});

test('no workout repeats an exercise for any setup and length', () => {
  for (const daysPerWeek of [2, 3, 4]) for (const minutes of [20, 30, 45]) for (const hasAnchor of [true, false]) for (const hasMini of [true, false]) {
    for (const t of buildPlan(profile({ daysPerWeek, minutes, hasAnchor, hasMini }))) {
      assert.equal(new Set(t.exerciseIds).size, t.exerciseIds.length, `${t.name} repeats: ${t.exerciseIds}`);
    }
  }
});

test('session length sets exercise count and sets', () => {
  assert.deepEqual(volumeFor(20), { exercises: 5, sets: 2 });
  assert.deepEqual(volumeFor(30), { exercises: 6, sets: 3 });
  assert.deepEqual(volumeFor(45), { exercises: 8, sets: 3 });
  for (const minutes of [20, 30, 45]) {
    for (const t of buildPlan(profile({ minutes, hasAnchor: true, hasMini: true }))) {
      assert.equal(t.exerciseIds.length, volumeFor(minutes).exercises, t.name);
    }
  }
});

test('goals set rep range and rest', () => {
  assert.deepEqual(repRange('strength'), { min: 6, max: 10, rest: 120 });
  assert.deepEqual(repRange('muscle'), { min: 8, max: 15, rest: 75 });
  assert.deepEqual(repRange('endurance'), { min: 15, max: 25, rest: 45 });
});

test('a saved swap replaces the exercise in the plan', () => {
  const base = buildPlan(profile())[0].exerciseIds;
  const planned = base[0];
  const replacement = swapOptions(planned, profile())[0].id;
  const swapped = buildPlan(profile({ swaps: { [planned]: replacement } }))[0].exerciseIds;
  assert.equal(swapped[0], replacement);
});

test('a swap to equipment the person no longer has is ignored', () => {
  const planned = buildPlan(profile())[0].exerciseIds[2];
  const swapped = buildPlan(profile({ swaps: { [planned]: 'pulldown' } }))[0].exerciseIds;
  assert.equal(swapped[2], planned);
});

test('swap options share a movement pattern, respect equipment and exclude the exercise', () => {
  const options = swapOptions('seated-row', profile());
  assert.ok(options.length > 0);
  for (const o of options) {
    assert.equal(o.pattern, exerciseById('seated-row').pattern);
    assert.notEqual(o.id, 'seated-row');
    assert.equal(o.anchor ?? null, null);
  }
});

test('next workout follows the rotation and wraps around', () => {
  assert.equal(nextTemplate(profile({ nextIndex: 0 })).name, 'Full body A');
  assert.equal(nextTemplate(profile({ nextIndex: 2 })).name, 'Full body C');
  assert.equal(nextTemplate(profile({ nextIndex: 3 })).name, 'Full body A');
});

test('every exercise has complete instructions and two poses', () => {
  const ids = new Set();
  for (const e of EXERCISES) {
    assert.ok(!ids.has(e.id), `duplicate ${e.id}`);
    ids.add(e.id);
    for (const key of ['name', 'pattern', 'muscles', 'setup', 'tier']) assert.ok(e[key], `${e.id} missing ${key}`);
    assert.ok(e.cues.length >= 2, `${e.id} needs cues`);
    assert.equal(e.poses.length, 2, `${e.id} needs two poses`);
    assert.ok(['light', 'medium', 'heavy'].includes(e.tier), e.id);
  }
  assert.ok(EXERCISES.length >= 24);
});
