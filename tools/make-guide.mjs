// Makes the Guide tab's pictures by driving the real app in Chrome. The tools it
// needs are installed by `npm run apk`, in the build folder outside this project.
// The workouts shown are sample data, and the Camera coach picture is an illustration.

import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const WORK = join(process.env.LOCALAPPDATA ?? '', 'BandworkAndroid', 'work');
const require = createRequire(join(WORK, 'package.json'));
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const OUT = fileURLToPath(new URL('../public/guide/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const WIDTH = 360;
const HEIGHT = 640;
const MAX_FRAME_MS = 400;
const COLOURS = 127;

const server = createAppServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function newPage(deviceScaleFactor) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor, hasTouch: true, isMobile: true, locale: 'en-GB', serviceWorkers: 'block',
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function setUp(page) {
  await page.getByRole('button', { name: 'Build my plan' }).click();
  await page.getByRole('heading', { name: 'Full body A' }).waitFor();
}

/** Shows where a finger lands, then taps. */
async function tap(page, locator, pause = 450) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  await page.evaluate(({ x, y }) => {
    const dot = document.createElement('div');
    dot.style.cssText = `position:fixed;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;background:rgb(217 45 32 / 0.55);border:3px solid #fff;z-index:99;pointer-events:none`;
    document.body.append(dot);
    setTimeout(() => dot.remove(), 650);
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await page.waitForTimeout(pause);
  await locator.click();
}

/** Records a moving picture while `actions` runs, keeping only the pixels that change. */
async function record(page, name, actions) {
  const frames = [];
  let recording = true;
  const capture = (async () => {
    while (recording) {
      const at = Date.now();
      frames.push({ at, png: await page.screenshot() });
      await page.waitForTimeout(90);
    }
  })();
  await actions();
  recording = false;
  await capture;

  const decoded = frames.map((f) => ({ at: f.at, data: PNG.sync.read(f.png).data }));
  const step = Math.max(1, Math.floor(decoded.length / 12));
  const sample = Buffer.concat(decoded.filter((_, i) => i % step === 0).map((f) => f.data));
  const palette = quantize(sample, COLOURS, { format: 'rgb444' });
  const clear = palette.length;
  palette.push([255, 0, 255]);

  const gif = GIFEncoder();
  let previous = null;
  decoded.forEach((frame, i) => {
    const indexed = applyPalette(frame.data, palette.slice(0, clear), 'rgb444');
    const out = new Uint8Array(indexed.length);
    for (let p = 0; p < indexed.length; p += 1) out[p] = previous && previous[p] === indexed[p] ? clear : indexed[p];
    const next = decoded[i + 1];
    const delay = Math.min(MAX_FRAME_MS, next ? next.at - frame.at : 1500);
    gif.writeFrame(out, WIDTH, HEIGHT, {
      palette: i === 0 ? palette : undefined, first: i === 0, repeat: 0, delay: next ? delay : 1500, transparent: true, transparentIndex: clear, dispose: 1,
    });
    previous = indexed;
  });
  gif.finish();
  writeFileSync(join(OUT, `${name}.gif`), gif.bytes());
  await page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 72 });
  console.log(`${name}.gif: ${decoded.length} frames, ${Math.round(gif.bytes().length / 1024)} KB`);
}

async function still(page, name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(OUT, name), type: 'jpeg', quality: 72 });
  console.log(name);
}

/* ---------- Moving pictures ---------- */

