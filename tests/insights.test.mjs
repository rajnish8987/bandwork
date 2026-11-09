import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandHealth, bandsNeedingAttention, summariseReadings } from '../public/js/core/bandcare.js';
import { balanceWarnings, newRecords, personalRecords, weeklyMuscleSets, weekStreak } from '../public/js/core/insights.js';
import { buildIcs, notificationSchedule } from '../public/js/core/reminders.js';
import { formatLoad, fromUnit, toUnit } from '../public/js/core/units.js';
import { createRepCounter, supportsRepCount } from '../public/js/core/repcount.js';
import { EXERCISES, exerciseById } from '../public/js/core/exercises.js';

const DAY = 86400000;
const NOW = new Date(2026, 10, 11, 18, 0, 0).getTime(); // a Wednesday

const setOf = (reps, kg, extra = {}) => ({ reps, kg, bandIds: ['r'], label: 'Red', colors: ['#D92D20'], at: NOW, ...extra });
function workoutOf(at, entries) {
  return {
    id: `w${at}`,
    name: 'W',
    startedAt: at - 60000,
    finishedAt: at,
    exercises: Object.entries(entries).map(([exerciseId, sets]) => ({ exerciseId, sets })),
  };
}

/* ---------- Units ---------- */

test('loads show in the chosen unit', () => {
  assert.equal(formatLoad(10, 'kg'), '10 kg');
  assert.equal(formatLoad(2.5, 'kg'), '2.5 kg');
  assert.equal(formatLoad(10, 'lb'), '22 lb');
  assert.equal(formatLoad(10, 'stone'), '10 kg');
});

test('a value typed in pounds survives the round trip', () => {
  assert.equal(toUnit(fromUnit(11, 'lb'), 'lb'), 11);
  assert.equal(fromUnit(7.5, 'kg'), 7.5);
  assert.equal(toUnit(7.5, 'kg'), 7.5);
});

/* ---------- Band care ---------- */

const band = { id: 'r', name: 'Red', color: '#D92D20', kg: 10, addedAt: NOW - 10 * DAY };
const used = (count, at = NOW - DAY) => workoutOf(at, { squat: Array.from({ length: count }, () => setOf(10, 10)) });

test('a new, lightly used band needs nothing', () => {
  const h = bandHealth(band, [used(10)], NOW);
  assert.equal(h.status, 'ok');
  assert.equal(h.setsSinceCheck, 10);
  assert.equal(h.ageDays, 10);
});

test('a monthly safety check falls due', () => {
  const h = bandHealth({ ...band, addedAt: NOW - 31 * DAY }, [], NOW);
  assert.equal(h.status, 'inspect');
});

test('heavy use brings the check forward', () => {
  assert.equal(bandHealth(band, [used(150)], NOW).status, 'inspect');
});

test('checking a band clears the reminder and restarts the count', () => {
  const checked = { ...band, addedAt: NOW - 31 * DAY, inspectedAt: NOW - DAY };
  const h = bandHealth(checked, [used(150, NOW - 2 * DAY)], NOW);
  assert.equal(h.status, 'ok');
  assert.equal(h.setsSinceCheck, 0);
});

test('an old band is flagged to replace, whatever the last check said', () => {
  const old = { ...band, addedAt: NOW - 366 * DAY, inspectedAt: NOW - DAY };
  assert.equal(bandHealth(old, [], NOW).status, 'replace');
});

test('stacked bands each count the set; other bands do not', () => {
  const stacked = workoutOf(NOW - DAY, { squat: [setOf(10, 15, { bandIds: ['r', 'b'] }), setOf(10, 5, { bandIds: ['y'] })] });
  assert.equal(bandHealth(band, [stacked], NOW).setsSinceCheck, 1);
});

test('a band with no date starts from its first use', () => {
  const { addedAt, ...undated } = band;
  assert.equal(bandHealth(undated, [used(1, NOW - 5 * DAY)], NOW).ageDays, 5);
  assert.equal(bandHealth(undated, [], NOW).ageDays, 0);
});

test('only bands needing attention are listed', () => {
  const list = bandsNeedingAttention([band, { ...band, id: 'o', name: 'Old', addedAt: NOW - 400 * DAY }], [], NOW);
  assert.deepEqual(list.map((x) => x.band.name), ['Old']);
});

test('tension readings give the middle value and flag wide spreads', () => {
  assert.deepEqual(summariseReadings([10, 11, 10.5]), { kg: 10.5, steady: true, count: 3 });
  assert.equal(summariseReadings([8, 14, 10]).steady, false);
  assert.equal(summariseReadings(['', 0, -2, 'abc']), null);
  assert.deepEqual(summariseReadings(['12', '']), { kg: 12, steady: true, count: 1 });
});

