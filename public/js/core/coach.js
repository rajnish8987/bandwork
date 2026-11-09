// The hands-free coach: the rep tempo and what the voice says.

import { t, tPlural } from './i18n.js';

/** Seconds for each half of a rep. */
export const TEMPOS = {
  fast: { up: 1, down: 2 },
  steady: { up: 2, down: 2 },
  slow: { up: 2, down: 4 },
  negative: { up: 2, down: 3 }, // one second up, one held, three down
};

/** Counts seconds, for a hold such as a plank. */
export const HOLD_TEMPO = { up: 1, down: 0 };

/** Where a counted set is at a moment in time, measured from when counting began. */
export function tempoAt(elapsedMs, { reps, upSeconds, downSeconds, leadInSeconds = 3, perSide = false, switchSeconds = 5 }) {
  const seconds = elapsedMs / 1000;
  const repLength = upSeconds + downSeconds;
  const sideLength = reps * repLength;
  const state = (phase, rep, completed, side, left) => ({ phase, rep, completed, side, secondsLeft: Math.ceil(left) });

  if (seconds < leadInSeconds) return state('ready', 0, 0, 1, leadInSeconds - seconds);

  let within = seconds - leadInSeconds;
  let side = 1;
  if (within >= sideLength) {
    if (!perSide) return state('done', reps, reps, 1, 0);
    within -= sideLength;
    if (within < switchSeconds) return state('switch', reps, reps, 1, switchSeconds - within);
    within -= switchSeconds;
    if (within >= sideLength) return state('done', reps, reps, 2, 0);
    side = 2;
  }

  const index = Math.floor(within / repLength);
  const inRep = within - index * repLength;
  return inRep < upSeconds
    ? state('up', index + 1, index, side, upSeconds - inRep)
    : state('down', index + 1, index, side, repLength - inRep);
}

export function setAnnouncement({ name, setNumber, totalSets, reps, band, perSide, timed }) {
  if (timed) return t('{name}. Set {n} of {total}. {seconds} seconds.', { name: t(name), n: setNumber, total: totalSets, seconds: reps });
  const count = perSide ? t('{reps} reps each side', { reps }) : tPlural(reps, 'rep');
  return t('{name}. Set {n} of {total}. {count} on {band}.', { name: t(name), n: setNumber, total: totalSets, count, band });
}

export function restAnnouncement({ seconds, nextName, isNewExercise }) {
  return isNewExercise
    ? t('Rest {seconds} seconds. Next, {name}.', { seconds, name: t(nextName) })
    : t('Rest {seconds} seconds.', { seconds });
}
