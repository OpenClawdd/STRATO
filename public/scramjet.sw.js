importScripts("/surf/scram/scramjet.codecs.js");
importScripts("/scramjet.config.js");
importScripts("/surf/scram/scramjet.bundle.js");
importScripts("/surf/scram/scramjet.worker.js");

const sw = new ScramjetServiceWorker();

self.addEventListener("fetch", (event) => {
	try {
		// WebSocket & Latency Monitoring
		if (event.request.headers.get("Upgrade") === "websocket") {
			console.log(`[SCRAMJET-PROXY] 🚀 WebSocket Upgrade Detected: ${event.request.url}`);
		}

		// Bulletproof Interception: Strictly rewrite all fetch, XHR, and navigation
		if (sw.route(event)) {
			event.respondWith(sw.fetch(event));
		}
	} catch (e) {
		console.error("[Scramjet SW] Bulletproof Interception Error:", e);
	}
});
