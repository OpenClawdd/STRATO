"use strict";

const connection = new BareMux.BareMuxConnection("/surf/baremux/worker.js");
let scramjetController = null;

// Replace UV launch URL logic with Scramjet encodeUrl
function launchUrl(url) {
	if (!scramjetController) {
		alert("Proxy configuration not loaded.");
		return;
	}
	window.location.href = scramjetController.encodeUrl(url);
}

function openProxy() {
	if (document.querySelector("#proxyModal")) {
		document.querySelector("#proxyModal").classList.add("on");
		setTimeout(() => document.querySelector("#pInp").focus(), 100);
	}
}

function closeProxy() {
	if (document.querySelector("#proxyModal")) {
		document.querySelector("#proxyModal").classList.remove("on");
	}
}

function goProxy() {
	const pInp = document.querySelector("#pInp");
	if (!pInp) return;
	let url = pInp.value.trim();
	if (!url) return;
	let target =
		url.includes(".") && !url.includes(" ")
			? url
			: "https://www.google.com/search?q=" + url;
	if (!/^https?:\/\//i.test(target)) target = "https://" + target;
	launchUrl(target);
}

async function getFastestWispServer() {
	const wispUrls = [
		(location.protocol === "https:" ? "wss" : "ws") +
			"://" +
			location.host +
			"/wisp/",
		"wss://wisp.mercurywork.shop/",
		"wss://ruby.rubynetwork.co/wisp/",
		"wss://tomp.app/wisp/",
	];

	return Promise.any(
		wispUrls.map((url) => {
			return new Promise((resolve, reject) => {
				try {
					const ws = new WebSocket(url);
					ws.onopen = () => {
						ws.close();
						resolve(url);
					};
					ws.onerror = () => reject(new Error("Failed to connect"));
				} catch (e) {
					reject(e);
				}
			});
		})
	);
}

let initSplash = async function () {
	try {
		const fastestUrl = await getFastestWispServer();
		await connection.setTransport("/surf/libcurl/index.mjs", [{ wisp: fastestUrl }]);

		if ("serviceWorker" in navigator) {
			await navigator.serviceWorker.register("/sw.js", { scope: "/" });
		}

		if (typeof $scramjetLoadController !== "undefined") {
			const { ScramjetController } = $scramjetLoadController();
			scramjetController = new ScramjetController({
				files: {
					all: "/surf/scram/scramjet.all.js",
					wasm: "/surf/scram/scramjet.wasm.wasm",
					sync: "/surf/scram/scramjet.sync.js",
				},
				prefix: "/splash/surf/",
			});
			await scramjetController.init();
		} else {
			console.error("Scramjet controller script not loaded");
		}
	} catch (error) {
		console.error("Error initializing SPLASH proxy:", error);
	}
};

window.addEventListener('load', () => {
	initSplash();
});
