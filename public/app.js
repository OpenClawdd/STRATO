/**
 * STRATO App Controller v6.0
 * Transport init is now handled by transport-init.js
 * This file handles: UI, game overlay, views, browser, settings, panic, FPS
 */
(function () {
	"use strict";

	// ── State ─────────────────────────────────────────────
	let currentView = "home";
	let fpsFrames = 0;
	let fpsLast = performance.now();
	let isPanicked = false;

	const $ = (sel) => document.querySelector(sel);
	const $$ = (sel) => document.querySelectorAll(sel);

	// ── Panic System ──────────────────────────────────────
	const PANIC_KEY = "`";
	const DECOY_HTML = `
    <div style="font-family: 'Roboto', Arial, sans-serif; background: #fff; color: #3c4043; height: 100vh; width: 100vw; display: flex; flex-direction: column; overflow: hidden;">
      <header style="height: 64px; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; padding: 0 16px; justify-content: space-between; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button style="padding: 12px; border-radius: 50%;">
            <svg width="24" height="24" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </button>
          <img src="https://www.gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24dp.svg" height="24" />
          <span style="font-size: 22px; color: #5f6368; padding-left: 4px;">Classroom</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #1a73e8; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 500; font-size: 14px;">S</div>
        </div>
      </header>
      <nav style="height: 48px; border-bottom: 1px solid #e0e0e0; display: flex; padding: 0 64px; gap: 32px;">
        <div style="height: 100%; display: flex; align-items: center; color: #1a73e8; border-bottom: 3px solid #1a73e8; font-weight: 500; font-size: 14px;">To-do</div>
        <div style="height: 100%; display: flex; align-items: center; color: #5f6368; font-weight: 500; font-size: 14px;">Calendar</div>
      </nav>
      <main style="flex: 1; padding: 24px; background: #f8f9fa; overflow-y: auto;">
      </main>
    </div>
  `;

	function panic() {
		if (isPanicked) return;
		isPanicked = true;
		document.body.innerHTML = DECOY_HTML;
		document.title = "Google Classroom";
		window.location.hash = "#panicked";
		document.body.style.backgroundImage = "none";
		document.body.style.background = "#f8f9fa";
	}

	// ── about:blank Cloaking ─────────────────────────────
	function cloak() {
		try {
			const url = window.location.href;
			const win = window.open("about:blank", "_blank");
			if (!win) {
				alert("Popup blocked! Please allow popups for STRATO to enable Stealth Mode.");
				return;
			}
			const doc = win.document;
			const iframe = doc.createElement("iframe");

			doc.title = "Google Drive";
			iframe.src = url;
			iframe.style.width = "100vw";
			iframe.style.height = "100vh";
			iframe.style.border = "none";
			iframe.style.position = "fixed";
			iframe.style.top = "0";
			iframe.style.left = "0";

			doc.body.style.margin = "0";
			doc.body.style.padding = "0";
			doc.body.style.overflow = "hidden";
			doc.body.appendChild(iframe);

			window.close();
			initApp();
		} catch (e) {
			console.warn("Cloaking failed:", e);
			initApp();
		}
	}

	// ── Core App Logic ────────────────────────────────────
	function initApp() {
		$("#app").classList.add("visible");
		$("#splash").style.opacity = "0";
		setTimeout(() => ($("#splash").style.display = "none"), 500);

		initSearch();
		initBrowser();
		initSettings();
		initFPS();
		initGameOverlay();

		if (window.StratoGameEngine) {
			StratoGameEngine.init();
			renderRecentlyPlayed();
			document.addEventListener("strato:recent_updated", renderRecentlyPlayed);
		}
	}

	function initSearch() {
		const search = $("#global-search");
		if (search) {
			search.oninput = (e) => {
				const query = e.target.value.trim();
				if (query.length > 0 && currentView !== "arcade") switchView("arcade");
				document.dispatchEvent(new CustomEvent("strato:search", { detail: query }));
			};

			search.onkeydown = (e) => {
				if (e.key !== "Enter") return;
				e.preventDefault();
				const v = search.value.trim();
				if (!v) return;
				let url = v;
				if (url.includes(".") && !url.includes(" ")) {
					if (!/^https?:\/\//i.test(url)) url = "https://" + url;
					window.location.href = window.proxifyUrl(url);
				} else {
					window.location.href = window.proxifyUrl(
						"https://www.google.com/search?q=" + encodeURIComponent(url)
					);
				}
			};
		}
	}

	function switchView(viewName) {
		currentView = viewName;
		$$(".view").forEach((v) => v.classList.remove("active"));
		$(`#view-${viewName}`)?.classList.add("active");
		$$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === viewName));
		if ($("#main")) $("#main").scrollTop = 0;
	}

	function renderRecentlyPlayed() {
		const recent = StratoGameEngine.getRecent();
		const section = $("#section-recent");
		const grid = $("#recent-grid");
		if (!section || !grid) return;
		if (recent.length === 0) {
			section.style.display = "none";
			return;
		}

		section.style.display = "block";
		grid.innerHTML = "";
		recent.forEach((game) => {
			const tile = document.createElement("div");
			tile.className = "game-tile";
			tile.innerHTML = `<img src="${game.img || ""}" loading="lazy" /><div class="tile-overlay"><div class="tile-title">${game.name}</div></div>`;
			tile.onclick = () => StratoGameEngine.open(game);
			grid.appendChild(tile);
		});
	}

	function initBrowser() {
		const input = $("#browser-input");
		const go = $("#browser-go");
		const iframe = $("#browser-iframe");
		const engineSelect = $("#proxy-select");

		if (!input || !iframe) return;

		// Sync proxy engine selection with localStorage
		if (engineSelect) {
			const saved = localStorage.getItem("strato-proxy") || "uv";
			engineSelect.value = saved;
			engineSelect.onchange = () => {
				localStorage.setItem("strato-proxy", engineSelect.value);
			};
		}

		function navigate() {
			let url = input.value.trim();
			if (!url) return;
			if (!url.startsWith("http"))
				url = url.includes(".")
					? "https://" + url
					: "https://www.google.com/search?q=" + encodeURIComponent(url);
			iframe.src = window.proxifyUrl(url);
		}

		go.onclick = navigate;
		input.onkeydown = (e) => {
			if (e.key === "Enter") navigate();
		};
	}

	function initSettings() {
		const lowPerf = $("#setting-low-perf");
		if (lowPerf) {
			const active = localStorage.getItem("strato-low-perf") === "true";
			lowPerf.classList.toggle("on", active);
			if (active) document.body.classList.add("low-perf-mode");
			lowPerf.onclick = () => {
				const isOn = lowPerf.classList.toggle("on");
				localStorage.setItem("strato-low-perf", isOn);
				document.body.classList.toggle("low-perf-mode", isOn);
			};
		}

		const cloak = $("#setting-cloak");
		if (cloak) {
			cloak.onchange = () => {
				const v = cloak.value;
				if (v === "drive") {
					document.title = "My Drive — Google Drive";
				} else if (v === "classroom") {
					document.title = "Stream — Google Classroom";
				} else {
					document.title = "STRATO — Gaming Reimagined";
				}
			};
		}
	}

	function initGameOverlay() {
		const closeBtn = $("#theater-close");
		const refreshBtn = $("#theater-refresh");
		const fsBtn = $("#theater-fullscreen");

		if (closeBtn) {
			closeBtn.onclick = () => {
				$("#game-overlay").classList.remove("active");
				const ifr = $("#theater-iframe");
				if (ifr) ifr.src = "about:blank";
			};
		}

		if (refreshBtn) {
			refreshBtn.onclick = () => {
				const ifr = $("#theater-iframe");
				if (ifr) ifr.src = ifr.src; // trigger reload
			};
		}

		if (fsBtn) {
			fsBtn.onclick = () => {
				const ifr = $("#theater-iframe");
				if (ifr) {
					(ifr.requestFullscreen || ifr.webkitRequestFullscreen || function () {}).call(ifr);
				}
			};
		}
	}

	function initFPS() {
		const el = $("#fps-counter");
		function tick(now) {
			fpsFrames++;
			if (now - fpsLast >= 1000) {
				if (el) el.textContent = Math.round((fpsFrames * 1000) / (now - fpsLast)) + " FPS";
				fpsFrames = 0;
				fpsLast = now;
			}
			requestAnimationFrame(tick);
		}
		requestAnimationFrame(tick);
	}

	// ── Boot sequence ─────────────────────────────────────
	async function boot() {
		const progress = $("#splash-progress");
		const launchBtn = $("#launch-btn");

		// Wait for transport to be ready (or at least attempted)
		if (window.__stratoTransport) {
			await window.__stratoTransport.init();
		}

		// Loading animation
		let p = 0;
		const interval = setInterval(() => {
			p += Math.random() * 15;
			if (p >= 100) {
				p = 100;
				clearInterval(interval);
				if (progress) progress.style.width = "100%";
				if (launchBtn) launchBtn.style.display = "block";
			} else {
				if (progress) progress.style.width = p + "%";
			}
		}, 40);

		// Launch button
		if (launchBtn) {
			launchBtn.onclick = () => {
				if (window.location.protocol === "about:" || window.top !== window.self) {
					initApp();
				} else {
					cloak();
				}
			};
		}

		// Panic key
		document.addEventListener("keydown", (e) => {
			if (e.key === PANIC_KEY) {
				e.preventDefault();
				panic();
			}
		});

		// Nav wiring
		$$(".nav-item").forEach((item) => (item.onclick = () => switchView(item.dataset.view)));
		$$(".quick-tile").forEach((tile) => (tile.onclick = () => switchView(tile.dataset.view)));
	}

	boot();
})();
