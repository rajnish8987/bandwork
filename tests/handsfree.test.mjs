import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AFTER_TARGET_MS, createHandsUp, createSetWatcher, GET_READY_MS, gestureAllowed, handsAboveHead, HANDS_UP_MS, repsToLog, STOPPED_MS,
} from '../public/js/core/handsfree.js';

const START = 1000;
const counting = START + GET_READY_MS;

test('a set gives time to get ready before anything counts', () => {
  const watcher = createSetWatcher({ target: 10, startedAt: START });
  assert.equal(watcher.update(0, START).phase, 'ready');
  assert.equal(watcher.update(0, counting - 1).phase, 'ready');
  assert.equal(watcher.update(0, counting).phase, 'counting');
});

test('reaching the target and pausing ends the set', () => {
  const watcher = createSetWatcher({ target: 2, startedAt: START });
  watcher.update(1, counting + 1000);
  assert.equal(watcher.update(2, counting + 2000).phase, 'counting');
  assert.equal(watcher.update(2, counting + 2000 + AFTER_TARGET_MS - 1).phase, 'counting');
  assert.equal(watcher.update(2, counting + 2000 + AFTER_TARGET_MS).phase, 'finish');
});

test('going past the target keeps the set open while reps keep coming', () => {
  const watcher = createSetWatcher({ target: 2, startedAt: START });
  watcher.update(2, counting + 2000);
  assert.equal(watcher.update(3, counting + 2000 + AFTER_TARGET_MS).phase, 'counting');
  assert.equal(watcher.update(3, counting + 2000 + AFTER_TARGET_MS + 1000).phase, 'counting');
});

test('stopping short of the target ends the set after a longer wait', () => {
  const watcher = createSetWatcher({ target: 10, startedAt: START });
  watcher.update(4, counting + 1000);
  assert.equal(watcher.update(4, counting + 1000 + STOPPED_MS - 1).phase, 'counting');
  assert.equal(watcher.update(4, counting + 1000 + STOPPED_MS).phase, 'finish');
});

test('nothing is logged while no rep has been counted, however long it takes', () => {
  const watcher = createSetWatcher({ target: 10, startedAt: START });
  assert.equal(watcher.update(0, counting + 600000).phase, 'counting');
});

test('one side done: it says to switch, and waits for the other side', () => {
  const watcher = createSetWatcher({ target: 2, perSide: true, startedAt: START });
  watcher.update(1, counting + 1000);
  const reached = watcher.update(2, counting + 2000);
  assert.equal(reached.switchSides, true);
  assert.equal(watcher.update(2, counting + 2500).switchSides, false, 'only once');
  assert.equal(watcher.update(2, counting + 2000 + AFTER_TARGET_MS).phase, 'counting', 'not finished at the switch');
  assert.equal(watcher.update(3, counting + 8000).phase, 'counting');
  assert.equal(watcher.update(3, counting + 8000 + STOPPED_MS).phase, 'finish');
});

test('how many reps to log', () => {
  assert.equal(repsToLog({ count: 9, target: 12 }), 9);
  assert.equal(repsToLog({ count: 14, target: 12 }), 14);
  assert.equal(repsToLog({ count: 0, target: 12 }), 12, 'the camera saw nothing, so the plan stands');
  assert.equal(repsToLog({ count: 24, target: 12, perSide: true }), 12, 'both sides count together on the camera');
  assert.equal(repsToLog({ count: 7, target: 12, perSide: true }), 7);
});

/* ---------- Raising both hands ---------- */

function pose({ left = 0.5, right = 0.5, nose = 0 } = {}) {
  const points = Array.from({ length: 33 }, () => ({ x: 0, y: 0.2, z: 0, visibility: 1 }));
  points[0] = { x: 0, y: nose, z: 0, visibility: 1 };
  points[15] = { x: -0.2, y: left, z: 0, visibility: 1 };
  points[16] = { x: 0.2, y: right, z: 0, visibility: 1 };
  return points;
}
const UP = -0.2;

test('both wrists must be above the head', () => {
  assert.equal(handsAboveHead(pose({ left: UP, right: UP })), true);
  assert.equal(handsAboveHead(pose({ left: UP })), false);
  assert.equal(handsAboveHead(pose()), false);
  assert.equal(handsAboveHead(null), false);
  const hidden = pose({ left: UP, right: UP });
  hidden[15] = { ...hidden[15], visibility: 0.1 };
  assert.equal(handsAboveHead(hidden), false, 'a wrist it cannot see does not count');
});

test('the gesture fires once, after a hold, and again only after lowering', () => {
  const gesture = createHandsUp();
  const up = pose({ left: UP, right: UP });
  assert.equal(gesture.update(up, 0), false);
  assert.equal(gesture.update(up, HANDS_UP_MS - 1), false);
  assert.equal(gesture.update(up, HANDS_UP_MS), true);
  assert.equal(gesture.update(up, HANDS_UP_MS + 1000), false, 'once per hold');
  assert.equal(gesture.update(pose(), HANDS_UP_MS + 1100), false);
  assert.equal(gesture.update(up, HANDS_UP_MS + 1200), false);
  assert.equal(gesture.update(up, 2 * HANDS_UP_MS + 1200), true);
});

test('a brief raise, as in a press, does not fire', () => {
  const gesture = createHandsUp();
  assert.equal(gesture.update(pose({ left: UP, right: UP }), 0), false);
  assert.equal(gesture.update(pose(), HANDS_UP_MS - 500), false);
  assert.equal(gesture.update(pose({ left: UP, right: UP }), HANDS_UP_MS), false);
});

test('the gesture waits for a pause in the reps, and for overhead moves until after the first rep', () => {
  assert.equal(gestureAllowed({ exerciseId: 'squat', count: 0, sinceRepMs: 0 }), true);
  assert.equal(gestureAllowed({ exerciseId: 'overhead-press', count: 3, sinceRepMs: 500 }), false, 'mid set');
  assert.equal(gestureAllowed({ exerciseId: 'overhead-press', count: 3, sinceRepMs: 4000 }), true, 'paused');
  assert.equal(gestureAllowed({ exerciseId: 'overhead-triceps', count: 0, sinceRepMs: 60000 }), false, 'hands start overhead');
});
