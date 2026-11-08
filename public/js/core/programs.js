// Fixed training blocks. A program runs on the calendar from the week it starts,
// setting the rep range, number of sets and lighter weeks for each week.

import { autoProgram } from './autoplan.js';
import { repRange } from './plan.js';
import { weekStart } from './stats.js';

const WEEK = 7 * 86400000;

export const PROGRAMS = [
  {
    id: 'foundation-8',
    name: 'Foundation',
    summary: 'Eight weeks to build the habit and the muscle. A good first program.',
    phases: [
      { name: 'Build', weeks: 3, goal: 'muscle', setsDelta: 0 },
      { name: 'Lighter week', weeks: 1, goal: 'muscle', setsDelta: 0, lighter: true },
      { name: 'Build further', weeks: 3, goal: 'muscle', setsDelta: 1 },
      { name: 'Lighter week', weeks: 1, goal: 'muscle', setsDelta: 0, lighter: true },
    ],
  },
  {
    id: 'strength-12',
    name: 'Strength',
    summary: 'Twelve weeks moving from muscle to stronger bands and lower reps.',
    phases: [
      { name: 'Base', weeks: 3, goal: 'muscle', setsDelta: 0 },
      { name: 'Lighter week', weeks: 1, goal: 'muscle', setsDelta: 0, lighter: true },
      { name: 'Strength', weeks: 3, goal: 'strength', setsDelta: 0 },
      { name: 'Lighter week', weeks: 1, goal: 'strength', setsDelta: 0, lighter: true },
      { name: 'Peak strength', weeks: 3, goal: 'strength', setsDelta: 1 },
      { name: 'Lighter week', weeks: 1, goal: 'strength', setsDelta: 0, lighter: true },
    ],
  },
  {
    id: 'stamina-8',
    name: 'Stamina',
    summary: 'Eight weeks of higher reps and shorter rests.',
    phases: [
      { name: 'Base', weeks: 3, goal: 'muscle', setsDelta: 0 },
      { name: 'Lighter week', weeks: 1, goal: 'muscle', setsDelta: 0, lighter: true },
      { name: 'High reps', weeks: 3, goal: 'endurance', setsDelta: 1 },
      { name: 'Lighter week', weeks: 1, goal: 'endurance', setsDelta: 0, lighter: true },
    ],
  },
];

/** A fixed program, or the person's own automatic plan. */
export function programById(id, profile) {
  if (id === 'auto') return autoProgram(profile ?? {});
  return PROGRAMS.find((p) => p.id === id);
}

export function programWeeks(program) {
  return program.phases.reduce((sum, phase) => sum + phase.weeks, 0);
}

/** Where a person is in their program, or null if they are not on one. */
export function programStatus(profile, now) {
  const program = programById(profile.program?.id, profile);
  if (!program) return null;
  const totalWeeks = programWeeks(program);
  const index = Math.round((weekStart(now) - weekStart(profile.program.startedAt)) / WEEK);
  if (index >= totalWeeks) return { program, week: totalWeeks, totalWeeks, phase: null, finished: true };
  let seen = 0;
  const phase = program.phases.find((p) => {
    seen += p.weeks;
    return index < seen;
  });
  return { program, week: Math.max(0, index) + 1, totalWeeks, phase, finished: false };
}

/** The rep range and sets to use now: the program's if there is one, otherwise the person's goal. */
export function sessionSettings(profile, now) {
  const phase = programStatus(profile, now)?.phase;
  const range = repRange(phase?.goal ?? profile.goal);
  return {
    range: profile.rest && profile.rest !== 'auto' ? { ...range, rest: profile.rest } : range,
    setsDelta: phase?.setsDelta ?? 0,
  };
}
