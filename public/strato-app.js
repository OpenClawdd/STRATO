/* ═══════════════════════════════════════════════════════════════
   STRATO — Stratosphere Application Logic
   Dynamic game loading, search, proxy routing, view management
   ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ── STATE ── */
let GAMES = [];
let tileEls = []; // { n, t, el }

/* ── PROXY ── */
function proxifyUrl(u) {
	const engine = document.getElementById("proxyEngine")
		? document.getElementById("proxyEngine").value
		: "scramjet";
	if (engine === "uv" && window.__uv$config) {
		return window.__uv$config.prefix + window.__uv$config.encodeUrl(u);
	}
	if (window.scramjetController) return window.scramjetController.encodeUrl(u);
	return u;
}

/* ── CLOAK ── */
const PRESETS = {
	default: { title: "STRATO — Dashboard", fav: "" },
	drive: {
		title: "My Drive — Google Drive",
		fav: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png",
	},
	classroom: {
		title: "Stream — Google Classroom",
		fav: "https://ssl.gstatic.com/classroom/favicon.png",
	},
};
function applyPrivacyPreset() {
	const v = document.getElementById("privacyPreset").value;
	const p = PRESETS[v] || PRESETS.default;
	document.title = p.title;
	const f = document.getElementById("favicon");
	if (f) f.href = p.fav;
}

/* ── PANIC ── */
function panic() {
	window.location.replace("https://classroom.google.com");
}
window.addEventListener("keydown", (e) => {
	if (e.key === "Escape") closeGameOverlay();
});

/* ── SPLASH ── */
document.getElementById("splash-enter").addEventListener("click", () => {
	if (window.top !== window.self) {
		// Already inside an iframe, just dismiss
		document.getElementById("splash").classList.add("out");
		setTimeout(() => {
			document.getElementById("splash").style.display = "none";
			document.getElementById("app").classList.add("on");
		}, 800);
	} else {
		// Not in an iframe — do the about:blank cloaking
		const blank = window.open("about:blank", "_blank");
		if (blank) {
			blank.document.body.style.margin = "0";
			blank.document.body.style.padding = "0";
			blank.document.body.style.overflow = "hidden";
			blank.document.body.style.background = "#030608";

			const iframe = blank.document.createElement("iframe");
			iframe.style.width = "100%";
			iframe.style.height = "100%";
			iframe.style.border = "none";
			iframe.src = window.location.href;
			blank.document.body.appendChild(iframe);

			blank.addEventListener("beforeunload", (e) => {
				e.preventDefault();
				e.returnValue = "";
			});

			window.location.replace("https://classroom.google.com");
		} else {
			// Popup blocked fallback
			document.getElementById("splash").classList.add("out");
			setTimeout(() => {
				document.getElementById("splash").style.display = "none";
				document.getElementById("app").classList.add("on");
			}, 800);
		}
	}
});

/* ═══════════════════════════════════════
   SEARCH
   ═══════════════════════════════════════ */
