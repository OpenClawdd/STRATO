import { descriptionOf, nameOf, categoryOf, tagsOf, visibleCatalog } from './catalog.js';

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

export function searchGames(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  return visibleCatalog()
    .map((game) => {
      const title = nameOf(game).toLowerCase();
      const category = categoryOf(game).toLowerCase();
      const tags = tagsOf(game).join(' ').toLowerCase();
      const description = descriptionOf(game).toLowerCase();
      const blob = [title, category, tags, description].join(' ');
      let score = 100;
      if (title === q) score = 0;
      else if (title.startsWith(q)) score = 2;
      else if (title.includes(q)) score = 6 + title.indexOf(q);
      else if (category.includes(q) || tags.includes(q)) score = 24;
      else if (description.includes(q)) score = 42;
      else score = 70 + levenshtein(title.slice(0, q.length + 3), q);
      return { game, score };
    })
    .filter(({ score }) => score < 82)
    .sort((a, b) => a.score - b.score || nameOf(a.game).localeCompare(nameOf(b.game)))
    .slice(0, 10)
    .map(({ game }) => game);
}
