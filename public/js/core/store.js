export const STORAGE_KEY = 'bandwork.state';
const VERSION = 1;
const HEX = /^#[0-9a-fA-F]{6}$/;

let counter = 0;
function makeId(prefix) {
  counter += 1;
  // crypto.randomUUID is unavailable on plain http pages, such as a phone on the home network.
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newId(prefix = 'id') {
  return makeId(prefix);
}

export function newBand(name, color, kg) {
  return { id: makeId('band'), name, color, kg };
}

export function defaultBands() {
  return [
    newBand('Yellow', '#F5C518', 5),
    newBand('Red', '#D92D20', 10),
    newBand('Blue', '#1F5FD6', 15),
    newBand('Green', '#147F45', 20),
    newBand('Black', '#17181C', 25),
  ];
}

function defaultProfile() {
  return {
    onboarded: false,
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
    && Array.isArray(s.bandIds) && Array.isArray(s.colors) && s.colors.every((c) => HEX.test(c));
}

function validWorkout(w) {
  return w && typeof w.id === 'string' && typeof w.name === 'string' && isCount(w.startedAt) && isCount(w.finishedAt)
    && Array.isArray(w.exercises)
    && w.exercises.every((e) => e && typeof e.exerciseId === 'string' && Array.isArray(e.sets) && e.sets.every(validSet));
}

/** Reads a backup file's text. Throws an Error with a message fit to show the person. */
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not a Bandwork backup.');
  }
  if (data?.app !== 'bandwork' || typeof data.profile !== 'object' || data.profile === null || !Array.isArray(data.workouts)) {
    throw new Error('That file is not a Bandwork backup.');
  }
  if (!Array.isArray(data.profile.bands) || !data.profile.bands.every(validBand)) {
    throw new Error('That backup has a band with an invalid colour or tension.');
  }
  if (!data.workouts.every(validWorkout)) {
    throw new Error('That backup has a damaged workout, so nothing was restored.');
  }
  return {
    version: VERSION,
    profile: normaliseProfile({ ...defaultProfile(), ...data.profile }),
    workouts: data.workouts,
    active: null,
  };
}

function normaliseProfile(p) {
  const fallback = defaultProfile();
  const pick = (value, allowed, otherwise) => (allowed.includes(value) ? value : otherwise);
  return {
    ...p,
    goal: pick(p.goal, ['strength', 'muscle', 'endurance'], fallback.goal),
    daysPerWeek: pick(p.daysPerWeek, [2, 3, 4], fallback.daysPerWeek),
    minutes: pick(p.minutes, [20, 30, 45], fallback.minutes),
    nextIndex: Number.isInteger(p.nextIndex) && p.nextIndex >= 0 ? p.nextIndex : 0,
    swaps: p.swaps && typeof p.swaps === 'object' && !Array.isArray(p.swaps) ? p.swaps : {},
    onboarded: Boolean(p.onboarded),
    hasAnchor: Boolean(p.hasAnchor),
    hasMini: Boolean(p.hasMini),
    sound: Boolean(p.sound),
    vibrate: Boolean(p.vibrate),
  };
}
