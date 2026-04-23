importScripts("/frog/uv.bundle.js");
importScripts("/frog/uv.config.js");

// Ensure Ultraviolet is on the self object for the sw script
if (typeof self.Ultraviolet === 'undefined' && typeof Ultraviolet !== 'undefined') {
	self.Ultraviolet = Ultraviolet;
}

importScripts("/frog/uv.sw.js");

const sw = new UVServiceWorker();

self.addEventListener("fetch", (event) => {
	event.respondWith(sw.fetch(event));
});
