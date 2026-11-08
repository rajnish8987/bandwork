import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, exerciseById } from '../public/js/core/exercises.js';
import { createFormCoach, FORM_CUES } from '../public/js/core/formcheck.js';
import { createRepCounter } from '../public/js/core/repcount.js';
import {
  defaultWeek, scheduleWarnings, templateChoices, todayPlan, weeklyTarget,
} from '../public/js/core/schedule.js';
import { finishSession, logSet, startSession } from '../public/js/core/session.js';
import { defaultState, makeBackup, parseBackup } from '../public/js/core/store.js';
import { embedUrl, parseYouTubeId, searchUrl, VIDEOS, videoFor, watchUrl } from '../public/js/core/videos.js';

const DAY = 86400000;
const WEDNESDAY = new Date(2026, 10, 11, 18, 0, 0).getTime(); // getDay() === 3

function ready(profile = {}) {
  const s = defaultState();
  s.profile.onboarded = true;
  Object.assign(s.profile, profile);
  return s;
}

/* ---------- Videos ---------- */

test('every exercise has a real video with a valid id and a named channel', () => {
  for (const e of EXERCISES) {
    const v = VIDEOS[e.id];
    assert.ok(v, e.id);
    assert.match(v.id, /^[A-Za-z0-9_-]{11}$/, e.id);
    assert.ok(v.channel.length > 0, e.id);
  }
  assert.equal(Object.keys(VIDEOS).length, EXERCISES.length);
});

test('YouTube links of every common shape give the video id', () => {
  const id = 'dQw4w9WgXcQ';
  for (const link of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?pp=abc&v=${id}&t=10`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `  https://www.youtube.com/live/${id}  `,
  ]) assert.equal(parseYouTubeId(link), id, link);
});

test('anything else is refused, including lookalike sites', () => {
  for (const bad of [
    '', 'hello', 'https://example.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ"><script>', 'javascript:alert(1)',
    'https://www.youtube.com/playlist?list=abc',
  ]) assert.equal(parseYouTubeId(bad), null, bad);
});

test('the player uses the privacy-enhanced address and links are escaped', () => {
  assert.match(embedUrl('dQw4w9WgXcQ'), /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
  assert.equal(watchUrl('dQw4w9WgXcQ'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(searchUrl('Chest press, door anchor'), 'https://www.youtube.com/results?search_query=resistance%20band%20Chest%20press%2C%20door%20anchor');
});

test('your own video replaces the suggested one for that exercise only', () => {
  const profile = { videoOverrides: { squat: 'dQw4w9WgXcQ' } };
  assert.deepEqual(videoFor('squat', profile), { id: 'dQw4w9WgXcQ', channel: null, own: true });
  assert.equal(videoFor('curl', profile).own, false);
  assert.equal(videoFor('curl', profile).id, VIDEOS.curl.id);
});

test('a backup with a bad video id or schedule is cleaned on restore', () => {
  const s = ready();
  s.profile.videoOverrides = { squat: 'dQw4w9WgXcQ', curl: '"><script>x', deadlift: 7 };
  s.profile.schedule = { enabled: 'yes', days: { 1: 'A', 2: null, 9: 'B', 3: 5 } };
  const restored = parseBackup(makeBackup(s));
  assert.deepEqual(restored.profile.videoOverrides, { squat: 'dQw4w9WgXcQ' });
  assert.deepEqual(restored.profile.schedule, { enabled: true, days: { 1: 'A', 2: null } });
});

/* ---------- Form checks ---------- */

// A person facing the camera. Lean tips the shoulders away from above the hips.
function body({ knee = 180, elbowL = 170, elbowR = elbowL, lean = 0, visibility = 0.9 } = {}) {
  const r = (deg) => (deg * Math.PI) / 180;
  const lm = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility }));
  const hipY = 0;
  const shoulderX = Math.sin(r(lean)) * 0.5;
  const shoulderY = hipY - Math.cos(r(lean)) * 0.5;
  lm[11] = { x: shoulderX - 0.2, y: shoulderY, z: 0, visibility };
  lm[12] = { x: shoulderX + 0.2, y: shoulderY, z: 0, visibility };
  lm[23] = { x: -0.15, y: hipY, z: 0, visibility };
  lm[24] = { x: 0.15, y: hipY, z: 0, visibility };
  const arm = (shoulder, elbow, wrist, angle) => {
    const s = lm[shoulder];
    lm[elbow] = { x: s.x, y: s.y + 0.3, z: 0, visibility };
    lm[wrist] = { x: s.x + Math.sin(r(angle)) * 0.3, y: s.y + 0.3 - Math.cos(r(angle)) * 0.3, z: 0, visibility };
  };
  arm(11, 13, 15, elbowL);
  arm(12, 14, 16, elbowR);
  const leg = (hip, kneeI, ankle, angle) => {
    lm[kneeI] = { x: lm[hip].x, y: 0.45, z: 0, visibility };
    lm[ankle] = { x: lm[hip].x + Math.sin(r(angle)) * 0.45, y: 0.45 - Math.cos(r(angle)) * 0.45, z: 0, visibility };
  };
  leg(23, 25, 27, knee);
  leg(24, 26, 28, knee);
  return lm;
}

