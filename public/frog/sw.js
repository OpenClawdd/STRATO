importScripts("/frog/uv.bundle.js");
importScripts("/frog/uv.config.js");

// Ensure Ultraviolet is on the self object for the sw script
if (typeof self.Ultraviolet === 'undefined' && typeof Ultraviolet !== 'undefined') {
        self.Ultraviolet = Ultraviolet;
}

importScripts("/frog/uv.sw.js");

const sw = new UVServiceWorker();

// Take control immediately so the SW intercepts requests on first load
self.addEventListener("install", () => {
        self.skipWaiting();
});

self.addEventListener("activate", (event) => {
        event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
        const url = new URL(event.request.url);

        // WebSocket & Latency Monitoring
        if (event.request.headers.get("Upgrade") === "websocket") {
                console.log(`[STRATO-PROXY] 🚀 WebSocket Upgrade Detected: ${url.href}`);
        }

        // Bulletproof Interception: Strictly rewrite all fetch and XHR
        if (url.href.startsWith(location.origin + self.__uv$config.prefix)) {
                event.respondWith(sw.fetch(event));
        }
});
