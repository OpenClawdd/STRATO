// ── STRATO v21 — CSRF Middleware Tests ──
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import {
  generateCsrfToken,
  validateCsrfToken,
  csrfProtection,
  getCsrfStats
} from '../../src/middleware/csrf.js';

describe('CSRF Middleware Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('generateCsrfToken', () => {
    it('should generate a 64-character hex string token', () => {
      const token = generateCsrfToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
    });

    it('should increment active tokens in stats', () => {
      const initialStats = getCsrfStats();
      generateCsrfToken();
      const newStats = getCsrfStats();
      expect(newStats.activeTokens).toBeGreaterThan(initialStats.activeTokens);
    });
  });

  describe('validateCsrfToken', () => {
    it('should return false for invalid token types', () => {
      expect(validateCsrfToken(null)).toBe(false);
      expect(validateCsrfToken(undefined)).toBe(false);
      expect(validateCsrfToken('')).toBe(false);
      expect(validateCsrfToken(123)).toBe(false);
      expect(validateCsrfToken({})).toBe(false);
    });

    it('should return false for unknown tokens', () => {
      expect(validateCsrfToken('unknown_token_value')).toBe(false);
    });

    it('should validate a newly generated token', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token)).toBe(true);
    });

    it('should not consume the token upon successful validation', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token)).toBe(true);
      // Validate again to ensure it was not consumed
      expect(validateCsrfToken(token)).toBe(true);
    });

    it('should reject and delete an expired token', () => {
      const token = generateCsrfToken();
      const { ttl } = getCsrfStats();

      // Fast-forward past TTL
      vi.advanceTimersByTime(ttl + 1000);

      expect(validateCsrfToken(token)).toBe(false);

      // Token should have been deleted, subsequent check will still be false
      expect(validateCsrfToken(token)).toBe(false);
    });
  });

  describe('getCsrfStats', () => {
    it('should return object with activeTokens and ttl', () => {
      const stats = getCsrfStats();
      expect(stats).toHaveProperty('activeTokens');
      expect(stats).toHaveProperty('ttl');
      expect(typeof stats.activeTokens).toBe('number');
      expect(typeof stats.ttl).toBe('number');
    });
  });
});

describe('CSRF Express Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(csrfProtection);

    // Dummy routes for testing
    app.get('/safe', (req, res) => res.json({ status: 'ok' }));
    app.post('/unsafe', (req, res) => res.json({ status: 'ok' }));
    app.post('/login', (req, res) => res.json({ status: 'login-ok' }));
    app.post('/health', (req, res) => res.json({ status: 'health-ok' }));
  });

  it('should skip safe methods (GET, HEAD, OPTIONS)', async () => {
    const resGet = await request(app).get('/safe');
    expect(resGet.status).toBe(200);

    const resHead = await request(app).head('/safe');
    expect(resHead.status).toBe(200);

    const resOptions = await request(app).options('/safe');
    expect(resOptions.status).toBe(200);
  });

  it('should skip /login path', async () => {
    const res = await request(app).post('/login');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('login-ok');
  });

  it('should skip /health path', async () => {
    const res = await request(app).post('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('health-ok');
  });

  it('should reject state-changing requests without CSRF token (403)', async () => {
    const res = await request(app).post('/unsafe');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('CSRF token missing');
  });

  it('should reject state-changing requests with invalid CSRF token (403)', async () => {
    const res = await request(app)
      .post('/unsafe')
      .set('x-csrf-token', 'invalid_token');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Invalid or expired CSRF token');
  });

  it('should accept valid token in header', async () => {
    const token = generateCsrfToken();
    const res = await request(app)
      .post('/unsafe')
      .set('x-csrf-token', token);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should accept valid token in body', async () => {
    const token = generateCsrfToken();
    const res = await request(app)
      .post('/unsafe')
      .send({ csrf_token: token });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
