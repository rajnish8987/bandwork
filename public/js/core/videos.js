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

export const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&autoplay=1`;
export const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
export const searchUrl = (name) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`resistance band ${name}`)}`;
