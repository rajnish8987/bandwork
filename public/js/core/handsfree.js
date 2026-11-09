// The rules behind hands-free mode: when a set has ended, what to log, and the raised
// hands gesture that means "move on". Nothing here touches the screen or the camera.

export const GET_READY_MS = 6000; // long enough to hear the exercise being announced
export const AFTER_TARGET_MS = 3000;
export const STOPPED_MS = 12000; // longer than the slowest rep, or a change of sides
export const HANDS_UP_MS = 2000;

const REP_PAUSE_MS = 2500;
const MIN_VISIBILITY = 0.5;
const NOSE = 0;
const WRISTS = [15, 16];

// In these the hands start above the head, so raised hands mean nothing before a first rep.
const HANDS_START_OVERHEAD = new Set(['overhead-triceps', 'overhead-pull-apart']);

/** Decides when a set is over, from the rep count and the time. */
export function createSetWatcher({ target, perSide = false, startedAt }) {
  const countingFrom = startedAt + GET_READY_MS;
  let lastCount = 0;
  let lastChange = countingFrom;
  let toldToSwitch = false;

  return {
    update(count, now) {
      if (now < countingFrom) return { phase: 'ready', secondsLeft: Math.ceil((countingFrom - now) / 1000), switchSides: false };
      if (count !== lastCount) {
        lastCount = count;
        lastChange = now;
      }
      const switchSides = perSide && !toldToSwitch && count >= target;
      if (switchSides) toldToSwitch = true;

      const idle = now - lastChange;
      const reachedTarget = !perSide && count >= target && idle >= AFTER_TARGET_MS;
      const stopped = count >= 1 && idle >= STOPPED_MS;
      return { phase: reachedTarget || stopped ? 'finish' : 'counting', secondsLeft: 0, switchSides };
    },
  };
}

/**
 * The reps to log for a set. If the camera counted nothing, the person has told us the
 * set is done, so the plan stands. Both sides of a one-sided exercise can add up on the
 * camera, so those stop at the plan.
 */
export function repsToLog({ count, target, perSide = false }) {
  if (count <= 0) return target;
  return perSide ? Math.min(count, target) : count;
}

export function handsAboveHead(landmarks) {
  if (!landmarks) return false;
  const nose = landmarks[NOSE];
  const wrists = WRISTS.map((i) => landmarks[i]);
  if ([nose, ...wrists].some((p) => !p || (p.visibility ?? 1) < MIN_VISIBILITY)) return false;
  return wrists.every((wrist) => wrist.y < nose.y);
}

/** Fires once when both hands have been held up for long enough. */
export function createHandsUp() {
  let since = null;
  let fired = false;
  return {
    update(landmarks, now) {
      if (!handsAboveHead(landmarks)) {
        since = null;
        fired = false;
        return false;
      }
      since ??= now;
      if (fired || now - since < HANDS_UP_MS) return false;
      fired = true;
      return true;
    },
  };
}

/** Whether raised hands can be trusted now, rather than being part of the exercise. */
export function gestureAllowed({ exerciseId, count, sinceRepMs }) {
  if (count === 0) return !HANDS_START_OVERHEAD.has(exerciseId);
  return sinceRepMs >= REP_PAUSE_MS;
}
