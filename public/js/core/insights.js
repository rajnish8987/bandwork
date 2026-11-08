// What the training history says: work per muscle, balance, records and streaks.

import { exerciseById } from './exercises.js';
import { weekStart } from './stats.js';

const DAY = 86400000;

/** Muscles in display order, with the phrase to show. */
export const MUSCLES = [
  { id: 'chest', name: 'Chest' },
  { id: 'back', name: 'Back' },
  { id: 'shoulders', name: 'Shoulders' },
  { id: 'biceps', name: 'Biceps' },
  { id: 'triceps', name: 'Triceps' },
  { id: 'thighs', name: 'Thighs' },
  { id: 'hamstrings', name: 'Hamstrings and glutes' },
  { id: 'calves', name: 'Calves' },
  { id: 'core', name: 'Core' },
];

// A set counts fully for the main muscle and half for muscles that help.
const WORK = {
  squat: { thighs: 1, hamstrings: 0.5 },
  hinge: { hamstrings: 1 },
  glute: { hamstrings: 1 },
  calf: { calves: 1 },
  hpush: { chest: 1, shoulders: 0.5, triceps: 0.5 },
  vpush: { shoulders: 1, triceps: 0.5 },
  shoulder: { shoulders: 1 },
  triceps: { triceps: 1 },
  hpull: { back: 1, biceps: 0.5 },
  vpull: { back: 1, biceps: 0.5 },
  rear: { back: 0.5, shoulders: 0.5 },
  biceps: { biceps: 1 },
  core: { core: 1 },
};

/** The muscles a movement pattern mainly trains. */
export function MAIN_WORK(pattern) {
  return Object.entries(WORK[pattern] ?? {}).filter(([, share]) => share === 1).map(([muscle]) => muscle);
}

const PUSH = new Set(['hpush', 'vpush']);
const PULL = new Set(['hpull', 'vpull', 'rear']);
const KNEE = new Set(['squat']);
const HINGE = new Set(['hinge', 'glute']);
const MIN_SETS_TO_JUDGE = 12;
const LOW_SHARE = 0.6;
const MAIN_MUSCLES = ['chest', 'back', 'shoulders', 'thighs', 'hamstrings'];

function patternOf(entry) {
  return exerciseById(entry.exerciseId)?.pattern;
}

function within(workouts, now, days) {
  return workouts.filter((w) => w.finishedAt > now - days * DAY && w.finishedAt <= now);
}

function muscleTotals(workouts) {
  const totals = Object.fromEntries(MUSCLES.map((m) => [m.id, 0]));
  for (const w of workouts) {
    for (const entry of w.exercises) {
      const work = WORK[patternOf(entry)] ?? {};
      for (const [muscle, share] of Object.entries(work)) totals[muscle] += share * entry.sets.length;
    }
  }
  return totals;
}

/** Sets for each muscle over the last seven days. */
export function weeklyMuscleSets(workouts, now) {
  const totals = muscleTotals(within(workouts, now, 7));
  return MUSCLES.map((m) => ({ ...m, sets: totals[m.id] }));
}

function setsIn(workouts, patterns) {
  return workouts.flatMap((w) => w.exercises).filter((e) => patterns.has(patternOf(e))).reduce((sum, e) => sum + e.sets.length, 0);
}

function compare(a, b, lowA, lowB, warnings) {
  if (a + b < MIN_SETS_TO_JUDGE) return;
  if (a < b * LOW_SHARE) warnings.push({ id: lowA, have: a, against: b });
  else if (b < a * LOW_SHARE) warnings.push({ id: lowB, have: b, against: a });
}

/** Imbalances worth mentioning, judged over the last four weeks. */
export function balanceWarnings(workouts, now) {
  const month = within(workouts, now, 28);
  const warnings = [];
  compare(setsIn(month, PULL), setsIn(month, PUSH), 'pull-low', 'push-low', warnings);
  compare(setsIn(month, HINGE), setsIn(month, KNEE), 'hinge-low', 'knee-low', warnings);

  const fortnight = within(workouts, now, 14);
  if (fortnight.length >= 4) {
    const totals = muscleTotals(fortnight);
    for (const muscle of MAIN_MUSCLES) {
      if (totals[muscle] === 0) warnings.push({ id: 'neglected', muscle });
    }
  }
  return warnings;
}

const beats = (a, b) => a.kg > b.kg || (a.kg === b.kg && a.reps > b.reps);

function bestSet(sets) {
  return sets.filter((s) => s.reps > 0).reduce((best, s) => (!best || beats(s, best) ? s : best), null);
}

/** The best set ever for each exercise, most recently set first. */
export function personalRecords(workouts) {
  const best = new Map();
  for (const w of [...workouts].sort((a, b) => a.finishedAt - b.finishedAt)) {
    for (const entry of w.exercises) {
      const top = bestSet(entry.sets);
      if (!top) continue;
      const held = best.get(entry.exerciseId);
      if (!held || beats(top, held)) {
        best.set(entry.exerciseId, { exerciseId: entry.exerciseId, kg: top.kg, reps: top.reps, label: top.label, at: w.finishedAt });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.at - a.at);
}

/** Records broken in this workout. Doing an exercise for the first time is not a record. */
export function newRecords(workout, workouts) {
  const earlier = workouts.filter((w) => w.finishedAt < workout.finishedAt);
  const held = new Map(personalRecords(earlier).map((r) => [r.exerciseId, r]));
  const found = [];
  for (const entry of workout.exercises) {
    const top = bestSet(entry.sets);
    const before = held.get(entry.exerciseId);
    if (top && before && beats(top, before)) {
      found.push({ exerciseId: entry.exerciseId, kg: top.kg, reps: top.reps, label: top.label });
    }
  }
  return found;
}

/**
 * Weeks in a row that reached the target. The week in progress adds to the streak
 * once reached and cannot break it, so one missed day never resets anything.
 */
export function weekStreak(workouts, target, now) {
  if (!workouts.length) return { current: 0, best: 0 };
  const counts = new Map();
  for (const w of workouts) {
    const week = weekStart(w.finishedAt);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  const hit = (time) => (counts.get(time) ?? 0) >= target;

  const thisWeek = weekStart(now);
  const first = Math.min(...counts.keys());
  let best = 0;
  let run = 0;
  for (const cursor = new Date(first); cursor.getTime() <= thisWeek; cursor.setDate(cursor.getDate() + 7)) {
    if (hit(cursor.getTime())) {
      run += 1;
      best = Math.max(best, run);
    } else if (cursor.getTime() !== thisWeek) {
      run = 0;
    }
  }
  return { current: run, best };
}
