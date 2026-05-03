/* ══════════════════════════════════════════════════════════
   STRATO v20 — Service Worker
   Cache static assets (CSS, JS, HTML, thumbnails),
   cache-bust on version change (v20), offline fallback page,
   network-first for API calls, cache-first for static assets,
   skip waiting, claim clients
   ══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'strato-v20-apex';
const CACHE_VERSION = 20;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/css/style.css',
  '/js/app.js',
  '/js/app-v20-patch.js',
  '/js/particles.js',
  '/js/favicon-fetcher.js',
  '/js/transport-init.js',
  '/js/chat.js',
  '/js/themes.js',
  '/js/media-player.js',
  '/js/profile.js',
  '/js/bookmarks.js',
  '/js/extensions.js',
  '/js/pwa.js',
  '/assets/games.json',
  '/assets/sites.json',
  '/favicon.ico',
  '/favicon.png',
  '/manifest.json',
];

// Thumbnails to cache
const THUMBNAIL_CACHE = 'strato-v20-thumbnails';

// Offline fallback page
const OFFLINE_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STRATO — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #06060e; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .offline-container { text-align: center; padding: 32px; }
    .offline-icon { font-size: 64px; margin-bottom: 16px; }
    .offline-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #00e5ff; }
    .offline-text { font-size: 14px; color: #94a3b8; margin-bottom: 24px; line-height: 1.6; }
    .offline-btn { background: rgba(0,229,255,0.1); border: 1px solid rgba(0,229,255,0.3); color: #00e5ff; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; }
    .offline-btn:hover { background: rgba(0,229,255,0.2); }
  </style>
</head>
<body>
  <div class="offline-container">
    <div class="offline-icon">&#127760;</div>
    <div class="offline-title">You're Offline</div>
    <div class="offline-text">STRATO can't connect to the internet right now.<br>Some features may still be available from cache.</div>
    <button class="offline-btn" onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>
`;

// ── Install: cache static assets ──
self.addEventListener('install', (event) => {
  console.log('[SW] Installing STRATO v20 service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        // Use addAll with fallback — individual failures shouldn't break the whole install
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[SW] Some assets failed to cache during install:', err.message);
          // Try caching assets individually so one failure doesn't block all
          return Promise.allSettled(
            STATIC_ASSETS.map(url => cache.add(url).catch(e => {
              console.warn('[SW] Failed to cache:', url, e.message);
            }))
          );
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches (cache-bust on version change) ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating STRATO v20 service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== THUMBNAIL_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming all clients');
      return self.clients.claim();
    })
  );
});

// ── Fetch: routing strategy ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip WebSocket requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

  // Skip chrome-extension and other non-http(s) protocols
  if (!url.protocol.startsWith('http')) return;

  // API calls: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Proxy routes: never cache (dynamic proxied content)
  if (url.pathname.startsWith('/frog/') || url.pathname.startsWith('/scramjet/')) {
    return;
  }

  // Thumbnail images: cache-first with separate cache
  if (url.pathname.includes('/assets/thumbnails/')) {
    event.respondWith(cacheFirstWithCache(request, THUMBNAIL_CACHE));
    return;
  }

  // Static assets: cache-first with stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ── Network-first strategy (for API) ──
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, cloned);
      });
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Cache-first strategy ──
async function cacheFirstWithCache(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      caches.open(cacheName).then((cache) => {
        cache.put(request, cloned);
      });
    }
    return response;
  } catch (e) {
    return new Response('', { status: 404 });
  }
}

// ── Stale-while-revalidate strategy (for static assets) ──
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cloned = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, cloned);
      });
    }
    return response;
  }).catch(() => null);

  if (cached) return cached;

  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;

  // Offline fallback for HTML pages
  if (request.headers.get('Accept')?.includes('text/html')) {
    return new Response(OFFLINE_PAGE, {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return new Response('Offline', { status: 503, statusText: 'Offline' });
}

// ── Handle messages from the main thread ──
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports?.[0]?.postMessage({ version: CACHE_VERSION });
  }
});
