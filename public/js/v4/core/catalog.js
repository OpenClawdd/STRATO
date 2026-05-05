import { state } from './state.js';
import { blockedCategories, blockedTerms, isLaunchable } from './health.js';

export const nameOf = (game) => String(game?.name || game?.title || 'Untitled');
export const categoryOf = (game) => String(game?.category || 'Arcade').replace(/-/g, ' ');
export const tagsOf = (game) => Array.isArray(game?.tags) ? game.tags.filter(Boolean).map(String) : [];
export const descriptionOf = (game) => String(game?.description || '');

export function isHomeSafe(game) {
  const category = String(game?.category || '').toLowerCase();
  if (blockedCategories.has(category)) return false;
  const text = [nameOf(game), descriptionOf(game), category, ...tagsOf(game)].join(' ').toLowerCase();
  return !blockedTerms.some((term) => text.includes(term));
}

export function playableCatalog() {
  return state.games.filter((game) => isHomeSafe(game) && isLaunchable(game) && game.reliability !== 'red');
}

export function visibleCatalog() {
  const base = playableCatalog();
  if (state.activeMood === 'all') return base;
  return base.filter((game) => {
    const mood = state.activeMood.toLowerCase();
    return categoryOf(game).toLowerCase() === mood || tagsOf(game).some((tag) => tag.toLowerCase() === mood);
  });
}

export function findGame(id) {
  return state.games.find((game) => String(game.id) === String(id));
}

export function similarGames(game, limit = 4) {
  if (!game) return [];
  const tags = new Set(tagsOf(game).map((tag) => tag.toLowerCase()));
  const category = categoryOf(game).toLowerCase();
  return playableCatalog()
    .filter((candidate) => candidate.id !== game.id)
    .map((candidate) => {
      const tagScore = tagsOf(candidate).filter((tag) => tags.has(tag.toLowerCase())).length;
      const categoryScore = categoryOf(candidate).toLowerCase() === category ? 2 : 0;
      return { candidate, score: tagScore + categoryScore };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || nameOf(a.candidate).localeCompare(nameOf(b.candidate)))
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export function moodClusters() {
  const tally = new Map();
  playableCatalog().forEach((game) => {
    [categoryOf(game), ...tagsOf(game)].forEach((raw) => {
      const key = String(raw || '').trim().toLowerCase();
      if (key.length >= 3) tally.set(key, (tally.get(key) || 0) + 1);
    });
  });
  return [...tally.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
}
