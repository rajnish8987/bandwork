import { exerciseById } from './exercises.js';

export const STORAGE_KEY = 'bandwork.state';
const VERSION = 1;
const HEX = /^#[0-9a-fA-F]{6}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EFFORT_VALUES = ['easy', 'good', 'hard', 'limit'];
const MAX_CUSTOM_SETS = 6;
const MAX_CUSTOM_NAME = 40;

let counter = 0;
function makeId(prefix) {
  counter += 1;
  // crypto.randomUUID is unavailable on plain http pages, such as a phone on the home network.
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newId(prefix = 'id') {
  return makeId(prefix);
}

export function newBand(name, color, kg, now = Date.now()) {
  return { id: makeId('band'), name, color, kg, addedAt: now };
}

/** The usual tension of each band colour, in kg. */
export const STANDARD_TENSIONS = { Yellow: 4.5, Red: 6.8, Blue: 11.3, Green: 9, Black: 13.6 };

export function defaultBands() {
  return [
    newBand('Yellow', '#F5C518', STANDARD_TENSIONS.Yellow),
    newBand('Red', '#D92D20', STANDARD_TENSIONS.Red),
    newBand('Blue', '#1F5FD6', STANDARD_TENSIONS.Blue),
    newBand('Green', '#147F45', STANDARD_TENSIONS.Green),
    newBand('Black', '#17181C', STANDARD_TENSIONS.Black),
  ];
}

function defaultProfile() {
  return {
    onboarded: false,
    level: 'beginner',
    goal: 'muscle',
    daysPerWeek: 3,
    minutes: 30,
    hasAnchor: false,
    hasMini: false,
    bands: defaultBands(),
    swaps: {},
    nextIndex: 0,
    sound: true,
    vibrate: true,
    language: null, // null follows the device
    unit: 'kg',
    voice: false,
    voiceURI: null, // null lets the device choose
    cameraView: { you: true, avatar: true, notes: true },
    tempo: 'steady',
    warmups: true,
    cooldowns: true,
    reminders: { days: [], time: '18:00' },
    program: null,
    customWorkouts: [],
    useCustomPlan: false,
    lighterSkippedAt: null,
    schedule: { enabled: false, days: {} },
    videoOverrides: {},
    focus: 'balanced',
    avoid: [],
    rest: 'auto',
    autoLighter: true,
  };
}

export function defaultState() {
  return { version: VERSION, profile: defaultProfile(), workouts: [], active: null };
}

export function loadState(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return defaultState();
  try {
    const saved = JSON.parse(raw);
    return {
      version: VERSION,
      profile: { ...defaultProfile(), ...saved.profile },
      workouts: Array.isArray(saved.workouts) ? saved.workouts : [],
      active: saved.active ?? null,
    };
  } catch {
    storage.setItem(`${STORAGE_KEY}.corrupt`, raw);
    return defaultState();
  }
}

export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function makeBackup(state) {
  return JSON.stringify({
    app: 'bandwork',
    version: VERSION,
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    workouts: state.workouts,
  }, null, 2);
}

const isCount = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;

function validBand(b) {
  return b && typeof b.id === 'string' && typeof b.name === 'string' && HEX.test(b.color) && isCount(b.kg) && b.kg > 0;
}

function validSet(s) {
  return s && isCount(s.reps) && isCount(s.kg) && typeof s.label === 'string'
    && Array.isArray(s.bandIds) && Array.isArray(s.colors) && s.colors.every((c) => HEX.test(c))
    && (s.effort === undefined || EFFORT_VALUES.includes(s.effort));
}

function validWorkout(w) {
  return w && typeof w.id === 'string' && typeof w.name === 'string' && isCount(w.startedAt) && isCount(w.finishedAt)
    && Array.isArray(w.exercises)
    && w.exercises.every((e) => e && typeof e.exerciseId === 'string' && Array.isArray(e.sets) && e.sets.every(validSet));
}

// Far more than years of workouts. A larger file is refused before it is read.
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

// A backup can come from anywhere, and these names reach into how objects work.
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const NOT_A_BACKUP = 'That file is not a Tensile backup.';
const BAD_BAND = 'That backup has a band with an invalid colour or tension.';
const BAD_WORKOUT = 'That backup has a damaged workout, so nothing was restored.';

/** Messages parseBackup can throw; the screen translates them when showing one. */
export const BACKUP_ERRORS = [NOT_A_BACKUP, BAD_BAND, BAD_WORKOUT];

/** Reads a backup file's text. Throws an Error with a message fit to show the person. */
export function parseBackup(text) {
  if (text.length > MAX_BACKUP_BYTES) throw new Error(NOT_A_BACKUP);
  let data;
  try {
    data = JSON.parse(text, (key, value) => (UNSAFE_KEYS.has(key) ? undefined : value));
  } catch {
    throw new Error(NOT_A_BACKUP);
  }
  if (data?.app !== 'bandwork' || typeof data.profile !== 'object' || data.profile === null || !Array.isArray(data.workouts)) {
    throw new Error(NOT_A_BACKUP);
  }
  if (!Array.isArray(data.profile.bands) || !data.profile.bands.every(validBand)) {
    throw new Error(BAD_BAND);
  }
  if (!data.workouts.every(validWorkout)) {
    throw new Error(BAD_WORKOUT);
  }
  return {
    version: VERSION,
    profile: normaliseProfile({ ...defaultProfile(), ...data.profile }),
    workouts: data.workouts,
    active: null,
  };
}

function cleanCustomWorkouts(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((w) => w && typeof w.id === 'string' && typeof w.name === 'string' && Array.isArray(w.exerciseIds))
    .map((w) => ({
      id: w.id,
      name: w.name.slice(0, MAX_CUSTOM_NAME),
      exerciseIds: w.exerciseIds.filter((id) => typeof id === 'string'),
      sets: Number.isInteger(w.sets) && w.sets >= 1 && w.sets <= MAX_CUSTOM_SETS ? w.sets : 3,
    }));
}

function cleanSchedule(s) {
  if (!s || typeof s !== 'object') return { enabled: false, days: {} };
  const days = {};
  for (const [day, value] of Object.entries(s.days ?? {})) {
    if (/^[0-6]$/.test(day) && (value === null || typeof value === 'string')) days[day] = value;
  }
  return { enabled: Boolean(s.enabled), days };
}

function cleanVideoOverrides(overrides) {
  if (!overrides || typeof overrides !== 'object') return {};
  return Object.fromEntries(Object.entries(overrides).filter(([, id]) => typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id)));
}

