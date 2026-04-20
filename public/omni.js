/**
 * STRATO — omni.js v22.4
 * Boot engine, proxy init, game grid, search, settings, AI decoy
 */
"use strict";

/* ═══════════════════
   CONSTANTS
   ═══════════════════ */
const RENDER_LIMIT = 150;
const DEBOUNCE_MS = 60;

/* ═══════════════════
   STATE
   ═══════════════════ */
let masterGames = [];
let mathDecoy = [];
let filteredGames = [];
let activeCategory = "All";
let searchQuery = "";
let currentLimit = RENDER_LIMIT;

/* Pre-fetch GN Math library silently */
fetch("https://cdn.jsdelivr.net/gh/freebuisness/assets@latest/zones.json")
	.then((r) => r.json())
	.then((data) => {
		mathDecoy = data.map((g) => ({
			title: g.name,
			t: "GN Math",
			iframe_url: g.url.replace(
				"{HTML_URL}",
				"https://cdn.jsdelivr.net/gh/freebuisness/html@main"
			),
			img: g.cover.replace(
				"{COVER_URL}",
				"https://cdn.jsdelivr.net/gh/freebuisness/covers@main"
			),
		}));
		if (localStorage.getItem("strato_math_decoy") === "true") applyFilters();
	})
	.catch(() => {
		mathDecoy = [
			{
				title: "Calculus III",
				t: "Math",
				iframe_url: "https://www.google.com/search?q=calculus+3",
				img: "",
			},
		];
	});

/* ═══════════════════
   DOM HELPERS
   ═══════════════════ */
const $ = (id) => document.getElementById(id);

/* ═══════════════════
   FPS VITALS
   ═══════════════════ */
let _lastTime = performance.now(),
	_frames = 0;
function runVitals() {
	const now = performance.now();
	_frames++;
	if (now > _lastTime + 1000) {
		const fps = Math.round((_frames * 1000) / (now - _lastTime));
		const el = $("vital-fps");
		if (el) el.querySelector(".vital-label").textContent = `${fps} FPS`;
		_frames = 0;
		_lastTime = now;
	}
	const dot = document.querySelector(".vital-dot");
	if (dot) {
		const ready = !!window.stratoConnection?.transport;
		dot.classList.toggle("ready", ready);
		const pill = $("vital-proxy");
		if (pill) pill.title = ready ? "Proxy: ACTIVE" : "Proxy: Connecting...";
	}
	document.hidden
		? setTimeout(runVitals, 1000)
		: requestAnimationFrame(runVitals);
}

/* ═══════════════════
   PARTICLES
   ═══════════════════ */
function initParticles() {
	const canvas = $("particleCanvas");
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	let W = (canvas.width = innerWidth);
	let H = (canvas.height = innerHeight);

	const pts = Array.from({ length: 55 }, () => ({
		x: Math.random() * W,
		y: Math.random() * H,
		r: Math.random() * 1.5 + 0.4,
		vx: (Math.random() - 0.5) * 0.3,
		vy: (Math.random() - 0.5) * 0.3,
	}));

	addEventListener("resize", () => {
		W = canvas.width = innerWidth;
		H = canvas.height = innerHeight;
	});

	function draw() {
		if (document.hidden) {
			requestAnimationFrame(draw);
			return;
		}
		ctx.clearRect(0, 0, W, H);
		const isTerm = document.documentElement.dataset.theme === "terminal";
		ctx.fillStyle = isTerm ? "rgba(0,255,70,0.25)" : "rgba(0,229,255,0.2)";
		pts.forEach((p) => {
			p.x += p.vx;
			p.y += p.vy;
			if (p.x < 0) p.x = W;
			if (p.x > W) p.x = 0;
			if (p.y < 0) p.y = H;
			if (p.y > H) p.y = 0;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
			ctx.fill();
		});
		requestAnimationFrame(draw);
	}
	draw();
}

/* ═══════════════════
   THEME
   ═══════════════════ */
