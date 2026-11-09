import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { exerciseById, EXERCISES, isAvailable } from '../public/js/core/exercises.js';
import { createFormCoach, FORM_CUES } from '../public/js/core/formcheck.js';
import { programStatus } from '../public/js/core/programs.js';
import { bandCombos, loadOf, prescribe, prescribeScheme } from '../public/js/core/progression.js';
import { todayPlan, weeklyTarget } from '../public/js/core/schedule.js';
import { currentStep, finishSession, logSet, plannedReps, sessionMinutes, skipExercise, startSession } from '../public/js/core/session.js';
import { clockTime, KNOW_HOW, LEVELS, momentsForExercise, SPECIALS, specialForWeek, specialsForLevel, specialVideoIds } from '../public/js/core/specials.js';
import { defaultBands, defaultState, loadState } from '../public/js/core/store.js';
import { METHOD_NOTES, STAGE_START, TRACK, TRACK_ID, trackDay, trackSlotIds, trackStartFor, trackWeekCount } from '../public/js/core/track.js';
import { embedUrl, VIDEOS, videoFor, watchUrl } from '../public/js/core/videos.js';
import { weekStart } from '../public/js/core/stats.js';

const DAY = 86400000;
const fakeStorage = (value) => ({ getItem: () => JSON.stringify(value), setItem() {} });
// A Monday, so day offsets below are easy to read.
const MONDAY = new Date(2026, 10, 9, 12).getTime();
const dayOf = (offset) => MONDAY + offset * DAY;

function profile(extra = {}) {
  return { ...defaultState().profile, onboarded: true, hasAnchor: true, hasMini: true, bands: defaultBands(), ...extra };
}

function stateOnWeek(week, extra = {}) {
  const base = defaultState();
  const p = profile({ program: { id: TRACK_ID, startedAt: trackStartFor(week, weekStart(MONDAY)) }, ...extra });
  return { ...base, profile: p };
}

/* ---------- Content ---------- */

test('every exercise named by the track exists', () => {
  for (const id of trackSlotIds()) assert.ok(exerciseById(id), id);
});

test('every jump point names a real exercise, or has a label, and sits inside its video', () => {
  for (const special of SPECIALS) {
    for (const [seconds, label, exerciseId] of special.moments) {
      assert.ok(label || exerciseById(exerciseId), `${special.id} at ${seconds}`);
      if (special.minutes) assert.ok(seconds < (special.minutes + 1) * 60, `${special.id} at ${seconds}`);
    }
  }
});

test('the seven videos that were asked for are all included', () => {
  const ids = specialVideoIds();
  for (const id of ['JbVBZZzdvy4', 'njGZClD94bg', 'ELxezrSGmEA', 'sBeGmUBvt-s', 'kCZmSl0yb3U', '-7gHivQ2fRc', 'Ctjzq0EyeZM']) assert.ok(ids.includes(id), id);
});

test('each level has videos, and each level beyond the start can be followed', () => {
  for (const level of LEVELS) {
    assert.ok(specialsForLevel(level.id).length > 0, level.id);
    if (level.id !== 'start') assert.equal(level.startWeek, STAGE_START[level.id]);
  }
});

test('know-how points at a real time in a known video', () => {
  for (const item of KNOW_HOW) {
    assert.match(item.ref[0], /^[A-Za-z0-9_-]{11}$/, item.id);
    assert.ok(item.ref[1] >= 0, item.id);
    assert.ok(item.text?.length || item.list?.length, item.id);
  }
});

test('exercises find their jump points, and each week of the track finds its video', () => {
  assert.ok(momentsForExercise('squat').length >= 3);
  assert.deepEqual(momentsForExercise('side-bend').map((m) => m.seconds), [287]);
  assert.equal(specialForWeek(1).videoId, 'sBeGmUBvt-s');
  assert.equal(specialForWeek(8).videoId, '_umePsmxOKg');
  assert.equal(specialForWeek(12).videoId, 'sVJY76D0VDk');
});

test('times read as minutes and seconds', () => {
  assert.equal(clockTime(5), '0:05');
  assert.equal(clockTime(124), '2:04');
  assert.equal(clockTime(1044), '17:24');
});

