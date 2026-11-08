import { EXERCISES, exerciseById, isAvailable } from './exercises.js';

const RANGES = {
  strength: { min: 6, max: 10, rest: 120 },
  muscle: { min: 8, max: 15, rest: 75 },
  endurance: { min: 15, max: 25, rest: 45 },
};

const VOLUMES = {
  20: { exercises: 5, sets: 2 },
  30: { exercises: 6, sets: 3 },
  45: { exercises: 8, sets: 3 },
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

const SPLITS = {
  2: [['A', 'Full body A', FULL_A], ['B', 'Full body B', FULL_B]],
  3: [['A', 'Full body A', FULL_A], ['B', 'Full body B', FULL_B], ['C', 'Full body C', FULL_C]],
  4: [['UA', 'Upper body A', UPPER_A], ['LA', 'Lower body A', LOWER_A], ['UB', 'Upper body B', UPPER_B], ['LB', 'Lower body B', LOWER_B]],
};

export function repRange(goal) {
  return RANGES[goal] ?? RANGES.muscle;
}

export function volumeFor(minutes) {
  return VOLUMES[minutes] ?? VOLUMES[30];
}

function resolveSlot(slot, profile, used) {
  for (const id of slot) {
    if (!isAvailable(exerciseById(id), profile)) continue;
    const swapped = profile.swaps?.[id];
    const chosen = isAvailable(exerciseById(swapped), profile) ? swapped : id;
    if (!used.has(chosen)) return { planned: id, id: chosen };
    if (!used.has(id)) return { planned: id, id };
  }
  return null;
}

/** The rotation of workouts for a profile. */
export function buildPlan(profile) {
  const { exercises: count } = volumeFor(profile.minutes);
  const split = SPLITS[profile.daysPerWeek] ?? SPLITS[3];
  return split.map(([id, name, slots]) => {
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
  });
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
