import { findGame } from "./catalog.js";
import { isLaunchable, launchability } from "./health.js";
import { setLaunchBay } from "./state.js";
import { keys, readJson, writeJson } from "./storage.js";

const LAUNCH_TIMEOUT_MS = 12000;

let activeLaunch = null;

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

function clearActiveLaunch() {
  if (!activeLaunch) return;
  if (activeLaunch.timer) window.clearTimeout(activeLaunch.timer);
  if (activeLaunch.iframe && activeLaunch.onLoad) {
    activeLaunch.iframe.removeEventListener("load", activeLaunch.onLoad);
  }
  if (activeLaunch.iframe && activeLaunch.onError) {
    activeLaunch.iframe.removeEventListener("error", activeLaunch.onError);
  }
  activeLaunch = null;
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

function normalizeLocalUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  try {
    const parsed = new URL(raw, window.location.origin);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`;
  }
}

function launchIntoIframe(
  game,
  url,
  {
    timeoutMs = LAUNCH_TIMEOUT_MS,
    start = null,
    reset = true,
    onFail = null,
  } = {},
) {
  const iframe = document.getElementById("proxy-iframe");
  const input = document.getElementById("url-input");
  const body = document.querySelector(".browser-body");
  if (!iframe) {
    markFailure(game, "Launch surface unavailable");
    onFail?.(game, "Launch surface unavailable");
    return false;
  }
  if (input) input.value = url;
  clearActiveLaunch();
  setLaunchBay("loading", game.id, "Preparing launch...");
  setBrowserView();
  body?.classList.add("is-loading");
  body?.classList.remove("has-launch");

  const launchId = Symbol(game.id);
  const finalize = () => {
    if (!activeLaunch || activeLaunch.launchId !== launchId) return;
    clearActiveLaunch();
    body?.classList.remove("is-loading");
    body?.classList.add("has-launch");
    setLaunchBay("loaded", game.id);
  };
  const fail = (reason) => {
    if (!activeLaunch || activeLaunch.launchId !== launchId) return;
    clearActiveLaunch();
    body?.classList.remove("is-loading");
    body?.classList.remove("has-launch");
    markFailure(game, reason);
    onFail?.(game, reason);
  };
  const onLoad = () => {
    const current = String(iframe.src || "");
    if (!current || current === "about:blank") return;
    finalize();
  };
  const onError = () => fail("Launch path did not respond");

  activeLaunch = {
    launchId,
    iframe,
    onLoad,
    onError,
    timer: null,
  };
  iframe.addEventListener("load", onLoad);
  iframe.addEventListener("error", onError);
  activeLaunch.timer = window.setTimeout(
    () => fail("Launch timed out"),
    timeoutMs,
  );

  try {
    if (reset) {
      iframe.src = "about:blank";
      window.setTimeout(() => {
        if (!activeLaunch || activeLaunch.launchId !== launchId) return;
        iframe.src = url;
      }, 0);
    } else if (typeof start === "function") {
      start();
    } else {
      iframe.src = url;
    }
  } catch {
    fail("Launch path did not respond");
    return false;
  }
  return true;
}

export function resolveLaunchTarget(game) {
  const status = launchability(game);
  if (!game?.id) {
    return { ok: false, reason: "Unavailable entry" };
  }
  if (!status.launchable) {
    return { ok: false, reason: status.reason, status };
  }

  const rawUrl = String(game.url || "").trim();
  if (!rawUrl) {
    return { ok: false, reason: "Missing URL", status };
  }

  if (status.kind === "local" || rawUrl.startsWith("/")) {
    return {
      ok: true,
      mode: "iframe",
      url: normalizeLocalUrl(rawUrl),
      status,
    };
  }

  if (/^https?:\/\//i.test(rawUrl) && typeof window.STRATO_NAVIGATE_PROXY === "function") {
    return {
      ok: true,
      mode: "proxy",
      url: rawUrl,
      status,
    };
  }

  return {
    ok: true,
    mode: "iframe",
    url: rawUrl,
    status,
  };
}

export async function launchById(id, { onFail, onUpdate } = {}) {
  const game = findGame(id);
  if (!game) {
    onFail?.(null, "Unavailable entry");
    return false;
  }

  const status = launchability(game);
  if (!isLaunchable(game)) {
    onFail?.(game, status.reason);
    return false;
  }

  const target = resolveLaunchTarget(game);
  if (!target.ok) {
    onFail?.(game, target.reason);
    return false;
  }

  if (target.mode === "iframe" && String(target.url).startsWith("/")) {
    try {
      const response = await fetch(target.url, {
        method: "HEAD",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch {
      markFailure(game, "Local route unavailable");
      onUpdate?.();
      onFail?.(game, "Local route unavailable");
      return false;
    }
  }

  const started =
    target.mode === "proxy" && typeof window.STRATO_NAVIGATE_PROXY === "function"
      ? launchIntoIframe(game, target.url, {
          reset: false,
          onFail,
          start: () =>
            window.STRATO_NAVIGATE_PROXY(game.url, null, {
              title: game.name || game.title,
              url: game.url,
              provider: game.provider || game.source || null,
              reliability: game.reliability || null,
              external: true,
              originalUrl: game.url,
              game,
            }),
        })
      : launchIntoIframe(game, target.url, { onFail });
  if (started) {
    recordLaunch(game);
    clearFailure(game);
    onUpdate?.();
  }
  return started;
}