function initTheme() {
	const sel = $("themeSelector");
	if (!sel) return;
	const saved = localStorage.getItem("strato_theme") || "midnight";
	document.documentElement.dataset.theme = saved;
	sel.value = saved;
	sel.addEventListener("change", (e) => {
		document.documentElement.dataset.theme = e.target.value;
		localStorage.setItem("strato_theme", e.target.value);
	});
}

/* ═══════════════════
   PROXY INIT (Ultraviolet + Scramjet)
   ═══════════════════ */
async function initProxy() {
	if (!("serviceWorker" in navigator) || !window.BareMux) return;
	try {
		window.stratoConnection = new BareMux.BareMuxConnection(
			"/surf/baremux/worker.js"
		);
		const wispUrl =
			(location.protocol === "https:" ? "wss" : "ws") +
			"://" +
			location.host +
			"/wisp/";
		await window.stratoConnection.setTransport("/epoxy-transport.mjs", [
			{ wisp: wispUrl },
		]);
	} catch {
		try {
			await window.stratoConnection?.setTransport(
				"/surf/epoxy/epoxy-bundled.js",
				[{ wisp: "wss://wisp.mercurywork.shop/" }]
			);
		} catch {}
	}

	// Register service workers
	await Promise.allSettled([
		navigator.serviceWorker.register("/uv/sw.js", { scope: "/uv/service/" }),
		navigator.serviceWorker.register("/scramjet.sw.js", { scope: "/scram/" }),
	]);
}

/* ═══════════════════
   PROXY URL ENCODER
   ═══════════════════ */
function proxifyUrl(url) {
	const engine = localStorage.getItem("strato_proxy") || "uv";
	if (engine === "uv" && window.__uv$config)
		return __uv$config.prefix + __uv$config.encodeUrl(url);
	if (engine === "splash" && window.__scramjet$config)
		return __scramjet$config.prefix + __scramjet$config.codec.encode(url);
	return `/proxy?url=${encodeURIComponent(url)}`;
}

/* ═══════════════════
   GAME OVERLAY
   ═══════════════════ */
function openOverlay(url, title) {
	const ov = $("game-overlay");
	const ifr = $("game-iframe");
	const ttl = $("ov-game-title");
	if (ttl) ttl.textContent = title || "";
	ifr.src = url.startsWith("/") ? url : proxifyUrl(url);
	ov.removeAttribute("hidden");
}

function closeOverlay() {
	const ov = $("game-overlay");
	const ifr = $("game-iframe");
	ov.setAttribute("hidden", "");
	ifr.src = "about:blank";
}

/* ═══════════════════
   VIEW SWITCHING
   ═══════════════════ */
function switchView(viewId) {
	document
		.querySelectorAll(".view")
		.forEach((v) => v.classList.toggle("active", v.id === `view-${viewId}`));
	document
		.querySelectorAll(".sn-item")
		.forEach((i) => i.classList.toggle("on", i.dataset.view === viewId));
	// Focus search when switching to grid
	if (viewId === "grid") $("searchInput")?.focus();
}

/* ═══════════════════
   LAZY IMAGE LOADER
   ═══════════════════ */
const lazyObserver = new IntersectionObserver(
	(entries, obs) => {
		entries.forEach((e) => {
			if (!e.isIntersecting) return;
			const img = e.target;
			if (img.dataset.src) {
				img.src = img.dataset.src;
				img.onload = () => img.classList.add("loaded");
				img.onerror = () => (img.style.display = "none");
				img.removeAttribute("data-src");
			}
			obs.unobserve(img);
		});
	},
	{ rootMargin: "250px" }
);

/* ═══════════════════
   GAME TILE BUILDER
   ═══════════════════ */