{
  const page = await newPage(1);
  await setUp(page);
  await record(page, 'start-workout', async () => {
    await page.waitForTimeout(900);
    await tap(page, page.getByRole('link', { name: 'Start workout' }));
    await page.getByRole('heading', { name: 'March on the spot' }).waitFor();
    await page.waitForTimeout(1800);
    await tap(page, page.getByRole('button', { name: 'Skip warm-up' }));
    await page.getByRole('heading', { name: 'Squat' }).waitFor();
    await page.waitForTimeout(1400);
  });

  await record(page, 'log-set', async () => {
    await page.waitForTimeout(500);
    await tap(page, page.getByRole('button', { name: 'One rep more' }));
    await tap(page, page.getByRole('button', { name: 'One rep more' }), 300);
    await tap(page, page.locator('.chip', { hasText: 'Green' }));
    await page.locator('.effort').scrollIntoViewIfNeeded();
    await tap(page, page.getByRole('button', { name: 'Hard' }));
    await tap(page, page.getByRole('button', { name: 'Log set' }));
    await page.locator('#rest-count').waitFor();
    await page.waitForTimeout(2200);
  });

  await tap(page, page.getByRole('button', { name: 'Skip rest' }), 0);
  await page.getByRole('button', { name: 'Log set' }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await record(page, 'count-reps', async () => {
    await page.waitForTimeout(400);
    await tap(page, page.getByRole('button', { name: 'Count reps for me' }));
    await page.waitForTimeout(3100 + 2 * 4000 + 1200);
  });
  await page.context().close();
}

/* ---------- Camera coach: an illustration, because a stick figure cannot be tracked ---------- */

{
  const page = await newPage(1);
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 640;
      const g = canvas.getContext('2d');
      const started = performance.now();
      const draw = () => {
        const bend = (1 - Math.cos(((performance.now() - started) / 2400) * 2 * Math.PI)) / 2;
        g.fillStyle = '#3B4454';
        g.fillRect(0, 0, 480, 640);
        g.fillStyle = '#566072';
        g.fillRect(0, 560, 480, 80);
        const hipY = 330 + bend * 110;
        g.strokeStyle = '#F7F8F9';
        g.fillStyle = '#F7F8F9';
        g.lineWidth = 26;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        for (const side of [-1, 1]) {
          g.beginPath();
          g.moveTo(240 + side * 40, hipY);
          g.lineTo(240 + side * (40 + 60 * bend), 450 + bend * 10);
          g.lineTo(240 + side * 50, 570);
          g.stroke();
          g.beginPath();
          g.moveTo(240 + side * 62, hipY - 170);
          g.lineTo(240 + side * 92, hipY - 95);
          g.lineTo(240 + side * 66, hipY - 165);
          g.stroke();
        }
        g.lineWidth = 60;
        g.beginPath();
        g.moveTo(240, hipY - 10);
        g.lineTo(240, hipY - 165);
        g.stroke();
        g.beginPath();
        g.arc(240, hipY - 235, 44, 0, Math.PI * 2);
        g.fill();
        requestAnimationFrame(draw);
      };
      draw();
      return canvas.captureStream(15);
    };
  });
  await page.reload();
  await setUp(page);
  await page.goto(`${base}/#/exercises/squat`);
  await page.getByRole('button', { name: 'Try Camera coach' }).click();
  await page.locator('#camera-use:not([disabled])').waitFor({ timeout: 90000 });

  // Show what tracking looks like. The real text and count update the same elements.
  await page.evaluate(() => {
    const old = document.getElementById('camera-status');
    const shown = old.cloneNode();
    shown.id = 'camera-status-example';
    shown.textContent = 'Tracking. Keep your whole body in view.';
    old.hidden = true;
    old.after(shown);
    const box = document.getElementById('camera-count');
    let count = 3;
    box.textContent = count;
    window.__cue = setInterval(() => { count += 1; box.textContent = count; }, 2400);
    setTimeout(() => {
      const cue = document.getElementById('camera-cue');
      cue.textContent = 'Lift your chest.';
      cue.hidden = false;
    }, 3200);
  });
  await record(page, 'camera', async () => page.waitForTimeout(6500));
  await page.locator('#camera-cancel').click();

  await page.goto(`${base}/#/today`);
  await page.getByRole('link', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: 'Skip warm-up' }).click();
  await page.getByRole('button', { name: 'Hands-free' }).click();
  await page.locator('#hf-next:not([disabled])').waitFor({ timeout: 90000 });
  await page.waitForTimeout(4500);
  await still(page, 'hands-free.jpg');
  await page.context().close();
}

/* ---------- Screenshots, with sample history ---------- */

{
  const page = await newPage(2);
  await still(page, 'setup.jpg');
  await setUp(page);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bandwork.state'));
    const [, red, blue] = s.profile.bands;
    const day = 86400000;
    const now = Date.now();
    const sets = (band, reps, at, n = 3) => Array.from({ length: n }, () => ({ reps, bandIds: [band.id], kg: band.kg, label: band.name, colors: [band.color], at }));
    for (let i = 13; i >= 0; i -= 1) {
      const at = now - i * 2.4 * day - 3600000;
      const band = i > 6 ? red : blue;
      const reps = 15 - (i % 7);
      s.workouts.push({
        id: `sample${i}`, name: 'Full body A', templateId: 'A', startedAt: at - 1800000, finishedAt: at,
        exercises: [
          { exerciseId: 'squat', sets: sets(band, reps, at) },
          { exerciseId: 'wrap-press', sets: sets(red, reps, at) },
          { exerciseId: 'seated-row', sets: sets(red, reps, at, 2) },
        ],
      });
    }
    localStorage.setItem('bandwork.state', JSON.stringify(s));
  });
  await page.reload();

  await page.goto(`${base}/#/exercises/squat`);
  await page.getByRole('button', { name: 'Watch a real video' }).scrollIntoViewIfNeeded();
  await still(page, 'video.jpg');

  await page.goto(`${base}/#/schedule`);
  await page.getByText('Use my weekly schedule').click();
  await page.locator('#schedule-1:not([disabled])').waitFor();
  await still(page, 'schedule.jpg');
  await page.getByText('Use my weekly schedule').click();

  await page.goto(`${base}/#/bands`);
  await page.getByRole('link', { name: 'Measure tension' }).first().click();
  await page.locator('#reading-1').waitFor();
  await page.locator('#reading-1').fill('7');
  await page.locator('#reading-2').fill('7.4');
  await page.locator('#reading-1').scrollIntoViewIfNeeded();
  await still(page, 'measure.jpg');

  await page.goto(`${base}/#/progress`);
  await page.getByRole('heading', { name: 'Sets per muscle, last 7 days' }).scrollIntoViewIfNeeded();
  await still(page, 'progress.jpg');

  await page.goto(`${base}/#/specials`);
  await still(page, 'specials.jpg');

  await page.goto(`${base}/#/programs`);
  await still(page, 'programs.jpg');

  await page.goto(`${base}/#/settings`);
  await page.getByRole('heading', { name: 'Workout reminders' }).scrollIntoViewIfNeeded();
  await page.locator('.day', { hasText: 'Mon' }).click();
  await page.locator('.day', { hasText: 'Wed' }).click();
  await page.locator('.day', { hasText: 'Fri' }).click();
  await still(page, 'settings.jpg');
  await page.context().close();
}

await browser.close();
server.close();
console.log('Guide pictures are ready.');
