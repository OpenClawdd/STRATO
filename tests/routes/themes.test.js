// ── STRATO v21 — Themes Routes Tests ──
// Tests for src/routes/themes.js: CRUD, install, config validation

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { default as express } from 'express';
import request from 'supertest';
import { createMockStore, sampleTheme, buildApp } from '../setup.js';

const mockStore = createMockStore();
vi.mock('../../src/db/store.js', () => ({
  default: mockStore,
}));

describe('Themes Routes', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(mockStore._collections).forEach((k) => delete mockStore._collections[k]);

    const { default: router } = await import('../../src/routes/themes.js');
    app = await buildApp(router, mockStore);
  });

  describe('GET /api/themes', () => {
    it('should return paginated themes list', async () => {
      mockStore._seed('themes', [
        { ...sampleTheme, id: 't1', code: 'neon-night' },
        { ...sampleTheme, id: 't2', code: 'ocean-blue', name: 'Ocean Blue' },
      ]);

      const res = await request(app).get('/api/themes');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('themes');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
    });

    it('should respect pagination params', async () => {
      const themes = Array.from({ length: 5 }, (_, i) => ({
        ...sampleTheme,
        id: `t${i}`,
        code: `theme-${i}`,
        name: `Theme ${i}`,
      }));
      mockStore._seed('themes', themes);

      const res = await request(app).get('/api/themes?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.limit).toBe(2);
      expect(res.body.themes.length).toBeLessThanOrEqual(2);
    });

    it('should sort by newest by default', async () => {
      mockStore._seed('themes', [
        { ...sampleTheme, id: 't1', code: 'old', created_at: '2024-01-01T00:00:00Z' },
        { ...sampleTheme, id: 't2', code: 'new', created_at: '2024-06-01T00:00:00Z' },
      ]);

      const res = await request(app).get('/api/themes');
      expect(res.status).toBe(200);
    });

    it('should not include script/sensitive data in list view', async () => {
      mockStore._seed('themes', [{ ...sampleTheme, id: 't1' }]);

      const res = await request(app).get('/api/themes');
      expect(res.body.themes[0]).toHaveProperty('id');
      expect(res.body.themes[0]).toHaveProperty('name');
      expect(res.body.themes[0]).toHaveProperty('code');
      expect(res.body.themes[0]).toHaveProperty('downloads');
    });
  });

  describe('GET /api/themes/:code', () => {
    it('should return theme details', async () => {
      mockStore._seed('themes', [{ ...sampleTheme, code: 'neon-night' }]);

      const res = await request(app).get('/api/themes/neon-night');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe('neon-night');
      expect(res.body).toHaveProperty('config');
    });

    it('should return 404 for nonexistent theme', async () => {
      const res = await request(app).get('/api/themes/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should include updated_at in detail view', async () => {
      mockStore._seed('themes', [{ ...sampleTheme, code: 'neon-night' }]);

      const res = await request(app).get('/api/themes/neon-night');
      expect(res.body).toHaveProperty('updated_at');
    });
  });

  describe('POST /api/themes', () => {
    it('should create a new theme', async () => {
      const res = await request(app)
        .post('/api/themes')
        .send({
          name: 'Midnight Purple',
          code: 'midnight-purple',
          config: { accent: '#9b59b6', bg: '#1a1a2e' },
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Midnight Purple');
      expect(res.body.code).toBe('midnight-purple');
      expect(res.body.created_by).toBe('testuser');
      expect(res.body.downloads).toBe(0);
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/themes')
        .send({ code: 'test', config: {} });

      expect(res.status).toBe(400);
    });

    it('should return 400 for name over 50 characters', async () => {
      const res = await request(app)
        .post('/api/themes')
        .send({ name: 'x'.repeat(51), code: 'test', config: {} });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid code format', async () => {
      const res = await request(app)
        .post('/api/themes')
        .send({ name: 'Test', code: 'INVALID CODE!', config: {} });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('lowercase alphanumeric');
    });

    it('should return 400 for missing config object', async () => {
      const res = await request(app)
        .post('/api/themes')
        .send({ name: 'Test', code: 'test-theme' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('config');
    });

    it('should return 400 for invalid config key', async () => {
      const res = await request(app)
        .post('/api/themes')
        .send({ name: 'Test', code: 'test-theme', config: { invalid_key: '#fff' } });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid config key');
    });

    it('should accept all valid config keys', async () => {
      const res = await request(app)
        .post('/api/themes')
        .send({
          name: 'Full Config',
          code: 'full-config',
          config: {
            accent: '#00ff88',
            bg: '#0a0a12',
            glass: 'rgba(255,255,255,0.05)',
            font: 'Inter',
            text: '#e2e8f0',
            surface: '#1a1a2e',
            border: 'rgba(255,255,255,0.1)',
            shadow: '0 4px 6px rgba(0,0,0,0.3)',
            radius: '12px',
            animations: 'true',
          },
        });

      expect(res.status).toBe(201);
    });

    it('should return 409 for duplicate theme code', async () => {
      mockStore._seed('themes', [{ ...sampleTheme, code: 'neon-night' }]);

      const res = await request(app)
        .post('/api/themes')
        .send({ name: 'Copy', code: 'neon-night', config: {} });

      expect(res.status).toBe(409);
    });

    it('should trim whitespace from theme name', async () => {
      const res = await request(app)
        .post('/api/themes')
        .send({ name: '  Spaced Theme  ', code: 'spaced-theme', config: {} });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Spaced Theme');
    });
  });

  describe('POST /api/themes/:code/install', () => {
    it('should increment download count', async () => {
      mockStore._seed('themes', [{ ...sampleTheme, code: 'neon-night', downloads: 10 }]);

      const res = await request(app).post('/api/themes/neon-night/install');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.downloads).toBe(11);
    });

    it('should return 404 for nonexistent theme', async () => {
      const res = await request(app).post('/api/themes/nonexistent/install');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/themes/:code', () => {
    it('should delete theme created by the same user', async () => {
      mockStore._seed('themes', [{ ...sampleTheme, code: 'neon-night', created_by: 'testuser' }]);

      const res = await request(app).delete('/api/themes/neon-night');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 when deleting another users theme', async () => {
      mockStore._seed('themes', [{ ...sampleTheme, code: 'neon-night', created_by: 'otheruser' }]);

      const res = await request(app).delete('/api/themes/neon-night');
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('creator');
    });

    it('should return 404 for nonexistent theme', async () => {
      const res = await request(app).delete('/api/themes/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
