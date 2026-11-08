import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekStart, sessionsThisWeek, weeklyCounts, exerciseSeries, loggedExerciseIds, workoutSummary } from '../public/js/core/stats.js';

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const workout = (finishedAt, exercises = []) => ({ id: String(finishedAt), finishedAt, startedAt: finishedAt - 60000, exercises });

test('weeks start on Monday', () => {
  assert.equal(weekStart(at(2026, 11, 8)), at(2026, 11, 2, 0)); // Sunday belongs to the week of Monday the 2nd
  assert.equal(weekStart(at(2026, 11, 9)), at(2026, 11, 9, 0)); // Monday starts a new week
});

test('sessions this week ignore earlier weeks', () => {
  const list = [workout(at(2026, 11, 1)), workout(at(2026, 11, 3)), workout(at(2026, 11, 5))];
  assert.equal(sessionsThisWeek(list, at(2026, 11, 8)), 2);
});

test('weekly counts run oldest to newest and include empty weeks', () => {
  const list = [workout(at(2026, 10, 20)), workout(at(2026, 11, 3)), workout(at(2026, 11, 5))];
  const weeks = weeklyCounts(list, 3, at(2026, 11, 8));
  assert.deepEqual(weeks.map((w) => w.count), [1, 0, 2]);
  assert.equal(weeks[2].start, at(2026, 11, 2, 0));
});

test('weekly counts stay aligned across a daylight-saving change', () => {
  const weeks = weeklyCounts([], 12, at(2026, 11, 8));
  for (const w of weeks) assert.equal(new Date(w.start).getDay(), 1);
  assert.equal(new Set(weeks.map((w) => w.start)).size, 12);
});

test('exercise series keeps the best set of each session, oldest first', () => {
  const set = (reps, kg, label) => ({ reps, kg, label, colors: ['#000000'], bandIds: ['b'] });
  const list = [
    workout(at(2026, 11, 3), [{ exerciseId: 'squat', sets: [set(10, 10, 'Red'), set(14, 10, 'Red')] }]),
    workout(at(2026, 11, 5), [{ exerciseId: 'curl', sets: [set(9, 5, 'Yellow')] }]),
    workout(at(2026, 11, 7), [{ exerciseId: 'squat', sets: [set(15, 10, 'Red'), set(8, 15, 'Blue')] }]),
  ];
  const series = exerciseSeries(list, 'squat');
  assert.equal(series.length, 2);
  assert.equal(series[0].reps, 14);
  assert.equal(series[1].label, 'Blue'); // heavier band beats more reps on a lighter one
  assert.equal(series[1].reps, 8);
});

test('logged exercises are listed by most recent', () => {
  const set = { reps: 1, kg: 1, label: 'x', colors: [], bandIds: [] };
  const list = [
    workout(at(2026, 11, 3), [{ exerciseId: 'squat', sets: [set] }]),
    workout(at(2026, 11, 7), [{ exerciseId: 'curl', sets: [set] }]),
  ];
  assert.deepEqual(loggedExerciseIds(list), ['curl', 'squat']);
});

test('a very short workout counts as one minute, not zero', () => {
  const w = { startedAt: 0, finishedAt: 5000, exercises: [] };
  assert.equal(workoutSummary(w).minutes, 1);
});

test('workout summary totals sets, reps and minutes', () => {
  const set = (reps) => ({ reps, kg: 1, label: 'x', colors: [], bandIds: [] });
  const w = { startedAt: 0, finishedAt: 25 * 60000, exercises: [{ exerciseId: 'a', sets: [set(10), set(12)] }, { exerciseId: 'b', sets: [set(8)] }] };
  assert.deepEqual(workoutSummary(w), { sets: 3, reps: 30, minutes: 25 });
});