const FRAME_MS = 33;

function feed(exerciseId, frames) {
  const exercise = exerciseById(exerciseId);
  const coach = createFormCoach(exercise);
  const counter = createRepCounter(exercise, { onRep: (rep) => coach.repDone(rep) });
  const cues = [];
  let at = 1000;
  for (const frame of frames) {
    counter.update(frame, at);
    const cue = coach.observe(frame, at);
    if (cue) cues.push(cue);
    at += FRAME_MS;
  }
  return { cues, count: counter.count, tally: coach.tally };
}

// One rep of a curl-like movement, from straight to bent and back, over a number of frames.
function armRep(frames, { low = 60, high = 170, make = (a) => body({ elbowL: a }) } = {}) {
  return Array.from({ length: frames + 1 }, (_, i) => {
    const angle = (low + high) / 2 + ((high - low) / 2) * Math.cos((i / frames) * 2 * Math.PI);
    return make(angle);
  });
}

const reps = (count, frames, options) => Array.from({ length: count }, () => armRep(frames, options)).flat();

test('clean, controlled reps raise no cues', () => {
  const { cues, count } = feed('curl', reps(5, 90));
  assert.equal(count, 5);
  assert.deepEqual(cues, []);
});

test('rushed reps bring a cue to slow down', () => {
  const { cues, count } = feed('curl', reps(4, 22));
  assert.equal(count, 4);
  assert.ok(cues.includes('slower'), cues.join());
});

test('reps that get much shorter than your best bring a range cue', () => {
  const { cues } = feed('curl', [...reps(3, 90), ...reps(3, 90, { low: 125, high: 170 })]);
  assert.ok(cues.includes('range'), cues.join());
});

test('one arm moving far less than the other brings an evenness cue', () => {
  const uneven = reps(4, 90, { make: (a) => body({ elbowL: a, elbowR: 170 - (170 - a) * 0.4 }) });
  const { cues } = feed('curl', uneven);
  assert.ok(cues.includes('even'), cues.join());
});

test('evenness is not checked on one-sided exercises', () => {
  const uneven = reps(4, 90, { make: (a) => body({ elbowL: a, elbowR: 170 - (170 - a) * 0.4 }) });
  assert.ok(!feed('pallof', uneven).cues.includes('even'));
});

test('leaning or swinging during an upright exercise brings a cue', () => {
  const swinging = reps(4, 90, { make: (a) => body({ elbowL: a, lean: ((170 - a) / 110) * 25 }) });
  assert.ok(feed('curl', swinging).cues.includes('tall'));
});

test('a camera that is tilted does not count as leaning', () => {
  const tilted = reps(4, 90, { make: (a) => body({ elbowL: a, lean: 18 }) });
  assert.ok(!feed('curl', tilted).cues.includes('tall'));
});