test('new exercises open their video at the right moment', () => {
  assert.equal(VIDEOS['chest-fly'].at, 46);
  assert.equal(videoFor('chest-fly', profile()).at, 46);
  assert.match(embedUrl('dQw4w9WgXcQ', 46), /[?&]start=46(&|$)/);
  assert.doesNotMatch(embedUrl('dQw4w9WgXcQ'), /start=/);
  assert.equal(watchUrl('dQw4w9WgXcQ', 46), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=46s');
});

/* ---------- The weeks ---------- */

test('the track runs twelve weeks across three stages', () => {
  assert.equal(TRACK.phases.reduce((sum, p) => sum + p.weeks, 0), 12);
  assert.deepEqual(STAGE_START, { beginner: 1, intermediate: 5, advanced: 9 });
});

test('week 1: the basics three days a week, with a longer Friday and Sunday cardio', () => {
  const p = profile();
  const monday = trackDay(p, 1, 1);
  assert.equal(monday.kind, 'workout');
  assert.equal(monday.template.exerciseIds.length, 8);
  assert.deepEqual(monday.template.scheme, [12, 10, 8]);
  assert.deepEqual(trackDay(p, 1, 5).template.scheme, [12, 10, 8, 6]);
  assert.equal(trackDay(p, 1, 2).kind, 'rest');
  assert.equal(trackDay(p, 1, 0).kind, 'cardio');
});

test('week 2 has twelve exercises, week 3 is a circuit, week 4 is slow negatives on four days', () => {
  const p = profile();
  assert.equal(trackDay(p, 2, 1).template.exerciseIds.length, 12);
  const circuit = trackDay(p, 3, 1).template;
  assert.equal(circuit.method, 'circuit');
  assert.equal(circuit.exerciseIds.length, 12);
  assert.ok(circuit.exerciseIds.every((id) => !exerciseById(id).anchor), 'the circuit needs no door anchor');
  assert.equal(trackDay(p, 3, 0).kind, 'rest');
  assert.equal(trackDay(p, 4, 1).method, 'negative');
  assert.equal(trackWeekCount(4), 4);
  assert.equal(trackDay(p, 4, 0).kind, 'workout');
});

test('weeks 5 to 8 split upper and lower body, then go heavy, then to failure', () => {
  const p = profile();
  assert.equal(trackDay(p, 5, 1).template.name, 'Upper body');
  assert.equal(trackDay(p, 5, 2).template.name, 'Lower body');
  assert.equal(trackDay(p, 5, 3).kind, 'rest');
  assert.equal(trackDay(p, 5, 0).kind, 'cardio');
  assert.deepEqual(trackDay(p, 6, 1).template.scheme, [10, 8, 6]);
  assert.equal(trackDay(p, 7, 1).method, 'failure');
  assert.equal(trackDay(p, 8, 1).method, 'failure');
  assert.equal(trackWeekCount(5), 4);
});

test('weeks 9 to 12 run push, pull and legs, three days on and one off, so the days move', () => {
  const p = profile();
  const names = (week) => [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const d = trackDay(p, week, day);
    return d.kind === 'workout' ? d.template.name : d.kind;
  });
  assert.deepEqual(names(9), ['Push', 'Pull', 'Legs', 'rest', 'Push', 'Pull', 'Legs']);
  assert.deepEqual(names(10), ['rest', 'Push', 'Pull', 'Legs', 'rest', 'Push', 'Pull']);
  assert.deepEqual(names(11), ['Legs', 'rest', 'Push', 'Pull', 'Legs', 'rest', 'Push']);
  assert.deepEqual(names(12), ['Pull', 'Legs', 'rest', 'Push', 'Pull', 'Legs', 'rest']);
  assert.deepEqual(trackDay(p, 9, 1).template.scheme, [12, 10, 8, 6]);
});

test('past the last week there is nothing to do', () => {
  assert.equal(trackDay(profile(), 13, 1), null);
});

