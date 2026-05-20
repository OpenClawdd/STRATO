import { findGame } from "./catalog.js";
import { isLaunchable, launchability } from "./health.js";
import { setLaunchBay, setProxyLaunchTelemetry, state } from "./state.js";
import { keys, readJson, writeJson } from "./storage.js";

const LOCAL_PREFLIGHT_TIMEOUT_MS = 4000;
const PROXY_LAUNCH_TIMEOUT_MS = 12000;
let proxyLaunchTimer = null;

function requestUiRefresh() {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function" ||
    typeof Event !== "function"
  ) {
    return;
  }
  window.dispatchEvent(new Event("strato-open-home-refresh"));
}

function clearProxyLaunchTimer() {
  if (proxyLaunchTimer) {
    globalThis.clearTimeout(proxyLaunchTimer);
    proxyLaunchTimer = null;
  }
}

function clearProxyLaunchSignals() {
  clearProxyLaunchTimer();
  setProxyLaunchTelemetry("idle");
}

function setProxySignal(stage, game, reason = "", { bayStatus } = {}) {
  if (!game?.id) return;
  setProxyLaunchTelemetry(stage, game.id, reason);
  if (bayStatus) setLaunchBay(bayStatus, game.id, reason);
  requestUiRefresh();
}

function recordLaunch(game) {
  const recent = readJson(keys.recent, []).filter((id) => id !== game.id);
  recent.unshift(game.id);
  writeJson(keys.recent, recent.slice(0, 20));

  const counts = readJson(keys.playCounts, {});
  counts[game.id] = (Number(counts[game.id]) || 0) + 1;
  writeJson(keys.playCounts, counts);

  const lastPlayed = readJson(keys.lastPlayed, {});
  lastPlayed[game.id] = Date.now();
  writeJson(keys.lastPlayed, lastPlayed);
}

export function markFailure(game, reason) {
  if (!game?.id) return;
  const failures = readJson(keys.failures, {});
  failures[game.id] = { reason, timestamp: Date.now() };
  writeJson(keys.failures, failures);
  setLaunchBay("failed", game.id, reason);
}

export function clearFailure(game) {
  if (!game?.id) return;
  const failures = readJson(keys.failures, {});
  delete failures[game.id];
  writeJson(keys.failures, failures);
}

function queueProxyTimeout(game, onFail) {
  clearProxyLaunchTimer();
  proxyLaunchTimer = globalThis.setTimeout(() => {
    if (state.proxyLaunchTelemetry.gameId !== game?.id) return;
    const reason =
      "Proxy handoff timed out before iframe load signal. Destination may still be loading.";
    setProxySignal("timeout", game, reason, { bayStatus: "failed" });
    onFail?.(game, reason);
  }, PROXY_LAUNCH_TIMEOUT_MS);
}

export function reportProxyIframeLoaded(
  gameId = state.proxyLaunchTelemetry.gameId,
) {
  const game = findGame(gameId);
  if (!game?.id) return;
  if (state.proxyLaunchTelemetry.gameId !== game.id) return;
  clearProxyLaunchTimer();
  setProxySignal("iframe_loaded", game, "Proxy iframe load signal received", {
    bayStatus: "loaded",
  });
}

export function reportProxyBlockedOrFailed(
  gameId = state.proxyLaunchTelemetry.gameId,
  reason = "Proxy iframe signaled a blocked or failed launch",
  onFail,
) {
  const game = findGame(gameId);
  if (!game?.id) return;
  if (state.proxyLaunchTelemetry.gameId !== game.id) return;
  clearProxyLaunchTimer();
  setProxySignal("blocked_or_failed", game, reason, { bayStatus: "failed" });
  onFail?.(game, reason);
}

function setBrowserView() {
  document
    .querySelectorAll(".view")
    .forEach((view) => view.classList.remove("active"));
  document.getElementById("view-browser")?.classList.add("active");
  document
    .querySelectorAll(".nav-btn")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.view === "browser"),
    );
}

function showBrowser(game) {
  const iframe = document.getElementById("proxy-iframe");
  const input = document.getElementById("url-input");
  if (input) input.value = game.url;
  setLaunchBay("loading", game.id);
  setBrowserView();
  document.querySelector(".browser-body")?.classList.add("is-loading");
  document.querySelector(".browser-body")?.classList.add("has-launch");
  if (iframe) iframe.src = game.url;
  window.setTimeout(() => {
    document.querySelector(".browser-body")?.classList.remove("is-loading");
    setLaunchBay("loaded", game.id);
  }, 650);
}

async function verifyLocalRoute(url) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    LOCAL_PREFLIGHT_TIMEOUT_MS,
  );
  const methods = ["HEAD", "GET"];
  let lastReason = "Local route unavailable";

  try {
    for (const method of methods) {
      try {
        const response = await fetch(url, {
          method,
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok) return { ok: true, reason: "" };
        lastReason = `Local route unavailable (HTTP ${response.status})`;
      } catch (error) {
        if (error?.name === "AbortError") {
          return { ok: false, reason: "Local route unavailable (timeout)" };
        }
      }
    }
  } finally {
    globalThis.clearTimeout(timeout);
  }

  return { ok: false, reason: lastReason };
}

export async function launchById(id, { onFail, onUpdate } = {}) {
  const game = findGame(id);
  if (!game) {
    onFail?.(null, "Unavailable entry");
    return false;
  }

  const status = launchability(game);
  const isLocalRoute = String(game.url || "").startsWith("/");
  let localStatus = null;

  if (
    state.proxyLaunchTelemetry.gameId === game.id &&
    ["timeout", "blocked_or_failed"].includes(state.proxyLaunchTelemetry.stage)
  ) {
    setProxySignal("recovered/retried", game, "Retrying launch");
  }

  if (status.status === "failed-locally" && isLocalRoute) {
    localStatus = await verifyLocalRoute(game.url);
    if (!localStatus.ok) {
      onFail?.(game, localStatus.reason || status.reason);
      return false;
    }
    clearFailure(game);
  } else if (!isLaunchable(game)) {
    onFail?.(game, status.reason);
    return false;
  }

  if (isLocalRoute && !localStatus) {
    localStatus = await verifyLocalRoute(game.url);
    if (!localStatus.ok) {
      const reason = localStatus.reason || "Local route unavailable";
      markFailure(game, reason);
      onUpdate?.();
      onFail?.(game, reason);
      return false;
    }
  }

  clearFailure(game);
  recordLaunch(game);
  onUpdate?.();
  if (
    /^https?:\/\//i.test(String(game.url || "")) &&
    typeof window.STRATO_NAVIGATE_PROXY === "function"
  ) {
    setProxySignal("pending", game, "Preparing proxy launch", {
      bayStatus: "loading",
    });
    window.STRATO_NAVIGATE_PROXY(game.url, null, {
      title: game.name || game.title,
      url: game.url,
      provider: game.provider || game.source || null,
      reliability: game.reliability || null,
      external: true,
      originalUrl: game.url,
      game,
    });
    setProxySignal("handed_off", game, "Handed off to proxy transport", {
      bayStatus: "loading",
    });
    queueProxyTimeout(game, onFail);
    return true;
  }
  clearProxyLaunchSignals();
  showBrowser(game);
  return true;
}