test('exercises that lean on purpose are not told to stand tall', () => {
  const hinge = reps(4, 90, { make: (a) => body({ elbowL: a, lean: ((170 - a) / 110) * 40 }) });
  assert.ok(!feed('bent-row', hinge).cues.includes('tall'));
});

test('falling far forward in a squat brings a chest cue; a normal squat does not', () => {
  const squat = (lean) => Array.from({ length: 4 }, () => armRep(90, { low: 90, high: 175, make: (a) => body({ knee: a, lean: ((175 - a) / 85) * lean }) })).flat();
  assert.ok(feed('squat', squat(70)).cues.includes('chest'));
  assert.ok(!feed('squat', squat(35)).cues.includes('chest'));
});

test('a cue does not repeat constantly, and the tally keeps the count', () => {
  const { cues, tally } = feed('curl', reps(10, 22));
  const slower = cues.filter((c) => c === 'slower').length;
  assert.ok(slower >= 1 && slower <= 3, `said ${slower} times`);
  assert.ok(tally.slower >= 8, `tally ${tally.slower}`);
});

test('a hidden body raises no cues and does not break tracking', () => {
  const hidden = Array.from({ length: 200 }, () => body({ visibility: 0.1 }));
  const { cues, count } = feed('curl', [...hidden, null, ...reps(2, 90)]);
  assert.deepEqual(cues, []);
  assert.equal(count, 2);
});

test('every cue has words to show', () => {
  for (const id of ['slower', 'range', 'even', 'tall', 'chest']) assert.ok(FORM_CUES[id]().length > 0, id);
});

/* ---------- Seven-day schedule ---------- */

const week = (days) => ({ enabled: true, days });

test('the schedule starts from your current plan, spread across the week', () => {
  assert.deepEqual(Object.entries(defaultWeek(ready({ daysPerWeek: 3 }).profile)).filter(([, v]) => v), [['1', 'A'], ['3', 'B'], ['5', 'C']]);
  assert.deepEqual(Object.entries(defaultWeek(ready({ daysPerWeek: 2 }).profile)).filter(([, v]) => v), [['1', 'A'], ['4', 'B']]);
  assert.deepEqual(Object.entries(defaultWeek(ready({ daysPerWeek: 4 }).profile)).filter(([, v]) => v), [['1', 'UA'], ['2', 'LA'], ['4', 'UB'], ['5', 'LB']]);
  assert.equal(Object.keys(defaultWeek(ready().profile)).length, 7);
});

test('every built-in workout and your own workouts can be chosen', () => {
  const profile = ready({ customWorkouts: [{ id: 'c1', name: 'Arms', exerciseIds: ['curl'], sets: 3 }] }).profile;
  const ids = templateChoices(profile).map((c) => c.id);
  assert.deepEqual(ids.slice(0, 7), ['A', 'B', 'C', 'UA', 'LA', 'UB', 'LB']);
  assert.deepEqual(ids.slice(-1), ['c1']);
  assert.ok(ids.includes('PSA') && ids.includes('CORE'));
});

test('with the schedule off, today follows the usual rotation', () => {
  assert.equal(todayPlan(ready(), WEDNESDAY).kind, 'rotation');
});

test('today starts the workout chosen for this day, without moving the rotation', () => {
  const s = ready({ schedule: week({ 3: 'LB' }), nextIndex: 1 });
  const plan = todayPlan(s, WEDNESDAY);
  assert.equal(plan.kind, 'workout');
  assert.equal(plan.template.name, 'Lower body B');
  let started = startSession(s, WEDNESDAY);
  assert.equal(started.active.name, 'Lower body B');
  started = logSet(started, { reps: 8, bandIds: started.active.exercises[0].target.bandIds }, WEDNESDAY);
  assert.equal(finishSession(started, WEDNESDAY + 1000).state.profile.nextIndex, 1);
});

test('a rest day says what is next', () => {
  const s = ready({ schedule: week({ 3: null, 4: null, 5: 'A' }) });
  const plan = todayPlan(s, WEDNESDAY);
  assert.equal(plan.kind, 'rest');
  assert.equal(plan.next.day, 5);
  assert.equal(plan.next.name, 'Full body A');
});

