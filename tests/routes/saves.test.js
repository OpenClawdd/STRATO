// ── STRATO v21 — Saves Routes Tests ──
// Tests for src/routes/saves.js: cloud save CRUD, size validation

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { default as express } from 'express';
import request from 'supertest';
import { createMockStore, sampleUser, sampleSave, buildApp } from '../setup.js';

const mockStore = createMockStore();
vi.mock('../../src/db/store.js', () => ({
  default: mockStore,
}));

describe('Saves Routes', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(mockStore._collections).forEach((k) => delete mockStore._collections[k]);

    const { default: router } = await import('../../src/routes/saves.js');
    app = await buildApp(router, mockStore);
  });

  describe('GET /api/saves/:gameId', () => {
    it('should return save data for a game', async () => {
      mockStore._seed('saves', [{ ...sampleSave, id: 'save1' }]);

      const res = await request(app).get('/api/saves/tetris');
      expect(res.status).toBe(200);
      expect(res.body.gameId).toBe('tetris');
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('updated_at');
      expect(res.body).toHaveProperty('created_at');
    });

    it('should return 404 when no save exists for game', async () => {
      const res = await request(app).get('/api/saves/unknown-game');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('No save data');
    });
  });

  describe('POST /api/saves/:gameId', () => {
    it('should create a new save', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/saves/tetris')
        .send({ data: JSON.stringify({ level: 1, score: 0 }) });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.created).toBe(true);
      expect(res.body.gameId).toBe('tetris');
    });

    it('should update existing save', async () => {
      mockStore._seed('saves', [{ ...sampleSave, id: 'save1', username: 'testuser', gameId: 'tetris' }]);

      const res = await request(app)
        .post('/api/saves/tetris')
        .send({ data: JSON.stringify({ level: 99, score: 99999 }) });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.updated).toBe(true);
    });

    it('should return 400 when save data is missing', async () => {
      const res = await request(app)
        .post('/api/saves/tetris')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Save data');
    });

    it('should return 400 when save data is null', async () => {
      const res = await request(app)
        .post('/api/saves/tetris')
        .send({ data: null });

      expect(res.status).toBe(400);
    });

    it('should reject save data over 50KB', async () => {
      const res = await request(app)
        .post('/api/saves/tetris')
        .send({ data: 'x'.repeat(51 * 1024) });

      expect(res.status).toBe(413);
      expect(res.body.error).toContain('50KB');
    });

    it('should return 400 for invalid game ID', async () => {
      const res = await request(app)
        .post('/api/saves/' + 'x'.repeat(101))
        .send({ data: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('game ID');
    });

    it('should return 400 for empty game ID', async () => {
      const res = await request(app)
        .post('/api/saves/')
        .send({ data: 'test' });

      // This will 404 since Express won't match the route
      expect(res.status).toBe(404);
    });

    it('should accept save data as object (auto-serialized)', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/saves/tetris')
        .send({ data: { level: 5, items: ['sword', 'shield'] } });

      expect(res.status).toBe(201);
    });

    it('should accept save data as string', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/saves/tetris')
        .send({ data: '{"level":5}' });

      expect(res.status).toBe(201);
    });
  });

  describe('DELETE /api/saves/:gameId', () => {
    it('should delete existing save', async () => {
      mockStore._seed('saves', [{ ...sampleSave, id: 'save1', username: 'testuser', gameId: 'tetris' }]);
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app).delete('/api/saves/tetris');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for nonexistent save', async () => {
      const res = await request(app).delete('/api/saves/unknown-game');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should not delete another users save', async () => {
      mockStore._seed('saves', [{ ...sampleSave, id: 'save1', username: 'otheruser', gameId: 'tetris' }]);

      const res = await request(app).delete('/api/saves/tetris');
      expect(res.status).toBe(404);
    });
  });
});