function createTile(game, index = 0) {
	const title = game.title || game.n || "Unknown";
	const url = game.iframe_url || game.u;
	const type = game.t || "GAME";
	const img = game.thumbnail || game.img || "";
	const hex = Math.floor(Math.random() * 0xffffff)
		.toString(16)
		.toUpperCase()
		.padStart(6, "0");

	const tile = document.createElement("div");
	tile.className = "unified-tile";
	tile.style.animationDelay = `${Math.min(index * 35, 1200)}ms`;
	tile.setAttribute("role", "button");
	tile.setAttribute("tabindex", "0");
	tile.setAttribute("aria-label", `Play ${title}`);

	const safe = title.replace(
		/[<>"'&]/g,
		(c) =>
			({ "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "&": "&amp;" })[
				c
			]
	);

	tile.innerHTML = `
    <img class="ut-img" data-src="${img}" alt="${safe}" aria-hidden="true">
    <div class="ut-terminal-hud" aria-hidden="true">
      <div class="tt-head">
        <span class="tt-type">[${type}]</span>
        <span class="tt-status">ONLINE</span>
      </div>
      <div class="tt-body">
        <div class="tt-name">${safe}</div>
        <div class="tt-hex">0x${hex}</div>
      </div>
    </div>
    <div class="ut-sky-hud" aria-hidden="true">
      <div class="sh-name">${safe}</div>
      <div class="sh-tag">${type}</div>
    </div>
  `;

	const imgEl = tile.querySelector(".ut-img");
	if (img) lazyObserver.observe(imgEl);
	else imgEl.style.display = "none";

	const launch = () => {
		if (url) openOverlay(url, title);
	};
	tile.addEventListener("click", launch);
	tile.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			launch();
		}
	});
	return tile;
}

/* ═══════════════════
   GRID RENDER
   ═══════════════════ */
function renderGrid(list) {
	const grid = $("gameGrid");
	const count = $("gameCount");
	if (!grid) return;

	grid.innerHTML = "";
	const frag = document.createDocumentFragment();
	list
		.slice(0, currentLimit)
		.forEach((g, i) => frag.appendChild(createTile(g, i)));
	grid.appendChild(frag);
	if (count) count.textContent = list.length.toLocaleString();
}

function appendGrid(list, limit) {
	const grid = $("gameGrid");
	if (!grid) return;
	const start = grid.children.length;
	if (start >= Math.min(limit, list.length)) return;
	const frag = document.createDocumentFragment();
	list
		.slice(start, limit)
		.forEach((g, i) => frag.appendChild(createTile(g, start + i)));
	grid.appendChild(frag);
}

/* ═══════════════════
   FILTERS & SEARCH
   ═══════════════════ */
function applyFilters() {
	const isDecoy = localStorage.getItem("strato_math_decoy") === "true";
	let base = isDecoy ? mathDecoy : masterGames;

	let result = base;
	if (activeCategory !== "All")
		result = result.filter((g) => (g.t || "Other") === activeCategory);
	if (searchQuery)
		result = result.filter((g) =>
			(g.title || g.n || "").toLowerCase().includes(searchQuery)
		);

	filteredGames = result;
	currentLimit = RENDER_LIMIT;

	const inp = $("searchInput");
	if (inp)
		inp.placeholder = `Search ${base.length.toLocaleString()} ${isDecoy ? "academic" : "games"}...`;

	const hdr = document.querySelector("#view-grid .sh-title");
	if (hdr) hdr.textContent = isDecoy ? "GN MATH LIBRARY" : "ARCADE";

	renderGrid(filteredGames);
}

function buildCategoryBar() {
	const bar = $("category-bar");
	if (!bar) return;
	const isDecoy = localStorage.getItem("strato_math_decoy") === "true";
	const base = isDecoy ? mathDecoy : masterGames;

	const counts = {};
	base.forEach((g) => {
		const c = g.t || "Other";
		counts[c] = (counts[c] || 0) + 1;
	});
	const cats = [
		"All",
		...Object.entries(counts)
			.sort((a, b) => b[1] - a[1])
			.map((e) => e[0]),
	];

	bar.innerHTML = "";
	cats.forEach((cat) => {
		const btn = document.createElement("button");
		btn.className = "cat-pill" + (cat === activeCategory ? " active" : "");
		btn.textContent = cat;
		btn.addEventListener("click", () => {
			activeCategory = cat;
			bar
				.querySelectorAll(".cat-pill")
				.forEach((p) => p.classList.remove("active"));
			btn.classList.add("active");
			applyFilters();
		});
		bar.appendChild(btn);
	});
}

