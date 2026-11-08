// Geometry for the animated exercise figure. No DOM here, so it can be tested.

export const VIEW = { w: 200, h: 200 };
export const FLOOR_Y = 184;

export const LIMBS = {
  torso: 52,
  neck: 15,
  upperArm: 26,
  foreArm: 24,
  thigh: 33,
  shin: 33,
  shoulderHalf: 16,
  hipHalf: 8,
  footLength: 11,
  reachTolerance: 2,
};

const lerp = (a, b, t) => a + (b - a) * t;
const lerpPoint = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export function blendPoses(a, b, t) {
  const pose = {
    hip: lerpPoint(a.hip, b.hip, t),
    torso: lerp(a.torso, b.torso, t),
    hands: [lerpPoint(a.hands[0], b.hands[0], t), lerpPoint(a.hands[1], b.hands[1], t)],
    feet: [lerpPoint(a.feet[0], b.feet[0], t), lerpPoint(a.feet[1], b.feet[1], t)],
  };
  if (a.toes && b.toes) pose.toes = [lerpPoint(a.toes[0], b.toes[0], t), lerpPoint(a.toes[1], b.toes[1], t)];
  return pose;
}

/** Two-bone inverse kinematics. `bend` (+1 or -1) picks which way the joint folds. */
export function solveLimb(root, target, first, second, bend) {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const reach = first + second;
  const distance = Math.hypot(dx, dy);
  const ux = distance > 1e-6 ? dx / distance : 0;
  const uy = distance > 1e-6 ? dy / distance : 1;
  const d = Math.max(Math.abs(first - second) + 1e-6, Math.min(distance, reach));
  const along = (first * first - second * second + d * d) / (2 * d);
  const out = Math.sqrt(Math.max(0, first * first - along * along));
  const joint = [root[0] + along * ux - bend * out * uy, root[1] + along * uy + bend * out * ux];
  const end = distance > reach || distance < d
    ? [root[0] + d * ux, root[1] + d * uy]
    : [target[0], target[1]];
  return { joint, end };
}

const fromAngle = (origin, degrees, length) => {
  const a = (degrees * Math.PI) / 180;
  return [origin[0] + Math.sin(a) * length, origin[1] + Math.cos(a) * length];
};

/** Turns a pose into every joint position needed to draw the figure. */
export function solvePose(pose, exercise) {
  const front = exercise.view === 'front';
  const neck = fromAngle(pose.hip, pose.torso, LIMBS.torso);
  const head = fromAngle(neck, pose.torso, LIMBS.neck);
  const across = pose.torso + 90;
  const shoulders = front
    ? [fromAngle(neck, across, LIMBS.shoulderHalf), fromAngle(neck, across, -LIMBS.shoulderHalf)]
    : [neck, neck];
  const hips = front
    ? [[pose.hip[0] - LIMBS.hipHalf, pose.hip[1]], [pose.hip[0] + LIMBS.hipHalf, pose.hip[1]]]
    : [pose.hip, pose.hip];

  const points = {
    neck, head, hipCentre: pose.hip, back: fromAngle(pose.hip, pose.torso, LIMBS.torso * 0.85),
  };
  for (const i of [0, 1]) {
    const arm = solveLimb(shoulders[i], pose.hands[i], LIMBS.upperArm, LIMBS.foreArm, exercise.elbows[i]);
    const leg = solveLimb(hips[i], pose.feet[i], LIMBS.thigh, LIMBS.shin, exercise.knees[i]);
    points[`shoulder${i}`] = shoulders[i];
    points[`elbow${i}`] = arm.joint;
    points[`hand${i}`] = arm.end;
    points[`hip${i}`] = hips[i];
    points[`knee${i}`] = leg.joint;
    points[`foot${i}`] = leg.end;
    if (pose.toes) points[`toe${i}`] = pose.toes[i];
    else if (!front) points[`toe${i}`] = [leg.end[0] + LIMBS.footLength, leg.end[1]];
  }
  return { points };
}
