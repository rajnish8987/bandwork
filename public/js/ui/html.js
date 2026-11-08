import { localeTag, t, tPlural } from '../core/i18n.js';

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Makes any value safe to place in HTML text or a quoted attribute. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function safeColor(value, fallback = '#7A838F') {
  return HEX.test(value) ? value : fallback;
}

export function shortDate(time) {
  return new Date(time).toLocaleDateString(localeTag(), { day: 'numeric', month: 'short' });
}

export function longDate(time) {
  return new Date(time).toLocaleDateString(localeTag(), { weekday: 'short', day: 'numeric', month: 'short' });
}

export const plural = tPlural;

/** A full day name. Days use 0 for Sunday. */
export function dayName(day) {
  return [t('Sunday'), t('Monday'), t('Tuesday'), t('Wednesday'), t('Thursday'), t('Friday'), t('Saturday')][day];
}

/** A CSS background for one or more band colours, stacked bands as hard stripes. */
export function bandFill(colors) {
  const list = colors.map((c) => safeColor(c));
  if (!list.length) return '#B9C0C9';
  if (list.length === 1) return list[0];
  const step = 100 / list.length;
  const stops = list.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`);
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}
