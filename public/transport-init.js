/**
 * STRATO Transport Initializer v2.0
 *
 * This script initializes the Wisp transport for both UV and Scramjet proxies.
 * It MUST run AFTER bare-mux and proxy configs are loaded,
 * and BEFORE the user tries to navigate any proxied URLs.
 */
(function () {
	"use strict";

	const WISP_URL = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/wisp/";
	const BARE_MUX_WORKER = "/frog/baremux/worker.js";
	const EPOXY_TRANSPORT = "/epoxy-transport.mjs";

	let muxConnection = null;
	let transportReady = false;

	/**
	 * Clean up stale service workers from previous STRATO versions.
	 * This prevents old SWs from interfering with the current proxy setup.
	 */
	async function cleanupStaleServiceWorkers() {
		if (!("serviceWorker" in navigator)) return;

		try {
			const registrations = await navigator.serviceWorker.getRegistrations();
			for (const reg of registrations) {
				const swUrl = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
				// Keep only our current SWs: /frog/sw.js, /scramjet.sw.js
				// Remove any stale ones like /sw.js (root), /uv/sw.js, etc.
				const isCurrent =
					swUrl.endsWith("/frog/sw.js") ||
					swUrl.endsWith("/scramjet.sw.js");

				if (!isCurrent && swUrl) {
					console.log("[STRATO] Unregistering stale SW:", swUrl);
					await reg.unregister();
				}
			}
		} catch (err) {
			console.warn("[STRATO] SW cleanup failed:", err);
		}
	}

	/**
	 * Initialize the bare-mux connection and set the Wisp transport.
	 * Returns a promise that resolves when the transport is ready.
	 */
	async function initTransport() {
		if (transportReady) return;

		try {
			// Create the bare-mux connection to the SharedWorker
			// bare-mux/index.js UMD exports: globalThis.BareMux
			const BareMuxConnection = window.BareMux?.BareMuxConnection || window.BareMuxConnection;
			if (!BareMuxConnection) {
				throw new Error("BareMuxConnection not found. Make sure /frog/baremux/index.js is loaded first.");
			}
			muxConnection = new BareMuxConnection(BARE_MUX_WORKER);

			// Set the epoxy transport with Wisp URL
			await muxConnection.setTransport(EPOXY_TRANSPORT, [{ wisp: WISP_URL }]);

			transportReady = true;
			console.log("[STRATO] Wisp transport connected:", WISP_URL);

			// Update the proxy status pill
			const pill = document.getElementById("proxy-pill");
			const label = document.getElementById("proxy-label");
			if (pill) pill.classList.add("connected");
			if (label) label.textContent = "Proxy Ready";
		} catch (err) {
			console.error("[STRATO] Wisp transport failed:", err);

			const pill = document.getElementById("proxy-pill");
			const label = document.getElementById("proxy-label");
			if (pill) pill.classList.add("error");
			if (label) label.textContent = "Proxy Error";

			// Retry once after a delay
			setTimeout(async () => {
				try {
					const BareMuxConnection = window.BareMux?.BareMuxConnection || window.BareMuxConnection;
					muxConnection = new BareMuxConnection(BARE_MUX_WORKER);
					await muxConnection.setTransport(EPOXY_TRANSPORT, [{ wisp: WISP_URL }]);
					transportReady = true;
					console.log("[STRATO] Wisp transport connected on retry:", WISP_URL);
					if (pill) { pill.classList.remove("error"); pill.classList.add("connected"); }
					if (label) label.textContent = "Proxy Ready";
				} catch (retryErr) {
					console.error("[STRATO] Wisp transport retry also failed:", retryErr);
				}
			}, 2000);
		}
	}

	/**
	 * Register the UV and Scramjet service workers.
	 */
	async function registerServiceWorkers() {
		if (!("serviceWorker" in navigator)) {
			console.warn("[STRATO] Service Workers not supported");
			return;
		}

		try {
			// UV service worker — scope must match uv.config.js prefix
			const uvReg = await navigator.serviceWorker.register("/frog/sw.js", {
				scope: "/frog/service/",
				updateViaCache: "none",
			});
			console.log("[STRATO] UV Service Worker registered:", uvReg.scope);

			// Force the SW to activate immediately
			if (uvReg.waiting) {
				uvReg.waiting.postMessage({ type: "SKIP_WAITING" });
			}
			if (uvReg.installing) {
				uvReg.installing.addEventListener("statechange", () => {
					if (uvReg.installing?.state === "installed") {
						uvReg.installing.postMessage({ type: "SKIP_WAITING" });
					}
				});
			}
		} catch (err) {
			console.error("[STRATO] UV SW registration failed:", err);
		}

		try {
			// Scramjet service worker — scope must match scramjet.config.js prefix
			const sjReg = await navigator.serviceWorker.register("/scramjet.sw.js", {
				scope: "/surf/scram/",
				updateViaCache: "none",
			});
			console.log("[STRATO] Scramjet Service Worker registered:", sjReg.scope);

			// Force the SW to activate immediately
			if (sjReg.waiting) {
				sjReg.waiting.postMessage({ type: "SKIP_WAITING" });
			}
			if (sjReg.installing) {
				sjReg.installing.addEventListener("statechange", () => {
					if (sjReg.installing?.state === "installed") {
						sjReg.installing.postMessage({ type: "SKIP_WAITING" });
					}
				});
			}
		} catch (err) {
			console.error("[STRATO] Scramjet SW registration failed:", err);
		}
	}

	/**
	 * Proxify a URL using the selected proxy engine.
	 * Falls back to server-side /proxy endpoint if engine is unavailable.
	 */
	window.proxifyUrl = function (url) {
		if (!url || !url.startsWith("http")) return url;

		const engine = localStorage.getItem("strato-proxy") || "uv";

		if (engine === "uv" && window.__uv$config) {
			try {
				return window.__uv$config.prefix + window.__uv$config.encodeUrl(url);
			} catch (e) {
				console.warn("[STRATO] UV encode failed:", e);
			}
		}

		if (engine === "scramjet" && window.__scramjet$config) {
			try {
				return window.__scramjet$config.prefix + window.__scramjet$config.codec.encode(url);
			} catch (e) {
				console.warn("[STRATO] Scramjet encode failed:", e);
			}
		}

		// If no proxy engine is available, use server-side proxy fallback
		console.warn("[STRATO] No proxy engine available, using server-side fallback for:", url);
		return "/proxy?url=" + encodeURIComponent(url);
	};

	// Expose for other scripts
	window.__stratoTransport = {
		get ready() { return transportReady; },
		get connection() { return muxConnection; },
		init: initTransport,
		registerSW: registerServiceWorkers,
	};

	// Auto-initialize when DOM is ready
	async function autoInit() {
		await cleanupStaleServiceWorkers();
		await initTransport();
		await registerServiceWorkers();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", autoInit);
	} else {
		autoInit();
	}
})();
