/**
 * STRATO Root Service Worker v1.0
 * ================================
 * Aggressive Caching for Local Game Assets
 */

const CACHE_NAME = 'strato-games-v1';
const STATIC_ASSETS = [
	'/',
	'/index.html',
	'/technozen.css',
	'/app.js',
	'/game-engine.js'
];

// File types to cache-first in /games/
const CACHE_FIRST_TYPES = [
	'.wasm',
	'.js',
	'.png',
	'.jpg',
	'.webp',
	'.mp3',
	'.ogg',
	'.wav',
	'.data',
	'.json'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// 1. Bypass cache for proxied traffic (UV/Scramjet)
	// These usually have specific prefixes or are cross-origin requests handled by UV
	if (url.pathname.startsWith('/frog/service/') || url.pathname.startsWith('/surf/scram/')) {
		return;
	}

	// 2. Cache-First Strategy for local game assets
	if (url.pathname.startsWith('/games/')) {
		const isCacheableType = CACHE_FIRST_TYPES.some(ext => url.pathname.endsWith(ext));
		
		if (isCacheableType) {
			event.respondWith(
				caches.match(event.request).then((cachedResponse) => {
					if (cachedResponse) return cachedResponse;

					return fetch(event.request).then((networkResponse) => {
						if (!networkResponse || networkResponse.status !== 200) {
							return networkResponse;
						}
						const responseToCache = networkResponse.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(event.request, responseToCache);
						});
						return networkResponse;
					});
				})
			);
			return;
		}
	}

	// 3. Network-First for everything else
	event.respondWith(
		fetch(event.request).catch(() => caches.match(event.request))
	);
});
