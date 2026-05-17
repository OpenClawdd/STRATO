import { keys, readJson } from "./storage.js";

export const blockedCategories = new Set([
  "proxies",
  "directories",
  "game-hubs",
]);
export const blockedTerms = [
  "proxy",
  "cloak",
  "unblocked",
  "exploit",
  "school",
  "google",
  "chrome",
];

export function isPlaceholder(value) {
  const url = String(value || "").trim();
  return (
    !url ||
    url === "#" ||
    url === "about:blank" ||
    /^\$\{[^}]+\}$/.test(url) ||
    /example\.(com|org|net)/i.test(url)
  );
}

export function urlKind(game) {
  const url = String(game?.url || "").trim();
  if (!url) return "missing";
  if (isPlaceholder(url)) return "placeholder";
  if (url.startsWith("/")) return "local";
  if (/^https?:\/\//i.test(url)) return "external";
  return "unsupported";
}

export function launchability(game) {
  if (!game || !game.id)
    return {
      status: "invalid",
      reason: "Unavailable entry",
      kind: "invalid",
      launchable: false,
    };
  const kind = urlKind(game);
  if (kind === "missing")
    return {
      status: "missing-url",
      reason: "Missing URL",
      kind,
      launchable: false,
    };
  if (game.needsConfig || game.config_required || kind === "placeholder")
    return {
      status: "needs-config",
      reason: "Needs config",
      kind,
      launchable: false,
    };
  if (kind === "unsupported")
    return {
      status: "invalid",
      reason: "Unsupported URL",
      kind,
      launchable: false,
    };

  const failures = readJson(keys.failures, {});
  const failure = failures[game.id];
  if (
    failure &&
    Date.now() - Number(failure.timestamp || 0) < 24 * 60 * 60 * 1000
  ) {
    return {
      status: "failed-locally",
      reason: failure.reason || "Recently failed",
      kind,
      launchable: false,
    };
  }

  if (!game.thumbnail || isPlaceholder(game.thumbnail))
    return {
      status: "fallback-art",
      reason: "Using fallback art",
      kind,
      launchable: true,
    };
  return {
    status: kind === "local" ? "local" : "external",
    reason: "Playable",
    kind,
    launchable: true,
  };
}

export const health = launchability;
export const isLaunchable = (game) => launchability(game).launchable;

export function catalogDiagnostics(games) {
  const list = Array.isArray(games) ? games : [];
  const stats = {
    loaded: list.length > 0,
    total: list.length,
    playable: 0,
    local: 0,
    external: 0,
    fallbackArt: 0,
    missingOrBroken: 0,
    needsConfig: 0,
    recentFailures: Object.keys(readJson(keys.failures, {})).length,
  };

  for (const game of list) {
    const status = launchability(game);
    if (status.launchable) stats.playable += 1;
    if (status.kind === "local" && status.launchable) stats.local += 1;
    if (status.kind === "external" && status.launchable) stats.external += 1;
    if (status.status === "fallback-art") stats.fallbackArt += 1;
    if (
      ["missing-url", "invalid", "unsupported", "failed-locally"].includes(
        status.status,
      )
    ) {
      stats.missingOrBroken += 1;
    }
    if (status.status === "needs-config") stats.needsConfig += 1;
  }

  return stats;
}
