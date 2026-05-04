#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const catalogPath = path.join(rootDir, 'public', 'assets', 'games.json');

const PLACEHOLDER_URL = /^(#|about:blank|\$\{[^}]+\}|https?:\/\/(example\.(com|org|net)|localhost\/?))/i;
const ADULT_TERMS = /\b(porn|xxx|adult|sex|hentai|nsfw)\b/i;
const GAMBLING_TERMS = /\b(casino|slots?|poker|betting|blackjack|roulette)\b/i;
const DIRECTORY_TERMS = /\b(proxy|mirror|directory|index|hub|unblocked|exploit|cloak|bypass)\b/i;
const SAFE_SCHEMES = new Set(['http:', 'https:']);

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function addIssue(issues, severity, type, entry, message) {
  issues.push({
    severity,
    type,
    id: entry?.id || '(no id)',
    title: entry?.name || entry?.title || '(untitled)',
    message,
  });
}

function validateUrl(url) {
  if (!url) return { ok: false, reason: 'missing URL' };
  if (PLACEHOLDER_URL.test(url)) return { ok: false, reason: 'placeholder URL' };
  if (url.startsWith('/')) return { ok: true };
  try {
    const parsed = new URL(url);
    if (!SAFE_SCHEMES.has(parsed.protocol)) return { ok: false, reason: `unsupported URL scheme: ${parsed.protocol}` };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'invalid URL' };
  }
}

async function existsPublicAsset(assetPath) {
  if (!assetPath || !assetPath.startsWith('/')) return true;
  try {
    await fs.access(path.join(rootDir, 'public', assetPath));
    return true;
  } catch {
    return false;
  }
}

export async function validateGames(filePath = catalogPath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const games = JSON.parse(raw);
  if (!Array.isArray(games)) {
    throw new Error('games.json must contain an array');
  }

  const issues = [];
  const seenTitles = new Map();
  const seenUrls = new Map();
  const seenTitleUrl = new Map();

  for (const game of games) {
    const title = game.name || game.title;
    const url = game.url;
    const normalizedTitle = normalize(title);
    const normalizedUrl = normalize(url);
    const normalizedPair = `${normalizedTitle}|${normalizedUrl}`;

    if (!title || !String(title).trim()) addIssue(issues, 'error', 'missing-title', game, 'Missing title/name');
    if (!game.id || !String(game.id).trim()) addIssue(issues, 'warning', 'missing-id', game, 'Missing id');

    if (!url || !String(url).trim()) {
      addIssue(issues, 'error', 'missing-url', game, 'Missing url');
    } else {
      const urlStatus = validateUrl(String(url));
      if (!urlStatus.ok) {
        const severity = game.config_required || game.needsConfig ? 'warning' : 'error';
        addIssue(issues, severity, urlStatus.reason.replace(/\s+/g, '-'), game, urlStatus.reason);
      }
    }

    if (normalizedTitle) {
      if (seenTitles.has(normalizedTitle)) addIssue(issues, 'warning', 'duplicate-title', game, `Duplicate title with ${seenTitles.get(normalizedTitle)}`);
      else seenTitles.set(normalizedTitle, game.id || title);
    }

    if (normalizedUrl && !PLACEHOLDER_URL.test(String(url))) {
      if (seenUrls.has(normalizedUrl)) addIssue(issues, 'warning', 'duplicate-url', game, `Duplicate url with ${seenUrls.get(normalizedUrl)}`);
      else seenUrls.set(normalizedUrl, game.id || title);
    }

    if (normalizedTitle && normalizedUrl) {
      if (seenTitleUrl.has(normalizedPair)) addIssue(issues, 'warning', 'duplicate-title-url', game, `Duplicate normalized title+url with ${seenTitleUrl.get(normalizedPair)}`);
      else seenTitleUrl.set(normalizedPair, game.id || title);
    }

    if (!game.category || !String(game.category).trim()) addIssue(issues, 'warning', 'missing-category', game, 'Missing category');
    if (game.tags !== undefined && (!Array.isArray(game.tags) || game.tags.some(tag => typeof tag !== 'string' || !tag.trim()))) {
      addIssue(issues, 'warning', 'invalid-tags', game, 'Tags must be non-empty strings');
    }

    const thumbnail = String(game.thumbnail || '').trim();
    if (!thumbnail) {
      addIssue(issues, 'warning', 'missing-thumbnail', game, 'Missing thumbnail; STRATO fallback art will be used');
    } else if (PLACEHOLDER_URL.test(thumbnail) || thumbnail.endsWith('/')) {
      addIssue(issues, 'warning', 'broken-thumbnail-looking-value', game, 'Thumbnail looks incomplete');
    } else if (!(await existsPublicAsset(thumbnail))) {
      addIssue(issues, 'warning', 'missing-thumbnail-file', game, `Local thumbnail not found: ${thumbnail}`);
    }

    if (!String(game.description || '').trim()) addIssue(issues, 'warning', 'empty-description', game, 'Description is empty');

    const searchableText = `${title || ''} ${game.description || ''} ${(game.tags || []).join(' ')} ${game.category || ''}`;
    if (ADULT_TERMS.test(searchableText)) addIssue(issues, 'error', 'adult-content', game, 'Adult/inappropriate catalog signal');
    if (GAMBLING_TERMS.test(searchableText)) addIssue(issues, 'error', 'gambling-content', game, 'Gambling/casino catalog signal');
    if (DIRECTORY_TERMS.test(searchableText) || ['proxies', 'directories', 'game-hubs'].includes(normalize(game.category))) {
      const severity = game.config_required || game.needsConfig ? 'warning' : 'error';
      addIssue(issues, severity, 'not-playable-game-surface', game, 'Entry looks like a directory/proxy surface rather than a playable game');
    }
  }

  return { games, issues };
}

function groupIssues(issues) {
  return issues.reduce((groups, issue) => {
    groups[issue.type] ||= [];
    groups[issue.type].push(issue);
    return groups;
  }, {});
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { games, issues } = await validateGames(process.argv[2] ? path.resolve(process.argv[2]) : catalogPath);
    const groups = groupIssues(issues);
    const errorCount = issues.filter(issue => issue.severity === 'error').length;
    const warningCount = issues.filter(issue => issue.severity === 'warning').length;

    console.log(`STRATO catalog validation`);
    console.log(`Total games: ${games.length}`);
    console.log(`Issue count: ${issues.length} (${errorCount} errors, ${warningCount} warnings)`);

    for (const [type, group] of Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) {
      console.log(`\n${type}: ${group.length}`);
      for (const issue of group.slice(0, 12)) {
        console.log(`  [${issue.severity}] ${issue.id} / ${issue.title}: ${issue.message}`);
      }
      if (group.length > 12) console.log(`  ... ${group.length - 12} more`);
    }

    if (errorCount > 0) process.exitCode = 1;
  } catch (err) {
    console.error(`[validate-games] ${err.message}`);
    process.exitCode = 1;
  }
}
