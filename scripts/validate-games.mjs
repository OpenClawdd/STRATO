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
const SUSPICIOUS_HOST_TERMS = /\b(proxy|mirror|unblock|bypass|cloak)\b/i;
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

function isExternalSourceCandidate(game) {
  const tags = Array.isArray(game.tags) ? game.tags.map(tag => normalize(tag)) : [];
  return Boolean(
    game.provider ||
      game.source ||
      game.needsCheck ||
      game.needsReview ||
      tags.includes('external') ||
      tags.includes('needs-check') ||
      game.reliability === 'yellow'
  );
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

async function existsPublicFile(publicPath) {
  if (!publicPath || !String(publicPath).startsWith('/')) return true;
  try {
    await fs.access(path.join(rootDir, 'public', publicPath));
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
  const quarantine = [];
  const seenTitles = new Map();
  const seenIds = new Map();
  const seenUrls = new Map();
  const seenTitleUrl = new Map();

  for (const game of games) {
    const title = game.name || game.title;
    const url = game.url;
    const normalizedTitle = normalize(title);
    const normalizedUrl = normalize(url);
    const normalizedPair = `${normalizedTitle}|${normalizedUrl}`;

    if (!title || !String(title).trim()) addIssue(issues, 'error', 'missing-title', game, 'Missing title/name');
    if (!game.id || !String(game.id).trim()) {
      addIssue(issues, 'error', 'missing-id', game, 'Missing id');
    } else if (seenIds.has(String(game.id))) {
      addIssue(issues, 'error', 'duplicate-id', game, `Duplicate id with ${seenIds.get(String(game.id))}`);
    } else {
      seenIds.set(String(game.id), title || game.id);
    }

    if (!url || !String(url).trim()) {
      addIssue(issues, 'error', 'missing-url', game, 'Missing url');
    } else {
      const urlStatus = validateUrl(String(url));
      if (!urlStatus.ok) {
        const severity = game.config_required || game.needsConfig ? 'warning' : 'error';
        addIssue(issues, severity, urlStatus.reason.replace(/\s+/g, '-'), game, urlStatus.reason);
        if (severity === 'error') quarantine.push({ id: game.id, title: title || game.id, reason: urlStatus.reason });
      } else if (String(url).startsWith('/games/') && !(await existsPublicFile(String(url)))) {
        addIssue(issues, 'error', 'broken-local-game-url', game, `Local game path does not exist: ${url}`);
        quarantine.push({ id: game.id, title: title || game.id, reason: 'broken-local-game-url' });
      } else if (game.reliability === 'green' && !String(url).startsWith('/games/')) {
        addIssue(issues, 'error', 'green-external-url', game, 'Green reliability is reserved for verified local /games paths');
      } else if (!String(url).startsWith('/')) {
        try {
          const parsed = new URL(String(url));
          if (SUSPICIOUS_HOST_TERMS.test(parsed.hostname)) {
            addIssue(issues, 'warning', 'suspicious-hostname', game, `Hostname looks like a bypass surface: ${parsed.hostname}`);
          }
        } catch {}
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
      if (!isExternalSourceCandidate(game)) {
        addIssue(issues, 'warning', 'missing-thumbnail', game, 'Missing thumbnail; STRATO fallback art will be used');
      }
    } else if (
      PLACEHOLDER_URL.test(thumbnail) ||
      thumbnail.endsWith('/') ||
      /(^|\/)placeholder\.(png|jpe?g|webp|gif)$/i.test(thumbnail)
    ) {
      addIssue(issues, 'warning', 'broken-thumbnail-looking-value', game, 'Thumbnail looks incomplete');
    } else if (!(await existsPublicAsset(thumbnail))) {
      addIssue(issues, 'warning', 'missing-thumbnail-file', game, `Local thumbnail not found: ${thumbnail}`);
    }

    if (!String(game.description || '').trim()) addIssue(issues, 'warning', 'empty-description', game, 'Description is empty');

    const searchableText = `${title || ''} ${game.description || ''} ${(game.tags || []).join(' ')} ${game.category || ''}`;
    if (ADULT_TERMS.test(searchableText)) {
      addIssue(
        issues,
        game.needsReview || isExternalSourceCandidate(game) ? 'warning' : 'error',
        'adult-content',
        game,
        'Adult/inappropriate catalog signal',
      );
    }
    if (GAMBLING_TERMS.test(searchableText)) {
      addIssue(
        issues,
        game.needsReview || isExternalSourceCandidate(game) ? 'warning' : 'error',
        'gambling-content',
        game,
        'Gambling/casino catalog signal',
      );
    }
    if (DIRECTORY_TERMS.test(searchableText) || ['proxies', 'directories', 'game-hubs'].includes(normalize(game.category))) {
      const severity = game.config_required || game.needsConfig ? 'warning' : 'error';
      addIssue(issues, severity, 'not-playable-game-surface', game, 'Entry looks like a directory/proxy surface rather than a playable game');
      if (severity === 'error') quarantine.push({ id: game.id, title: title || game.id, reason: 'non-playable-game-surface' });
    }
  }

  return { games, issues, quarantine };
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
    const { games, issues, quarantine } = await validateGames(process.argv[2] ? path.resolve(process.argv[2]) : catalogPath);
    const groups = groupIssues(issues);
    const errorCount = issues.filter(issue => issue.severity === 'error').length;
    const warningCount = issues.filter(issue => issue.severity === 'warning').length;

    console.log(`STRATO catalog validation`);
    console.log(`Total games: ${games.length}`);
    console.log(`Issue count: ${issues.length} (${errorCount} errors, ${warningCount} warnings)`);
    console.log(`Quarantine candidates: ${quarantine.length}`);

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
