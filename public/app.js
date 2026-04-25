/**
 * STRATO App Controller v7.0 — Phase 2 Reskin
 * Handles: splash screen (particles + status), UI views, mobile nav,
 * game overlay, browser, settings, panic, FPS, context menu.
 * Transport init is handled by transport-init.js
 */
(function () {
  "use strict";

  // ── State ─────────────────────────────────────────────
  let currentView = "home";
  let fpsFrames = 0;
  let fpsLast = performance.now();
  let isPanicked = false;
  let splashParticlesRAF = null;
  let contextTarget = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Category color map ─────────────────────────────────
  const CAT_COLORS = {
    shooter: "#ef4444", fps: "#ef4444",
    puzzle: "#a855f7",
    action: "#f97316",
    racing: "#06b6d4",
    strategy: "#eab308",
    sport: "#22c55e", sports: "#22c55e",
    platformer: "#ec4899",
    adventure: "#8b5cf6",
    "3kh0": "#3b82f6",
    selenite: "#14b8a6",
  };
  function getCatColor(cat) {
    if (!cat) return "#64748b";
    return CAT_COLORS[cat.toLowerCase()] || "#64748b";
  }

  // ══════════════════════════════════════════════════════
  //  SPLASH SCREEN — Particles + status + progress
  // ══════════════════════════════════════════════════════
  function initSplashParticles() {
    const canvas = $("#splash-particles");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, particles = [];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        a: Math.random() * 0.4 + 0.1,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168,85,247,${p.a})`;
        ctx.fill();
      }
      splashParticlesRAF = requestAnimationFrame(draw);
    }
    draw();
  }

  function setSplashStatus(text) {
    const el = $("#splash-status");
    if (el) { el.style.opacity = "0"; setTimeout(() => { el.textContent = text; el.style.opacity = "1"; }, 200); }
  }

  function hideSplash() {
    const splash = $("#splash");
    if (!splash || splash.classList.contains("hidden")) return;
    splash.classList.add("hidden");
    if (splashParticlesRAF) { cancelAnimationFrame(splashParticlesRAF); splashParticlesRAF = null; }
    setTimeout(() => { splash.style.display = "none"; }, 500);
  }

  // ── Panic System ──────────────────────────────────────
  const PANIC_KEY = "`";
  const DECOY_HTML = `<div style="font-family:'Roboto',Arial,sans-serif;background:#fff;color:#3c4043;height:100vh;width:100vw;display:flex;flex-direction:column;overflow:hidden"><header style="height:64px;border-bottom:1px solid #e0e0e0;display:flex;align-items:center;padding:0 16px;justify-content:space-between;flex-shrink:0"><div style="display:flex;align-items:center;gap:12px"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg><span style="font-size:22px;color:#5f6368;padding-left:4px">Classroom</span></div><div style="width:32px;height:32px;border-radius:50%;background:#1a73e8;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:500;font-size:14px">S</div></header><nav style="height:48px;border-bottom:1px solid #e0e0e0;display:flex;padding:0 64px;gap:32px"><div style="height:100%;display:flex;align-items:center;color:#1a73e8;border-bottom:3px solid #1a73e8;font-weight:500;font-size:14px">To-do</div><div style="height:100%;display:flex;align-items:center;color:#5f6368;font-weight:500;font-size:14px">Calendar</div></nav><main style="flex:1;padding:24px;background:#f8f9fa;overflow-y:auto"></main></div>`;

  function panic() {
    if (isPanicked) return;
    isPanicked = true;
    document.body.innerHTML = DECOY_HTML;
    document.title = "Google Classroom";
    window.location.hash = "#panicked";
    document.body.style.cssText = "background:#f8f9fa;background-image:none";
  }

  // ── about:blank Cloaking ─────────────────────────────
  function cloak() {
    try {
      const url = window.location.href;
      const win = window.open("about:blank", "_blank");
      if (!win) { alert("Popup blocked! Allow popups for STRATO."); return; }
      const doc = win.document;
      const iframe = doc.createElement("iframe");
      doc.title = "Google Drive";
      Object.assign(iframe.style, { width: "100vw", height: "100vh", border: "none", position: "fixed", top: "0", left: "0" });
      iframe.src = url;
      Object.assign(doc.body.style, { margin: "0", padding: "0", overflow: "hidden" });
      doc.body.appendChild(iframe);
      window.close();
      initApp();
    } catch (e) { console.warn("Cloaking failed:", e); initApp(); }
  }

  // ══════════════════════════════════════════════════════
  //  CORE APP LOGIC
  // ══════════════════════════════════════════════════════
  function initApp() {
    $("#app").classList.add("visible");
    hideSplash();
    initSearch();
    initBrowser();
    initSettings();
    initFPS();
    initGameOverlay();
    initContextMenu();
    insertSkeletons();

    if (window.StratoGameEngine) {
      StratoGameEngine.init();
      renderRecentlyPlayed();
      document.addEventListener("strato:recent_updated", renderRecentlyPlayed);
    }
  }

  // ── Skeleton loaders ──────────────────────────────────
  function insertSkeletons() {
    const grid = $("#game-grid");
    if (!grid || grid.children.length > 0) return;
    for (let i = 0; i < 12; i++) {
      const sk = document.createElement("div");
      sk.className = "skeleton-tile";
      sk.style.animationDelay = `${i * 0.05}s`;
      grid.appendChild(sk);
    }
  }

  // ── View switching (syncs sidebar + mobile nav) ───────
  function switchView(viewName) {
    currentView = viewName;
    $$(".view").forEach((v) => v.classList.remove("active"));
    $(`#view-${viewName}`)?.classList.add("active");
    $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === viewName));
    $$(".mobile-tab").forEach((t) => t.classList.toggle("active", t.dataset.view === viewName));
    if ($("#main")) $("#main").scrollTop = 0;
  }

  function initSearch() {
    const search = $("#global-search");
    if (!search) return;
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
        window.location.href = window.proxifyUrl("https://www.google.com/search?q=" + encodeURIComponent(url));
      }
    };
  }

  function renderRecentlyPlayed() {
    const recent = StratoGameEngine.getRecent();
    const section = $("#section-recent");
    const grid = $("#recent-grid");
    if (!section || !grid) return;
    if (recent.length === 0) { section.style.display = "none"; return; }
    section.style.display = "block";
    grid.innerHTML = "";
    recent.forEach((game) => {
      const tile = document.createElement("div");
      tile.className = "game-tile";
      const color = getCatColor(game.category);
      tile.style.setProperty("--tile-accent", color);
      tile.setAttribute("data-cat-color", "");
      tile.style.width = "140px";
      tile.style.flexShrink = "0";
      tile.innerHTML = `<img src="${game.img || ""}" loading="lazy" alt="${game.name}" /><div class="tile-info">${game.name}</div>`;
      const img = tile.querySelector("img");
      if (img) img.onerror = () => { img.remove(); const ph = document.createElement("div"); ph.className = "game-tile-placeholder"; ph.textContent = (game.name || "?")[0].toUpperCase(); tile.prepend(ph); };
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

    if (engineSelect) {
      const saved = localStorage.getItem("strato-proxy") || "uv";
      engineSelect.value = saved;
      engineSelect.onchange = () => {
        const engine = engineSelect.value;
        localStorage.setItem("strato-proxy", engine);
        if (window.__stratoTransport?.connection) {
          const wispUrl = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/wisp/";
          window.__stratoTransport.connection.setTransport("/epoxy-transport.mjs", [{ wisp: wispUrl }])
            .then(() => console.log("[STRATO] Transport switched for engine:", engine))
            .catch((err) => console.warn("[STRATO] Transport switch failed:", err));
        }
      };
    }

    function navigate() {
      let url = input.value.trim();
      if (!url) return;
      if (!url.startsWith("http")) url = url.includes(".") ? "https://" + url : "https://www.google.com/search?q=" + encodeURIComponent(url);
      iframe.src = window.proxifyUrl(url);
    }
    if (go) go.onclick = navigate;
    input.onkeydown = (e) => { if (e.key === "Enter") navigate(); };
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
    const cloakSel = $("#setting-cloak");
    if (cloakSel) {
      cloakSel.onchange = () => {
        const v = cloakSel.value;
        document.title = v === "drive" ? "My Drive — Google Drive" : v === "classroom" ? "Stream — Google Classroom" : "STRATO — Gaming Reimagined";
      };
    }
  }

  function initGameOverlay() {
    const closeBtn = $("#theater-close");
    const refreshBtn = $("#theater-refresh");
    const fsBtn = $("#theater-fullscreen");

    if (closeBtn) closeBtn.onclick = () => {
      if (window.StratoGameEngine) StratoGameEngine.close();
      else { $("#game-overlay").classList.remove("active", "loading"); const ifr = $("#theater-iframe"); if (ifr) ifr.src = "about:blank"; }
    };
    if (refreshBtn) refreshBtn.onclick = () => {
      if (window.StratoGameEngine) StratoGameEngine.refresh();
      else { const ifr = $("#theater-iframe"); if (ifr) ifr.src = ifr.src; }
    };
    if (fsBtn) fsBtn.onclick = () => {
      if (window.StratoGameEngine) StratoGameEngine.tryFullscreen();
      else { const ifr = $("#theater-iframe"); if (ifr) (ifr.requestFullscreen || ifr.webkitRequestFullscreen || function(){}).call(ifr); }
    };
  }

  // ── Context menu ──────────────────────────────────────
  function initContextMenu() {
    const menu = $("#tile-context-menu");
    if (!menu) return;

    // Close on click outside
    document.addEventListener("click", () => { menu.style.display = "none"; contextTarget = null; });
    document.addEventListener("scroll", () => { menu.style.display = "none"; }, true);

    // Handle context menu actions
    menu.querySelectorAll(".context-item").forEach((item) => {
      item.onclick = (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        if (contextTarget) {
          console.log(`[STRATO] Context action: ${action} on`, contextTarget);
          // Future: implement favorites, share, report
        }
        menu.style.display = "none";
        contextTarget = null;
      };
    });
  }

  // Called by game-engine when tiles are created
  window.__stratoShowContextMenu = function (e, game) {
    e.preventDefault();
    e.stopPropagation();
    const menu = $("#tile-context-menu");
    if (!menu) return;
    contextTarget = game;
    menu.style.display = "block";
    const x = Math.min(e.clientX || e.pageX, window.innerWidth - 200);
    const y = Math.min(e.clientY || e.pageY, window.innerHeight - 150);
    menu.style.left = x + "px";
    menu.style.top = y + "px";
  };

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

  // ══════════════════════════════════════════════════════
  //  BOOT SEQUENCE
  // ══════════════════════════════════════════════════════
  async function boot() {
    const progress = $("#splash-progress");
    const launchBtn = $("#launch-btn");

    // Start splash particles
    initSplashParticles();

    // Splash status updates
    setSplashStatus("Initializing...");

    let p = 0;
    const bumpProgress = (target) => {
      const step = () => {
        if (p < target) { p += Math.random() * 3; if (p > target) p = target; if (progress) progress.style.width = p + "%"; requestAnimationFrame(step); }
      };
      step();
    };

    bumpProgress(20);

    // Wait for transport
    if (window.__stratoTransport) {
      setSplashStatus("Connecting to Wisp...");
      bumpProgress(50);
      try {
        await window.__stratoTransport.init();
        setSplashStatus("Transport ready");
        bumpProgress(80);
      } catch (e) {
        setSplashStatus("Transport error — continuing...");
      }
    }

    // Check for proxy
    bumpProgress(90);
    if (window.__stratoTransport?.ready) {
      setSplashStatus("Proxy connected");
    } else {
      setSplashStatus("Proxy unavailable — limited mode");
    }

    // Complete progress
    bumpProgress(100);
    await new Promise((r) => setTimeout(r, 400));

    // Show launch button
    if (launchBtn) {
      launchBtn.style.display = "flex";
      setSplashStatus("Ready");
    }

    // Launch handler
    if (launchBtn) {
      launchBtn.onclick = () => {
        if (window.location.protocol === "about:" || window.top !== window.self) initApp();
        else cloak();
      };
    }

    // Auto-launch fallback after 8s
    setTimeout(() => {
      if (!$("#app")?.classList.contains("visible")) {
        if (window.location.protocol === "about:" || window.top !== window.self) initApp();
        else cloak();
      }
    }, 8000);

    // Panic key
    document.addEventListener("keydown", (e) => { if (e.key === PANIC_KEY) { e.preventDefault(); panic(); } });

    // Wire nav — sidebar + mobile + quick tiles
    $$(".nav-item").forEach((item) => (item.onclick = () => switchView(item.dataset.view)));
    $$(".quick-tile").forEach((tile) => (tile.onclick = () => switchView(tile.dataset.view)));
    $$(".mobile-tab").forEach((tab) => (tab.onclick = () => switchView(tab.dataset.view)));

    // Panic button
    const panicBtn = $("#panic-btn");
    if (panicBtn) panicBtn.onclick = panic;
  }

  boot();
})();
