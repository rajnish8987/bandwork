// Exercise library. Poses describe a simple figure in a 200 x 200 frame, facing
// right when seen from the side. Each exercise has a start and an end pose; the
// figure animates between them (see ui/figure-math.js).
// hands and feet are world positions; elbows and knees are solved from them.

const FLOOR = 178;
const STAND_HIP = [100, 118];
const FEET = [[98, FLOOR], [104, FLOOR]];
const WIDE = [[86, FLOOR], [114, FLOOR]];

const side = (extra) => ({ view: 'side', elbows: [1, 1], knees: [-1, -1], ...extra });
const front = (extra) => ({ view: 'front', elbows: [1, -1], knees: [1, -1], ...extra });

export const EXERCISES = [
  // Legs
  {
    id: 'squat', name: 'Squat', pattern: 'squat', muscles: 'Thighs and glutes', tier: 'heavy',
    setup: 'Stand on the band with feet shoulder-width apart. Hold the ends at your shoulders.',
    cues: ['Sit your hips back and down', 'Keep your chest tall', 'Push the floor away to stand'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: STAND_HIP, torso: 178, hands: [[116, 68], [114, 68]], feet: FEET },
      { hip: [78, 146], torso: 150, hands: [[124, 104], [122, 104]], feet: FEET },
    ],
  },
  {
    id: 'split-squat', name: 'Split squat', pattern: 'squat', muscles: 'Thighs and glutes', tier: 'medium', perSide: true,
    setup: 'Step one foot onto the band and the other foot back. Hold the ends at your shoulders.',
    cues: ['Drop straight down', 'Keep your front heel planted', 'Stop before the back knee touches'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: [96, 120], torso: 180, hands: [[114, 70], [112, 70]], feet: [[128, FLOOR], [66, FLOOR]] },
      { hip: [96, 142], torso: 178, hands: [[114, 92], [112, 92]], feet: [[128, FLOOR], [66, FLOOR]] },
    ],
  },
  {
    id: 'deadlift', name: 'Romanian deadlift', pattern: 'hinge', muscles: 'Hamstrings, glutes and lower back', tier: 'heavy',
    setup: 'Stand on the band with feet hip-width apart. Hold the ends with arms straight.',
    cues: ['Push your hips back', 'Keep your back flat', 'Squeeze your glutes to stand'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[104, 114], [102, 114]], feet: FEET },
      { hip: [80, 122], torso: 112, hands: [[124, 150], [122, 150]], feet: FEET },
    ],
  },
  {
    id: 'good-morning', name: 'Good morning', pattern: 'hinge', muscles: 'Hamstrings and lower back', tier: 'light',
    setup: 'Stand on the band and loop the other end over your upper back. Hold it in place at your shoulders.',
    cues: ['Soften your knees', 'Bow forward from the hips', 'Stop when your back wants to round'],
    ...side({ band: [['foot0', 'back']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[112, 74], [110, 74]], feet: FEET },
      { hip: [82, 120], torso: 112, hands: [[134, 116], [132, 116]], feet: FEET },
    ],
  },
  {
    id: 'glute-bridge', name: 'Glute bridge', pattern: 'glute', muscles: 'Glutes and hamstrings', tier: 'medium',
    setup: 'Lie on your back, knees bent. Lay the band across your hips and pin the ends to the floor with your hands.',
    cues: ['Drive through your heels', 'Lift until knees, hips and shoulders line up', 'Pause at the top'],
    ...side({ knees: [-1, -1], band: [['hand0', 'hip0']] }),
    poses: [
      { hip: [100, 164], torso: -90, hands: [[98, 174], [96, 174]], feet: [[138, FLOOR], [142, FLOOR]] },
      { hip: [96, 134], torso: -58, hands: [[99, 174], [97, 174]], feet: [[138, FLOOR], [142, FLOOR]] },
    ],
  },
  {
    id: 'lateral-walk', name: 'Lateral band walk', pattern: 'glute', muscles: 'Outer glutes', tier: 'light', mini: true, perSide: true,
    setup: 'Slide a mini loop just above your knees. Sink into a shallow squat.',
    cues: ['Step sideways, then follow slowly', 'Keep tension on the band', 'Keep your knees pushed out'],
    ...front({ band: [['knee0', 'knee1']] }),
    poses: [
      { hip: [100, 124], torso: 180, hands: [[94, 106], [106, 106]], feet: [[82, FLOOR], [118, FLOOR]] },
      { hip: [93, 124], torso: 180, hands: [[87, 106], [99, 106]], feet: [[62, FLOOR], [118, FLOOR]] },
    ],
  },
  {
    id: 'leg-curl', name: 'Lying leg curl', pattern: 'hinge', muscles: 'Hamstrings', tier: 'light', anchor: 'low', perSide: true,
    setup: 'Anchor the band low in a door. Lie face down with your feet toward the door and loop the band around one ankle.',
    cues: ['Keep your hips on the floor', 'Curl your heel toward your glute', 'Lower slowly'],
    ...side({ knees: [1, 1], door: [190, 170], band: [['door', 'foot0']] }), // face down, so knees fold the other way
    poses: [
      { hip: [92, 166], torso: -91, hands: [[88, 174], [86, 174]], feet: [[156, 170], [156, 172]] },
      { hip: [92, 166], torso: -91, hands: [[88, 174], [86, 174]], feet: [[118, 136], [156, 172]] },
    ],
  },
  {
    id: 'calf-raise', name: 'Calf raise', pattern: 'calf', muscles: 'Calves', tier: 'medium',
    setup: 'Stand on the band with the balls of your feet. Hold the ends at your shoulders.',
    cues: ['Rise as high as you can', 'Pause at the top', 'Lower your heels slowly'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: [100, 116], torso: 180, hands: [[116, 66], [114, 66]], feet: [[100, FLOOR], [100, FLOOR]], toes: [[112, FLOOR], [112, FLOOR]] },
      { hip: [102, 104], torso: 180, hands: [[118, 54], [116, 54]], feet: [[104, 168], [104, 168]], toes: [[112, FLOOR], [112, FLOOR]] },
    ],
  },

  // Push
  {
    id: 'wrap-press', name: 'Chest press, band behind back', pattern: 'hpush', muscles: 'Chest, shoulders and triceps', tier: 'medium',
    setup: 'Wrap the band across your upper back and under your arms. Hold the ends at chest height.',
    cues: ['Press straight forward', 'Keep your shoulders down', 'Return slowly'],
    ...side({ band: [['back', 'hand0']] }),
    poses: [
      { hip: [96, 118], torso: 176, hands: [[122, 76], [120, 76]], feet: [[86, FLOOR], [120, FLOOR]] },
      { hip: [96, 118], torso: 176, hands: [[150, 72], [148, 72]], feet: [[86, FLOOR], [120, FLOOR]] },
    ],
  },
  {
    id: 'door-press', name: 'Chest press, door anchor', pattern: 'hpush', muscles: 'Chest, shoulders and triceps', tier: 'medium', anchor: 'mid',
    setup: 'Anchor the band at chest height and face away from the door. Stagger your feet and step out until the band is taut.',
    cues: ['Press straight forward', 'Keep your ribs down', 'Return slowly'],
    ...side({ door: [14, 74], band: [['door', 'hand0']] }),
    poses: [
      { hip: [96, 118], torso: 170, hands: [[126, 76], [124, 76]], feet: [[82, FLOOR], [122, FLOOR]] },
      { hip: [96, 118], torso: 170, hands: [[156, 72], [154, 72]], feet: [[82, FLOOR], [122, FLOOR]] },
    ],
  },
  {
    id: 'push-up', name: 'Band push-up', pattern: 'hpush', muscles: 'Chest, triceps and core', tier: 'light',
    setup: 'Lay the band across your upper back and pin each end under a hand. Set up in a push-up position. Drop to your knees to make it easier.',
    cues: ['Keep your body in one line', 'Lower until your chest nears the floor', 'Press the floor away'],
    ...side({ elbows: [1, 1], band: [['hand0', 'back']] }),
    poses: [
      { hip: [90, 151], torso: 114, hands: [[140, FLOOR], [136, FLOOR]], feet: [[30, FLOOR], [30, FLOOR]] },
      { hip: [95, 165], torso: 101, hands: [[140, FLOOR], [136, FLOOR]], feet: [[30, FLOOR], [30, FLOOR]] },
    ],
  },
  {
    id: 'overhead-press', name: 'Overhead press', pattern: 'vpush', muscles: 'Shoulders and triceps', tier: 'light',
    setup: 'Stand on the band, feet hip-width apart. Hold the ends at your shoulders.',
    cues: ['Brace your stomach', 'Press up until your arms are straight', 'Lower with control'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[116, 68], [114, 68]], feet: FEET },
      { hip: STAND_HIP, torso: 180, hands: [[104, 18], [102, 18]], feet: FEET },
    ],
  },
  {
    id: 'lateral-raise', name: 'Lateral raise', pattern: 'shoulder', muscles: 'Side of the shoulders', tier: 'light',
    setup: 'Stand on the band with feet hip-width apart. Hold one end in each hand at your sides.',
    cues: ['Raise your arms out to the sides', 'Stop at shoulder height', 'Lower slowly'],
    ...front({ band: [['foot0', 'hand0'], ['foot1', 'hand1']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[80, 112], [120, 112]], feet: WIDE },
      { hip: STAND_HIP, torso: 180, hands: [[36, 70], [164, 70]], feet: WIDE },
    ],
  },
  {
    id: 'pressdown', name: 'Triceps pressdown', pattern: 'triceps', muscles: 'Triceps', tier: 'light', anchor: 'high',
    setup: 'Anchor the band high in a door and face it. Pin your elbows to your sides.',
    cues: ['Keep your elbows still', 'Press down until your arms are straight', 'Let your hands rise slowly'],
    ...side({ door: [186, 24], band: [['door', 'hand0']] }),
    poses: [
      { hip: [96, 118], torso: 172, hands: [[126, 74], [124, 74]], feet: FEET },
      { hip: [96, 118], torso: 172, hands: [[108, 114], [106, 114]], feet: FEET },
    ],
  },
  {
    id: 'overhead-triceps', name: 'Overhead triceps extension', pattern: 'triceps', muscles: 'Triceps', tier: 'light',
    setup: 'Stand on the band with your back foot. Hold the ends behind your head, elbows pointing up.',
    cues: ['Keep your elbows close to your head', 'Straighten your arms overhead', 'Lower behind your head slowly'],
    ...side({ band: [['foot1', 'hand0']] }),
    poses: [
      { hip: [100, 118], torso: 180, hands: [[86, 54], [84, 54]], feet: [[112, FLOOR], [84, FLOOR]] },
      { hip: [100, 118], torso: 180, hands: [[100, 18], [98, 18]], feet: [[112, FLOOR], [84, FLOOR]] },
    ],
  },

  // Pull
  {
    id: 'seated-row', name: 'Seated row', pattern: 'hpull', muscles: 'Mid back and biceps', tier: 'medium',
    setup: 'Sit on the floor with legs out and knees soft. Loop the band around your feet and hold the ends.',
    cues: ['Sit tall', 'Pull your elbows back past your ribs', 'Squeeze your shoulder blades'],
    ...side({ band: [['toe0', 'hand0']] }),
    poses: [
      { hip: [64, 166], torso: 176, hands: [[112, 128], [110, 128]], feet: [[126, 172], [126, 172]] },
      { hip: [64, 166], torso: 176, hands: [[82, 134], [80, 134]], feet: [[126, 172], [126, 172]] },
    ],
  },
  {
    id: 'bent-row', name: 'Bent-over row', pattern: 'hpull', muscles: 'Back and biceps', tier: 'medium',
    setup: 'Stand on the band, push your hips back and lean forward with a flat back. Let your arms hang.',
    cues: ['Keep your back flat', 'Pull your elbows toward the ceiling', 'Lower slowly'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: [80, 122], torso: 118, hands: [[124, 148], [122, 148]], feet: FEET },
      { hip: [80, 122], torso: 118, hands: [[108, 116], [106, 116]], feet: FEET },
    ],
  },
  {
    id: 'pulldown', name: 'Kneeling lat pulldown', pattern: 'vpull', muscles: 'Lats and biceps', tier: 'medium', anchor: 'high',
    setup: 'Anchor the band high in a door. Kneel facing it, far enough back that your arms reach up to the band with tension.',
    cues: ['Lift your chest', 'Pull your elbows down to your ribs', 'Let your arms rise slowly'],
    ...side({ door: [186, 16], band: [['door', 'hand0']] }),
    poses: [
      { hip: [90, 142], torso: 176, hands: [[124, 56], [122, 56]], feet: [[56, FLOOR], [56, FLOOR]] },
      { hip: [90, 142], torso: 176, hands: [[112, 96], [110, 96]], feet: [[56, FLOOR], [56, FLOOR]] },
    ],
  },
  {
    id: 'overhead-pull-apart', name: 'Overhead pull-apart', pattern: 'vpull', muscles: 'Lats and upper back', tier: 'light',
    setup: 'Hold the band overhead with hands a little wider than shoulders and arms nearly straight.',
    cues: ['Pull the band apart', 'Bring it down behind your head to the top of your back', 'Return with control'],
    ...front({ elbows: [-1, 1], band: [['hand0', 'hand1']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[84, 18], [116, 18]], feet: WIDE },
      { hip: STAND_HIP, torso: 180, hands: [[48, 50], [152, 50]], feet: WIDE },
    ],
  },
  {
    id: 'pull-apart', name: 'Band pull-apart', pattern: 'rear', muscles: 'Upper back and rear shoulders', tier: 'light',
    setup: 'Hold the band at chest height with arms straight in front of you, hands shoulder-width apart.',
    cues: ['Pull your hands out to the sides', 'Squeeze your shoulder blades', 'Return slowly'],
    ...front({ elbows: [1, -1], band: [['hand0', 'hand1']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[88, 82], [112, 82]], feet: WIDE },
      { hip: STAND_HIP, torso: 180, hands: [[36, 72], [164, 72]], feet: WIDE },
    ],
  },
  {
    id: 'face-pull', name: 'Face pull', pattern: 'rear', muscles: 'Rear shoulders and upper back', tier: 'light', anchor: 'high',
    setup: 'Anchor the band at about head height and face it. Step back until the band is taut.',
    cues: ['Pull your hands toward your forehead', 'Lead with your elbows, high and wide', 'Return slowly'],
    ...side({ elbows: [-1, -1], door: [186, 50], band: [['door', 'hand0']] }),
    poses: [
      { hip: [94, 118], torso: 176, hands: [[144, 62], [142, 62]], feet: FEET },
      { hip: [94, 118], torso: 176, hands: [[118, 50], [116, 50]], feet: FEET },
    ],
  },
  {
    id: 'curl', name: 'Biceps curl', pattern: 'biceps', muscles: 'Biceps', tier: 'light',
    setup: 'Stand on the band, feet hip-width apart. Hold the ends with palms facing forward.',
    cues: ['Pin your elbows to your sides', 'Curl your hands to your shoulders', 'Lower slowly'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[106, 114], [104, 114]], feet: FEET },
      { hip: STAND_HIP, torso: 180, hands: [[120, 72], [118, 72]], feet: FEET },
    ],
  },

  // Core
  {
    id: 'pallof', name: 'Pallof press', pattern: 'core', muscles: 'Core', tier: 'light', anchor: 'mid', perSide: true,
    setup: 'Anchor the band at chest height and stand side-on to the door, far enough that the band pulls you sideways. Hold it at your chest.',
    cues: ['Press straight out from your chest', 'Do not let the band twist you', 'Bring your hands back slowly'],
    ...side({ door: [118, 76], doorFlat: true, band: [['door', 'hand0']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[118, 78], [116, 78]], feet: FEET },
      { hip: STAND_HIP, torso: 180, hands: [[148, 76], [146, 76]], feet: FEET },
    ],
  },
  {
    id: 'woodchop', name: 'Woodchop', pattern: 'core', muscles: 'Core and obliques', tier: 'light', anchor: 'high', perSide: true,
    setup: 'Anchor the band high and stand side-on to the door. Hold the end with both hands up toward the anchor.',
    cues: ['Pull down and across your body', 'Turn through your trunk and back foot', 'Return with control'],
    ...front({ door: [14, 20], elbows: [1, -1], band: [['door', 'hand0']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[74, 34], [76, 36]], feet: WIDE },
      { hip: STAND_HIP, torso: 180, hands: [[112, 106], [114, 106]], feet: WIDE },
    ],
  },
  {
    id: 'kneeling-crunch', name: 'Kneeling crunch', pattern: 'core', muscles: 'Abs', tier: 'light', anchor: 'high',
    setup: 'Anchor the band high and kneel facing away from the door. Hold the ends beside your head.',
    cues: ['Curl your ribs toward your hips', 'Keep your hips still', 'Rise slowly'],
    ...side({ door: [14, 20], band: [['door', 'hand0']] }),
    poses: [
      { hip: [96, 142], torso: 178, hands: [[106, 80], [104, 80]], feet: [[62, FLOOR], [62, FLOOR]] },
      { hip: [96, 142], torso: 140, hands: [[136, 94], [134, 94]], feet: [[62, FLOOR], [62, FLOOR]] },
    ],
  },
  {
    id: 'side-bend', name: 'Side bend', pattern: 'core', muscles: 'Obliques', tier: 'light', perSide: true,
    setup: 'Stand on the band. Hold the end in one hand at your side and put the other hand behind your head.',
    cues: ['Bend directly away from the band', 'Do not lean forward or back', 'Return to tall slowly'],
    ...front({ elbows: [-1, -1], band: [['foot1', 'hand1']] }),
    poses: [
      { hip: STAND_HIP, torso: 186, hands: [[84, 50], [116, 112]], feet: WIDE },
      { hip: STAND_HIP, torso: 203, hands: [[62, 58], [104, 112]], feet: WIDE },
    ],
  },
  {
    id: 'dead-bug', name: 'Dead bug', pattern: 'core', muscles: 'Deep core', tier: 'light',
    setup: 'Lie on your back, knees bent up over your hips. Hold the band above your chest and pull it taut.',
    cues: ['Press your lower back into the floor', 'Lower one arm and the opposite leg', 'Return and switch sides'],
    ...side({ knees: [-1, -1], elbows: [-1, -1], band: [['hand0', 'hand1']] }),
    poses: [
      { hip: [108, 168], torso: -92, hands: [[62, 120], [58, 120]], feet: [[140, 136], [140, 136]] },
      { hip: [108, 168], torso: -92, hands: [[62, 120], [12, 156]], feet: [[172, 164], [140, 136]] },
    ],
  },
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function exerciseById(id) {
  return BY_ID.get(id);
}

export function isAvailable(exercise, profile) {
  if (!exercise) return false;
  if (exercise.anchor && !profile.hasAnchor) return false;
  if (exercise.mini && !profile.hasMini) return false;
  return true;
}
