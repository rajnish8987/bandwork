// The 12 week band track: fixed workouts for each day, from beginner to advanced. It
// follows the 12-Week Resistance Band Training Program by Fitness My Life on YouTube,
// and the video for each week is in core/specials.js.

import { resolveSlot } from './plan.js';

export const TRACK_ID = 'band-12';

const DAY = 86400000;
const WEEK = 7 * DAY;

/* ---------- Exercises for each workout, with a choice for people without a door anchor ---------- */

const BASICS = [['door-press', 'wrap-press'], ['overhead-press'], ['pulldown', 'overhead-pull-apart'], ['pressdown', 'overhead-triceps'], ['curl'], ['squat'], ['seated-calf'], ['kneeling-crunch', 'crunch']];
const FULL_12 = [['incline-press', 'wrap-press'], ['chest-fly', 'push-up'], ['side-front-raise'], ['reverse-fly', 'bent-reverse-fly'], ['straight-arm-pulldown', 'overhead-pull-apart'], ['seated-row'], ['overhead-triceps'], ['hammer-curl'], ['preacher-curl', 'concentration-curl'], ['lunge'], ['deadlift'], ['reverse-crunch']];
const CIRCUIT = [['push-up'], ['front-raise'], ['overhead-press'], ['lateral-raise'], ['bent-reverse-fly'], ['bent-row'], ['diamond-push-up'], ['curl'], ['reverse-curl'], ['squat'], ['seated-calf'], ['russian-twist']];
const NEGATIVES = [['incline-press', 'wrap-press'], ['chest-fly', 'push-up'], ['overhead-press'], ['side-front-raise'], ['pressdown', 'overhead-triceps'], ['pulldown', 'overhead-pull-apart'], ['seated-row'], ['curl'], ['preacher-curl', 'concentration-curl'], ['squat'], ['lunge'], ['reverse-crunch']];
const UPPER = [['incline-press', 'wrap-press'], ['door-press', 'push-up'], ['arnold-press'], ['face-pull', 'pull-apart'], ['shrug'], ['pulldown', 'overhead-pull-apart'], ['behind-back-curl', 'hammer-curl'], ['reverse-curl'], ['overhead-triceps'], ['kneeling-crunch', 'crunch']];
const LOWER = [['squat'], ['lunge'], ['deadlift'], ['donkey-kick'], ['leg-press'], ['bulgarian-squat'], ['goblet-squat'], ['seated-calf']];
const HEAVY_UPPER = [['door-press', 'wrap-press'], ['incline-press', 'push-up'], ['chest-fly', 'diamond-push-up'], ['overhead-press'], ['reverse-fly', 'bent-reverse-fly'], ['pulldown', 'overhead-pull-apart'], ['bent-row'], ['pressdown', 'overhead-triceps'], ['behind-back-curl', 'hammer-curl'], ['reverse-crunch']];
const HEAVY_LOWER = [['squat'], ['deadlift'], ['lunge'], ['donkey-kick'], ['calf-raise']];
const FAILURE_LOWER = [['squat'], ['goblet-squat'], ['deadlift'], ['donkey-kick'], ['leg-press'], ['bulgarian-squat'], ['seated-calf']];
const PUSH = [['door-press', 'wrap-press'], ['incline-press', 'push-up'], ['decline-press', 'diamond-push-up'], ['overhead-press'], ['lateral-raise'], ['pressdown', 'overhead-triceps'], ['overhead-triceps'], ['kickback']];
const PULL = [['pulldown', 'overhead-pull-apart'], ['seated-row'], ['pull-through', 'good-morning'], ['bent-reverse-fly'], ['upright-row'], ['shrug'], ['behind-back-curl', 'curl'], ['reverse-curl']];
const LEGS = [['squat'], ['lunge'], ['deadlift'], ['donkey-kick'], ['goblet-squat'], ['seated-calf'], ['reverse-crunch']];

const PYRAMID = [12, 10, 8];
const LONG_PYRAMID = [12, 10, 8, 6];
const HEAVY = [10, 8, 6];
const TO_FAILURE = [10, 8, 8];
const STANDARD_REST = 60;
const HEAVY_REST = 90;

