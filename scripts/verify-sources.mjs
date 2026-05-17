#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const rootDir = path.resolve(__dirname, '..');
export const gamesPath = path.join(rootDir, 'public', 'assets', 'games.json');
export const outputPath = path.join(rootDir, 'scripts', 'output', 'source-verification-report.json');

export const TRUST_STATES = [
  'verified-local',
  'verified-external',
  'review-only',
  'suspicious',
  'broken',
  'unknown',
];

const KNOWN_SOURCE_KEYS = new Set([
  'local',
  'selenite',
  'gn-math',
  'frogie',
  '1key',
  'vapor',
  'lucide',
  'cherri',
]);

function clean(value) {
  return String(value || '').trim();
}

function isPlaceholder(value) {
  const url = clean(value);
  return (
    !url ||
    url === '#' ||
    url === 'about:blank' ||
    /^\$\{[^}]+\}$/.test(url) ||
    /example\.(com|org|net)/i.test(url)
  );
}

export function sourceKey(game) {
  const explicit = clean(game?.provider || game?.source).toLowerCase();
  if (explicit) return explicit;
  const url = clean(game?.url);
  if (url.startsWith('/')) return 'local';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('selenite')) return 'selenite';
    if (host.includes('gn-math')) return 'gn-math';
    if (host.includes('frogie')) return 'frogie';
    if (host.includes('1key')) return '1key';
    if (host.includes('vapor')) return 'vapor';
    if (host.includes('lucide')) return 'lucide';
    if (host.includes('cherri')) return 'cherri';
  } catch {}
  return 'unknown';
}

function sourceBucket(game) {
  const source = sourceKey(game);
  if (KNOWN_SOURCE_KEYS.has(source)) return source;
  return clean(game?.url).startsWith('/') ? 'local' : 'unknown/external';
}

export function urlKind(url) {
  const raw = clean(url);
  if (!raw) return 'missing';
  if (isPlaceholder(raw)) return 'placeholder';
  if (raw.startsWith('/')) return 'local';
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? 'external' : 'unsupported';
  } catch {
    return 'invalid';
  }
}

export function suspiciousUrlReason(game) {
  const url = clean(game?.url);
  const source = sourceKey(game);
  if (source === 'selenite' && /^https?:\/\/selenite\.cc\/projects\//i.test(url)) {
    return 'selenite-project-url';
  }
  if (source === 'gn-math' && /^https?:\/\/gn-math\.dev\/#game-\d+/i.test(url)) {
    return 'gn-math-hash-url';
  }
  if (source === 'lucide' && /^https?:\/\/lucideon\.top\/g\/frame\/?$/i.test(url)) {
    return 'shared-frame-url';
  }
  try {
    const parsed = new URL(url);
    if (/\b(proxy|mirror|unblock|bypass|cloak)\b/i.test(parsed.hostname)) {
      return 'suspicious-hostname';
    }
  } catch {}
  return '';
}

function isExplicitlyVerifiedExternal(game) {
  const verification = game?.verification || {};
  return Boolean(
    game?.sourceTrust === 'verified-external' ||
      game?.trustState === 'verified-external' ||
      game?.verifiedExternal === true ||
      game?.sourceVerified === true ||
      verification.status === 'verified' ||
      verification.status === 'verified-external',
  );
}

async function publicPathExists(publicPath, baseDir = rootDir) {
  try {
    await fs.access(path.join(baseDir, 'public', publicPath));
    return true;
  } catch {
    return false;
  }
}

export async function classifyCatalogEntry(game, options = {}) {
  const baseDir = options.rootDir || rootDir;
  const kind = urlKind(game?.url);
  const suspiciousReason = suspiciousUrlReason(game);
  const source = sourceBucket(game);
  const entry = {
    id: clean(game?.id),
    title: clean(game?.name || game?.title),
    source,
    url: clean(game?.url),
    urlKind: kind,
    needsReview: Boolean(game?.needsReview),
    sourceWarning: clean(game?.sourceWarning),
    evidenceSourceFile: clean(game?.evidence?.sourceFile),
    suspiciousReason,
    state: 'unknown',
    reason: '',
  };

  if (kind === 'missing' || kind === 'placeholder' || kind === 'invalid' || kind === 'unsupported') {
    entry.state = kind === 'placeholder' ? 'unknown' : 'broken';
    entry.reason = kind;
    return entry;
  }

  if (kind === 'local') {
    const exists = await publicPathExists(entry.url, baseDir);
    entry.state = exists && game?.reliability !== 'red' ? 'verified-local' : 'broken';
    entry.reason = exists ? 'local-path-exists' : 'local-path-missing';
    return entry;
  }

  if (game?.needsReview) {
    entry.state = 'review-only';
    entry.reason = game.sourceWarning || 'needs-review';
    return entry;
  }
  if (suspiciousReason || game?.reliability === 'red') {
    entry.state = 'suspicious';
    entry.reason = suspiciousReason || 'red-reliability';
    return entry;
  }
  if (isExplicitlyVerifiedExternal(game)) {
    entry.state = 'verified-external';
    entry.reason = 'catalog-verified';
    return entry;
  }

  entry.state = 'unknown';
  entry.reason = 'external-not-verified';
  return entry;
}

