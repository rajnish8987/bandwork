import { EXERCISES, exerciseById, isAvailable } from './exercises.js';

const RANGES = {
  strength: { min: 6, max: 10, rest: 120 },
  muscle: { min: 8, max: 15, rest: 75 },
  endurance: { min: 15, max: 25, rest: 45 },
  fitness: { min: 10, max: 15, rest: 60 },
  fatloss: { min: 12, max: 20, rest: 30 },
};

const VOLUMES = {
  15: { exercises: 4, sets: 2 },
  20: { exercises: 5, sets: 2 },
  30: { exercises: 6, sets: 3 },
  45: { exercises: 8, sets: 3 },
  60: { exercises: 8, sets: 4 },
};

// Each slot lists choices in order of preference; the first one the person has
// the equipment for is used. Slots are ordered most important first, so shorter
// sessions keep the big movements.
const FULL_A = [['squat'], ['door-press', 'wrap-press'], ['seated-row'], ['deadlift'], ['overhead-press'], ['pallof', 'side-bend'], ['curl'], ['lateral-walk', 'calf-raise']];
const FULL_B = [['split-squat'], ['bent-row'], ['push-up'], ['pulldown', 'overhead-pull-apart'], ['glute-bridge'], ['lateral-raise'], ['dead-bug'], ['pressdown', 'overhead-triceps']];
const FULL_C = [['squat'], ['overhead-press'], ['pulldown', 'overhead-pull-apart'], ['good-morning'], ['wrap-press'], ['face-pull', 'pull-apart'], ['woodchop', 'side-bend'], ['calf-raise']];
const UPPER_A = [['door-press', 'wrap-press'], ['seated-row'], ['overhead-press'], ['pulldown', 'overhead-pull-apart'], ['lateral-raise'], ['face-pull', 'pull-apart'], ['curl'], ['pressdown', 'overhead-triceps']];
const UPPER_B = [['push-up'], ['bent-row'], ['overhead-press'], ['overhead-pull-apart'], ['wrap-press'], ['pull-apart'], ['overhead-triceps'], ['curl']];
const LOWER_A = [['squat'], ['deadlift'], ['split-squat'], ['glute-bridge'], ['leg-curl', 'good-morning'], ['calf-raise'], ['pallof', 'side-bend'], ['dead-bug']];
const LOWER_B = [['split-squat'], ['good-morning'], ['squat'], ['lateral-walk', 'glute-bridge'], ['leg-curl', 'deadlift'], ['kneeling-crunch', 'dead-bug'], ['calf-raise'], ['woodchop', 'side-bend']];

const PUSH_A = [['door-press', 'wrap-press'], ['overhead-press'], ['push-up'], ['lateral-raise'], ['pressdown', 'overhead-triceps'], ['pallof', 'side-bend'], ['wrap-press'], ['dead-bug']];
const PUSH_B = [['push-up'], ['wrap-press', 'door-press'], ['overhead-press'], ['overhead-triceps', 'pressdown'], ['lateral-raise'], ['dead-bug'], ['door-press'], ['side-bend']];
const PULL_A = [['seated-row'], ['pulldown', 'overhead-pull-apart'], ['face-pull', 'pull-apart'], ['bent-row'], ['curl'], ['woodchop', 'side-bend'], ['pull-apart'], ['dead-bug']];
const PULL_B = [['bent-row'], ['overhead-pull-apart', 'pulldown'], ['seated-row'], ['pull-apart', 'face-pull'], ['curl'], ['kneeling-crunch', 'dead-bug'], ['face-pull'], ['side-bend']];
const CORE_DAY = [['dead-bug'], ['side-bend'], ['pallof', 'woodchop'], ['kneeling-crunch', 'pull-apart'], ['pull-apart'], ['glute-bridge'], ['lateral-walk', 'calf-raise'], ['face-pull']];

const SPLITS = {
  2: [['A', 'Full body A', FULL_A], ['B', 'Full body B', FULL_B]],
  3: [['A', 'Full body A', FULL_A], ['B', 'Full body B', FULL_B], ['C', 'Full body C', FULL_C]],
  4: [['UA', 'Upper body A', UPPER_A], ['LA', 'Lower body A', LOWER_A], ['UB', 'Upper body B', UPPER_B], ['LB', 'Lower body B', LOWER_B]],
  5: [['UA', 'Upper body A', UPPER_A], ['LA', 'Lower body A', LOWER_A], ['C', 'Full body C', FULL_C], ['UB', 'Upper body B', UPPER_B], ['LB', 'Lower body B', LOWER_B]],
  6: [['PSA', 'Push A', PUSH_A], ['PLA', 'Pull A', PULL_A], ['LGA', 'Legs A', LOWER_A], ['PSB', 'Push B', PUSH_B], ['PLB', 'Pull B', PULL_B], ['LGB', 'Legs B', LOWER_B]],
  7: [['PSA', 'Push A', PUSH_A], ['PLA', 'Pull A', PULL_A], ['LGA', 'Legs A', LOWER_A], ['PSB', 'Push B', PUSH_B], ['PLB', 'Pull B', PULL_B], ['LGB', 'Legs B', LOWER_B], ['CORE', 'Core and recovery', CORE_DAY]],
};

