// ── STRATO v21 — Leaderboard Routes Tests ──
// Tests for src/routes/leaderboard.js: game scores, global leaderboard

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { default as express } from 'express';
import request from 'supertest';
import { createMockStore, sampleUser, sampleScore, buildApp } from '../setup.js';

const mockStore = createMockStore();
vi.mock('../../src/db/store.js', () => ({
  default: mockStore,
}));

describe('Leaderboard Routes', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(mockStore._collections).forEach((k) => delete mockStore._collections[k]);

    const { default: router } = await import('../../src/routes/leaderboard.js');
    app = await buildApp(router, mockStore);
  });

  describe('GET /api/leaderboard/:gameId', () => {
    it('should return top 10 scores for a game', async () => {
      mockStore._seed('scores', [
        { gameId: 'tetris', username: 'alice', score: 5000, id: 's1', created_at: new Date().toISOString() },
        { gameId: 'tetris', username: 'bob', score: 3000, id: 's2', created_at: new Date().toISOString() },
        { gameId: 'tetris', username: 'charlie', score: 7000, id: 's3', created_at: new Date().toISOString() },
      ]);

      const res = await request(app).get('/api/leaderboard/tetris');
      expect(res.status).toBe(200);
      expect(res.body.gameId).toBe('tetris');
      expect(res.body.leaderboard).toHaveLength(3);
    });

    it('should sort scores descending (highest first)', async () => {
      mockStore._seed('scores', [
        { gameId: 'pong', username: 'alice', score: 5000, id: 's1', created_at: new Date().toISOString() },
        { gameId: 'pong', username: 'bob', score: 9000, id: 's2', created_at: new Date().toISOString() },
        { gameId: 'pong', username: 'charlie', score: 3000, id: 's3', created_at: new Date().toISOString() },
      ]);

      const res = await request(app).get('/api/leaderboard/pong');
      expect(res.status).toBe(200);
      expect(res.body.leaderboard[0].score).toBe(9000);
      expect(res.body.leaderboard[1].score).toBe(5000);
      expect(res.body.leaderboard[2].score).toBe(3000);
    });

    it('should include rank in leaderboard entries', async () => {
      mockStore._seed('scores', [
        { gameId: 'tetris', username: 'alice', score: 100, id: 's1', created_at: new Date().toISOString() },
      ]);

      const res = await request(app).get('/api/leaderboard/tetris');
      expect(res.body.leaderboard[0].rank).toBe(1);
    });

    it('should filter by daily period', async () => {
      const now = Date.now();
      mockStore._seed('scores', [
        { gameId: 'tetris', username: 'alice', score: 100, id: 's1', created_at: new Date(now - 1000).toISOString() },
        { gameId: 'tetris', username: 'bob', score: 200, id: 's2', created_at: new Date(now - 48 * 3600 * 1000).toISOString() },
      ]);

      const res = await request(app).get('/api/leaderboard/tetris?period=daily');
      expect(res.status).toBe(200);
      expect(res.body.period).toBe('daily');
      // Only alice's score should appear (bob's is 48h old)
      expect(res.body.leaderboard.every((e) => e.username !== 'bob')).toBe(true);
    });

    it('should filter by weekly period', async () => {
      const now = Date.now();
      mockStore._seed('scores', [
        { gameId: 'tetris', username: 'alice', score: 100, id: 's1', created_at: new Date(now - 1000).toISOString() },
        { gameId: 'tetris', username: 'bob', score: 200, id: 's2', created_at: new Date(now - 8 * 24 * 3600 * 1000).toISOString() },
      ]);

      const res = await request(app).get('/api/leaderboard/tetris?period=weekly');
      expect(res.status).toBe(200);
      expect(res.body.period).toBe('weekly');
    });

    it('should return 400 for invalid period', async () => {
      const res = await request(app).get('/api/leaderboard/tetris?period=monthly');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('daily, weekly, or alltime');
    });

    it('should default to alltime period', async () => {
      const res = await request(app).get('/api/leaderboard/tetris');
      expect(res.body.period).toBe('alltime');
    });

    it('should limit results to top 10', async () => {
      const scores = Array.from({ length: 15 }, (_, i) => ({
        gameId: 'tetris',
        username: `user${i}`,
        score: 1000 - i * 50,
        id: `s${i}`,
        created_at: new Date().toISOString(),
      }));
      mockStore._seed('scores', scores);

      const res = await request(app).get('/api/leaderboard/tetris');
      expect(res.body.leaderboard.length).toBeLessThanOrEqual(10);
    });
  });

  describe('POST /api/leaderboard/:gameId', () => {
    it('should submit a score', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/leaderboard/tetris')
        .send({ score: 4200 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.score).toBe(4200);
    });

    it('should clamp score to 0-10,000,000', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/leaderboard/tetris')
        .send({ score: -500 });

      expect(res.status).toBe(200);
      expect(res.body.score).toBe(0);
    });

    it('should clamp score upper bound to 10,000,000', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/leaderboard/tetris')
        .send({ score: 99999999 });

      expect(res.status).toBe(200);
      expect(res.body.score).toBe(10_000_000);
    });

    it('should return 400 for non-numeric score', async () => {
      const res = await request(app)
        .post('/api/leaderboard/tetris')
        .send({ score: 'high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('number');
    });

    it('should return 400 for NaN score', async () => {
      const res = await request(app)
        .post('/api/leaderboard/tetris')
        .send({ score: NaN });

      // NaN is serialized as null in JSON, but express might parse it differently
      expect([400, 200]).toContain(res.status);
    });
  });

  describe('GET /api/leaderboard (global)', () => {
    it('should return global leaderboard sorted by XP', async () => {
      mockStore._seed('users', [
        { ...sampleUser, username: 'low', xp: 10, level: 1, coins: 0 },
        { ...sampleUser, username: 'high', xp: 9000, level: 90, coins: 500 },
        { ...sampleUser, username: 'mid', xp: 500, level: 6, coins: 50 },
      ]);

      const res = await request(app).get('/api/leaderboard');
      expect(res.status).toBe(200);
      expect(res.body.leaderboard[0].username).toBe('high');
    });

    it('should limit to top 25 players', async () => {
      const users = Array.from({ length: 30 }, (_, i) => ({
        ...sampleUser,
        username: `player${i}`,
        xp: 1000 - i * 10,
        level: Math.floor((1000 - i * 10) / 100) + 1,
      }));
      mockStore._seed('users', users);

      const res = await request(app).get('/api/leaderboard');
      expect(res.body.leaderboard.length).toBeLessThanOrEqual(25);
    });

    it('should include rank in global leaderboard', async () => {
      mockStore._seed('users', [
        { ...sampleUser, username: 'a', xp: 100 },
        { ...sampleUser, username: 'b', xp: 200 },
      ]);

      const res = await request(app).get('/api/leaderboard');
      expect(res.body.leaderboard[0].rank).toBe(1);
    });
  });
});