test('with no door anchor every workout still works, using exercises that need none', () => {
  const p = profile({ hasAnchor: false });
  for (let week = 1; week <= 12; week += 1) {
    for (let day = 0; day < 7; day += 1) {
      const d = trackDay(p, week, day);
      if (d.kind !== 'workout') continue;
      assert.ok(d.template.exerciseIds.length >= 5, `week ${week} day ${day}`);
      assert.ok(d.template.exerciseIds.every((id) => isAvailable(exerciseById(id), p)), `week ${week} day ${day}`);
    }
  }
});

test('sore areas are respected', () => {
  const p = profile({ avoid: ['knees'] });
  const lower = trackDay(p, 5, 2).template.exerciseIds;
  for (const id of ['squat', 'lunge', 'bulgarian-squat', 'goblet-squat', 'leg-press']) assert.ok(!lower.includes(id), id);
});

/* ---------- Following the track ---------- */

test('starting at a level puts the person on that week', () => {
  const state = stateOnWeek(5);
  const status = programStatus(state.profile, MONDAY);
  assert.equal(status.week, 5);
  assert.equal(status.phase.stage, 'intermediate');
  assert.equal(status.totalWeeks, 12);
});

test('Today follows the track, including rest and cardio days', () => {
  const state = stateOnWeek(1);
  assert.equal(todayPlan(state, dayOf(0)).kind, 'workout');
  assert.equal(todayPlan(state, dayOf(1)).kind, 'rest');
  assert.equal(todayPlan(state, dayOf(6)).kind, 'cardio');
  const rest = todayPlan(state, dayOf(1));
  assert.equal(rest.next.day, 3);
  assert.equal(rest.next.name, 'The 8 basics');
});

test('the next workout can fall in the following week of the track', () => {
  const state = stateOnWeek(1);
  assert.equal(todayPlan(state, dayOf(6)).next.name, 'Full body, 12 exercises');
});

test('the weekly target follows the track', () => {
  assert.equal(weeklyTarget(stateOnWeek(1).profile, MONDAY), 3);
  assert.equal(weeklyTarget(stateOnWeek(4).profile, MONDAY), 4);
  assert.equal(weeklyTarget(stateOnWeek(9).profile, MONDAY), 6);
});

test('a session uses the set scheme: reps drop each set', () => {
  const next = startSession(stateOnWeek(1), dayOf(0));
  assert.equal(next.active.name, 'The 8 basics');
  assert.equal(next.active.exercises[0].targetSets, 3);
  assert.equal(plannedReps(next.active, { exIndex: 0, setIndex: 0 }), 12);
  assert.equal(plannedReps(next.active, { exIndex: 0, setIndex: 1 }), 10);
  assert.equal(plannedReps(next.active, { exIndex: 0, setIndex: 2 }), 8);
  assert.deepEqual(next.active.scheme, [12, 10, 8]);
});

test('training anyway on a rest day runs the next track workout', () => {
  const next = startSession(stateOnWeek(1), dayOf(1));
  assert.equal(next.active.name, 'The 8 basics');
});

test('the ten minute version stays short on the track', () => {
  const next = startSession(stateOnWeek(1), dayOf(0), { quick: true });
  assert.equal(next.active.exercises.length, 3);
  assert.equal(next.active.exercises[0].targetSets, 2);
  assert.equal(next.active.scheme, undefined);
});

test('a circuit does one set of everything, then the next round, resting only between rounds', () => {
  let state = startSession(stateOnWeek(3), dayOf(0));
  const { active } = state;
  assert.equal(active.circuit, true);
  assert.equal(active.range.rest, 60);
  const total = active.exercises.length;
  for (let i = 0; i < total; i += 1) {
    const step = currentStep(state.active);
    assert.deepEqual(step, { exIndex: i, setIndex: 0 });
    state = logSet(state, { reps: 12, bandIds: [], effort: null }, dayOf(0) + i);
    if (i < total - 1) assert.equal(state.active.restEndsAt, null, 'no rest inside a round');
  }
  assert.equal(state.active.restEndsAt, dayOf(0) + total - 1 + 60000, 'a minute after the round');
  assert.deepEqual(currentStep(state.active), { exIndex: 0, setIndex: 1 });
  assert.equal(plannedReps(state.active, { exIndex: 0, setIndex: 1 }), 10);
});

