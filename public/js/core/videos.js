// Real people doing each exercise, on YouTube. Each was chosen by checking its title
// and frames. Videos can be removed, so tools/check-videos.mjs checks they still exist.

export const VIDEOS = {
  squat: { id: 'duP-UZsfOaQ', channel: 'Get Healthy U' },
  'split-squat': { id: '-LmfJPuQrlE', channel: 'freeexercisevideo' },
  deadlift: { id: 'FUndsTXxkT0', channel: 'NeeBooFit' },
  'good-morning': { id: '_V0WOAL0_k0', channel: 'Clench Fitness' },
  'glute-bridge': { id: 'gOOo1nmydeA', channel: 'Travis Tarrant' },
  'lateral-walk': { id: 'M5uxEQH5BUM', channel: 'National Academy of Sports Medicine' },
  'leg-curl': { id: 'iwn49f3Ly7w', channel: 'Total Physical Therapy' },
  'calf-raise': { id: 'IobkqSkUg1Y', channel: 'FITASTIC' },
  'wrap-press': { id: 'tD4d3Oej-VA', channel: 'Scott Abel Coaching' },
  'door-press': { id: '8aQL3sguvV8', channel: 'Chris Gates Fitness' },
  'push-up': { id: 'KhzdxSsXmIs', channel: 'STRAFFR' },
  'overhead-press': { id: '_E94vW5y_Lw', channel: 'Alchemist P.' },
  'lateral-raise': { id: 'kn-E0-o4zV0', channel: 'Horton Barbell' },
  pressdown: { id: 'BI7NaJ3qPRU', channel: 'Kaylee Jollota' },
  'overhead-triceps': { id: '8GVCO0oklnI', channel: 'OPEX Fitness' },
  'seated-row': { id: 'eOKwM5nHzj4', channel: 'Ebuni Louise' },
  'bent-row': { id: 'Y3H17rshgZE', channel: 'Live Lean TV' },
  pulldown: { id: 'gebMl23Fw_4', channel: 'Rehab My Patient' },
  'overhead-pull-apart': { id: 'i2v9v9KX4Lk', channel: 'Scott Abel Coaching' },
  'pull-apart': { id: '2fmxGGtdbog', channel: 'Live Lean TV' },
  'face-pull': { id: 'Q77ORURfeYc', channel: 'Caroline Juster' },
  curl: { id: 'oXAMW-LNX_Q', channel: 'Fit2Go Personal Training' },
  pallof: { id: 'Y0e2w0aKOXw', channel: 'MEAUXTION FITNESS' },
  woodchop: { id: 'SXfIgi1KZIk', channel: 'Sunstone Fitness' },
  'kneeling-crunch': { id: 'g3EVVCKsfmw', channel: 'Live Lean TV' },
  'side-bend': { id: 'MVSzez2zkHM', channel: 'TrainFTW' },
  'dead-bug': { id: '6oiD9Yv0CMQ', channel: 'The Strength Institute' },
  // These open at the moment the exercise starts.
  'chest-fly': { id: 'njGZClD94bg', channel: 'Fitness My Life', at: 46 },
  'incline-press': { id: 'kCZmSl0yb3U', channel: 'Fitness My Life', at: 97 },
  'incline-fly': { id: 'njGZClD94bg', channel: 'Fitness My Life', at: 85 },
  'decline-press': { id: 'SNWPA3ouu6I', channel: 'Fitness My Life', at: 106 },
  'decline-fly': { id: 'njGZClD94bg', channel: 'Fitness My Life', at: 123 },
  'arnold-press': { id: 's6IXzTs_MFQ', channel: 'Fitness My Life', at: 189 },
  'front-raise': { id: 'njGZClD94bg', channel: 'Fitness My Life', at: 325 },
  'side-front-raise': { id: 'kCZmSl0yb3U', channel: 'Fitness My Life', at: 329 },
  'upright-row': { id: '1nsa9y3Z-zk', channel: 'Fitness My Life', at: 253 },
  shrug: { id: '1nsa9y3Z-zk', channel: 'Fitness My Life', at: 305 },
  'reverse-fly': { id: 'kCZmSl0yb3U', channel: 'Fitness My Life', at: 403 },
  'bent-reverse-fly': { id: '1nsa9y3Z-zk', channel: 'Fitness My Life', at: 360 },
  'diamond-push-up': { id: 'c9wmvgcsj7g', channel: 'Fitness My Life', at: 271 },
  kickback: { id: 'njGZClD94bg', channel: 'Fitness My Life', at: 181 },
  'reverse-pushdown': { id: 'c9wmvgcsj7g', channel: 'Fitness My Life', at: 149 },
  'preacher-curl': { id: 'njGZClD94bg', channel: 'Fitness My Life', at: 241 },
  'hammer-curl': { id: 'kCZmSl0yb3U', channel: 'Fitness My Life', at: 735 },
  'reverse-curl': { id: 'AjawOUKbdko', channel: 'Fitness My Life', at: 54 },
  'behind-back-curl': { id: 's6IXzTs_MFQ', channel: 'Fitness My Life', at: 327 },
  'concentration-curl': { id: '4FyTk4Jhkeg', channel: 'Fitness My Life', at: 234 },
  'wrist-curl': { id: 'AjawOUKbdko', channel: 'Fitness My Life', at: 114 },
  'reverse-wrist-curl': { id: 'AjawOUKbdko', channel: 'Fitness My Life', at: 178 },
  'straight-arm-pulldown': { id: 'kCZmSl0yb3U', channel: 'Fitness My Life', at: 490 },
  lunge: { id: 'kCZmSl0yb3U', channel: 'Fitness My Life', at: 863 },
  'bulgarian-squat': { id: 's6IXzTs_MFQ', channel: 'Fitness My Life', at: 666 },
  'goblet-squat': { id: 'sVJY76D0VDk', channel: 'Fitness My Life', at: 546 },
  'leg-press': { id: 'o1IJNdgP5gQ', channel: 'Fitness My Life', at: 169 },
  'leg-extension': { id: 'o1IJNdgP5gQ', channel: 'Fitness My Life', at: 267 },
  'donkey-kick': { id: 'o1IJNdgP5gQ', channel: 'Fitness My Life', at: 209 },
  'pull-through': { id: 'sVJY76D0VDk', channel: 'Fitness My Life', at: 302 },
  'seated-calf': { id: 'sBeGmUBvt-s', channel: 'Fitness My Life', at: 593 },
  crunch: { id: 'JbVBZZzdvy4', channel: 'Fitness My Life', at: 63 },
  'reverse-crunch': { id: 'JbVBZZzdvy4', channel: 'Fitness My Life', at: 104 },
  'knee-crunch': { id: 'JbVBZZzdvy4', channel: 'Fitness My Life', at: 129 },
  'cross-crunch': { id: 'JbVBZZzdvy4', channel: 'Fitness My Life', at: 194 },
  'flutter-kick': { id: 'JbVBZZzdvy4', channel: 'Fitness My Life', at: 154 },
  'leg-raise': { id: 'JbVBZZzdvy4', channel: 'Fitness My Life', at: 220 },
  'toe-touch': { id: 'JbVBZZzdvy4', channel: 'Fitness My Life', at: 247 },
  'heel-touch': { id: 'JbVBZZzdvy4', channel: 'Fitness My Life', at: 280 },
  plank: { id: 'JbVBZZzdvy4', channel: 'Fitness My Life', at: 300 },
  'mountain-climber': { id: '88I7ibHDWi0', channel: 'Fitness My Life', at: 166 },
  'russian-twist': { id: '-7gHivQ2fRc', channel: 'Fitness My Life', at: 154 },
};

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com']);
const PATH_FORMS = /^\/(?:embed|shorts|live|v)\/([^/]+)/;

export function isVideoId(value) {
  return typeof value === 'string' && VIDEO_ID.test(value);
}

/** The video id in a YouTube link, or null if it is anything else. */
export function parseYouTubeId(text) {
  let url;
  try {
    url = new URL(String(text).trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  let id = null;
  if (url.hostname === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (YOUTUBE_HOSTS.has(url.hostname)) {
    id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(PATH_FORMS)?.[1];
  }
  return isVideoId(id) ? id : null;
}

/** The video to show: the person's own choice if they made one, otherwise the suggested one. */
export function videoFor(exerciseId, profile) {
  const own = profile.videoOverrides?.[exerciseId];
  if (isVideoId(own)) return { id: own, channel: null, own: true };
  const suggested = VIDEOS[exerciseId];
  return suggested ? { ...suggested, own: false } : null;
}

export const embedUrl = (id, at = 0) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&autoplay=1${at ? `&start=${at}` : ''}`;
export const watchUrl = (id, at = 0) => `https://www.youtube.com/watch?v=${id}${at ? `&t=${at}s` : ''}`;
export const searchUrl = (name) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`resistance band ${name}`)}`;
