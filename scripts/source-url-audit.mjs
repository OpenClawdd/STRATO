#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const gamesPath = path.join(rootDir, 'public', 'assets', 'games.json');
const capturePaths = {
  selenite: path.join(rootDir, 'captures', 'applied', 'selenite-resources.raw.json'),
  gnMath: path.join(rootDir, 'captures', 'applied', 'gn-math.raw.json'),
  oneKey: path.join(rootDir, 'captures', 'applied', 'onekey-deep.raw.json'),
  frogie: path.join(rootDir, 'captures', 'applied', 'frogie.raw.json'),
  lucide: path.join(rootDir, 'captures', 'applied', 'lucide-frame-page-1.raw.json'),
};

function clean(value) {
  return String(value || '').trim();
}

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function readJson(file, fallback) {
  return fs
    .readFile(file, 'utf8')
    .then((text) => JSON.parse(text))
    .catch((err) => {
      if (err.code === 'ENOENT') return fallback;
      throw err;
    });
}

function sourceKey(game) {
  return String(game?.provider || game?.source || 'unknown').toLowerCase();
}

function isExternalGame(game) {
  const url = clean(game?.url);
  return /^https?:\/\//i.test(url);
}

function lastPathSlug(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return slugify(parts.at(-1) || '');
  } catch {
    return slugify(url.split('/').filter(Boolean).at(-1) || url);
  }
}

