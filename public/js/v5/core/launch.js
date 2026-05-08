import { findGame } from "./catalog.js";
import { isLaunchable, launchability } from "./health.js";
import { setLaunchBay } from "./state.js";
import { keys, readJson, writeJson } from "./storage.js";

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

  if (String(game.url).startsWith("/")) {
    try {
      const response = await fetch(game.url, {
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

  recordLaunch(game);
  onUpdate?.();
  showBrowser(game);
  return true;
}
