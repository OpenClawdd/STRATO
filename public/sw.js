/* ══════════════════════════════════════════════════════════
   STRATO v5.01 Service Worker
   Cache static assets (CSS, JS, HTML, thumbnails),
   cache-bust on version change (v22), offline fallback page,
   network-first for API calls, cache-first for static assets,
   skip waiting, claim clients
   ══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'strato-v5-01-hotfix';
const CACHE_VERSION = 501;
const DEBUG_SW = false;
const swLog = (...args) => { if (DEBUG_SW) console.debug(...args); };
const swWarn = (...args) => { if (DEBUG_SW) console.warn(...args); };

const STATIC_ASSETS = [
  '/css/style.css',
  '/js/app.js',
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
  '/js/open-home-runtime.js',
  '/js/v5/main.js',
  '/js/v5/core/catalog.js',
  '/js/v5/core/health.js',
  '/js/v5/core/launch.js',
  '/js/v5/core/picks.js',
  '/js/v5/core/search.js',
  '/js/v5/core/state.js',
  '/js/v5/core/storage.js',
  '/js/v5/ui/cards.js',
  '/js/v5/ui/home.js',
  '/js/v5/ui/recovery.js',
  '/js/v5/ui/settings.js',
  '/js/v5/ui/sheet.js',
  '/js/v5/ui/sheets.js',
  '/js/v5/ui/toast.js',
  '/games/strato-game-shell.js',
  '/bare-mux/index.js',
  '/bare-mux/worker.js',
  '/epoxy/index.mjs',
  '/assets/games.json',
  '/assets/sites.json',
  '/favicon.ico',
  '/favicon.png',
  '/manifest.json',
];

// Thumbnails to cache
const THUMBNAIL_CACHE = 'strato-v5-01-thumbnails';
const FALLBACK_THUMBNAIL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="18" fill="#0b1020"/><circle cx="252" cy="42" r="52" fill="#00e5ff" opacity=".16"/><circle cx="74" cy="170" r="80" fill="#a855f7" opacity=".12"/><path d="M44 138h232" stroke="#00e5ff" stroke-opacity=".22"/><text x="160" y="113" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="800" fill="#00e5ff">STRATO</text></svg>`;

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
  swLog('[SW] Installing STRATO v5.01 service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        swLog('[SW] Caching static assets');
        // Use addAll with fallback — individual failures shouldn't break the whole install
        return cache.addAll(STATIC_ASSETS).catch(err => {
          swWarn('[SW] Some assets failed to cache during install:', err.message);
          // Try caching assets individually so one failure doesn't block all
          return Promise.allSettled(
            STATIC_ASSETS.map(url => cache.add(url).catch(e => {
              swWarn('[SW] Failed to cache:', url, e.message);
            }))
          );
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches (cache-bust on version change) ──
self.addEventListener('activate', (event) => {
  swLog('[SW] Activating STRATO v5.01 service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== THUMBNAIL_CACHE)
          .map((name) => {
            swLog('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      swLog('[SW] Claiming all clients');
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

  // Authenticated documents and login pages carry user/session state and CSRF tokens.
  // Keep them out of the static cache so users do not get stale login tokens or stale UI.
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/login' || url.pathname === '/index.html') {
    event.respondWith(networkOnlyWithOffline(request));
    return;
  }

  // Versioned shell assets should update immediately after product patches.
  if (url.searchParams.has('v') || url.pathname === '/js/app.js' || url.pathname === '/css/style.css' || url.pathname === '/sw.js') {
    event.respondWith(networkFirstStatic(request));
    return;
  }

  // Proxy routes: never cache (dynamic proxied content)
  if (url.pathname.startsWith('/frog/') || url.pathname.startsWith('/scramjet/')) {
    return;
  }

  // Thumbnail images: cache-first with separate cache
  if (url.pathname.includes('/assets/thumbnails/')) {
    event.respondWith(cacheFirstThumbnail(request));
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

async function networkFirstStatic(request) {
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
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function networkOnlyWithOffline(request) {
  try {
    return await fetch(request);
  } catch (e) {
    if (request.headers.get('Accept')?.includes('text/html')) {
      return new Response(OFFLINE_PAGE, {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
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

async function cacheFirstThumbnail(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      caches.open(THUMBNAIL_CACHE).then((cache) => {
        cache.put(request, cloned);
      });
      return response;
    }
  } catch (e) {
    // Fall through to the inline fallback below.
  }

  return new Response(FALLBACK_THUMBNAIL, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  });
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
