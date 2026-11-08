import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AUTO_PHASE_NAMES, autoProgram, SHORT_TERM_WEEKS } from '../public/js/core/autoplan.js';
import { EXERCISES, exerciseById, isAvailable } from '../public/js/core/exercises.js';
import { buildPlan, repRange, volumeFor } from '../public/js/core/plan.js';
import { programStatus, sessionSettings } from '../public/js/core/programs.js';
import { labelFor, loadOf, prescribe, suggestBand } from '../public/js/core/progression.js';
import { lighterWeekStatus } from '../public/js/core/recovery.js';
import { defaultWeek } from '../public/js/core/schedule.js';
import { sessionMinutes, startSession } from '../public/js/core/session.js';
import { defaultBands, defaultState, makeBackup, parseBackup, STANDARD_TENSIONS } from '../public/js/core/store.js';
import { APP_NAME, APP_VERSION, CREDITS } from '../public/js/core/version.js';

const NOW = new Date(2026, 10, 11, 18, 0, 0).getTime();
const WEEK = 7 * 86400000;

function ready(profile = {}) {
  const s = defaultState();
  s.profile.onboarded = true;
  Object.assign(s.profile, profile);
  return s;
}

const tensions = (bands) => Object.fromEntries(bands.map((b) => [b.name, b.kg]));

/* ---------- Band defaults ---------- */

test('bands default to the agreed tensions', () => {
  assert.deepEqual(tensions(defaultBands()), { Yellow: 4.5, Red: 6.8, Blue: 11.3, Green: 9, Black: 13.6 });
  assert.deepEqual(STANDARD_TENSIONS, { Yellow: 4.5, Red: 6.8, Blue: 11.3, Green: 9, Black: 13.6 });
});

/* ---------- Level suggests a band ---------- */

const bands = defaultBands();
const named = (id, level) => labelFor(suggestBand(exerciseById(id), bands, level).bandIds, bands);

test('a beginner starts lightest, and each level starts stronger', () => {
  for (const e of EXERCISES) {
    const load = (level) => loadOf(suggestBand(e, bands, level).bandIds, bands);
    assert.ok(load('beginner') < load('intermediate'), `${e.id} beginner`);
    assert.ok(load('intermediate') < load('master'), `${e.id} master`);
  }
});

test('band suggestions follow the colours for each kind of exercise', () => {
  assert.equal(named('curl', 'beginner'), 'Yellow');
  assert.equal(named('seated-row', 'beginner'), 'Red');
  assert.equal(named('squat', 'beginner'), 'Green');
  assert.equal(named('curl', 'intermediate'), 'Red');
  assert.equal(named('seated-row', 'intermediate'), 'Blue');
  assert.equal(named('squat', 'master'), 'Blue + Black');
});

test('suggestions use a single band when one fits as well as a stack', () => {
  assert.deepEqual(suggestBand(exerciseById('seated-row'), bands, 'intermediate').bandIds.length, 1);
});

test('suggestions work with whatever bands the person owns', () => {
  const own = [{ id: 'x', name: 'Mine', color: '#111111', kg: 30 }];
  assert.deepEqual(suggestBand(exerciseById('curl'), own, 'beginner').bandIds, ['x']);
  assert.deepEqual(suggestBand(exerciseById('curl'), [], 'beginner').bandIds, []);
});

test('the first target follows the level and says why', () => {
  const range = repRange('muscle');
  const t = prescribe(exerciseById('squat'), [], bands, range, 'beginner');
  assert.equal(labelFor(t.bandIds, bands), 'Green');
  assert.match(t.note, /Green/);
  const history = [{ sets: [{ reps: 10, kg: 13.6, bandIds: [bands[4].id] }] }];
  assert.deepEqual(prescribe(exerciseById('squat'), history, bands, range, 'beginner').bandIds, [bands[4].id], 'history wins over level');
});

test('a master gets an extra set, and a beginner does not', () => {
  const base = startSession(ready({ level: 'beginner' }), NOW).active.exercises[0].targetSets;
  assert.equal(startSession(ready({ level: 'intermediate' }), NOW).active.exercises[0].targetSets, base);
  assert.equal(startSession(ready({ level: 'master' }), NOW).active.exercises[0].targetSets, base + 1);
});

/* ---------- More settings ---------- */

test('every number of days from 2 to 7 has a full, varied plan', () => {
  for (const daysPerWeek of [2, 3, 4, 5, 6, 7]) {
    const plan = buildPlan({ ...ready().profile, daysPerWeek, hasAnchor: true, hasMini: true, minutes: 45 });
    assert.equal(plan.length, daysPerWeek, `${daysPerWeek} days`);
    for (const t of plan) {
      assert.ok(t.exerciseIds.length >= 5, `${t.name}: ${t.exerciseIds.length}`);
      assert.equal(new Set(t.exerciseIds).size, t.exerciseIds.length, t.name);
    }
    assert.equal(new Set(plan.map((t) => t.id)).size, daysPerWeek);
  }
});

