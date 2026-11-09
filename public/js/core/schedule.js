// An optional weekly schedule: a chosen workout, or rest, for each of the seven days.
// Days use 0 for Sunday, as JavaScript does.

import { exerciseById } from './exercises.js';
import { MAIN_WORK } from './insights.js';
import { allBuiltIn, customChoices, splitFor } from './plan.js';
import { programStatus } from './programs.js';
import { weekStart } from './stats.js';
import { trackDay, trackWeekCount } from './track.js';

const SPREAD = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 0] };
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const IGNORED_FOR_RECOVERY = new Set(['core', 'calves']);
const WEEK = 7 * 86400000;

/** The current week of the fixed track, or null when the person is not on it. */
function trackStatus(profile, now) {
  const status = programStatus(profile, now);
  return status?.phase?.plan ? status : null;
}

function nextOnTrack(profile, status, now) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    const week = status.week + Math.round((weekStart(date.getTime()) - weekStart(now)) / WEEK);
    const day = date.getDay();
    const plan = trackDay(profile, week, day);
    if (plan?.kind === 'workout') return { day, offset, name: plan.template.name, template: plan.template };
  }
  return null;
}

function planOnTrack({ profile, workouts }, status, now) {
  const date = new Date(now);
  const today = trackDay(profile, status.week, date.getDay());
  const next = nextOnTrack(profile, status, now);
  const fallback = today.template ?? next?.template ?? null;
  const base = { next, method: today.method, track: true };
  if (workouts.some((w) => new Date(w.finishedAt).toDateString() === date.toDateString())) return { ...base, kind: 'done', fallback };
  if (today.kind === 'workout') return { ...base, kind: 'workout', template: today.template };
  return { ...base, kind: today.kind, fallback };
}

/** A starting week, spreading the person's current plan across the days. */
export function defaultWeek(profile) {
  const ids = splitFor(profile.daysPerWeek).map((template) => template.id);
  const days = SPREAD[ids.length] ?? SPREAD[3];
  const week = Object.fromEntries(ALL_DAYS.map((day) => [day, null]));
  days.forEach((day, i) => { week[day] = ids[i]; });
  return week;
}

/** Everything that can be chosen for a day: the built-in workouts, then the person's own. */
export function templateChoices(profile) {
  return [...allBuiltIn(profile), ...customChoices(profile)];
}

function templateForDay(profile, day, choices = templateChoices(profile)) {
  const id = profile.schedule?.days?.[day];
  return id ? choices.find((c) => c.id === id) ?? null : null;
}

const isOn = (profile) => Boolean(profile.schedule?.enabled);

function nextWorkout(profile, today) {
  const choices = templateChoices(profile);
  for (let offset = 1; offset <= 7; offset += 1) {
    const day = (today + offset) % 7;
    const template = templateForDay(profile, day, choices);
    if (template) return { day, offset, name: template.name };
  }
  return null;
}

/**
 * What today holds. kind is rotation when the schedule is off, workout when one is
 * chosen, rest when none is, and done when today's training is finished.
 */
export function todayPlan(state, now) {
  const { profile, workouts } = state;
  const status = trackStatus(profile, now);
  if (status) return planOnTrack(state, status, now);
  if (!isOn(profile)) return { kind: 'rotation' };
  const date = new Date(now);
  const today = date.getDay();
  const next = nextWorkout(profile, today);
  const trainedToday = workouts.some((w) => new Date(w.finishedAt).toDateString() === date.toDateString());
  if (trainedToday) return { kind: 'done', next };
  const template = templateForDay(profile, today);
  return template ? { kind: 'workout', template, next } : { kind: 'rest', next };
}

/** How many workouts a week the person is aiming for. */
export function weeklyTarget(profile, now = Date.now()) {
  const status = trackStatus(profile, now);
  if (status) return trackWeekCount(status.week) || profile.daysPerWeek;
  if (!isOn(profile)) return profile.daysPerWeek;
  const choices = templateChoices(profile);
  const count = ALL_DAYS.filter((day) => templateForDay(profile, day, choices)).length;
  return count || profile.daysPerWeek;
}

function mainMuscles(template) {
  const muscles = new Set();
  for (const id of template.exerciseIds) {
    for (const muscle of MAIN_WORK(exerciseById(id)?.pattern)) {
      if (!IGNORED_FOR_RECOVERY.has(muscle)) muscles.add(muscle);
    }
  }
  return muscles;
}

/** Advice about recovery for the chosen week. It never stops the person choosing it. */
export function scheduleWarnings(profile) {
  if (!isOn(profile)) return [];
  const choices = templateChoices(profile);
  const warnings = [];
  const week = ALL_DAYS.map((day) => templateForDay(profile, day, choices));
  if (week.every(Boolean)) warnings.push({ id: 'no-rest' });
  week.forEach((template, day) => {
    const second = (day + 1) % 7;
    const following = week[second];
    if (!template || !following) return;
    const shared = mainMuscles(following);
    if ([...mainMuscles(template)].some((m) => shared.has(m))) warnings.push({ id: 'back-to-back', first: day, second });
  });
  return warnings;
}
