const CACHE_NAME = 'highlands-v1';
const STATIC_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'img/hero.jpg',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/icon-180.png',
  'gpx/day1-inverness-fort-augustus.gpx',
  'gpx/day2-fort-augustus-ratagan.gpx',
  'gpx/day3-ratagan-achnasheen.gpx',
  'gpx/day4-achnasheen-dundonnell.gpx',
  'gpx/day5-dundonnell-bonar-bridge.gpx',
  'gpx/day6-bonar-bridge-inverness.gpx',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(STATIC_ASSETS.map(url =>
        cache.add(url).catch(err => console.warn('SW cache miss:', url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Supabase requests — bypass SW; let the app handle offline via localStorage
  if (url.hostname.endsWith('.supabase.co')) return;

  // Mapy.cz iframe requests are cross-origin, not handled here
  if (url.hostname.includes('mapy.com') || url.hostname.includes('mapy.cz')) return;

  // Stale-while-revalidate for everything else
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
