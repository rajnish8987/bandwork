// Exercise library. Poses describe a simple figure in a 200 x 200 frame, facing
// right when seen from the side. Each exercise has a start and an end pose; the
// figure animates between them (see ui/figure-math.js).
// hands and feet are world positions; elbows and knees are solved from them.

const FLOOR = 178;
const STAND_HIP = [100, 118];
const FEET = [[98, FLOOR], [104, FLOOR]];
const WIDE = [[86, FLOOR], [114, FLOOR]];
const STAGGER = [[82, FLOOR], [122, FLOOR]];

const side = (extra) => ({ view: 'side', elbows: [1, 1], knees: [-1, -1], ...extra });
const front = (extra) => ({ view: 'front', elbows: [1, -1], knees: [1, -1], ...extra });

export const EXERCISES = [
  // Legs
  {
    id: 'squat', name: 'Squat', pattern: 'squat', muscles: 'Thighs and glutes', tier: 'heavy',
    setup: 'Stand on the band with feet shoulder-width apart. Hold the ends at your shoulders.',
    cues: ['Sit your hips back and down', 'Go as low as you can with good form', 'Keep your chest tall', 'Push the floor away to stand'],
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
    cues: ['Press straight forward', 'Keep your shoulders back, not rolled forward', 'Keep your ribs down', 'Return slowly'],
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
    cues: ['Pin your elbows to your sides', 'Curl your hands to your shoulders', 'Use the full range, all the way up and down', 'Lower slowly'],
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

  // Chest, from the Fitness My Life series
  {
    id: 'chest-fly', name: 'Chest fly', pattern: 'hpush', muscles: 'Middle of the chest', tier: 'light', anchor: 'mid',
    setup: 'Anchor the band at chest height and face away from the door. Take a step forward with your arms open wide.',
    cues: ['Keep your arms nearly straight', 'Bring your hands together in front of your chest', 'Squeeze, then open slowly'],
    ...side({ door: [14, 74], band: [['door', 'hand0']] }),
    poses: [
      { hip: [96, 118], torso: 172, hands: [[72, 74], [70, 74]], feet: STAGGER },
      { hip: [96, 118], torso: 172, hands: [[150, 78], [148, 78]], feet: STAGGER },
    ],
  },
  {
    id: 'incline-press', name: 'Incline chest press', pattern: 'hpush', muscles: 'Upper chest', tier: 'medium', anchor: 'low',
    setup: 'Anchor the band low and face away from the door. Hold the handles at your shoulders.',
    cues: ['Press up and forward at about 45 degrees', 'Keep that angle, or your shoulders take over', 'Return slowly'],
    ...side({ door: [14, 170], band: [['door', 'hand0']] }),
    poses: [
      { hip: [96, 118], torso: 172, hands: [[124, 74], [122, 74]], feet: STAGGER },
      { hip: [96, 118], torso: 172, hands: [[142, 42], [140, 42]], feet: STAGGER },
    ],
  },
  {
    id: 'incline-fly', name: 'Incline chest fly', pattern: 'hpush', muscles: 'Upper chest', tier: 'light', anchor: 'low',
    setup: 'Anchor the band low and face away from the door. Start with your arms low and wide.',
    cues: ['Keep your arms nearly straight', 'Sweep your hands up and together', 'Pause at the top for a second'],
    ...side({ door: [14, 170], band: [['door', 'hand0']] }),
    poses: [
      { hip: [96, 118], torso: 172, hands: [[76, 104], [74, 104]], feet: STAGGER },
      { hip: [96, 118], torso: 172, hands: [[140, 38], [138, 38]], feet: STAGGER },
    ],
  },
  {
    id: 'decline-press', name: 'Decline chest press', pattern: 'hpush', muscles: 'Lower chest', tier: 'medium', anchor: 'high',
    setup: 'Anchor the band high and face away from the door. Hold the handles at your shoulders.',
    cues: ['Press down and forward', 'Keep your ribs down', 'Return slowly'],
    ...side({ door: [14, 24], band: [['door', 'hand0']] }),
    poses: [
      { hip: [96, 118], torso: 172, hands: [[124, 62], [122, 62]], feet: STAGGER },
      { hip: [96, 118], torso: 172, hands: [[140, 98], [138, 98]], feet: STAGGER },
    ],
  },
  {
    id: 'decline-fly', name: 'Decline chest fly', pattern: 'hpush', muscles: 'Lower chest', tier: 'light', anchor: 'high',
    setup: 'Anchor the band high and face away from the door. Start with your arms high and wide.',
    cues: ['Keep your arms nearly straight', 'Sweep your hands down and together', 'Squeeze, then open slowly'],
    ...side({ door: [14, 24], band: [['door', 'hand0']] }),
    poses: [
      { hip: [96, 118], torso: 172, hands: [[74, 38], [72, 38]], feet: STAGGER },
      { hip: [96, 118], torso: 172, hands: [[138, 100], [136, 100]], feet: STAGGER },
    ],
  },

  // Shoulders
  {
    id: 'arnold-press', name: 'Arnold press', pattern: 'vpush', muscles: 'Shoulders and triceps', tier: 'light',
    setup: 'Stand on the band, feet hip-width apart. Start with the handles at your shoulders and your palms facing you.',
    cues: ['Turn your palms forward as you press up', 'Press up until your arms are straight', 'Lower with control'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[112, 72], [110, 72]], feet: FEET },
      { hip: STAND_HIP, torso: 180, hands: [[104, 18], [102, 18]], feet: FEET },
    ],
  },
  {
    id: 'front-raise', name: 'Front raise', pattern: 'shoulder', muscles: 'Front of the shoulders', tier: 'light',
    setup: 'Stand on the band with feet hip-width apart. Hold one end in each hand in front of your thighs.',
    cues: ['Keep your arms nearly straight', 'Raise your hands to shoulder height', 'Lower slowly'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[106, 114], [104, 114]], feet: FEET },
      { hip: STAND_HIP, torso: 180, hands: [[148, 64], [146, 64]], feet: FEET },
    ],
  },
  {
    id: 'side-front-raise', name: 'Side to front raise', pattern: 'shoulder', muscles: 'Side and front of the shoulders', tier: 'light',
    setup: 'Stand on the band with your feet close together. Hold the ends at your sides.',
    cues: ['Raise your arms to the sides and hold for a second', 'Lower, then raise them to the front and hold', 'Lower slowly'],
    ...front({ band: [['foot0', 'hand0'], ['foot1', 'hand1']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[80, 112], [120, 112]], feet: WIDE },
      { hip: STAND_HIP, torso: 180, hands: [[36, 70], [164, 70]], feet: WIDE },
    ],
  },
  {
    id: 'upright-row', name: 'Upright row', pattern: 'shoulder', muscles: 'Shoulders and upper back', tier: 'light',
    setup: 'Stand on the band with feet hip-width apart. Hold the ends in front of your thighs.',
    cues: ['Lead with your elbows', 'Pull your hands up to your chest', 'Lower slowly'],
    ...front({ elbows: [-1, 1], band: [['foot0', 'hand0'], ['foot1', 'hand1']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[92, 112], [108, 112]], feet: WIDE },
      { hip: STAND_HIP, torso: 180, hands: [[92, 72], [108, 72]], feet: WIDE },
    ],
  },
  {
    id: 'shrug', name: 'Shrug', pattern: 'rear', muscles: 'Top of the back and neck', tier: 'medium',
    setup: 'Stand on the band and hold the ends at your sides with straight arms.',
    cues: ['Lift your shoulders toward your ears', 'Keep your arms straight', 'Lower slowly'],
    ...front({ band: [['foot0', 'hand0'], ['foot1', 'hand1']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[78, 112], [122, 112]], feet: WIDE },
      { hip: [100, 114], torso: 180, hands: [[78, 106], [122, 106]], feet: WIDE },
    ],
  },
  {
    id: 'reverse-fly', name: 'Reverse fly', pattern: 'rear', muscles: 'Rear shoulders and upper back', tier: 'light', anchor: 'mid',
    setup: 'Anchor the band at shoulder height and face the door. Step back with your arms straight in front of you.',
    cues: ['Keep your arms nearly straight', 'Pull your hands out and back', 'Squeeze your shoulder blades'],
    ...side({ door: [186, 68], band: [['door', 'hand0']] }),
    poses: [
      { hip: [94, 118], torso: 176, hands: [[144, 70], [142, 70]], feet: FEET },
      { hip: [94, 118], torso: 176, hands: [[62, 72], [60, 72]], feet: FEET },
    ],
  },
  {
    id: 'bent-reverse-fly', name: 'Bent-over reverse fly', pattern: 'rear', muscles: 'Rear shoulders and upper back', tier: 'light',
    setup: 'Stand on the band, push your hips back and lean forward with a flat back. Let your arms hang.',
    cues: ['Keep your back flat', 'Raise your arms out to the sides', 'Squeeze your shoulder blades'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: [80, 122], torso: 118, hands: [[128, 146], [126, 146]], feet: FEET },
      { hip: [80, 122], torso: 118, hands: [[90, 112], [88, 112]], feet: FEET },
    ],
  },

  // Arms
  {
    id: 'diamond-push-up', name: 'Diamond push-up', pattern: 'triceps', muscles: 'Triceps and chest', tier: 'light', bodyweight: true,
    setup: 'Set up in a push-up position with your hands close together under your chest, fingers and thumbs touching. Drop to your knees to make it easier.',
    cues: ['Keep your body in one line', 'Lower until your chest nears your hands', 'Press the floor away'],
    ...side({ band: [] }),
    poses: [
      { hip: [90, 151], torso: 114, hands: [[140, FLOOR], [136, FLOOR]], feet: [[30, FLOOR], [30, FLOOR]] },
      { hip: [95, 165], torso: 101, hands: [[140, FLOOR], [136, FLOOR]], feet: [[30, FLOOR], [30, FLOOR]] },
    ],
  },
  {
    id: 'kickback', name: 'Triceps kickback', pattern: 'triceps', muscles: 'Triceps', tier: 'light', anchor: 'low',
    setup: 'Anchor the band low and face the door. Lean forward with a flat back and hold your upper arms still beside your body.',
    cues: ['Keep your elbows still', 'Straighten your arms behind you', 'Return slowly'],
    ...side({ door: [186, 170], band: [['door', 'hand0']] }),
    poses: [
      { hip: [84, 122], torso: 126, hands: [[120, 130], [118, 130]], feet: FEET },
      { hip: [84, 122], torso: 126, hands: [[82, 100], [80, 100]], feet: FEET },
    ],
  },
  {
    id: 'reverse-pushdown', name: 'Reverse grip pressdown', pattern: 'triceps', muscles: 'Triceps', tier: 'light', anchor: 'high',
    setup: 'Anchor the band high in a door and face it. Hold the ends with your palms facing up and pin your elbows to your sides.',
    cues: ['Keep your elbows still', 'Press down until your arms are straight', 'Let your hands rise slowly'],
    ...side({ door: [186, 24], band: [['door', 'hand0']] }),
    poses: [
      { hip: [96, 118], torso: 172, hands: [[126, 74], [124, 74]], feet: FEET },
      { hip: [96, 118], torso: 172, hands: [[108, 114], [106, 114]], feet: FEET },
    ],
  },
  {
    id: 'preacher-curl', name: 'Preacher curl', pattern: 'biceps', muscles: 'Biceps', tier: 'light', anchor: 'low',
    setup: 'Anchor the band low and sit facing the door. Rest your elbows on your knees and hold the handles.',
    cues: ['Keep your elbows on your knees', 'Curl your hands toward your face', 'Lower all the way down slowly'],
    ...side({ door: [186, 170], band: [['door', 'hand0']] }),
    poses: [
      { hip: [64, 166], torso: 176, hands: [[112, 134], [110, 134]], feet: [[126, 172], [126, 172]] },
      { hip: [64, 166], torso: 176, hands: [[90, 110], [88, 110]], feet: [[126, 172], [126, 172]] },
    ],
  },
  {
    id: 'hammer-curl', name: 'Hammer curl', pattern: 'biceps', muscles: 'Biceps and forearms', tier: 'light',
    setup: 'Stand on the band, feet hip-width apart. Hold the ends with your palms facing each other.',
    cues: ['Pin your elbows to your sides', 'Keep your thumbs pointing up', 'Lower slowly'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[106, 114], [104, 114]], feet: FEET },
      { hip: STAND_HIP, torso: 180, hands: [[120, 72], [118, 72]], feet: FEET },
    ],
  },
  {
    id: 'reverse-curl', name: 'Reverse curl', pattern: 'biceps', muscles: 'Forearms and biceps', tier: 'light',
    setup: 'Stand on the band, feet hip-width apart. Hold the ends with your palms facing down.',
    cues: ['Pin your elbows to your sides', 'Curl up without bending your wrists', 'Lower slowly'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[106, 114], [104, 114]], feet: FEET },
      { hip: STAND_HIP, torso: 180, hands: [[120, 72], [118, 72]], feet: FEET },
    ],
  },
  {
    id: 'behind-back-curl', name: 'Behind the back curl', pattern: 'biceps', muscles: 'Biceps', tier: 'light', anchor: 'low',
    setup: 'Anchor the band low and face away from the door. Let your arms hang slightly behind your body.',
    cues: ['Keep your elbows behind your body', 'Curl your hands to your shoulders', 'Lower all the way down slowly'],
    ...side({ door: [14, 170], band: [['door', 'hand0']] }),
    poses: [
      { hip: STAND_HIP, torso: 180, hands: [[82, 110], [80, 110]], feet: FEET },
      { hip: STAND_HIP, torso: 180, hands: [[100, 72], [98, 72]], feet: FEET },
    ],
  },
  {
    id: 'concentration-curl', name: 'Concentration curl', pattern: 'biceps', muscles: 'Biceps', tier: 'light', perSide: true,
    setup: 'Kneel on one knee and put the band under your front foot. Rest your elbow against your inner thigh and hold the end.',
    cues: ['Keep your upper arm still', 'Curl your hand to your shoulder', 'Lower slowly'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: [96, 140], torso: 160, hands: [[126, 138], [116, 124]], feet: [[132, FLOOR], [62, FLOOR]] },
      { hip: [96, 140], torso: 160, hands: [[128, 100], [116, 124]], feet: [[132, FLOOR], [62, FLOOR]] },
    ],
  },
  {
    id: 'wrist-curl', name: 'Wrist curl', pattern: 'biceps', muscles: 'Forearms', tier: 'light',
    setup: 'Sit with the band under your feet. Rest your forearms on your thighs and hold the ends with your palms up.',
    cues: ['Keep your forearms still', 'Curl only your wrists', 'Lower slowly'],
    ...side({ band: [['toe0', 'hand0']] }),
    poses: [
      { hip: [64, 166], torso: 176, hands: [[108, 138], [106, 138]], feet: [[126, 172], [126, 172]] },
      { hip: [64, 166], torso: 176, hands: [[108, 130], [106, 130]], feet: [[126, 172], [126, 172]] },
    ],
  },
  {
    id: 'reverse-wrist-curl', name: 'Reverse wrist curl', pattern: 'biceps', muscles: 'Forearms', tier: 'light',
    setup: 'Sit with the band under your feet. Rest your forearms on your thighs and hold the ends with your palms down.',
    cues: ['Keep your forearms still', 'Curl only your wrists', 'Lower slowly'],
    ...side({ band: [['toe0', 'hand0']] }),
    poses: [
      { hip: [64, 166], torso: 176, hands: [[108, 138], [106, 138]], feet: [[126, 172], [126, 172]] },
      { hip: [64, 166], torso: 176, hands: [[108, 130], [106, 130]], feet: [[126, 172], [126, 172]] },
    ],
  },

  // Back
  {
    id: 'straight-arm-pulldown', name: 'Straight-arm pulldown', pattern: 'vpull', muscles: 'Lats', tier: 'light', anchor: 'high',
    setup: 'Anchor the band high in a door and face it. Take a step back and hold the ends with straight arms.',
    cues: ['Keep your arms straight', 'Push your hands down to your thighs', 'Let your arms rise slowly'],
    ...side({ door: [186, 16], band: [['door', 'hand0']] }),
    poses: [
      { hip: [94, 118], torso: 166, hands: [[140, 36], [138, 36]], feet: FEET },
      { hip: [94, 118], torso: 166, hands: [[112, 114], [110, 114]], feet: FEET },
    ],
  },

  // Legs
  {
    id: 'lunge', name: 'Lunge', pattern: 'squat', muscles: 'Thighs and glutes', tier: 'medium', perSide: true,
    setup: 'Step your front foot onto the band and take a long step back with the other. Hold the handles at your shoulders.',
    cues: ['Lower until both knees make right angles', 'Keep your back straight', 'Push through your front foot to stand'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: [96, 122], torso: 180, hands: [[114, 72], [112, 72]], feet: [[130, FLOOR], [62, FLOOR]] },
      { hip: [96, 146], torso: 180, hands: [[114, 96], [112, 96]], feet: [[130, FLOOR], [62, FLOOR]] },
    ],
  },
  {
    id: 'bulgarian-squat', name: 'Bulgarian split squat', pattern: 'squat', muscles: 'Thighs and glutes', tier: 'medium', perSide: true,
    setup: 'Stand on the band with one foot and rest the other foot behind you on a sturdy chair. Hold the ends at your shoulders.',
    cues: ['Drop straight down', 'Keep your front heel planted', 'Push through your front foot to stand'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: [96, 120], torso: 180, hands: [[114, 70], [112, 70]], feet: [[128, FLOOR], [60, 150]] },
      { hip: [96, 140], torso: 180, hands: [[114, 90], [112, 90]], feet: [[128, FLOOR], [60, 150]] },
    ],
  },
  {
    id: 'goblet-squat', name: 'Goblet squat', pattern: 'squat', muscles: 'Thighs and glutes', tier: 'medium',
    setup: 'Stand on the band with feet shoulder-width apart. Hold both ends together in front of your chest.',
    cues: ['Sit your hips back and down', 'Keep your chest tall', 'Push the floor away to stand'],
    ...side({ band: [['foot0', 'hand0']] }),
    poses: [
      { hip: STAND_HIP, torso: 178, hands: [[112, 80], [110, 80]], feet: FEET },
      { hip: [78, 146], torso: 150, hands: [[118, 112], [116, 112]], feet: FEET },
    ],
  },
  {
    id: 'leg-press', name: 'Lying leg press', pattern: 'squat', muscles: 'Thighs and glutes', tier: 'medium',
    setup: 'Lie on your back with the band around your shoes. Hold the ends at your chest and bring your knees in.',
    cues: ['Press your feet up and away until your legs are straight', 'Bring your knees back slowly', 'Wear shoes so the band cannot slip'],
    ...side({ band: [['hand0', 'foot0']] }),
    poses: [
      { hip: [110, 166], torso: -90, hands: [[84, 146], [82, 146]], feet: [[132, 126], [136, 128]] },
      { hip: [110, 166], torso: -90, hands: [[84, 146], [82, 146]], feet: [[166, 136], [168, 138]] },
    ],
  },
  {
    id: 'leg-extension', name: 'Seated leg extension', pattern: 'squat', muscles: 'Front of the thighs', tier: 'light', anchor: 'low', perSide: true,
    setup: 'Anchor the band low behind you and sit on a sturdy chair. Loop the band around one ankle.',
    cues: ['Straighten your knee', 'Hold for a second', 'Lower slowly'],
    ...side({ door: [14, 170], band: [['door', 'foot0']] }),
    poses: [
      { hip: [96, 128], torso: 180, hands: [[114, 122], [112, 122]], feet: [[110, FLOOR], [90, FLOOR]] },
      { hip: [96, 128], torso: 180, hands: [[114, 122], [112, 122]], feet: [[154, 138], [90, FLOOR]] },
    ],
  },
  {
    id: 'donkey-kick', name: 'Donkey kick', pattern: 'glute', muscles: 'Glutes', tier: 'light', perSide: true,
    setup: 'Get on your hands and knees. Pin the band under your hands and loop it around one shoe.',
    cues: ['Keep your back flat', 'Push your heel up and back', 'Wear shoes so the band cannot slip'],
    ...side({ band: [['hand0', 'foot0']] }),
    poses: [
      { hip: [72, 140], torso: 90, hands: [[126, FLOOR], [124, FLOOR]], feet: [[44, FLOOR], [44, FLOOR]] },
      { hip: [72, 140], torso: 90, hands: [[126, FLOOR], [124, FLOOR]], feet: [[16, 120], [44, FLOOR]] },
    ],
  },
  {
    id: 'pull-through', name: 'Band pull-through', pattern: 'hinge', muscles: 'Glutes and hamstrings', tier: 'medium', anchor: 'low',
    setup: 'Anchor the band low and face away from the door. Stand with the band between your legs and hold it with both hands.',
    cues: ['Push your hips back', 'Keep your back flat', 'Squeeze your glutes to stand'],
    ...side({ door: [14, 170], band: [['door', 'hand0']] }),
    poses: [
      { hip: [82, 122], torso: 112, hands: [[116, 148], [114, 148]], feet: FEET },
      { hip: STAND_HIP, torso: 180, hands: [[108, 112], [106, 112]], feet: FEET },
    ],
  },
  {
    id: 'seated-calf', name: 'Seated calf press', pattern: 'calf', muscles: 'Calves', tier: 'light',
    setup: 'Sit with your legs straight and loop the band around the balls of your feet. Hold the ends.',
    cues: ['Push your toes away from you', 'Pull them back toward you', 'Move only your ankles'],
    ...side({ band: [['toe0', 'hand0']] }),
    poses: [
      { hip: [64, 166], torso: 176, hands: [[102, 134], [100, 134]], feet: [[126, 170], [126, 170]], toes: [[132, 158], [132, 158]] },
      { hip: [64, 166], torso: 176, hands: [[102, 134], [100, 134]], feet: [[126, 170], [126, 170]], toes: [[138, 170], [138, 170]] },
    ],
  },

  // Abs, on the floor. Reps need no band; the plank and flutter kicks are held for time.
  {
    id: 'crunch', name: 'Crunch', pattern: 'core', muscles: 'Abs', tier: 'light', bodyweight: true,
    setup: 'Lie on your back with your knees bent and your hands behind your neck.',
    cues: ['Lift your shoulders by tightening your stomach', 'Do not pull on your neck', 'Lower slowly'],
    ...side({ band: [] }),
    poses: [
      { hip: [110, 170], torso: -90, hands: [[46, 164], [48, 164]], feet: [[150, FLOOR], [154, FLOOR]] },
      { hip: [110, 170], torso: -112, hands: [[52, 142], [54, 142]], feet: [[150, FLOOR], [154, FLOOR]] },
    ],
  },
  {
    id: 'reverse-crunch', name: 'Reverse crunch', pattern: 'core', muscles: 'Lower abs', tier: 'light', bodyweight: true,
    setup: 'Lie on your back with your hands at your sides and your knees bent up.',
    cues: ['Bring your knees toward your chest', 'Lift your hips a little off the floor', 'Lower slowly'],
    ...side({ elbows: [-1, -1], band: [] }),
    poses: [
      { hip: [110, 170], torso: -90, hands: [[92, 176], [90, 176]], feet: [[150, 150], [152, 150]] },
      { hip: [110, 160], torso: -86, hands: [[92, 176], [90, 176]], feet: [[122, 118], [124, 118]] },
    ],
  },
  {
    id: 'knee-crunch', name: 'Knee crunch', pattern: 'core', muscles: 'Abs', tier: 'light', bodyweight: true,
    setup: 'Lie on your back with your knees bent up and your hands behind your neck.',
    cues: ['Bring your shoulders and knees together', 'Do not pull on your neck', 'Lower slowly'],
    ...side({ band: [] }),
    poses: [
      { hip: [110, 170], torso: -90, hands: [[46, 164], [48, 164]], feet: [[150, 150], [152, 150]] },
      { hip: [110, 170], torso: -112, hands: [[52, 142], [54, 142]], feet: [[128, 124], [130, 124]] },
    ],
  },
  {
    id: 'cross-crunch', name: 'Cross crunch', pattern: 'core', muscles: 'Abs and obliques', tier: 'light', bodyweight: true, perSide: true,
    setup: 'Lie on your back with your knees bent and your hands behind your neck.',
    cues: ['Bring one elbow across to the opposite knee', 'Lower and switch sides', 'Do not pull on your neck'],
    ...side({ band: [] }),
    poses: [
      { hip: [110, 170], torso: -90, hands: [[46, 164], [48, 164]], feet: [[150, FLOOR], [154, FLOOR]] },
      { hip: [110, 170], torso: -112, hands: [[52, 142], [54, 142]], feet: [[126, 130], [154, FLOOR]] },
    ],
  },
  {
    id: 'flutter-kick', name: 'Flutter kicks', pattern: 'core', muscles: 'Lower abs', tier: 'light', bodyweight: true, timed: true,
    setup: 'Lie on your back with your legs straight and your hands under your hips.',
    cues: ['Lift your feet a little off the floor', 'Kick your legs up and down in small moves', 'Press your lower back into the floor'],
    ...side({ elbows: [-1, -1], band: [] }),
    poses: [
      { hip: [110, 170], torso: -90, hands: [[98, 178], [96, 178]], feet: [[172, 152], [174, 168]] },
      { hip: [110, 170], torso: -90, hands: [[98, 178], [96, 178]], feet: [[174, 168], [172, 152]] },
    ],
  },
  {
    id: 'leg-raise', name: 'Leg raise', pattern: 'core', muscles: 'Lower abs', tier: 'light', bodyweight: true,
    setup: 'Lie on your back with your legs straight and your hands under your hips.',
    cues: ['Keep your legs straight', 'Raise your feet until your legs point up', 'Lower slowly without touching the floor'],
    ...side({ elbows: [-1, -1], band: [] }),
    poses: [
      { hip: [110, 170], torso: -90, hands: [[98, 178], [96, 178]], feet: [[174, 170], [175, 170]] },
      { hip: [110, 170], torso: -90, hands: [[98, 178], [96, 178]], feet: [[126, 112], [128, 112]] },
    ],
  },
  {
    id: 'toe-touch', name: 'Toe touch', pattern: 'core', muscles: 'Abs', tier: 'light', bodyweight: true,
    setup: 'Lie on your back and point your legs straight up.',
    cues: ['Reach your hands toward your toes', 'Lift your shoulders off the floor', 'Lower slowly'],
    ...side({ band: [] }),
    poses: [
      { hip: [110, 170], torso: -90, hands: [[88, 134], [86, 134]], feet: [[116, 108], [118, 108]] },
      { hip: [110, 170], torso: -115, hands: [[102, 120], [100, 120]], feet: [[116, 108], [118, 108]] },
    ],
  },
  {
    id: 'heel-touch', name: 'Heel touch', pattern: 'core', muscles: 'Obliques', tier: 'light', bodyweight: true, perSide: true,
    setup: 'Lie on your back with your knees bent and your shoulders a little off the floor.',
    cues: ['Reach one hand to the heel on that side', 'Switch sides without resting', 'Keep your shoulders off the floor'],
    ...side({ elbows: [-1, -1], band: [] }),
    poses: [
      { hip: [110, 170], torso: -100, hands: [[92, 172], [90, 172]], feet: [[150, FLOOR], [154, FLOOR]] },
      { hip: [110, 170], torso: -100, hands: [[100, 176], [80, 166]], feet: [[150, FLOOR], [154, FLOOR]] },
    ],
  },
  {
    id: 'plank', name: 'Plank', pattern: 'core', muscles: 'Core', tier: 'light', bodyweight: true, timed: true,
    setup: 'Rest on your forearms and toes with your body in one straight line.',
    cues: ['Keep your body in one line', 'Tighten your stomach and glutes', 'Breathe normally'],
    ...side({ band: [] }),
    poses: [
      { hip: [96, 160], torso: 100, hands: [[168, 178], [166, 178]], feet: [[36, 176], [36, 176]] },
      { hip: [96, 158], torso: 100, hands: [[168, 178], [166, 178]], feet: [[36, 176], [36, 176]] },
    ],
  },
  {
    id: 'mountain-climber', name: 'Mountain climbers', pattern: 'core', muscles: 'Core', tier: 'light', bodyweight: true, timed: true,
    setup: 'Set up in a push-up position with your arms straight.',
    cues: ['Keep your hips level', 'Drive one knee toward your chest', 'Switch legs at a steady pace'],
    ...side({ band: [] }),
    poses: [
      { hip: [90, 151], torso: 114, hands: [[140, FLOOR], [136, FLOOR]], feet: [[104, 168], [30, FLOOR]] },
      { hip: [90, 151], torso: 114, hands: [[140, FLOOR], [136, FLOOR]], feet: [[30, FLOOR], [104, 168]] },
    ],
  },
  {
    id: 'russian-twist', name: 'Russian twist', pattern: 'core', muscles: 'Core and obliques', tier: 'light', perSide: true,
    setup: 'Sit with your knees bent and the band around your feet. Lean back a little and hold the ends together in front of your chest.',
    cues: ['Turn your chest to one side', 'Turn through to the other side', 'Keep your back straight'],
    ...side({ band: [['toe0', 'hand0']] }),
    poses: [
      { hip: [74, 168], torso: 148, hands: [[128, 114], [126, 114]], feet: [[134, 170], [134, 170]] },
      { hip: [74, 168], torso: 148, hands: [[120, 140], [118, 140]], feet: [[134, 170], [134, 170]] },
    ],
  },
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function exerciseById(id) {
  return BY_ID.get(id);
}

// Exercises that usually load a sore area, left out when the person asks.
const LOADS_AREA = {
  knees: ['squat', 'split-squat', 'lateral-walk', 'lunge', 'bulgarian-squat', 'goblet-squat', 'leg-press', 'leg-extension'],
  back: ['deadlift', 'good-morning', 'bent-row', 'pull-through', 'bent-reverse-fly', 'kickback', 'leg-raise', 'flutter-kick'],
  shoulders: ['overhead-press', 'lateral-raise', 'overhead-triceps', 'overhead-pull-apart', 'push-up', 'arnold-press', 'front-raise', 'side-front-raise', 'upright-row', 'diamond-push-up', 'decline-press', 'incline-press'],
};

export function isAvailable(exercise, profile) {
  if (!exercise) return false;
  if (profile.avoid?.some((area) => LOADS_AREA[area]?.includes(exercise.id))) return false;
  if (exercise.anchor && !profile.hasAnchor) return false;
  if (exercise.mini && !profile.hasMini) return false;
  return true;
}
