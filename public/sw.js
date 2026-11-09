// Stores the app on the device so it works with no connection. Files open from
// the store straight away. A new version downloads in the background and reopens
// the page once it has all arrived.

const CACHE = 'tensile-v12';

// This address can hold other sites, and they share one list of stores. Only this app's
// own old copies are cleared.
const OWN_COPY = /^(tensile|bandwork)-v\d+$/;

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
  './js/core/old-address.js',
  './js/core/plan.js',
  './js/core/programs.js',
  './js/core/progression.js',
  './js/core/recovery.js',
  './js/core/reminders.js',
  './js/core/repcount.js',
  './js/core/route.js',
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
  './js/core/voices.js',
  './js/core/videos.js',
  './js/ui/camera-stage.js',
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
  './guide/hands-free.jpg',
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

// Browsers may reuse a file for ten minutes without asking the server. A new version filled
// from there would be the old one under a new name, or worse, part old and part new.
self.addEventListener('install', (event) => {
  const fresh = FILES.map((file) => new Request(file, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(fresh)).then(() => self.skipWaiting()));
});

const HOME = new URL('./', self.location);
const APP_PATHS = [HOME.pathname, `${HOME.pathname}index.html`];

// A page still running the old version would load its camera screens from the new one, and the
// two do not fit together. Going home with no address fragment always reloads the page; the
// same address with a fragment would not.
async function reopenPages() {
  const pages = await self.clients.matchAll({ type: 'window' });
  await Promise.all(pages.map((page) => page.navigate(HOME.href).catch(() => {})));
}

self.addEventListener('activate', (event) => {
  const done = (async () => {
    const old = (await caches.keys()).filter((k) => OWN_COPY.test(k) && k !== CACHE);
    await Promise.all(old.map((k) => caches.delete(k)));
    await self.clients.claim();
    return old.length > 0;
  })();
  event.waitUntil(done);
  // Kept out of waitUntil: a page opening waits for this worker to finish activating.
  done.then((updated) => (updated ? reopenPages() : undefined));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Any other page address is a file someone opened directly. The browser shows it, and it is
  // not stored. The app would not work there, as its links are relative to its home.
  const isPage = request.mode === 'navigate';
  if (isPage && !APP_PATHS.includes(url.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = isPage ? './index.html' : request;
    const stored = await cache.match(key, { ignoreSearch: isPage });
    const refresh = fetch(key, { cache: 'no-cache' }).then((response) => {
      if (response.ok && response.type === 'basic') cache.put(key, response.clone());
      return response;
    });
    if (stored) {
      event.waitUntil(refresh.catch(() => {}));
      return stored;
    }
    return refresh;
  })());
});
