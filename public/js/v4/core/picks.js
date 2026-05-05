import { categoryOf, playableCatalog } from './catalog.js';
import { health } from './health.js';
import { keys, readJson } from './storage.js';

export function hash(value) {
  let output = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    output ^= value.charCodeAt(i);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

export function dailyPicks() {
  const date = new Date();
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const categoryCounts = new Map();
  const output = [];

  const candidates = playableCatalog()
    .filter((game) => health(game).status !== 'recently-failed')
    .sort((a, b) => {
      const aThumb = a.thumbnail ? 0 : 1;
      const bThumb = b.thumbnail ? 0 : 1;
      return aThumb - bThumb || hash(`${key}:${a.id}`) - hash(`${key}:${b.id}`);
    });

  for (const game of candidates) {
    const category = categoryOf(game).toLowerCase();
    if ((categoryCounts.get(category) || 0) >= 2 && output.length < 5) continue;
    output.push(game);
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    if (output.length >= 6) break;
  }

  return output;
}

export function surpriseCandidate() {
  const recent = new Set(readJson(keys.recent, []).slice(0, 6));
  const candidates = playableCatalog().filter((game) => health(game).status !== 'recently-failed');
  const fresh = candidates.filter((game) => !recent.has(game.id));
  const pool = fresh.length ? fresh : candidates;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}
