"use strict";
/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("uv-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("uv-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("uv-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("uv-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("uv-error-code");
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

if (form) {
	form.addEventListener("submit", async (event) => {
		event.preventDefault();

		try {
			await registerSW();
		} catch (err) {
			error.textContent = "Failed to register service worker.";
			errorCode.textContent = err.toString();
			throw err;
		}

		const url = search(address.value, searchEngine.value);

		let frame = document.getElementById("uv-frame");
		frame.style.display = "block";

		frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);
	});
}

// --- Migrated Logic from index.html ---

function launchUrl(url) {
	if (typeof __uv$config === "undefined") {
		alert("Proxy configuration not loaded.");
		return;
	}
	window.location.href = __uv$config.prefix + __uv$config.encodeUrl(url);
}

function openProxy() {
	q("#proxyModal").classList.add("on");
	setTimeout(() => q("#pInp").focus(), 100);
}
function closeProxy() {
	q("#proxyModal").classList.remove("on");
}

function goProxy() {
	let url = q("#pInp").value.trim();
	if (!url) return;
	let target =
		url.includes(".") && !url.includes(" ")
			? url
			: "https://www.google.com/search?q=" + url;
	if (!/^https?:\/\//i.test(target)) target = "https://" + target;
	launchUrl(target);
}

let registerSW = async function () {
	const fastestUrl = await getFastestWispServer();
	await connection.setTransport("/epoxy/index.mjs", [{ wisp: fastestUrl }]);

	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("/uv/sw.js", { scope: "/" });
	}
};

// Panic Button
addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		window.location.href = "https://classroom.google.com";
	}
	if (e.key === "Enter" && q("#proxyModal").classList.contains("on")) {
		goProxy();
	}
});

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
					ws.onerror = () => {
						reject(new Error("Failed to connect"));
					};
				} catch (e) {
					reject(e);
				}
			});
		})
	);
}
