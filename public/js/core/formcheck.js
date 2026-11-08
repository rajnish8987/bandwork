// Simple form cues from the camera. These only cover what body landmarks can show
// fairly reliably: speed, range, left and right evenness, and leaning. They cannot
// see things like a rounded back or a twisting knee, so the app never claims to.

import { t } from './i18n.js';

export const FORM_CUES = {
  slower: () => t('Slow down. Take at least 2 seconds on each rep.'),
  range: () => t('Move through your full range, like your best rep.'),
  even: () => t('Keep both sides even.'),
  tall: () => t('Stay tall and avoid swinging.'),
  chest: () => t('Lift your chest.'),
};

const QUICK_REP_MS = 1000; // measured between leaving the start and returning, about two thirds of a rep
const SHORT_REP_SHARE = 0.6;
const UNEVEN_SHARE = 0.6;
const UNEVEN_GAP = 25;
const SAME_REP_MS = 1000;
const SAY_AGAIN_MS = 8000;
const SAME_EVENT_MS = 400;
const BASELINE_FRAMES = 15;
const HELD_FRAMES = 12;
const LEAN_LIMIT = 15;
const SQUAT_LEAN_LIMIT = 55;
const MIN_VISIBILITY = 0.5;

const STAY_UPRIGHT = new Set([
  'overhead-press', 'curl', 'lateral-raise', 'pressdown', 'overhead-triceps', 'pull-apart', 'overhead-pull-apart',
  'face-pull', 'pallof', 'door-press', 'wrap-press',
]);
const CHEST_UP = new Set(['squat', 'split-squat']);

function torsoDirection(landmarks) {
  const points = [11, 12, 23, 24].map((i) => landmarks[i]);
  if (points.some((p) => !p || (p.visibility ?? 1) < MIN_VISIBILITY)) return null;
  const middle = (a, b, key) => ((a[key] ?? 0) + (b[key] ?? 0)) / 2;
  const axis = ['x', 'y', 'z'].map((key) => middle(points[0], points[1], key) - middle(points[2], points[3], key));
  const size = Math.hypot(...axis);
  return size ? axis.map((v) => v / size) : null;
}

const degreesBetween = (a, b) => (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI;

export function createFormCoach(exercise) {
  const tally = {};
  const lastSaid = {};
  const lastCounted = {};
  const bestTravel = {};
  const lastRep = {};
  let waiting = null;
  let baseline = null;
  let samples = [];
  let heldOver = 0;

  const limit = STAY_UPRIGHT.has(exercise.id) ? LEAN_LIMIT : CHEST_UP.has(exercise.id) ? SQUAT_LEAN_LIMIT : null;
  const leanCue = STAY_UPRIGHT.has(exercise.id) ? 'tall' : 'chest';

  const raise = (cue, at) => {
    if (at - (lastCounted[cue] ?? -Infinity) >= SAME_EVENT_MS) {
      tally[cue] = (tally[cue] ?? 0) + 1;
      lastCounted[cue] = at;
    }
    if (at - (lastSaid[cue] ?? -Infinity) >= SAY_AGAIN_MS) {
      lastSaid[cue] = at;
      waiting ??= cue;
    }
  };

  return {
    tally,
    /** Called for each completed rep on one side of the body. */
    repDone({ side, travel, ms, at }) {
      if (ms < QUICK_REP_MS) raise('slower', at);
      const best = bestTravel[side] ?? 0;
      if (best && travel < best * SHORT_REP_SHARE) raise('range', at);
      bestTravel[side] = Math.max(best, travel);

      const other = lastRep[1 - side];
      if (!exercise.perSide && other && at - other.at < SAME_REP_MS) {
        const [low, high] = [other.travel, travel].sort((a, b) => a - b);
        if (low < high * UNEVEN_SHARE && high - low > UNEVEN_GAP) raise('even', at);
      }
      lastRep[side] = { travel, at };
    },
    /** Called for each frame. Returns a cue to give now, or null. */
    observe(landmarks, at) {
      if (landmarks && limit !== null) {
        const direction = torsoDirection(landmarks);
        if (direction) {
          if (!baseline) {
            samples.push(direction);
            if (samples.length === BASELINE_FRAMES) {
              // The person's own start position, so a tilted camera does not read as leaning.
              const sum = samples.reduce((a, b) => a.map((v, i) => v + b[i]));
              const size = Math.hypot(...sum);
              baseline = sum.map((v) => v / size);
              samples = [];
            }
          } else {
            heldOver = degreesBetween(direction, baseline) > limit ? heldOver + 1 : 0;
            if (heldOver >= HELD_FRAMES) {
              raise(leanCue, at);
              heldOver = 0;
            }
          }
        }
      }
      const cue = waiting;
      waiting = null;
      return cue;
    },
  };
}
