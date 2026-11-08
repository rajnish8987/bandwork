// Builds a personal plan from the person's level and goal: a four week short term
// block, then a 24 week long term plan that works toward their goal. It is worked out
// fresh each time, so it follows any change to their level or goal.

export const SHORT_TERM_WEEKS = 4;

const GOAL_NAMES = {
  strength: 'Get stronger',
  muscle: 'Build muscle',
  endurance: 'Build endurance',
  fitness: 'General fitness',
  fatloss: 'Burn fat',
};

const LEARN = 'Learn the moves';
const BASE = 'Build your base';
const LIGHTER = 'Lighter week';

/** Every phase name a plan can use, for translation. */
export const AUTO_PHASE_NAMES = [...Object.values(GOAL_NAMES), LEARN, BASE, LIGHTER];

// The long term blocks for each goal, ending on the goal itself.
const LONG_TERM = {
  strength: [['muscle', 0], ['strength', 0], ['muscle', 1], ['strength', 1]],
  muscle: [['fitness', 0], ['muscle', 0], ['strength', 0], ['muscle', 1]],
  endurance: [['fitness', 0], ['endurance', 0], ['muscle', 0], ['endurance', 1]],
  fitness: [['muscle', 0], ['fitness', 0], ['endurance', 0], ['fitness', 1]],
  fatloss: [['fitness', 0], ['fatloss', 0], ['muscle', 0], ['fatloss', 1]],
};

const HARD_WEEKS = 5;

function shortTerm(level, goal) {
  const lighter = { name: LIGHTER, weeks: 1, goal, setsDelta: 0, lighter: true, term: 'short' };
  if (level === 'beginner') {
    return [
      { name: LEARN, weeks: 1, goal: 'fitness', setsDelta: -1, term: 'short' },
      { name: BASE, weeks: 2, goal: 'fitness', setsDelta: 0, term: 'short' },
      lighter,
    ];
  }
  return [{ name: BASE, weeks: 3, goal, setsDelta: 0, term: 'short' }, lighter];
}

function longTerm(goal) {
  return LONG_TERM[goal].flatMap(([blockGoal, setsDelta]) => [
    { name: GOAL_NAMES[blockGoal], weeks: HARD_WEEKS, goal: blockGoal, setsDelta, term: 'long' },
    { name: LIGHTER, weeks: 1, goal: blockGoal, setsDelta: 0, lighter: true, term: 'long' },
  ]);
}

export function autoProgram({ level = 'beginner', goal = 'muscle' }) {
  const safeGoal = LONG_TERM[goal] ? goal : 'muscle';
  return {
    id: 'auto',
    name: 'Your plan',
    summary: 'Made for your level and goal. It updates if you change either one.',
    phases: [...shortTerm(level, safeGoal), ...longTerm(safeGoal)],
  };
}