/* ═══════════════════
   EXTERNAL AGGREGATOR
   ═══════════════════ */
async function fetchExternalGames() {
	const sources = [
		{
			name: "Selenite",
			url: "https://raw.githubusercontent.com/skid9000/selenite-v2/main/src/games.json",
			map: (g) => ({
				title: g.name,
				iframe_url: g.link,
				t: "Selenite",
				img: g.image,
			}),
		},
		{
			name: "3kh0-Lite",
			url: "https://raw.githubusercontent.com/3kh0/3kh0-assets/main/games.json",
			map: (g) => ({ title: g.name, iframe_url: g.url, t: "3KH0", img: g.img }),
		},
	];

	for (const src of sources) {
		try {
			const ac = new AbortController();
			const t = setTimeout(() => ac.abort(), 5000);
			const res = await fetch(src.url, { signal: ac.signal });
			clearTimeout(t);
			if (!res.ok) continue;
			const data = await res.json();
			let added = 0;
			data
				.slice(0, 120)
				.map(src.map)
				.forEach((g) => {
					if (
						g.title &&
						g.iframe_url &&
						!masterGames.some((m) => (m.title || m.n) === g.title)
					) {
						masterGames.push(g);
						added++;
					}
				});
			if (added > 0) {
				buildCategoryBar();
				applyFilters();
			}
		} catch {}
	}
}

/* ═══════════════════
   SEARCH INIT
   ═══════════════════ */
function initSearch() {
	const input = $("searchInput");
	if (!input) return;

	let timer = null;
	input.addEventListener("input", (e) => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			const v = e.target.value.toLowerCase().trim();
			searchQuery = v;
			// If it looks like a URL, don't filter games
			if (v.includes(".") && !v.includes(" ")) return;
			applyFilters();
			if (!$("view-grid")?.classList.contains("active")) switchView("grid");
		}, DEBOUNCE_MS);
	});

	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			const v = input.value.trim();
			if (!v) return;
			if (v.includes(".") && !v.includes(" ")) {
				let url = v;
				if (!/^https?:\/\//i.test(url)) url = "https://" + url;
				// Switch to browser and load
				switchView("browser");
				const urlInput = $("browserUrl");
				if (urlInput) {
					urlInput.value = url;
				}
				const br = $("browser-iframe");
				if (br) br.src = proxifyUrl(url);
			}
		}
		if (e.key === "Escape") {
			input.value = "";
			searchQuery = "";
			applyFilters();
			input.blur();
		}
	});
}

/* ═══════════════════
   BROWSER
   ═══════════════════ */
function initBrowser() {
	const go = $("browserGo");
	const input = $("browserUrl");
	const ifr = $("browser-iframe");
	const newTab = $("btNewTab");
	if (!go || !input || !ifr) return;

	const surf = () => {
		let url = input.value.trim();
		if (!url) return;
		if (!/^https?:\/\//i.test(url)) url = "https://" + url;
		ifr.src = proxifyUrl(url);
	};

	go.addEventListener("click", surf);
	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter") surf();
	});

	if (newTab) {
		newTab.addEventListener("click", () => {
			let url = input.value.trim();
			if (!url) return;
			if (!/^https?:\/\//i.test(url)) url = "https://" + url;
			const w = window.open("about:blank", "_blank");
			if (w) {
				const doc = w.document;
				doc.body.style.cssText =
					"margin:0;padding:0;overflow:hidden;background:#000;";
				const f = doc.createElement("iframe");
				f.style.cssText = "width:100%;height:100vh;border:none;";
				f.src = proxifyUrl(url);
				f.setAttribute("allowfullscreen", "");
				f.setAttribute("allow", "autoplay; fullscreen");
				doc.body.appendChild(f);
			}
		});
	}
}

/* ═══════════════════
   MEDIA CARDS
   ═══════════════════ */
function initMediaCards() {
	document
		.querySelectorAll("[data-action='watch'], [data-action='listen']")
		.forEach((el) => {
			el.addEventListener("click", () => {
				openOverlay(
					el.dataset.url,
					el.dataset.name || el.querySelector(".mc-title")?.textContent
				);
			});
		});
}

