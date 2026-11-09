import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { exerciseById } from '../public/js/core/exercises.js';
import { setLanguage } from '../public/js/core/i18n.js';
import { startSession } from '../public/js/core/session.js';
import { defaultState, loadState, parseBackup } from '../public/js/core/store.js';
import { pickVoice, voiceLabel, voicesForLanguage } from '../public/js/core/voices.js';
import { GUIDE_PICTURES, guideScreen } from '../public/js/ui/extra-screens.js';
import { mountFigure, pausePageFigures, stopFigures } from '../public/js/ui/figure.js';
import { settingsScreen } from '../public/js/ui/screens.js';
import { setScreen } from '../public/js/ui/workout-screens.js';

const LAPTOP_VOICES = [
  { voiceURI: 'Google UK English Male', name: 'Google UK English Male', lang: 'en-GB', localService: false },
  { voiceURI: 'Microsoft Ravi', name: 'Microsoft Ravi - English (India)', lang: 'en-IN', localService: true },
  { voiceURI: 'Microsoft Susan', name: 'Microsoft Susan - English (United Kingdom)', lang: 'en-GB', localService: true },
  { voiceURI: 'Microsoft George', name: 'Microsoft George - English (United Kingdom)', lang: 'en-GB', localService: true, default: true },
  { voiceURI: 'Google Hindi', name: 'Google हिन्दी', lang: 'hi-IN', localService: false },
];

/* ---------- Which voices to offer ---------- */

test('voices are named the way a person would say them', () => {
  assert.deepEqual(voiceLabel(LAPTOP_VOICES[3]), { name: 'George', detail: 'English (United Kingdom)' });
  assert.deepEqual(voiceLabel(LAPTOP_VOICES[0]), { name: 'Google UK English Male', detail: 'en-GB' });
});

test('only voices for the app language are offered, closest and on-device ones first', () => {
  assert.deepEqual(voicesForLanguage(LAPTOP_VOICES, 'en-GB').map((v) => v.voiceURI), [
    'Microsoft George', 'Microsoft Susan', 'Google UK English Male', 'Microsoft Ravi',
  ]);
  assert.deepEqual(voicesForLanguage(LAPTOP_VOICES, 'hi-IN').map((v) => v.voiceURI), ['Google Hindi']);
  assert.deepEqual(voicesForLanguage(LAPTOP_VOICES, 'es-ES'), []);
});

test('Android writes the language with an underscore, and that still matches', () => {
  assert.equal(voicesForLanguage([{ voiceURI: 'a', name: 'a', lang: 'en_GB' }], 'en-GB').length, 1);
});

test('a chosen voice is used only when this device has it, in the current language', () => {
  assert.equal(pickVoice(LAPTOP_VOICES, 'Microsoft Susan', 'en-GB').name, 'Microsoft Susan - English (United Kingdom)');
  assert.equal(pickVoice(LAPTOP_VOICES, null, 'en-GB'), null);
  assert.equal(pickVoice(LAPTOP_VOICES, 'A voice from another device', 'en-GB'), null);
  assert.equal(pickVoice(LAPTOP_VOICES, 'Microsoft Susan', 'hi-IN'), null, 'an English voice must not read Hindi');
});

/* ---------- What is saved ---------- */

// A backup can come from anywhere, so it is checked when it is restored.
const restored = (profile) => {
  const saved = defaultState();
  Object.assign(saved.profile, profile);
  return parseBackup(JSON.stringify({ app: 'bandwork', version: 1, profile: saved.profile, workouts: [] })).profile;
};

test('data saved before these choices existed gets the defaults', () => {
  const { voiceURI, cameraView, ...older } = defaultState().profile;
  const profile = loadState({ getItem: () => JSON.stringify({ profile: older, workouts: [] }) }).profile;
  assert.equal(profile.voiceURI, null);
  assert.deepEqual(profile.cameraView, { you: true, avatar: true, notes: true });
});

test('choices on this device are kept when the app reopens', () => {
  const saved = defaultState();
  saved.profile.voiceURI = 'Microsoft Susan';
  saved.profile.cameraView = { you: false, avatar: true, notes: false };
  const profile = loadState({ getItem: () => JSON.stringify(saved) }).profile;
  assert.equal(profile.voiceURI, 'Microsoft Susan');
  assert.deepEqual(profile.cameraView, { you: false, avatar: true, notes: false });
});

