// Workout reminders, as a repeating calendar event for the browser version and as
// weekly notifications for the Android app. Days use 0 for Sunday, as JavaScript does.

import { t } from './i18n.js';

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const FIRST_NOTIFICATION_ID = 100;

const two = (n) => String(n).padStart(2, '0');

function splitTime(time) {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

function nextOccurrence(days, { hour, minute }, now) {
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);
  for (let i = 0; i < 8; i += 1) {
    if (days.includes(candidate.getDay()) && candidate.getTime() > now) return candidate;
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

const local = (d) => `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}T${two(d.getHours())}${two(d.getMinutes())}00`;
const escapeText = (text) => text.replace(/[\\;,]/g, (c) => `\\${c}`);

/** The text of a calendar file, or null when no days are chosen. */
export function buildIcs({ days, time }, now) {
  if (!days.length) return null;
  const start = nextOccurrence(days, splitTime(time), now);
  const title = escapeText(t('Tensile workout'));
  const byDay = [...days].sort((a, b) => a - b).map((d) => ICS_DAYS[d]).join(',');
  const stamp = new Date(now).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tensile//Reminders//EN',
    'BEGIN:VEVENT',
    'UID:workout-reminder@bandwork',
    `DTSTAMP:${stamp}`,
    `DTSTART:${local(start)}`,
    'DURATION:PT30M',
    `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
    `SUMMARY:${title}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${title}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

/**
 * Weekly notifications for the Android app. Android counts weekdays from 1 for Sunday.
 * exact is only for when the person asks for it, because the plugin stops to send them
 * to a system settings page if Android has not already allowed it.
 */
export function notificationSchedule({ days, time }, { exact = false } = {}) {
  const { hour, minute } = splitTime(time);
  return days.map((day) => ({
    id: FIRST_NOTIFICATION_ID + day,
    title: t('Time to train'),
    body: t('Your next band workout is ready.'),
    isExactNotification: exact,
    schedule: { on: { weekday: day + 1, hour, minute, second: 0 }, allowWhileIdle: true },
  }));
}

export const ALL_NOTIFICATION_IDS = ICS_DAYS.map((_, day) => FIRST_NOTIFICATION_ID + day);