test('the plan still works with bands alone at every number of days', () => {
  for (const daysPerWeek of [2, 3, 4, 5, 6, 7]) {
    for (const t of buildPlan({ ...ready().profile, daysPerWeek, minutes: 15 })) assert.ok(t.exerciseIds.length >= 3, t.name);
  }
});

test('a week of any length spreads over the calendar', () => {
  for (const daysPerWeek of [2, 3, 4, 5, 6, 7]) {
    const chosen = Object.values(defaultWeek(ready({ daysPerWeek }).profile)).filter(Boolean);
    assert.equal(chosen.length, daysPerWeek);
  }
});

test('session lengths from 15 to 60 minutes change the size of the workout', () => {
  const size = (m) => volumeFor(m).exercises * volumeFor(m).sets;
  assert.ok(size(15) < size(20) && size(20) < size(30) && size(30) < size(45) && size(45) < size(60));
  const estimate = (minutes) => sessionMinutes(startSession(ready({ minutes, daysPerWeek: 3 }), NOW).active);
  assert.ok(estimate(15) <= 20, `15 minutes estimated at ${estimate(15)}`);
  assert.ok(estimate(60) >= 45, `60 minutes estimated at ${estimate(60)}`);
});

test('the new goals have their own rep ranges and rest', () => {
  assert.deepEqual(repRange('fitness'), { min: 10, max: 15, rest: 60 });
  assert.deepEqual(repRange('fatloss'), { min: 12, max: 20, rest: 30 });
});

test('a chosen rest time replaces the automatic one', () => {
  assert.equal(startSession(ready({ rest: 90 }), NOW).active.range.rest, 90);
  assert.equal(startSession(ready({ rest: 'auto' }), NOW).active.range.rest, repRange('muscle').rest);
  assert.ok(startSession(ready({ rest: 180 }), NOW, { quick: true }).active.range.rest <= 45, 'a quick session stays quick');
});

test('a focus area adds a set to matching exercises only', () => {
  const plain = startSession(ready(), NOW).active.exercises;
  const lower = startSession(ready({ focus: 'lower' }), NOW).active.exercises;
  lower.forEach((e, i) => {
    const isLower = ['squat', 'hinge', 'glute', 'calf'].includes(exerciseById(e.exerciseId).pattern);
    assert.equal(e.targetSets, plain[i].targetSets + (isLower ? 1 : 0), e.exerciseId);
  });
  assert.ok(startSession(ready({ focus: 'lower' }), NOW, { quick: true }).active.exercises.every((e) => e.targetSets === 2));
});

test('exercises for a sore area are left out, including when swapping', () => {
  const profile = { ...ready().profile, avoid: ['knees'] };
  assert.equal(isAvailable(exerciseById('squat'), profile), false);
  assert.equal(isAvailable(exerciseById('curl'), profile), true);
  const ids = buildPlan({ ...profile, daysPerWeek: 3, minutes: 45 }).flatMap((t) => t.exerciseIds);
  for (const gone of ['squat', 'split-squat']) assert.ok(!ids.includes(gone), gone);
});

test('even avoiding every area leaves a workout to do', () => {
  const plan = buildPlan({ ...ready().profile, avoid: ['knees', 'back', 'shoulders'], minutes: 30 });
  assert.ok(plan.every((t) => t.exerciseIds.length >= 2), plan.map((t) => t.exerciseIds.length).join());
});

test('automatic lighter weeks can be turned off', () => {
  const s = ready({ autoLighter: false });
  const band = s.profile.bands[1];
  for (let w = 6; w >= 1; w -= 1) {
    const at = NOW - w * WEEK;
    s.workouts.push({ id: `w${w}`, name: 'A', startedAt: at - 1000, finishedAt: at, exercises: [{ exerciseId: 'squat', sets: [{ reps: 9, bandIds: [band.id], kg: band.kg, label: band.name, colors: [band.color], at }] }] });
  }
  assert.equal(lighterWeekStatus(s, NOW).active, false);
  s.profile.autoLighter = true;
  assert.equal(lighterWeekStatus(s, NOW).active, true);
});

test('a backup keeps the new settings and cleans bad ones', () => {
  const s = ready({ level: 'master', focus: 'core', avoid: ['knees', 'nonsense'], rest: 90, daysPerWeek: 7, minutes: 60, goal: 'fatloss', autoLighter: false });
  const { profile } = parseBackup(makeBackup(s));
  assert.equal(profile.level, 'master');
  assert.equal(profile.focus, 'core');
  assert.deepEqual(profile.avoid, ['knees']);
  assert.equal(profile.rest, 90);
  assert.equal(profile.daysPerWeek, 7);
  assert.equal(profile.minutes, 60);
  assert.equal(profile.goal, 'fatloss');
  assert.equal(profile.autoLighter, false);
  const bad = parseBackup(makeBackup(ready({ level: 'god', focus: 'x', rest: -5, daysPerWeek: 9, minutes: 3, goal: 'y' }))).profile;
  assert.deepEqual([bad.level, bad.focus, bad.rest, bad.daysPerWeek, bad.minutes, bad.goal], ['beginner', 'balanced', 'auto', 3, 30, 'muscle']);
});

/* ---------- Automatic short and long term plan ---------- */

