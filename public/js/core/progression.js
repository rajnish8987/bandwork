// Decides what band and how many reps to aim for next time, using the
// "double progression" method: add reps until the top of the range, then move to
// a stronger band and start again from the bottom.

const TIER_POSITION = { light: 0, medium: 1 / 3, heavy: 2 / 3 };
const MAX_STACK = 3;

export function loadOf(bandIds, bands) {
  return bandIds.reduce((sum, id) => sum + (bands.find((b) => b.id === id)?.kg ?? 0), 0);
}

export function labelFor(bandIds, bands) {
  if (!bandIds.length) return 'No band';
  return bandIds.map((id) => bands.find((b) => b.id === id)?.name ?? 'Band').join(' + ');
}

/** Every distinct tension the owned bands can make, lightest first. */
export function bandCombos(bands) {
  const byKg = new Map();
  const visit = (start, picked) => {
    if (picked.length) {
      const kg = picked.reduce((sum, b) => sum + b.kg, 0);
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

function firstTime(exercise, bands, range) {
  if (!bands.length) return { bandIds: [], repsGoal: range.min, note: 'Add a band in Settings to get a target.' };
  const sorted = [...bands].sort((a, b) => a.kg - b.kg);
  const index = Math.floor((sorted.length - 1) * (TIER_POSITION[exercise.tier] ?? 0));
  return {
    bandIds: [sorted[index].id],
    repsGoal: range.min,
    note: 'First time. Change the band if the last reps are not hard.',
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

/**
 * @param exercise the exercise
 * @param history past sessions of this exercise, oldest first: [{ sets: [...] }]
 * @param bands the bands the person owns
 * @param range { min, max } rep range
 */
export function prescribe(exercise, history, bands, range) {
  if (!bands.length || !history.length) return firstTime(exercise, bands, range);

  const combos = bandCombos(bands);
  const last = history.at(-1);
  const current = lastCombo(last, bands, combos);
  const sameCombo = { bandIds: current.bandIds };
  const name = (c) => labelFor(c.bandIds, bands);

  if (last.sets.every((s) => s.reps >= range.max)) {
    const up = combos.find((c) => c.kg > current.kg);
    if (up) return { bandIds: up.bandIds, repsGoal: range.min, note: `Move up to ${name(up)}. Back to ${range.min} reps.` };
    return { ...sameCombo, repsGoal: range.max, note: 'Strongest band reached. Lower slowly, for 3 seconds.' };
  }

  if (isUnder(last, range)) {
    const previous = history.at(-2);
    if (previous && isUnder(previous, range)) {
      const down = [...combos].reverse().find((c) => c.kg < current.kg);
      if (down) return { bandIds: down.bandIds, repsGoal: range.min, note: `Drop to ${name(down)} and build back up.` };
    }
    return { ...sameCombo, repsGoal: range.min, note: `Same band. Aim for ${range.min} reps on every set.` };
  }

  const weakest = Math.min(...last.sets.map((s) => s.reps));
  const repsGoal = Math.min(range.max, weakest + 1);
  return { ...sameCombo, repsGoal, note: `Aim for ${repsGoal} reps on every set. Your lowest last time was ${weakest}.` };
}
