import { setGames } from "./core/state.js";
import { state } from "./core/state.js";
import * as db from "./core/db.js";
import { findGame, nameOf } from "./core/catalog.js";
import { normalizeGame } from "./core/catalog.js";
import { dismissHint, isHintDismissed } from "./core/storage.js";
import {
  resolveProxyLaunchUrl,
  reportProxyBlockedOrFailed,
  reportProxyInternalError,
  reportProxyIframeLoaded,
} from "./core/launch.js";
import { initHealthCache } from "./core/health.js";
import { createHomeController } from "./ui/home.js";
import { bindSettings } from "./ui/settings.js";
import { withTimeout } from "./core/boot.js";

const CATALOG_DB_TIMEOUT_MS = 3500;
const CATALOG_FETCH_TIMEOUT_MS = 5000;
const CATALOG_WRITE_TIMEOUT_MS = 3500;

function setActiveView(viewName) {
  document
    .querySelectorAll(".view")
    .forEach((view) => view.classList.remove("active"));
  document.getElementById(`view-${viewName}`)?.classList.add("active");
  document
    .querySelectorAll(".nav-btn")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.view === viewName),
    );
}

function renderFirstRunHint(home) {
  if (isHintDismissed("v5-search-anything")) return;
  const target = document.querySelector(".hideout-search");
  if (!target || document.getElementById("v5-first-run-hint")) return;
  const hint = document.createElement("div");
  hint.className = "first-run-hint";
  hint.id = "v5-first-run-hint";
  hint.innerHTML =
    '<span>Search anything. Launch instantly.</span><button type="button">Got it</button>';
  target.appendChild(hint);
  hint.querySelector("button")?.addEventListener("click", () => {
    dismissHint("v5-search-anything");
    hint.remove();
    home.render();
  });
}

function renderLaunchBay() {
  const bay = document.getElementById("launch-bay-empty");
  if (!bay) return;
  const game = findGame(state.launchBay.gameId);
  const title = game ? nameOf(game) : "The Launch Bay is ready.";
  const copy =
    state.launchBay.status === "loading"
      ? `Loading ${title}…${state.launchBay.reason ? ` ${state.launchBay.reason}.` : ""}`
      : state.launchBay.status === "failed"
        ? `Launch paused: ${state.launchBay.reason || "route unavailable"}.`
        : state.launchBay.status === "loaded"
          ? `${title} is running in the Launch Bay.`
          : "Search from Home, pick something, and launch.";
  bay.dataset.state = state.launchBay.status;
  const h3 = bay.querySelector("h3");
  if (h3) h3.textContent = title;
  const p = bay.querySelector("p");
  if (p) p.textContent = copy;
}

function bindNavigation(home) {
  document.querySelectorAll("[data-home-nav]").forEach((button) => {
    button.addEventListener("click", () =>
      setActiveView(button.dataset.homeNav),
    );
  });

  const search = document.getElementById("home-search");
  let searchFrame = 0;
  const scheduleSearch = (value) => {
    const requestFrame =
      window.requestAnimationFrame ||
      ((callback) => window.setTimeout(callback, 16));
    const cancelFrame = window.cancelAnimationFrame || window.clearTimeout;
    if (searchFrame) cancelFrame(searchFrame);
    searchFrame = requestFrame(() => {
      searchFrame = 0;
      home.search(value);
    });
  };
  search?.addEventListener("input", (event) => {
    state.searchIndex = 0;
    scheduleSearch(event.target.value);
  });
  search?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      home.moveSearch(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      home.moveSearch(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      home.launchSelected();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.target.value = "";
      state.searchIndex = 0;
      if (searchFrame)
        (window.cancelAnimationFrame || window.clearTimeout)(searchFrame);
      searchFrame = 0;
      home.search("");
    }
  });

  document
    .getElementById("surprise-me")
    ?.addEventListener("click", () => home.surprise());
  document
    .getElementById("home-favorites-action")
    ?.addEventListener("click", () =>
      document
        .getElementById("home-favorites-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  document
    .getElementById("home-recent-action")
    ?.addEventListener("click", () =>
      document
        .getElementById("home-recent-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  document
    .querySelector("[data-focus-home-search]")
    ?.addEventListener("click", () => home.focusSearch());

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.getElementById("game-sheet-overlay")?.remove();
      document.getElementById("launch-failure-overlay")?.remove();
    }
  });
}

