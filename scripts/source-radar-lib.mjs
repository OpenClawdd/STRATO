import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const rootDir = path.resolve(__dirname, '..');
export const sourcesPath = path.join(__dirname, 'catalog-sources.json');
export const sourceHealthPath = path.join(__dirname, 'output', 'source-health.json');
export const reviewPath = path.join(rootDir, 'public', 'assets', 'games.imported.review.json');
export const quarantinePath = path.join(rootDir, 'public', 'assets', 'games.imported.quarantine.json');
export const gamesPath = path.join(rootDir, 'public', 'assets', 'games.json');

export const SOURCE_TYPES = new Set(['game-directory', 'app-directory', 'proxy-hub', 'inspiration-only', 'manual-only', 'blocked']);
export const SOURCE_STATUSES = new Set(['active', 'dead', 'redirected', 'blocked', 'review', 'disabled']);
export const IMPORT_MODES = new Set(['metadata-only', 'manual-only', 'disabled']);
export const PRIORITIES = new Set(['high', 'medium', 'low']);
export const LICENSE_STATUSES = new Set(['allowed', 'review', 'unknown', 'blocked']);

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

export function normalizeUrl(value, base) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw, base);
    parsed.hash = '';
    if ((parsed.protocol === 'https:' && parsed.port === '443') || (parsed.protocol === 'http:' && parsed.port === '80')) parsed.port = '';
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');
    if (parsed.pathname !== '/') parsed.pathname = parsed.pathname.replace(/\/$/, '');
    parsed.searchParams.sort();
    return parsed.href;
  } catch {
    return raw.toLowerCase();
  }
}

export function hostnameOf(value) {
  try {
    return new URL(normalizeUrl(value)).hostname;
  } catch {
    return '';
  }
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function normalizeTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(unblocked|free|online|game|games|play)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function levenshtein(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  const matrix = Array.from({ length: left.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= right.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + Number(left[i - 1] !== right[j - 1]),
      );
    }
  }
  return matrix[left.length][right.length];
}

export function fuzzyTitleMatch(a, b) {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return Math.min(left.length, right.length) >= 5;
  const max = Math.max(left.length, right.length);
  return max >= 6 && levenshtein(left, right) / max <= 0.18;
}

export function validateSource(source) {
  const errors = [];
  if (!source.name) errors.push('missing name');
  if (!source.url && source.importMode !== 'manual-only') errors.push('missing url');
  if (!SOURCE_TYPES.has(source.type)) errors.push(`invalid type: ${source.type}`);
  if (!SOURCE_STATUSES.has(source.status)) errors.push(`invalid status: ${source.status}`);
  if (!IMPORT_MODES.has(source.importMode)) errors.push(`invalid importMode: ${source.importMode}`);
  if (!PRIORITIES.has(source.priority)) errors.push(`invalid priority: ${source.priority}`);
  if (source.allowAutoMerge !== false) errors.push('allowAutoMerge must be false');
  return errors;
}

export function validateRegistry(sources) {
  const seen = new Set();
  const errors = [];
  for (const source of sources) {
    for (const error of validateSource(source)) errors.push(`${source.name || '(unnamed)'}: ${error}`);
    const url = normalizeUrl(source.url || source.name);
    if (seen.has(url)) errors.push(`${source.name}: duplicate source url ${url}`);
    seen.add(url);
  }
  return errors;
}

export function classifyLicense(entry, source) {
  const explicit = entry.licenseStatus || source.licenseStatus;
  if (LICENSE_STATUSES.has(explicit)) return explicit;
  const note = `${entry.licenseNote || ''} ${source.licenseNote || ''}`.toLowerCase();
  if (/\b(mit|apache-2|apache 2|bsd|cc-by|creative commons|public domain|gpl|lgpl|mpl)\b/.test(note)) return 'allowed';
  if (source.type === 'blocked' || source.status === 'blocked') return 'blocked';
  if (source.type === 'game-directory' || source.type === 'app-directory' || source.type === 'proxy-hub') return 'unknown';
  return 'review';
}

export function confidenceScore(entry, source) {
  let score = 0;
  if (entry.title || entry.name) score += 25;
  if (entry.url) score += 25;
  if (entry.category) score += 10;
  if (Array.isArray(entry.tags) && entry.tags.length) score += 10;
  if (entry.description) score += 10;
  if (entry.thumbnail) score += 8;
  if (classifyLicense(entry, source) === 'allowed') score += 12;
  return Math.min(100, score);
}