function cleanReminders(r, fallback) {
  if (!r || typeof r !== 'object') return fallback;
  return {
    days: Array.isArray(r.days) ? [...new Set(r.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : [],
    time: TIME.test(r.time) ? r.time : fallback.time,
    ...(r.exact === true ? { exact: true } : {}),
  };
}

function cleanSwaps(swaps) {
  if (!swaps || typeof swaps !== 'object' || Array.isArray(swaps)) return {};
  return Object.fromEntries(Object.entries(swaps).filter(([from, to]) => exerciseById(from) && typeof to === 'string' && exerciseById(to)));
}

function cleanCameraView(view) {
  const saved = view && typeof view === 'object' ? view : {};
  const part = (name) => saved[name] !== false;
  return { you: part('you'), avatar: part('avatar'), notes: part('notes') };
}

function normaliseProfile(p) {
  const fallback = defaultProfile();
  const pick = (value, allowed, otherwise) => (allowed.includes(value) ? value : otherwise);
  return {
    ...p,
    language: pick(p.language, [null, 'en', 'hi', 'es'], null),
    unit: pick(p.unit, ['kg', 'lb'], 'kg'),
    tempo: pick(p.tempo, ['fast', 'steady', 'slow'], 'steady'),
    voice: Boolean(p.voice),
    voiceURI: typeof p.voiceURI === 'string' && p.voiceURI ? p.voiceURI : null,
    cameraView: cleanCameraView(p.cameraView),
    warmups: Boolean(p.warmups),
    cooldowns: Boolean(p.cooldowns),
    reminders: cleanReminders(p.reminders, fallback.reminders),
    program: p.program && typeof p.program.id === 'string' && isCount(p.program.startedAt) ? { id: p.program.id, startedAt: p.program.startedAt } : null,
    customWorkouts: cleanCustomWorkouts(p.customWorkouts),
    useCustomPlan: Boolean(p.useCustomPlan),
    lighterSkippedAt: isCount(p.lighterSkippedAt) ? p.lighterSkippedAt : null,
    schedule: cleanSchedule(p.schedule),
    videoOverrides: cleanVideoOverrides(p.videoOverrides),
    level: pick(p.level, ['beginner', 'intermediate', 'master'], fallback.level),
    goal: pick(p.goal, ['strength', 'muscle', 'endurance', 'fitness', 'fatloss'], fallback.goal),
    daysPerWeek: pick(p.daysPerWeek, [2, 3, 4, 5, 6, 7], fallback.daysPerWeek),
    minutes: pick(p.minutes, [15, 20, 30, 45, 60], fallback.minutes),
    focus: pick(p.focus, ['balanced', 'upper', 'lower', 'core', 'glutes', 'arms'], fallback.focus),
    avoid: Array.isArray(p.avoid) ? p.avoid.filter((a) => ['knees', 'back', 'shoulders'].includes(a)) : [],
    rest: pick(p.rest, ['auto', 30, 45, 60, 90, 120, 180], fallback.rest),
    autoLighter: p.autoLighter === undefined ? true : Boolean(p.autoLighter),
    nextIndex: Number.isInteger(p.nextIndex) && p.nextIndex >= 0 ? p.nextIndex : 0,
    swaps: cleanSwaps(p.swaps),
    onboarded: Boolean(p.onboarded),
    hasAnchor: Boolean(p.hasAnchor),
    hasMini: Boolean(p.hasMini),
    sound: Boolean(p.sound),
    vibrate: Boolean(p.vibrate),
  };
}
