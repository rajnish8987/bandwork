import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, loadState, saveState, makeBackup, parseBackup, STORAGE_KEY, newBand } from '../public/js/core/store.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
    data,
  };
}

test('first launch returns a fresh state', () => {
  const s = loadState(memoryStorage());
  assert.equal(s.profile.onboarded, false);
  assert.deepEqual(s.workouts, []);
  assert.equal(s.active, null);
  assert.equal(s.profile.bands.length, 5);
});

test('state survives a save and load', () => {
  const storage = memoryStorage();
  const s = defaultState();
  s.profile.goal = 'strength';
  assert.equal(saveState(storage, s), true);
  assert.equal(loadState(storage).profile.goal, 'strength');
});

test('corrupt saved data is kept aside, not lost', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: '{not json' });
  const s = loadState(storage);
  assert.equal(s.profile.onboarded, false);
  assert.equal(storage.getItem(`${STORAGE_KEY}.corrupt`), '{not json');
});

test('saving reports failure when storage is full', () => {
  const storage = { setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(saveState(storage, defaultState()), false);
});

test('older saves gain new profile fields on load', () => {
  const old = defaultState();
  delete old.profile.vibrate;
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(old) });
  assert.equal(loadState(storage).profile.vibrate, true);
});

test('backup round-trips', () => {
  const s = defaultState();
  s.profile.onboarded = true;
  s.workouts.push({
    id: 'w1', name: 'Full body A', templateId: 'A', startedAt: 1, finishedAt: 2,
    exercises: [{ exerciseId: 'squat', sets: [{ reps: 10, bandIds: ['b1'], kg: 10, label: 'Red', colors: ['#D92D20'], at: 2 }] }],
  });
  const restored = parseBackup(makeBackup(s));
  assert.deepEqual(restored.workouts, s.workouts);
  assert.equal(restored.profile.onboarded, true);
});

test('a backup drops any workout in progress', () => {
  const s = defaultState();
  s.active = { id: 'x', exercises: [] };
  assert.equal(parseBackup(makeBackup(s)).active, null);
});

test('rejects text that is not JSON', () => {
  assert.throws(() => parseBackup('hello'), /not a Tensile backup/);
});

test('rejects JSON from another app', () => {
  assert.throws(() => parseBackup('{"foo":1}'), /not a Tensile backup/);
});

test('rejects band colours that are not plain hex', () => {
  const s = defaultState();
  s.profile.bands[0].color = 'red;background:url(x)';
  assert.throws(() => parseBackup(makeBackup(s)), /band/i);
});

test('rejects bands with invalid tension', () => {
  const s = defaultState();
  s.profile.bands[0].kg = -4;
  assert.throws(() => parseBackup(makeBackup(s)), /band/i);
});

test('rejects malformed workouts', () => {
  const s = defaultState();
  s.workouts.push({ id: 'w', exercises: 'nope' });
  assert.throws(() => parseBackup(makeBackup(s)), /workout/i);
});

test('rejects colours inside logged sets that are not plain hex', () => {
  const s = defaultState();
  s.workouts.push({
    id: 'w', name: 'x', startedAt: 1, finishedAt: 2,
    exercises: [{ exerciseId: 'squat', sets: [{ reps: 1, kg: 1, label: 'x', bandIds: [], colors: ['url(x)'] }] }],
  });
  assert.throws(() => parseBackup(makeBackup(s)), /workout/i);
});

test('a backup with unknown plan settings falls back to safe values', () => {
  const s = defaultState();
  Object.assign(s.profile, { goal: 'nonsense', daysPerWeek: 9, minutes: 'long', nextIndex: -3, swaps: null });
  const { profile } = parseBackup(makeBackup(s));
  assert.equal(profile.goal, 'muscle');
  assert.equal(profile.daysPerWeek, 3);
  assert.equal(profile.minutes, 30);
  assert.equal(profile.nextIndex, 0);
  assert.deepEqual(profile.swaps, {});
});

test('new bands get distinct ids without needing a secure page', () => {
  const ids = new Set(Array.from({ length: 50 }, () => newBand('Red', '#D92D20', 10).id));
  assert.equal(ids.size, 50);
});
