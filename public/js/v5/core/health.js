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

export function hasProxyProof(game) {
  if (!game || typeof game !== "object") return false;
  if (game.proxyVerified === true || game.proxy_verified === true) return true;
  if (game.proxyProof?.verified === true) return true;

  const status = String(
    game.proxyStatus ||
      game.proxy_status ||
      game.proxyProof?.status ||
      game.proxyProof?.kind ||
      "",
  )
    .trim()
    .toLowerCase();
  if (
    status === "verified" ||
    status === "ok" ||
    status === "proxy_verified" ||
    status === "remote_proxy_verified"
  ) {
    return true;
  }

  return Boolean(
    game.proxyVerifiedAt ||
    game.proxy_verified_at ||
    game.proxyProof?.checkedAt ||
    game.proxyProof?.verifiedAt,
  );
}

export function launchability(game, context = {}) {
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

  const failures = context.failures || readJson(keys.failures, {});
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

  // External games need browser/proxy proof before entering default launch surfaces.
  if (kind === "external" && !hasProxyProof(game)) {
    return {
      status: "remote-proxy-unverified",
      reason: "Needs proxy proof",
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
    status: kind === "local" ? "local" : "remote-proxy-verified",
    reason: "Playable",
    kind,
    launchable: true,
  };
}

export const health = launchability;
export const isLaunchable = (game, context = {}) =>
  launchability(game, context).launchable;
