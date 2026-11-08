// Keeping bands safe and their numbers honest. The check intervals are rules of
// thumb, not manufacturer limits: wear depends on the band, sun and storage.

const DAY = 86400000;
const CHECK_DAYS = 30;
const CHECK_SETS = 150;
const REPLACE_DAYS = 365;
const REPLACE_SETS = 1500;
const STEADY_SPREAD = 0.2;

function setsWith(band, workouts) {
  return workouts.flatMap((w) => w.exercises.flatMap((e) => e.sets
    .filter((s) => s.bandIds?.includes(band.id))
    .map(() => w.finishedAt)));
}

export function bandHealth(band, workouts, now) {
  const uses = setsWith(band, workouts);
  const added = band.addedAt ?? (uses.length ? Math.min(...uses) : now);
  const checked = band.inspectedAt ?? added;
  const ageDays = Math.floor((now - added) / DAY);
  const daysSinceCheck = Math.floor((now - checked) / DAY);
  const setsSinceCheck = uses.filter((at) => at >= checked && at > (band.inspectedAt ?? -Infinity)).length;
  const setsTotal = uses.filter((at) => at >= added).length;

  let status = 'ok';
  if (daysSinceCheck >= CHECK_DAYS || setsSinceCheck >= CHECK_SETS) status = 'inspect';
  if (ageDays >= REPLACE_DAYS || setsTotal >= REPLACE_SETS) status = 'replace';
  return { status, ageDays, daysSinceCheck, setsSinceCheck, setsTotal };
}

export function bandsNeedingAttention(bands, workouts, now) {
  return bands
    .map((band) => ({ band, health: bandHealth(band, workouts, now) }))
    .filter((x) => x.health.status !== 'ok');
}

/** Turns luggage-scale readings into one figure, and says whether they agree. */
export function summariseReadings(readings) {
  const values = readings.map(Number).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  const spread = (values.at(-1) - values[0]) / median;
  return { kg: Number(median.toFixed(2)), steady: spread <= STEADY_SPREAD, count: values.length };
}
