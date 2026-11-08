// Timed warm-up and cool-down moves. Each borrows the poses of an exercise so the
// figure on screen is familiar; stretches hold still at the end of the movement.

import { exerciseById } from './exercises.js';

const SECONDS = 30;

function move(id, name, cue, from, { keepBand = false, hold = false, poses } = {}) {
  const source = exerciseById(from);
  const end = source.poses[1];
  return {
    id,
    name,
    cue,
    seconds: SECONDS,
    view: source.view,
    elbows: source.elbows,
    knees: source.knees,
    band: keepBand ? source.band : [],
    poses: poses ?? (hold ? [end, end] : source.poses),
  };
}

const STAND = { hip: [100, 118], torso: 180, hands: [[106, 114], [104, 114]] };

export const WARMUP_MOVES = [
  move('march', 'March on the spot', 'Lift your knees and swing your arms.', 'curl', {
    poses: [
      { ...STAND, feet: [[98, 178], [104, 178]] },
      { ...STAND, feet: [[118, 146], [104, 178]] },
    ],
  }),
  move('arm-circles', 'Arm swings', 'Lift your arms out to the sides and lower them, easy and loose.', 'lateral-raise'),
  move('overhead-reach', 'Overhead reach', 'Reach up tall, then bring your hands back to your shoulders.', 'overhead-press'),
  move('warm-squat', 'Easy squat', 'No band yet. Sit back and stand up at an easy pace.', 'squat'),
  move('hip-hinge', 'Hip hinge', 'No band yet. Push your hips back with a flat back, then stand.', 'deadlift'),
  move('warm-pull-apart', 'Light pull-apart', 'Use your lightest band and pull it apart gently.', 'pull-apart', { keepBand: true }),
];

export const COOLDOWN_MOVES = [
  move('chest-stretch', 'Chest stretch', 'Open your arms wide and breathe slowly.', 'pull-apart', { hold: true }),
  move('overhead-stretch', 'Overhead stretch', 'Reach up tall and breathe slowly.', 'overhead-press', { hold: true }),
  move('side-stretch', 'Side stretch', 'Lean gently to one side, then switch halfway through.', 'side-bend', { hold: true }),
  move('hamstring-stretch', 'Hamstring stretch', 'Hinge forward with soft knees until you feel a gentle pull.', 'deadlift', { hold: true }),
  move('calf-stretch', 'Calf stretch', 'Step one foot back and press the heel down. Switch halfway through.', 'split-squat', { hold: true }),
];

const LOWER = new Set(['squat', 'hinge', 'glute', 'calf']);
const CORE = 'core';

function focus(session) {
  const patterns = session.exercises.map((e) => exerciseById(e.exerciseId)?.pattern).filter(Boolean);
  return {
    lower: patterns.some((p) => LOWER.has(p)),
    upper: patterns.some((p) => !LOWER.has(p) && p !== CORE),
  };
}

const COUNTS = { 15: 2, 20: 3, 30: 4, 45: 5, 60: 5 };

const byId = (list, ids) => ids.map((id) => list.find((m) => m.id === id));

/** A warm-up for the muscles in this session, sized to the session length. */
export function warmupFor(session, minutes) {
  const { lower, upper } = focus(session);
  let order = ['march', 'arm-circles', 'warm-pull-apart', 'overhead-reach', 'warm-squat'];
  if (lower && upper) order = ['march', 'warm-squat', 'arm-circles', 'hip-hinge', 'warm-pull-apart'];
  else if (lower) order = ['march', 'warm-squat', 'hip-hinge', 'arm-circles', 'overhead-reach'];
  return byId(WARMUP_MOVES, order.slice(0, COUNTS[minutes] ?? COUNTS[30]));
}

/** Stretches for what the session worked. */
export function cooldownFor(session) {
  const { lower, upper } = focus(session);
  let order = ['chest-stretch', 'overhead-stretch', 'side-stretch'];
  if (lower && upper) order = ['chest-stretch', 'hamstring-stretch', 'calf-stretch', 'side-stretch'];
  else if (lower) order = ['hamstring-stretch', 'calf-stretch', 'side-stretch'];
  return byId(COOLDOWN_MOVES, order);
}
