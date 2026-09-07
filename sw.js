// Service worker: offline play, silent auto-update.
//
// VERSION is rewritten by scripts/release.mjs — it is the ONLY thing that has
// to change to bust the cache, which is why the version lives in exactly two
// files (package.json and here) and nowhere else.
//
// ponytail: no hand-maintained precache list. The shell is precached; every
// other same-origin GET is cached the first time it is fetched, which for a
// game that loads its whole self on boot means the second visit is offline-ready.
const VERSION = '0.2.3';
const CACHE = `game-${VERSION}`;
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: instant from cache, refreshed in the background, so a
// new deploy is live on the next cold start with no prompt and no stale lock-in.
self.addEventListener('fetch', e => {
  const {request} = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(request);
      const fresh = fetch(request)
        .then(res => { if (res.ok) cache.put(request, res.clone()); return res; })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});
