if (navigator.userAgent.includes("Firefox")) {
	Object.defineProperty(globalThis, "crossOriginIsolated", {
		value: true,
		writable: false,
	});
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Load scramjet modules in the correct dependency order:
// 1. codecs   → sets self.__scramjet$codecs (needed by config)
// 2. config   → sets self.__scramjet$config (needed by bundle/worker)
// 3. bundle   → sets self.__scramjet$bundle (rewriters for HTML/JS/CSS)
// 4. worker   → defines ScramjetServiceWorker class
importScripts(
	"/surf/scram/scramjet.codecs.js",
	"/surf/scram/scramjet.config.js",
	"/surf/scram/scramjet.bundle.js",
	"/surf/scram/scramjet.worker.js"
);

// Override default config paths to match our /surf/scram/ route
self.__scramjet$config = Object.assign(self.__scramjet$config || {}, {
	prefix: "/surf/scram/",
	config: "/surf/scram/scramjet.config.js",
	bundle: "/surf/scram/scramjet.bundle.js",
	worker: "/surf/scram/scramjet.worker.js",
	client: "/surf/scram/scramjet.client.js",
	codecs: "/surf/scram/scramjet.codecs.js",
});

let scramjet = null;
let scramjetReady = false;

const splashPrefix = "/splash/surf/";
const cipherKey = "SPLASH";
const alphabet =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

const CONFIG = {
	blocked: [
		"youtube.com/get_video_info?*adformat=*",
		"youtube.com/api/stats/ads/*",
		"youtube.com/pagead/*",
		".facebook.com/ads/*",
		".facebook.com/tr/*",
		".fbcdn.net/ads/*",
		"graph.facebook.com/ads/*",
		"ads-api.twitter.com/*",
		"analytics.twitter.com/*",
		".twitter.com/i/ads/*",
		".ads.yahoo.com",
		".advertising.com",
		".adtechus.com",
		".oath.com",
		".verizonmedia.com",
		".amazon-adsystem.com",
		"aax.amazon-adsystem.com/*",
		"c.amazon-adsystem.com/*",
		".adnxs.com",
		".adnxs-simple.com",
		"ab.adnxs.com/*",
		".rubiconproject.com",
		".magnite.com",
		".pubmatic.com",
		"ads.pubmatic.com/*",
		".criteo.com",
		"bidder.criteo.com/*",
		"static.criteo.net/*",
		".openx.net",
		".openx.com",
		".indexexchange.com",
		".casalemedia.com",
		".adcolony.com",
		".chartboost.com",
		".unityads.unity3d.com",
		".inmobiweb.com",
		".tapjoy.com",
		".applovin.com",
		".vungle.com",
		".ironsrc.com",
		".fyber.com",
		".smaato.net",
		".supersoniads.com",
		".startappservice.com",
		".airpush.com",
		".outbrain.com",
		".taboola.com",
		".revcontent.com",
		".zedo.com",
		".mgid.com",
		"*/ads/*",
		"*/adserver/*",
		"*/adclick/*",
		"*/banner_ads/*",
		"*/sponsored/*",
		"*/promotions/*",
		"*/tracking/ads/*",
		"*/promo/*",
		"*/affiliates/*",
		"*/partnerads/*",
	],
};

let playgroundData;
let adblockEnabled = true;

function toRegex(pattern) {
	const escaped = pattern
		.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
		.replace(/\*\*/g, "{{DOUBLE_STAR}}")
		.replace(/\*/g, "[^/]*")
		.replace(/{{DOUBLE_STAR}}/g, ".*");
	return new RegExp(`^${escaped}$`);
}

function isBlocked(hostname, pathname) {
	return CONFIG.blocked.some((pattern) => {
		if (pattern.startsWith("#")) {
			pattern = pattern.substring(1);
		}
		if (pattern.startsWith("*")) {
			pattern = pattern.substring(1);
		}

		if (pattern.includes("/")) {
			const [hostPattern, ...pathParts] = pattern.split("/");
			const pathPattern = pathParts.join("/");
			const hostRegex = toRegex(hostPattern);
			const pathRegex = toRegex(`/${pathPattern}`);
			return hostRegex.test(hostname) && pathRegex.test(pathname);
		}
		const hostRegex = toRegex(pattern);
		return hostRegex.test(hostname);
	});
}

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

function deleteScramjetDb() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase("$scramjet");
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
		request.onblocked = () => resolve();
	});
}

async function checkScramjetDb() {
	await new Promise((resolve, reject) => {
		const request = indexedDB.open("$scramjet");
		request.onsuccess = () => {
			const db = request.result;
			const hasCookies = db.objectStoreNames.contains("cookies");
			db.close();
			if (hasCookies) {
				resolve();
				return;
			}
			deleteScramjetDb().then(resolve, reject);
		};
		request.onerror = () => reject(request.error);
	});
}

async function initScramjet() {
	if (scramjetReady) return;
	await checkScramjetDb();
	scramjet = new ScramjetServiceWorker();
	scramjetReady = true;
}

async function ensureScramjetConfig() {
	try {
		await scramjet.loadConfig();
	} catch (error) {
		const message =
			error && typeof error.message === "string" ? error.message : "";
		if (error?.name === "NotFoundError" || message.includes("object store")) {
			await deleteScramjetDb();
			scramjet = new ScramjetServiceWorker();
			await scramjet.loadConfig();
			return;
		}
		throw error;
	}
}

async function handleRequest(event) {
	const url = new URL(event.request.url);

	if (
		event.request.mode === "navigate" &&
		event.request.destination === "document"
	) {
		if (url.pathname.startsWith(splashPrefix)) {
			const encodedPath = url.pathname.slice(splashPrefix.length);
			if (encodedPath) {
				const decodedTarget = decodeURIComponent(encodedPath);
				const encodedTarget = encodeTarget(decodedTarget);
				return Response.redirect(`/#${encodedTarget}`, 302);
			}
			return Response.redirect("/", 302);
		}
	}

	// Only intercept if it's a scramjet request
	if (url.pathname.startsWith("/surf/scram/")) {
		await initScramjet();
		await ensureScramjetConfig();
		if (scramjet.route(event)) {
			const response = await scramjet.fetch(event);
			const contentType = response.headers.get("content-type") || "";

			if (contentType.includes("text/html")) {
				const originalText = await response.text();
				const encoder = new TextEncoder();
				const byteLength = encoder.encode(originalText).length;
				const newHeaders = new Headers(response.headers);
				newHeaders.set("content-length", byteLength.toString());

				return new Response(originalText, {
					status: response.status,
					statusText: response.statusText,
					headers: newHeaders,
				});
			}

			return response;
		}
	}

	return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	const url = event.request.url;

	if (url.includes("supabase.co")) {
		return;
	}

	event.respondWith(handleRequest(event));
});

self.addEventListener("message", ({ data }) => {
	if (data.type === "playgroundData") {
		playgroundData = data;
		return;
	}
	if (data.type === "adblock") {
		adblockEnabled = data.enabled === true;
	}
});
