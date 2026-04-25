/**
 * STRATO Scramjet Service Worker
 * Scope MUST match the prefix in scramjet.config.js: "/surf/scram/"
 */
importScripts("/surf/scram/scramjet.codecs.js");
importScripts("/scramjet.config.js");
importScripts("/surf/scram/scramjet.bundle.js");
importScripts("/surf/scram/scramjet.worker.js");

const sw = new ScramjetServiceWorker();

// Take control immediately so the SW intercepts requests on first load
self.addEventListener("install", () => {
        self.skipWaiting();
});

self.addEventListener("activate", (event) => {
        event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
        try {
                if (sw.route(event)) {
                        event.respondWith(sw.fetch(event));
                }
        } catch (e) {
                console.error("[Scramjet SW] Error:", e);
        }
});
