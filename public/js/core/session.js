// Pure state changes for a workout in progress. Every function returns a new
// state and leaves the one passed in untouched.

import { exerciseById } from './exercises.js';
import { t } from './i18n.js';
import { buildPlan, isFocus, volumeFor } from './plan.js';
import { sessionSettings } from './programs.js';
import { bandCombos, labelFor, loadOf, prescribe } from './progression.js';
import { comebackLevel, lighterWeekStatus } from './recovery.js';
import { todayPlan } from './schedule.js';
import { newId } from './store.js';

const clone = (value) => structuredClone(value);

const QUICK_EXERCISES = 3;
const QUICK_SETS = 2;
const QUICK_REST = 45;
const SET_SECONDS = 40;
const MAX_SETS = 6;
const LEVEL_SETS = { beginner: 0, intermediate: 0, master: 1 };

function historyFor(workouts, exerciseId) {
  // Lighter sessions are easy on purpose, so they say nothing about progress.
  return workouts
    .filter((w) => !w.lighter)
    .flatMap((w) => w.exercises.filter((e) => e.exerciseId === exerciseId && e.sets.length));
}

function lastSetup(workouts, exerciseId) {
  for (let i = workouts.length - 1; i >= 0; i -= 1) {
    const entry = workouts[i].exercises.find((e) => e.exerciseId === exerciseId);
    if (entry?.setup) return entry.setup;
  }
  return {};
}

function easedOff(target, level, bands, range) {
  const load = loadOf(target.bandIds, bands);
  const lower = bandCombos(bands).filter((c) => c.kg < load).reverse();
  const choice = lower[level - 1] ?? lower.at(-1);
  return {
    bandIds: choice ? choice.bandIds : target.bandIds,
    repsGoal: range.min,
    note: t('Welcome back. A lighter band today, so your body can catch up.'),
  };
}

function targetFor(exerciseId, state, session) {
  const { range, lighter, comeback } = session;
  const history = historyFor(state.workouts, exerciseId);
  const target = prescribe(exerciseById(exerciseId), history, state.profile.bands, range, state.profile.level);
  if (!history.length) return target;
  if (comeback) return easedOff(target, comeback, state.profile.bands, range);
  if (lighter) {
    const last = history.at(-1).sets.at(-1);
    const owned = last.bandIds.every((id) => state.profile.bands.some((b) => b.id === id));
    return {
      bandIds: owned ? last.bandIds : target.bandIds,
      repsGoal: range.min,
      note: t('Lighter session. Same band, and stop with a few reps to spare.'),
    };
  }
  return target;
}

function chooseTemplate(state, now, customId) {
  const { profile } = state;
  const custom = customId && buildPlan({ ...profile, useCustomPlan: true }).find((p) => p.id === customId);
  if (custom?.custom) return { template: custom, oneOff: true };
  const today = todayPlan(state, now);
  if (today.kind === 'workout') return { template: today.template, oneOff: true }; // a schedule has no rotation to move
  const plan = buildPlan(profile);
  return { template: plan[profile.nextIndex % plan.length], oneOff: false };
}

/** Options: quick for the ten-minute version; customId to run a saved workout once. */
export function startSession(state, now, { quick = false, customId = null } = {}) {
  const next = clone(state);
  const { profile, workouts } = next;
  const { template, oneOff } = chooseTemplate(next, now, customId);
  const settings = sessionSettings(profile, now);
  const comeback = comebackLevel(workouts, now);
  const lighter = lighterWeekStatus(next, now).active;

  const baseSets = template.sets ?? volumeFor(profile.minutes).sets;
  const levelSets = template.sets ? 0 : LEVEL_SETS[profile.level] ?? 0; // a saved workout keeps the sets it was given
  const sets = quick ? QUICK_SETS : Math.max(1, baseSets + levelSets + settings.setsDelta - (lighter ? 1 : 0));
  const range = quick ? { ...settings.range, rest: Math.min(settings.range.rest, QUICK_REST) } : settings.range;
  const count = quick ? QUICK_EXERCISES : template.exerciseIds.length;

  const session = { range, lighter, comeback };
  next.active = {
    id: newId('workout'),
    templateId: template.id,
    name: template.name,
    startedAt: now,
    range,
    restEndsAt: null,
    ...(quick ? { quick: true } : {}),
    ...(oneOff ? { oneOff: true } : {}),
    ...(template.custom ? { custom: true } : {}),
    ...(lighter ? { lighter: true } : {}),
    ...(comeback ? { comeback } : {}),
    exercises: template.exerciseIds.slice(0, count).map((exerciseId, i) => ({
      exerciseId,
      plannedId: template.plannedIds[i],
      targetSets: !quick && !lighter && isFocus(exerciseById(exerciseId), profile.focus) ? Math.min(MAX_SETS, sets + 1) : sets,
      target: targetFor(exerciseId, next, session),
      setup: lastSetup(workouts, exerciseId),
      sets: [],
      skipped: false,
    })),
  };
  return next;
}

/** Rough length of a session, to the nearest five minutes. */
export function sessionMinutes(active) {
  const totalSets = active.exercises.reduce((sum, e) => sum + e.targetSets, 0);
  const seconds = totalSets * (SET_SECONDS + active.range.rest);
  return Math.max(5, Math.round(seconds / 300) * 5);
}

/** The set to do now, or null when the workout has no sets left. */
export function currentStep(active) {
  const exIndex = active.exercises.findIndex((e) => !e.skipped && e.sets.length < e.targetSets);
  if (exIndex === -1) return null;
  return { exIndex, setIndex: active.exercises[exIndex].sets.length };
}

export function logSet(state, { reps, bandIds, effort }, now) {
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
    ...(effort ? { effort } : {}),
  });
  active.restEndsAt = currentStep(active) ? now + active.range.rest * 1000 : null;
  return next;
}

/** Notes how the band is set up for an exercise. An empty value clears that note. */
export function setEntrySetup(state, exIndex, key, value) {
  const next = clone(state);
  const entry = next.active.exercises[exIndex];
  entry.setup ??= {};
  if (value === '' || value === null || value === undefined) delete entry.setup[key];
  else entry.setup[key] = value;
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
  const { active } = next;
  const entry = active.exercises[exIndex];
  if (entry.sets.length) return next;
  if (!active.custom) next.profile.swaps[entry.plannedId] = newExerciseId; // saved workouts keep their list
  entry.exerciseId = newExerciseId;
  entry.target = targetFor(newExerciseId, next, active);
  entry.setup = lastSetup(next.workouts, newExerciseId);
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
    ...(active.quick ? { quick: true } : {}),
    ...(active.lighter ? { lighter: true } : {}),
    ...(active.comeback ? { comeback: active.comeback } : {}),
    exercises: done.map((e) => ({
      exerciseId: e.exerciseId,
      sets: e.sets,
      ...(Object.keys(e.setup ?? {}).length ? { setup: e.setup } : {}),
    })),
  };
  next.workouts.push(workout);
  if (!active.oneOff) next.profile.nextIndex += 1;
  return { state: next, workout };
}
