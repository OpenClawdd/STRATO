#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  hostnameOf,
  levenshtein,
  normalizeUrl,
  readJson,
  slugify,
  writeJson,
} from './source-radar-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rawPath = path.join(__dirname, 'raw-sources.txt');
const outDir = path.join(__dirname, 'output');
const ingestedPath = path.join(outDir, 'raw-sources.ingested.json');
const quarantinePath = path.join(outDir, 'raw-sources.quarantine.json');
const reportPath = path.join(outDir, 'raw-sources.report.json');

// ── URL list parsing ──
function extractComment(raw) {
  const match = raw.match(/\(([^)]+)\)\s*$/);
  if (!match) return { url: raw.trim(), comment: '' };
  const comment = match[1].trim();
  const url = raw.slice(0, match.index).trim();
  return { url, comment };
}

function splitConcatenatedUrls(line) {
  // Catches "https://a.com/https://b.com/path" patterns
  const parts = line.split(/(https?:\/\/[^\s]+)/g).filter(Boolean);
  return parts.length > 1 ? parts : [line];
}

function unescapeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTrackingParams(parsed) {
  const trackers = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'ref', 'source', 'fbclid', 'gclid', 'gclsrc', 'dclid',
    'msclkid', 'mc_cid', 'mc_eid', '_ga', '_gl',
  ];
  for (const key of trackers) parsed.searchParams.delete(key);
}

function parseRawLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return [];
  const decoded = unescapeHtmlEntities(trimmed);
  // Split concatenated URLs like "https://a.com/https://b.com"
  const parts = splitConcatenatedUrls(decoded);
  const results = [];
  for (const part of parts) {
    const { url, comment } = extractComment(part);
    if (!url || url.startsWith('#')) continue;
    // Skip google sites
    if (/sites\.google\.com/.test(url)) continue;
    // Fix spaces in URLs
    const cleaned = url.replace(/\s+/g, '');
    if (!cleaned) continue;
    results.push({ rawUrl: cleaned, comment });
  }
  return results;
}

// ── Normalization ──
function normalize(rawUrl) {
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.hash = '';
    if ((parsed.protocol === 'https:' && parsed.port === '443') ||
        (parsed.protocol === 'http:' && parsed.port === '80')) {
      parsed.port = '';
    }
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');
    if (parsed.pathname !== '/') parsed.pathname = parsed.pathname.replace(/\/$/, '');
    stripTrackingParams(parsed);
    parsed.searchParams.sort();
    return parsed.href;
  } catch {
    return '';
  }
}

function guessTitle(rawUrl, comment) {
  if (comment && comment.length >= 2) return comment;
  try {
    const host = hostnameOf(rawUrl);
    // Extract from subdomain/domain
    const parts = host.split('.');
    const candidate = parts[parts.length - 2] || parts[0] || '';
    return candidate.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    return rawUrl;
  }
}

// ── Classification ──
const SIGNALS = {
  'game-hub': [
    /\b(unblocked|games|arcade|game|gaming|play|ubg|blox|bloxcraft|budsin|unblockzone|unbanned)\b/i,
    /\b(gamesite|gamehub|game-hub|unblockedgames|playable|lunar|complex-arcade|kubaz|prenite)\b/i,
  ],
  'math-tool': [
    /\b(math|calculus|algebra|equation|integral|duckmath|mizumath|calculra|mathfilm|edurocks|hagoki)\b/i,
  ],
  'proxy': [
    /\b(proxy|unblock|bypass|cloak|stealth|interstellar|bromine|nebula|gointerstellar|startmyeducation|bromineproxy)\b/i,
    /\b(vpn|tunnel|relay|bipit|selenite|infamous|vapor|splash|lucide|lucideon|cherrion|multirip|everest|korona|relicofficial|z-kit)\b/i,
  ],
  'tool': [
    /\b(tool|util|generator|converter|editor|calc|write|note|noterplus|sumen|zenithub|libretext|oasis)\b/i,
  ],
  'personal': [
    /\b(portfolio|personal|blog|about|resume|tutoring|wavelength|hideout-now|enter-anything|ghost|ghst|deaganfern|fern)\b/i,
  ],
};

