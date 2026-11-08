// Decides when to ease off: returning after a break, and lighter weeks that let
// the body catch up.

import { programStatus } from './programs.js';
import { weekStart } from './stats.js';

const DAY = 86400000;
const BREAK_DAYS = 14;
const LONG_BREAK_DAYS = 30;
const WEEKS_BEFORE_LIGHTER = 6;
const LIMIT_SHARE = 0.7;
const MIN_RATED_SETS = 6;

/** 0: no break. 1: two weeks or more away. 2: a month or more away. */
export function comebackLevel(workouts, now) {
  if (!workouts.length) return 0;
  const last = Math.max(...workouts.map((w) => w.finishedAt));
  const days = Math.floor((now - last) / DAY);
  if (days >= LONG_BREAK_DAYS) return 2;
  return days >= BREAK_DAYS ? 1 : 0;
}

function straightWeeksBefore(workouts, now, since) {
  const trained = new Set(workouts.filter((w) => w.finishedAt > since).map((w) => weekStart(w.finishedAt)));
  const cursor = new Date(weekStart(now));
  let count = 0;
  for (;;) {
    cursor.setDate(cursor.getDate() - 7);
    if (!trained.has(cursor.getTime())) return count;
    count += 1;
  }
}

function mostlyAtTheLimit(workouts, since) {
  const recent = workouts.filter((w) => w.finishedAt > since && !w.lighter).slice(-2);
  if (recent.length < 2) return false;
  const rated = recent.flatMap((w) => w.exercises.flatMap((e) => e.sets)).filter((s) => s.effort);
  if (rated.length < MIN_RATED_SETS) return false;
  return rated.filter((s) => s.effort === 'limit').length / rated.length >= LIMIT_SHARE;
}

/** Whether this week should be a lighter one, and why. */
export function lighterWeekStatus(state, now) {
  const { profile, workouts } = state;
  const off = { active: false, reason: null };

  const program = programStatus(profile, now);
  if (program?.phase) return program.phase.lighter ? { active: true, reason: 'program' } : off;
  if (comebackLevel(workouts, now) || profile.autoLighter === false) return off;

  const thisWeek = weekStart(now);
  const skipped = profile.lighterSkippedAt ?? 0;
  if (skipped >= thisWeek) return off;
  if (workouts.some((w) => w.lighter && w.finishedAt >= thisWeek)) return { active: true, reason: 'schedule' };

  const lastLighter = Math.max(0, ...workouts.filter((w) => w.lighter).map((w) => w.finishedAt));
  const since = Math.max(lastLighter, skipped);
  if (straightWeeksBefore(workouts, now, since) >= WEEKS_BEFORE_LIGHTER) return { active: true, reason: 'schedule' };
  if (mostlyAtTheLimit(workouts, since)) return { active: true, reason: 'effort' };
  return off;
}