/* ---------- Muscles and balance ---------- */

const reps = (n) => Array.from({ length: n }, () => setOf(10, 10));

test('sets count fully for the main muscle and half for helpers', () => {
  const week = weeklyMuscleSets([workoutOf(NOW - DAY, { 'door-press': reps(4) })], NOW);
  const of = (id) => week.find((m) => m.id === id).sets;
  assert.equal(of('chest'), 4);
  assert.equal(of('triceps'), 2);
  assert.equal(of('back'), 0);
});

test('only the last seven days count toward the week', () => {
  const week = weeklyMuscleSets([workoutOf(NOW - 8 * DAY, { 'door-press': reps(4) })], NOW);
  assert.equal(week.find((m) => m.id === 'chest').sets, 0);
});

test('much more pushing than pulling raises a warning', () => {
  const w = balanceWarnings([workoutOf(NOW - DAY, { 'door-press': reps(10), 'seated-row': reps(4) })], NOW);
  assert.ok(w.some((x) => x.id === 'pull-low'));
});

test('balanced training raises no warning', () => {
  const w = balanceWarnings([workoutOf(NOW - DAY, {
    'door-press': reps(6), 'seated-row': reps(6), squat: reps(6), deadlift: reps(6), 'overhead-press': reps(3),
  })], NOW);
  assert.deepEqual(w, []);
});

test('front of the legs far ahead of the back raises a warning', () => {
  const w = balanceWarnings([workoutOf(NOW - DAY, { squat: reps(12), deadlift: reps(2) })], NOW);
  assert.ok(w.some((x) => x.id === 'hinge-low'));
});

test('too little data raises no warning', () => {
  assert.deepEqual(balanceWarnings([workoutOf(NOW - DAY, { 'door-press': reps(3) })], NOW), []);
});

test('a muscle left out for two weeks is named when training is regular', () => {
  const regular = [1, 3, 5, 8].map((d) => workoutOf(NOW - d * DAY, { 'door-press': reps(4), 'seated-row': reps(4), 'overhead-press': reps(2) }));
  const w = balanceWarnings(regular, NOW);
  assert.ok(w.some((x) => x.id === 'neglected' && x.muscle === 'thighs'));
});

/* ---------- Records ---------- */

test('a stronger band beats any rep count on a weaker one', () => {
  const list = personalRecords([
    workoutOf(NOW - 2 * DAY, { squat: [setOf(20, 5)] }),
    workoutOf(NOW - DAY, { squat: [setOf(8, 10)] }),
  ]);
  assert.equal(list[0].exerciseId, 'squat');
  assert.equal(list[0].kg, 10);
  assert.equal(list[0].reps, 8);
});

test('the first time is not a record; beating it is', () => {
  const first = workoutOf(NOW - 2 * DAY, { squat: [setOf(10, 10)] });
  const second = workoutOf(NOW - DAY, { squat: [setOf(11, 10)], curl: [setOf(10, 5)] });
  assert.deepEqual(newRecords(first, [first]), []);
  const found = newRecords(second, [first, second]);
  assert.equal(found.length, 1);
  assert.deepEqual([found[0].exerciseId, found[0].reps, found[0].kg], ['squat', 11, 10]);
});

test('equalling a record is not a new one', () => {
  const first = workoutOf(NOW - 2 * DAY, { squat: [setOf(10, 10)] });
  const second = workoutOf(NOW - DAY, { squat: [setOf(10, 10)] });
  assert.deepEqual(newRecords(second, [first, second]), []);
});

/* ---------- Week streaks ---------- */

const weekAgo = (n, extraDays = 0) => workoutOf(NOW - n * 7 * DAY + extraDays * DAY, { squat: reps(1) });

test('weeks that reach the target make a streak', () => {
  const w = [3, 2, 1].flatMap((n) => [weekAgo(n), weekAgo(n, -1)]);
  assert.deepEqual(weekStreak(w, 2, NOW), { current: 3, best: 3 });
});

test('the current week adds to the streak once reached, and never breaks it early', () => {
  const past = [2, 1].flatMap((n) => [weekAgo(n), weekAgo(n, -1)]);
  assert.equal(weekStreak(past, 2, NOW).current, 2);
  const thisWeek = [...past, workoutOf(NOW - 1000, { squat: reps(1) }), workoutOf(NOW - 2000, { squat: reps(1) })];
  assert.equal(weekStreak(thisWeek, 2, NOW).current, 3);
});