const HOST_PATTERNS = [
  [/s3\.amazonaws\.com/, 'personal'],
  [/\.fastly\.net$/, 'game-hub'],
  [/\.b-cdn\.net$/, 'game-hub'],
  [/neocities\.org$/, 'personal'],
  [/pages\.dev$/, 'game-hub'],
  [/vercel\.app$/, 'game-hub'],
  [/netlify\.app$/, 'game-hub'],
  [/github\.io$/, 'game-hub'],
  [/weebly\.com$/, 'game-hub'],
  [/wixsite\.com/, 'personal'],
  [/lovable\.app$/, 'personal'],
  [/tinyurl\.com/, 'unknown'],
  [/\.shop$/, 'proxy'],
  [/\.top$/, 'game-hub'],
  [/\.rip$/, 'game-hub'],
  [/\.rest$/, 'game-hub'],
  [/\.lat$/, 'game-hub'],
  [/\.click$/, 'proxy'],
  [/\.tech$/, 'game-hub'],
  [/\.website$/, 'personal'],
  [/\.dev$/, 'game-hub'],
  [/\.app$/, 'game-hub'],
  [/\.space$/, 'tool'],
  [/\.store$/, 'proxy'],
  [/githack\.com/, 'game-hub'],
  [/cloud\.maddox/, 'game-hub'],
  [/raw\.githack/, 'game-hub'],
];

function classifyUrl(rawUrl, comment) {
  const text = `${rawUrl} ${comment}`.toLowerCase();
  const host = hostnameOf(rawUrl).toLowerCase();

  // Comment-based classification overrides everything
  if (comment) {
    const c = comment.toLowerCase();
    if (/\b(backup|mirror|alt)\b/.test(c)) return 'game-hub';
    if (/\b(math|tutor|education|learning)\b/.test(c)) return 'math-tool';
    if (/\b(proxy|bypass|unblock)\b/.test(c)) return 'proxy';
    if (/\b(personal|portfolio|blog|art)\b/.test(c)) return 'personal';
  }

  // Known host patterns (ordered, first match wins)
  for (const [pattern, type] of HOST_PATTERNS) {
    if (pattern.test(host)) return type;
  }

  // Signal-based scoring
  let best = 'unknown';
  let bestScore = 0;
  for (const [type, patterns] of Object.entries(SIGNALS)) {
    const score = patterns.filter(p => p.test(text) || p.test(host)).length;
    if (score > bestScore) { bestScore = score; best = type; }
  }
  return best;
}

