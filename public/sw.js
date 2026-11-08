// Stores the app on the device so it works with no connection. Files open from
// the store straight away and refresh in the background, so an update shows on
// the next launch.

const CACHE = 'bandwork-v1';

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/core/color.js',
  './js/core/exercises.js',
  './js/core/plan.js',
  './js/core/progression.js',
  './js/core/session.js',
  './js/core/stats.js',
  './js/core/store.js',
  './js/ui/feedback.js',
  './js/ui/figure-math.js',
  './js/ui/figure.js',
  './js/ui/html.js',
  './js/ui/screens.js',
  './js/ui/workout-screens.js',
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