function summarizeEntries(entries) {
  const sources = {};
  for (const entry of entries) {
    sources[entry.source] ||= {
      total: 0,
      verifiedLaunchable: 0,
      verifiedLocal: 0,
      verifiedExternal: 0,
      reviewOnly: 0,
      suspicious: 0,
      broken: 0,
      unknown: 0,
      suspiciousUrlPatterns: 0,
      duplicateUrls: 0,
      recentFailures: 'unknown',
      evidenceSourceFiles: [],
    };
    const bucket = sources[entry.source];
    bucket.total += 1;
    if (entry.state === 'verified-local') bucket.verifiedLocal += 1;
    if (entry.state === 'verified-external') bucket.verifiedExternal += 1;
    if (entry.state === 'review-only') bucket.reviewOnly += 1;
    if (entry.state === 'suspicious') bucket.suspicious += 1;
    if (entry.state === 'broken') bucket.broken += 1;
    if (entry.state === 'unknown') bucket.unknown += 1;
    if (entry.state === 'verified-local' || entry.state === 'verified-external') {
      bucket.verifiedLaunchable += 1;
    }
    if (entry.suspiciousReason) bucket.suspiciousUrlPatterns += 1;
    if (entry.duplicateUrl) bucket.duplicateUrls += 1;
    if (entry.evidenceSourceFile && !bucket.evidenceSourceFiles.includes(entry.evidenceSourceFile)) {
      bucket.evidenceSourceFiles.push(entry.evidenceSourceFile);
    }
  }
  return sources;
}

async function checkExternalUrl(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
    }
    return {
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      finalUrl: response.url,
      error: '',
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      error: error?.name === 'AbortError' ? 'timeout' : error?.message || 'fetch failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function buildSourceInventory(games, options = {}) {
  const entries = [];
  for (const game of Array.isArray(games) ? games : []) {
    entries.push(await classifyCatalogEntry(game, options));
  }

  const duplicateCounts = new Map();
  for (const entry of entries) {
    if (!entry.url || entry.urlKind === 'placeholder') continue;
    duplicateCounts.set(entry.url, (duplicateCounts.get(entry.url) || 0) + 1);
  }

  for (const entry of entries) {
    entry.duplicateUrl = duplicateCounts.get(entry.url) > 1;
  }

  return { entries, sources: summarizeEntries(entries) };
}

export async function verifySources(options = {}) {
  const online = Boolean(options.online);
  const timeoutMs = Number(options.timeoutMs || 2500);
  const maxOnlinePerSource = Number(options.maxOnlinePerSource || 3);
  const games = options.games || JSON.parse(await fs.readFile(gamesPath, 'utf8'));
  const inventory = await buildSourceInventory(games, { rootDir: options.rootDir || rootDir });

  if (online && typeof fetch === 'function') {
    const checkedBySource = new Map();
    for (const entry of inventory.entries) {
      if (entry.urlKind !== 'external' || entry.state !== 'unknown') continue;
      const count = checkedBySource.get(entry.source) || 0;
      if (count >= maxOnlinePerSource) continue;
      checkedBySource.set(entry.source, count + 1);
      const result = await checkExternalUrl(entry.url, timeoutMs);
      entry.network = result;
      if (result.ok) {
        entry.state = 'verified-external';
        entry.reason = 'network-verified';
      } else if (result.error || result.status >= 400) {
        entry.state = 'broken';
        entry.reason = result.error || `http-${result.status}`;
      }
    }
  }

  const totals = TRUST_STATES.reduce((acc, state) => {
    acc[state] = inventory.entries.filter((entry) => entry.state === state).length;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    onlineChecks: online,
    maxOnlinePerSource: online ? maxOnlinePerSource : 0,
    totalEntries: inventory.entries.length,
    totals,
    sources: summarizeEntries(inventory.entries),
    entries: inventory.entries,
  };
}

function printSummary(report) {
  console.log('STRATO source verification report');
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Entries: ${report.totalEntries}`);
  for (const state of TRUST_STATES) {
    console.log(`${state}: ${report.totals[state] || 0}`);
  }
  console.log('Sources:');
  for (const [source, stats] of Object.entries(report.sources).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(
      `  ${source}: total=${stats.total}, verified=${stats.verifiedLaunchable}, review=${stats.reviewOnly}, suspicious=${stats.suspicious}, broken=${stats.broken}, unknown=${stats.unknown}`,
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const online = process.argv.includes('--online');
  const maxArg = process.argv.find((arg) => arg.startsWith('--max-per-source='));
  const timeoutArg = process.argv.find((arg) => arg.startsWith('--timeout-ms='));
  const maxOnlinePerSource = maxArg ? Number(maxArg.split('=')[1]) : 3;
  const timeoutMs = timeoutArg ? Number(timeoutArg.split('=')[1]) : 2500;
  const report = await verifySources({ online, maxOnlinePerSource, timeoutMs });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  printSummary(report);
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
}