const searchInput = document.getElementById("searchInput");
if (searchInput) {
	searchInput.addEventListener("input", (e) => {
		const q = e.target.value.toLowerCase().trim();
		// Auto-switch to grid view when searching
		if (!document.getElementById("view-grid").classList.contains("active"))
			switchView("grid");
		filterGames(q);
	});

	searchInput.addEventListener("keydown", (e) => {
		if (e.key !== "Enter") return;
		e.preventDefault();
		const v = searchInput.value.trim();
		if (!v) return;
		// If it looks like a URL, proxy it
		if (v.includes(".") && !v.includes(" ")) {
			let t = v;
			if (!/^https?:\/\//i.test(t)) t = "https://" + t;
			window.location.href = proxifyUrl(t);
		} else {
			window.location.href = proxifyUrl(
				"https://www.google.com/search?q=" + encodeURIComponent(v)
			);
		}
	});
}

function filterGames(q) {
	let vis = 0;
	tileEls.forEach((c) => {
		const match =
			!q || c.n.toLowerCase().includes(q) || c.t.toLowerCase().includes(q);
		c.el.style.display = match ? "" : "none";
		if (match) vis++;
	});
	const counter = document.getElementById("gameCount");
	if (counter) counter.textContent = vis;
}

/* ═══════════════════════════════════════
   DYNAMIC GAME LOADING
   ═══════════════════════════════════════ */
async function loadGames() {
	// Primary source: /assets/games.json (in public/assets/)
	try {
		const res = await fetch("/assets/games.json");
		const data = await res.json();
		GAMES.push(...data);
	} catch (e) {
		console.error("Failed to load /assets/games.json", e);
	}

	// Fallback: /config/games.json
	if (GAMES.length === 0) {
		try {
			const res = await fetch("/config/games.json");
			const data = await res.json();
			GAMES.push(...data);
		} catch (e) {
			console.error("Failed to load /config/games.json", e);
		}
	}

	renderGrid();
}

function renderGrid() {
	const grid = document.getElementById("gameGrid");
	const counter = document.getElementById("gameCount");
	if (!grid) return;

	counter.textContent = GAMES.length;

	const frag = document.createDocumentFragment();
	GAMES.forEach((g, i) => {
		const tile = document.createElement("div");
		tile.className = "game-tile";
		tile.style.animationDelay = `${Math.min(i * 15, 600)}ms`;

		const hasImg = g.img && g.img.trim();
		const safeName = (g.n || "Unknown")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
		const firstLetter = (g.n || "?")[0].toUpperCase();

		tile.innerHTML = `
			${hasImg ? `<img class="gt-img" src="${g.img}" loading="lazy" alt="${safeName}">` : ""}
			<div class="gt-fallback" style="${hasImg ? "display:none" : ""}">
				<span class="gt-fb-letter">${firstLetter}</span>
				<span class="gt-fb-name">${safeName}</span>
			</div>
			<div class="gt-hud">
				<span class="gt-name">${safeName}</span>
				<span class="gt-tag">${g.t || "GAME"}</span>
			</div>
			<div class="gt-launch">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
			</div>`;

		// Programmatic image error handler (no inline onerror — avoids CSP script-src-attr violation)
		if (hasImg) {
			const img = tile.querySelector(".gt-img");
			img.addEventListener("error", () => {
				img.style.display = "none";
				tile.querySelector(".gt-fallback").style.display = "flex";
			});
		}

		tile.addEventListener("click", () => openGame(g.u, g.n));
		tileEls.push({ n: g.n || "", t: g.t || "", el: tile });
		frag.appendChild(tile);
	});
	grid.appendChild(frag);
}

loadGames();

/* ═══════════════════════════════════════
   GAME OVERLAY
   ═══════════════════════════════════════ */
function openGame(url, name) {
	const ov = document.getElementById("game-overlay");
	const ifr = document.getElementById("game-iframe");
	document.getElementById("ov-game-title").textContent = name;
	// Local paths (e.g. "/games/tetris/") load directly; external URLs go through proxy
	ifr.src = url.startsWith("/") ? url : proxifyUrl(url);
	ov.classList.add("on");
	ov.style.display = "flex";
}

function closeGameOverlay() {
	const ov = document.getElementById("game-overlay");
	ov.classList.remove("on");
	ov.style.display = "none";
	document.getElementById("game-iframe").src = "about:blank";
}

function reqFS() {
	const ifr = document.getElementById("game-iframe");
	(ifr.requestFullscreen || ifr.webkitRequestFullscreen || function () {}).call(
		ifr
	);
}

/* ═══════════════════════════════════════
   VIEW SWITCHING
   ═══════════════════════════════════════ */
function switchView(id) {
	document
		.querySelectorAll(".view")
		.forEach((v) => v.classList.remove("active"));
	document.getElementById("view-" + id).classList.add("active");
	document
		.querySelectorAll(".vt")
		.forEach((d) => d.classList.toggle("on", d.dataset.view === id));
}

// Wire tab buttons
document.querySelectorAll(".vt").forEach((btn) => {
	btn.addEventListener("click", () => switchView(btn.dataset.view));
});

/* ═══════════════════════════════════════
   WATCH
   ═══════════════════════════════════════ */
function launchWatch(url, name) {
	document.querySelector("#view-watch .launch-panel").style.display = "none";
	const p = document.getElementById("watch-player");
	p.classList.add("on");
	document.getElementById("watch-ttl").textContent = name;
	document.getElementById("watch-iframe").src = proxifyUrl(url);
}

function backToWatchChoice() {
	document.getElementById("watch-player").classList.remove("on");
	document.getElementById("watch-iframe").src = "about:blank";
	document.querySelector("#view-watch .launch-panel").style.display = "";
}

/* ═══════════════════════════════════════
   LISTEN
   ═══════════════════════════════════════ */
function launchListen(mode) {
	document.querySelector("#view-listen .launch-panel").style.display = "none";
	const p = document.getElementById("listen-player");
	p.classList.add("on");
	const ifr = document.getElementById("listen-iframe");
	if (mode === "mono") {
		document.getElementById("listen-ttl").textContent = "Monochrome";
		ifr.src = "https://monochrome.tf";
		ifr.style.filter = "grayscale(100%) contrast(1.1)";
	} else {
		document.getElementById("listen-ttl").textContent = "Spotify";
		ifr.src = proxifyUrl("https://open.spotify.com");
		ifr.style.filter = "";
	}
}

function backToListenChoice() {
	document.getElementById("listen-player").classList.remove("on");
	document.getElementById("listen-iframe").src = "about:blank";
	document.querySelector("#view-listen .launch-panel").style.display = "";
}

/* ═══════════════════════════════════════
   EVENT WIRING (replaces all inline onclick/onchange)
   ═══════════════════════════════════════ */

// Privacy preset
document
	.getElementById("privacyPreset")
	.addEventListener("change", applyPrivacyPreset);

// Panic button
document.getElementById("panicBtn").addEventListener("click", panic);

// Watch launch cards
document.querySelectorAll('[data-action="watch"]').forEach((el) => {
	el.addEventListener("click", () =>
		launchWatch(el.dataset.url, el.dataset.name)
	);
});

// Watch back
document
	.getElementById("watch-back-btn")
	.addEventListener("click", backToWatchChoice);

// Listen launch cards
document.querySelectorAll('[data-action="listen"]').forEach((el) => {
	el.addEventListener("click", () => launchListen(el.dataset.mode));
});

// Listen back
document
	.getElementById("listen-back-btn")
	.addEventListener("click", backToListenChoice);

// Game overlay back & fullscreen
document
	.getElementById("overlay-back-btn")
	.addEventListener("click", closeGameOverlay);
document.getElementById("overlay-fs-btn").addEventListener("click", reqFS);
