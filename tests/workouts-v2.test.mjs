import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prescribe } from '../public/js/core/progression.js';
import { EXERCISES, exerciseById } from '../public/js/core/exercises.js';
import { buildPlan, repRange } from '../public/js/core/plan.js';
import { comebackLevel, lighterWeekStatus } from '../public/js/core/recovery.js';
import { PROGRAMS, programStatus, sessionSettings } from '../public/js/core/programs.js';
import {
  currentStep, finishSession, logSet, sessionMinutes, setEntrySetup, startSession, swapInSession,
} from '../public/js/core/session.js';
import { describeSetup, setupFields } from '../public/js/core/setup.js';
import { COOLDOWN_MOVES, WARMUP_MOVES, cooldownFor, warmupFor } from '../public/js/core/routines.js';
import { tempoAt, TEMPOS } from '../public/js/core/coach.js';
import { defaultState } from '../public/js/core/store.js';
import { blendPoses, FLOOR_Y, solvePose, VIEW } from '../public/js/ui/figure-math.js';

const DAY = 86400000;
const NOW = new Date(2026, 10, 11, 18, 0, 0).getTime(); // a Wednesday

function ready(profile = {}) {
  const s = defaultState();
  s.profile.onboarded = true;
  Object.assign(s.profile, profile);
  return s;
}

function workout(at, band, reps = [10, 10, 10], extra = {}, exerciseId = 'squat', effort) {
  return {
    id: `w${at}`,
    name: 'Full body A',
    templateId: 'A',
    startedAt: at - 1800000,
    finishedAt: at,
    exercises: [{
      exerciseId,
      sets: reps.map((r) => ({ reps: r, bandIds: [band.id], kg: band.kg, label: band.name, colors: [band.color], at, ...(effort ? { effort } : {}) })),
    }],
    ...extra,
  };
}

/* ---------- Effort changes the next target ---------- */

const squat = exerciseById('squat');
const bands = [{ id: 'a', name: 'A', kg: 5, color: '#111111' }, { id: 'b', name: 'B', kg: 10, color: '#222222' }];
const range = { min: 8, max: 15, rest: 75 };
const session = (reps, effort) => ({ sets: reps.map((r) => ({ reps: r, kg: 5, bandIds: ['a'], ...(effort ? { effort } : {}) })) });

test('sets at the limit hold the rep target instead of adding one', () => {
  const t = prescribe(squat, [session([10, 10, 10], 'limit')], bands, range);
  assert.equal(t.repsGoal, 10);
  assert.deepEqual(t.bandIds, ['a']);
});

test('sets that felt easy add two reps instead of one', () => {
  assert.equal(prescribe(squat, [session([10, 10, 10], 'easy')], bands, range).repsGoal, 12);
});

test('reaching the top of the range at the limit stays on the same band', () => {
  const t = prescribe(squat, [session([15, 15, 15], 'limit')], bands, range);
  assert.deepEqual(t.bandIds, ['a']);
  assert.equal(t.repsGoal, 15);
});

test('reaching the top of the range with no effort rating still moves up', () => {
  assert.deepEqual(prescribe(squat, [session([15, 15, 15])], bands, range).bandIds, ['b']);
});

/* ---------- Coming back after a break ---------- */

test('comeback level rises with the length of the break', () => {
  const [band] = defaultState().profile.bands;
  assert.equal(comebackLevel([], NOW), 0);
  assert.equal(comebackLevel([workout(NOW - 13 * DAY, band)], NOW), 0);
  assert.equal(comebackLevel([workout(NOW - 14 * DAY, band)], NOW), 1);
  assert.equal(comebackLevel([workout(NOW - 30 * DAY, band)], NOW), 2);
});

test('a session after a break drops a band, aims low and is marked', () => {
  const s = ready();
  const blue = s.profile.bands[2];
  s.workouts.push(workout(NOW - 20 * DAY, blue));
  const { active } = startSession(s, NOW);
  assert.equal(active.comeback, 1);
  const entry = active.exercises.find((e) => e.exerciseId === 'squat');
  const load = entry.target.bandIds.reduce((sum, id) => sum + s.profile.bands.find((b) => b.id === id).kg, 0);
  assert.ok(load < blue.kg, `load ${load}`);
  assert.equal(entry.target.repsGoal, active.range.min);
  const after = finishSession(logSet({ ...s, active }, { reps: 8, bandIds: entry.target.bandIds }, NOW), NOW + 1000);
  assert.equal(after.workout.comeback, 1);
});

/* ---------- Lighter weeks ---------- */

