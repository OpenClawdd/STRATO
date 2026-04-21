importScripts("/surf/scram/scramjet.codecs.js");
importScripts("/scramjet.config.js");
importScripts("/surf/scram/scramjet.bundle.js");
importScripts("/surf/scram/scramjet.worker.js");

const sw = new ScramjetServiceWorker();

self.addEventListener("fetch", (event) => {
	try {
		if (sw.route(event)) {
			event.respondWith(sw.fetch(event));
		}
	} catch (e) {
		console.error("[Scramjet SW] Fetch Error:", e);
	}
});
