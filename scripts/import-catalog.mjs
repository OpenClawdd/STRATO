#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const gamesPath = path.join(rootDir, 'public', 'assets', 'games.json');
const reviewPath = path.join(rootDir, 'public', 'assets', 'games.imported.review.json');
const sourcesPath = path.join(__dirname, 'catalog-sources.json');
const cacheDir = path.join(rootDir, '.strato-cache');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (['dry-run', 'review', 'merge-approved'].includes(key)) args[key] = true;
    else args[key] = argv[++i];
  }
  return args;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return [...new Set(tags.map(String).map(tag => tag.trim()).filter(Boolean))].slice(0, 8);
  if (typeof tags === 'string') return normalizeTags(tags.split(','));
  return [];
}

function normalizeEntry(entry, source) {
  const title = entry.title || entry.name;
  const id = entry.id || slugify(title);
  const importedAt = new Date().toISOString();
  return {
    id,
    title,
    name: title,
    url: entry.url || '',
    category: entry.category || 'arcade',
    tags: normalizeTags(entry.tags),
    description: entry.description || '',
    thumbnail: entry.thumbnail || '',
    sourceType: source.type || source.adapter || 'unknown',
    sourceName: source.name,
    importedAt,
    addedDate: entry.addedDate || importedAt.slice(0, 10),
    licenseNote: entry.licenseNote || source.licenseNote || '',
    status: entry.status || 'review',
    needsConfig: !!entry.needsConfig,
    playable: entry.playable !== false,
    approved: false,
    rejected: false,
  };
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function fetchCached(url, timeoutMs = 10000) {
  await fs.mkdir(cacheDir, { recursive: true });
  const cacheName = `${slugify(url)}.cache`;
  const cachePath = path.join(cacheDir, cacheName);
  try {
    const stat = await fs.stat(cachePath);
    if (Date.now() - stat.mtimeMs < 24 * 60 * 60 * 1000) {
      return await fs.readFile(cachePath, 'utf8');
    }
  } catch {}

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'STRATO catalog importer; respectful metadata review' },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const text = await response.text();
    await fs.writeFile(cachePath, text, 'utf8');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function loadAdapter(name) {
  const adapterPath = path.join(__dirname, 'catalog-adapters', `${name}.mjs`);
  return import(pathToFileURL(adapterPath).href);
}

function dedupeImported(entries, existingGames) {
  const existingKeys = new Set(existingGames.map(game => `${normalizeKey(game.name || game.title)}|${normalizeKey(game.url)}`));
  const seen = new Set();
  const output = [];
  const duplicates = [];
  for (const entry of entries) {
    const key = `${normalizeKey(entry.name || entry.title)}|${normalizeKey(entry.url)}`;
    if (!entry.name || !entry.url || seen.has(key) || existingKeys.has(key)) {
      duplicates.push(entry);
      continue;
    }
    seen.add(key);
    output.push(entry);
  }
  return { output, duplicates };
}

async function loadSource(source, args) {
  const adapter = await loadAdapter(source.adapter);
  const file = args.file ? path.resolve(args.file) : source.file ? path.resolve(rootDir, source.file) : undefined;
  const rawEntries = await adapter.loadSource({ source, file, fetchCached });
  return rawEntries.map(entry => normalizeEntry(entry, source)).filter(entry => entry.name && entry.url);
}

async function collectEntries(args) {
  const sources = await readJson(sourcesPath, []);
  const selected = args.source === 'all'
    ? sources.filter(source => source.enabled !== false)
    : sources.filter(source => source.name === (args.source || 'manual'));

  if (!selected.length) throw new Error(`No catalog source matched "${args.source || 'manual'}"`);

  const all = [];
  const failures = [];
  for (const source of selected) {
    try {
      const entries = await loadSource(source, args);
      all.push(...entries);
      console.log(`[import-catalog] ${source.name}: ${entries.length} candidates`);
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (err) {
      failures.push({ source: source.name, error: err.message });
      console.warn(`[import-catalog] ${source.name} skipped: ${err.message}`);
    }
  }
  return { entries: all, failures };
}

async function writeReview(entries) {
  const existingReview = await readJson(reviewPath, []);
  const existingKeys = new Map(existingReview.map(entry => [`${normalizeKey(entry.name || entry.title)}|${normalizeKey(entry.url)}`, entry]));
  const merged = entries.map(entry => {
    const key = `${normalizeKey(entry.name || entry.title)}|${normalizeKey(entry.url)}`;
    return { ...entry, ...(existingKeys.get(key) || {}) };
  });
  await fs.writeFile(reviewPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  return merged.length;
}

async function mergeApproved() {
  const games = await readJson(gamesPath, []);
  const review = await readJson(reviewPath, []);
  const approved = review.filter(entry => entry.approved === true && entry.rejected !== true);
  const { output, duplicates } = dedupeImported(approved, games);
  const rejected = review.filter(entry => entry.rejected === true).length;

  const backupPath = `${gamesPath}.bak.${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await fs.copyFile(gamesPath, backupPath);

  const additions = output.map(entry => {
    const { sourceName, sourceType, importedAt, approved, rejected, ...game } = entry;
    game.name ||= game.title;
    delete game.title;
    return game;
  });
  await fs.writeFile(gamesPath, JSON.stringify([...games, ...additions], null, 2) + '\n', 'utf8');

  console.log(`Merged approved entries`);
  console.log(`Added: ${additions.length}`);
  console.log(`Skipped duplicates: ${duplicates.length}`);
  console.log(`Rejected in review: ${rejected}`);
  console.log(`Backup: ${path.relative(rootDir, backupPath)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args['merge-approved']) {
    await mergeApproved();
    return;
  }

  const games = await readJson(gamesPath, []);
  const { entries, failures } = await collectEntries(args);
  const { output, duplicates } = dedupeImported(entries, games);

  console.log(`Candidates: ${entries.length}`);
  console.log(`Reviewable: ${output.length}`);
  console.log(`Duplicates/skipped: ${duplicates.length}`);
  if (failures.length) console.log(`Source failures: ${failures.length}`);

  if (args.review) {
    const count = await writeReview(output);
    console.log(`Review file written: ${path.relative(rootDir, reviewPath)} (${count} entries)`);
  } else if (args['dry-run']) {
    for (const entry of output.slice(0, 20)) {
      console.log(`- ${entry.name} | ${entry.url} | ${entry.category}`);
    }
    if (output.length > 20) console.log(`... ${output.length - 20} more`);
  } else {
    console.log('No file written. Use --dry-run or --review.');
  }
}

main().catch((err) => {
  console.error(`[import-catalog] ${err.message}`);
  process.exitCode = 1;
});