const levels = ['beginner', 'intermediate', 'master'];
const goals = ['strength', 'muscle', 'endurance', 'fitness', 'fatloss'];

test('every level and goal gets a short term block and a long term plan', () => {
  for (const level of levels) {
    for (const goal of goals) {
      const plan = autoProgram({ level, goal });
      assert.equal(plan.phases.filter((p) => p.term === 'short').reduce((n, p) => n + p.weeks, 0), SHORT_TERM_WEEKS, `${level} ${goal}`);
      assert.equal(plan.phases.filter((p) => p.term === 'long').reduce((n, p) => n + p.weeks, 0), 24, `${level} ${goal}`);
      for (const p of plan.phases) {
        assert.ok(repRange(p.goal), p.name);
        assert.ok(AUTO_PHASE_NAMES.includes(p.name), p.name);
      }
      assert.ok(plan.phases.some((p) => p.term === 'short' && p.lighter));
      assert.ok(plan.phases.filter((p) => p.term === 'long' && p.lighter).length >= 3);
    }
  }
});

test('a beginner eases in, and the plan ends on the person\'s goal', () => {
  const beginner = autoProgram({ level: 'beginner', goal: 'strength' });
  assert.equal(beginner.phases[0].name, 'Learn the moves');
  assert.ok(beginner.phases[0].setsDelta < 0);
  assert.notEqual(autoProgram({ level: 'master', goal: 'strength' }).phases[0].name, 'Learn the moves');
  for (const goal of goals) {
    const work = autoProgram({ level: 'intermediate', goal }).phases.filter((p) => !p.lighter);
    assert.equal(work.at(-1).goal, goal, goal);
  }
});

test('never more than five hard weeks pass without a lighter one', () => {
  for (const level of levels) {
    let hard = 0;
    for (const p of autoProgram({ level, goal: 'muscle' }).phases) {
      if (p.lighter) hard = 0;
      else hard += p.weeks;
      assert.ok(hard <= 5, `${level}: ${hard}`);
    }
  }
});

test('the plan runs on the calendar and follows changes to level and goal', () => {
  const profile = { ...ready().profile, level: 'beginner', goal: 'muscle', program: { id: 'auto', startedAt: NOW } };
  const first = programStatus(profile, NOW);
  assert.equal(first.week, 1);
  assert.equal(first.totalWeeks, 28);
  assert.equal(first.phase.term, 'short');
  assert.equal(programStatus(profile, NOW + 4 * WEEK).phase.term, 'long');
  assert.equal(programStatus(profile, NOW + 28 * WEEK).finished, true);
  const later = { ...profile, goal: 'strength' };
  assert.equal(sessionSettings(later, NOW + 27 * WEEK - WEEK).range.max, repRange('strength').max);
});

test('a session in the first beginner week has fewer sets, and never none', () => {
  const s = ready({ level: 'beginner', program: { id: 'auto', startedAt: NOW } });
  const normal = startSession(ready({ level: 'beginner' }), NOW).active.exercises[0].targetSets;
  assert.equal(startSession(s, NOW).active.exercises[0].targetSets, normal - 1);
  s.profile.minutes = 15;
  assert.ok(startSession(s, NOW).active.exercises[0].targetSets >= 1);
});

/* ---------- Name, credits and matching versions ---------- */

test('the owner and links are right', () => {
  assert.equal(APP_NAME, 'Tensile');
  assert.equal(CREDITS.owner, 'Rajnish Singh');
  assert.equal(CREDITS.linkedin, 'https://www.linkedin.com/in/rajnish8987');
  assert.equal(CREDITS.github, 'https://github.com/rajnish8987');
});

const projectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('web and Android carry the same name and version', () => {
  assert.equal(JSON.parse(projectFile('package.json')).version, APP_VERSION);
  const gradle = projectFile('android/app/build.gradle');
  assert.match(gradle, new RegExp(`versionName "${APP_VERSION.replaceAll('.', '\\.')}"`));
  assert.equal(JSON.parse(projectFile('capacitor.config.json')).appName, APP_NAME);
  assert.equal(JSON.parse(projectFile('public/manifest.webmanifest')).name, APP_NAME);
  assert.match(projectFile('android/app/src/main/res/values/strings.xml'), /<string name="app_name">Tensile<\/string>/);
  assert.match(projectFile('public/index.html'), /<title>Tensile<\/title>/);
});

test('backups and saved data from before the rename still load', () => {
  const old = JSON.stringify({ app: 'bandwork', version: 1, profile: { bands: [{ id: 'y', name: 'Yellow', color: '#F5C518', kg: 5 }] }, workouts: [] });
  assert.equal(parseBackup(old).profile.bands[0].kg, 5);
});

test('the old name appears nowhere a person can read it', () => {
  for (const path of ['public/index.html', 'public/manifest.webmanifest', 'public/js/ui/screens.js', 'public/js/ui/extra-screens.js', 'public/js/ui/camera.js', 'public/js/app.js', 'public/js/core/locales/hi.js', 'public/js/core/locales/es.js', 'public/js/core/reminders.js']) {
    assert.doesNotMatch(projectFile(path), /Bandwork/, path);
  }
});
