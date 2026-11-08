// Translation. The English phrase is the key, so English needs no table and any
// phrase missing from a table simply shows in English. To add a language, add a
// file in core/locales and list it here; a test names every phrase it still needs.

import es from './locales/es.js';
import hi from './locales/hi.js';

export const LANGUAGES = [
  { id: 'en', name: 'English', tag: 'en-GB' },
  { id: 'hi', name: 'हिन्दी', tag: 'hi-IN' },
  { id: 'es', name: 'Español', tag: 'es-ES' },
];

export const TABLES = { hi, es };

let current = 'en';

export function setLanguage(id) {
  current = LANGUAGES.some((l) => l.id === id) ? id : 'en';
}

export function getLanguage() {
  return current;
}

/** The language tag for dates, voices and the page. */
export function localeTag() {
  return LANGUAGES.find((l) => l.id === current).tag;
}

/** Chooses the app language from a device language such as hi-IN. */
export function pickLanguage(deviceTag) {
  const base = String(deviceTag ?? '').slice(0, 2).toLowerCase();
  return LANGUAGES.some((l) => l.id === base) ? base : 'en';
}

export function t(phrase, values) {
  const text = TABLES[current]?.[phrase] ?? phrase;
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (slot, name) => (name in values ? String(values[name]) : slot));
}

/** A count with its word: "1 set", "2 sets". Words are listed in the language tables. */
export function tPlural(count, word) {
  return `${count} ${t(count === 1 ? word : `${word}s`)}`;
}
