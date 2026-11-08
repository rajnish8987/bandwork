import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveLimb, solvePose, blendPoses, FLOOR_Y, LIMBS, VIEW } from '../public/js/ui/figure-math.js';
import { EXERCISES } from '../public/js/core/exercises.js';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test('a limb keeps its bone lengths when the target is in reach', () => {
  const { joint, end } = solveLimb([100, 60], [130, 80], 26, 24, 1);
  assert.ok(Math.abs(dist([100, 60], joint) - 26) < 1e-6);
  assert.ok(Math.abs(dist(joint, end) - 24) < 1e-6);
  assert.deepEqual(end, [130, 80]);
});

test('a limb straightens toward a target out of reach', () => {
  const { end } = solveLimb([0, 0], [500, 0], 26, 24, 1);
  assert.ok(Math.abs(end[0] - 50) < 1e-6);
  assert.ok(Math.abs(end[1]) < 1e-6);
});

test('a limb handles a target exactly on its root', () => {
  const { joint, end } = solveLimb([10, 10], [10, 10], 26, 24, 1);
  assert.ok(Number.isFinite(joint[0]) && Number.isFinite(end[1]));
});

test('blending halfway averages hip, torso and hand positions', () => {
  const a = { hip: [0, 0], torso: 180, hands: [[0, 0], [0, 0]], feet: [[0, 0], [0, 0]] };
  const b = { hip: [10, 20], torso: 160, hands: [[10, 10], [20, 20]], feet: [[0, 0], [4, 4]] };
  const mid = blendPoses(a, b, 0.5);
  assert.deepEqual(mid.hip, [5, 10]);
  assert.equal(mid.torso, 170);
  assert.deepEqual(mid.hands[1], [10, 10]);
});

test('lying leg curl keeps the thigh on the floor while the shin lifts', () => {
  const e = EXERCISES.find((x) => x.id === 'leg-curl');
  const { points } = solvePose(e.poses[1], e);
  assert.ok(points.knee0[1] > 155, `knee lifted to y=${points.knee0[1].toFixed(0)}`);
  assert.ok(points.foot0[1] < points.knee0[1] - 20, 'shin should rise from the knee');
});

for (const e of EXERCISES) {
  test(`${e.id}: no joint passes through the floor at any point in the movement`, () => {
    for (let t = 0; t <= 1; t += 0.1) {
      const { points } = solvePose(blendPoses(e.poses[0], e.poses[1], t), e);
      for (const [name, p] of Object.entries(points)) {
        assert.ok(p[1] <= FLOOR_Y, `${name} at y=${p[1].toFixed(0)}, t=${t.toFixed(1)}`);
      }
    }
  });

  test(`${e.id}: every pose stays inside the frame with limbs reaching their targets`, () => {
    for (const pose of e.poses) {
      const s = solvePose(pose, e);
      for (const [name, p] of Object.entries(s.points)) {
        assert.ok(p[0] >= 0 && p[0] <= VIEW.w && p[1] >= 0 && p[1] <= VIEW.h, `${name} outside frame: ${p}`);
      }
      for (const i of [0, 1]) {
        assert.ok(dist(s.points[`hand${i}`], pose.hands[i]) < LIMBS.reachTolerance, `hand${i} misses target by ${dist(s.points[`hand${i}`], pose.hands[i]).toFixed(1)}`);
        assert.ok(dist(s.points[`foot${i}`], pose.feet[i]) < LIMBS.reachTolerance, `foot${i} misses target by ${dist(s.points[`foot${i}`], pose.feet[i]).toFixed(1)}`);
      }
    }
  });
}