/* ---------- The weeks. Days use 0 for Sunday, as JavaScript does. ---------- */

const PLANS = {
  w1: {
    method: 'pyramid',
    days: { 1: 'a', 3: 'a', 5: 'b', 0: 'cardio' },
    workouts: {
      a: { name: 'The 8 basics', slots: BASICS, scheme: PYRAMID, rest: STANDARD_REST },
      b: { name: 'The 8 basics, longer', slots: BASICS, scheme: LONG_PYRAMID, rest: STANDARD_REST },
    },
  },
  w2: {
    method: 'pyramid',
    days: { 1: 'a', 3: 'a', 5: 'a', 0: 'cardio' },
    workouts: { a: { name: 'Full body, 12 exercises', slots: FULL_12, scheme: PYRAMID, rest: STANDARD_REST } },
  },
  w3: {
    method: 'circuit',
    days: { 1: 'a', 3: 'a', 5: 'a' },
    workouts: { a: { name: 'Full body circuit', slots: CIRCUIT, scheme: PYRAMID, rest: STANDARD_REST } },
  },
  w4: {
    method: 'negative',
    days: { 1: 'a', 3: 'a', 5: 'a', 0: 'a' },
    workouts: { a: { name: 'Slow negatives', slots: NEGATIVES, scheme: PYRAMID, rest: STANDARD_REST } },
  },
  w5: {
    method: 'pyramid',
    days: { 1: 'upper', 2: 'lower', 4: 'upper', 5: 'lower', 0: 'cardio' },
    workouts: {
      upper: { name: 'Upper body', slots: UPPER, scheme: PYRAMID, rest: STANDARD_REST },
      lower: { name: 'Lower body', slots: LOWER, scheme: PYRAMID, rest: STANDARD_REST },
    },
  },
  w6: {
    method: 'heavy',
    days: { 1: 'upper', 2: 'lower', 4: 'upper', 5: 'lower', 0: 'cardio' },
    workouts: {
      upper: { name: 'Upper body, heavy', slots: HEAVY_UPPER, scheme: HEAVY, rest: HEAVY_REST },
      lower: { name: 'Lower body, heavy', slots: HEAVY_LOWER, scheme: HEAVY, rest: HEAVY_REST },
    },
  },
  w7: {
    method: 'failure',
    days: { 1: 'upper', 2: 'lower', 4: 'upper', 5: 'lower', 0: 'cardio' },
    workouts: {
      upper: { name: 'Upper body to failure', slots: UPPER, scheme: TO_FAILURE, rest: HEAVY_REST },
      lower: { name: 'Lower body to failure', slots: FAILURE_LOWER, scheme: TO_FAILURE, rest: HEAVY_REST },
    },
  },
  w9: {
    method: 'pyramid',
    cycle: ['push', 'pull', 'legs', null], // three days on and one off, so the days move each week
    workouts: {
      push: { name: 'Push', slots: PUSH, scheme: LONG_PYRAMID, rest: HEAVY_REST },
      pull: { name: 'Pull', slots: PULL, scheme: LONG_PYRAMID, rest: HEAVY_REST },
      legs: { name: 'Legs', slots: LEGS, scheme: LONG_PYRAMID, rest: HEAVY_REST },
    },
  },
};

export const TRACK = {
  id: TRACK_ID,
  name: '12 week band track',
  summary: 'Workouts, days, sets and reps are set for you each week, from beginner to advanced.',
  phases: [
    { name: 'Learn the basics', weeks: 1, goal: 'muscle', setsDelta: 0, plan: 'w1', stage: 'beginner' },
    { name: 'More exercises', weeks: 1, goal: 'muscle', setsDelta: 0, plan: 'w2', stage: 'beginner' },
    { name: 'Circuit training', weeks: 1, goal: 'muscle', setsDelta: 0, plan: 'w3', stage: 'beginner' },
    { name: 'Slow negatives', weeks: 1, goal: 'muscle', setsDelta: 0, plan: 'w4', stage: 'beginner' },
    { name: 'Upper and lower split', weeks: 1, goal: 'muscle', setsDelta: 0, plan: 'w5', stage: 'intermediate' },
    { name: 'Upper and lower, heavy', weeks: 1, goal: 'strength', setsDelta: 0, plan: 'w6', stage: 'intermediate' },
    { name: 'Upper and lower to failure', weeks: 2, goal: 'muscle', setsDelta: 0, plan: 'w7', stage: 'intermediate' },
    { name: 'Push, pull and legs', weeks: 4, goal: 'muscle', setsDelta: 0, plan: 'w9', stage: 'advanced' },
  ],
};