function bindLaunchBay() {
  const iframe = document.getElementById("proxy-iframe");
  const body = document.querySelector(".browser-body");
  // Proxy Containment Shield: keep same-origin proxy pages inside Launch Bay.
  const applyProxyContainmentShield = () => {
    try {
      const win = iframe?.contentWindow;
      const doc = win?.document;
      if (!win || !doc) return;

      doc.querySelectorAll('a[target="_blank"]').forEach((anchor) => {
        anchor.setAttribute("target", "_self");
      });

      if (!win.__strato_shield_active) {
        const originalOpen = win.open;
        win.open = function (url, target, features) {
          if (!target || target === "_blank") {
            win.location.href = url;
            return win;
          }
          return originalOpen.apply(this, [url, target, features]);
        };
        win.__strato_shield_active = true;
      }
    } catch {
      // Cross-origin frames may block shield injection until proxy rewriting finishes.
    }
  };
  const sync = () => {
    body?.classList.toggle(
      "has-launch",
      Boolean(iframe?.src && iframe.src !== window.location.href),
    );
    body?.classList.remove("is-loading");
    renderLaunchBay();
  };
  iframe?.addEventListener("load", () => {
    applyProxyContainmentShield();
    reportProxyIframeLoaded();
    sync();
  });
  iframe?.addEventListener("error", () => {
    reportProxyBlockedOrFailed();
    sync();
  });
  window.addEventListener("strato-proxy-internal-error", (event) => {
    reportProxyInternalError(event.detail || {});
    sync();
  });
  sync();
}

async function catalogVersion(games, surfaces) {
  const payload = JSON.stringify({ games, surfaces });
  if (!globalThis.crypto?.subtle || !globalThis.TextEncoder) {
    return String(Date.now());
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new globalThis.TextEncoder().encode(payload),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchCatalogFromNetwork() {
  const [gamesResponse, surfacesResponse] = await withTimeout(
    Promise.all([fetch("/assets/games.json"), fetch("/assets/surfaces.json")]),
    CATALOG_FETCH_TIMEOUT_MS,
    "catalog fetch",
  );
  if (!gamesResponse.ok) {
    throw new Error(`Catalog request failed: ${gamesResponse.status}`);
  }
  if (!surfacesResponse.ok) {
    throw new Error(`Surface request failed: ${surfacesResponse.status}`);
  }
  const [games, surfaces] = await Promise.all([
    gamesResponse.json(),
    surfacesResponse.json(),
  ]);
  return { games, surfaces, gamesResponse };
}

async function seedCatalogFromNetwork() {
  const { games, surfaces, gamesResponse } = await fetchCatalogFromNetwork();
  await withTimeout(
    Promise.all([db.putAll("games", games), db.putAll("surfaces", surfaces)]),
    CATALOG_WRITE_TIMEOUT_MS,
    "catalog cache write",
  );
  await withTimeout(
    Promise.all([
      db.setMeta(
        "catalogETag",
        gamesResponse.headers.get("ETag") || String(Date.now()),
      ),
      db.setMeta("catalogVersion", await catalogVersion(games, surfaces)),
    ]),
    CATALOG_WRITE_TIMEOUT_MS,
    "catalog metadata write",
  );
  return games;
}

async function loadCatalog() {
  await withTimeout(db.open(), CATALOG_DB_TIMEOUT_MS, "catalog database open");
  const cachedGames = await db.getAll("games");
  if (cachedGames.length > 0) return { games: cachedGames, fromCache: true };
  return { games: await seedCatalogFromNetwork(), fromCache: false };
}

function applyCatalog(games) {
  setGames(games, normalizeGame);
  initHealthCache(state.games);
}

function revalidateCatalog(home) {
  if (globalThis.navigator?.onLine === false) return;
  void (async () => {
    try {
      const etag = (await db.getMeta("catalogETag"))?.value;
      const headers = etag ? { "If-None-Match": etag } : {};
      const response = await fetch("/assets/games.json", {
        headers,
        cache: "no-store",
      });
      if (response.status === 304) return;
      if (response.status !== 200) return;
      const freshGames = await response.json();
      await db.putAll("games", freshGames);
      await db.setMeta(
        "catalogETag",
        response.headers.get("ETag") || String(Date.now()),
      );
      fetch("/assets/surfaces.json", { cache: "no-store" })
        .then(async (surfacesResponse) => {
          if (surfacesResponse.ok) {
            const freshSurfaces = await surfacesResponse.json();
            await db.putAll("surfaces", freshSurfaces);
            await db.setMeta(
              "catalogVersion",
              await catalogVersion(freshGames, freshSurfaces),
            );
          }
        })
        .catch(() => {});
      applyCatalog(freshGames);
      home.render();
      renderLaunchBay();
    } catch {
      // Cached catalog is already rendered; revalidation must stay silent.
    }
  })();
}

function isReloadNavigation() {
  const entries =
    globalThis.performance?.getEntriesByType?.("navigation") || [];
  return entries.some((entry) => entry.type === "reload");
}

export async function initOpenHome() {
  const catalog = await loadCatalog();
  applyCatalog(catalog.games);
  const home = createHomeController();
  window.STRATO_RESOLVE_PROXY_LAUNCH_URL = resolveProxyLaunchUrl;
  bindSettings({ onUpdate: () => home.render() });
  bindNavigation(home);
  bindLaunchBay();
  home.render();
  renderFirstRunHint(home);
  renderLaunchBay();
  if (catalog.fromCache && !isReloadNavigation()) revalidateCatalog(home);
  window.addEventListener("strato-open-home-refresh", () => {
    home.render();
    renderLaunchBay();
  });
  window.STRATO_OPEN_HOME_RUNTIME_ACTIVE = true;
  window.STRATO_V5_FRONTEND_VERSION = "5.0.3";
  window.STRATO_V5_HOME = home;
}