export function launchabilityScore(entry) {
  const url = normalizeUrl(entry.url || '');
  if (!url || url === '#' || /^\$\{[^}]+\}$/.test(String(entry.url || ''))) return 0;
  if (!/^https?:\/\//i.test(url) && !String(entry.url || '').startsWith('/')) return 10;
  if (/\b(proxy|cloak|mirror|bypass|exploit)\b/i.test(`${entry.title || entry.name || ''} ${entry.description || ''} ${normalizeTags(entry.tags).join(' ')}`)) return 15;
  return 75 + (entry.thumbnail ? 10 : 0) + (entry.description ? 10 : 0);
}

export function normalizeTags(tags) {
  if (Array.isArray(tags)) return [...new Set(tags.map(String).map(tag => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
  if (typeof tags === 'string') return normalizeTags(tags.split(','));
  return [];
}

export function normalizeCandidate(entry, source) {
  const title = String(entry.title || entry.name || '').trim();
  const url = normalizeUrl(entry.url || '', source.url || undefined);
  const discoveredAt = entry.discoveredAt || new Date().toISOString();
  const licenseStatus = classifyLicense(entry, source);
  return {
    id: entry.id || slugify(`${title}-${hostnameOf(url)}`),
    title,
    name: title,
    url,
    category: entry.category || source.defaultCategory || 'arcade',
    tags: normalizeTags(entry.tags || source.defaultTags || []),
    description: entry.description || '',
    thumbnail: entry.thumbnail || '',
    sourceName: source.name,
    sourceUrl: source.url || '',
    sourceType: source.type,
    discoveredAt,
    importedAt: discoveredAt,
    confidenceScore: confidenceScore(entry, source),
    launchabilityScore: launchabilityScore({ ...entry, url, tags: normalizeTags(entry.tags || source.defaultTags || []) }),
    licenseStatus,
    licenseNote: entry.licenseNote || source.licenseNote || '',
    reviewNotes: entry.reviewNotes || source.notes || '',
    approved: false,
    rejected: false,
    quarantined: false,
    quarantineReason: '',
  };
}

export function duplicateReason(entry, seen, existing = []) {
  const title = normalizeTitle(entry.title || entry.name);
  const url = normalizeUrl(entry.url || '');
  const host = hostnameOf(url);
  const slug = slugify(title);
  const thumb = path.basename(String(entry.thumbnail || '')).toLowerCase();
  const existingPool = existing.map(game => ({ title: game.name || game.title, url: game.url, thumbnail: game.thumbnail }));
  for (const game of existingPool) {
    if (url && normalizeUrl(game.url || '') === url) return 'duplicate-url-existing-catalog';
    if (title && fuzzyTitleMatch(title, game.title || '')) return 'duplicate-title-existing-catalog';
  }
  const keys = [
    url && `url:${url}`,
    title && `title:${title}`,
    host && slug && `host-slug:${host}/${slug}`,
    thumb && `thumbnail:${thumb}`,
  ].filter(Boolean);
  for (const key of keys) {
    if (seen.has(key)) return `duplicate-${key.split(':')[0]}`;
  }
  keys.forEach(key => seen.add(key));
  return '';
}

export function quarantineReason(entry, source = {}, context = {}) {
  const text = `${entry.title || entry.name || ''} ${entry.description || ''} ${entry.category || ''} ${normalizeTags(entry.tags).join(' ')}`.toLowerCase();
  if (!entry.title && !entry.name) return 'missing-title';
  if (!entry.url) return 'missing-url';
  if (context.duplicate) return context.duplicate;
  if (entry.licenseStatus && !['allowed', 'review'].includes(entry.licenseStatus)) return 'unclear-license';
  if (!entry.licenseStatus || entry.licenseStatus === 'unknown') return 'unclear-license';
  if (source.status === 'disabled' || source.importMode === 'disabled') return 'source-disabled';
  if (source.type === 'inspiration-only') return 'source-inspiration-only';
  if (source.type === 'proxy-hub' || /\b(proxy|cloak|mirror|bypass|exploit|unblocked)\b/.test(text)) return 'proxy-or-bypass-surface';
  if (/\b(adult|porn|sex|nsfw|casino|gambling|betting|drug|weapon)\b/.test(text)) return 'unsafe-content-signal';
  if (/\$\{[^}]+\}|about:blank|example\.(com|org|net)/i.test(String(entry.url || ''))) return 'config-placeholder-url';
  if (/^https?:\/\//i.test(String(entry.thumbnail || '')) && entry.licenseStatus !== 'allowed') return 'hotlinked-thumbnail-review';
  if (Number(entry.launchabilityScore || 0) < 30) return 'low-launchability-score';
  return '';
}

export function splitCandidates(entries, sources, existingGames = []) {
  const sourceByName = new Map(sources.map(source => [source.name, source]));
  const seen = new Set();
  const review = [];
  const quarantine = [];
  for (const raw of entries) {
    const source = sourceByName.get(raw.sourceName) || {};
    const duplicate = duplicateReason(raw, seen, existingGames);
    const reason = quarantineReason(raw, source, { duplicate });
    if (reason) quarantine.push({ ...raw, quarantined: true, quarantineReason: reason });
    else review.push(raw);
  }
  return { review, quarantine };
}

export function parseHealthStatus({ status, redirected, finalUrl, url, error }) {
  if (error) return error === 'timeout' ? 'timeout' : 'needs-review';
  if (status === 403 || status === 401) return 'blocked';
  if (status >= 300 && status < 400) return 'redirected';
  if (redirected || (finalUrl && normalizeUrl(finalUrl) !== normalizeUrl(url))) return 'redirected';
  if (status >= 200 && status < 300) return 'active';
  if (status >= 400) return 'needs-review';
  return 'review';
}

export async function checkSourceHealth(source, { timeoutMs = 8000, fetchImpl = globalThis.fetch } = {}) {
  if (!source.url || source.status === 'disabled' || source.importMode === 'manual-only') {
    return { name: source.name, url: source.url || '', status: 'disabled', httpStatus: null, finalUrl: source.url || '', redirected: false, checkedAt: new Date().toISOString(), error: '' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(source.url, { method: 'HEAD', redirect: 'follow', signal: controller.signal, headers: { 'User-Agent': 'STRATO Source Radar; metadata health check' } });
    const finalUrl = response.url || source.url;
    const status = parseHealthStatus({ status: response.status, redirected: response.redirected, finalUrl, url: source.url });
    return { name: source.name, url: source.url, status, httpStatus: response.status, finalUrl, redirected: response.redirected || normalizeUrl(finalUrl) !== normalizeUrl(source.url), checkedAt: new Date().toISOString(), error: '' };
  } catch (err) {
    const error = err.name === 'AbortError' ? 'timeout' : err.message;
    return { name: source.name, url: source.url, status: parseHealthStatus({ error }), httpStatus: null, finalUrl: source.url, redirected: false, checkedAt: new Date().toISOString(), error };
  } finally {
    clearTimeout(timer);
  }
}

export function summarizeCatalog({ sources = [], review = [], quarantine = [] }) {
  const byStatus = sources.reduce((acc, source) => {
    acc[source.status] = (acc[source.status] || 0) + 1;
    return acc;
  }, {});
  const bySource = review.reduce((acc, entry) => {
    acc[entry.sourceName] = (acc[entry.sourceName] || 0) + 1;
    return acc;
  }, {});
  const quarantineByReason = quarantine.reduce((acc, entry) => {
    acc[entry.quarantineReason || 'unknown'] = (acc[entry.quarantineReason || 'unknown'] || 0) + 1;
    return acc;
  }, {});
  const titles = [...review, ...quarantine].reduce((acc, entry) => {
    const title = normalizeTitle(entry.title || entry.name);
    if (title) acc[title] = (acc[title] || 0) + 1;
    return acc;
  }, {});
  return {
    totalSources: sources.length,
    sourcesByStatus: byStatus,
    totalCandidates: review.length,
    totalQuarantined: quarantine.length,
    candidatesBySource: bySource,
    quarantineByReason,
    missingThumbnails: review.filter(entry => !entry.thumbnail).length,
    missingDescriptions: review.filter(entry => !entry.description).length,
    unknownLicense: [...review, ...quarantine].filter(entry => !entry.licenseStatus || entry.licenseStatus === 'unknown').length,
    topRepeatedTitles: Object.entries(titles).filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([title, count]) => ({ title, count })),
  };
}