test('training anyway on a rest day uses the usual rotation', () => {
  const s = ready({ schedule: week({}) });
  assert.equal(todayPlan(s, WEDNESDAY).kind, 'rest');
  assert.equal(todayPlan(s, WEDNESDAY).next, null);
  assert.equal(startSession(s, WEDNESDAY).active.name, 'Full body A');
});

test('after finishing today, it says so and points to the next workout', () => {
  const s = ready({ schedule: week({ 3: 'A', 4: 'B' }) });
  const band = s.profile.bands[0];
  s.workouts.push({
    id: 'w', name: 'Full body A', templateId: 'A', startedAt: WEDNESDAY - 2000, finishedAt: WEDNESDAY - 1000,
    exercises: [{ exerciseId: 'squat', sets: [{ reps: 8, bandIds: [band.id], kg: band.kg, label: band.name, colors: [band.color], at: WEDNESDAY - 1000 }] }],
  });
  const plan = todayPlan(s, WEDNESDAY);
  assert.equal(plan.kind, 'done');
  assert.equal(plan.next.name, 'Full body B');
  assert.equal(todayPlan(s, WEDNESDAY + DAY).kind, 'workout');
});

test('a deleted workout, or one you lack the equipment for, counts as a rest day', () => {
  assert.equal(todayPlan(ready({ schedule: week({ 3: 'gone' }) }), WEDNESDAY).kind, 'rest');
  const doorOnly = { id: 'd', name: 'Door', exerciseIds: ['face-pull'], sets: 3 };
  assert.equal(todayPlan(ready({ customWorkouts: [doorOnly], schedule: week({ 3: 'd' }) }), WEDNESDAY).kind, 'rest');
});

test('a chosen custom workout runs with its own sets', () => {
  const custom = { id: 'c1', name: 'Arms', exerciseIds: ['curl', 'overhead-triceps'], sets: 5 };
  const s = ready({ customWorkouts: [custom], schedule: week({ 3: 'c1' }) });
  const { active } = startSession(s, WEDNESDAY);
  assert.equal(active.name, 'Arms');
  assert.equal(active.exercises[0].targetSets, 5);
});

test('the weekly target follows the schedule, up to all seven days', () => {
  assert.equal(weeklyTarget(ready({ daysPerWeek: 3 }).profile), 3);
  const seven = { 0: 'A', 1: 'B', 2: 'C', 3: 'A', 4: 'B', 5: 'C', 6: 'A' };
  assert.equal(weeklyTarget(ready({ schedule: week(seven) }).profile), 7);
  assert.equal(weeklyTarget(ready({ schedule: week({ 1: 'gone' }), daysPerWeek: 2 }).profile), 2);
});

test('seven training days brings a warning to rest', () => {
  const seven = { 0: 'A', 1: 'B', 2: 'C', 3: 'A', 4: 'B', 5: 'C', 6: 'A' };
  assert.ok(scheduleWarnings(ready({ schedule: week(seven) }).profile).some((w) => w.id === 'no-rest'));
});

test('the same muscles on back-to-back days bring a warning, including Sunday to Monday', () => {
  const warn = (days) => scheduleWarnings(ready({ schedule: week(days) }).profile).filter((w) => w.id === 'back-to-back');
  assert.deepEqual(warn({ 1: 'A', 2: 'B' }).map((w) => [w.first, w.second]), [[1, 2]]);
  assert.deepEqual(warn({ 0: 'A', 1: 'B' }).map((w) => [w.first, w.second]), [[0, 1]]);
  assert.deepEqual(warn({ 1: 'A', 3: 'B', 5: 'C' }), []);
});

test('upper and lower on back-to-back days is fine', () => {
  const warn = scheduleWarnings(ready({ schedule: week({ 1: 'UA', 2: 'LA', 4: 'UB', 5: 'LB' }) }).profile);
  assert.deepEqual(warn, []);
});

test('no warnings when the schedule is off', () => {
  assert.deepEqual(scheduleWarnings(ready().profile), []);
});