/* ═══════════════════
   AI DECOY
   ═══════════════════ */
function initAI() {
	const input = $("aiChatInput");
	const btn = $("aiSendBtn");
	const win = $("aiChatWindow");
	if (!input || !btn || !win) return;

	const RESPONSES = {
		math: [
			"Let's evaluate the derivative across the x-axis.",
			"Consider the quadratic formula: x = (−b ± √(b²−4ac)) / 2a.",
			"We can factor this to find the roots.",
			"The slope of this function is determined by its first derivative.",
		],
		history: [
			"This event shaped the geopolitical landscape of the era.",
			"Scholars argue economic factors were the primary cause.",
			"The resulting treaty established new diplomatic precedents.",
			"Primary sources from this period suggest a different narrative.",
		],
		science: [
			"Note how the molecular bonds react under thermal pressure.",
			"This demonstrates the first law of thermodynamics.",
			"The cell undergoes mitosis through four distinct phases.",
			"Quantum superposition allows the particle to exist in both states.",
		],
		default: [
			"That's a great question! Let me break it down step by step.",
			"Based on your question, here is the key concept to understand.",
			"The answer depends on a few variables — let's examine each one.",
		],
	};

	function addMsg(text, cls) {
		const d = document.createElement("div");
		d.className = `ai-message ${cls}`;
		d.textContent = text;
		win.appendChild(d);
		win.scrollTop = win.scrollHeight;
		return d;
	}

	function send() {
		const txt = input.value.trim();
		if (!txt) return;
		input.value = "";
		addMsg(txt, "user");
		const typing = addMsg("Assistant is typing...", "typing");

		setTimeout(
			() => {
				typing.remove();
				const lower = txt.toLowerCase();
				let cat = "default";
				if (/math|calc|algebra|equat|formula|geom|integral|deriv/.test(lower))
					cat = "math";
				else if (/histor|war|treaty|civil|century|politics/.test(lower))
					cat = "history";
				else if (
					/scienc|chem|bio|physic|cell|molecule|energy|force/.test(lower)
				)
					cat = "science";

				const pool = RESPONSES[cat];
				const resp = pool[Math.floor(Math.random() * pool.length)];
				const extra =
					RESPONSES.default[
						Math.floor(Math.random() * RESPONSES.default.length)
					];
				addMsg(`${resp} ${extra}`, "bot");
			},
			700 + Math.random() * 1200
		);
	}

	btn.addEventListener("click", send);
	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter") send();
	});
}

/* ═══════════════════
   SETTINGS
   ═══════════════════ */