function weeksOfTraining(s, count, startWeeksAgo = 1) {
  const band = s.profile.bands[1];
  for (let i = count - 1 + startWeeksAgo - 1; i >= startWeeksAgo - 1; i -= 1) {
    s.workouts.push(workout(NOW - (i + 1) * 7 * DAY, band));
  }
  return s;
}

test('no lighter week before six straight weeks of training', () => {
  assert.equal(lighterWeekStatus(weeksOfTraining(ready(), 5), NOW).active, false);
});

test('six straight weeks of training bring a lighter week', () => {
  const status = lighterWeekStatus(weeksOfTraining(ready(), 6), NOW);
  assert.deepEqual(status, { active: true, reason: 'schedule' });
});

test('a gap in training resets the count', () => {
  const s = ready();
  const band = s.profile.bands[1];
  [1, 2, 4, 5, 6, 7, 8].forEach((w) => s.workouts.push(workout(NOW - w * 7 * DAY, band)));
  s.workouts.sort((a, b) => a.finishedAt - b.finishedAt);
  assert.equal(lighterWeekStatus(s, NOW).active, false);
});

test('choosing to train normally turns the lighter week off and restarts the count', () => {
  const s = weeksOfTraining(ready({ lighterSkippedAt: NOW - DAY }), 6);
  assert.equal(lighterWeekStatus(s, NOW).active, false);
  assert.equal(lighterWeekStatus(s, NOW + 7 * DAY).active, false);
});

test('a lighter week lasts the whole week once begun, then the count restarts', () => {
  const s = weeksOfTraining(ready(), 6);
  s.workouts.push(workout(NOW - 2 * 3600000, s.profile.bands[1], [8, 8], { lighter: true }));
  assert.equal(lighterWeekStatus(s, NOW).active, true);
  assert.equal(lighterWeekStatus(s, NOW + 7 * DAY).active, false);
});

test('two workouts mostly at the limit bring a lighter week early', () => {
  const s = ready();
  const band = s.profile.bands[1];
  s.workouts.push(workout(NOW - 3 * DAY, band, [10, 9, 8], {}, 'squat', 'limit'));
  s.workouts.push(workout(NOW - DAY, band, [10, 9, 8], {}, 'squat', 'limit'));
  assert.deepEqual(lighterWeekStatus(s, NOW), { active: true, reason: 'effort' });
});

test('a lighter session has fewer sets, keeps the band, and does not count toward progress', () => {
  const s = weeksOfTraining(ready(), 6);
  const band = s.profile.bands[1];
  const before = startSession(ready(), NOW).active.exercises[0].targetSets;
  const { active } = startSession(s, NOW);
  assert.equal(active.lighter, true);
  const entry = active.exercises.find((e) => e.exerciseId === 'squat');
  assert.equal(entry.targetSets, before - 1);
  assert.deepEqual(entry.target.bandIds, [band.id]);

  s.workouts.push(workout(NOW - 1000, band, [15, 15], { lighter: true }));
  const next = startSession(s, NOW);
  assert.deepEqual(next.active.exercises.find((e) => e.exerciseId === 'squat').target.bandIds, [band.id]);
});

/* ---------- Only 10 minutes ---------- */

test('a quick session has three exercises, two sets, short rest and fits ten minutes', () => {
  const { active } = startSession(ready({ minutes: 45 }), NOW, { quick: true });
  assert.equal(active.exercises.length, 3);
  assert.ok(active.exercises.every((e) => e.targetSets === 2));
  assert.ok(active.range.rest <= 45);
  assert.equal(active.quick, true);
  assert.ok(sessionMinutes(active) <= 10, `${sessionMinutes(active)} minutes`);
});

test('a finished quick session is marked and still moves the rotation on', () => {
  let s = startSession(ready(), NOW, { quick: true });
  s = logSet(s, { reps: 8, bandIds: s.active.exercises[0].target.bandIds }, NOW);
  const { state, workout: saved } = finishSession(s, NOW + 1000);
  assert.equal(saved.quick, true);
  assert.equal(state.profile.nextIndex, 1);
});

/* ---------- Effort and setup are saved ---------- */

test('logging keeps the effort rating', () => {
  let s = startSession(ready(), NOW);
  s = logSet(s, { reps: 9, bandIds: [], effort: 'hard' }, NOW);
  assert.equal(s.active.exercises[0].sets[0].effort, 'hard');
});