function isQuarantinable(entry) {
  const url = entry.normalizedUrl;
  if (!url) return { quarantine: true, reason: 'missing-url' };
  if (!/^https?:\/\//.test(url)) return { quarantine: true, reason: 'invalid-url' };
  const host = hostnameOf(url);
  if (!host || !host.includes('.')) return { quarantine: true, reason: 'invalid-hostname' };
  // Only quarantine on clear safety/content signals, not just "I don't know what this is"
  const text = `${entry.rawUrl} ${entry.comment}`.toLowerCase();
  if (/\b(adult|porn|sex|nsfw|casino|gambling|betting|drug)\b/.test(text)) {
    return { quarantine: true, reason: 'unsafe-content-signal' };
  }
  return { quarantine: false, reason: '' };
}

// ── Domain clustering ──
function clusterMirrors(entries) {
  const byHost = new Map();
  for (const entry of entries) {
    const host = hostnameOf(entry.normalizedUrl);
    if (!host) continue;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(entry.id);
  }
  // Find duplicate domains (different hosts serving same content)
  // by title similarity
  const clusters = [];
  const assigned = new Set();
  for (const entry of entries) {
    if (assigned.has(entry.id)) continue;
    const cluster = [entry.id];
    assigned.add(entry.id);
    for (const other of entries) {
      if (assigned.has(other.id)) continue;
      if (entry.id === other.id) continue;
      const dist = levenshtein(
        entry.title.toLowerCase(),
        other.title.toLowerCase(),
      );
      const maxLen = Math.max(entry.title.length, other.title.length);
      if (maxLen > 0 && dist / maxLen < 0.3) {
        // Close title match — might be mirror
        cluster.push(other.id);
        assigned.add(other.id);
      }
    }
    if (cluster.length > 1) clusters.push(cluster);
  }
  return clusters;
}

// ── Main ──
async function main() {
  const text = await fs.readFile(rawPath, 'utf8');
  const lines = text.split('\n');
  const parsed = [];
  for (const line of lines) {
    parsed.push(...parseRawLine(line));
  }

  // Normalize and build entries
  const entries = [];
  const seenUrls = new Set();
  for (const { rawUrl, comment } of parsed) {
    const normalizedUrl = normalize(rawUrl);
    if (!normalizedUrl) continue;
    if (seenUrls.has(normalizedUrl)) {
      entries.push({
        rawUrl,
        normalizedUrl,
        title: guessTitle(rawUrl, comment),
        comment,
        sourceType: 'unknown',
        status: 'duplicate',
        reason: 'duplicate-normalized-url',
      });
      continue;
    }
    seenUrls.add(normalizedUrl);

    const title = guessTitle(rawUrl, comment);
    const sourceType = classifyUrl(rawUrl, comment);
    entries.push({
      id: slugify(`${title}-${hostnameOf(normalizedUrl)}`),
      title,
      rawUrl,
      normalizedUrl,
      comment,
      sourceType,
      status: 'unchecked',
      confidence: 0,
      duplicateOf: '',
      lastChecked: '',
      healthReason: '',
      launchable: false,
      promotable: false,
    });
  }

  // Split quarantine
  const review = [];
  const quarantine = [];
  for (const entry of entries) {
    if (entry.status === 'duplicate') {
      quarantine.push({ ...entry, quarantineReason: entry.reason });
      continue;
    }
    const result = isQuarantinable(entry);
    if (result.quarantine) {
      quarantine.push({ ...entry, quarantineReason: result.reason });
    } else {
      review.push(entry);
    }
  }

  // Cluster mirrors
  const mirrorClusters = clusterMirrors(review);

  // Generate report
  const byType = review.reduce((acc, e) => {
    acc[e.sourceType] = (acc[e.sourceType] || 0) + 1;
    return acc;
  }, {});
  const byReason = quarantine.reduce((acc, e) => {
    acc[e.quarantineReason || e.reason || 'unknown'] =
      (acc[e.quarantineReason || e.reason || 'unknown'] || 0) + 1;
    return acc;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    totalParsed: parsed.length,
    totalIngested: review.length + quarantine.length,
    reviewable: review.length,
    quarantined: quarantine.length,
    duplicatesFound: entries.filter(e => e.status === 'duplicate').length,
    bySourceType: byType,
    quarantineByReason: byReason,
    mirrorClusters: mirrorClusters.length,
    mirrorClusterIds: mirrorClusters,
  };

  await writeJson(ingestedPath, review);
  await writeJson(quarantinePath, quarantine);
  await writeJson(reportPath, report);

  console.log(`Parsed:    ${parsed.length} raw URLs`);
  console.log(`Ingested:  ${review.length + quarantine.length} entries`);
  console.log(`Review:    ${review.length}`);
  console.log(`Quarantine: ${quarantine.length}`);
  console.log(`Clusters:  ${mirrorClusters.length} mirror groups`);
  console.log(`\nBy type:`, JSON.stringify(byType));
  console.log(`Quarantine reasons:`, JSON.stringify(byReason));
  console.log(`\nOutput:`);
  console.log(`  ${ingestedPath}`);
  console.log(`  ${quarantinePath}`);
  console.log(`  ${reportPath}`);
}

main().catch(err => {
  console.error(`[import-raw-sources] ${err.message}`);
  process.exitCode = 1;
});