const FOCUS_PATTERNS = {
  upper: ['hpush', 'vpush', 'shoulder', 'triceps', 'hpull', 'vpull', 'rear', 'biceps'],
  lower: ['squat', 'hinge', 'glute', 'calf'],
  core: ['core'],
  glutes: ['glute', 'hinge'],
  arms: ['biceps', 'triceps'],
};

/** Whether an exercise is in the area the person wants to focus on. */
export function isFocus(exercise, focus) {
  return FOCUS_PATTERNS[focus]?.includes(exercise.pattern) ?? false;
}

/** Plan names, as shown and translated. */
export const PLAN_NAMES = Object.values(SPLITS).flat().map(([, name]) => name);

export function repRange(goal) {
  return RANGES[goal] ?? RANGES.muscle;
}

export function volumeFor(minutes) {
  return VOLUMES[minutes] ?? VOLUMES[30];
}

export function resolveSlot(slot, profile, used) {
  for (const id of slot) {
    if (!isAvailable(exerciseById(id), profile)) continue;
    const swapped = profile.swaps?.[id];
    const chosen = isAvailable(exerciseById(swapped), profile) ? swapped : id;
    if (!used.has(chosen)) return { planned: id, id: chosen };
    if (!used.has(id)) return { planned: id, id };
  }
  return null;
}

/** A saved workout as a plan entry, or null if the person has no equipment for any of it. */
function customTemplate(saved, profile) {
  const ids = saved.exerciseIds.filter((id) => isAvailable(exerciseById(id), profile));
  if (!ids.length) return null;
  return { id: saved.id, name: saved.name, exerciseIds: ids, plannedIds: ids, sets: saved.sets, custom: true };
}

function builtInTemplate([id, name, slots], profile) {
  const { exercises: count } = volumeFor(profile.minutes);
  const used = new Set();
  const picks = [];
  for (const slot of slots) {
    if (picks.length === count) break;
    const pick = resolveSlot(slot, profile, used);
    if (!pick) continue;
    used.add(pick.id);
    picks.push(pick);
  }
  return { id, name, exerciseIds: picks.map((p) => p.id), plannedIds: picks.map((p) => p.planned) };
}

/** The saved workouts the person has the equipment for. */
export function customChoices(profile) {
  return (profile.customWorkouts ?? []).map((w) => customTemplate(w, profile)).filter(Boolean);
}

/** The built-in rotation for a number of days, ignoring any custom plan. */
export function splitFor(daysPerWeek) {
  return (SPLITS[daysPerWeek] ?? SPLITS[3]).map(([id, name]) => ({ id, name }));
}

/** Every built-in workout, once each. */
export function allBuiltIn(profile) {
  const seen = new Map();
  for (const row of Object.values(SPLITS).flat()) if (!seen.has(row[0])) seen.set(row[0], row);
  return [...seen.values()].map((row) => builtInTemplate(row, profile));
}

/** The rotation of workouts for a profile. */
export function buildPlan(profile) {
  if (profile.useCustomPlan) {
    const custom = customChoices(profile);
    if (custom.length) return custom;
  }
  return (SPLITS[profile.daysPerWeek] ?? SPLITS[3]).map((row) => builtInTemplate(row, profile));
}

export function nextTemplate(profile) {
  const plan = buildPlan(profile);
  return plan[profile.nextIndex % plan.length];
}

/** Exercises that train the same movement, using equipment the person has. */
export function swapOptions(exerciseId, profile) {
  const { pattern } = exerciseById(exerciseId);
  return EXERCISES.filter((e) => e.pattern === pattern && e.id !== exerciseId && isAvailable(e, profile));
}

export function estimateMinutes(profile, exerciseCount) {
  const { sets } = volumeFor(profile.minutes);
  const seconds = exerciseCount * sets * (40 + repRange(profile.goal).rest);
  return Math.max(5, Math.round(seconds / 300) * 5);
}