test('setup is saved with the workout and offered again next time', () => {
  let s = startSession(ready({ hasAnchor: true }), NOW);
  s = setEntrySetup(s, 0, 'stance', 'wide');
  s = logSet(s, { reps: 9, bandIds: s.active.exercises[0].target.bandIds }, NOW);
  const { state, workout: saved } = finishSession(s, NOW + 1000);
  assert.deepEqual(saved.exercises[0].setup, { stance: 'wide' });
  state.profile.nextIndex = 0;
  assert.deepEqual(startSession(state, NOW + DAY).active.exercises[0].setup, { stance: 'wide' });
});

test('setup fields suit how the band is held', () => {
  const keys = (id) => setupFields(exerciseById(id)).map((f) => f.key);
  assert.deepEqual(keys('squat'), ['stance', 'grip']);
  assert.deepEqual(keys('face-pull'), ['steps', 'grip']);
  assert.deepEqual(keys('lateral-walk'), []);
  assert.deepEqual(keys('pull-apart'), ['grip']);
});

test('setup reads as plain words, and an empty setup reads as nothing', () => {
  assert.equal(describeSetup({ stance: 'wide', grip: 'short' }), 'Wide stance, short grip');
  assert.equal(describeSetup({ steps: 3 }), '3 steps from the door');
  assert.equal(describeSetup({}), '');
  assert.equal(describeSetup(undefined), '');
});

/* ---------- Custom workouts ---------- */

const custom = { id: 'c1', name: 'Arms', exerciseIds: ['curl', 'overhead-triceps'], sets: 4 };

test('a custom workout can be started once, without moving the plan', () => {
  let s = startSession(ready({ customWorkouts: [custom] }), NOW, { customId: 'c1' });
  assert.equal(s.active.name, 'Arms');
  assert.deepEqual(s.active.exercises.map((e) => e.exerciseId), custom.exerciseIds);
  assert.ok(s.active.exercises.every((e) => e.targetSets === 4));
  s = logSet(s, { reps: 8, bandIds: [] }, NOW);
  assert.equal(finishSession(s, NOW + 1).state.profile.nextIndex, 0);
});

test('custom workouts can replace the plan rotation', () => {
  const plan = buildPlan({ ...ready().profile, customWorkouts: [custom], useCustomPlan: true });
  assert.deepEqual(plan.map((p) => p.name), ['Arms']);
  assert.equal(plan[0].sets, 4);
});

test('exercises needing missing equipment are left out, and an empty custom plan falls back', () => {
  const needsAnchor = { id: 'c2', name: 'Door', exerciseIds: ['face-pull'], sets: 3 };
  const plan = buildPlan({ ...ready().profile, customWorkouts: [needsAnchor], useCustomPlan: true });
  assert.ok(plan.some((p) => p.name === 'Full body A'));
});

test('an unknown custom workout falls back to the plan', () => {
  assert.equal(startSession(ready(), NOW, { customId: 'gone' }).active.name, 'Full body A');
});

test('swapping keeps a lighter session lighter', () => {
  const s = weeksOfTraining(ready(), 6);
  const started = startSession(s, NOW);
  const swapped = swapInSession(started, 1, 'push-up');
  assert.equal(swapped.active.exercises[1].target.repsGoal, swapped.active.range.min);
});

/* ---------- Programs ---------- */

test('every program has complete, valid weeks', () => {
  for (const p of PROGRAMS) {
    assert.ok([8, 12].includes(p.phases.reduce((sum, ph) => sum + ph.weeks, 0)), p.id);
    assert.ok(p.phases.some((ph) => ph.lighter), `${p.id} has lighter weeks`);
    for (const ph of p.phases) assert.ok(repRange(ph.goal), ph.name);
  }
});

test('a program sets the week, rep range and sets from its calendar', () => {
  const p = PROGRAMS.find((x) => x.id === 'strength-12');
  const profile = { ...ready().profile, program: { id: p.id, startedAt: NOW - 5 * 7 * DAY } };
  const status = programStatus(profile, NOW);
  assert.equal(status.week, 6);
  assert.equal(status.totalWeeks, 12);
  assert.equal(status.phase.goal, 'strength');
  assert.equal(sessionSettings(profile, NOW).range.max, repRange('strength').max);
});

test('a program with lighter weeks makes those sessions lighter', () => {
  const s = ready();
  s.profile.program = { id: 'foundation-8', startedAt: NOW - 3 * 7 * DAY };
  assert.deepEqual(lighterWeekStatus(s, NOW), { active: true, reason: 'program' });
  assert.equal(startSession(s, NOW).active.lighter, true);
});

test('a program in a normal week stops the automatic lighter week', () => {
  const s = weeksOfTraining(ready(), 6);
  s.profile.program = { id: 'foundation-8', startedAt: NOW };
  assert.equal(lighterWeekStatus(s, NOW).active, false);
});

