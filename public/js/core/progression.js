// Decides what band and how many reps to aim for next time, using the
// "double progression" method: add reps until the top of the range, then move to
// a stronger band and start again from the bottom. How hard the sets felt, when
// rated, adjusts the pace.

import { BAND_COLORS } from './color.js';
import { t } from './i18n.js';

const MAX_STACK = 3;

export const EFFORTS = ['easy', 'good', 'hard', 'limit'];

export function loadOf(bandIds, bands) {
  return bandIds.reduce((sum, id) => sum + (bands.find((b) => b.id === id)?.kg ?? 0), 0);
}

/** A band's name to show. The default colour names translate; a name the person typed stays as typed. */
export function bandName(name) {
  return BAND_COLORS.some((c) => c.name === name) ? t(name) : name;
}

export function labelFor(bandIds, bands) {
  if (!bandIds.length) return t('No band');
  return bandIds.map((id) => {
    const band = bands.find((b) => b.id === id);
    return band ? bandName(band.name) : t('Band');
  }).join(' + ');
}

/** Every distinct tension the owned bands can make, lightest first. */
export function bandCombos(bands) {
  const byKg = new Map();
  const visit = (start, picked) => {
    if (picked.length) {
      const kg = Number(picked.reduce((sum, b) => sum + b.kg, 0).toFixed(2));
      const existing = byKg.get(kg);
      if (!existing || picked.length < existing.bandIds.length) {
        byKg.set(kg, { kg, bandIds: picked.map((b) => b.id) });
      }
    }
    if (picked.length === MAX_STACK) return;
    for (let i = start; i < bands.length; i += 1) visit(i + 1, [...picked, bands[i]]);
  };
  visit(0, []);
  return [...byKg.values()].sort((a, b) => a.kg - b.kg);
}

/** The tension to start an exercise at, in kg, by the person's level and how strong the movement is. */
const START_KG = {
  beginner: { light: 4.5, medium: 6.8, heavy: 9 },
  intermediate: { light: 6.8, medium: 11.3, heavy: 15.8 },
  master: { light: 11.3, medium: 15.8, heavy: 24.9 },
};

/** The band, or stack of bands, closest to the right starting tension. */
export function suggestBand(exercise, bands, level = 'intermediate') {
  if (!bands.length) return { bandIds: [], kg: 0 };
  const target = (START_KG[level] ?? START_KG.intermediate)[exercise.tier] ?? START_KG.beginner.light;
  const score = (c) => Math.abs(c.kg - target);
  // bandCombos already prefers fewer bands for the same tension; a tiny margin does so for near ties.
  return bandCombos(bands).reduce((best, c) => {
    if (score(c) < score(best) - 0.01) return c;
    return score(c) <= score(best) + 0.01 && c.bandIds.length < best.bandIds.length ? c : best;
  });
}

function firstTime(exercise, bands, range, level) {
  if (!bands.length) return { bandIds: [], repsGoal: range.min, note: t('Add a band in Settings to get a target.') };
  const { bandIds } = suggestBand(exercise, bands, level);
  return {
    bandIds,
    repsGoal: range.min,
    note: t('First time. {band} suits your level. Change it if the last reps are not hard.', { band: labelFor(bandIds, bands) }),
  };
}

function lastCombo(session, bands, combos) {
  const last = session.sets.at(-1);
  const owned = last.bandIds.every((id) => bands.some((b) => b.id === id));
  const kg = owned && last.bandIds.length ? loadOf(last.bandIds, bands) : last.kg ?? 0;
  const closest = combos.reduce((best, c) => (Math.abs(c.kg - kg) < Math.abs(best.kg - kg) ? c : best), combos[0]);
  return owned && last.bandIds.length ? { kg, bandIds: last.bandIds } : closest;
}

const isUnder = (session, range) => session.sets.some((s) => s.reps < range.min);
const endedAtLimit = (session) => session.sets.at(-1)?.effort === 'limit';
const allEasy = (session) => session.sets.every((s) => s.effort === 'easy');

/**
 * @param exercise the exercise
 * @param history past sessions of this exercise, oldest first: [{ sets: [...] }]
 * @param bands the bands the person owns
 * @param range { min, max } rep range
 * @param level the person's experience, which sets the first target
 */
export function prescribe(exercise, history, bands, range, level) {
  if (!bands.length || !history.length) return firstTime(exercise, bands, range, level);

  const combos = bandCombos(bands);
  const last = history.at(-1);
  const current = lastCombo(last, bands, combos);
  const sameCombo = { bandIds: current.bandIds };
  const name = (c) => labelFor(c.bandIds, bands);

  if (last.sets.every((s) => s.reps >= range.max)) {
    if (endedAtLimit(last)) {
      return { ...sameCombo, repsGoal: range.max, note: t('That was your limit. Repeat it before moving up.') };
    }
    const up = combos.find((c) => c.kg > current.kg);
    if (up) return { bandIds: up.bandIds, repsGoal: range.min, note: t('Move up to {band}. Back to {reps} reps.', { band: name(up), reps: range.min }) };
    return { ...sameCombo, repsGoal: range.max, note: t('Strongest band reached. Lower slowly, for 3 seconds.') };
  }

  if (isUnder(last, range)) {
    const previous = history.at(-2);
    if (previous && isUnder(previous, range)) {
      const down = [...combos].reverse().find((c) => c.kg < current.kg);
      if (down) return { bandIds: down.bandIds, repsGoal: range.min, note: t('Drop to {band} and build back up.', { band: name(down) }) };
    }
    return { ...sameCombo, repsGoal: range.min, note: t('Same band. Aim for {reps} reps on every set.', { reps: range.min }) };
  }

  const weakest = Math.min(...last.sets.map((s) => s.reps));
  if (endedAtLimit(last)) {
    return { ...sameCombo, repsGoal: weakest, note: t('That was your limit. Aim for {reps} reps again.', { reps: weakest }) };
  }
  const repsGoal = Math.min(range.max, weakest + (allEasy(last) ? 2 : 1));
  return { ...sameCombo, repsGoal, note: t('Aim for {reps} reps on every set. Your lowest last time was {weakest}.', { reps: repsGoal, weakest }) };
}
