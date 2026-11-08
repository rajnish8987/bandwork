// Draws and animates an exercise figure as SVG. The body uses the surrounding
// text colour; the band has a core in --band with an outline in the text colour,
// so it stays visible on every band colour, including its own.

import { t } from '../core/i18n.js';
import { blendPoses, FLOOR_Y, solvePose, VIEW } from './figure-math.js';

const SVG = 'http://www.w3.org/2000/svg';
const LIFT_MS = 1100;
const HOLD_MS = 260;
const LOWER_MS = 1700;
const PAUSE_MS = 340;
const CYCLE_MS = LIFT_MS + HOLD_MS + LOWER_MS + PAUSE_MS;

const ease = (t) => t * t * (3 - 2 * t);

function phaseAt(ms) {
  const t = ms % CYCLE_MS;
  if (t < LIFT_MS) return ease(t / LIFT_MS);
  if (t < LIFT_MS + HOLD_MS) return 1;
  if (t < LIFT_MS + HOLD_MS + LOWER_MS) return 1 - ease((t - LIFT_MS - HOLD_MS) / LOWER_MS);
  return 0;
}

function el(name, attrs, parent) {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent.append(node);
  return node;
}

function line(parent, width, extra = {}) {
  return el('line', { 'stroke-width': width, 'stroke-linecap': 'round', stroke: 'currentColor', ...extra }, parent);
}

function place(node, a, b) {
  node.setAttribute('x1', a[0]);
  node.setAttribute('y1', a[1]);
  node.setAttribute('x2', b[0]);
  node.setAttribute('y2', b[1]);
}

function buildScene(svg, exercise) {
  el('line', { x1: 6, y1: FLOOR_Y, x2: VIEW.w - 6, y2: FLOOR_Y, stroke: 'currentColor', 'stroke-width': 2, opacity: 0.45 }, svg);

  if (exercise.door) {
    const [x, y] = exercise.door;
    if (exercise.doorFlat) {
      // A door seen face-on behind the figure, for movements done side-on to the door.
      el('rect', { x: x - 34, y: 6, width: 68, height: FLOOR_Y - 6, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, opacity: 0.4 }, svg);
    } else {
      const edge = x < VIEW.w / 2 ? 4 : VIEW.w - 4;
      el('line', { x1: edge, y1: 6, x2: edge, y2: FLOOR_Y, stroke: 'currentColor', 'stroke-width': 5, opacity: 0.4 }, svg);
    }
    el('circle', { cx: x, cy: y, r: 4, fill: 'currentColor' }, svg);
  }

  const farOpacity = exercise.view === 'side' ? 0.5 : 1;
  const far = {
    upper: line(svg, 8, { opacity: farOpacity }),
    fore: line(svg, 7, { opacity: farOpacity }),
    thigh: line(svg, 10, { opacity: farOpacity }),
    shin: line(svg, 8, { opacity: farOpacity }),
    foot: line(svg, 6, { opacity: farOpacity }),
  };
  const torso = line(svg, 15);
  const shoulderBar = line(svg, 12);
  const hipBar = line(svg, 13);
  const head = el('circle', { r: 11, fill: 'currentColor' }, svg);
  const near = {
    upper: line(svg, 8),
    fore: line(svg, 7),
    thigh: line(svg, 10),
    shin: line(svg, 8),
    foot: line(svg, 6),
  };
  const bands = (exercise.band ?? []).map(() => ({
    outer: line(svg, 8, { 'data-band-outer': '' }),
    inner: line(svg, 5, { stroke: 'var(--band, #D92D20)' }),
  }));
  const hands = [el('circle', { r: 5, fill: 'currentColor' }, svg), el('circle', { r: 5, fill: 'currentColor', opacity: farOpacity }, svg)];
  return { far, near, torso, shoulderBar, hipBar, head, bands, hands };
}

function drawFrame(scene, exercise, t) {
  const { points: p } = solvePose(blendPoses(exercise.poses[0], exercise.poses[1], t), exercise);
  const limb = (parts, i) => {
    place(parts.upper, p[`shoulder${i}`], p[`elbow${i}`]);
    place(parts.fore, p[`elbow${i}`], p[`hand${i}`]);
    place(parts.thigh, p[`hip${i}`], p[`knee${i}`]);
    place(parts.shin, p[`knee${i}`], p[`foot${i}`]);
    place(parts.foot, p[`foot${i}`], p[`toe${i}`] ?? p[`foot${i}`]);
  };
  limb(scene.near, 0);
  limb(scene.far, 1);
  place(scene.torso, p.hipCentre, p.neck);
  place(scene.shoulderBar, p.shoulder0, p.shoulder1);
  place(scene.hipBar, p.hip0, p.hip1);
  scene.head.setAttribute('cx', p.head[0]);
  scene.head.setAttribute('cy', p.head[1]);
  scene.hands[0].setAttribute('cx', p.hand0[0]);
  scene.hands[0].setAttribute('cy', p.hand0[1]);
  scene.hands[1].setAttribute('cx', p.hand1[0]);
  scene.hands[1].setAttribute('cy', p.hand1[1]);

  (exercise.band ?? []).forEach(([from, to], i) => {
    const a = from === 'door' ? exercise.door : p[from];
    const b = to === 'door' ? exercise.door : p[to];
    const length = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const width = Math.max(2.5, Math.min(6.5, 7.5 - length * 0.04)); // thins as it stretches
    const { outer, inner } = scene.bands[i];
    place(outer, a, b);
    place(inner, a, b);
    outer.setAttribute('stroke-width', width + 3.5);
    inner.setAttribute('stroke-width', width);
  });
}

const running = new Set();

function loop(now) {
  for (const f of running) drawFrame(f.scene, f.exercise, phaseAt(now - f.start));
  if (running.size) requestAnimationFrame(loop);
}

/** Draws a figure into a container. Returns nothing; call stopFigures before replacing it. */
export function mountFigure(container, exercise) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW.w} ${VIEW.h}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t('Animated figure showing {name}', { name: t(exercise.name) }));
  svg.classList.add('figure');
  container.replaceChildren(svg);
  const scene = buildScene(svg, exercise);

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    drawFrame(scene, exercise, 1);
    return;
  }
  drawFrame(scene, exercise, 0);
  const wasIdle = running.size === 0;
  running.add({ scene, exercise, start: performance.now() });
  if (wasIdle) requestAnimationFrame(loop);
}

export function stopFigures() {
  running.clear();
}
