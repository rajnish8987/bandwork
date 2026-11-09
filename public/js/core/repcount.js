// Counts reps from body landmarks seen by the camera. It measures one joint angle
// through the movement and counts a rep each time it goes away from the starting
// position and comes back. It counts only; it does not judge form.

const LANDMARK = {
  shoulder: [11, 12], elbow: [13, 14], wrist: [15, 16], hip: [23, 24], knee: [25, 26], ankle: [27, 28],
};

const MIN_VISIBILITY = 0.5;
const MIN_TRAVEL = 30; // degrees, or the same on the wrist-span scale
const SMOOTHING = 0.35;
const RETURN_SHARE = 0.35;
const SPAN_SCALE = 40;

const ELBOW = ['shoulder', 'elbow', 'wrist'];
const KNEE = ['hip', 'knee', 'ankle'];
const HIP = ['shoulder', 'hip', 'knee'];
const SHOULDER = ['hip', 'shoulder', 'elbow'];

const BY_PATTERN = {
  squat: KNEE,
  hinge: HIP,
  glute: HIP,
  hpush: ELBOW,
  vpush: ELBOW,
  triceps: ELBOW,
  hpull: ELBOW,
  vpull: ELBOW,
  biceps: ELBOW,
  rear: ELBOW,
  shoulder: SHOULDER,
};

const BY_EXERCISE = {
  'leg-curl': KNEE,
  pallof: ELBOW,
  'kneeling-crunch': HIP,
  'pull-apart': 'span',
  'overhead-pull-apart': 'span',
  'chest-fly': 'span',
  'incline-fly': 'span',
  'decline-fly': 'span',
  'reverse-fly': 'span',
  'bent-reverse-fly': 'span',
  'straight-arm-pulldown': SHOULDER,
  'leg-extension': KNEE,
  'front-raise': SHOULDER,
};

const NOT_SUPPORTED = new Set([
  'calf-raise', 'side-bend', 'dead-bug', 'lateral-walk', 'woodchop', 'shrug', 'wrist-curl', 'reverse-wrist-curl', 'seated-calf',
  'donkey-kick', 'crunch', 'reverse-crunch', 'knee-crunch', 'cross-crunch', 'flutter-kick', 'leg-raise', 'toe-touch', 'heel-touch',
  'plank', 'mountain-climber', 'russian-twist',
]);

function jointsFor(exercise) {
  if (NOT_SUPPORTED.has(exercise.id)) return null;
  return BY_EXERCISE[exercise.id] ?? BY_PATTERN[exercise.pattern] ?? null;
}

export function supportsRepCount(exercise) {
  return jointsFor(exercise) !== null;
}

function angleAt(a, b, c) {
  const ab = [a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0)];
  const cb = [c.x - b.x, c.y - b.y, (c.z ?? 0) - (b.z ?? 0)];
  const dot = ab[0] * cb[0] + ab[1] * cb[1] + ab[2] * cb[2];
  const size = Math.hypot(...ab) * Math.hypot(...cb);
  if (!size) return null;
  return (Math.acos(Math.max(-1, Math.min(1, dot / size))) * 180) / Math.PI;
}

const seen = (points) => points.every((p) => p && (p.visibility ?? 1) >= MIN_VISIBILITY);

/** Follows one signal, counting each trip away from the start and back. */
function makeTracker(onRep) {
  let smooth = null;
  let start = null;
  let furthest = null;
  let direction = 0;
  let away = false;
  let count = 0;
  let leftAt = 0;

  return {
    get count() { return count; },
    feed(value, at) {
      smooth = smooth === null ? value : smooth + SMOOTHING * (value - smooth);
      if (start === null) start = smooth;

      if (!away) {
        const moved = smooth - start;
        if (direction && moved * direction < 0) start = smooth; // settled further toward the start
        if (Math.abs(moved) > MIN_TRAVEL && (!direction || moved * direction > 0)) {
          direction = Math.sign(moved);
          away = true;
          furthest = smooth;
          leftAt = at;
        }
        return;
      }

      if ((smooth - furthest) * direction > 0) furthest = smooth;
      const travel = Math.abs(furthest - start);
      const fromStart = Math.abs(smooth - start);
      if (fromStart < travel * RETURN_SHARE && Math.abs(furthest - smooth) > MIN_TRAVEL) {
        count += 1;
        away = false;
        start = smooth;
        onRep?.({ travel, ms: at - leftAt, at });
      }
    },
  };
}

/** onRep receives { side, travel, ms, at } for each rep completed on either side. */
export function createRepCounter(exercise, { onRep } = {}) {
  const joints = jointsFor(exercise);
  const left = makeTracker((rep) => onRep?.({ ...rep, side: 0 }));
  const right = makeTracker((rep) => onRep?.({ ...rep, side: 1 }));
  let visible = false;

  const measureSide = (landmarks, side) => {
    const points = joints.map((name) => landmarks[LANDMARK[name][side]]);
    return seen(points) ? angleAt(...points) : null;
  };

  const measureSpan = (landmarks) => {
    const [wristL, wristR, shoulderL, shoulderR] = [15, 16, 11, 12].map((i) => landmarks[i]);
    if (!seen([wristL, wristR, shoulderL, shoulderR])) return null;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
    const shoulders = dist(shoulderL, shoulderR);
    return shoulders ? (dist(wristL, wristR) / shoulders) * SPAN_SCALE : null;
  };

  return {
    get count() { return Math.max(left.count, right.count); },
    get visible() { return visible; },
    /** Takes a frame of landmarks, or null when no person is found, and its time. Returns the count. */
    update(landmarks, at = 0) {
      visible = false;
      if (landmarks) {
        if (joints === 'span') {
          const span = measureSpan(landmarks);
          if (span !== null) {
            visible = true;
            left.feed(span, at);
          }
        } else {
          [left, right].forEach((tracker, side) => {
            const angle = measureSide(landmarks, side);
            if (angle !== null) {
              visible = true;
              tracker.feed(angle, at);
            }
          });
        }
      }
      return this.count;
    },
  };
}
