"use strict";

const cipherKey = "SPLASH";
const alphabet =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function toBase64(value) {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	bytes.forEach((b) => {
		binary += String.fromCharCode(b);
	});
	return btoa(binary);
}

function vigenereEncode(value, key) {
	let result = "";
	for (let i = 0; i < value.length; i += 1) {
		const char = value[i];
		const valueIndex = alphabet.indexOf(char);
		if (valueIndex === -1) {
			result += char;
			continue;
		}
		const keyIndex = alphabet.indexOf(key[i % key.length]) % alphabet.length;
		result +=
			alphabet[(valueIndex + keyIndex + alphabet.length) % alphabet.length];
	}
	return result;
}

function encodeTarget(url) {
	return vigenereEncode(toBase64(url), cipherKey);
}

// --- Migrated Logic from index.html ---

function launchUrl(url) {
	window.location.href = "/splash/surf/" + encodeURIComponent(url);
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
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("/splash/sw.js", { scope: "/" });
	}
};

// Panic Button handled in index.html now

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
