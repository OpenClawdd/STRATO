import { describe, expect, it, vi } from 'vitest';
import { setGames, state } from '../../public/js/v5/core/state.js';
import { playableCatalog, normalizeGame } from '../../public/js/v5/core/catalog.js';

describe('Verified Universe Catalog Gating', () => {
  const mockCatalog = [
    { id: 'ok-game', name: 'OK Game', reliability: 'green', category: 'arcade', url: '/games/ok.html' },
    { id: 'yellow-game', name: 'Yellow Game', reliability: 'yellow', category: 'arcade', url: '/games/yellow.html' },
    { id: 'quarantined-game', name: 'Bad Game', reliability: 'red', category: 'arcade', url: '/games/bad.html' },
  ];

  it('excludes reliability:red games from the playable catalog', () => {
    state.activeMood = 'all';
    setGames(mockCatalog, normalizeGame);
    const playable = playableCatalog();
    const ids = playable.map(g => g.id);
    
    expect(ids).toContain('ok-game');
    expect(ids).toContain('yellow-game');
    expect(ids).not.toContain('quarantined-game');
    expect(playable).toHaveLength(2);
  });
});

describe('Truthful Labeling', () => {
  it('identifies verified playable count accurately', () => {
    state.activeMood = 'all';
    setGames([
      { id: '1', reliability: 'green', url: '/1' },
      { id: '2', reliability: 'red', url: '/2' },
      { id: '3', reliability: 'yellow', url: '/3' }
    ], normalizeGame);
    
    const playableCount = playableCatalog().length;
    expect(playableCount).toBe(2);
  });
});