test('a restored backup keeps the voice, and anything odd falls back to the device default', () => {
  assert.equal(defaultState().profile.voiceURI, null);
  assert.equal(restored({ voiceURI: 'Microsoft Susan' }).voiceURI, 'Microsoft Susan');
  assert.equal(restored({ voiceURI: '' }).voiceURI, null);
  assert.equal(restored({ voiceURI: 7 }).voiceURI, null);
});

test('a restored backup keeps camera screen choices, showing anything it does not say', () => {
  const all = { you: true, avatar: true, notes: true };
  assert.deepEqual(defaultState().profile.cameraView, all);
  assert.deepEqual(restored({ cameraView: { you: false } }).cameraView, { you: false, avatar: true, notes: true });
  assert.deepEqual(restored({ cameraView: 'nonsense' }).cameraView, all);
  assert.deepEqual(restored({ cameraView: { avatar: false, extra: true } }).cameraView, { you: true, avatar: false, notes: true });
});

/* ---------- Settings ---------- */

function settings(voices, profile = {}) {
  const state = defaultState();
  Object.assign(state.profile, profile);
  return settingsScreen({ state, canInstall: false, secure: true, native: false, voices });
}

test('Settings lists the voices for this language, each with a way to hear it', () => {
  setLanguage('en');
  const html = settings(LAPTOP_VOICES);
  for (const name of ['Device default', 'George', 'Susan', 'Ravi', 'Google UK English Male']) assert.ok(html.includes(name), name);
  assert.ok(!html.includes('हिन्दी</strong>'), 'Hindi voices stay out of the English list');
  assert.equal(html.match(/data-action="voice-hear"/g).length, 5, 'the default and four voices');
  assert.match(html, /name="voiceURI" data-field="voiceURI" value="" checked/);
});

test('Settings marks the saved voice, and the voices that need a connection', () => {
  setLanguage('en');
  const html = settings(LAPTOP_VOICES, { voiceURI: 'Microsoft Susan' });
  assert.match(html, /value="Microsoft Susan" checked/);
  assert.ok(!/name="voiceURI" data-field="voiceURI" value="" checked/.test(html));
  assert.equal(html.match(/Needs internet/g).length, 1);
});

test('Settings says so when this device has no voice for the language', () => {
  setLanguage('es');
  assert.ok(!settings(LAPTOP_VOICES).includes('data-action="voice-hear"'));
  setLanguage('en');
  assert.match(settings([]), /no voice for this language/);
  assert.ok(!settings(null).includes('no voice for this language'), 'not while the list is still loading');
});

/* ---------- Choosing help during a set ---------- */

function setHtml(profile = {}) {
  let state = defaultState();
  Object.assign(state.profile, { onboarded: true, ...profile });
  state = startSession(state, Date.now());
  const step = { exIndex: 0, setIndex: 0 };
  return setScreen({ state, step, draft: { reps: 10, bandIds: [], effort: null }, swaps: [], canSpeak: true });
}

test('each kind of help says what it does, right where it is chosen', () => {
  setLanguage('en');
  const html = setHtml();
  assert.match(html, /Choose your help/);
  assert.match(html, /Count reps for me<\/strong>\s*<small>Beeps only\. It cannot see what you do\.<\/small>/);
  assert.match(html, /Camera coach<\/strong>\s*<small>Counts your real reps and corrects your form, for one set\.<\/small>/);
  assert.match(html, /Hands-free<\/strong>\s*<small>Runs the whole workout: counts, logs, rests, moves on\.<\/small>/);
});

test('Voice is a switch beside the choices, showing its state rather than an instruction', () => {
  setLanguage('en');
  assert.match(setHtml({ voice: false }), /role="switch" aria-checked="false" data-action="voice-toggle"/);
  assert.match(setHtml({ voice: true }), /role="switch" aria-checked="true" data-action="voice-toggle"/);
  assert.ok(!setHtml().includes('Voice off'));
});

/* ---------- The Guide ---------- */

