import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  startSession, currentStep, logSet, undoLastSet, skipExercise, finishSession, swapInSession, addRest, skipRest,
} from '../public/js/core/session.js';
import { defaultState } from '../public/js/core/store.js';

const NOW = 1_800_000_000_000;

function ready(over = {}) {
  const s = defaultState();
  s.profile = { ...s.profile, onboarded: true, minutes: 20, ...over };
  return s;
}

test('starting builds the next workout with targets', () => {
  const s = startSession(ready(), NOW);
  assert.equal(s.active.name, 'Full body A');
  assert.equal(s.active.exercises.length, 5);
  assert.equal(s.active.exercises[0].targetSets, 2);
  assert.ok(s.active.exercises[0].target.bandIds.length > 0);
  assert.deepEqual(currentStep(s.active), { exIndex: 0, setIndex: 0 });
});

test('starting does not change the state passed in', () => {
  const s = ready();
  startSession(s, NOW);
  assert.equal(s.active, null);
});

test('logging a set moves to the next set and starts rest', () => {
  let s = startSession(ready(), NOW);
  const bandId = s.profile.bands[0].id;
  s = logSet(s, { reps: 10, bandIds: [bandId] }, NOW);
  assert.deepEqual(currentStep(s.active), { exIndex: 0, setIndex: 1 });
  assert.equal(s.active.restEndsAt, NOW + 75_000);
  const saved = s.active.exercises[0].sets[0];
  assert.equal(saved.reps, 10);
  assert.equal(saved.kg, s.profile.bands[0].kg);
  assert.equal(saved.label, s.profile.bands[0].name);
  assert.deepEqual(saved.colors, [s.profile.bands[0].color]);
});

test('the last set of an exercise moves to the next exercise', () => {
  let s = startSession(ready(), NOW);
  const b = s.profile.bands[0].id;
  s = logSet(s, { reps: 10, bandIds: [b] }, NOW);
  s = logSet(s, { reps: 10, bandIds: [b] }, NOW + 1);
  assert.deepEqual(currentStep(s.active), { exIndex: 1, setIndex: 0 });
});

test('the final set leaves no step and no rest', () => {
  let s = startSession(ready(), NOW);
  const b = s.profile.bands[0].id;
  let t = NOW;
  while (currentStep(s.active)) s = logSet(s, { reps: 10, bandIds: [b] }, ++t);
  assert.equal(currentStep(s.active), null);
  assert.equal(s.active.restEndsAt, null);
});

test('undo removes the most recent set and returns to it', () => {
  let s = startSession(ready(), NOW);
  const b = s.profile.bands[0].id;
  s = logSet(s, { reps: 10, bandIds: [b] }, NOW);
  s = logSet(s, { reps: 9, bandIds: [b] }, NOW + 1);
  const { state, undone } = undoLastSet(s);
  assert.equal(undone.reps, 9);
  assert.deepEqual(currentStep(state.active), { exIndex: 0, setIndex: 1 });
  assert.equal(state.active.restEndsAt, null);
});

test('undo with nothing logged changes nothing', () => {
  const s = startSession(ready(), NOW);
  const { state, undone } = undoLastSet(s);
  assert.equal(undone, null);
  assert.deepEqual(currentStep(state.active), { exIndex: 0, setIndex: 0 });
});

test('skipping an exercise moves on and clears rest', () => {
  let s = startSession(ready(), NOW);
  s = skipExercise(s, 0);
  assert.deepEqual(currentStep(s.active), { exIndex: 1, setIndex: 0 });
});

test('adding rest extends the timer and skipping ends it', () => {
  let s = startSession(ready(), NOW);
  s = logSet(s, { reps: 10, bandIds: [s.profile.bands[0].id] }, NOW);
  s = addRest(s, 15);
  assert.equal(s.active.restEndsAt, NOW + 90_000);
  s = skipRest(s);
  assert.equal(s.active.restEndsAt, null);
});

test('finishing saves the workout, advances the rotation and leaves skipped exercises out', () => {
  let s = startSession(ready(), NOW);
  const b = s.profile.bands[0].id;
  s = logSet(s, { reps: 10, bandIds: [b] }, NOW);
  s = skipExercise(s, 1);
  const { state, workout } = finishSession(s, NOW + 600_000);
  assert.equal(state.active, null);
  assert.equal(state.workouts.length, 1);
  assert.equal(state.profile.nextIndex, 1);
  assert.equal(workout.exercises.length, 1);
  assert.equal(workout.finishedAt, NOW + 600_000);
});

test('finishing with no sets logged saves nothing and keeps the rotation', () => {
  const s = startSession(ready(), NOW);
  const { state, workout } = finishSession(s, NOW + 1000);
  assert.equal(workout, null);
  assert.equal(state.workouts.length, 0);
  assert.equal(state.profile.nextIndex, 0);
  assert.equal(state.active, null);
});

test('swapping replaces the exercise, re-targets it and remembers the choice', () => {
  let s = startSession(ready(), NOW);
  const planned = s.active.exercises[0].exerciseId;
  s = swapInSession(s, 0, 'split-squat');
  assert.equal(s.active.exercises[0].exerciseId, 'split-squat');
  assert.equal(s.profile.swaps[planned], 'split-squat');
});

test('swapping refuses an exercise that already has sets', () => {
  let s = startSession(ready(), NOW);
  s = logSet(s, { reps: 10, bandIds: [s.profile.bands[0].id] }, NOW);
  const after = swapInSession(s, 0, 'split-squat');
  assert.notEqual(after.active.exercises[0].exerciseId, 'split-squat');
});

test('the next session follows progress from the last one', () => {
  let s = startSession(ready(), NOW);
  const ex = s.active.exercises[0];
  const start = ex.target.bandIds;
  let t = NOW;
  s = logSet(s, { reps: 15, bandIds: start }, ++t);
  s = logSet(s, { reps: 15, bandIds: start }, ++t);
  s = finishSession(s, ++t).state;
  s.profile.nextIndex = 0;
  s = startSession(s, ++t);
  const next = s.active.exercises[0];
  assert.equal(next.exerciseId, ex.exerciseId);
  assert.notDeepEqual(next.target.bandIds, start);
  assert.equal(next.target.repsGoal, 8);
});
