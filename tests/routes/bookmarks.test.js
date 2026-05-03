// ── STRATO v21 — Bookmarks Routes Tests ──
// Tests for src/routes/bookmarks.js: CRUD, history, validation

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { default as express } from 'express';
import request from 'supertest';
import { createMockStore, sampleUser, sampleBookmark, buildApp } from '../setup.js';

const mockStore = createMockStore();
vi.mock('../../src/db/store.js', () => ({
  default: mockStore,
}));

describe('Bookmarks Routes', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(mockStore._collections).forEach((k) => delete mockStore._collections[k]);

    const { default: router } = await import('../../src/routes/bookmarks.js');
    app = await buildApp(router, mockStore);
  });

  describe('GET /api/bookmarks', () => {
    it('should return empty bookmarks for new user', async () => {
      const res = await request(app).get('/api/bookmarks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('bookmarks');
      expect(Array.isArray(res.body.bookmarks)).toBe(true);
    });

    it('should return bookmarks for authenticated user', async () => {
      mockStore._seed('bookmarks', [
        { ...sampleBookmark, username: 'testuser' },
        { ...sampleBookmark, id: 'bm2', username: 'testuser', url: 'https://other.com', title: 'Other' },
      ]);

      const res = await request(app).get('/api/bookmarks');
      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/bookmarks', () => {
    it('should create a new bookmark', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/bookmarks')
        .send({ url: 'https://example.com', title: 'Example', favicon: 'https://example.com/icon.ico' });

      expect(res.status).toBe(201);
      expect(res.body.url).toBe('https://example.com');
      expect(res.body.title).toBe('Example');
    });

    it('should use URL as title when title is not provided', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/bookmarks')
        .send({ url: 'https://notitle.com' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('https://notitle.com');
    });

    it('should return 400 when URL is missing', async () => {
      const res = await request(app)
        .post('/api/bookmarks')
        .send({ title: 'No URL' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('URL');
    });

    it('should return 400 for invalid URL format', async () => {
      const res = await request(app)
        .post('/api/bookmarks')
        .send({ url: 'not-a-url' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid URL');
    });

    it('should return 400 for title over 500 characters', async () => {
      const res = await request(app)
        .post('/api/bookmarks')
        .send({ url: 'https://example.com', title: 'x'.repeat(501) });

      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate bookmark', async () => {
      mockStore._seed('bookmarks', [{ ...sampleBookmark, username: 'testuser' }]);

      const res = await request(app)
        .post('/api/bookmarks')
        .send({ url: 'https://example.com', title: 'Duplicate' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('should reject XSS in URL field via URL validation', async () => {
      const res = await request(app)
        .post('/api/bookmarks')
        .send({ url: '<script>alert(1)</script>' });

      expect(res.status).toBe(400);
    });

    it('should accept valid favicon URL', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/bookmarks')
        .send({ url: 'https://example.com', favicon: 'https://example.com/favicon.ico' });

      expect(res.status).toBe(201);
    });

    it('should reject favicon over 500 characters', async () => {
      const res = await request(app)
        .post('/api/bookmarks')
        .send({ url: 'https://example.com', favicon: 'x'.repeat(501) });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/bookmarks/:id', () => {
    it('should delete an existing bookmark', async () => {
      mockStore._seed('bookmarks', [{ ...sampleBookmark, id: 'bm1', username: 'testuser' }]);
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app).delete('/api/bookmarks/bm1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for nonexistent bookmark', async () => {
      const res = await request(app).delete('/api/bookmarks/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should not delete another users bookmark', async () => {
      mockStore._seed('bookmarks', [{ ...sampleBookmark, id: 'bm1', username: 'otheruser' }]);

      const res = await request(app).delete('/api/bookmarks/bm1');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/history', () => {
    it('should return paginated history', async () => {
      mockStore._seed('history', [
        { username: 'testuser', url: 'https://a.com', title: 'A' },
        { username: 'testuser', url: 'https://b.com', title: 'B' },
      ]);

      const res = await request(app).get('/api/history');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('history');
    });

    it('should respect page and limit params', async () => {
      mockStore._seed('history', Array.from({ length: 10 }, (_, i) => ({
        username: 'testuser',
        url: `https://site${i}.com`,
        title: `Site ${i}`,
      })));

      const res = await request(app).get('/api/history?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.limit).toBe(5);
    });
  });

  describe('POST /api/history', () => {
    it('should add a history entry', async () => {
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app)
        .post('/api/history')
        .send({ url: 'https://history.com', title: 'History' });

      expect(res.status).toBe(201);
      expect(res.body.url).toBe('https://history.com');
    });

    it('should return 400 for missing URL', async () => {
      const res = await request(app)
        .post('/api/history')
        .send({ title: 'No URL' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid URL', async () => {
      const res = await request(app)
        .post('/api/history')
        .send({ url: 'bad-url' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/history', () => {
    it('should clear all history for user', async () => {
      mockStore._seed('history', [
        { username: 'testuser', url: 'https://a.com', title: 'A' },
        { username: 'testuser', url: 'https://b.com', title: 'B' },
        { username: 'otheruser', url: 'https://c.com', title: 'C' },
      ]);
      mockStore._seed('users', [{ ...sampleUser }]);

      const res = await request(app).delete('/api/history');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.removed).toBe(2);
    });
  });
});