function initSettings() {
	const panicInput = $("panicUrlInput");
	const proxySel = $("proxyEngineSettings");
	const saveBtn = $("saveSettingsBtn");
	const clearBtn = $("clearCacheBtn");

	// Load saved values
	if (panicInput)
		panicInput.value =
			localStorage.getItem("strato_panic") || "https://classroom.google.com";
	if (proxySel) proxySel.value = localStorage.getItem("strato_proxy") || "uv";

	// Proxy engine selector in browser view
	const proxyEngBrowser = $("proxyEngine");
	if (proxyEngBrowser) {
		proxyEngBrowser.value = localStorage.getItem("strato_proxy") || "uv";
		proxyEngBrowser.addEventListener("change", (e) =>
			localStorage.setItem("strato_proxy", e.target.value)
		);
	}

	// Cloak toggles
	const cloakOn = $("cloak-on");
	const cloakOff = $("cloak-off");
	const savedCloak = localStorage.getItem("strato_cloak") === "true";
	if (cloakOn && cloakOff) {
		cloakOn.classList.toggle("active", savedCloak);
		cloakOff.classList.toggle("active", !savedCloak);
		cloakOn.addEventListener("click", () => {
			localStorage.setItem("strato_cloak", "true");
			cloakOn.classList.add("active");
			cloakOff.classList.remove("active");
		});
		cloakOff.addEventListener("click", () => {
			localStorage.setItem("strato_cloak", "false");
			cloakOff.classList.add("active");
			cloakOn.classList.remove("active");
		});
	}

	// Math decoy toggles
	const mathOn = $("math-on");
	const mathOff = $("math-off");
	const savedMath = localStorage.getItem("strato_math_decoy") === "true";
	if (mathOn && mathOff) {
		mathOn.classList.toggle("active", savedMath);
		mathOff.classList.toggle("active", !savedMath);
		mathOn.addEventListener("click", () => {
			localStorage.setItem("strato_math_decoy", "true");
			mathOn.classList.add("active");
			mathOff.classList.remove("active");
			buildCategoryBar();
			applyFilters();
		});
		mathOff.addEventListener("click", () => {
			localStorage.setItem("strato_math_decoy", "false");
			mathOff.classList.add("active");
			mathOn.classList.remove("active");
			buildCategoryBar();
			applyFilters();
		});
	}

	// Save
	if (saveBtn) {
		saveBtn.addEventListener("click", () => {
			if (panicInput) localStorage.setItem("strato_panic", panicInput.value);
			if (proxySel) localStorage.setItem("strato_proxy", proxySel.value);
			saveBtn.textContent = "✓ Saved!";
			setTimeout(() => (saveBtn.textContent = "Apply & Save"), 1800);
		});
	}

	if (clearBtn) {
		clearBtn.addEventListener("click", () => {
			if (confirm("Clear all settings and cached data?")) {
				localStorage.clear();
				location.reload();
			}
		});
	}
}

/* ═══════════════════
   CLOAK ENGINE
   ═══════════════════ */
function initCloak() {
	const PRESETS = {
		default: {
			title: "STRATO",
			fav: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>◆</text></svg>",
		},
		drive: {
			title: "My Drive — Google Drive",
			fav: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png",
		},
		classroom: {
			title: "Stream — Google Classroom",
			fav: "https://ssl.gstatic.com/classroom/favicon.png",
		},
	};

	const privacySel = $("privacyPreset");
	if (privacySel) {
		privacySel.addEventListener("change", () => {
			const p = PRESETS[privacySel.value] || PRESETS.default;
			document.title = p.title;
			const fav = $("favicon");
			if (fav) fav.href = p.fav;
		});
	}

	// Tab visibility cloaking
	document.addEventListener("visibilitychange", () => {
		if (localStorage.getItem("strato_cloak") !== "true") return;
		const fav = $("favicon");
		if (document.hidden) {
			document.title = "Google Drive";
			if (fav)
				fav.href =
					"https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png";
		} else {
			document.title = "STRATO";
			if (fav)
				fav.href =
					"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>◆</text></svg>";
		}
	});

	// Keyboard shortcuts
	document.addEventListener("keydown", (e) => {
		// Backtick / tilde = panic
		if (e.key === "`" || e.key === "~") {
			e.preventDefault();
			panic();
		}
		// Escape = close overlay or panic
		if (e.key === "Escape") {
			const ov = $("game-overlay");
			if (ov && !ov.hasAttribute("hidden")) closeOverlay();
			else panic();
		}
	});
}

function panic() {
	location.replace(
		localStorage.getItem("strato_panic") || "https://classroom.google.com"
	);
}

/* ═══════════════════
   IGNITION SEQUENCE
   ═══════════════════ */
function igniteStratosphere(targetView = "grid") {
	const splash = $("splash");
	const ignite = $("ignite-overlay");
	const bar = $("ignite-bar");
	const status = $("ignite-status");
	const app = $("app");

	splash.classList.add("out");

	setTimeout(() => {
		splash.style.display = "none";
		ignite.classList.remove("ignite-hidden");

		const messages = [
			"CONNECTING TO WISP RELAY...",
			"MOUNTING PROXY LAYERS...",
			"LOADING GAME ARRAY...",
			"STRATOSPHERE READY",
		];
		let progress = 0;
		let msgIdx = 0;

		const tick = setInterval(() => {
			progress += progress < 75 ? Math.random() * 14 : Math.random() * 3;
			if (progress >= 100) {
				progress = 100;
				clearInterval(tick);
				finalize();
			}
			bar.style.width = progress + "%";
			const newIdx = Math.floor((progress / 100) * messages.length);
			if (newIdx !== msgIdx && newIdx < messages.length) {
				msgIdx = newIdx;
				if (status) status.textContent = messages[msgIdx];
			}
		}, 90);

		const watchdog = setTimeout(finalize, 5500);

		function finalize() {
			clearInterval(tick);
			clearTimeout(watchdog);
			bar.style.width = "100%";
			setTimeout(() => {
				ignite.classList.add("ignite-hidden");
				app.classList.add("on");
				switchView(targetView);
			}, 350);
		}
	}, 420);
}

