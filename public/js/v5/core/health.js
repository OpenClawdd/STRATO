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

export function sourceName(game) {
  const source = String(game?.provider || game?.source || "").trim();
  if (source) return source.toLowerCase();
  return urlKind(game) === "local" ? "local" : "unknown";
}

export function hasSuspiciousSourceUrl(game) {
  const url = String(game?.url || "").trim();
  const source = sourceName(game);
  if (source === "selenite" && /^https?:\/\/selenite\.cc\/projects\//i.test(url))
    return true;
  if (source === "gn-math" && /^https?:\/\/gn-math\.dev\/#game-\d+/i.test(url))
    return true;
  if (source === "lucide" && /^https?:\/\/lucideon\.top\/g\/frame\/?$/i.test(url))
    return true;
  return false;
}

function isVerifiedExternal(game) {
  const verification = game?.verification || {};
  return Boolean(
    game?.sourceTrust === "verified-external" ||
      game?.trustState === "verified-external" ||
      game?.verifiedExternal === true ||
      game?.sourceVerified === true ||
      verification.status === "verified" ||
      verification.status === "verified-external",
  );
}

export function sourceTrustState(game) {
  const kind = urlKind(game);
  if (!game || !game.id) return "broken";
  if (kind === "missing" || kind === "placeholder" || kind === "unsupported")
    return kind === "missing" ? "broken" : "unknown";
  if (game.needsConfig || game.config_required) return "unknown";

  const failures = readJson(keys.failures, {});
  const failure = failures[game.id];
  if (
    failure &&
    Date.now() - Number(failure.timestamp || 0) < 24 * 60 * 60 * 1000
  ) {
    return "broken";
  }

  if (kind === "local") {
    return game.reliability === "red" ? "broken" : "verified-local";
  }
  if (game.needsReview) return "review-only";
  if (hasSuspiciousSourceUrl(game) || game.reliability === "red")
    return "suspicious";
  if (isVerifiedExternal(game)) return "verified-external";
  return "unknown";
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

  const trustState = sourceTrustState(game);
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
      trustState,
      launchable: false,
    };
  }

  if (trustState === "review-only") {
    return {
      status: "review-only",
      reason: game.sourceWarning || "Source needs review",
      kind,
      trustState,
      launchable: false,
    };
  }

  if (trustState === "suspicious") {
    return {
      status: "suspicious-source",
      reason: game.sourceWarning || "Suspicious source URL",
      kind,
      trustState,
      launchable: false,
    };
  }

  if (kind === "external" && trustState !== "verified-external") {
    return {
      status: "unknown-source",
      reason: "External source is not verified",
      kind,
      trustState,
      launchable: false,
    };
  }

  if (!game.thumbnail || isPlaceholder(game.thumbnail))
    return {
      status: "fallback-art",
      reason: "Using fallback art",
      kind,
      trustState,
      launchable: true,
    };
  return {
  status: kind === "local" ? "local" : "external",
    reason: "Playable",
    kind,
    trustState,
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
    verifiedLocal: 0,
    verifiedExternal: 0,
    reviewOnly: 0,
    suspicious: 0,
    broken: 0,
    unknown: 0,
    local: 0,
    external: 0,
    externalNeedsReview: 0,
    fallbackArt: 0,
    missingOrBroken: 0,
    needsConfig: 0,
    recentFailures: Object.keys(readJson(keys.failures, {})).length,
    bySource: {},
    warnings: {},
  };

  for (const game of list) {
    const status = launchability(game);
    const trustState = status.trustState || sourceTrustState(game);
    const source = sourceName(game);
    stats.bySource[source] ||= {
      total: 0,
      verifiedLocal: 0,
      verifiedExternal: 0,
      reviewOnly: 0,
      suspicious: 0,
      broken: 0,
      unknown: 0,
    };
    stats.bySource[source].total += 1;
    if (stats.bySource[source][trustState] !== undefined)
      stats.bySource[source][trustState] += 1;
    if (game.sourceWarning)
      stats.warnings[game.sourceWarning] =
        (stats.warnings[game.sourceWarning] || 0) + 1;

    if (status.launchable) stats.playable += 1;
    if (trustState === "verified-local") stats.verifiedLocal += 1;
    if (trustState === "verified-external") stats.verifiedExternal += 1;
    if (trustState === "review-only") stats.reviewOnly += 1;
    if (trustState === "suspicious") stats.suspicious += 1;
    if (trustState === "broken") stats.broken += 1;
    if (trustState === "unknown") stats.unknown += 1;
    if (status.kind === "local" && status.launchable) stats.local += 1;
    if (status.kind === "external" && status.launchable) stats.external += 1;
    if (trustState === "review-only") stats.externalNeedsReview += 1;
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