test('a finished or unknown program is reported and leaves your own goal in charge', () => {
  const profile = { ...ready().profile, goal: 'endurance', program: { id: 'foundation-8', startedAt: NOW - 8 * 7 * DAY } };
  assert.equal(programStatus(profile, NOW).finished, true);
  assert.equal(sessionSettings(profile, NOW).range.max, repRange('endurance').max);
  assert.equal(programStatus({ ...profile, program: { id: 'gone', startedAt: NOW } }, NOW), null);
  assert.equal(programStatus(ready().profile, NOW), null);
});

/* ---------- Tempo count ---------- */

const tempo = { reps: 2, upSeconds: 2, downSeconds: 2, leadInSeconds: 3 };

test('the count opens with a lead-in', () => {
  assert.deepEqual(tempoAt(1000, tempo), { phase: 'ready', rep: 0, completed: 0, side: 1, secondsLeft: 2 });
});

test('each rep has an up and a down phase, in order', () => {
  assert.equal(tempoAt(3000, tempo).phase, 'up');
  assert.equal(tempoAt(3000, tempo).rep, 1);
  assert.equal(tempoAt(5000, tempo).phase, 'down');
  assert.equal(tempoAt(7000, tempo).rep, 2);
  assert.equal(tempoAt(7000, tempo).completed, 1);
});

test('the count finishes with every rep completed', () => {
  assert.deepEqual(tempoAt(11000, tempo), { phase: 'done', rep: 2, completed: 2, side: 1, secondsLeft: 0 });
});

test('a per-side exercise pauses to switch, then counts the second side', () => {
  const opts = { ...tempo, perSide: true, switchSeconds: 5 };
  assert.equal(tempoAt(11000, opts).phase, 'switch');
  const second = tempoAt(16000, opts);
  assert.equal(second.phase, 'up');
  assert.equal(second.side, 2);
  assert.equal(second.rep, 1);
  assert.equal(tempoAt(24000, opts).phase, 'done');
  assert.equal(tempoAt(24000, opts).completed, 2);
});

test('zero reps finish at once, and every tempo has both phases', () => {
  assert.equal(tempoAt(0, { ...tempo, reps: 0, leadInSeconds: 0 }).phase, 'done');
  for (const t of Object.values(TEMPOS)) assert.ok(t.up > 0 && t.down > 0);
});

/* ---------- Warm-up and cool-down ---------- */

function sessionOf(ids) {
  return { exercises: ids.map((exerciseId) => ({ exerciseId })) };
}

test('warm-up length follows the session length', () => {
  const s = sessionOf(['squat', 'curl']);
  assert.equal(warmupFor(s, 20).length, 3);
  assert.equal(warmupFor(s, 30).length, 4);
  assert.equal(warmupFor(s, 45).length, 5);
});

test('a warm-up prepares the muscles of the session', () => {
  const lower = warmupFor(sessionOf(['squat', 'deadlift']), 20).map((m) => m.id);
  assert.ok(lower.includes('warm-squat'));
  const upper = warmupFor(sessionOf(['curl', 'overhead-press']), 20).map((m) => m.id);
  assert.ok(upper.includes('arm-circles'));
  assert.equal(new Set(upper).size, upper.length);
});

test('a cool-down stretches what the session worked', () => {
  const upper = cooldownFor(sessionOf(['wrap-press', 'curl'])).map((m) => m.id);
  assert.ok(upper.includes('chest-stretch'));
  const lower = cooldownFor(sessionOf(['squat', 'deadlift'])).map((m) => m.id);
  assert.ok(lower.includes('hamstring-stretch'));
});

for (const move of [...WARMUP_MOVES, ...COOLDOWN_MOVES]) {
  test(`${move.id}: has a timer, cue and a figure that fits the frame`, () => {
    assert.ok(move.seconds >= 15);
    assert.ok(move.cue.length > 0);
    for (let t = 0; t <= 1; t += 0.25) {
      const { points } = solvePose(blendPoses(move.poses[0], move.poses[1], t), move);
      for (const [name, p] of Object.entries(points)) {
        assert.ok(p[1] <= FLOOR_Y && p[0] >= 0 && p[0] <= VIEW.w && p[1] >= 0, `${name} at ${p}`);
      }
    }
  });
}

test('every exercise is still present', () => {
  assert.equal(EXERCISES.length, 27);
  assert.equal(currentStep(startSession(ready(), NOW).active).setIndex, 0);
});
