import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setGames, state } from '../../public/js/v5/core/state.js';
import { normalizeGame, playableCatalog, similarGames, trendingGames } from '../../public/js/v5/core/catalog.js';
import { isPlaceholder, launchability } from '../../public/js/v5/core/health.js';
import { searchGames, scoreGame } from '../../public/js/v5/core/search.js';
import { dailyPicks, surpriseCandidate } from '../../public/js/v5/core/picks.js';
import { keys, writeJson } from '../../public/js/v5/core/storage.js';

const catalog = [
  { id: '2048', name: '2048', category: 'puzzle', tags: ['numbers', 'strategy', 'offline'], description: 'Slide number tiles', url: '/games/2048/index.html', thumbnail: '/assets/2048.webp', reliability: 'green' },
  { id: 'space-run', name: 'Space Run', category: 'action', tags: ['skill', 'runner'], description: 'Fast reflex arcade run', url: '/games/space-run/index.html', thumbnail: '/assets/space.webp', reliability: 'green' },
  { id: 'speed-racer', name: 'Speed Racer', category: 'racing', tags: ['skill', 'cars'], description: 'Drive fast', url: '/games/speed/index.html', thumbnail: '', reliability: 'green' },
  { id: 'proxy-placeholder', name: 'Proxy Placeholder', category: 'proxies', tags: ['proxy'], description: 'Not a game', url: '${PROXY_URL}', reliability: 'yellow', config_required: true },
  { id: 'remote-unverified', name: 'Harbor Candidate', category: 'arcade', tags: ['remote'], description: 'Needs proxy proof', url: 'https://remote.example/unverified', reliability: 'yellow' },
  { id: 'remote-verified', name: 'Gateway Confirmed', category: 'arcade', tags: ['remote'], description: 'Transport proven', url: 'https://remote.example/verified', reliability: 'yellow', proxyVerified: true },
  { id: 'missing', name: 'Missing URL', category: 'arcade', tags: ['broken'], description: 'Broken entry', url: '', reliability: 'green' },
];

function installStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  };
}

beforeEach(() => {
  installStorage();
  state.activeMood = 'all';
  setGames(catalog, normalizeGame);
});

describe('v5 launchability and catalog gating', () => {
  it('classifies placeholder and missing URLs as not launchable', () => {
    expect(isPlaceholder('${PROXY_URL}')).toBe(true);
    expect(launchability(catalog[3]).launchable).toBe(false);
    expect(launchability(catalog[4]).status).toBe('remote-proxy-unverified');
    expect(launchability(catalog[6]).status).toBe('missing-url');
  });

  it('keeps proxy/config entries out of playable catalog surfaces', () => {
    const ids = playableCatalog().map((game) => game.id);
    expect(ids).toContain('2048');
    expect(ids).toContain('speed-racer');
    expect(ids).toContain('remote-verified');
    expect(ids).not.toContain('remote-unverified');
    expect(ids).not.toContain('proxy-placeholder');
    expect(ids).not.toContain('missing');
  });
});

describe('v5 search', () => {
  it('scores exact title matches above tag or description matches', () => {
    expect(scoreGame(catalog[0], '2048')).toBeLessThan(scoreGame(catalog[1], 'arcade'));
  });

  it('supports abbreviation-style matching without surfacing unlaunchable entries', () => {
    const results = searchGames('sr').map((game) => game.id);
    expect(results[0]).toBe('space-run');
    expect(results).not.toContain('proxy-placeholder');
  });

  it('does not return fallback games for unrelated queries', () => {
    expect(searchGames('chatgpt')).toHaveLength(0);
  });
});

describe('v5 picks and surprise', () => {
  it('produces deterministic launchable daily picks for the same date', () => {
    const day = new Date('2026-05-05T00:00:00Z');
    expect(dailyPicks(day).map((game) => game.id)).toEqual(dailyPicks(day).map((game) => game.id));
    expect(dailyPicks(day).every((game) => launchability(game).launchable)).toBe(true);
  });

  it('avoids recent games when selecting Surprise Me candidates where possible', () => {
    writeJson(keys.recent, ['2048', 'space-run']);
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(surpriseCandidate()?.id).toBe('speed-racer');
    spy.mockRestore();
  });

  it('returns similar games only from launchable related entries', () => {
    const related = similarGames(catalog[1], 4).map((game) => game.id);
    expect(related).toContain('speed-racer');
    expect(related).not.toContain('proxy-placeholder');
  });
});

describe('v5 personalization and trending', () => {
  it('returns an empty trending list for new users (no play history)', () => {
    expect(trendingGames()).toHaveLength(0);
  });

  it('populates trendingGames based on local playCounts', () => {
    writeJson(keys.playCounts, { 'space-run': 10, '2048': 5 });
    const trending = trendingGames();
    expect(trending[0].id).toBe('space-run');
    expect(trending[1].id).toBe('2048');
    expect(trending).toHaveLength(2);
  });

  it('boosts frequently played games in search results', () => {
    const query = 'space';

    // Scenario 1: No history (Base scores)
    const baseScore = scoreGame(catalog[1], query); // "Space Run"

    // Scenario 2: High play count boost
    writeJson(keys.playCounts, { 'space-run': 10 });
    const boostedScore = scoreGame(catalog[1], query);

    expect(boostedScore).toBeLessThan(baseScore);

    // Ensure exact matches still win over boosted partials
    expect(scoreGame(catalog[0], '2048')).toBeLessThan(boostedScore);
  });

  it('keeps exact matches ahead of recent partial matches', () => {
    setGames([
      ...catalog,
      { id: 'space', name: 'Space', category: 'puzzle', tags: ['exact'], description: 'Exact title', url: '/games/space/index.html', thumbnail: '/assets/space-exact.webp', reliability: 'green' },
    ], normalizeGame);
    writeJson(keys.recent, ['space-run']);

    const results = searchGames('space').map((game) => game.id);

    expect(results[0]).toBe('space');
    expect(results).not.toContain('proxy-placeholder');
  });

  it('uses shared storage snapshots while searching', () => {
    localStorage.getItem.mockClear();

    searchGames('space');

    expect(localStorage.getItem).toHaveBeenCalledWith(keys.failures);
    expect(localStorage.getItem).toHaveBeenCalledWith(keys.recent);
    expect(localStorage.getItem).toHaveBeenCalledWith(keys.playCounts);
    expect(localStorage.getItem.mock.calls.length).toBeLessThanOrEqual(3);
  });
});
