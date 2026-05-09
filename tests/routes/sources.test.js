// ── STRATO v6 — Source Hydra Routes Tests ──

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createMockStore, buildApp } from '../setup.js';

const mockStore = createMockStore();
vi.mock('../../src/db/store.js', () => ({
  default: mockStore,
}));

describe('Source Hydra Routes (Admin)', () => {
  let app;
  const adminSecret = process.env.ADMIN_SECRET || 'test-admin-secret';

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(mockStore._collections).forEach((k) => delete mockStore._collections[k]);
    process.env.ADMIN_SECRET = adminSecret;

    const { default: router } = await import('../../src/routes/sources.js');
    app = await buildApp(router, mockStore);
  });

  describe('Auth checks', () => {
    it('should reject access without admin_secret', async () => {
      const res = await request(app).get('/api/admin/quarantine');
      expect(res.status).toBe(401);
    });

    it('should allow access with correct admin_secret', async () => {
      const res = await request(app)
        .get('/api/admin/quarantine')
        .set('x-admin-secret', adminSecret);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/admin/sources/pulse', () => {
    it('should return aggregate pulse counts', async () => {
      mockStore._seed('sources', [
        { id: 's1', status: 'healthy' },
        { id: 's2', status: 'duplicate' },
        { id: 's3', status: 'healthy' },
      ]);
      mockStore._seed('quarantine', [{ id: 'q1' }]);

      const res = await request(app)
        .get('/api/admin/sources/pulse')
        .set('x-admin-secret', adminSecret);

      expect(res.status).toBe(200);
      expect(res.body.pulse.totalHealthy).toBe(2);
      expect(res.body.pulse.totalQuarantined).toBe(1);
      expect(res.body.pulse.totalMirrors).toBe(1);
    });
  });

  describe('POST /api/admin/quarantine/:id/approve', () => {
    it('should reject malformed source (missing title)', async () => {
      mockStore._seed('quarantine', [
        { id: 'q1', normalizedUrl: 'https://example.com' } // Missing title
      ]);

      const res = await request(app)
        .post('/api/admin/quarantine/q1/approve')
        .set('x-admin-secret', adminSecret);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Validation failed: missing or empty title');
    });

    it('should reject malformed source (invalid url)', async () => {
      mockStore._seed('quarantine', [
        { id: 'q1', title: 'Example', normalizedUrl: 'not-a-url' }
      ]);

      const res = await request(app)
        .post('/api/admin/quarantine/q1/approve')
        .set('x-admin-secret', adminSecret);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Validation failed: invalid normalizedUrl');
    });

    it('should successfully approve a valid source', async () => {
      mockStore._seed('quarantine', [
        {
          id: 'q1',
          title: 'Valid Proxy',
          normalizedUrl: 'https://valid.com',
          sourceType: 'proxy',
          rawUrl: 'https://valid.com'
        }
      ]);

      const res = await request(app)
        .post('/api/admin/quarantine/q1/approve')
        .set('x-admin-secret', adminSecret);

      expect(res.status).toBe(200);
      expect(res.body.source.status).toBe('healthy');
      expect(res.body.source.normalizedUrl).toBe('https://valid.com');

      // Verify it was removed from quarantine
      const remainingQuarantine = await mockStore.getAll('quarantine');
      expect(remainingQuarantine.length).toBe(0);

      // Verify trust score was created
      const trustScores = await mockStore.getAll('trust_scores');
      expect(trustScores.length).toBe(1);
      expect(trustScores[0].score).toBe(100);
    });
  });

  describe('POST /api/admin/quarantine/:id/duplicate', () => {
    it('should mark source as duplicate and set duplicateOf', async () => {
      mockStore._seed('quarantine', [
        {
          id: 'q1',
          title: 'Mirror Site',
          normalizedUrl: 'https://mirror.com',
        }
      ]);

      const res = await request(app)
        .post('/api/admin/quarantine/q1/duplicate')
        .set('x-admin-secret', adminSecret)
        .send({ canonicalId: 'canonical-123' });

      expect(res.status).toBe(200);
      expect(res.body.source.status).toBe('duplicate');
      expect(res.body.source.duplicateOf).toBe('canonical-123');

      // Verify removed from quarantine
      const remainingQuarantine = await mockStore.getAll('quarantine');
      expect(remainingQuarantine.length).toBe(0);
    });

    it('should reject if canonicalId is missing', async () => {
      mockStore._seed('quarantine', [{ id: 'q1' }]);

      const res = await request(app)
        .post('/api/admin/quarantine/q1/duplicate')
        .set('x-admin-secret', adminSecret)
        .send({}); // Missing canonicalId

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Canonical ID required');
    });
  });
});