/** The first week of each stage, for starting part of the way through. */
export const STAGE_START = { beginner: 1, intermediate: 5, advanced: 9 };

/** What each way of training asks for during a set, and on the Today screen. */
export const METHOD_NOTES = {
  pyramid: 'Reps drop each set. Go up a band as they drop, if your form holds.',
  circuit: 'Go straight from one exercise to the next. Rest one minute after each round.',
  negative: 'Lift for 1 second, hold for 1 second, then lower for 3 seconds.',
  heavy: 'Use the strongest band you can control. Clean reps matter more than how many.',
  failure: 'On the last set, keep going until you cannot do one more clean rep.',
};

/** Every workout name in the track, for translation. */
export const TRACK_WORKOUT_NAMES = Object.values(PLANS).flatMap((plan) => Object.values(plan.workouts).map((w) => w.name));

/** A week of the track, or null if the number is outside it. */
function phaseOfWeek(week) {
  let seen = 0;
  for (const phase of TRACK.phases) {
    if (week <= seen + phase.weeks) return { phase, firstWeek: seen + 1 };
    seen += phase.weeks;
  }
  return null;
}

/** The chosen key for a day: a workout, 'cardio', or null for rest. */
function keyForDay(plan, week, firstWeek, day) {
  if (!plan.cycle) return plan.days[day] ?? null;
  const fromMonday = (day + 6) % 7;
  return plan.cycle[((week - firstWeek) * 7 + fromMonday) % plan.cycle.length];
}

function buildTemplate(planId, key, plan, profile) {
  const workout = plan.workouts[key];
  const used = new Set();
  const picks = [];
  for (const slot of workout.slots) {
    const pick = resolveSlot(slot, profile, used);
    if (!pick) continue;
    used.add(pick.id);
    picks.push(pick);
  }
  return {
    id: `${planId}-${key}`,
    name: workout.name,
    exerciseIds: picks.map((p) => p.id),
    plannedIds: picks.map((p) => p.planned),
    sets: workout.scheme.length,
    scheme: workout.scheme,
    method: plan.method,
    range: { min: Math.min(...workout.scheme), max: Math.max(...workout.scheme), rest: workout.rest },
  };
}

/**
 * What a day of a given track week holds. Week numbers past the end give null.
 * kind is workout, cardio or rest.
 */
export function trackDay(profile, week, day) {
  const found = phaseOfWeek(week);
  if (!found) return null;
  const plan = PLANS[found.phase.plan];
  const key = keyForDay(plan, week, found.firstWeek, day);
  if (key === 'cardio') return { kind: 'cardio', method: plan.method };
  if (!key) return { kind: 'rest', method: plan.method };
  return { kind: 'workout', template: buildTemplate(found.phase.plan, key, plan, profile), method: plan.method };
}

/** Workouts in a track week, for the weekly target. */
export function trackWeekCount(week) {
  const found = phaseOfWeek(week);
  if (!found) return null;
  const plan = PLANS[found.phase.plan];
  return [0, 1, 2, 3, 4, 5, 6].filter((day) => {
    const key = keyForDay(plan, week, found.firstWeek, day);
    return key && key !== 'cardio';
  }).length;
}

/** When a track started, so that the chosen week is the current one. */
export function trackStartFor(week, mondayOfThisWeek) {
  return mondayOfThisWeek - (week - 1) * WEEK;
}

/** Every exercise the track can use. */
export function trackSlotIds() {
  return Object.values(PLANS).flatMap((plan) => Object.values(plan.workouts).flatMap((w) => w.slots.flat()));
}
