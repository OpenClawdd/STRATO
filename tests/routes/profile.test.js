// ── STRATO v21 — Profile Routes Tests ──
// Tests for src/routes/profile.js: CRUD, XP, stats

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { default as express } from 'express';
import request from 'supertest';
import { createMockStore, sampleUser, buildApp } from '../setup.js';

// ── Mock the store module ──
const mockStore = createMockStore();
vi.mock('../../src/db/store.js', () => ({
  default: mockStore,
}));

describe('Profile Routes', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mock store state
    Object.keys(mockStore._collections).forEach((k) => delete mockStore._collections[k]);

    const { default: router } = await import('../../src/routes/profile.js');
    app = await buildApp(router, mockStore);
  });

  describe('GET /api/profile/:username', () => {
    it('should return 404 for nonexistent user', async () => {
      const res = await request(app).get('/api/profile/nobody');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return user profile for existing user', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app).get('/api/profile/testuser');
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('testuser');
      expect(res.body).toHaveProperty('xp');
      expect(res.body).toHaveProperty('level');
      expect(res.body).toHaveProperty('coins');
    });

    it('should not expose internal fields like id in profile', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app).get('/api/profile/testuser');
      expect(res.status).toBe(200);
      // The profile response includes some fields but not raw id
      expect(res.body.username).toBe('testuser');
      expect(res.body).toHaveProperty('stats');
    });
  });

  describe('PATCH /api/profile/:username', () => {
    it('should return 403 when updating another users profile', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .patch('/api/profile/otheruser')
        .set('X-Test-Username', 'testuser')
        .send({ bio: 'Hacked!' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('own profile');
    });

    it('should update bio for own profile', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .patch('/api/profile/testuser')
        .set('X-Test-Username', 'testuser')
        .send({ bio: 'Updated bio!' });

      expect(res.status).toBe(200);
      expect(res.body.bio).toBe('Updated bio!');
    });

    it('should reject bio over 500 characters', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .patch('/api/profile/testuser')
        .set('X-Test-Username', 'testuser')
        .send({ bio: 'x'.repeat(501) });

      expect(res.status).toBe(400);
    });

    it('should reject avatar over 500 characters', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .patch('/api/profile/testuser')
        .set('X-Test-Username', 'testuser')
        .send({ avatar: 'x'.repeat(501) });

      expect(res.status).toBe(400);
    });

    it('should reject theme over 50 characters', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .patch('/api/profile/testuser')
        .set('X-Test-Username', 'testuser')
        .send({ theme: 'x'.repeat(51) });

      expect(res.status).toBe(400);
    });

    it('should return 404 for nonexistent user', async () => {
      const res = await request(app)
        .patch('/api/profile/testuser')
        .set('X-Test-Username', 'testuser')
        .send({ bio: 'test' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/profile/:username/stats', () => {
    it('should return user stats', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app).get('/api/profile/testuser/stats');
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('testuser');
      expect(res.body).toHaveProperty('xp');
      expect(res.body).toHaveProperty('stats');
    });

    it('should return 404 for nonexistent user', async () => {
      const res = await request(app).get('/api/profile/nobody/stats');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/profile/:username/xp', () => {
    it('should add XP to own profile', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/profile/testuser/xp')
        .set('X-Test-Username', 'testuser')
        .send({ amount: 50, reason: 'test' });

      expect(res.status).toBe(200);
      expect(res.body.xp_added).toBe(50);
      expect(res.body.total_xp).toBe(300);
    });

    it('should calculate level from total XP', async () => {
      mockStore._seed('users', [{ ...sampleUser, xp: 0, level: 1 }]);

      const res = await request(app)
        .post('/api/profile/testuser/xp')
        .set('X-Test-Username', 'testuser')
        .send({ amount: 150 });

      expect(res.status).toBe(200);
      expect(res.body.level).toBe(2); // 150 XP / 100 = level 2
    });

    it('should award coins (1 per 10 XP)', async () => {
      mockStore._seed('users', [{ ...sampleUser, coins: 0 }]);

      const res = await request(app)
        .post('/api/profile/testuser/xp')
        .set('X-Test-Username', 'testuser')
        .send({ amount: 50 });

      expect(res.body.coins_earned).toBe(5);
    });

    it('should return 403 when adding XP to another user', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/profile/otheruser/xp')
        .set('X-Test-Username', 'testuser')
        .send({ amount: 50 });

      expect(res.status).toBe(403);
    });

    it('should reject zero or negative XP amount', async () => {
      const res = await request(app)
        .post('/api/profile/testuser/xp')
        .set('X-Test-Username', 'testuser')
        .send({ amount: 0 });

      expect(res.status).toBe(400);
    });

    it('should reject XP amount over 1000', async () => {
      const res = await request(app)
        .post('/api/profile/testuser/xp')
        .set('X-Test-Username', 'testuser')
        .send({ amount: 1001 });

      expect(res.status).toBe(400);
    });

    it('should reject non-numeric XP amount', async () => {
      const res = await request(app)
        .post('/api/profile/testuser/xp')
        .set('X-Test-Username', 'testuser')
        .send({ amount: 'fifty' });

      expect(res.status).toBe(400);
    });

    it('should validate reason length', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/profile/testuser/xp')
        .set('X-Test-Username', 'testuser')
        .send({ amount: 50, reason: 'x'.repeat(201) });

      expect(res.status).toBe(400);
    });
  });
});
