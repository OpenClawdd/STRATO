import { keys, readJson } from './storage.js';

export const blockedCategories = new Set(['proxies', 'directories', 'game-hubs']);
export const blockedTerms = ['proxy', 'cloak', 'unblocked', 'exploit', 'school', 'google', 'chrome'];

export function isPlaceholder(value) {
  const url = String(value || '').trim();
  return !url || url === '#' || url === 'about:blank' || /^\$\{[^}]+\}$/.test(url) || /example\.(com|org|net)/i.test(url);
}

export function isValidUrl(game) {
  const url = String(game?.url || '').trim();
  return Boolean(url) && !isPlaceholder(url) && (url.startsWith('/') || /^https?:\/\//i.test(url));
}

export function health(game) {
  if (!game || !game.id) return { status: 'invalid', reason: 'Unavailable entry' };
  if (!game.url) return { status: 'missing-url', reason: 'Missing URL' };
  if (game.needsConfig || game.config_required || isPlaceholder(game.url)) return { status: 'needs-config', reason: 'Needs config' };
  if (!isValidUrl(game)) return { status: 'invalid', reason: 'Unsupported URL' };

  const failures = readJson(keys.failures, {});
  const failure = failures[game.id];
  if (failure && Date.now() - Number(failure.timestamp || 0) < 24 * 60 * 60 * 1000) {
    return { status: 'recently-failed', reason: failure.reason || 'Recently failed' };
  }

  if (!game.thumbnail || isPlaceholder(game.thumbnail)) return { status: 'fallback-art', reason: 'Using fallback art' };
  return { status: 'ready', reason: 'Ready' };
}

export function isLaunchable(game) {
  return ['ready', 'fallback-art'].includes(health(game).status);
}
