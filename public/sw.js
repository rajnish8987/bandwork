// Stores the app on the device so it works with no connection. Files open from
// the store straight away and refresh in the background, so an update shows on
// the next launch.

const CACHE = 'tensile-v8';

// The camera rep counter in vendor/ is too large to store up front. It is stored
// by the fetch handler below the first time someone opens it.
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/core/autoplan.js',
  './js/core/bandcare.js',
  './js/core/coach.js',
  './js/core/color.js',
  './js/core/exercises.js',
  './js/core/formcheck.js',
  './js/core/handsfree.js',
  './js/core/i18n.js',
  './js/core/insights.js',
  './js/core/locales/es.js',
  './js/core/locales/hi.js',
  './js/core/plan.js',
  './js/core/programs.js',
  './js/core/progression.js',
  './js/core/recovery.js',
  './js/core/reminders.js',
  './js/core/repcount.js',
  './js/core/routines.js',
  './js/core/schedule.js',
  './js/core/session.js',
  './js/core/setup.js',
  './js/core/specials.js',
  './js/core/stats.js',
  './js/core/store.js',
  './js/core/track.js',
  './js/core/units.js',
  './js/core/version.js',
  './js/core/videos.js',
  './js/ui/camera.js',
  './js/ui/extra-screens.js',
  './js/ui/feedback.js',
  './js/ui/figure-math.js',
  './js/ui/figure.js',
  './js/ui/handsfree.js',
  './js/ui/html.js',
  './js/ui/native.js',
  './js/ui/screens.js',
  './js/ui/specials-screen.js',
  './js/ui/voice.js',
  './js/ui/workout-screens.js',
  './guide/setup.jpg',
  './guide/start-workout.gif',
  './guide/start-workout.jpg',
  './guide/log-set.gif',
  './guide/log-set.jpg',
  './guide/count-reps.gif',
  './guide/count-reps.jpg',
  './guide/camera.gif',
  './guide/camera.jpg',
  './guide/video.jpg',
  './guide/schedule.jpg',
  './guide/measure.jpg',
  './guide/progress.jpg',
  './guide/programs.jpg',
  './guide/settings.jpg',
  './guide/specials.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './fonts/atkinson-hyperlegible-latin-400-normal.woff2',
  './fonts/atkinson-hyperlegible-latin-700-normal.woff2',
  './fonts/big-shoulders-display-latin-700-normal.woff2',
  './fonts/big-shoulders-display-latin-800-normal.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = request.mode === 'navigate' ? './index.html' : request;
    const stored = await cache.match(key, { ignoreSearch: request.mode === 'navigate' });
    const refresh = fetch(request).then((response) => {
      if (response.ok) cache.put(key, response.clone());
      return response;
    });
    if (stored) {
      event.waitUntil(refresh.catch(() => {}));
      return stored;
    }
    return refresh;
  })());
});
