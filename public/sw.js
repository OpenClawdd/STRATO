const CACHE_STATIC = 'strato-v2';
const CACHE_DATA = 'strato-v2-data';
const CACHE_THUMBS = 'strato-v2-thumbs';
const PRECACHE = ['/', '/offline.html', '/css/style.css', '/js/v5/main.js', '/vendor/idb.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_STATIC).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
     .then(keys => Promise.all(keys.filter(k => ![CACHE_STATIC, CACHE_DATA, CACHE_THUMBS].includes(k)).map(k => caches.delete(k))))
     .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // games.json / surfaces.json → stale-while-revalidate
  if (url.pathname.endsWith('/assets/games.json') || url.pathname.endsWith('/assets/surfaces.json')) {
    e.respondWith(
      caches.open(CACHE_DATA).then(async cache => {
        const cached = await cache.match(e.request);
        const network = fetch(e.request, { cache: 'no-store' }).then(res => {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => null);
        if (cached) {
          e.waitUntil(network); // keep SW alive for background update
          return cached;
        }
        return network;
      })
    );
    return;
  }

  // thumbnails → cache-first + FIFO LRU 200
  if (url.pathname.startsWith('/assets/thumbnails/')) {
    e.respondWith(
      caches.open(CACHE_THUMBS).then(async cache => {
        const hit = await cache.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res && res.ok) {
          await cache.put(e.request, res.clone());
          const keys = await cache.keys();
          if (keys.length > 200) await cache.delete(keys[0]);
        }
        return res;
      })
    );
    return;
  }

  // navigations → network-first, fallback to offline.html
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/offline.html')));
    return;
  }

  // js/css → network-first, fallback to static cache
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_STATIC).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});