test('a skipped exercise drops out of the remaining rounds', () => {
  let state = startSession(stateOnWeek(3), dayOf(0));
  state = skipExercise(state, 0);
  assert.equal(currentStep(state.active).exIndex, 1);
});

test('a circuit estimate counts sets and the rests between rounds', () => {
  const { active } = startSession(stateOnWeek(3), dayOf(0));
  assert.ok(sessionMinutes(active) <= 25, String(sessionMinutes(active)));
});

test('a finished track workout remembers its scheme, for the next time note', () => {
  let state = startSession(stateOnWeek(1), dayOf(0));
  state = logSet(state, { reps: 12, bandIds: [], effort: null }, dayOf(0));
  const { workout } = finishSession(state, dayOf(0) + 60000);
  assert.deepEqual(workout.scheme, [12, 10, 8]);
});

test('every way of training has a note', () => {
  for (let week = 1; week <= 12; week += 1) assert.ok(METHOD_NOTES[trackDay(profile(), week, 1).method ?? trackDay(profile(), week, 2).method], String(week));
});

/* ---------- Pyramid progression ---------- */

const bands = defaultBands();
const session = (repsList, bandIds, effort) => ({ sets: repsList.map((reps) => ({ reps, bandIds, kg: loadOf(bandIds, bands), ...(effort ? { effort } : {}) })) });

test('hitting every target moves the first set up a band', () => {
  const start = [bands[0].id];
  const target = prescribeScheme(exerciseById('curl'), [session([12, 10, 8], start)], bands, [12, 10, 8], 'beginner');
  const combos = bandCombos(bands);
  assert.equal(loadOf(target.bandIds, bands), combos.find((c) => c.kg > bands[0].kg).kg);
});

test('missing a target keeps the same band', () => {
  const start = [bands[0].id];
  const target = prescribeScheme(exerciseById('curl'), [session([12, 9, 8], start)], bands, [12, 10, 8], 'beginner');
  assert.deepEqual(target.bandIds, start);
});

test('a set at the limit holds the band where it is', () => {
  const start = [bands[0].id];
  const target = prescribeScheme(exerciseById('curl'), [session([12, 10, 8], start, 'limit')], bands, [12, 10, 8], 'beginner');
  assert.deepEqual(target.bandIds, start);
});

test('going up a band within a workout starts next time from the first set', () => {
  const light = [bands[0].id];
  const heavy = [bands[2].id];
  const history = [{ sets: [{ reps: 12, bandIds: light }, { reps: 8, bandIds: heavy }, { reps: 6, bandIds: heavy }] }];
  assert.deepEqual(prescribeScheme(exerciseById('curl'), history, bands, [12, 10, 8], 'beginner').bandIds, light);
});

test('the first time uses a band to suit the level', () => {
  assert.ok(prescribeScheme(exerciseById('squat'), [], bands, [12, 10, 8], 'beginner').bandIds.length > 0);
});

/* ---------- Exercises with no band ---------- */

const RANGE = { min: 10, max: 15, rest: 60 };

test('a floor exercise never asks for a band', () => {
  const first = prescribe(exerciseById('crunch'), [], bands, RANGE, 'beginner');
  assert.deepEqual(first.bandIds, []);
  assert.equal(first.repsGoal, 10);
  assert.deepEqual(prescribeScheme(exerciseById('crunch'), [], bands, [12, 10, 8], 'beginner').bandIds, []);
});

test('a floor exercise progresses by adding reps, up to the top of the range', () => {
  const crunch = exerciseById('crunch');
  assert.equal(prescribe(crunch, [session([10, 11], [])], bands, RANGE, 'beginner').repsGoal, 11);
  assert.equal(prescribe(crunch, [session([15, 15], [])], bands, RANGE, 'beginner').repsGoal, 15);
});

test('a hold is measured in seconds and grows by five at a time', () => {
  const plank = exerciseById('plank');
  assert.equal(plank.timed, true);
  assert.equal(prescribe(plank, [], bands, RANGE, 'beginner').repsGoal, 30);
  assert.equal(prescribe(plank, [session([30, 30], [])], bands, RANGE, 'beginner').repsGoal, 35);
});

