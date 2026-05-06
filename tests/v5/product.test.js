import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setGames, state } from '../../public/js/v5/core/state.js';
import { normalizeGame, playableCatalog, similarGames } from '../../public/js/v5/core/catalog.js';
import { isPlaceholder, launchability } from '../../public/js/v5/core/health.js';
import { searchGames, scoreGame } from '../../public/js/v5/core/search.js';
import { dailyPicks, surpriseCandidate } from '../../public/js/v5/core/picks.js';
import { keys, writeJson } from '../../public/js/v5/core/storage.js';

const catalog = [
  { id: '2048', name: '2048', category: 'puzzle', tags: ['numbers', 'strategy', 'offline'], description: 'Slide number tiles', url: '/games/2048/index.html', thumbnail: '/assets/2048.webp', reliability: 'green' },
  { id: 'space-run', name: 'Space Run', category: 'action', tags: ['skill', 'runner'], description: 'Fast reflex arcade run', url: '/games/space-run/index.html', thumbnail: '/assets/space.webp', reliability: 'green' },
  { id: 'speed-racer', name: 'Speed Racer', category: 'racing', tags: ['skill', 'cars'], description: 'Drive fast', url: '/games/speed/index.html', thumbnail: '', reliability: 'green' },
  { id: 'proxy-placeholder', name: 'Proxy Placeholder', category: 'proxies', tags: ['proxy'], description: 'Not a game', url: '${PROXY_URL}', reliability: 'yellow', config_required: true },
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
    expect(launchability(catalog[4]).status).toBe('missing-url');
  });

  it('keeps proxy/config entries out of playable catalog surfaces', () => {
    const ids = playableCatalog().map((game) => game.id);
    expect(ids).toContain('2048');
    expect(ids).toContain('speed-racer');
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
