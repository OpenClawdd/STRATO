import { categoryOf, descriptionOf, nameOf, tagsOf, visibleCatalog } from './catalog.js';

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

export function abbreviation(value) {
  return String(value || '')
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toLowerCase();
}

export function scoreGame(game, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return Infinity;
  const title = nameOf(game).toLowerCase();
  const category = categoryOf(game).toLowerCase();
  const tags = tagsOf(game).join(' ').toLowerCase();
  const description = descriptionOf(game).toLowerCase();
  const blob = [title, category, tags, description].join(' ');
  const abbr = abbreviation(title);

  if (title === q) return 0;
  if (abbr === q) return 1;
  if (title.startsWith(q)) return 2;
  if (abbr.startsWith(q)) return 4;
  if (title.includes(q)) return 8 + title.indexOf(q);
  if (category.includes(q)) return 22;
  if (tags.includes(q)) return 28;
  if (description.includes(q)) return 46;
  if (blob.includes(q)) return 54;

  const distance = Math.min(
    levenshtein(title.slice(0, q.length + 3), q),
    ...title.split(/\s+/).map((word) => levenshtein(word.slice(0, q.length + 2), q)),
  );
  return 72 + distance;
}

export function searchGames(query) {
  return visibleCatalog()
    .map((game) => ({ game, score: scoreGame(game, query) }))
    .filter(({ score }) => score < 82)
    .sort((a, b) => a.score - b.score || nameOf(a.game).localeCompare(nameOf(b.game)))
    .slice(0, 10)
    .map(({ game }) => game);
}
