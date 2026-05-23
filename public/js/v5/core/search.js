import {
  categoryOf,
  descriptionOf,
  nameOf,
  tagsOf,
  visibleCatalog,
} from "./catalog.js";
import { keys, readJson } from "./storage.js";

export function levenshtein(a, b) {
  const left = String(a || "");
  const right = String(b || "");
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

export function abbreviation(value) {
  const str = String(value || "");
  // Split by non-alphanumeric OR by camelCase boundaries
  return str
    .split(/[^A-Za-z0-9]+|(?=[A-Z])/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toLowerCase();
}

function searchContext(context = {}) {
  return {
    recent:
      context.recent instanceof Set
        ? context.recent
        : new Set(context.recent || readJson(keys.recent, [])),
    counts: context.counts || readJson(keys.playCounts, {}),
  };
}

export function scoreGame(game, query, context = {}) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return Infinity;
  const title = game.searchTitle || nameOf(game).toLowerCase();
  const category = game.searchCategory || categoryOf(game).toLowerCase();
  const tags = game.searchTags || tagsOf(game).join(" ").toLowerCase();
  const description =
    game.searchDescription || descriptionOf(game).toLowerCase();
  const blob =
    game.searchableText || [title, category, tags, description].join(" ");
  const abbr = game.searchAbbr || abbreviation(title);

  const { recent, counts } = searchContext(context);
  const isRecent = recent.has(game.id);
  const playCount = Number(counts[game.id] || 0);
  const boost = isRecent ? 0.5 : playCount > 5 ? 0.8 : 1.0;

  let baseScore = Infinity;
  if (title === q) baseScore = 0;
  else if (abbr === q) baseScore = 1;
  else if (title.startsWith(q)) baseScore = 2;
  else if (abbr.startsWith(q)) baseScore = 4;
  else if (title.includes(q)) baseScore = 8 + title.indexOf(q);
  else if (title.split(/\s+/).some((word) => word.startsWith(q)))
    baseScore = 12;
  else if (category.includes(q)) baseScore = 22;
  else if (tags.split(/\s+/).some((word) => word.startsWith(q))) baseScore = 24;
  else if (tags.includes(q)) baseScore = 28;
  else if (description.includes(q)) baseScore = 46;
  else if (blob.includes(q)) baseScore = 54;

  return baseScore * boost;
}

export function searchGames(query) {
  const context = searchContext();
  const matches = [];
  for (const game of visibleCatalog()) {
    const score = scoreGame(game, query, context);
    if (score < 82) matches.push({ game, score });
  }
  matches.sort(
    (a, b) => a.score - b.score || nameOf(a.game).localeCompare(nameOf(b.game)),
  );
  return matches.slice(0, 10).map(({ game }) => game);
}
