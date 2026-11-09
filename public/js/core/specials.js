// Specials: videos with jump points, sorted by level, and the training know-how drawn
// from them. All of these videos belong to Fitness My Life on YouTube. tools/check-videos.mjs
// checks they still exist and still allow playing inside the app.

export const SPECIALS_CHANNEL = 'Fitness My Life';
export const SPECIALS_CHANNEL_URL = 'https://www.youtube.com/@fitnessmylife';

export const LEVELS = [
  { id: 'start', name: 'Start here', text: 'What bands can do, how to keep progressing, and what to eat.' },
  { id: 'beginner', name: 'Beginner', text: 'Weeks 1 to 4. Full body workouts three or four days a week.', startWeek: 1 },
  { id: 'intermediate', name: 'Intermediate', text: 'Weeks 5 to 8. An upper and lower body split, four days a week and one day of cardio.', startWeek: 5 },
  { id: 'advanced', name: 'Advanced', text: 'Weeks 9 to 12. Push, pull and legs, three days on and one day off.', startWeek: 9 },
];

// Each moment is [seconds, label] or [seconds, label, exerciseId]. With an exercise,
// the label is that exercise's name and the moment links to its page.
const ex = (seconds, exerciseId) => [seconds, null, exerciseId];

export const SPECIALS = [
  /* ---------- Start here ---------- */
  {
    id: 'week-0', level: 'start', videoId: 'ReyG8ZhlZ2o', minutes: 8,
    title: 'Week 0: how to progress, and what to eat',
    moments: [[53, 'Seven ways to progress'], [244, 'Diet and nutrition']],
  },
  {
    id: 'bands-vs-weights', level: 'start', videoId: 'ELxezrSGmEA', minutes: 11,
    title: 'Can bands build muscle?',
    moments: [[48, 'What bands and weights share'], [221, 'Where bands win'], [428, 'Where bands fall short'], [547, 'Can bands build muscle?'], [572, 'Are bands as good as weights?']],
  },
  { id: 'all-about-bands', level: 'start', videoId: 'IsbQv302svk', title: 'All about resistance bands', moments: [] },
  { id: 'tube-vs-loop', level: 'start', videoId: 'HnD3oVziqGo', title: 'Tube bands or loop bands?', moments: [] },
  { id: 'warm-up', level: 'start', videoId: 'xVtkbBHnofo', title: 'Full body warm-up', moments: [] },
  { id: 'diet-plan', level: 'start', videoId: 'DhAfxWYz4Zk', title: 'Make your own diet plan in five steps', moments: [] },

  /* ---------- Beginner ---------- */
  {
    id: 'full-body', level: 'beginner', videoId: 'njGZClD94bg', minutes: 7,
    title: 'Full body workout with bands',
    plan: 'Three days a week for 8 to 10 weeks: 2 sets of 12 to 15 reps, with 45 seconds of rest.',
    moments: [ex(46, 'chest-fly'), ex(85, 'incline-fly'), ex(123, 'decline-fly'), ex(160, 'pressdown'), ex(181, 'kickback'), ex(203, 'curl'), ex(241, 'preacher-curl'), ex(273, 'overhead-press'), ex(297, 'lateral-raise'), ex(325, 'front-raise'), ex(351, 'pulldown'), ex(382, 'seated-row'), ex(413, 'squat'), ex(413, 'lunge')],
  },
  {
    id: 'abs-10', level: 'beginner', videoId: 'JbVBZZzdvy4', minutes: 6,
    title: '10 easy abs exercises',
    plan: 'Every other day, at least three days a week. No band needed.',
    moments: [[14, 'Why abs need rest'], [31, 'What makes abs visible'], ex(63, 'crunch'), ex(104, 'reverse-crunch'), ex(129, 'knee-crunch'), ex(154, 'flutter-kick'), ex(194, 'cross-crunch'), ex(220, 'leg-raise'), ex(247, 'toe-touch'), ex(280, 'heel-touch'), ex(300, 'plank')],
  },
  {
    id: 'week-1', level: 'beginner', videoId: 'sBeGmUBvt-s', minutes: 13, week: 1,
    title: 'Week 1: learn the 8 basics',
    plan: 'Monday and Wednesday: 3 sets of 12, 10 and 8 reps. Friday: add a set of 6. Sunday: 20 to 25 minutes of cardio.',
    moments: [[33, "This week's plan"], ex(124, 'door-press'), [225, 'Track your sets'], ex(249, 'overhead-press'), ex(301, 'pulldown'), ex(375, 'pressdown'), ex(443, 'curl'), ex(523, 'squat'), ex(593, 'seated-calf'), ex(685, 'kneeling-crunch')],
  },
  {
    id: 'week-2', level: 'beginner', videoId: 'kCZmSl0yb3U', minutes: 19, week: 2,
    title: 'Week 2: 12 exercises',
    plan: 'Monday, Wednesday and Friday: 3 sets of 12, 10 and 8 reps. Sunday: 20 to 25 minutes of cardio.',
    moments: [[32, "This week's plan"], ex(97, 'incline-press'), [164, 'Why the 45 degree angle matters'], [230, 'How to pick the right band'], ex(262, 'chest-fly'), ex(329, 'side-front-raise'), ex(403, 'reverse-fly'), ex(490, 'straight-arm-pulldown'), ex(564, 'seated-row'), ex(646, 'overhead-triceps'), ex(735, 'hammer-curl'), ex(800, 'preacher-curl'), ex(863, 'lunge'), ex(948, 'deadlift'), ex(1044, 'reverse-crunch')],
  },
  {
    id: 'week-3', level: 'beginner', videoId: '-7gHivQ2fRc', minutes: 11, week: 3,
    title: 'Week 3: full body circuit',
    plan: 'Monday, Wednesday and Friday: 3 rounds of 12, 10 and 8 reps, with no rest between exercises and one minute between rounds. No door anchor needed.',
    moments: [[10, 'What circuit training is'], [75, "This week's plan"], [154, 'Round one, follow along']],
  },
  {
    id: 'week-4', level: 'beginner', videoId: 'Ctjzq0EyeZM', minutes: 7, week: 4,
    title: 'Week 4: slow negatives',
    plan: 'Monday, Wednesday, Friday and Sunday: 3 sets, lifting for 1 second, holding for 1 second and lowering for 3 seconds. If you train on Sunday and feel sore on Monday, take Monday easy.',
    moments: [[35, "This week's plan"], [73, 'How slow negatives work'], ex(195, 'incline-press'), ex(215, 'chest-fly'), ex(236, 'overhead-press'), ex(252, 'side-front-raise'), ex(272, 'pressdown'), ex(291, 'pulldown'), ex(306, 'seated-row'), ex(320, 'curl'), ex(339, 'preacher-curl'), ex(358, 'squat'), ex(373, 'lunge'), ex(390, 'reverse-crunch')],
  },
  {
    id: 'plan-full-body', level: 'beginner', videoId: 'rpgGExJzF2c',
    title: 'Beginner plan: full body routine',
    moments: [],
  },

  /* ---------- Intermediate ---------- */
  {
    id: 'week-5', level: 'intermediate', videoId: 's6IXzTs_MFQ', minutes: 13, week: 5,
    title: 'Week 5: upper and lower split',
    plan: 'Monday and Thursday: upper body. Tuesday and Friday: lower body. Sunday: cardio.',
    moments: [[34, "This week's plan"], ex(112, 'incline-press'), ex(150, 'door-press'), ex(189, 'arnold-press'), ex(222, 'face-pull'), ex(252, 'shrug'), ex(292, 'pulldown'), ex(327, 'behind-back-curl'), ex(380, 'reverse-curl'), ex(410, 'overhead-triceps'), ex(458, 'kneeling-crunch'), ex(481, 'squat'), ex(526, 'lunge'), ex(553, 'deadlift'), ex(592, 'donkey-kick'), [602, 'Why shoes matter on this one'], ex(632, 'leg-press'), ex(666, 'bulgarian-squat')],
  },
  {
    id: 'week-6', level: 'intermediate', videoId: '3HQ5ivHmzvY', minutes: 8, week: 6,
    title: 'Week 6: upper and lower, heavy',
    plan: 'The same days as week 5. Use the strongest band you can control for 6 to 10 reps.',
    moments: [[50, "This week's plan"], [89, 'Upper body'], ex(89, 'door-press'), ex(168, 'overhead-press'), ex(192, 'reverse-fly'), ex(210, 'pulldown'), ex(227, 'bent-row'), ex(267, 'behind-back-curl'), ex(290, 'reverse-crunch'), [332, 'Lower body'], ex(332, 'squat'), ex(361, 'deadlift'), ex(436, 'calf-raise')],
  },
  {
    id: 'week-7', level: 'intermediate', videoId: '_umePsmxOKg', minutes: 9, week: 7,
    title: 'Weeks 7 and 8: training to failure',
    plan: 'The same days again: 3 sets of 10 reps, 8 reps and a last set to failure.',
    moments: [[49, 'What failure means'], [178, 'When your mind wants to stop'], [201, "This week's plan"], [237, 'Upper body'], [400, 'Lower body'], ex(400, 'squat'), ex(436, 'deadlift'), ex(466, 'donkey-kick')],
  },
  {
    id: 'plan-upper-lower', level: 'intermediate', videoId: '6wzGqg6TBOg',
    title: 'Intermediate plan: upper and lower routine',
    moments: [],
  },

  /* ---------- Advanced ---------- */
  {
    id: 'week-9', level: 'advanced', videoId: 'sVJY76D0VDk', minutes: 10, week: 9,
    title: 'Weeks 9 to 12: push, pull and legs',
    plan: 'Three days on and one day off, so your days move each week. 4 sets of 12, 10, 8 and 6 reps, going up a band when you can.',
    moments: [[29, 'The 4 week plan'], [97, 'Push day'], ex(120, 'door-press'), ex(146, 'incline-press'), ex(165, 'decline-press'), ex(181, 'overhead-press'), ex(198, 'lateral-raise'), ex(216, 'pressdown'), ex(232, 'overhead-triceps'), ex(250, 'kickback'), [269, 'Pull day'], ex(275, 'pulldown'), ex(290, 'seated-row'), ex(302, 'pull-through'), ex(336, 'bent-reverse-fly'), ex(354, 'upright-row'), ex(380, 'shrug'), ex(406, 'behind-back-curl'), ex(432, 'reverse-curl'), [453, 'Leg day'], ex(458, 'squat'), ex(486, 'deadlift'), ex(525, 'donkey-kick'), ex(546, 'goblet-squat'), ex(566, 'seated-calf'), ex(586, 'reverse-crunch')],
  },
  {
    id: 'adv-biceps', level: 'advanced', videoId: '4FyTk4Jhkeg', minutes: 6,
    title: 'Advanced biceps',
    plan: '3 sets of each, going up a band each set.',
    moments: [ex(74, 'curl'), [157, 'Alternate curls'], ex(180, 'preacher-curl'), ex(234, 'concentration-curl')],
  },
  {
    id: 'adv-triceps', level: 'advanced', videoId: 'c9wmvgcsj7g', minutes: 5,
    title: 'Advanced triceps',
    plan: '3 sets of each, going up a band each set, with 1 to 1.5 minutes of rest.',
    moments: [[11, 'Why triceps make your arms bigger'], [53, 'Single arm extension'], ex(100, 'pressdown'), ex(149, 'reverse-pushdown'), ex(196, 'overhead-triceps'), ex(271, 'diamond-push-up')],
  },
  {
    id: 'adv-chest', level: 'advanced', videoId: 'SNWPA3ouu6I', minutes: 6,
    title: 'Advanced chest',
    plan: '3 sets of each, going up a band each set, with 1 to 1.5 minutes of rest.',
    moments: [ex(37, 'door-press'), ex(88, 'incline-press'), ex(106, 'decline-press'), ex(134, 'chest-fly'), ex(195, 'incline-fly')],
  },
  {
    id: 'adv-legs', level: 'advanced', videoId: 'o1IJNdgP5gQ', minutes: 6,
    title: 'Advanced legs',
    moments: [ex(19, 'squat'), ex(103, 'lunge'), ex(169, 'leg-press'), ex(209, 'donkey-kick'), ex(267, 'leg-extension'), ex(323, 'calf-raise')],
  },
  {
    id: 'adv-back', level: 'advanced', videoId: 'yXY20CfpRek', minutes: 5,
    title: 'Advanced back',
    plan: '3 sets of each, going up a band each set, with 1 to 1.5 minutes of rest.',
    moments: [ex(34, 'pulldown'), ex(89, 'seated-row'), ex(137, 'face-pull'), ex(189, 'reverse-fly'), ex(235, 'deadlift')],
  },
  {
    id: 'adv-shoulders', level: 'advanced', videoId: '1nsa9y3Z-zk', minutes: 7,
    title: 'Advanced shoulders',
    moments: [[37, 'Warm-up'], ex(81, 'overhead-press'), ex(138, 'lateral-raise'), ex(189, 'front-raise'), ex(253, 'upright-row'), ex(305, 'shrug'), ex(360, 'bent-reverse-fly')],
  },
  {
    id: 'adv-abs', level: 'advanced', videoId: '88I7ibHDWi0', minutes: 6,
    title: 'Advanced abs',
    moments: [ex(52, 'reverse-crunch'), ex(103, 'woodchop'), ex(166, 'mountain-climber'), ex(217, 'kneeling-crunch'), ex(287, 'side-bend')],
  },
  {
    id: 'adv-forearms', level: 'advanced', videoId: 'AjawOUKbdko', minutes: 5,
    title: 'Advanced forearms',
    moments: [[34, 'Warm-up'], ex(54, 'reverse-curl'), ex(114, 'wrist-curl'), ex(178, 'reverse-wrist-curl')],
  },
  {
    id: 'plan-ppl', level: 'advanced', videoId: 'H8TOdEe8LRo',
    title: 'Advanced plan: push, pull, legs and body part split',
    moments: [],
  },
  {
    id: 'plan-year', level: 'advanced', videoId: 'JDfcj44j_SI',
    title: 'A plan for the whole year',
    moments: [],
  },
];

