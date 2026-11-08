import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGES, TABLES, getLanguage, localeTag, pickLanguage, setLanguage, t, tPlural } from '../public/js/core/i18n.js';
import { EXERCISES } from '../public/js/core/exercises.js';
import { COOLDOWN_MOVES, WARMUP_MOVES } from '../public/js/core/routines.js';
import { PROGRAMS } from '../public/js/core/programs.js';
import { BAND_COLORS } from '../public/js/core/color.js';
import { setAnnouncement } from '../public/js/core/coach.js';
import { MUSCLES } from '../public/js/core/insights.js';
import { AUTO_PHASE_NAMES, autoProgram } from '../public/js/core/autoplan.js';
import { PLAN_NAMES } from '../public/js/core/plan.js';
import { bandName, labelFor } from '../public/js/core/progression.js';
import { BACKUP_ERRORS } from '../public/js/core/store.js';

afterEach(() => setLanguage('en'));

test('English is the default and fills in values', () => {
  assert.equal(getLanguage(), 'en');
  assert.equal(t('Set {n} of {total}', { n: 2, total: 3 }), 'Set 2 of 3');
});

test('a chosen language translates and falls back to English when a phrase is missing', () => {
  setLanguage('hi');
  assert.equal(t('Log set'), TABLES.hi['Log set']);
  assert.notEqual(t('Log set'), 'Log set');
  assert.equal(t('A phrase nobody translated'), 'A phrase nobody translated');
});

test('an unknown language stays on English', () => {
  setLanguage('tlh');
  assert.equal(getLanguage(), 'en');
});

test('counts use the right word form', () => {
  assert.equal(tPlural(1, 'set'), '1 set');
  assert.equal(tPlural(2, 'set'), '2 sets');
  setLanguage('es');
  assert.equal(tPlural(2, 'set'), `2 ${TABLES.es.sets}`);
});

test('the device language picks the app language', () => {
  assert.equal(pickLanguage('hi-IN'), 'hi');
  assert.equal(pickLanguage('es-MX'), 'es');
  assert.equal(pickLanguage('en-GB'), 'en');
  assert.equal(pickLanguage('fr-FR'), 'en');
  assert.equal(pickLanguage(undefined), 'en');
});

test('date formats follow the language', () => {
  setLanguage('hi');
  assert.equal(localeTag(), 'hi-IN');
});

/* ---------- Every phrase in the app is translated ---------- */

const JS = fileURLToPath(new URL('../public/js/', import.meta.url));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function phrasesInSource() {
  const found = new Set(['set', 'sets', 'rep', 'reps', 'minute', 'minutes', 'workout', 'workouts', 'exercise', 'exercises', 'week', 'weeks', 'day', 'days']);
  const pattern = /\bt\(\s*(?:'((?:[^'\\]|\\.)*)'|`([^`$]*)`)/g;
  for (const file of walk(JS).filter((f) => !f.includes('locales'))) {
    for (const m of readFileSync(file, 'utf8').matchAll(pattern)) {
      found.add((m[1] ?? m[2]).replaceAll("\\'", "'"));
    }
  }
  return found;
}

function contentPhrases() {
  const found = new Set();
  for (const e of EXERCISES) [e.name, e.muscles, e.setup, ...e.cues].forEach((x) => found.add(x));
  for (const m of [...WARMUP_MOVES, ...COOLDOWN_MOVES]) [m.name, m.cue].forEach((x) => found.add(x));
  for (const p of PROGRAMS) {
    [p.name, p.summary].forEach((x) => found.add(x));
    p.phases.forEach((ph) => found.add(ph.name));
  }
  for (const c of BAND_COLORS) found.add(c.name);
  for (const m of MUSCLES) found.add(m.name);
  for (const name of PLAN_NAMES) found.add(name);
  for (const message of BACKUP_ERRORS) found.add(message);
  for (const name of AUTO_PHASE_NAMES) found.add(name);
  const auto = autoProgram({});
  [auto.name, auto.summary].forEach((x) => found.add(x));
  return found;
}

const allPhrases = () => new Set([...phrasesInSource(), ...contentPhrases()]);
const slots = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('the scan finds the app text', () => {
  assert.ok(allPhrases().size > 200, String(allPhrases().size));
});

for (const lang of LANGUAGES.filter((l) => l.id !== 'en')) {
  test(`${lang.name}: every phrase is translated`, () => {
    const missing = [...allPhrases()].filter((p) => !TABLES[lang.id][p]);
    assert.deepEqual(missing, []);
  });

  test(`${lang.name}: no leftover phrases that the app no longer uses`, () => {
    const used = allPhrases();
    assert.deepEqual(Object.keys(TABLES[lang.id]).filter((k) => !used.has(k)), []);
  });

  test(`${lang.name}: translations keep every value slot`, () => {
    for (const [key, value] of Object.entries(TABLES[lang.id])) {
      assert.deepEqual(slots(value), slots(key), key);
    }
  });
}

test('band names and other values cannot inject into a translation', () => {
  assert.equal(t('Move up to {band}. Back to {reps} reps.', { band: '{reps}', reps: 8 }), 'Move up to {reps}. Back to 8 reps.');
});

test('default band names translate, while names the person chose stay as typed', () => {
  setLanguage('hi');
  assert.equal(bandName('Yellow'), TABLES.hi.Yellow);
  assert.equal(bandName('Back'), 'Back');
  assert.equal(labelFor(['a', 'b'], [{ id: 'a', name: 'Red' }, { id: 'b', name: 'Old faithful' }]), `${TABLES.hi.Red} + Old faithful`);
});

test('a device set to Hindi changes dates and the coach', () => {
  setLanguage('hi');
  assert.match(setAnnouncement({ name: 'Squat', setNumber: 1, totalSets: 3, reps: 8, band: 'Red', perSide: false }), /स्क्वाट/);
});