test('logging a floor exercise needs no band and records no load', () => {
  let state = stateOnWeek(1);
  state = { ...state, profile: { ...state.profile, program: null, customWorkouts: [{ id: 'floor', name: 'Floor', exerciseIds: ['crunch'], sets: 1 }] } };
  state = startSession(state, MONDAY, { customId: 'floor' });
  assert.deepEqual(state.active.exercises[0].target.bandIds, []);
  state = logSet(state, { reps: 10, bandIds: [], effort: null }, MONDAY);
  assert.equal(state.active.exercises[0].sets[0].kg, 0);
});

test('a hold swapped into a workout with a scheme still gets seconds', () => {
  const state = startSession(stateOnWeek(1), dayOf(0));
  const active = structuredClone(state.active);
  active.exercises[0].exerciseId = 'plank';
  assert.equal(plannedReps(active, { exIndex: 0, setIndex: 0 }), 36);
});

test('every floor exercise has no band to draw', () => {
  for (const e of EXERCISES.filter((x) => x.bodyweight)) assert.deepEqual(e.band, [], e.id);
});

/* ---------- Camera coach ---------- */

test('slow negative weeks ask for slower reps than the usual check', () => {
  const rep = { side: 0, travel: 90, ms: 1500, at: 1000 };
  const usual = createFormCoach(exerciseById('curl'));
  usual.repDone(rep);
  assert.equal(usual.observe(null, 1000), null, 'fast enough on a normal day');
  const slow = createFormCoach(exerciseById('curl'), { slowNegatives: true });
  slow.repDone(rep);
  assert.equal(slow.observe(null, 1000), 'negative');
  assert.ok(FORM_CUES.negative().length > 0);
  const good = createFormCoach(exerciseById('curl'), { slowNegatives: true });
  good.repDone({ ...rep, ms: 3300 });
  assert.equal(good.observe(null, 1000), null, 'a 1, 1, 3 second rep passes');
});

test('standing exercises from the track get the posture check too', () => {
  const lean = (degrees) => {
    const a = (degrees * Math.PI) / 180;
    const points = Array(33).fill({ x: 0, y: 0, z: 0, visibility: 1 });
    const out = [...points];
    out[11] = { x: Math.sin(a), y: -Math.cos(a), z: 0, visibility: 1 };
    out[12] = out[11];
    out[23] = { x: 0, y: 0, z: 0, visibility: 1 };
    out[24] = out[23];
    return out;
  };
  const cuesFor = (id) => {
    const coach = createFormCoach(exerciseById(id));
    const cues = [];
    let at = 0;
    for (let i = 0; i < 20; i += 1) coach.observe(lean(0), (at += 33));
    for (let i = 0; i < 30; i += 1) {
      const cue = coach.observe(lean(70), (at += 33));
      if (cue) cues.push(cue);
    }
    return cues;
  };
  for (const id of ['arnold-press', 'hammer-curl', 'reverse-curl', 'front-raise', 'upright-row', 'chest-fly', 'incline-press']) {
    assert.ok(cuesFor(id).includes('tall'), id);
  }
  for (const id of ['lunge', 'goblet-squat', 'bulgarian-squat']) assert.ok(cuesFor(id).includes('chest'), id);
  assert.deepEqual(cuesFor('bent-reverse-fly'), [], 'leaning is the point of this one');
});

/* ---------- Reminders ---------- */

test('asking for exact reminders is remembered, and is off unless asked for', () => {
  const saved = { ...defaultState(), profile: { ...defaultState().profile, onboarded: true, reminders: { days: [1], time: '07:00', exact: true } } };
  assert.equal(loadState(fakeStorage(saved)).profile.reminders.exact, true);
  saved.profile.reminders = { days: [1], time: '07:00' };
  assert.equal(loadState(fakeStorage(saved)).profile.reminders.exact, undefined);
});

/* ---------- The offline store ---------- */

test('the new files are stored for offline use', () => {
  const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  for (const file of ['js/core/specials.js', 'js/core/track.js', 'js/ui/specials-screen.js']) assert.ok(sw.includes(`./${file}`), file);
});