/* ---------- Know-how, in our own words, each with the video it comes from ---------- */

export const KNOW_HOW = [
  {
    id: 'why-bands', title: 'Why bands build muscle',
    text: ['Muscle grows from three things: tension on the muscle, more work over time, and control of the speed. Bands give you all three, just as weights do.'],
    ref: ['ELxezrSGmEA', 48],
  },
  {
    id: 'bands-or-weights', title: 'Bands or weights?',
    text: [
      'Bands are easy to control, work in any direction because they do not rely on gravity, start light at the beginning of each rep, cost little and go anywhere.',
      'Weights give an exact load, can keep getting heavier and last for years.',
      'Bands are enough for a fit, muscular body. Competition bodybuilding also needs weights.',
    ],
    ref: ['ELxezrSGmEA', 221],
  },
  {
    id: 'seven-ways', title: 'Seven ways to keep progressing',
    list: ['Use a stronger band', 'Do more reps', 'Do more sets', 'Lower more slowly', 'Rest less between sets', 'Train on more days', 'Change your exercises now and then'],
    text: ['Good form comes first. Heavy reps with bad form do not count.'],
    ref: ['ReyG8ZhlZ2o', 53],
  },
  {
    id: 'harder', title: 'Four ways to make a band harder',
    list: ['Stack two or three bands together', 'Step further from the door', 'Stand on the band with both feet', 'Kneel or sit to stretch it further'],
    ref: ['njGZClD94bg', 71],
  },
  {
    id: 'right-band', title: 'How to pick the right band',
    text: ['The last reps of a set should take real effort. If they are easy, the band is too light, so go up. If your form breaks, go down.'],
    ref: ['kCZmSl0yb3U', 230],
  },
  {
    id: 'rep-parts', title: 'The three parts of a rep',
    text: ['Every rep has a lift, a pause and a lowering. Time under tension is how long the muscle works across all three. Lowering slowly is the easiest way to add more.'],
    ref: ['Ctjzq0EyeZM', 73],
  },
  {
    id: 'pyramids', title: 'Pyramid sets',
    text: ['Start with more reps on a lighter band, then go up a band as the reps drop: 12, then 10, then 8. The track sets these reps for you.'],
    ref: ['sBeGmUBvt-s', 34],
  },
  {
    id: 'circuits', title: 'Circuit training',
    text: ['Do one set of each exercise back to back, rest for a minute, then repeat. Your heart rate stays up, so it builds stamina as well as strength. It is hard for beginners, so start with a light band.'],
    ref: ['-7gHivQ2fRc', 10],
  },
  {
    id: 'failure', title: 'Training to failure',
    text: [
      'Keep going until you cannot finish one more clean rep. If your form breaks, stop, because that rep does not count.',
      'Save it for the last set, or you will be too tired for the rest of the workout. Your mind often wants to stop before your muscles do, so try for one more.',
    ],
    ref: ['_umePsmxOKg', 49],
  },
  {
    id: 'splits', title: 'How to divide your week',
    text: ['Full body three days a week suits beginners. Upper and lower body on four days suits intermediates. Push, pull and legs, three days on and one off, suits advanced trainers.'],
    ref: ['sVJY76D0VDk', 29],
  },
  {
    id: 'breathing', title: 'How to breathe',
    text: ['Breathe out as you push or pull, and in as you return. Keep breathing normally in a plank.'],
    ref: ['JbVBZZzdvy4', 79],
  },
  {
    id: 'abs', title: 'What makes abs visible',
    text: ['Crunches strengthen your abs, but you only see them when your body fat is low, roughly under 15 percent for men and a little higher for women, and that comes from your diet. Train abs about three days a week with a day off between.'],
    ref: ['JbVBZZzdvy4', 14],
  },
  {
    id: 'triceps', title: 'Bigger arms start with triceps',
    text: ['Triceps make up more than half of your upper arm, so train them as much as your biceps.'],
    ref: ['c9wmvgcsj7g', 11],
  },
  {
    id: 'food', title: 'What to eat',
    list: [
      'To gain muscle when you are thin, eat about 300 to 400 calories more than you burn',
      'To lose fat, eat about 300 to 400 calories less than you burn',
      'Eat 1.5 to 2.2 grams of protein per kilogram of body weight each day, from any food you like',
      'Get 40 to 45 percent of your calories from carbohydrates, mostly unrefined, and keep healthy fats in your diet',
      'Eat vegetables and fruit every day',
      'Drink plenty of water. The video suggests 3 to 4 litres a day',
    ],
    text: ['This is general guidance, not medical advice. Ask a doctor or dietitian if you have a health condition.'],
    ref: ['ReyG8ZhlZ2o', 244],
  },
];

/** A time in seconds as m:ss. */
export function clockTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

export function specialsForLevel(level) {
  return SPECIALS.filter((s) => s.level === level);
}

/** Every jump point that shows an exercise, for its page. */
export function momentsForExercise(exerciseId) {
  return SPECIALS.flatMap((special) => special.moments
    .filter(([, , id]) => id === exerciseId)
    .map(([seconds]) => ({ special, seconds })));
}

/** The video to go with a week of the track. */
export function specialForWeek(week) {
  const start = week >= 9 ? 9 : week === 8 ? 7 : week;
  return SPECIALS.find((s) => s.week === start) ?? null;
}

/** Every video id used here. */
export function specialVideoIds() {
  return [...new Set([...SPECIALS.map((s) => s.videoId), ...KNOW_HOW.map((k) => k.ref[0])])];
}