test('a missed day does not matter, but a missed week restarts it', () => {
  const w = [5, 4, 3, 1].flatMap((n) => [weekAgo(n), weekAgo(n, -1)]);
  assert.deepEqual(weekStreak(w, 2, NOW), { current: 1, best: 3 });
});

test('no workouts means no streak', () => {
  assert.deepEqual(weekStreak([], 3, NOW), { current: 0, best: 0 });
});

/* ---------- Reminders ---------- */

test('reminders become a repeating calendar event', () => {
  const ics = buildIcs({ days: [1, 3, 5], time: '18:30' }, NOW);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR/);
  assert.match(ics, /DTSTART:\d{8}T183000/);
  assert.match(ics, /\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n$/);
  assert.match(ics, /VALARM/);
});

test('the event starts on the next chosen day', () => {
  const ics = buildIcs({ days: [5], time: '07:00' }, NOW); // the next Friday from a Wednesday
  assert.match(ics, /DTSTART:20261113T070000/);
});

test('no chosen days means no calendar file', () => {
  assert.equal(buildIcs({ days: [], time: '18:00' }, NOW), null);
});

test('reminders become one weekly notification per day, using Android weekday numbers', () => {
  const list = notificationSchedule({ days: [0, 3], time: '06:05' });
  assert.deepEqual(list.map((n) => n.schedule.on), [
    { weekday: 1, hour: 6, minute: 5, second: 0 }, // without second, Android keeps the seconds of when it was set
    { weekday: 4, hour: 6, minute: 5, second: 0 },
  ]);
  assert.equal(new Set(list.map((n) => n.id)).size, 2);
});

/* ---------- Camera rep counting ---------- */

function pose({ left = 180, right = left, visibility = 0.9 } = {}) {
  // A leg bent to an angle at the knee: hip above the knee, ankle swung out from straight.
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility }));
  const leg = (hip, knee, ankle, angle, x) => {
    lm[hip] = { x, y: 0.4, visibility };
    lm[knee] = { x, y: 0.6, visibility };
    const r = (angle * Math.PI) / 180;
    lm[ankle] = { x: x + Math.sin(r) * 0.2, y: 0.6 - Math.cos(r) * 0.2, visibility };
  };
  leg(23, 25, 27, left, 0.4);
  leg(24, 26, 28, right, 0.6);
  return lm;
}

function run(counter, angles, opts) {
  let count = 0;
  for (const a of angles) count = counter.update(pose({ left: a, ...opts }));
  return count;
}

const wave = (reps, noise = 0, seed = 7) => {
  const out = [];
  let r = seed;
  const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647 - 0.5; };
  for (let i = 0; i <= reps * 40; i += 1) out.push(135 + 45 * Math.cos((i / 40) * 2 * Math.PI) + rand() * noise);
  return out;
};

const squatCounter = () => createRepCounter(exerciseById('squat'));

test('counts each full rep of a clean movement', () => {
  assert.equal(run(squatCounter(), wave(5)), 5);
});

test('counts correctly through noisy tracking', () => {
  assert.equal(run(squatCounter(), wave(8, 16)), 8);
});

test('standing still or trembling counts nothing', () => {
  assert.equal(run(squatCounter(), Array.from({ length: 300 }, (_, i) => 170 + 6 * Math.sin(i))), 0);
});

test('half a rep is not counted until it returns', () => {
  const down = wave(1).slice(0, 21);
  const counter = squatCounter();
  assert.equal(run(counter, down), 0);
  assert.equal(run(counter, wave(1).slice(21)), 1);
});

test('a pause in the middle of a rep does not add a rep', () => {
  const w = wave(1);
  const paused = [...w.slice(0, 21), ...Array.from({ length: 80 }, () => w[20]), ...w.slice(21)];
  assert.equal(run(squatCounter(), paused), 1);
});

test('frames where the body is hidden are ignored', () => {
  const counter = squatCounter();
  run(counter, wave(2));
  assert.equal(counter.update(pose({ left: 90, visibility: 0.1 })), 2);
  assert.equal(counter.update(null), 2);
  assert.equal(counter.visible, false);
});

test('supports only exercises it can see clearly', () => {
  for (const id of ['squat', 'curl', 'overhead-press', 'seated-row', 'pull-apart']) assert.ok(supportsRepCount(exerciseById(id)), id);
  for (const id of ['calf-raise', 'side-bend', 'dead-bug', 'lateral-walk', 'woodchop']) assert.equal(supportsRepCount(exerciseById(id)), false, id);
  for (const e of EXERCISES.filter(supportsRepCount)) assert.equal(createRepCounter(e).count, 0);
});
