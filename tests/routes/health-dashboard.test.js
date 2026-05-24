import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { buildApp } from '../setup.js';
import fs from 'node:fs/promises';

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    default: {
      ...original.default,
      readFile: vi.fn(),
    },
    readFile: vi.fn(),
  };
});

describe('Health Dashboard Route', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { default: router } = await import('../../src/routes/health-dashboard.js');
    app = await buildApp(router);
  });

  it('should return 200 health summary when CSV exists', async () => {
    const mockGames = [
      { id: 'game1', reliability: 'green', urlKind: 'game', category: 'action', sourceFamily: 'familyA' },
      { id: 'game2', reliability: 'red', urlKind: 'game', category: 'action', sourceFamily: 'familyB' }
    ];
    const mockCsv = `domain,count\n"familyA",100\n"familyB",200`;

    vi.mocked(fs.readFile).mockImplementation((path) => {
      if (path.endsWith('games.json')) {
        return Promise.resolve(JSON.stringify(mockGames));
      }
      if (path.endsWith('source-domains.csv')) {
        return Promise.resolve(mockCsv);
      }
      return Promise.reject(new Error('File not found'));
    });

    const res = await request(app).get('/api/health/summary');
    expect(res.status).toBe(200);
    expect(res.body.families).toBeDefined();
    expect(res.body.families.length).toBeGreaterThan(0);

    const familyA = res.body.families.find(f => f.name === 'familyA');
    expect(familyA).toBeDefined();
    expect(familyA.total).toBe(1); // 0 from csv + 1 from games
    expect(familyA.playable).toBe(1);
    expect(familyA.deadPct).toBe(0);

    const familyB = res.body.families.find(f => f.name === 'familyB');
    expect(familyB).toBeDefined();
    expect(familyB.total).toBe(1); // 0 from csv + 1 from games
    expect(familyB.playable).toBe(0); // reliability is red
    expect(familyB.deadPct).toBe(100);
  });

  it('should fall back to games.json when CSV is missing', async () => {
    const mockGames = [
      { id: 'game1', reliability: 'green', urlKind: 'game', category: 'action', sourceFamily: 'familyA' }
    ];

    vi.mocked(fs.readFile).mockImplementation((path) => {
      if (path.endsWith('games.json')) {
        return Promise.resolve(JSON.stringify(mockGames));
      }
      if (path.endsWith('source-domains.csv')) {
        return Promise.reject(new Error('ENOENT'));
      }
      return Promise.reject(new Error('File not found'));
    });

    const res = await request(app).get('/api/health/summary');
    expect(res.status).toBe(200);
    expect(res.body.families).toBeDefined();
    const familyA = res.body.families.find(f => f.name === 'familyA');
    expect(familyA).toBeDefined();
    expect(familyA.total).toBe(1);
    expect(familyA.playable).toBe(1);
  });

  it('should handle isPlayable correctly for blocked categories', async () => {
    const mockGames = [
      { id: 'game1', reliability: 'green', urlKind: 'game', category: 'proxies', sourceFamily: 'familyA' },
      { id: 'game2', reliability: 'green', urlKind: 'game', category: 'directories', sourceFamily: 'familyA' },
      { id: 'game3', reliability: 'green', urlKind: 'directory', category: 'action', sourceFamily: 'familyA' }
    ];

    vi.mocked(fs.readFile).mockImplementation((path) => {
      if (path.endsWith('games.json')) {
        return Promise.resolve(JSON.stringify(mockGames));
      }
      if (path.endsWith('source-domains.csv')) {
        return Promise.reject(new Error('ENOENT'));
      }
      return Promise.reject(new Error('File not found'));
    });

    const res = await request(app).get('/api/health/summary');
    expect(res.status).toBe(200);
    const familyA = res.body.families.find(f => f.name === 'familyA');
    expect(familyA).toBeDefined();
    expect(familyA.total).toBe(3);
    expect(familyA.playable).toBe(0); // all are blocked/directories
    expect(familyA.deadPct).toBe(100);
  });
});
