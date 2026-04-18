/**
 * STRATO — Proxy Transport Initialization
 *
 * Boot sequence:
 * 1. Create BareMux connection (SharedWorker bridge)
 * 2. Probe for the fastest Wisp endpoint (local first)
 * 3. Set the Epoxy transport (libcurl was never installed — epoxy-tls IS)
 * 4. Register service workers (Scramjet SW + UV SW)
 * 5. Initialize Scramjet controller for URL encoding
 */
"use strict";

window.stratoConnection = new BareMux.BareMuxConnection("/surf/baremux/worker.js");

/**
 * The ScramjetController is initialized after the SW boots.
 * Page-level code (strato-app.js) reads this to encode URLs.
 */
window.scramjetController = null;

// ─── URL Launcher (used by search / direct nav) ───
function launchUrl(url) {
	const engine = document.getElementById("proxyEngine")
		? document.getElementById("proxyEngine").value
		: "scramjet";
	if (engine === "uv" && window.__uv$config) {
		window.location.href =
			window.__uv$config.prefix + window.__uv$config.encodeUrl(url);
		return;
	}
	if (!scramjetController) {
		alert("Proxy configuration not loaded.");
		return;
	}
	window.location.href = scramjetController.encodeUrl(url);
}

// ─── Wisp Server Discovery ───
async function getFastestWispServer() {
	const localWisp =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/";

	const wispUrls = [localWisp, "wss://wisp.mercurywork.shop/"];

	const TIMEOUT_MS = 4000;

	const probeWisp = (url) =>
		new Promise((resolve, reject) => {
			try {
				const ws = new WebSocket(url);
				const timer = setTimeout(() => {
					ws.close();
					reject(new Error("Timeout"));
				}, TIMEOUT_MS);
				ws.onopen = () => {
					clearTimeout(timer);
					ws.close();
					resolve(url);
				};
				ws.onerror = () => {
					clearTimeout(timer);
					reject(new Error("WS probe failed: " + url));
				};
			} catch (e) {
				reject(e);
			}
		});

	try {
		return await Promise.any(wispUrls.map(probeWisp));
	} catch {
		console.warn("[STRATO] All Wisp probes failed, falling back to local");
		return localWisp;
	}
}

// ─── Transport Setup ───
async function setTransportForEngine(wispUrl, engine) {
	if (engine === "uv") {
		// UV uses epoxy transport
		await window.stratoConnection.setTransport("/surf/epoxy/epoxy-bundled.js", [
			{ wisp: wispUrl },
		]);
	} else {
		// Scramjet uses epoxy transport too
		await window.stratoConnection.setTransport("/surf/epoxy/epoxy-bundled.js", [
			{ wisp: wispUrl },
		]);
	}
}

// ─── Main Boot Sequence ───
async function initProxy() {
	try {
		// 1. Find fastest wisp endpoint
		const wispUrl = await getFastestWispServer();
		window.__fastestWispUrl = wispUrl;
		console.log("[STRATO] Wisp endpoint:", wispUrl);

		// 2. Set transport (epoxy-tls, NOT libcurl)
		await setTransportForEngine(wispUrl, "scramjet");
		console.log("[STRATO] Epoxy transport set");

		// 3. Engine toggle listener
		const proxyEngineSelect = document.getElementById("proxyEngine");
		if (proxyEngineSelect) {
			proxyEngineSelect.addEventListener("change", async (e) => {
				const engine = e.target.value;
				await setTransportForEngine(window.__fastestWispUrl, engine);
				console.log("[STRATO] Transport switched for engine:", engine);
			});
		}

		// 4. Register service workers
		if ("serviceWorker" in navigator) {
			// Main SW (handles Scramjet routing)
			await navigator.serviceWorker.register("/sw.js", { scope: "/" });

			// UV sub-SW
			await navigator.serviceWorker.register("/uv/sw.js", {
				scope: "/uv/",
			});

			console.log("[STRATO] Service workers registered");
		}

		// 5. Initialize Scramjet controller
		//    We use self.__scramjet$bundle which is set by scramjet.bundle.js
		//    loaded via <script> tag in index.html
		if (self.__scramjet$bundle) {
			// The bundle exposes rewriters — the controller manages encoding
			window.scramjetController = {
				encodeUrl(url) {
					return self.__scramjet$bundle.rewriters.url.encodeUrl(url);
				},
			};
			console.log("[STRATO] Scramjet controller ready");
		} else {
			console.warn(
				"[STRATO] Scramjet bundle not loaded — scramjet proxy may not work"
			);
		}
	} catch (error) {
		console.error("[STRATO] Proxy init failed:", error);
	}
}

window.addEventListener("load", () => {
	initProxy();
});