/* ═══════════════════
   NAVIGATION WIRING
   ═══════════════════ */
function initNav() {
	// Sidenav buttons
	document.querySelectorAll(".sn-item[data-view]").forEach((btn) => {
		btn.addEventListener("click", () => switchView(btn.dataset.view));
	});

	// Quick-access cards on home (btn-primary / btn-ghost with data-view)
	document.querySelectorAll("[data-view]:not(.sn-item)").forEach((el) => {
		if (el.tagName === "BUTTON" || el.tagName === "A") {
			el.addEventListener("click", () => switchView(el.dataset.view));
		}
	});

	// Panic
	const panicBtn = $("panicBtn");
	if (panicBtn) panicBtn.addEventListener("click", panic);

	// Overlay controls
	$("overlay-back-btn")?.addEventListener("click", closeOverlay);
	$("overlay-close-btn")?.addEventListener("click", closeOverlay);
	$("overlay-fs-btn")?.addEventListener("click", () => {
		const ifr = $("game-iframe");
		(ifr?.requestFullscreen || ifr?.webkitRequestFullscreen || (() => {})).call(
			ifr
		);
	});

	// Launchpad tiles on splash
	document.querySelectorAll(".lp-tile[data-launch]").forEach((t) => {
		t.addEventListener("click", () => igniteStratosphere(t.dataset.launch));
	});
}

/* ═══════════════════
   INFINITE SCROLL
   ═══════════════════ */
function initInfiniteScroll() {
	const scrollEl = $("content");
	if (!scrollEl) return;
	let ticking = false;
	scrollEl.addEventListener(
		"scroll",
		() => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				if (
					scrollEl.scrollTop + scrollEl.clientHeight >=
					scrollEl.scrollHeight - 500
				) {
					if (currentLimit < filteredGames.length) {
						currentLimit += RENDER_LIMIT;
						appendGrid(filteredGames, currentLimit);
					}
				}
				ticking = false;
			});
		},
		{ passive: true }
	);
}

/* ═══════════════════
   BOOT
   ═══════════════════ */
async function boot() {
	// Init proxy (non-blocking for UI)
	initProxy().catch(() => {});

	// Load game library
	try {
		const res = await fetch("/assets/games.json");
		if (!res.ok) throw new Error("DB load failed");
		const raw = await res.json();

		const spamFilter =
			/badge|listed|hunt|stash|vault|directory|powered|dang\.ai|launchlist/i;
		masterGames = raw.filter((g) => {
			const n = g.title || g.n || "";
			const u = g.iframe_url || g.u || "";
			return n && u && !spamFilter.test(n);
		});

		const statEl = $("statGameCount");
		if (statEl) statEl.textContent = masterGames.length + "+";

		const inp = $("searchInput");
		if (inp)
			inp.placeholder = `Search ${masterGames.length.toLocaleString()} games...`;

		buildCategoryBar();
		applyFilters();

		// Pull extra libraries after settling
		setTimeout(fetchExternalGames, 2000);
	} catch (err) {
		console.error("[STRATO] Game DB load failed:", err);
	}

	initBrowser();
	initInfiniteScroll();
}

/* ═══════════════════
   DOMContentLoaded
   ═══════════════════ */
document.addEventListener("DOMContentLoaded", () => {
	initTheme();
	initParticles();
	initNav();
	initSearch();
	initMediaCards();
	initSettings();
	initCloak();
	initAI();
	runVitals();
	boot();
});