test('the Guide compares all four, in plain words', () => {
  setLanguage('en');
  const html = guideScreen();
  assert.match(html, /Which one do I use\?/);
  assert.equal(html.match(/<th scope="row">/g).length, 4);
  for (const row of ['Count reps for me', 'Camera coach', 'Hands-free', 'Voice']) assert.match(html, new RegExp(`<th scope="row">${row}</th>`));
  for (const heading of ['Use it when', 'Camera', 'Counts', 'Corrects form', 'Logs your set', 'Lasts']) assert.match(html, new RegExp(`<th scope="col">${heading}</th>`));
  assert.equal(html.match(/data-label="/g).length, 24, 'phones show each cell with its heading');
});

test('the Guide no longer tells people to tap Voice off to turn it on', () => {
  setLanguage('en');
  assert.ok(!guideScreen().includes('Tap Voice off'));
  assert.match(guideScreen(), /even with Voice off/);
});

test('the Guide explains the avatar and how to show or hide things, with hands-free as its own step', () => {
  setLanguage('en');
  const html = guideScreen();
  assert.match(html, /beside the avatar/);
  assert.match(html, /keeps counting even when your picture is hidden/);
  assert.ok(GUIDE_PICTURES.includes('hands-free.jpg'));
  assert.ok(html.includes('hands-free.jpg'));
});

/* ---------- The camera screens ---------- */

test('Camera coach and Hands-free share one screen with the person and the avatar', () => {
  for (const file of ['camera.js', 'handsfree.js']) {
    const code = readFileSync(new URL(`../public/js/ui/${file}`, import.meta.url), 'utf8');
    assert.match(code, /stagePanels\(/, file);
    assert.match(code, /stageControls\(/, file);
    assert.match(code, /mountStage\(/, file);
  }
});

/* ---------- The avatar's animation, which runs for a whole workout ---------- */

function fakeBrowser() {
  const frames = [];
  const node = () => ({ setAttribute() {}, append() {}, replaceChildren() {}, classList: { add() {} } });
  globalThis.document = { createElementNS: node };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.performance ??= { now: () => 0 };
  globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  return {
    frames,
    node,
    /** Runs one screen refresh, and returns how many loops were waiting for it. */
    tick(at = 1000) {
      const due = frames.splice(0);
      due.forEach((fn) => fn(at));
      return due.length;
    },
  };
}

const squat = () => exerciseById('squat');
const counting = (exercise) => {
  // Counts how often this figure is drawn, by watching a limb being moved.
  let draws = 0;
  const box = { replaceChildren(svg) { box.svg = svg; } };
  const original = document.createElementNS;
  document.createElementNS = (...args) => {
    const made = original(...args);
    const set = made.setAttribute;
    made.setAttribute = (name, value) => { if (name === 'cx') draws += 1; return set(name, value); };
    return made;
  };
  const stop = mountFigure(box, exercise, { keep: true });
  document.createElementNS = original;
  return { stop, draws: () => draws };
};

test('redrawing the screen does not stack up animation loops', () => {
  const browser = fakeBrowser();
  stopFigures();
  browser.tick();
  for (let i = 0; i < 6; i += 1) {
    stopFigures();
    mountFigure(browser.node(), squat());
  }
  assert.equal(browser.tick(), 1, 'one loop, however many redraws');
  assert.equal(browser.tick(), 1);
  stopFigures();
  browser.tick();
  assert.equal(browser.frames.length, 0, 'nothing runs once no figure is left');
});

test('a figure on the camera screen survives the page redrawing behind it', () => {
  const browser = fakeBrowser();
  stopFigures();
  const figure = counting(squat());
  browser.tick();
  const before = figure.draws();
  stopFigures();
  browser.tick();
  assert.ok(figure.draws() > before, 'still animating after the page redraw');
  figure.stop();
  browser.tick();
  assert.equal(browser.frames.length, 0, 'its own stop ends it');
});

test('while the camera runs, the avatar draws at most 30 times a second', () => {
  const browser = fakeBrowser();
  stopFigures();
  browser.tick();
  pausePageFigures(true);
  const figure = counting(squat());
  browser.tick(5000);
  const first = figure.draws();
  browser.tick(5010);
  browser.tick(5020);
  assert.equal(figure.draws(), first, 'too soon after the last drawing');
  browser.tick(5040);
  assert.ok(figure.draws() > first, 'draws again once enough time has passed');
  assert.equal(browser.frames.length, 1, 'the loop stays alive between drawings');
  figure.stop();
  pausePageFigures(false);
  browser.tick(6000);
});

test('the page figure hidden behind the camera screen does not use the laptop', () => {
  const browser = fakeBrowser();
  stopFigures();
  const box = browser.node();
  let draws = 0;
  const original = document.createElementNS;
  document.createElementNS = (...args) => {
    const made = original(...args);
    made.setAttribute = (name) => { if (name === 'cx') draws += 1; };
    return made;
  };
  mountFigure(box, squat());
  document.createElementNS = original;
  browser.tick();
  const running = draws;
  pausePageFigures(true);
  browser.tick();
  assert.equal(draws, running, 'paused');
  pausePageFigures(false);
  browser.tick();
  assert.ok(draws > running, 'carries on afterwards');
  stopFigures();
  browser.tick();
});