function loadSeleniteEvidence(raw) {
  const bySlug = new Map();
  for (const item of raw.items || []) {
    const image = clean(item.image);
    const match = image.match(/\/resources\/semag\/([^/]+)\//i);
    if (!match) continue;
    const slug = slugify(match[1]);
    if (!slug) continue;
    const evidenceUrl = `https://selenite.cc/resources/semag/${slug}/index.html`;
    const entry = {
      source: 'selenite',
      sourceFile: capturePaths.selenite,
      evidenceUrl,
      rawUrl: clean(item.href),
      evidenceKind: 'capture-image',
      title: clean(item.text || item.title),
    };
    for (const alias of new Set([slug, slugify(item.slug), slugify(item.text), slugify(item.title)])) {
      if (alias) bySlug.set(alias, entry);
    }
  }
  return bySlug;
}

function loadGnMathEvidence(raw) {
  const byId = new Map();
  for (const item of raw.items || []) {
    const href = clean(item.href);
    const match = href.match(/openGame\((\-?\d+)\)/i);
    if (!match) continue;
    const id = String(Number(match[1]));
    if (!id || id === 'NaN') continue;
    const entry = {
      source: 'gn-math',
      sourceFile: capturePaths.gnMath,
      evidenceUrl: clean(raw.sourceUrl) || 'https://gn-math.dev/',
      rawUrl: href,
      evidenceKind: 'dom-openGame',
      title: clean(item.text || item.title),
    };
    byId.set(id, entry);
  }
  return byId;
}

function loadOneKeyEvidence(raw) {
  const bySlug = new Map();
  for (const item of raw.cards || []) {
    const title = clean(item.text || item.title || item.alt);
    if (!title || !clean(item.image)) continue;
    const slug = slugify(title);
    if (!slug) continue;
    const entry = {
      source: '1key',
      sourceFile: capturePaths.oneKey,
      evidenceUrl: `https://1key.lol/games/game/?id=${slug}`,
      rawUrl: clean(item.href),
      evidenceKind: 'card',
      title,
    };
    bySlug.set(slug, entry);
  }
  return bySlug;
}

function loadFrogieEvidence(raw) {
  const bySlug = new Map();
  for (const item of raw.items || []) {
    const title = clean(item.text || item.title || item.alt);
    const href = clean(item.href);
    if (!title || !href) continue;
    let evidenceUrl = '';
    try {
      const match = href.match(
        /^(?:window\.location\.href|window\.open|launch)\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?$/i,
      ) || href.match(/^window\.location\.href\s*=\s*['"]([^'"]+)['"]\s*;?$/i);
      if (match) {
        let value = clean(match[1]);
        if (/^https?:\/\//i.test(value)) evidenceUrl = value;
        else if (value.startsWith('/')) evidenceUrl = new URL(value, new URL(raw.sourceUrl).origin).toString();
        else if (value) evidenceUrl = new URL(`/${value.replace(/^\/+/, '')}`, new URL(raw.sourceUrl).origin).toString();
      }
    } catch {
      evidenceUrl = '';
    }
    if (!evidenceUrl) continue;
    const slug = slugify(title);
    if (!slug) continue;
    const entry = {
      source: 'frogie',
      sourceFile: capturePaths.frogie,
      evidenceUrl,
      rawUrl: href,
      evidenceKind: 'dom-href',
      title,
    };
    bySlug.set(slug, entry);
  }
  return bySlug;
}

function loadLucideEvidence(raw) {
  const bySlug = new Map();
  for (const item of raw.items || []) {
    if (String(item.sourceEvidence || item.evidence || '') !== 'lucide-frame-dom') continue;
    const title = clean(item.text || item.title || item.alt);
    if (!title) continue;
    const slug = slugify(title);
    if (!slug) continue;
    const entry = {
      source: 'lucide',
      sourceFile: capturePaths.lucide,
      evidenceUrl: 'https://lucideon.top/g/frame',
      rawUrl: clean(item.href),
      evidenceKind: 'frame-dom',
      title,
    };
    bySlug.set(slug, entry);
  }
  return bySlug;
}

export async function loadSourceEvidence() {
  const [seleniteRaw, gnMathRaw, oneKeyRaw, frogieRaw, lucideRaw] = await Promise.all([
    readJson(capturePaths.selenite, { items: [] }),
    readJson(capturePaths.gnMath, { items: [] }),
    readJson(capturePaths.oneKey, { cards: [] }),
    readJson(capturePaths.frogie, { items: [] }),
    readJson(capturePaths.lucide, { items: [] }),
  ]);
  return {
    selenite: loadSeleniteEvidence(seleniteRaw),
    'gn-math': loadGnMathEvidence(gnMathRaw),
    '1key': loadOneKeyEvidence(oneKeyRaw),
    frogie: loadFrogieEvidence(frogieRaw),
    lucide: loadLucideEvidence(lucideRaw),
    files: {
      selenite: capturePaths.selenite,
      gnMath: capturePaths.gnMath,
      oneKey: capturePaths.oneKey,
      frogie: capturePaths.frogie,
      lucide: capturePaths.lucide,
    },
  };
}

function evidenceForGame(game, evidence) {
  const source = sourceKey(game);
  const map = evidence[source];
  if (!map) return null;

  const candidates = [];
  if (source === 'selenite') {
    candidates.push(
      slugify(game?.id),
      slugify(game?.name),
      slugify(game?.title),
      lastPathSlug(game?.url),
      slugify(game?.evidence?.slug),
    );
  } else if (source === 'gn-math') {
    const match = String(game?.url || '').match(/#game-(\d+)/i);
    if (match) candidates.push(String(Number(match[1])));
    if (game?.evidence?.gnMathId != null) candidates.push(String(game.evidence.gnMathId));
  } else {
    candidates.push(slugify(game?.name), slugify(game?.title), slugify(game?.id), lastPathSlug(game?.url));
  }

  for (const alias of candidates.filter(Boolean)) {
    const found = map.get(alias);
    if (found) return { ...found, matchedAlias: alias };
  }
  return null;
}

function suspiciousPattern(game) {
  const source = sourceKey(game);
  const url = clean(game?.url);
  if (source === 'selenite' && /\/projects\//i.test(url)) {
    return { suspicious: true, reason: 'Selenite /projects/ URL' };
  }
  if (source === 'gn-math' && (!url || /^https?:\/\/gn-math\.dev\/#game-\d+/i.test(url) || game?.needsReview)) {
    return { suspicious: true, reason: 'GN Math source needs review' };
  }
  if (game?.needsReview) {
    return { suspicious: true, reason: 'Marked needsReview' };
  }
  return { suspicious: false, reason: '' };
}

export function buildSourceUrlAudit(games, evidence) {
  const list = Array.isArray(games) ? games : [];
  const external = list.filter(isExternalGame);
  const entries = external.map((game) => {
    const source = sourceKey(game);
    const evidenceInfo = evidenceForGame(game, evidence);
    const suspicious = suspiciousPattern(game);
    return {
      id: game.id || '',
      title: game.name || game.title || '',
      source,
      currentUrl: clean(game.url),
      needsReview: Boolean(game.needsReview),
      suspiciousPattern: suspicious.suspicious,
      suspiciousReason: suspicious.reason,
      evidenceUrlExists: Boolean(evidenceInfo),
      evidenceUrl: evidenceInfo?.evidenceUrl || '',
      evidenceKind: evidenceInfo?.evidenceKind || '',
      evidenceSourceFile: evidenceInfo?.sourceFile || '',
      matchedAlias: evidenceInfo?.matchedAlias || '',
      rawEvidenceUrl: evidenceInfo?.rawUrl || '',
    };
  });

  const bySource = entries.reduce((acc, entry) => {
    acc[entry.source] ||= [];
    acc[entry.source].push(entry);
    return acc;
  }, {});

  const summary = Object.fromEntries(
    Object.entries(bySource).map(([source, items]) => [
      source,
      {
        total: items.length,
        needsReview: items.filter((item) => item.needsReview).length,
        suspicious: items.filter((item) => item.suspiciousPattern).length,
        evidenceUrls: items.filter((item) => item.evidenceUrlExists).length,
      },
    ]),
  );

  return {
    generatedAt: new Date().toISOString(),
    totalExternal: entries.length,
    sources: summary,
    entries,
    entriesBySource: bySource,
  };
}

export function repairSourceUrls(games, evidence) {
  const list = Array.isArray(games) ? games.map((game) => ({ ...game })) : [];
  let repairedSelenite = 0;
  let markedGnMathReview = 0;

  for (const game of list) {
    const source = sourceKey(game);
    if (source === 'selenite') {
      const evidenceInfo = evidenceForGame(game, evidence);
      if (evidenceInfo?.evidenceUrl && clean(game.url) !== evidenceInfo.evidenceUrl) {
        game.url = evidenceInfo.evidenceUrl;
        repairedSelenite += 1;
      }
    }

    if (source === 'gn-math') {
      if (!game.needsReview) {
        markedGnMathReview += 1;
      }
      game.needsReview = true;
      game.sourceWarning ||= 'gn-math-url-needs-review';
      game.reviewStatus ||= 'pending';
      const evidenceInfo = evidenceForGame(game, evidence);
      if (evidenceInfo?.evidenceUrl && clean(game.url) !== evidenceInfo.evidenceUrl) {
        game.url = evidenceInfo.evidenceUrl;
      }
    }
  }

  return {
    games: list,
    counts: {
      repairedSelenite,
      markedGnMathReview,
    },
  };
}

function printReport(report) {
  console.log('STRATO external source audit');
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`External entries: ${report.totalExternal}`);
  for (const [source, stats] of Object.entries(report.sources).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`\n${source}`);
    console.log(`  total: ${stats.total}`);
    console.log(`  needsReview: ${stats.needsReview}`);
    console.log(`  suspicious: ${stats.suspicious}`);
    console.log(`  evidenceUrls: ${stats.evidenceUrls}`);
    for (const entry of (report.entriesBySource[source] || []).slice(0, 8)) {
      console.log(`  - ${entry.id} | ${entry.title}`);
      console.log(`    url: ${entry.currentUrl}`);
      console.log(`    needsReview: ${entry.needsReview}`);
      console.log(`    suspicious: ${entry.suspiciousPattern}${entry.suspiciousReason ? ` (${entry.suspiciousReason})` : ''}`);
      console.log(`    evidenceUrl: ${entry.evidenceUrl || 'none'}`);
    }
    if ((report.entriesBySource[source] || []).length > 8) {
      console.log(`  ... ${(report.entriesBySource[source] || []).length - 8} more`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const apply = process.argv.includes('--apply');
  const games = await readJson(gamesPath, []);
  const evidence = await loadSourceEvidence();
  const audit = buildSourceUrlAudit(games, evidence);

  if (apply) {
    const repaired = repairSourceUrls(games, evidence);
    await fs.writeFile(gamesPath, JSON.stringify(repaired.games, null, 2) + '\n', 'utf8');
    console.log(`Repaired Selenite URLs: ${repaired.counts.repairedSelenite}`);
    console.log(`Marked GN Math needsReview: ${repaired.counts.markedGnMathReview}`);
  } else {
    printReport(audit);
  }
}
