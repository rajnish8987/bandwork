import { exerciseById } from './exercises.js';

/** Midnight on the Monday of the week containing a timestamp, in local time. */
export function weekStart(time) {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function sessionsThisWeek(workouts, now) {
  const start = weekStart(now);
  return workouts.filter((w) => w.finishedAt >= start).length;
}

/** Workouts per week for the last `weeks` weeks, oldest first. */
export function weeklyCounts(workouts, weeks, now) {
  const result = [];
  const cursor = new Date(weekStart(now));
  for (let i = 0; i < weeks; i += 1) {
    result.unshift({ start: cursor.getTime(), count: 0 });
    cursor.setDate(cursor.getDate() - 7);
  }
  for (const w of workouts) {
    const start = weekStart(w.finishedAt);
    const bucket = result.find((r) => r.start === start);
    if (bucket) bucket.count += 1;
  }
  return result;
}

const stronger = (a, b) => (b.kg > a.kg || (b.kg === a.kg && b.reps > a.reps) ? b : a);

/** The best set of each session of an exercise, oldest first. */
export function exerciseSeries(workouts, exerciseId) {
  const series = [];
  for (const w of workouts) {
    const entry = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (!entry?.sets.length) continue;
    const best = entry.sets.reduce(stronger);
    series.push({ at: w.finishedAt, reps: best.reps, kg: best.kg, label: best.label, colors: best.colors, setup: entry.setup });
  }
  return series;
}

/** Exercises with logged sets, most recently trained first. */
export function loggedExerciseIds(workouts) {
  const seen = new Set();
  for (const w of [...workouts].reverse()) {
    for (const e of w.exercises) if (e.sets.length) seen.add(e.exerciseId);
  }
  return [...seen];
}

export function workoutSummary(workout) {
  const sets = workout.exercises.flatMap((e) => e.sets);
  const counted = workout.exercises.filter((e) => !exerciseById(e.exerciseId)?.timed).flatMap((e) => e.sets);
  return {
    sets: sets.length,
    reps: counted.reduce((sum, s) => sum + s.reps, 0),
    minutes: Math.max(1, Math.round((workout.finishedAt - workout.startedAt) / 60000)),
  };
}
