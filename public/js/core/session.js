// Pure state changes for a workout in progress. Every function returns a new
// state and leaves the one passed in untouched.

import { exerciseById } from './exercises.js';
import { buildPlan, repRange, volumeFor } from './plan.js';
import { labelFor, loadOf, prescribe } from './progression.js';
import { newId } from './store.js';

const clone = (value) => structuredClone(value);

function historyFor(workouts, exerciseId) {
  return workouts.flatMap((w) => w.exercises.filter((e) => e.exerciseId === exerciseId && e.sets.length));
}

function targetFor(exerciseId, state, range) {
  return prescribe(exerciseById(exerciseId), historyFor(state.workouts, exerciseId), state.profile.bands, range);
}

export function startSession(state, now) {
  const next = clone(state);
  const plan = buildPlan(next.profile);
  const template = plan[next.profile.nextIndex % plan.length];
  const range = repRange(next.profile.goal);
  const { sets } = volumeFor(next.profile.minutes);
  next.active = {
    id: newId('workout'),
    templateId: template.id,
    name: template.name,
    startedAt: now,
    range,
    restEndsAt: null,
    exercises: template.exerciseIds.map((exerciseId, i) => ({
      exerciseId,
      plannedId: template.plannedIds[i],
      targetSets: sets,
      target: targetFor(exerciseId, next, range),
      sets: [],
      skipped: false,
    })),
  };
  return next;
}

/** The set to do now, or null when the workout has no sets left. */
export function currentStep(active) {
  const exIndex = active.exercises.findIndex((e) => !e.skipped && e.sets.length < e.targetSets);
  if (exIndex === -1) return null;
  return { exIndex, setIndex: active.exercises[exIndex].sets.length };
}

export function logSet(state, { reps, bandIds }, now) {
  const next = clone(state);
  const { active, profile } = next;
  const step = currentStep(active);
  if (!step) return next;
  active.exercises[step.exIndex].sets.push({
    reps,
    bandIds,
    kg: loadOf(bandIds, profile.bands),
    label: labelFor(bandIds, profile.bands),
    colors: bandIds.map((id) => profile.bands.find((b) => b.id === id)?.color).filter(Boolean),
    at: now,
  });
  active.restEndsAt = currentStep(active) ? now + active.range.rest * 1000 : null;
  return next;
}

export function undoLastSet(state) {
  const next = clone(state);
  let latest = null;
  for (const ex of next.active.exercises) {
    const last = ex.sets.at(-1);
    if (last && (!latest || last.at > latest.set.at)) latest = { ex, set: last };
  }
  if (!latest) return { state: next, undone: null };
  latest.ex.sets.pop();
  latest.ex.skipped = false;
  next.active.restEndsAt = null;
  return { state: next, undone: latest.set };
}

export function skipExercise(state, exIndex) {
  const next = clone(state);
  next.active.exercises[exIndex].skipped = true;
  next.active.restEndsAt = null;
  return next;
}

export function addRest(state, seconds) {
  const next = clone(state);
  if (next.active.restEndsAt) next.active.restEndsAt += seconds * 1000;
  return next;
}

export function skipRest(state) {
  const next = clone(state);
  next.active.restEndsAt = null;
  return next;
}

export function swapInSession(state, exIndex, newExerciseId) {
  const next = clone(state);
  const entry = next.active.exercises[exIndex];
  if (entry.sets.length) return next;
  next.profile.swaps[entry.plannedId] = newExerciseId;
  entry.exerciseId = newExerciseId;
  entry.target = targetFor(newExerciseId, next, next.active.range);
  return next;
}

/** Ends the workout. A workout with no sets logged is dropped, not saved. */
export function finishSession(state, now) {
  const next = clone(state);
  const { active } = next;
  next.active = null;
  const done = active.exercises.filter((e) => e.sets.length);
  if (!done.length) return { state: next, workout: null };
  const workout = {
    id: active.id,
    templateId: active.templateId,
    name: active.name,
    startedAt: active.startedAt,
    finishedAt: now,
    exercises: done.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets })),
  };
  next.workouts.push(workout);
  next.profile.nextIndex += 1;
  return { state: next, workout };
}
