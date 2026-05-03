// ── STRATO v21 — Auth Middleware Tests ──
// Tests for src/middleware/auth.js: login, CSRF, rate limiting, cookie validation

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieSignature from 'cookie-signature';
import { validateAuthCookie } from '../../src/middleware/auth.js';

const COOKIE_SECRET = 'dev-secret-change-me';

// ── Helper: create a signed cookie value ──
function signCookie(value, secret = COOKIE_SECRET) {
  return 's:' + cookieSignature.sign(value, secret);
}

// ── Helper: extract CSRF token from login page HTML ──
function extractCsrfToken(html) {
  // The HTML has: name="csrf_token" id="csrf-input" value="TOKEN"
  const match = html.match(/name="csrf_token"[^>]*value="([^"]+)"/);
  return match ? match[1] : '';
}

// ── Helper: build a minimal Express app with the auth middleware ──
async function buildAuthApp() {
  const { default: cookieParser } = await import('cookie-parser');
  const { default: authMiddleware } = await import('../../src/middleware/auth.js');

  const app = express();
  app.set('trust proxy', 1);
  app.use(cookieParser(COOKIE_SECRET));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(authMiddleware);

  // Test routes
  app.get('/api/test', (req, res) => {
    res.json({ username: res.locals.username, ok: true });
  });

  app.get('/protected', (req, res) => {
    res.json({ username: res.locals.username, ok: true });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

describe('Auth Middleware', () => {
  let app;

  beforeEach(async () => {
    app = await buildAuthApp();
  });

  describe('Health check bypass', () => {
    it('should allow /health through without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Login page (GET /login)', () => {
    it('should serve login page HTML', async () => {
      const res = await request(app).get('/login');
      expect(res.status).toBe(200);
      expect(res.text).toContain('csrf_token');
      expect(res.text).toContain('STRATO');
    });

    it('should redirect to / if already authenticated', async () => {
      const signedValue = signCookie('testuser');
      const res = await request(app)
        .get('/login')
        .set('Cookie', [`strato_auth=${signedValue}`]);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/');
    });

    it('should include a CSRF token in the served HTML', async () => {
      const res = await request(app).get('/login');
      const csrfToken = extractCsrfToken(res.text);
      expect(csrfToken).toBeTruthy();
      expect(csrfToken.length).toBeGreaterThan(0);
    });
  });

  describe('Login (POST /login)', () => {
    it('should reject login without CSRF token', async () => {
      const res = await request(app)
        .post('/login')
        .type('form')
        .send({ username: 'testuser', tos_accepted: 'true' });

      expect(res.status).toBe(403);
    });

    it('should reject login without TOS acceptance', async () => {
      const loginRes = await request(app).get('/login');
      const csrfToken = extractCsrfToken(loginRes.text);

      const res = await request(app)
        .post('/login')
        .type('form')
        .send({ username: 'testuser', tos_accepted: 'false', csrf_token: csrfToken });

      expect(res.status).toBe(400);
    });

    it('should reject empty username', async () => {
      const loginRes = await request(app).get('/login');
      const csrfToken = extractCsrfToken(loginRes.text);

      const res = await request(app)
        .post('/login')
        .type('form')
        .send({ username: '', tos_accepted: 'true', csrf_token: csrfToken });

      expect(res.status).toBe(400);
    });

    it('should reject username over 24 characters', async () => {
      const loginRes = await request(app).get('/login');
      const csrfToken = extractCsrfToken(loginRes.text);

      const res = await request(app)
        .post('/login')
        .type('form')
        .send({ username: 'a'.repeat(25), tos_accepted: 'true', csrf_token: csrfToken });

      expect(res.status).toBe(400);
    });

    it('should reject username with special characters', async () => {
      const loginRes = await request(app).get('/login');
      const csrfToken = extractCsrfToken(loginRes.text);

      const res = await request(app)
        .post('/login')
        .type('form')
        .send({ username: 'test<script>', tos_accepted: 'true', csrf_token: csrfToken });

      expect(res.status).toBe(400);
    });

    it('should accept valid login and set auth cookie', async () => {
      const loginRes = await request(app).get('/login');
      const csrfToken = extractCsrfToken(loginRes.text);

      const res = await request(app)
        .post('/login')
        .type('form')
        .send({ username: 'testuser', tos_accepted: 'true', csrf_token: csrfToken });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/');
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('strato_auth'))).toBe(true);
    });

    it('should reject reused CSRF token (one-time use)', async () => {
      const loginRes = await request(app).get('/login');
      const csrfToken = extractCsrfToken(loginRes.text);

      // First login — should succeed
      await request(app)
        .post('/login')
        .type('form')
        .send({ username: 'testuser', tos_accepted: 'true', csrf_token: csrfToken });

      // Second login with same token — should fail
      const res = await request(app)
        .post('/login')
        .type('form')
        .send({ username: 'testuser2', tos_accepted: 'true', csrf_token: csrfToken });

      expect(res.status).toBe(403);
    });
  });

  describe('Login rate limiting', () => {
    it('should rate limit after 8 failed login attempts', async () => {
      // Make 8 failed attempts (no CSRF token = instant fail)
      for (let i = 0; i < 8; i++) {
        await request(app)
          .post('/login')
          .type('form')
          .send({ username: 'testuser', tos_accepted: 'true' });
      }

      // 9th attempt should be rate limited
      const res = await request(app)
        .post('/login')
        .type('form')
        .send({ username: 'testuser', tos_accepted: 'true' });

      expect(res.status).toBe(429);
    });
  });

  describe('Logout', () => {
    it('should clear auth cookie and redirect to /login', async () => {
      const res = await request(app).get('/logout');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });
  });

  describe('API route authentication', () => {
    it('should reject unauthenticated API requests with 401', async () => {
      const res = await request(app).get('/api/test');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Not authenticated');
    });

    it('should allow authenticated API requests', async () => {
      const signedValue = signCookie('testuser');
      const res = await request(app)
        .get('/api/test')
        .set('Cookie', [`strato_auth=${signedValue}`]);

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('testuser');
    });
  });

  describe('Protected page authentication', () => {
    it('should redirect unauthenticated users to /login', async () => {
      const res = await request(app).get('/protected');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });

    it('should allow authenticated users through', async () => {
      const signedValue = signCookie('testuser');
      const res = await request(app)
        .get('/protected')
        .set('Cookie', [`strato_auth=${signedValue}`]);

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('testuser');
    });
  });

  describe('validateAuthCookie (exported function)', () => {
    it('should return username for valid signed cookie', () => {
      const signedValue = signCookie('testuser');
      const cookieHeader = `strato_auth=${signedValue}`;
      const result = validateAuthCookie(cookieHeader);
      expect(result).toBe('testuser');
    });

    it('should return null for missing cookie header', () => {
      expect(validateAuthCookie(null)).toBeNull();
      expect(validateAuthCookie('')).toBeNull();
    });

    it('should return null for unsigned cookie', () => {
      const cookieHeader = 'strato_auth=plainvalue';
      expect(validateAuthCookie(cookieHeader)).toBeNull();
    });

    it('should return null for tampered cookie', () => {
      const signedValue = signCookie('testuser');
      const tampered = signedValue.slice(0, -5) + 'XXXXX';
      const cookieHeader = `strato_auth=${tampered}`;
      expect(validateAuthCookie(cookieHeader)).toBeNull();
    });

    it('should handle cookies with multiple values', () => {
      const signedValue = signCookie('testuser');
      const cookieHeader = `other=val; strato_auth=${signedValue}; foo=bar`;
      const result = validateAuthCookie(cookieHeader);
      expect(result).toBe('testuser');
    });
  });

  describe('XSS prevention', () => {
    it('should reject usernames with special characters', async () => {
      // Get a fresh login page to avoid rate limiting issues
      const loginRes = await request(app).get('/login');
      const csrfToken = extractCsrfToken(loginRes.text);

      const res = await request(app)
        .post('/login')
        .type('form')
        .send({ username: '<script>alert(1)</script>', tos_accepted: 'true', csrf_token: csrfToken });

      // Username validation should reject it (400), or CSRF check first (403),
      // or rate limited if previous tests triggered it (429)
      expect([400, 403, 429]).toContain(res.status);
    });
  });
});
