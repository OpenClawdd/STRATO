/* ══════════════════════════════════════════════════════════
   STRATO v5.01 — legacy companion runtime
   The Ultimate Edition — Client Application
   ══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── Safety: Ensure StratoProfile exists even if profile.js fails to load ──
  // This prevents "addXp is not a function" crashes that block the entire app
  if (!window.StratoProfile) {
    window.StratoProfile = {
      getLevel: () => ({ level: 1, currentXp: 0, requiredXp: 100, totalXp: 0 }),
      getXp: () => parseInt(localStorage.getItem("strato-xp") || "0"),
      addXP: (amount) => {
        const c = parseInt(localStorage.getItem("strato-xp") || "0");
        localStorage.setItem("strato-xp", String(c + amount));
      },
      addXp: (amount) => {
        const c = parseInt(localStorage.getItem("strato-xp") || "0");
        localStorage.setItem("strato-xp", String(c + amount));
      },
      addXPAction: () => {},
      addXPActionAlias: () => {},
      getProfile: () => ({
        username: localStorage.getItem("strato-username") || "Anonymous",
        xp: 0,
        level: 1,
      }),
      updateProfile: async () => false,
      loadProfile: async () => null,
      submitScore: async () => false,
      loadLeaderboard: async () => [],
      updateXpUI: () => {},
      XP_REWARDS: { game: 5, browse: 2, ai: 3, chat: 1, snap: 10 },
    };
  } else {
    // Ensure aliases exist even if profile.js loaded but missed one
    if (!window.StratoProfile.addXp && window.StratoProfile.addXP) {
      window.StratoProfile.addXp = window.StratoProfile.addXP;
    }
    if (!window.StratoProfile.addXP && window.StratoProfile.addXp) {
      window.StratoProfile.addXP = window.StratoProfile.addXp;
    }
  }

  // ──────────────────────────────────────────
  // PARTICLE SYSTEM
  // Now handled by particles.js (rainbow + mouse repulsion)
  // ──────────────────────────────────────────

  // ──────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────
  const startTime = Date.now();
  let cpOpen = false; // Command palette state - declared early for keydown handler
  // ── HTML escape utility — prevents XSS in all innerHTML rendering ──
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function escapeXml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function readStorageJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStorageJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  const state = {
    currentView: "home",
    currentEngine: localStorage.getItem("strato-engine") || "uv",
    autoFallback: localStorage.getItem("strato-autoFallback") !== "false",
    panicKey: localStorage.getItem("strato-panicKey") || "`",
    activeCloak: localStorage.getItem("strato-cloak") || "none",
    accentColor: localStorage.getItem("strato-accent") || "cyan",
    particlesEnabled: localStorage.getItem("strato-particles") !== "false",
    animationsEnabled: localStorage.getItem("strato-animations") !== "false",
    games: [],
    filteredGames: [],
    aiMessages: [],
    aiOnline: false,
    proxyReady: false,
    recentlyPlayed: readStorageJson("strato-recent", []),
    changingPanicKey: false,
    gamesPlayed: parseInt(localStorage.getItem("strato-gamesPlayed") || "0"),
    pagesLoaded: parseInt(localStorage.getItem("strato-pagesLoaded") || "0"),
    aiMessagesSent: parseInt(
      localStorage.getItem("strato-aiMessagesSent") || "0",
    ),
    achievements: readStorageJson("strato-achievements", []),
    notifications: [],
    activityLog: readStorageJson("strato-activity", []),
    coins: parseInt(localStorage.getItem("strato-coins") || "0"),
    hubSites: [],
    filteredHubSites: [],
    dailyChallenges: readStorageJson("strato-dailyChallenges", {}),
    favorites: readStorageJson("strato-favorites", []),
    playCounts: readStorageJson("strato-playCounts", {}),
    lastPlayed: readStorageJson("strato-lastPlayed", {}),
    preferences: readStorageJson("strato-preferences", {}),
    localFailures: readStorageJson("strato-recentFailures", {}),
  };

  // Apply saved accent color
  document.documentElement.setAttribute("data-accent", state.accentColor);

  const prefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;

  function applyPerformancePreferences() {
    const lowPower = !!state.preferences.lowPower || prefersReducedMotion;
    document.body.classList.toggle("low-power", lowPower);
    const toggle = document.getElementById("low-power-toggle");
    if (toggle)
      toggle.setAttribute("aria-pressed", String(!!state.preferences.lowPower));
  }

  applyPerformancePreferences();
  document.documentElement.dataset.openHome = "3";

  // ──────────────────────────────────────────
  // LIVE CLOCK
  // ──────────────────────────────────────────
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const el = document.getElementById("status-clock");
    if (el) el.textContent = `${h}:${m}:${s}`;
  }

  function updateUptime() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const text = `${mins}:${String(secs).padStart(2, "0")}`;
    const els = [
      document.getElementById("status-uptime"),
      document.getElementById("stat-uptime"),
    ];
    els.forEach((el) => {
      if (el) el.textContent = text;
    });
  }

  setInterval(updateClock, 1000);
  setInterval(updateUptime, 1000);
  updateClock();
  updateUptime();

  // ──────────────────────────────────────────
  // TAB CLOAKS
  // ──────────────────────────────────────────
  const CLOAKS = {
    none: { title: "STRATO", favicon: "/favicon.ico" },
    classroom: {
      title: "Classes",
      favicon: "https://www.google.com/favicon.ico",
    },
    quizlet: {
      title: "Your Sets | Quizlet",
      favicon: "https://www.quizlet.com/favicon.ico",
    },
    canvas: {
      title: "Dashboard",
      favicon: "https://www.canvaslms.com/favicon.ico",
    },
    clever: {
      title: "Clever | Portal",
      favicon: "https://www.clever.com/favicon.ico",
    },
    ixl: { title: "IXL | Math", favicon: "https://www.ixl.com/favicon.ico" },
    "school-agreca": {
      title: "Escuela Agreca — Inicio",
      favicon: "https://school.agreca.com.ar/favicon.ico",
    },
    "noahs-tutoring": {
      title:
        "Noah's Tutoring — Programming, Writing, Lecture, Learning & Literature",
      favicon: "https://www.google.com/favicon.ico",
    },
    "byod-portal": {
      title: "BYOD Portal — Geeked",
      favicon: "https://byod.geeked.wtf/favicon.ico",
    },
    "eclipse-castellon": {
      title: "Eclipse Castellon — Educacion",
      favicon: "https://dtxb.eclipsecastellon.net/favicon.ico",
    },
    "learning-policy": {
      title: "Learning Policy Institute — Research",
      favicon: "https://learningpolicy.lervs.ro/favicon.ico",
    },
    "petezah-games": {
      title: "Aletia Tours — Travel Deals",
      favicon: "https://pluh.aletiatours.com/favicon.ico",
    },
    "start-education": {
      title: "Start My Education — Home",
      favicon: "https://startmyeducation.top/favicon.ico",
    },
    cherrion: {
      title: "Cherrion — Help & Resources",
      favicon: "https://cherrion.top/favicon.ico",
    },
  };

  function applyCloak(key) {
    const cloak = CLOAKS[key];
    if (!cloak) return;
    state.activeCloak = key;
    localStorage.setItem("strato-cloak", key);
    document.title = cloak.title;
    const existingIcon = document.querySelector('link[rel="icon"]');
    if (existingIcon) existingIcon.href = cloak.favicon;
    else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = cloak.favicon;
      document.head.appendChild(link);
    }
    if (key !== "none") unlockAchievement("tab-cloak");
  }

  // ──────────────────────────────────────────
  // PANIC KEY
  // ──────────────────────────────────────────
  function handlePanicKey() {
    const cloakKey =
      state.activeCloak !== "none" ? state.activeCloak : "classroom";
    applyCloak(cloakKey);
    // If in browser view, navigate the iframe to a safe educational page
    // to quickly hide the proxied content
    if (state.currentView === "browser") {
      const iframe = document.getElementById("proxy-iframe");
      if (iframe) iframe.src = "https://www.google.com";
    }
  }

  document.addEventListener("keydown", (e) => {
    if (state.changingPanicKey) {
      e.preventDefault();
      state.panicKey = e.key;
      localStorage.setItem("strato-panicKey", e.key);
      const settingKey = document.getElementById("setting-panic-key");
      const stealthKey = document.getElementById("stealth-panic-key");
      const barKey = document.getElementById("panic-key-display");
      if (settingKey) settingKey.textContent = e.key;
      if (stealthKey) stealthKey.value = e.key;
      if (barKey) barKey.textContent = e.key;
      state.changingPanicKey = false;
      showToast("Panic key updated", "accent");
      return;
    }
    if (e.key === state.panicKey) handlePanicKey();

    // Number key shortcuts for views
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      const viewMap = {
        1: "home",
        2: "arcade",
        3: "browser",
        4: "hub",
        5: "chat",
        6: "ai",
        7: "settings",
      };
      if (
        viewMap[e.key] &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        switchView(viewMap[e.key]);
      }
      if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
        e.preventDefault();
        const urlInput = document.getElementById("url-input");
        if (urlInput) {
          switchView("home");
          urlInput.focus();
        }
      }
      if (e.key === "?" && document.activeElement.tagName !== "INPUT") {
        toggleShortcuts();
      }
      if (e.key === "Escape") {
        document.getElementById("shortcuts-overlay")?.classList.add("hidden");
        document.getElementById("notifications-panel")?.classList.add("hidden");
        document.getElementById("command-palette")?.classList.add("hidden");
        document.getElementById("extension-gallery")?.classList.add("hidden");
      }
    }

    if (e.ctrlKey && e.shiftKey && e.key === "S") {
      e.preventDefault();
      try {
        document.getElementById("snap-fab")?.click();
      } catch (e) {}
    }

    // Command Palette: Cmd+K / Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      if (cpOpen) closeCommandPalette();
      else openCommandPalette();
    }
  });

  // ──────────────────────────────────────────
  // VIEW SWITCHING
  // ──────────────────────────────────────────
  const VIEWS = ["home", "arcade", "browser", "hub", "chat", "ai", "settings"];

  function switchView(viewName) {
    if (!VIEWS.includes(viewName)) return;
    document
      .querySelectorAll(".view")
      .forEach((el) => el.classList.remove("active"));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.add("active");
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });
    state.currentView = viewName;
  }

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.view) switchView(btn.dataset.view);
    });
  });

  // Category circles
  document.querySelectorAll(".category-circle").forEach((circle) => {
    circle.addEventListener("click", () => {
      const target = circle.dataset.nav;
      if (target) switchView(target);
    });
  });

  // Section links
  document.querySelectorAll(".section-link[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.nav));
  });

  // ──────────────────────────────────────────
  // TOAST NOTIFICATIONS
  // ──────────────────────────────────────────
  function showToast(message, type = "default") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ──────────────────────────────────────────
  // NOTIFICATION CENTER
  // ──────────────────────────────────────────
  window.showToast = showToast;
  window.STRATO_TOAST = showToast;
  window.STRATO_NOTIFY =
    window.STRATO_NOTIFY ||
    ((message, type = "info") => {
      addNotification(message, type);
    });
  window.STRATO_XP =
    window.STRATO_XP ||
    ((actionType) => {
      window.StratoProfile?.addXPAction?.(actionType);
    });
  window.STRATO_NAVIGATE =
    window.STRATO_NAVIGATE ||
    ((url) => {
      const targetUrl = String(url || "").trim();
      if (!targetUrl) return;
      const urlInput =
        document.getElementById("url-input") ||
        document.getElementById("home-url-input");
      if (urlInput) urlInput.value = targetUrl;
      navigateProxy(targetUrl);
    });
  window.STRATO_CLOAK =
    window.STRATO_CLOAK ||
    ((key) => {
      const cloakSelect = document.getElementById("cloak-select");
      if (cloakSelect) cloakSelect.value = key;
      applyCloak(key);
    });
  window.STRATO_USERNAME = getUsername() || "Anonymous";

  function addNotification(message, type = "info") {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    state.notifications.unshift({ message, type, time });
    if (state.notifications.length > 20) state.notifications.pop();
    renderNotifications();
  }

  function renderNotifications() {
    const list = document.getElementById("notifications-list");
    const badge = document.querySelector(".notif-badge");
    if (!list) return;

    if (state.notifications.length === 0) {
      list.innerHTML = '<div class="notification-empty">No notifications</div>';
      if (badge) {
        badge.textContent = "0";
        badge.classList.add("hidden");
      }
      return;
    }

    list.innerHTML = state.notifications
      .map(
        (n) => `
      <div class="notification-item ${n.type === "error" ? "error" : ""}">
        <span>${escapeHtml(n.message)}</span>
        <span class="notification-time">${escapeHtml(n.time)}</span>
      </div>
    `,
      )
      .join("");

    if (badge) {
      badge.textContent = state.notifications.length;
      badge.classList.toggle("hidden", state.notifications.length === 0);
    }
  }

  document
    .getElementById("btn-notifications")
    ?.addEventListener("click", () => {
      const panel = document.getElementById("notifications-panel");
      if (panel) panel.classList.toggle("hidden");
    });

  document
    .getElementById("btn-clear-notifications")
    ?.addEventListener("click", () => {
      state.notifications = [];
      renderNotifications();
    });

  // ──────────────────────────────────────────
  // ACTIVITY LOG
  // ──────────────────────────────────────────
  function logActivity(action, type = "info") {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    state.activityLog.unshift({ action, type, time });
    if (state.activityLog.length > 15) state.activityLog.pop();
    localStorage.setItem("strato-activity", JSON.stringify(state.activityLog));
    renderActivity();
  }

  function renderActivity() {
    const list = document.getElementById("recent-activity");
    if (!list) return;
    if (state.activityLog.length === 0) {
      list.innerHTML = '<div class="activity-empty">No recent activity</div>';
      return;
    }
    list.innerHTML = state.activityLog
      .slice(0, 8)
      .map(
        (a) => `
      <div class="activity-item">
        <span class="activity-dot ${escapeHtml(a.type)}"></span>
        <span>${escapeHtml(a.action)}</span>
        <span class="activity-time">${escapeHtml(a.time)}</span>
      </div>
    `,
      )
      .join("");
  }

  // ──────────────────────────────────────────
  // ACHIEVEMENTS
  // ──────────────────────────────────────────
  function unlockAchievement(id) {
    if (state.achievements.includes(id)) return;
    state.achievements.push(id);
    localStorage.setItem(
      "strato-achievements",
      JSON.stringify(state.achievements),
    );
    renderAchievements();
    showToast(`Achievement unlocked!`, "accent");
    addNotification(`Achievement unlocked!`, "info");
    addCoins(5);
  }

  function renderAchievements() {
    const items = document.querySelectorAll(".achievement-item");
    items.forEach((item) => {
      const id = item.dataset.achievement;
      if (state.achievements.includes(id)) {
        item.classList.remove("locked");
        item.classList.add("unlocked");
      }
    });
    const countEl = document.getElementById("achievement-count");
    if (countEl) countEl.textContent = `${state.achievements.length}/8`;
  }

  // ──────────────────────────────────────────
  // PROXY ENGINE
  // ──────────────────────────────────────────
  function getProxyUrl(rawUrl, engine) {
    let url = rawUrl.trim();
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) {
      if (url.includes(" ") || !url.includes(".")) {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      } else {
        url = "https://" + url;
      }
    }
    const targetEngine = engine || state.currentEngine;
    if (targetEngine === "uv") {
      if (
        typeof Ultraviolet !== "undefined" &&
        Ultraviolet.codec &&
        Ultraviolet.codec.xor
      ) {
        return `/frog/${Ultraviolet.codec.xor.encode(url)}`;
      }
      // UV not ready yet — return null, caller must wait for strato:transport-ready
      return null;
    } else {
      if (
        typeof Scramjet !== "undefined" &&
        Scramjet.codec &&
        Scramjet.codec.xor
      ) {
        return `/scramjet/${Scramjet.codec.xor.encode(url)}`;
      }
      return null;
    }
  }

  function setEngine(engine) {
    if (engine !== "uv" && engine !== "scramjet") return;
    state.currentEngine = engine;
    localStorage.setItem("strato-engine", engine);
    document.querySelectorAll("[data-engine]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.engine === engine);
    });
    const label = document.getElementById("proxy-label");
    if (label) label.textContent = engine === "uv" ? "Ultraviolet" : "Scramjet";
    const statusEngine = document.getElementById("status-engine");
    const statusLabel = statusEngine?.querySelector("span:last-child");
    if (statusLabel)
      statusLabel.textContent = engine === "uv" ? "Ultraviolet" : "Scramjet";
    const statEngine = document.getElementById("stat-engine");
    if (statEngine)
      statEngine.textContent = engine === "uv" ? "Ultraviolet" : "Scramjet";
    const settingEngine = document.getElementById("setting-engine");
    if (settingEngine) settingEngine.value = engine;
  }

  document.querySelectorAll("[data-engine]").forEach((btn) => {
    btn.addEventListener("click", () => setEngine(btn.dataset.engine));
  });

  const autoFallbackToggle = document.getElementById("setting-autofallback");
  const settingAutoFallback =
    document.getElementById("setting-auto-fallback") ||
    document.getElementById("setting-autofallback");

  function setAutoFallback(on) {
    state.autoFallback = on;
    localStorage.setItem("strato-autoFallback", String(on));
    [autoFallbackToggle, settingAutoFallback].forEach((el) => {
      if (!el) return;
      if (on) el.classList.add("on");
      else el.classList.remove("on");
    });
  }

  [autoFallbackToggle, settingAutoFallback].forEach((el) => {
    if (!el) return;
    el.addEventListener("click", () => setAutoFallback(!state.autoFallback));
  });

  if (autoFallbackToggle && state.autoFallback)
    autoFallbackToggle.classList.add("on");
  if (settingAutoFallback && state.autoFallback)
    settingAutoFallback.classList.add("on");

  function navigateProxy(url, engine) {
    if (!url) return;
    const targetEngine = engine || state.currentEngine;
    const proxyUrl = getProxyUrl(url, targetEngine);
    if (!proxyUrl) {
      // proxy-ready may have already fired — retry immediately after short delay
      setTimeout(() => navigateProxy(url, engine), 500);
      return;
    }

    switchView("browser");
    const iframe = document.getElementById("proxy-iframe");
    let shimmer = null;
    try {
      shimmer = document.getElementById("browser-shimmer");
    } catch (e) {}
    const urlInput = document.getElementById("url-input");
    if (urlInput) urlInput.value = url;
    if (shimmer) shimmer.classList.remove("hidden");
    iframe.src = proxyUrl;

    state.pagesLoaded++;
    localStorage.setItem("strato-pagesLoaded", String(state.pagesLoaded));
    updateStats();
    addCoins(2);
    updateDailyChallengeProgress("browse");
    logActivity(`Loaded ${url.substring(0, 30)}`, "proxy");
    unlockAchievement("first-proxy");

    if (state.autoFallback) {
      const fallbackTimer = setTimeout(() => {
        const otherEngine = targetEngine === "uv" ? "scramjet" : "uv";
        logProxyFailure(targetEngine, url, "ETIMEDOUT");
        setEngine(otherEngine);
        iframe.src = getProxyUrl(url, otherEngine);
        showToast(
          `Switched to ${otherEngine === "uv" ? "Ultraviolet" : "Scramjet"}`,
          "accent",
        );
      }, 15000);

      const onLoad = () => {
        clearTimeout(fallbackTimer);
        if (shimmer) shimmer.classList.add("hidden");
        iframe.removeEventListener("load", onLoad);
        iframe.removeEventListener("error", onError);
      };

      const onError = () => {
        clearTimeout(fallbackTimer);
        if (shimmer) shimmer.classList.add("hidden");
        iframe.removeEventListener("load", onLoad);
        iframe.removeEventListener("error", onError);
        if (state.autoFallback) {
          const otherEngine = targetEngine === "uv" ? "scramjet" : "uv";
          logProxyFailure(targetEngine, url, "ECONNREFUSED");
          setEngine(otherEngine);
          iframe.src = getProxyUrl(url, otherEngine);
          showToast(
            `Switched to ${otherEngine === "uv" ? "Ultraviolet" : "Scramjet"}`,
            "accent",
          );
        } else {
          showToast("Failed to load page", "error");
        }
      };

      iframe.addEventListener("load", onLoad);
      iframe.addEventListener("error", onError);
    } else {
      iframe.addEventListener(
        "load",
        () => {
          if (shimmer) shimmer.classList.add("hidden");
        },
        { once: true },
      );
    }
  }

  function logProxyFailure(engine, url, error) {
    const log = JSON.parse(localStorage.getItem("strato-failureLog") || "[]");
    log.push({ engine, url, error, timestamp: Date.now() });
    while (log.length > 50) log.shift();
    localStorage.setItem("strato-failureLog", JSON.stringify(log));
  }

  // URL bar handlers
  const homeUrlInput = document.getElementById("url-input");
  const homeGoBtn = document.getElementById("home-go-btn");
  if (homeGoBtn)
    homeGoBtn.addEventListener("click", () =>
      navigateProxy(homeUrlInput.value),
    );
  if (homeUrlInput)
    homeUrlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") navigateProxy(homeUrlInput.value);
    });

  const browserUrlInput = document.getElementById("url-input");
  const browserGoBtn = document.getElementById("btn-go");
  if (browserGoBtn)
    browserGoBtn.addEventListener("click", () =>
      navigateProxy(browserUrlInput.value),
    );
  if (browserUrlInput)
    browserUrlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") navigateProxy(browserUrlInput.value);
    });

  // Quick links
  document.querySelectorAll(".quick-link-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = btn.dataset.url;
      if (url) navigateProxy(url);
    });
  });

  // Browser nav buttons
  document.getElementById("btn-refresh")?.addEventListener("click", () => {
    const iframe = document.getElementById("proxy-iframe");
    if (iframe) iframe.src = iframe.src;
  });

  try {
    document
      .getElementById("browser-fullscreen-btn")
      ?.addEventListener("click", () => {
        const container = document.querySelector(".browser-frame-container");
        if (container) {
          if (document.fullscreenElement) document.exitFullscreen();
          else container.requestFullscreen?.();
        }
      });
  } catch (e) {}

  window.addEventListener("message", (e) => {
    // Only accept messages from same origin to prevent CSRF via postMessage
    if (e.origin !== location.origin) return;
    if (e.data?.type === "strato-game-back") {
      const iframe = document.getElementById("proxy-iframe");
      if (iframe) iframe.src = "about:blank";
      switchView("home");
      return;
    }
    if (e.data?.type === "proxy-switch-engine") {
      const otherEngine = state.currentEngine === "uv" ? "scramjet" : "uv";
      setEngine(otherEngine);
      const url = browserUrlInput?.value;
      if (url) navigateProxy(url, otherEngine);
    }
  });

  // ──────────────────────────────────────────
  // GAMES
  // ──────────────────────────────────────────
  let searchDebounce = null;
  const HOMEPAGE_BLOCKED_CATEGORIES = new Set([
    "proxies",
    "directories",
    "game-hubs",
  ]);
  const HOMEPAGE_BLOCKED_TERMS = [
    "google",
    "chrome",
    "nytimes",
    "school",
    "proxy",
    "cloak",
    "unblocked",
    "exploit",
  ];
  const RECENT_FAILURE_MS = 24 * 60 * 60 * 1000;

  function getGameName(game) {
    return game?.name || game?.title || "Untitled";
  }

  function getGameTags(game) {
    return Array.isArray(game?.tags)
      ? game.tags.filter(Boolean).map(String)
      : [];
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function isPlaceholderUrl(url) {
    const value = String(url || "").trim();
    return (
      !value ||
      value === "#" ||
      value === "about:blank" ||
      /^\$\{[^}]+\}$/.test(value) ||
      /example\.(com|org|net)/i.test(value)
    );
  }

  function isSupportedLaunchUrl(url) {
    const value = String(url || "").trim();
    return value.startsWith("/") || /^https?:\/\//i.test(value);
  }

  function hasUsableThumbnail(game) {
    const thumb = String(game?.thumbnail || "").trim();
    return !!thumb && !isPlaceholderUrl(thumb);
  }

  function categoryLabel(category) {
    return String(category || "Arcade").replace(/-/g, " ");
  }

  function isHomeSafeGame(game) {
    const category = String(game?.category || "").toLowerCase();
    if (HOMEPAGE_BLOCKED_CATEGORIES.has(category)) return false;
    const visibleText = [
      getGameName(game),
      game?.description || "",
      category,
      ...getGameTags(game),
    ]
      .join(" ")
      .toLowerCase();
    return !HOMEPAGE_BLOCKED_TERMS.some((term) => visibleText.includes(term));
  }

  function getGameHealth(game) {
    if (!game || typeof game !== "object")
      return { status: "invalid", reason: "unavailable" };
    const url = String(game.url || "").trim();
    if (!url) return { status: "missing-url", reason: "missing URL" };
    if (game.needsConfig || game.config_required || isPlaceholderUrl(url))
      return { status: "needs-config", reason: "needs config" };
    if (!isSupportedLaunchUrl(url))
      return { status: "invalid", reason: "unavailable" };

    const failure = state.localFailures?.[game.id];
    if (failure && Date.now() - failure.timestamp < RECENT_FAILURE_MS) {
      return {
        status: "recently-failed-locally",
        reason: failure.reason || "failed locally",
      };
    }

    if (!hasUsableThumbnail(game))
      return { status: "thumbnail-fallback", reason: "thumbnail missing" };
    if (game.reliability === "red")
      return { status: "playable", reason: "playable" };
    return { status: "ready", reason: "ready" };
  }

  function isLaunchableStatus(status) {
    return ["ready", "playable", "thumbnail-fallback"].includes(status);
  }

  function isLaunchableGame(game) {
    return isLaunchableStatus(getGameHealth(game).status);
  }

  function isSelfHostedGame(game) {
    return String(game?.url || "").startsWith("/games/");
  }

  function isPromotableGame(game) {
    if (!isHomeSafeGame(game)) return false;
    const health = getGameHealth(game);
    return (
      ["ready", "thumbnail-fallback"].includes(health.status) ||
      (health.status === "playable" && game.reliability !== "red")
    );
  }

  function homeCatalog() {
    return state.games.filter(isPromotableGame);
  }

  function fallbackThumbnail(game) {
    const name = getGameName(game);
    const initials =
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "S";
    const palette = [
      "#00e5ff",
      "#a855f7",
      "#22c55e",
      "#fbbf24",
      "#f472b6",
      "#3b82f6",
    ];
    const accent = palette[hashString(name) % palette.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="${escapeXml(name)}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#06060e"/><stop offset="1" stop-color="#101827"/></linearGradient></defs><rect width="320" height="200" rx="18" fill="url(#g)"/><circle cx="252" cy="42" r="52" fill="${accent}" opacity=".16"/><circle cx="74" cy="170" r="80" fill="${accent}" opacity=".1"/><path d="M44 138h232" stroke="${accent}" stroke-opacity=".22"/><text x="160" y="113" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="800" fill="${accent}">${escapeXml(initials)}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function thumbnailFor(game) {
    return hasUsableThumbnail(game) ? game.thumbnail : fallbackThumbnail(game);
  }

  function gameStatusLabel(health) {
    const labels = {
      playable: "Check first",
      "thumbnail-fallback": "Fallback art",
      "recently-failed-locally": "Failed locally",
      "missing-url": "Missing URL",
      "needs-config": "Needs config",
      invalid: "Unavailable",
    };
    return labels[health.status] || "";
  }

  function renderTags(game, limit = 3) {
    return getGameTags(game)
      .slice(0, limit)
      .map((tag) => `<span class="home-card-tag">${escapeHtml(tag)}</span>`)
      .join("");
  }

  function renderHomeGameCard(game) {
    const health = getGameHealth(game);
    const isFav = state.favorites.includes(game.id);
    const status =
      health.status !== "ready"
        ? `<span class="home-status-badge">${escapeHtml(gameStatusLabel(health))}</span>`
        : "";
    return `
      <article class="home-game-card" data-game-id="${escapeHtml(game.id)}" tabindex="0" aria-label="Launch ${escapeHtml(getGameName(game))}">
        <button class="home-fav-btn ${isFav ? "active" : ""}" type="button" data-fav-id="${escapeHtml(game.id)}" aria-label="${isFav ? "Remove from favorites" : "Add to favorites"}">${isFav ? "\u2605" : "\u2606"}</button>
        <img class="home-card-thumb game-card-thumb" src="${escapeHtml(thumbnailFor(game))}" alt="" loading="lazy" data-game-id="${escapeHtml(game.id)}" data-game-url="${escapeHtml(game.url || "")}" data-game-name="${escapeHtml(getGameName(game))}" data-fallback-src="${escapeHtml(fallbackThumbnail(game))}">
        <div class="home-card-body">
          <div>
            <div class="home-card-title">${escapeHtml(getGameName(game))}</div>
            <div class="home-card-meta">${escapeHtml(categoryLabel(game.category))}</div>
          </div>
          <div class="home-card-tags">${renderTags(game, 2)}${status}</div>
          <button class="home-launch-btn" type="button" data-launch-id="${escapeHtml(game.id)}">Launch</button>
        </div>
      </article>
    `;
  }

  function renderHomeCards(containerId, games, emptyHtml) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!games.length) {
      container.innerHTML = `<div class="home-empty">${emptyHtml}</div>`;
      bindHomeEmptyActions(container);
      return;
    }
    container.innerHTML = games.map(renderHomeGameCard).join("");
    bindHomeCardEvents(container);
    applyFaviconFallbacks(container);
  }

  function bindHomeCardEvents(container) {
    container.querySelectorAll(".home-game-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        launchGame(card.dataset.gameId);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          launchGame(card.dataset.gameId);
        }
      });
    });
    container.querySelectorAll("[data-launch-id]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        launchGame(btn.dataset.launchId);
      });
    });
    container.querySelectorAll("[data-fav-id]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(btn.dataset.favId);
      });
    });
  }

  function bindHomeEmptyActions(container) {
    container.querySelectorAll("[data-home-empty-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.homeEmptyAction === "surprise") surpriseMe();
        if (btn.dataset.homeEmptyAction === "daily")
          document.getElementById("daily-picks-section")?.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
          });
      });
    });
  }

  function dailyKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  function selectDailyPicks(games, count = 6) {
    const key = dailyKey();
    const sorted = [...games].sort((a, b) => {
      const localWeight =
        Number(isSelfHostedGame(b)) - Number(isSelfHostedGame(a));
      if (localWeight) return localWeight;
      const aScore =
        hashString(`${key}:${a.id}`) + (hasUsableThumbnail(a) ? 0 : 500000);
      const bScore =
        hashString(`${key}:${b.id}`) + (hasUsableThumbnail(b) ? 0 : 500000);
      return aScore - bScore;
    });
    const picks = [];
    const categoryCounts = new Map();
    for (const game of sorted) {
      const category = game.category || "arcade";
      if ((categoryCounts.get(category) || 0) >= 2 && picks.length < count - 1)
        continue;
      picks.push(game);
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      if (picks.length >= count) break;
    }
    return picks;
  }

  function renderHomeSearch(query = "") {
    const container = document.getElementById("home-search-results");
    if (!container) return;
    const q = query.trim().toLowerCase();
    if (!q) {
      container.innerHTML = "";
      return;
    }
    const matches = homeCatalog()
      .filter((game) => {
        const haystack = [
          getGameName(game),
          game.description || "",
          game.category || "",
          ...getGameTags(game),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 6);

    if (!matches.length) {
      container.innerHTML =
        '<div class="home-empty">No signal. Try another.</div>';
      return;
    }

    container.innerHTML = matches
      .map(
        (game) => `
      <div class="home-search-result" data-game-id="${escapeHtml(game.id)}">
        <img src="${escapeHtml(thumbnailFor(game))}" alt="" loading="lazy" data-game-id="${escapeHtml(game.id)}" data-game-url="${escapeHtml(game.url || "")}" data-game-name="${escapeHtml(getGameName(game))}" data-fallback-src="${escapeHtml(fallbackThumbnail(game))}">
        <div>
          <div class="home-result-title">${escapeHtml(getGameName(game))}</div>
          <div class="home-result-meta">${escapeHtml(categoryLabel(game.category))}${getGameTags(game).slice(0, 3).length ? " / " + escapeHtml(getGameTags(game).slice(0, 3).join(" / ")) : ""}</div>
        </div>
        <button class="home-launch-btn" type="button" data-launch-id="${escapeHtml(game.id)}">Launch</button>
      </div>
    `,
      )
      .join("");
    bindHomeCardEvents(container);
    applyFaviconFallbacks(container);
  }

  function renderOpenHome() {
    if (window.STRATO_OPEN_HOME_RUNTIME_ACTIVE) {
      window.dispatchEvent(new Event("strato-open-home-refresh"));
      return;
    }

    const catalog = homeCatalog();
    document.documentElement.dataset.homeCatalogCount = String(catalog.length);
    const surpriseBtn = document.getElementById("surprise-me");
    if (surpriseBtn) {
      surpriseBtn.disabled = catalog.length === 0;
      surpriseBtn.classList.toggle("hidden", catalog.length === 0);
    }

    renderHomeCards(
      "daily-picks",
      selectDailyPicks(catalog),
      "No launchable Daily Picks yet.",
    );

    const favorites = state.favorites
      .map((id) => state.games.find((game) => game.id === id))
      .filter((game) => game && isPromotableGame(game))
      .slice(0, 6);
    renderHomeCards(
      "home-favorites",
      favorites,
      'Launch a game, then star it.<br><button class="glass-btn" type="button" data-home-empty-action="daily">Start here</button>',
    );

    const recent = state.recentlyPlayed
      .map((id) => state.games.find((game) => game.id === id))
      .filter((game) => game && isPromotableGame(game))
      .slice(0, 6);
    renderHomeCards(
      "home-recent",
      recent,
      'Nothing played here yet.<br><button class="glass-btn" type="button" data-home-empty-action="surprise">Surprise Me</button>',
    );

    const mostPlayed = Object.entries(state.playCounts)
      .filter(([, count]) => Number(count) > 0)
      .map(([id, count]) => ({
        game: state.games.find((item) => item.id === id),
        count: Number(count),
      }))
      .filter((item) => item.game && isPromotableGame(item.game))
      .sort(
        (a, b) =>
          b.count - a.count ||
          getGameName(a.game).localeCompare(getGameName(b.game)),
      )
      .map((item) => item.game)
      .slice(0, 6);
    document
      .getElementById("home-most-played-section")
      ?.classList.toggle("hidden", mostPlayed.length === 0);
    renderHomeCards("home-most-played", mostPlayed, "");

    const dated = catalog
      .map((game) => ({
        game,
        date: Date.parse(game.addedDate || game.addedAt || game.date || ""),
      }))
      .filter((item) => Number.isFinite(item.date))
      .sort((a, b) => b.date - a.date)
      .map((item) => item.game)
      .slice(0, 6);
    document
      .getElementById("home-recently-added-section")
      ?.classList.toggle("hidden", dated.length === 0);
    renderHomeCards("home-recently-added", dated, "");

    renderHomeSearch(document.getElementById("home-search")?.value || "");
  }

  function refreshOpenHome() {
    if (window.STRATO_OPEN_HOME_RUNTIME_ACTIVE) {
      window.dispatchEvent(new Event("strato-open-home-refresh"));
    } else {
      renderOpenHome();
    }
  }

  async function loadGames() {
    try {
      const resp = await fetch("/assets/games.json");
      if (!resp.ok) throw new Error("Failed to load games");
      state.games = await resp.json();
      state.filteredGames = [...state.games];
      renderCategoryPills();
      renderGames();
      renderFeatured();
      renderQuickLaunch();
      renderOpenHome();
      updateGameStats();
    } catch (err) {
      console.error("[STRATO] Failed to load game library:", err);
      showToast("Failed to load game library", "error");
    }
  }

  function updateGameStats() {
    const total = state.games.length;
    const tier1 = state.games.filter((g) => g.tier === 1).length;
    const available = state.games.length;

    const els = {
      "arcade-total": total,
      "arcade-available": available,
      "arcade-tier1": tier1,
      "status-games": `${total} games`,
      "games-count-text": `${total} games`,
      "home-games-count": total,
      "arcade-badge": total,
    };
    for (const [id, val] of Object.entries(els)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  }

  function renderGames() {
    const grid = document.getElementById("games-grid");
    if (!grid) return;
    const showUnavailable = (() => {
      try {
        return document.getElementById("show-unavailable")?.checked || false;
      } catch (e) {
        return false;
      }
    })();

    grid.innerHTML = state.filteredGames
      .map((game) => {
        const health = getGameHealth(game);
        const isUnavailable = !isLaunchableStatus(health.status);
        const isFav = state.favorites.includes(game.id);
        const rel = game.reliability || "green";
        const hasPassword = !!game.password && !/^\$\{/.test(game.password);
        const passwordDisplay = hasPassword ? game.password : "";
        const proxyTier = game.proxy_tier;
        const isUnresolved = game.config_required && /^\$\{/.test(game.url);
        const statusBadge =
          health.status !== "ready"
            ? `<span class="home-status-badge">${escapeHtml(gameStatusLabel(health))}</span>`
            : "";
        let tierIcon = "";
        if (proxyTier === "good")
          tierIcon = '<span class="tier-gold">&#9733;</span>';
        else if (proxyTier === "recommended")
          tierIcon = '<span class="tier-purple">&#9734;</span>';
        else if (game.tier === 1)
          tierIcon = '<span class="tier-standalone">LOCAL</span>';
        return `
          <div class="game-card glass ${isUnavailable ? "unavailable" : ""} ${isUnresolved ? "config-required" : ""}" data-game-id="${escapeHtml(game.id)}">
            <div class="game-card-inner">
              ${isUnresolved ? '<div class="config-overlay"><span class="config-lock">&#128274;</span><span class="config-text">Configure in .env</span></div>' : ""}
              <div class="game-card-badges">
                ${tierIcon}
                <span class="reliability-dot rel-${escapeHtml(rel)}" title="${escapeHtml(rel)} reliability"></span>
                ${statusBadge}
                ${hasPassword ? '<span class="auth-hint" title="Password: ' + escapeHtml(passwordDisplay) + '">&#128272; ' + escapeHtml(passwordDisplay) + "</span>" : ""}
              </div>
              <button class="fav-btn ${isFav ? "active" : ""}" data-fav-id="${escapeHtml(game.id)}" title="${isFav ? "Remove from favorites" : "Add to favorites"}">${isFav ? "\u2605" : "\u2606"}</button>
              <img class="game-card-thumb" src="${escapeHtml(thumbnailFor(game))}" alt="${escapeHtml(getGameName(game))}" loading="lazy" data-game-id="${escapeHtml(game.id)}" data-game-url="${escapeHtml(game.url || "")}" data-game-name="${escapeHtml(getGameName(game))}" data-fallback-src="${escapeHtml(fallbackThumbnail(game))}">
              <div class="game-card-info">
                <div class="game-card-name">${escapeHtml(getGameName(game))}</div>
                <div class="game-card-category">${escapeHtml(categoryLabel(game.category))}</div>
              </div>
            </div>
          </div>`;
      })
      .join("");

    grid.querySelectorAll(".game-card:not(.unavailable)").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".fav-btn")) return;
        launchGame(card.dataset.gameId);
      });
    });

    grid.querySelectorAll(".fav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(btn.dataset.favId);
      });
    });

    // Attach hover prefetch for faster loads
    attachHoverPrefetch();

    // Apply favicon fallback for broken thumbnails
    applyFaviconFallbacks(grid);
  }

  function renderCategoryPills() {
    const container = document.getElementById("category-pills");
    if (!container) return;

    const categories = [
      ...new Set(state.games.map((game) => game.category).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));
    const labels = [
      ["all", "All"],
      ...categories.map((category) => [category, category.replace(/-/g, " ")]),
    ];

    container.innerHTML = labels
      .map(
        ([value, label]) => `
      <button class="glass-pill ${value === "all" ? "active" : ""}" data-category="${escapeHtml(value)}">
        ${escapeHtml(label)}
      </button>
    `,
      )
      .join("");
    activeCategories = new Set(["all"]);
  }

  function renderQuickLaunch() {
    const grid = document.getElementById("quick-launch");
    if (!grid) return;

    const recent = state.recentlyPlayed
      .map((id) => state.games.find((game) => game.id === id))
      .filter((game) => game && isPromotableGame(game));
    const defaults = homeCatalog()
      .filter((game) => game.tier === 1)
      .slice(0, 6);
    const launchItems = [...recent, ...defaults]
      .filter(
        (game, index, arr) =>
          arr.findIndex((item) => item.id === game.id) === index,
      )
      .slice(0, 6);

    grid.innerHTML = launchItems
      .map(
        (game) => `
      <button class="quick-game-btn" data-game-id="${escapeHtml(game.id)}" title="${escapeHtml(getGameName(game))}">
        <img src="${escapeHtml(thumbnailFor(game))}" alt="" loading="lazy" data-game-id="${escapeHtml(game.id)}" data-game-url="${escapeHtml(game.url || "")}" data-game-name="${escapeHtml(getGameName(game))}" data-fallback-src="${escapeHtml(fallbackThumbnail(game))}">
        <span>${escapeHtml(getGameName(game))}</span>
      </button>
    `,
      )
      .join("");
    applyFaviconFallbacks(grid);

    grid.querySelectorAll(".quick-game-btn").forEach((btn) => {
      btn.addEventListener("click", () => launchGame(btn.dataset.gameId));
    });
  }

  function toggleFavorite(gameId) {
    const idx = state.favorites.indexOf(gameId);
    if (idx === -1) state.favorites.push(gameId);
    else state.favorites.splice(idx, 1);
    writeStorageJson("strato-favorites", state.favorites);
    renderGames();
    refreshOpenHome();
    showToast(
      idx === -1 ? "Added to favorites" : "Removed from favorites",
      "accent",
    );
  }

  function renderFeatured() {
    let scroll = null;
    try {
      scroll = document.getElementById("featured-scroll");
    } catch (e) {}
    if (!scroll) return;
    const featured = [...state.games]
      .sort((a, b) => a.tier - b.tier)
      .slice(0, 10);

    scroll.innerHTML = featured
      .map(
        (game) => `
      <div class="featured-card">
        <div class="game-card glass" data-game-id="${escapeHtml(game.id)}">
          <div class="game-card-inner">
            <img class="game-card-thumb" src="${escapeHtml(thumbnailFor(game))}" alt="${escapeHtml(getGameName(game))}" loading="lazy" data-game-id="${escapeHtml(game.id)}" data-game-url="${escapeHtml(game.url || "")}" data-game-name="${escapeHtml(getGameName(game))}" data-fallback-src="${escapeHtml(fallbackThumbnail(game))}">
            <div class="game-card-info">
              <div class="game-card-name">${escapeHtml(getGameName(game))}</div>
              <div class="game-card-category">${escapeHtml(categoryLabel(game.category))}</div>
            </div>
          </div>
        </div>
      </div>
    `,
      )
      .join("");

    scroll.querySelectorAll(".game-card").forEach((card) => {
      card.addEventListener("click", () => launchGame(card.dataset.gameId));
    });
    applyFaviconFallbacks(scroll);
  }

  function resolveGameUrl(game) {
    if (game.tier === 2 && String(game.url || "").startsWith("/") === false)
      return game.url;
    if (game.tier === 2) {
      const cdnBase = window.__CDN_BASE_URL || "";
      return cdnBase
        ? `${cdnBase}/${String(game.url).replace(/^\/+/, "")}`
        : game.url;
    }
    return game.url;
  }

  function recordGameLaunch(game) {
    const gameId = game.id;
    state.recentlyPlayed = state.recentlyPlayed.filter((id) => id !== gameId);
    state.recentlyPlayed.unshift(gameId);
    if (state.recentlyPlayed.length > 20) state.recentlyPlayed.pop();
    writeStorageJson("strato-recent", state.recentlyPlayed);

    state.playCounts[gameId] = (Number(state.playCounts[gameId]) || 0) + 1;
    state.lastPlayed[gameId] = Date.now();
    writeStorageJson("strato-playCounts", state.playCounts);
    writeStorageJson("strato-lastPlayed", state.lastPlayed);

    state.gamesPlayed++;
    localStorage.setItem("strato-gamesPlayed", String(state.gamesPlayed));
    addCoins(1);
    updateDailyChallengeProgress("play");
    updateStats();
    renderQuickLaunch();
    refreshOpenHome();
    logActivity(`Played ${getGameName(game)}`, "game");
    unlockAchievement("first-game");
    if (state.gamesPlayed >= 10) unlockAchievement("ten-games");
  }

  async function verifyLocalGameUrl(url) {
    if (!String(url || "").startsWith("/")) return true;
    try {
      const response = await fetch(url, { method: "HEAD", cache: "no-store" });
      return response.ok;
    } catch {
      return false;
    }
  }

  function markLocalFailure(gameId, reason) {
    if (!gameId) return;
    state.localFailures[gameId] = { reason, timestamp: Date.now() };
    writeStorageJson("strato-recentFailures", state.localFailures);
  }

  function clearLocalFailure(gameId) {
    if (!gameId || !state.localFailures[gameId]) return;
    delete state.localFailures[gameId];
    writeStorageJson("strato-recentFailures", state.localFailures);
  }

  function similarGamesFor(game) {
    if (!game) return [];
    const tags = new Set(getGameTags(game).map((tag) => tag.toLowerCase()));
    return homeCatalog()
      .filter((item) => item.id !== game.id)
      .map((item) => {
        const sameCategory =
          item.category && game.category && item.category === game.category
            ? 3
            : 0;
        const sharedTags = getGameTags(item).filter((tag) =>
          tags.has(tag.toLowerCase()),
        ).length;
        return { item, score: sameCategory + sharedTags };
      })
      .filter((entry) => entry.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          getGameName(a.item).localeCompare(getGameName(b.item)),
      )
      .map((entry) => entry.item)
      .slice(0, 3);
  }

  function closeLaunchFailure() {
    document.getElementById("launch-failure-overlay")?.remove();
  }

  function showLaunchFailure(game, reason) {
    closeLaunchFailure();
    const title = game ? getGameName(game) : "This launch";
    const similar = similarGamesFor(game);
    const overlay = document.createElement("div");
    overlay.className = "launch-failure-overlay";
    overlay.id = "launch-failure-overlay";
    overlay.innerHTML = `
      <div class="launch-failure-panel" role="dialog" aria-modal="true" aria-labelledby="launch-failure-title">
        <div class="launch-failure-title" id="launch-failure-title">No signal.</div>
        <p class="launch-failure-copy">${escapeHtml(title)} could not launch: ${escapeHtml(reason)}.</p>
        <div class="home-failure-actions">
          <button class="glass-btn" type="button" data-failure-action="retry">Retry</button>
          <button class="glass-btn" type="button" data-failure-action="surprise">Try Surprise Me</button>
          <button class="glass-btn" type="button" data-failure-action="home">Back to STRATO</button>
        </div>
        ${similar.length ? `<div class="similar-games">${similar.map((item) => `<button class="similar-game-btn" type="button" data-similar-game="${escapeHtml(item.id)}"><span>${escapeHtml(getGameName(item))}</span><span>${escapeHtml(categoryLabel(item.category))}</span></button>`).join("")}</div>` : ""}
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeLaunchFailure();
      const action = e.target.closest("[data-failure-action]")?.dataset
        .failureAction;
      if (action === "retry" && game) {
        closeLaunchFailure();
        launchGame(game.id, { retry: true });
      } else if (action === "surprise") {
        closeLaunchFailure();
        surpriseMe();
      } else if (action === "home") {
        closeLaunchFailure();
        switchView("home");
      }
      const similarId = e.target.closest("[data-similar-game]")?.dataset
        .similarGame;
      if (similarId) {
        closeLaunchFailure();
        launchGame(similarId);
      }
    });
  }

  function surpriseMe() {
    const valid = homeCatalog().filter(isLaunchableGame);
    const stable = valid.filter(isSelfHostedGame);
    const choicesBase = stable.length ? stable : valid;
    if (!valid.length) {
      const fallback = selectDailyPicks(homeCatalog(), 1)[0];
      if (fallback) launchGame(fallback.id);
      else showToast("No launchable games yet", "error");
      return;
    }
    const btn = document.getElementById("surprise-me");
    if (btn && !prefersReducedMotion && !state.preferences.lowPower) {
      btn.classList.remove("shuffle-lock");
      void btn.offsetWidth;
      btn.classList.add("shuffle-lock");
      setTimeout(() => btn.classList.remove("shuffle-lock"), 480);
    }
    const recent = new Set(
      state.recentlyPlayed.slice(0, Math.min(6, choicesBase.length - 1)),
    );
    const pool = choicesBase.filter((game) => !recent.has(game.id));
    const choices = pool.length ? pool : choicesBase;
    const pick = choices[Math.floor(Math.random() * choices.length)];
    launchGame(pick.id);
  }

  async function launchGame(gameId, options = {}) {
    const game = state.games.find((g) => g.id === gameId);
    if (!game) {
      showLaunchFailure(null, "unavailable");
      return;
    }

    const health = getGameHealth(game);
    if (health.status === "recently-failed-locally" && options.retry)
      clearLocalFailure(game.id);
    else if (!isLaunchableStatus(health.status)) {
      showLaunchFailure(game, health.reason);
      return;
    } else if (health.status === "recently-failed-locally") {
      showLaunchFailure(game, health.reason);
      return;
    }

    const gameUrl = resolveGameUrl(game);
    if (!gameUrl || isPlaceholderUrl(gameUrl)) {
      showLaunchFailure(game, "missing URL");
      return;
    }

    if (
      String(gameUrl).startsWith("/") &&
      !(await verifyLocalGameUrl(gameUrl))
    ) {
      markLocalFailure(game.id, "failed locally");
      refreshOpenHome();
      showLaunchFailure(game, "failed locally");
      return;
    }

    try {
      recordGameLaunch(game);
      if (game.tier === 1 || game.tier === 2) {
        switchView("browser");
        const iframe = document.getElementById("proxy-iframe");
        const urlInput = document.getElementById("url-input");
        if (urlInput) urlInput.value = gameUrl;
        if (iframe) {
          iframe.dataset.launchGameId = game.id;
          iframe.addEventListener("load", () => clearLocalFailure(game.id), {
            once: true,
          });
          iframe.addEventListener(
            "error",
            () => {
              markLocalFailure(game.id, "failed locally");
              showLaunchFailure(game, "failed locally");
            },
            { once: true },
          );
          iframe.src = gameUrl;
        }
      } else {
        navigateProxy(game.url);
      }
    } catch (err) {
      markLocalFailure(game.id, "blocked by browser");
      refreshOpenHome();
      showLaunchFailure(game, "blocked by browser");
    }
  }

  const searchInput = document.getElementById("game-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(filterGames, 200);
    });
  }

  if (!window.STRATO_OPEN_HOME_RUNTIME_ACTIVE) {
    const homeSearchInput = document.getElementById("home-search");
    if (homeSearchInput) {
      homeSearchInput.addEventListener("input", () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(
          () => renderHomeSearch(homeSearchInput.value),
          120,
        );
      });
      homeSearchInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const firstMatch = homeCatalog().find((game) => {
          const q = homeSearchInput.value.trim().toLowerCase();
          return (
            q &&
            [
              getGameName(game),
              game.description || "",
              game.category || "",
              ...getGameTags(game),
            ]
              .join(" ")
              .toLowerCase()
              .includes(q)
          );
        });
        if (firstMatch) launchGame(firstMatch.id);
      });
    }

    document.querySelectorAll("[data-home-nav]").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.homeNav));
    });

    document
      .getElementById("surprise-me")
      ?.addEventListener("click", surpriseMe);
    document
      .getElementById("home-favorites-action")
      ?.addEventListener("click", () => {
        document.getElementById("home-favorites-section")?.scrollIntoView({
          behavior:
            prefersReducedMotion || state.preferences.lowPower
              ? "auto"
              : "smooth",
        });
      });
    document
      .getElementById("home-recent-action")
      ?.addEventListener("click", () => {
        document.getElementById("home-recent-section")?.scrollIntoView({
          behavior:
            prefersReducedMotion || state.preferences.lowPower
              ? "auto"
              : "smooth",
        });
      });
    document
      .getElementById("low-power-toggle")
      ?.addEventListener("click", () => {
        state.preferences.lowPower = !state.preferences.lowPower;
        writeStorageJson("strato-preferences", state.preferences);
        applyPerformancePreferences();
      });
    document.documentElement.dataset.homeEvents = "1";
  }

  let activeCategories = new Set(["all"]);
  document.getElementById("category-pills")?.addEventListener("click", (e) => {
    const pill = e.target.closest(".glass-pill");
    if (!pill) return;
    document
      .querySelectorAll(".arcade-tab")
      .forEach((btn) =>
        btn.classList.toggle("active", btn.dataset.tab === "all"),
      );
    const cat = pill.dataset.category;
    if (cat === "all") {
      activeCategories = new Set(["all"]);
      document
        .querySelectorAll("#category-pills .glass-pill")
        .forEach((p) =>
          p.classList.toggle("active", p.dataset.category === "all"),
        );
    } else {
      activeCategories.delete("all");
      document
        .querySelector('#category-pills [data-category="all"]')
        ?.classList.remove("active");
      if (activeCategories.has(cat)) {
        activeCategories.delete(cat);
        pill.classList.remove("active");
      } else {
        activeCategories.add(cat);
        pill.classList.add("active");
      }
      if (activeCategories.size === 0) {
        activeCategories = new Set(["all"]);
        document
          .querySelector('#category-pills [data-category="all"]')
          ?.classList.add("active");
      }
    }
    filterGames();
  });

  const sortSelect = document.getElementById("game-sort");
  if (sortSelect) sortSelect.addEventListener("change", filterGames);

  document.querySelector(".arcade-tabs")?.addEventListener("click", (e) => {
    const tab = e.target.closest(".arcade-tab");
    if (!tab) return;
    document
      .querySelectorAll(".arcade-tab")
      .forEach((btn) => btn.classList.toggle("active", btn === tab));
    const tabName = tab.dataset.tab || "all";
    activeCategories = new Set([tabName]);
    document.querySelectorAll("#category-pills .glass-pill").forEach((pill) => {
      pill.classList.toggle(
        "active",
        tabName === "all" && pill.dataset.category === "all",
      );
    });
    filterGames();
  });

  try {
    const showUnavailableCheckbox = document.getElementById("show-unavailable");
    if (showUnavailableCheckbox)
      showUnavailableCheckbox.addEventListener("change", renderGames);
  } catch (e) {}

  function filterGames() {
    const query = (searchInput?.value || "").toLowerCase().trim();
    const sort = sortSelect?.value || "popular";
    state.filteredGames = state.games.filter((game) => {
      if (activeCategories.has("favorites")) {
        if (!state.favorites.includes(game.id)) return false;
      } else if (activeCategories.has("recent")) {
        if (!state.recentlyPlayed.includes(game.id)) return false;
      } else if (
        !activeCategories.has("all") &&
        !activeCategories.has(game.category)
      ) {
        return false;
      }
      if (query) {
        const nameMatch = getGameName(game).toLowerCase().includes(query);
        const descMatch = (game.description || "")
          .toLowerCase()
          .includes(query);
        const tagMatch = getGameTags(game).some((t) =>
          t.toLowerCase().includes(query),
        );
        const catMatch = (game.category || "").toLowerCase().includes(query);
        if (!nameMatch && !descMatch && !tagMatch && !catMatch) return false;
      }
      return true;
    });
    switch (sort) {
      case "name":
      case "az":
        state.filteredGames.sort((a, b) =>
          getGameName(a).localeCompare(getGameName(b)),
        );
        break;
      case "recent":
        state.filteredGames.sort((a, b) => {
          const aIdx = state.recentlyPlayed.indexOf(a.id);
          const bIdx = state.recentlyPlayed.indexOf(b.id);
          if (aIdx === -1 && bIdx === -1) return 0;
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
        break;
      case "category":
        state.filteredGames.sort(
          (a, b) =>
            (a.category || "").localeCompare(b.category || "") ||
            getGameName(a).localeCompare(getGameName(b)),
        );
        break;
      case "popular":
      case "tier":
        state.filteredGames.sort(
          (a, b) =>
            a.tier - b.tier || getGameName(a).localeCompare(getGameName(b)),
        );
        break;
      case "random":
        state.filteredGames.sort(() => Math.random() - 0.5);
        break;
      default:
        state.filteredGames.sort((a, b) => a.tier - b.tier);
        break;
    }
    renderGames();
  }

  // ──────────────────────────────────────────
  // STRATOVAULT
  // ──────────────────────────────────────────
  const VAULT_DB = "stratoVault";
  const VAULT_STORE = "gameCache";

  async function openVault() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(VAULT_DB, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(VAULT_STORE))
          db.createObjectStore(VAULT_STORE, { keyPath: "gameId" });
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function clearVault() {
    try {
      const db = await openVault();
      const tx = db.transaction(VAULT_STORE, "readwrite");
      tx.objectStore(VAULT_STORE).clear();
      await new Promise((resolve) => {
        tx.oncomplete = resolve;
      });
      showToast("Game cache cleared", "accent");
      updateCacheSize();
    } catch {
      showToast("Failed to clear cache", "error");
    }
  }

  async function updateCacheSize() {
    try {
      const estimate = await navigator.storage.estimate();
      const sizeMB = (estimate.usage / (1024 * 1024)).toFixed(1);
      const el = document.getElementById("cache-size");
      if (el) el.textContent = `${sizeMB} MB`;
    } catch {}
  }

  document
    .getElementById("btn-clear-cache")
    ?.addEventListener("click", clearVault);

  // Export full backup
  document
    .getElementById("btn-export-data")
    ?.addEventListener("click", async () => {
      try {
        const resp = await fetch("/api/data/export");
        if (!resp.ok) throw new Error(`Export failed (${resp.status})`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `strato-backup-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast("Full backup downloaded.", "accent");
      } catch (err) {
        showToast(`Export failed: ${err.message}`, "error");
      }
    });

  // Import full backup
  document.getElementById("btn-import-data")?.addEventListener("click", () => {
    document.getElementById("import-data-file")?.click();
  });
  document
    .getElementById("import-data-file")
    ?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const resp = await fetch("/api/data/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfMeta?.content || "",
          },
          body: JSON.stringify(data),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || `Import failed (${resp.status})`);
        }
        const result = await resp.json();
        showToast(
          result.message ||
            `Imported: ${result.imported?.bookmarks || 0} bookmarks, ${result.imported?.saves || 0} saves.`,
          "accent",
        );
        // Reset file input so same file can be re-imported
        e.target.value = "";
      } catch (err) {
        showToast(`Import failed: ${err.message}`, "error");
        e.target.value = "";
      }
    });

  // ──────────────────────────────────────────
  // AI CHAT
  // ──────────────────────────────────────────
  const aiInput = document.getElementById("ai-input");
  const aiSendBtn = document.getElementById("btn-ai-send");
  const aiMessages = document.getElementById("ai-messages");
  const aiOfflineBanner = document.getElementById("ai-offline-banner");

  async function checkAiStatus() {
    try {
      const resp = await fetch("/api/ai/status");
      const data = await resp.json();
      state.aiOnline = !!data.online;
      const aiDot = document.getElementById("ai-connection-dot");
      const aiNavDot = document.getElementById("ai-nav-dot");
      const aiStatusText = document.getElementById("ai-status-text");
      const aiStatusSettings = document.getElementById("ai-status-settings");
      const homeAiStatus = document.getElementById("home-ai-status");
      if (aiDot) aiDot.classList.toggle("error", !data.online);
      if (aiNavDot) {
        aiNavDot.className = `nav-dot ${data.online ? "online" : "offline"}`;
      }
      if (aiStatusText)
        aiStatusText.textContent = data.online ? "Online" : "Offline";
      if (aiStatusSettings) {
        aiStatusSettings.textContent = data.online ? "Online" : "Offline";
        aiStatusSettings.style.color = data.online
          ? "var(--success)"
          : "var(--error)";
      }
      if (homeAiStatus)
        homeAiStatus.textContent = data.online ? "Online" : "Offline";
      if (aiOfflineBanner)
        aiOfflineBanner.classList.toggle("hidden", data.online);
    } catch {
      state.aiOnline = false;
      if (aiOfflineBanner) aiOfflineBanner.classList.remove("hidden");
    }
  }

  function addAiBubble(role, content) {
    if (!aiMessages) return;
    const bubble = document.createElement("div");
    bubble.className = `ai-bubble ${role}`;
    bubble.textContent = content;
    aiMessages.appendChild(bubble);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }

  async function sendAiMessage() {
    const text = aiInput?.value?.trim();
    if (!text || !state.aiOnline) return;
    addAiBubble("user", text);
    aiInput.value = "";
    state.aiMessages.push({ role: "user", content: text });
    state.aiMessagesSent++;
    localStorage.setItem("strato-aiMessagesSent", String(state.aiMessagesSent));
    addCoins(1);
    updateDailyChallengeProgress("chat");
    updateStats();
    unlockAchievement("first-ai");

    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfMeta?.content || "",
        },
        body: JSON.stringify({ messages: state.aiMessages }),
      });
      const data = await resp.json();
      if (resp.ok && data.message) {
        addAiBubble("assistant", data.message.content);
        state.aiMessages.push(data.message);
      } else {
        addAiBubble("error", data.error || "Unknown error");
      }
    } catch {
      addAiBubble("error", "Failed to reach AI service");
    }
  }

  if (aiSendBtn) aiSendBtn.addEventListener("click", sendAiMessage);
  if (aiInput)
    aiInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendAiMessage();
      }
    });

  // AI quick prompts
  document.querySelectorAll(".ai-quick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (aiInput) {
        aiInput.value = btn.dataset.prompt;
        aiInput.focus();
      }
    });
  });

  // AI mode tabs
  document.querySelectorAll("[data-ai-mode]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll("[data-ai-mode]")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const mode = tab.dataset.aiMode;
      document
        .getElementById("ai-chat-panel")
        ?.classList.toggle("hidden", mode !== "chat");
      document
        .getElementById("ai-tutor-panel")
        ?.classList.toggle("hidden", mode !== "tutor");
      document
        .getElementById("ai-vision-panel")
        ?.classList.toggle("hidden", mode !== "snap");
      // Show/hide tutor options and quick prompts
      document
        .getElementById("ai-tutor-options")
        ?.classList.toggle("hidden", mode !== "tutor");
      document
        .getElementById("ai-quick-prompts")
        ?.classList.toggle("hidden", mode === "tutor");
    });
  });

  // Tutor subject selection
  document.querySelectorAll("[data-tutor-subject]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("[data-tutor-subject]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Socratic mode toggle
  document
    .getElementById("socratic-toggle")
    ?.addEventListener("click", function () {
      this.classList.toggle("on");
    });

  // AI tutor send
  const aiTutorInput = document.getElementById("tutor-input");
  const aiTutorSendBtn = document.getElementById("btn-tutor-send");
  if (aiTutorSendBtn)
    aiTutorSendBtn.addEventListener("click", sendAiTutorMessage);
  if (aiTutorInput)
    aiTutorInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendAiTutorMessage();
      }
    });

  async function sendAiTutorMessage() {
    const text = aiTutorInput?.value?.trim();
    if (!text || !state.aiOnline) return;
    const tutorMessages = document.getElementById("tutor-messages");
    if (!tutorMessages) return;
    // Add user bubble
    const userBubble = document.createElement("div");
    userBubble.className = "ai-bubble user";
    userBubble.textContent = text;
    tutorMessages.appendChild(userBubble);
    aiTutorInput.value = "";

    const subject =
      document.querySelector("[data-tutor-subject].active")?.dataset
        .tutorSubject || "general";
    const socratic = document
      .getElementById("socratic-toggle")
      ?.classList.contains("on")
      ? "Use the Socratic method: guide me through questions rather than giving direct answers."
      : "";

    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfMeta?.content || "",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `[Tutor Mode - ${subject}] ${socratic} ${text}`,
            },
          ],
        }),
      });
      const data = await resp.json();
      const respBubble = document.createElement("div");
      respBubble.className = `ai-bubble ${resp.ok && data.message ? "assistant" : "error"}`;
      respBubble.textContent =
        data.message?.content || data.error || "Unknown error";
      tutorMessages.appendChild(respBubble);
      tutorMessages.scrollTop = tutorMessages.scrollHeight;
    } catch {
      const errBubble = document.createElement("div");
      errBubble.className = "ai-bubble error";
      errBubble.textContent = "Failed to reach AI service";
      tutorMessages.appendChild(errBubble);
    }
    tutorMessages.scrollTop = tutorMessages.scrollHeight;
  }

  // ──────────────────────────────────────────
  // SNAP & SOLVE
  // ──────────────────────────────────────────
  let snapImage = null;
  let snapPrompt =
    "Solve this question step by step. Show your work and give the final answer clearly.";
  let snapSolving = false;

  try {
    document.getElementById("snap-fab")?.addEventListener("click", () => {
      switchView("ai");
      document
        .querySelectorAll("[data-ai-mode]")
        .forEach((t) => t.classList.remove("active"));
      document.querySelector('[data-ai-mode="snap"]')?.classList.add("active");
      document.getElementById("ai-chat-panel")?.classList.add("hidden");
      document.getElementById("ai-vision-panel")?.classList.remove("hidden");
    });
  } catch (e) {}

  const snapDropZone = document.getElementById("vision-drop-zone");
  const snapFileInput = document.getElementById("vision-file-input");

  snapDropZone?.addEventListener("click", () => snapFileInput?.click());
  snapFileInput?.addEventListener("change", (e) => {
    if (e.target.files?.[0]) handleSnapFile(e.target.files[0]);
  });
  snapDropZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    snapDropZone.classList.add("dragover");
  });
  snapDropZone?.addEventListener("dragleave", () =>
    snapDropZone.classList.remove("dragover"),
  );
  snapDropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    snapDropZone.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (file?.type.startsWith("image/")) handleSnapFile(file);
  });

  document.addEventListener("paste", (e) => {
    const snapPanel = document.getElementById("ai-vision-panel");
    if (snapPanel?.classList.contains("hidden") && state.currentView !== "ai")
      return;
    for (const item of e.clipboardData?.items || []) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          switchView("ai");
          document
            .querySelectorAll("[data-ai-mode]")
            .forEach((t) => t.classList.remove("active"));
          document
            .querySelector('[data-ai-mode="snap"]')
            ?.classList.add("active");
          document.getElementById("ai-chat-panel")?.classList.add("hidden");
          document
            .getElementById("ai-vision-panel")
            ?.classList.remove("hidden");
          handleSnapFile(file);
        }
        break;
      }
    }
  });

  function handleSnapFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      snapImage = e.target.result;
      const previewImg = document.getElementById("snap-preview-img");
      if (previewImg) previewImg.src = snapImage;
      document
        .getElementById("snap-preview-container")
        ?.classList.remove("hidden");
      document.getElementById("vision-drop-zone")?.classList.add("hidden");
      document.getElementById("snap-solve-btn") &&
        (document.getElementById("snap-solve-btn").disabled = false);
      document.getElementById("snap-result")?.classList.add("hidden");
    };
    reader.readAsDataURL(file);
  }

  document.getElementById("snap-clear-btn")?.addEventListener("click", () => {
    snapImage = null;
    document.getElementById("snap-preview-container")?.classList.add("hidden");
    document.getElementById("vision-drop-zone")?.classList.remove("hidden");
    document.getElementById("snap-solve-btn") &&
      (document.getElementById("snap-solve-btn").disabled = true);
    document.getElementById("snap-result")?.classList.add("hidden");
    if (snapFileInput) snapFileInput.value = "";
  });

  document.querySelectorAll(".snap-prompt-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      document
        .querySelectorAll(".snap-prompt-pill")
        .forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      snapPrompt = pill.dataset.snapPrompt;
    });
  });
  document.querySelector(".snap-prompt-pill")?.classList.add("active");

  document.getElementById("snap-solve-btn")?.addEventListener("click", () => {
    if (!snapImage || snapSolving || !state.aiOnline) return;
    solveSnap();
  });

  async function solveSnap() {
    snapSolving = true;
    const solveBtn = document.getElementById("snap-solve-btn");
    const resultDiv = document.getElementById("snap-result");
    const resultContent = document.getElementById("snap-result-content");
    if (solveBtn) {
      solveBtn.disabled = true;
      solveBtn.textContent = "Solving...";
    }
    resultDiv?.classList.add("hidden");

    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const resp = await fetch("/api/ai/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfMeta?.content || "",
        },
        body: JSON.stringify({ image: snapImage, prompt: snapPrompt }),
      });
      const data = await resp.json();
      if (resp.ok && data.message) {
        if (resultContent) resultContent.textContent = data.message.content;
        resultDiv?.classList.remove("hidden");
        unlockAchievement("snap-solve");
      } else {
        showToast(data.error || "Failed to solve", "error");
      }
    } catch {
      showToast("Failed to reach AI service", "error");
    } finally {
      snapSolving = false;
      if (solveBtn) {
        solveBtn.disabled = false;
        solveBtn.textContent = "Solve Question";
      }
    }
  }

  document.getElementById("snap-copy-btn")?.addEventListener("click", () => {
    const content = document.getElementById("snap-result-content")?.textContent;
    if (content) {
      navigator.clipboard
        .writeText(content)
        .then(() => showToast("Answer copied", "accent"))
        .catch(() => showToast("Failed to copy", "error"));
    }
  });

  // ──────────────────────────────────────────
  // STATS UPDATE
  // ──────────────────────────────────────────
  function updateStats() {
    const els = {
      "stat-games-played": state.gamesPlayed,
      "stat-pages-browsed": state.pagesLoaded,
      "stat-ai-chats": state.aiMessagesSent,
    };
    for (const [id, val] of Object.entries(els)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  }

  // ──────────────────────────────────────────
  // HEALTH CHECK
  // ──────────────────────────────────────────
  async function healthCheck() {
    try {
      const resp = await fetch("/health");
      const data = await resp.json();
      const dot = document.getElementById("status-connection");
      const browserDot = document.getElementById("browser-connection-dot");
      [dot, browserDot].forEach((d) => {
        if (!d) return;
        d.className =
          data.status === "ok" ? "connection-dot" : "connection-dot warning";
        if (d.classList.contains("browser-dot")) d.className += " browser-dot";
      });

      const engineStatus = document.getElementById("engine-status");
      if (engineStatus) {
        engineStatus.textContent = `UV: ${data.engines?.uv ? "OK" : "Down"} | SJ: ${data.engines?.scramjet ? "OK" : "Down"}`;
        engineStatus.style.color =
          data.engines?.uv && data.engines?.scramjet
            ? "var(--success)"
            : "var(--warning)";
      }

      const wispStatus = document.getElementById("wisp-status");
      if (wispStatus) {
        wispStatus.textContent = data.wisp ? "Connected" : "Down";
        wispStatus.style.color = data.wisp ? "var(--success)" : "var(--error)";
      }

      const proxyState = document.getElementById("status-proxy-state");
      if (proxyState) {
        const indicator = proxyState.querySelector(".status-indicator");
        const label = proxyState.querySelector("span:last-child");
        if (indicator)
          indicator.className = `status-indicator ${data.status === "ok" ? "active" : "warning"}`;
        if (label)
          label.textContent = data.status === "ok" ? "Proxy Ready" : "Issues";
      }
    } catch {
      const dot = document.getElementById("status-connection");
      const browserDot = document.getElementById("browser-connection-dot");
      [dot, browserDot].forEach((d) => {
        if (d) {
          d.className = "connection-dot error";
          if (d.classList.contains("browser-dot"))
            d.className += " browser-dot";
        }
      });
    }
  }

  setInterval(healthCheck, 30000);

  // ──────────────────────────────────────────
  // SETTINGS
  // ──────────────────────────────────────────
  document
    .getElementById("setting-engine")
    ?.addEventListener("change", (e) => setEngine(e.target.value));
  document.getElementById("cloak-select")?.addEventListener("change", (e) => {
    applyCloak(e.target.value);
    showToast(
      `Tab cloaked as ${CLOAKS[e.target.value]?.title || "None"}`,
      "accent",
    );
  });

  document.getElementById("btn-stealth")?.addEventListener("click", () => {
    document.getElementById("stealth-bar")?.classList.toggle("hidden");
  });

  document.getElementById("btn-change-panic")?.addEventListener("click", () => {
    state.changingPanicKey = true;
    const el = document.getElementById("setting-panic-key");
    if (el) el.textContent = "...";
    showToast("Press any key to set as panic key", "accent");
  });

  // Idle timeout setting
  const idleInput = document.getElementById("setting-idle-seconds");
  if (idleInput) {
    idleInput.value = localStorage.getItem("strato-idleSeconds") || "45";
    idleInput.addEventListener("change", (e) => {
      localStorage.setItem("strato-idleSeconds", e.target.value);
      showToast(`Auto-cloak timeout: ${e.target.value}s`, "accent");
    });
  }

  // Auto-stealth toggle (enable/disable idle auto-cloak)
  const autoStealthToggle = document.getElementById("auto-stealth");
  if (autoStealthToggle) {
    autoStealthToggle.checked =
      localStorage.getItem("strato-auto-stealth") !== "false";
    autoStealthToggle.addEventListener("change", () => {
      localStorage.setItem("strato-auto-stealth", autoStealthToggle.checked);
    });
  }

  // Breadcrumb setting
  const breadcrumbInput = document.getElementById("setting-breadcrumb");
  if (breadcrumbInput) {
    breadcrumbInput.value =
      localStorage.getItem("strato-breadcrumb") ||
      "Classroom > AP History > Unit 4";
    breadcrumbInput.addEventListener("input", (e) => {
      updateBreadcrumb(e.target.value);
    });
  }

  // Settings nav
  document.querySelectorAll(".settings-nav-btn").forEach((item) => {
    item.addEventListener("click", () => {
      document
        .querySelectorAll(".settings-nav-btn")
        .forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      const section = item.dataset.settingsTab;
      if (section) {
        document
          .querySelectorAll(".settings-section")
          .forEach((s) => (s.style.display = "none"));
        const target = document.getElementById(`settings-${section}`);
        if (target) target.style.display = "";
      }
    });
  });

  // Accent color picker
  document.querySelectorAll(".swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      const color = swatch.dataset.color;
      document.documentElement.setAttribute("data-accent", color);
      state.accentColor = color;
      localStorage.setItem("strato-accent", color);
      document
        .querySelectorAll(".swatch")
        .forEach((s) => s.classList.remove("active"));
      swatch.classList.add("active");
      unlockAchievement("theme-change");
      showToast(`Accent changed to ${color}`, "accent");
    });
  });

  // Apply saved color swatch
  document
    .querySelector(`.swatch[data-color="${state.accentColor}"]`)
    ?.classList.add("active");

  // Particles toggle
  const particlesToggle = document.getElementById("setting-particles");
  if (particlesToggle) {
    if (state.particlesEnabled) particlesToggle.classList.add("on");
    else particlesToggle.classList.remove("on");
    particlesToggle.addEventListener("click", () => {
      state.particlesEnabled = !state.particlesEnabled;
      localStorage.setItem("strato-particles", String(state.particlesEnabled));
      particlesToggle.classList.toggle("on");
      const particleCanvas = document.getElementById("particles-canvas");
      if (particleCanvas)
        particleCanvas.style.display = state.particlesEnabled ? "" : "none";
      document
        .querySelectorAll(".bg-orb, .bg-grid, .bg-scanlines")
        .forEach((el) => {
          el.style.display = state.particlesEnabled ? "" : "none";
        });
    });
  }

  // Animations toggle
  const animationsToggle = document.getElementById("setting-animations");
  if (animationsToggle) {
    if (state.animationsEnabled) animationsToggle.classList.add("on");
    else animationsToggle.classList.remove("on");
    animationsToggle.addEventListener("click", () => {
      state.animationsEnabled = !state.animationsEnabled;
      localStorage.setItem(
        "strato-animations",
        String(state.animationsEnabled),
      );
      animationsToggle.classList.toggle("on");
      document.body.style.setProperty(
        "--duration-fast",
        state.animationsEnabled ? "0.12s" : "0s",
      );
      document.body.style.setProperty(
        "--duration-normal",
        state.animationsEnabled ? "0.25s" : "0s",
      );
    });
  }

  // Clear all data
  document
    .getElementById("clear-all-data-btn")
    ?.addEventListener("click", () => {
      localStorage.clear();
      indexedDB.deleteDatabase("stratoVault");
      showToast("All data cleared", "accent");
      setTimeout(() => location.reload(), 1000);
    });

  // Keyboard shortcuts overlay
  function toggleShortcuts() {
    const overlay = document.getElementById("shortcuts-overlay");
    if (overlay) overlay.classList.toggle("hidden");
  }

  try {
    document
      .getElementById("shortcuts-btn")
      ?.addEventListener("click", toggleShortcuts);
  } catch (e) {}
  document
    .getElementById("btn-close-shortcuts")
    ?.addEventListener("click", () => {
      document.getElementById("shortcuts-overlay")?.classList.add("hidden");
    });

  // Theme cycle button
  document.getElementById("theme-cycle-btn")?.addEventListener("click", () => {
    const colors = ["cyan", "purple", "pink", "green", "orange", "red"];
    const currentIdx = colors.indexOf(state.accentColor);
    const nextIdx = (currentIdx + 1) % colors.length;
    const nextColor = colors[nextIdx];
    document.documentElement.setAttribute("data-accent", nextColor);
    state.accentColor = nextColor;
    localStorage.setItem("strato-accent", nextColor);
    document
      .querySelectorAll(".swatch")
      .forEach((s) =>
        s.classList.toggle("active", s.dataset.color === nextColor),
      );
    unlockAchievement("theme-change");
    showToast(`Accent: ${nextColor}`, "accent");
  });

  // ──────────────────────────────────────────
  // USERNAME DISPLAY
  // ──────────────────────────────────────────
  function getUsername() {
    return localStorage.getItem("strato-username") || "";
  }

  // ──────────────────────────────────────────
  // STRATO COINS
  // ──────────────────────────────────────────
  function addCoins(amount) {
    state.coins += amount;
    localStorage.setItem("strato-coins", String(state.coins));
    updateCoinsDisplay();
    // XP is handled separately via StratoProfile.addXPAction()
    // to avoid double-counting (coins + action-type XP)
    // Show popup animation
    const popup = document.createElement("div");
    popup.className = "coin-popup";
    popup.textContent = `+${amount} coins`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 2200);
  }

  function updateCoinsDisplay() {
    const el = document.getElementById("status-coins");
    if (el) {
      const coinSpan = el.querySelector("span");
      if (coinSpan) coinSpan.textContent = state.coins;
      else el.textContent = state.coins;
    }
  }

  // ──────────────────────────────────────────
  // HUB — SITE DIRECTORY
  // ──────────────────────────────────────────
  let hubSearchDebounce = null;

  async function loadHubSites() {
    try {
      const resp = await fetch("/api/hub/sites");
      if (!resp.ok) throw new Error("Failed to load hub");
      const data = await resp.json();
      state.hubSites = data.sites || [];
      state.filteredHubSites = [...state.hubSites];
      renderHubSites();
      const countEl = document.getElementById("hub-site-count");
      if (countEl) countEl.textContent = `${state.hubSites.length} sites`;
      const badgeEl = document.getElementById("hub-badge");
      if (badgeEl) badgeEl.textContent = state.hubSites.length;
      const homeCountEl = document.getElementById("home-hub-count");
      if (homeCountEl) homeCountEl.textContent = state.hubSites.length;
    } catch (err) {
      showToast("Failed to load Hub directory", "error");
    }
  }

  function renderHubSites() {
    const grid = document.getElementById("hub-grid");
    if (!grid) return;
    const topTierOnly =
      document.getElementById("hub-top-tier-toggle")?.checked || false;
    let sites = state.filteredHubSites;
    if (topTierOnly) sites = sites.filter((s) => s.stars === 3);

    grid.innerHTML = sites
      .map((site) => {
        const stars = Array.from(
          { length: 3 },
          (_, i) =>
            `<svg class="hub-star ${i < site.stars ? "filled" : ""}" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>`,
        ).join("");
        const safeBadge = site.iframe_safe
          ? '<span class="hub-badge-iframe-safe">iframe-safe</span>'
          : "";
        // Tier badge for community proxy/hub sites
        let tierBadge = "";
        if (site.tier_badge === "good")
          tierBadge =
            '<span class="hub-tier-badge tier-good">&#9733; Good Proxy</span>';
        else if (site.tier_badge === "recommended")
          tierBadge =
            '<span class="hub-tier-badge tier-recommended">&#9734; Recommended</span>';
        // Password hint
        const passwordHint = site.password
          ? `<span class="hub-password-hint">&#128272; ${escapeHtml(site.password)}</span>`
          : "";
        return `
        <div class="hub-card" data-hub-url="${escapeHtml(site.url)}" data-hub-safe="${site.iframe_safe}">
          <div class="hub-card-top">
            <span class="hub-card-name">${escapeHtml(site.name)}</span>
            <span class="hub-card-stars">${stars}</span>
          </div>
          <p class="hub-card-desc">${escapeHtml(site.description)}</p>
          <div class="hub-card-bottom">
            <span class="hub-card-category ${escapeHtml(site.category)}">${escapeHtml(site.category)}</span>
            ${safeBadge}
            ${tierBadge}
            ${passwordHint}
            <button class="hub-card-open-btn" data-hub-launch="${escapeHtml(site.url)}" data-hub-safe="${site.iframe_safe}">Open</button>
          </div>
        </div>`;
      })
      .join("");

    // Attach click handlers for open buttons
    grid.querySelectorAll(".hub-card-open-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const url = btn.dataset.hubLaunch;
        const safe = btn.dataset.hubSafe === "true";
        launchSiteViaProxy(url, safe);
      });
    });
  }

  function launchSiteViaProxy(url, iframeSafe) {
    if (iframeSafe) {
      // Load in the browser iframe view
      navigateProxy(url);
      addCoins(2);
    } else {
      // Open in about:blank cloaked tab for non-iframe-safe sites
      launchCloakedProxy(url);
      addCoins(1);
    }
  }

  // launchCloakedProxy is defined in the new features section below

  // Hub search
  const hubSearchInput = document.getElementById("hub-search");
  if (hubSearchInput) {
    hubSearchInput.addEventListener("input", () => {
      clearTimeout(hubSearchDebounce);
      hubSearchDebounce = setTimeout(() => {
        const q = hubSearchInput.value.toLowerCase().trim();
        state.filteredHubSites = state.hubSites.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q),
        );
        renderHubSites();
      }, 200);
    });
  }

  // Hub category filter
  const hubCategoryFilter = document.getElementById("hub-category-filter");
  if (hubCategoryFilter) {
    hubCategoryFilter.addEventListener("change", () => {
      const cat = hubCategoryFilter.value;
      if (cat === "all") {
        state.filteredHubSites = [...state.hubSites];
      } else {
        state.filteredHubSites = state.hubSites.filter(
          (s) => s.category === cat,
        );
      }
      // Re-apply search filter
      const q = hubSearchInput?.value?.toLowerCase().trim();
      if (q) {
        state.filteredHubSites = state.filteredHubSites.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q),
        );
      }
      renderHubSites();
    });
  }

  // Hub top tier toggle
  document
    .getElementById("hub-top-tier-toggle")
    ?.addEventListener("change", renderHubSites);

  // Hub quick launch buttons
  document.querySelectorAll(".hub-quick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = btn.dataset.hubUrl;
      const safe = btn.dataset.hubSafe === "true";
      if (url) launchSiteViaProxy(url, safe);
    });
  });

  // Hub error overlay handlers
  document
    .getElementById("hub-error-other-engine")
    ?.addEventListener("click", () => {
      const otherEngine = state.currentEngine === "uv" ? "scramjet" : "uv";
      setEngine(otherEngine);
      const url = document.getElementById("url-input")?.value;
      if (url) navigateProxy(url, otherEngine);
      document.getElementById("hub-error-overlay")?.classList.add("hidden");
    });

  document
    .getElementById("hub-error-new-tab")
    ?.addEventListener("click", () => {
      const url = document.getElementById("url-input")?.value;
      if (url) launchCloakedProxy(url);
      document.getElementById("hub-error-overlay")?.classList.add("hidden");
    });

  // ──────────────────────────────────────────
  // DAILY CHALLENGES
  // ──────────────────────────────────────────
  function initDailyChallenges() {
    const today = new Date().toDateString();
    if (state.dailyChallenges.date !== today) {
      // Reset challenges for new day
      state.dailyChallenges = {
        date: today,
        gamesPlayed: 0,
        pagesLoaded: 0,
        aiMessagesSent: 0,
        completed: { play: false, browse: false, chat: false },
      };
      localStorage.setItem(
        "strato-dailyChallenges",
        JSON.stringify(state.dailyChallenges),
      );
    }
    renderDailyChallenges();
  }

  function updateDailyChallengeProgress(type) {
    if (!state.dailyChallenges.date) return;
    if (type === "play") {
      state.dailyChallenges.gamesPlayed =
        (state.dailyChallenges.gamesPlayed || 0) + 1;
      if (
        state.dailyChallenges.gamesPlayed >= 3 &&
        !state.dailyChallenges.completed?.play
      ) {
        if (!state.dailyChallenges.completed)
          state.dailyChallenges.completed = {};
        state.dailyChallenges.completed.play = true;
        addCoins(5);
        showToast("Daily challenge complete: Play 3 games!", "accent");
      }
    } else if (type === "browse") {
      state.dailyChallenges.pagesLoaded =
        (state.dailyChallenges.pagesLoaded || 0) + 1;
      if (
        state.dailyChallenges.pagesLoaded >= 5 &&
        !state.dailyChallenges.completed?.browse
      ) {
        if (!state.dailyChallenges.completed)
          state.dailyChallenges.completed = {};
        state.dailyChallenges.completed.browse = true;
        addCoins(5);
        showToast("Daily challenge complete: Browse 5 pages!", "accent");
      }
    } else if (type === "chat") {
      state.dailyChallenges.aiMessagesSent =
        (state.dailyChallenges.aiMessagesSent || 0) + 1;
      if (
        state.dailyChallenges.aiMessagesSent >= 2 &&
        !state.dailyChallenges.completed?.chat
      ) {
        if (!state.dailyChallenges.completed)
          state.dailyChallenges.completed = {};
        state.dailyChallenges.completed.chat = true;
        addCoins(5);
        showToast("Daily challenge complete: Chat with AI 2x!", "accent");
      }
    }
    localStorage.setItem(
      "strato-dailyChallenges",
      JSON.stringify(state.dailyChallenges),
    );
    renderDailyChallenges();
  }

  function renderDailyChallenges() {
    const playProgress = document.getElementById("challenge-play-progress");
    const playCount = document.getElementById("challenge-play-count");
    const browseProgress = document.getElementById("challenge-browse-progress");
    const browseCount = document.getElementById("challenge-browse-count");
    const chatProgress = document.getElementById("challenge-chat-progress");
    const chatCount = document.getElementById("challenge-chat-count");

    const ch = state.dailyChallenges;
    const gamesPlayed = ch.gamesPlayed || 0;
    const pagesLoaded = ch.pagesLoaded || 0;
    const aiMessagesSent = ch.aiMessagesSent || 0;

    if (playProgress)
      playProgress.style.width = `${Math.min(100, (gamesPlayed / 3) * 100)}%`;
    if (playCount) playCount.textContent = `${gamesPlayed}/3`;
    if (browseProgress)
      browseProgress.style.width = `${Math.min(100, (pagesLoaded / 5) * 100)}%`;
    if (browseCount) browseCount.textContent = `${pagesLoaded}/5`;
    if (chatProgress)
      chatProgress.style.width = `${Math.min(100, (aiMessagesSent / 2) * 100)}%`;
    if (chatCount) chatCount.textContent = `${aiMessagesSent}/2`;

    // Mark completed items
    document.querySelectorAll(".challenge-item").forEach((item) => {
      const challenge = item.dataset.challenge;
      if (challenge === "play-games" && ch.completed?.play)
        item.classList.add("completed");
      if (challenge === "browse-sites" && ch.completed?.browse)
        item.classList.add("completed");
      if (challenge === "chat-ai" && ch.completed?.chat)
        item.classList.add("completed");
    });
  }

  // ──────────────────────────────────────────
  // CLOAKED PROXY LAUNCHER (about:blank)
  // ──────────────────────────────────────────
  function launchCloakedProxy(url) {
    const proxyUrl = getProxyUrl(url);
    if (!proxyUrl) return;
    const cloak = CLOAKS[state.activeCloak] || CLOAKS["classroom"];
    const newWin = window.open("about:blank", "_blank");
    if (!newWin) {
      showToast("Popup blocked — allow popups for cloaked launch", "error");
      return;
    }
    try {
      const doc = newWin.document;
      doc.open();
      doc.write(
        `<!DOCTYPE html><html><head><title>${cloak.title}</title><link rel="icon" href="${cloak.favicon}"><style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:none}</style></head><body><iframe src="${proxyUrl}"></iframe><script>document.addEventListener('keydown',function(e){if(e.ctrlKey&&e.key==='l'){e.preventDefault();window.location.href=window.location.origin}})</script></body></html>`,
      );
      doc.close();
      showToast("Cloaked window launched", "accent");
      logActivity("Launched cloaked proxy", "proxy");
    } catch (e) {
      showToast("Failed to write cloaked window", "error");
    }
  }

  document
    .getElementById("browser-cloaked-btn")
    ?.addEventListener("click", () => {
      const url = document.getElementById("url-input")?.value;
      if (url) launchCloakedProxy(url);
    });

  // ──────────────────────────────────────────
  // PROXY HEALTH CHECK (stealth bar)
  // ──────────────────────────────────────────
  let proxyHealth = {
    uv: false,
    scramjet: false,
    bare: false,
    wisp: false,
    lastChecked: 0,
  };

  async function checkProxyHealth() {
    try {
      const resp = await fetch("/api/proxy/health");
      proxyHealth = await resp.json();
      updateStealthBar();
    } catch (e) {
      proxyHealth = {
        uv: false,
        scramjet: false,
        bare: false,
        wisp: false,
        lastChecked: Date.now(),
      };
      updateStealthBar();
    }
  }

  function updateStealthBar() {
    const dot = document.getElementById("stealth-health-dot");
    if (!dot) return;
    const up = [
      proxyHealth.uv,
      proxyHealth.scramjet,
      proxyHealth.bare,
      proxyHealth.wisp,
    ];
    const upCount = up.filter(Boolean).length;
    if (upCount >= 3) {
      dot.className = "stealth-health-dot healthy";
      dot.title = "All systems go";
    } else if (upCount >= 1) {
      dot.className = "stealth-health-dot warning";
      dot.title = "Partial service";
    } else {
      dot.className = "stealth-health-dot error";
      dot.title = "Service down";
    }
  }

  setInterval(checkProxyHealth, 30000);
  checkProxyHealth();

  // Stealth bar: cloak switcher
  document
    .getElementById("stealth-cloak-switcher")
    ?.addEventListener("change", (e) => {
      applyCloak(e.target.value);
      showToast(
        `Tab cloaked as ${CLOAKS[e.target.value]?.title || "None"}`,
        "accent",
      );
    });

  // Stealth bar: breadcrumb text from settings
  const savedBreadcrumb =
    localStorage.getItem("strato-breadcrumb") ||
    "Classroom > AP History > Unit 4";
  const breadcrumbEl = document.getElementById("stealth-breadcrumb");
  if (breadcrumbEl) breadcrumbEl.textContent = savedBreadcrumb;

  function updateBreadcrumb(text) {
    localStorage.setItem("strato-breadcrumb", text);
    if (breadcrumbEl) breadcrumbEl.textContent = text;
  }

  // ──────────────────────────────────────────
  // COMMAND PALETTE (Cmd+K / Ctrl+K)
  // ──────────────────────────────────────────
  const commandPalette = document.getElementById("command-palette");
  const cpInput = document.getElementById("command-input");
  const cpResults = document.getElementById("command-results");

  function openCommandPalette() {
    if (!commandPalette) return;
    cpOpen = true;
    commandPalette.classList.remove("hidden");
    cpInput.value = "";
    cpInput.focus();
    renderCommandResults("");
  }

  function closeCommandPalette() {
    if (!commandPalette) return;
    cpOpen = false;
    commandPalette.classList.add("hidden");
    cpInput.value = "";
  }

  function renderCommandResults(query) {
    if (!cpResults) return;
    const q = query.toLowerCase().trim();
    const results = [];

    // Search games
    if (state.games.length > 0) {
      const gameResults = q
        ? state.games
            .filter(
              (g) =>
                g.name.toLowerCase().includes(q) ||
                (g.category || "").toLowerCase().includes(q),
            )
            .slice(0, 5)
        : state.games.slice(0, 5);
      gameResults.forEach((g) =>
        results.push({
          type: "game",
          label: g.name,
          sub: g.category,
          action: () => {
            closeCommandPalette();
            launchGame(g.id);
          },
        }),
      );
    }

    // Search quick links
    document.querySelectorAll(".quick-link-btn").forEach((btn) => {
      const name = btn.textContent.trim();
      const url = btn.dataset.url;
      if (
        !q ||
        name.toLowerCase().includes(q) ||
        url.toLowerCase().includes(q)
      ) {
        results.push({
          type: "link",
          label: name,
          sub: url,
          action: () => {
            closeCommandPalette();
            navigateProxy(url);
          },
        });
      }
    });

    // View switches
    VIEWS.forEach((v) => {
      if (!q || v.includes(q)) {
        results.push({
          type: "view",
          label: `Go to ${v.charAt(0).toUpperCase() + v.slice(1)}`,
          sub: "Switch view",
          action: () => {
            closeCommandPalette();
            switchView(v);
          },
        });
      }
    });

    // Actions
    const actions = [
      {
        label: "Panic",
        sub: "Activate panic mode",
        match: "panic",
        action: () => {
          closeCommandPalette();
          handlePanicKey();
        },
      },
      {
        label: "Cloak: Classroom",
        sub: "Switch cloak preset",
        match: "cloak classroom",
        action: () => {
          closeCommandPalette();
          applyCloak("classroom");
          showToast("Cloaked as Classroom", "accent");
        },
      },
      {
        label: "Cloak: Quizlet",
        sub: "Switch cloak preset",
        match: "cloak quizlet",
        action: () => {
          closeCommandPalette();
          applyCloak("quizlet");
          showToast("Cloaked as Quizlet", "accent");
        },
      },
      {
        label: "Cloak: Canvas",
        sub: "Switch cloak preset",
        match: "cloak canvas",
        action: () => {
          closeCommandPalette();
          applyCloak("canvas");
          showToast("Cloaked as Canvas", "accent");
        },
      },
      {
        label: "Cloak: None",
        sub: "Remove cloak",
        match: "cloak none",
        action: () => {
          closeCommandPalette();
          applyCloak("none");
          showToast("Cloak removed", "accent");
        },
      },
    ];
    actions.forEach((a) => {
      if (!q || a.label.toLowerCase().includes(q) || a.match.includes(q))
        results.push({
          type: "action",
          label: a.label,
          sub: a.sub,
          action: a.action,
        });
    });

    // If query looks like a URL, offer to proxy it
    if (q && (q.includes(".") || q.startsWith("http"))) {
      const url = q.startsWith("http") ? q : "https://" + q;
      results.unshift({
        type: "proxy",
        label: `Proxy: ${url}`,
        sub: "Open in browser",
        action: () => {
          closeCommandPalette();
          navigateProxy(url);
        },
      });
    }

    if (results.length === 0) {
      cpResults.innerHTML =
        '<div class="command-palette-empty">No results found</div>';
      return;
    }

    const typeLabels = {
      game: "Games",
      link: "Quick Links",
      view: "Views",
      action: "Actions",
      proxy: "Proxy",
    };
    let html = "";
    let lastType = "";
    results.slice(0, 12).forEach((r, i) => {
      if (r.type !== lastType) {
        html += `<div class="command-palette-group">${typeLabels[r.type] || r.type}</div>`;
        lastType = r.type;
      }
      html += `<div class="command-palette-item" data-cp-idx="${i}"><span class="cp-item-label">${r.label}</span><span class="cp-item-sub">${r.sub}</span></div>`;
    });
    cpResults.innerHTML = html;

    cpResults.querySelectorAll(".command-palette-item").forEach((item) => {
      item.addEventListener("click", () => {
        const idx = parseInt(item.dataset.cpIdx);
        if (results[idx]) results[idx].action();
      });
      item.addEventListener("mouseenter", () => {
        cpResults
          .querySelectorAll(".command-palette-item")
          .forEach((i) => i.classList.remove("selected"));
        item.classList.add("selected");
      });
    });
  }

  if (cpInput) {
    cpInput.addEventListener("input", () =>
      renderCommandResults(cpInput.value),
    );
    cpInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCommandPalette();
      }
      if (e.key === "Enter") {
        const sel = cpResults?.querySelector(
          ".command-palette-item.selected, .command-palette-item:first-child",
        );
        if (sel) sel.click();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = cpResults?.querySelectorAll(".command-palette-item");
        if (!items || items.length === 0) return;
        const currentIdx = Array.from(items).findIndex((i) =>
          i.classList.contains("selected"),
        );
        items.forEach((i) => i.classList.remove("selected"));
        let next = e.key === "ArrowDown" ? currentIdx + 1 : currentIdx - 1;
        if (next < 0) next = items.length - 1;
        if (next >= items.length) next = 0;
        items[next]?.classList.add("selected");
        items[next]?.scrollIntoView({ block: "nearest" });
      }
    });
  }

  document
    .getElementById("command-palette-backdrop")
    ?.addEventListener("click", closeCommandPalette);
  document
    .getElementById("command-palette-btn")
    ?.addEventListener("click", openCommandPalette);

  // ──────────────────────────────────────────
  // DAILY STREAK SYSTEM
  // ──────────────────────────────────────────
  function updateDailyStreak() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem("strato-lastVisit");
    let streak = parseInt(localStorage.getItem("strato-streak") || "0");

    if (lastVisit === today) {
      // Same day, no change
    } else if (lastVisit) {
      const lastDate = new Date(lastVisit);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate - lastDate) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 1) {
        streak++;
        localStorage.setItem("strato-streak", String(streak));
        showToast(`Day ${streak} streak! 🔥`, "accent");
      } else if (diffDays > 1) {
        streak = 1;
        localStorage.setItem("strato-streak", "1");
      }
    } else {
      streak = 1;
      localStorage.setItem("strato-streak", "1");
    }

    localStorage.setItem("strato-lastVisit", today);

    // Update display
    const countEl = document.getElementById("streak-count");
    const badgeEl = document.getElementById("streak-badge");
    if (countEl) countEl.textContent = streak;

    // Streak unlocks custom accent colors
    if (badgeEl) {
      badgeEl.className = "streak-badge";
      if (streak >= 14) {
        badgeEl.classList.add("rainbow");
        badgeEl.textContent = "🌈";
        // Apply rainbow cycling accent
        if (state.accentColor !== "rainbow") {
          state.accentColor = "rainbow";
          document.documentElement.setAttribute("data-accent", "cyan"); // base
          startRainbowCycle();
        }
      } else if (streak >= 7) {
        badgeEl.classList.add("gold");
        badgeEl.textContent = "⭐";
      } else if (streak >= 3) {
        badgeEl.classList.add("purple");
        badgeEl.textContent = "💜";
      }
    }
  }

  function startRainbowCycle() {
    const colors = ["cyan", "purple", "pink", "green", "orange", "red"];
    let idx = 0;
    setInterval(() => {
      if (state.accentColor !== "rainbow") return;
      idx = (idx + 1) % colors.length;
      document.documentElement.setAttribute("data-accent", colors[idx]);
    }, 3000);
  }

  updateDailyStreak();

  // ──────────────────────────────────────────
  // AUTO-CLOAK ON IDLE
  // ──────────────────────────────────────────
  let lastActivityTime = Date.now();
  let autoCloakActive = false;

  function getActivityIdleMs() {
    return parseInt(localStorage.getItem("strato-idleSeconds") || "45") * 1000;
  }

  function recordActivity() {
    lastActivityTime = Date.now();
    if (autoCloakActive) dismissAutoCloak();
  }

  function dismissAutoCloak() {
    autoCloakActive = false;
    const overlay = document.getElementById("auto-cloak-overlay");
    if (overlay) overlay.classList.add("hidden");
    // Restore original title/favicon
    const cloak = CLOAKS[state.activeCloak];
    if (cloak) {
      document.title = cloak.title;
      const icon = document.querySelector('link[rel="icon"]');
      if (icon) icon.href = cloak.favicon;
    }
  }

  function triggerAutoCloak() {
    autoCloakActive = true;
    const overlay = document.getElementById("auto-cloak-overlay");
    const iframe = document.getElementById("auto-cloak-iframe");
    if (!overlay || !iframe) return;

    // Change tab to Google Docs
    document.title = "Google Docs";
    const icon = document.querySelector('link[rel="icon"]');
    if (icon)
      icon.href =
        "https://fonts.gstatic.com/s/i/productlogos/docs_2020q4/v6/192px.svg";

    // Load a fake Google Doc in the overlay iframe
    iframe.srcdoc = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;padding:40px 80px;color:#333;background:#fff}h1{font-size:22px;font-weight:normal;margin-bottom:8px}p{font-size:14px;color:#666;line-height:1.6}.toolbar{height:40px;background:#f1f3f4;border-bottom:1px solid #dadce0;margin:-40px -80px 24px;padding:8px 80px;display:flex;gap:16px;align-items:center}.toolbar span{font-size:13px;color:#5f6368}</style></head><body><div class="toolbar"><span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Format</span><span>Tools</span></div><h1>Untitled document</h1><p>Start typing your document here...</p></body></html>`;
    overlay.classList.remove("hidden");
    logActivity("Auto-cloak activated (idle)", "proxy");
  }

  setInterval(() => {
    if (autoCloakActive) return;
    if (localStorage.getItem("strato-auto-stealth") === "false") return;
    const idleMs = Date.now() - lastActivityTime;
    if (idleMs >= getActivityIdleMs()) triggerAutoCloak();
  }, 2000);

  document.addEventListener("mousemove", recordActivity);
  document.addEventListener("keydown", recordActivity);
  document.addEventListener("mousedown", recordActivity);
  document.addEventListener("touchstart", recordActivity);

  // ──────────────────────────────────────────
  // FAVICON FALLBACK FOR BROKEN THUMBNAILS
  // ──────────────────────────────────────────
  function applyFaviconFallbacks(container) {
    const imgs = container.querySelectorAll(".game-card-thumb");
    imgs.forEach((img) => {
      if (img.dataset.fallbackAttached === "true") return;
      img.dataset.fallbackAttached = "true";
      const gameUrl = img.dataset.gameUrl;
      const gameName = img.dataset.gameName || "?";
      const fallbackSrc =
        img.dataset.fallbackSrc || fallbackThumbnail({ name: gameName });

      img.addEventListener("error", function onThumbError() {
        img.removeEventListener("error", onThumbError);

        const wrapper = img.closest(".game-card-inner");
        const useStaticFallback = () => {
          img.classList.add("game-card-thumb--fallback");
          img.style.display = "block";
          if (img.src !== fallbackSrc) img.src = fallbackSrc;
        };

        if (
          typeof window.FaviconFetcher === "undefined" ||
          !gameUrl ||
          /^\$\{/.test(gameUrl)
        ) {
          useStaticFallback();
          return;
        }

        if (!wrapper) {
          useStaticFallback();
          return;
        }

        window.FaviconFetcher.getFavicon(gameUrl)
          .then((faviconUrl) => {
            if (faviconUrl) {
              img.style.display = "none";
              const faviconImg = document.createElement("img");
              faviconImg.className = "game-card-thumb game-card-thumb--favicon";
              faviconImg.src = faviconUrl;
              faviconImg.alt = gameName;
              faviconImg.style.cssText =
                "object-fit:contain;padding:20px;background:var(--bg-elevated);";
              faviconImg.addEventListener("error", () => {
                faviconImg.remove();
                insertInitialPlaceholder(wrapper, gameName);
              });
              wrapper.insertBefore(faviconImg, wrapper.firstChild);
            } else {
              useStaticFallback();
            }
          })
          .catch(useStaticFallback);
      });
    });
  }

  function insertInitialPlaceholder(wrapper, gameName) {
    if (wrapper.querySelector(".game-card-initial")) return;
    const firstLetter = (gameName || "?").charAt(0).toUpperCase();
    const colors = [
      "#00e5ff",
      "#a855f7",
      "#f472b6",
      "#22c55e",
      "#fb923c",
      "#ef4444",
    ];
    const color = colors[firstLetter.charCodeAt(0) % colors.length];
    if (typeof window.FaviconFetcher !== "undefined") {
      const svg = window.FaviconFetcher.renderInitial(firstLetter, color);
      const div = document.createElement("div");
      div.className = "game-card-initial";
      div.style.cssText =
        "width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:var(--bg-elevated);";
      div.innerHTML = svg;
      wrapper.insertBefore(div, wrapper.firstChild);
    }
  }

  // ──────────────────────────────────────────
  // PRELOAD-ON-HOVER
  // ──────────────────────────────────────────
  let hoverPrefetchTimer = null;
  let hoverPrefetchLink = null;

  function startHoverPrefetch(proxyUrl) {
    clearHoverPrefetch();
    hoverPrefetchTimer = setTimeout(() => {
      hoverPrefetchLink = document.createElement("link");
      hoverPrefetchLink.rel = "prefetch";
      hoverPrefetchLink.href = proxyUrl;
      document.head.appendChild(hoverPrefetchLink);
    }, 400);
  }

  function clearHoverPrefetch() {
    clearTimeout(hoverPrefetchTimer);
    if (hoverPrefetchLink) {
      hoverPrefetchLink.remove();
      hoverPrefetchLink = null;
    }
  }

  // Attach hover prefetch to game cards after render
  function attachHoverPrefetch() {
    document.querySelectorAll(".game-card[data-game-id]").forEach((card) => {
      card.addEventListener("mouseenter", () => {
        const game = state.games.find((g) => g.id === card.dataset.gameId);
        if (!game || game.tier === 1 || game.tier === 2) return;
        const proxyUrl = getProxyUrl(game.url);
        if (proxyUrl) startHoverPrefetch(proxyUrl);
      });
      card.addEventListener("mouseleave", clearHoverPrefetch);
    });

    document.querySelectorAll(".quick-link-btn[data-url]").forEach((btn) => {
      btn.addEventListener("mouseenter", () => {
        const proxyUrl = getProxyUrl(btn.dataset.url);
        if (proxyUrl) startHoverPrefetch(proxyUrl);
      });
      btn.addEventListener("mouseleave", clearHoverPrefetch);
    });
  }

  // ──────────────────────────────────────────
  // SESSION PERSISTENCE
  // ──────────────────────────────────────────
  async function saveSession() {
    try {
      const db = await openVault();
      const tx = db.transaction(VAULT_STORE, "readwrite");
      const store = tx.objectStore(VAULT_STORE);
      store.put({
        gameId: "__session__",
        currentView: state.currentView,
        browserUrl: document.getElementById("url-input")?.value || "",
        searchInput:
          document.getElementById("url-input")?.value ||
          document.getElementById("game-search")?.value ||
          "",
        timestamp: Date.now(),
      });
    } catch (e) {}
  }

  async function restoreSession() {
    try {
      const db = await openVault();
      const tx = db.transaction(VAULT_STORE, "readonly");
      const store = tx.objectStore(VAULT_STORE);
      const req = store.get("__session__");
      return new Promise((resolve) => {
        req.onsuccess = () => {
          const session = req.result;
          if (
            session &&
            session.timestamp &&
            Date.now() - session.timestamp < 10 * 60 * 1000
          ) {
            resolve(session);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  // Auto-save session periodically
  setInterval(saveSession, 5000);

  // Check for session restore on load
  async function checkSessionRestore() {
    const session = await restoreSession();
    if (!session) return;
    showToast("Resume previous session?", "accent");
    // Auto-restore after a brief moment
    setTimeout(() => {
      if (session.currentView) switchView(session.currentView);
      if (session.browserUrl && session.currentView === "browser") {
        const urlInput = document.getElementById("url-input");
        if (urlInput) urlInput.value = session.browserUrl;
      }
      if (session.searchInput) {
        const searchInput = document.getElementById("game-search");
        if (searchInput) searchInput.value = session.searchInput;
      }
      showToast("Session restored", "accent");
    }, 1500);
  }

  // ──────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────

  // Safety: Always remove splash after max wait, even if init() crashes
  function forceRemoveSplash() {
    const splash = document.getElementById("splash");
    if (splash && !splash.classList.contains("fade-out")) {
      console.warn(
        "[STRATO] Force-removing splash screen (init may have crashed)",
      );
      splash.classList.add("fade-out");
      setTimeout(() => splash.remove(), 500);
    }
    const app = document.getElementById("app");
    if (app && app.classList.contains("hidden")) {
      app.classList.remove("hidden");
    }
  }
  // Hard limit: 15 seconds — app WILL show even if something hangs
  setTimeout(forceRemoveSplash, 15000);

  async function init() {
    const lp = localStorage.getItem('strato_low_power') === 'true';
    document.body.classList.toggle('low-power', lp);
    const lpToggle = document.getElementById('low-power-toggle');
    if (lpToggle) lpToggle.addEventListener('click', () => {
      document.body.classList.toggle('low-power');
      localStorage.setItem('strato_low_power', document.body.classList.contains('low-power'));
    });

    const splash = document.getElementById("splash");
    const splashBar = splash?.querySelector(".splash-bar");
    const splashStatus = splash?.querySelector(".splash-status");

    // Step 0: Fetch CSRF token before any API calls
    try {
      if (splashBar) splashBar.style.width = "10%";
      if (splashStatus) splashStatus.textContent = "Fetching security token...";
      // Mark bare dot as pending
      const bareDot = document.querySelector("#splash-engine-bare .splash-dot");
      if (bareDot) bareDot.classList.add("pending");

      const csrfResp = await fetch("/api/csrf-token");
      if (csrfResp.ok) {
        const csrfData = await csrfResp.json();
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        if (csrfMeta && csrfData.token)
          csrfMeta.setAttribute("content", csrfData.token);
        if (bareDot) {
          bareDot.classList.remove("pending");
          bareDot.classList.add("ready");
        }
      } else {
        if (bareDot) {
          bareDot.classList.remove("pending");
          bareDot.classList.add("error");
        }
      }
    } catch (e) {
      // Non-fatal — proceed without CSRF token
      const bareDot = document.querySelector("#splash-engine-bare .splash-dot");
      if (bareDot) {
        bareDot.classList.remove("pending");
        bareDot.classList.add("error");
      }
    }

    // Step 1: Transport
    try {
      if (splashBar) splashBar.style.width = "20%";
      if (splashStatus)
        splashStatus.textContent = "Initializing proxy transport...";

      // Mark UV/SJ dots as pending
      const uvDotEl = document.querySelector("#splash-engine-uv .splash-dot");
      const sjDotEl = document.querySelector("#splash-engine-sj .splash-dot");
      if (uvDotEl) uvDotEl.classList.add("pending");
      if (sjDotEl) sjDotEl.classList.add("pending");

      await new Promise((resolve) => {
        const onReady = (e) => {
          window.removeEventListener("proxy-ready", onReady);
          state.proxyReady = true;
          // Update splash engine indicators
          if (e.detail) {
            if (uvDotEl)
              uvDotEl.className = `splash-dot ${e.detail.uv ? "ready" : "error"}`;
            if (sjDotEl)
              sjDotEl.className = `splash-dot ${e.detail.scramjet ? "ready" : "error"}`;
          }
          resolve();
        };
        window.addEventListener("proxy-ready", onReady);
        setTimeout(() => {
          window.removeEventListener("proxy-ready", onReady);
          // Mark dots as error if timeout
          if (uvDotEl && uvDotEl.classList.contains("pending"))
            uvDotEl.className = "splash-dot error";
          if (sjDotEl && sjDotEl.classList.contains("pending"))
            sjDotEl.className = "splash-dot error";
          resolve();
        }, 8000);
      });
    } catch (e) {
      console.warn("[STRATO] Transport init failed:", e);
    }

    // Step 2: Load games
    try {
      if (splashBar) splashBar.style.width = "50%";
      if (splashStatus) splashStatus.textContent = "Loading game library...";
      await loadGames();
    } catch (e) {
      console.warn("[STRATO] Game loading failed:", e);
    }

    // Step 3: AI status
    try {
      if (splashBar) splashBar.style.width = "75%";
      if (splashStatus) splashStatus.textContent = "Checking AI service...";
      const aiDotEl = document.querySelector("#splash-engine-ai .splash-dot");
      if (aiDotEl) aiDotEl.classList.add("pending");
      await checkAiStatus();
      if (aiDotEl)
        aiDotEl.className = `splash-dot ${state.aiOnline ? "ready" : "error"}`;
    } catch (e) {
      console.warn("[STRATO] AI status check failed:", e);
    }

    // Step 4: Health check
    try {
      if (splashBar) splashBar.style.width = "90%";
      if (splashStatus) splashStatus.textContent = "Running health check...";
      await healthCheck();
    } catch (e) {
      console.warn("[STRATO] Health check failed:", e);
    }

    // Mark remaining splash indicators (wisp always ready since server is up)
    try {
      const wispDotEl = document.querySelector(
        "#splash-engine-wisp .splash-dot",
      );
      if (wispDotEl) wispDotEl.className = "splash-dot ready";
    } catch (e) {}

    // Step 5: Apply settings — each wrapped individually so one failure doesn't block the rest
    if (splashBar) splashBar.style.width = "100%";
    if (splashStatus) splashStatus.textContent = "Ready";

    try {
      if (state.activeCloak !== "none") applyCloak(state.activeCloak);
    } catch (e) {}
    try {
      setEngine(state.currentEngine);
    } catch (e) {}
    try {
      updateCacheSize();
    } catch (e) {}
    try {
      updateStats();
    } catch (e) {}
    try {
      renderAchievements();
    } catch (e) {}
    try {
      renderActivity();
    } catch (e) {}
    try {
      updateCoinsDisplay();
    } catch (e) {}
    try {
      initDailyChallenges();
    } catch (e) {}
    try {
      checkSessionRestore();
    } catch (e) {}

    // Apply particles/animations settings
    try {
      if (!state.particlesEnabled) {
        const canvas = document.getElementById("particles-canvas");
        if (canvas) canvas.style.display = "none";
      }
    } catch (e) {}

    // Load Hub sites
    try {
      loadHubSites();
    } catch (e) {}

    // Username
    try {
      const usernameEl =
        document.getElementById("status-username") ||
        document.getElementById("username-display");
      const homeUsernameEl = document.getElementById("home-username");
      const username = getUsername();
      if (usernameEl && username) usernameEl.textContent = `@${username}`;
      if (homeUsernameEl && username) homeUsernameEl.textContent = username;
    } catch (e) {}

    // Unlock first launch (wrapped — addCoins/addXP errors must not block UI)
    try {
      unlockAchievement("first-launch");
    } catch (e) {
      console.warn("[STRATO] Achievement unlock error:", e);
    }

    // Welcome notification
    try {
      addNotification("STRATO v5.01 loaded", "info");
    } catch (e) {}

    // Fade out splash — ALWAYS runs even if earlier steps had errors
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => splash.remove(), 500);
    }

    const appEl = document.getElementById("app");
    if (appEl) appEl.classList.remove("hidden");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
