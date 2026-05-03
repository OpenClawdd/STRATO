// ── STRATO v21 — Stealth Routes Tests ──
// Tests for src/routes/stealth.js: fake pages, auto-stealth config, XSS

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { default as express } from 'express';
import request from 'supertest';
import { buildApp } from '../setup.js';

describe('Stealth Routes', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { default: router } = await import('../../src/routes/stealth.js');
    app = await buildApp(router, null);
  });

  describe('POST /api/stealth/classroom', () => {
    it('should generate fake Google Classroom HTML', async () => {
      const res = await request(app)
        .post('/api/stealth/classroom')
        .send({});

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('html');
      expect(res.text).toContain('Google Classroom');
    });

    it('should include default class cards', async () => {
      const res = await request(app)
        .post('/api/stealth/classroom')
        .send({});

      expect(res.text).toContain('Mathematics');
      expect(res.text).toContain('English Language Arts');
    });

    it('should accept custom class list', async () => {
      const res = await request(app)
        .post('/api/stealth/classroom')
        .send({
          classes: [
            { name: 'AP Physics', section: 'Period 1', teacher: 'Dr. Smith', color: '#ff0000' },
          ],
        });

      expect(res.text).toContain('AP Physics');
      expect(res.text).toContain('Dr. Smith');
    });

    it('should escape HTML in custom class data (XSS prevention)', async () => {
      const res = await request(app)
        .post('/api/stealth/classroom')
        .send({
          classes: [
            { name: '<script>alert("xss")</script>', section: 'P1', teacher: '<img onerror=alert(1)>' },
          ],
        });

      expect(res.text).not.toContain('<script>');
      expect(res.text).not.toContain('<img onerror');
      expect(res.text).toContain('&lt;script&gt;');
    });

    it('should use default classes when empty array provided', async () => {
      const res = await request(app)
        .post('/api/stealth/classroom')
        .send({ classes: [] });

      expect(res.text).toContain('Mathematics');
    });
  });

  describe('GET /api/stealth/fake/:type', () => {
    it('should return Google Classroom fake page', async () => {
      const res = await request(app).get('/api/stealth/fake/classroom');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('html');
      expect(res.text).toContain('Google Classroom');
    });

    it('should return Google Drive fake page', async () => {
      const res = await request(app).get('/api/stealth/fake/drive');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Google Drive');
    });

    it('should return Google Docs fake page', async () => {
      const res = await request(app).get('/api/stealth/fake/docs');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Google Docs');
    });

    it('should return Google Slides fake page', async () => {
      const res = await request(app).get('/api/stealth/fake/slides');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Google Slides');
    });

    it('should return Google Sheets fake page', async () => {
      const res = await request(app).get('/api/stealth/fake/sheets');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Google Sheets');
    });

    it('should return 400 for invalid stealth type', async () => {
      const res = await request(app).get('/api/stealth/fake/nonexistent');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid stealth type');
    });

    it('should list valid types in error message', async () => {
      const res = await request(app).get('/api/stealth/fake/nonexistent');
      expect(res.body.error).toContain('classroom');
      expect(res.body.error).toContain('drive');
    });

    it('should set appropriate favicon in fake pages', async () => {
      const res = await request(app).get('/api/stealth/fake/classroom');
      expect(res.text).toContain('google.com/favicon.ico');
    });
  });

  describe('POST /api/stealth/auto', () => {
    it('should return stealth configuration', async () => {
      const res = await request(app)
        .post('/api/stealth/auto')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('enabled');
      expect(res.body).toHaveProperty('fakePage');
      expect(res.body).toHaveProperty('keyBinding');
      expect(res.body).toHaveProperty('availablePages');
    });

    it('should default to enabled=true', async () => {
      const res = await request(app)
        .post('/api/stealth/auto')
        .send({});

      expect(res.body.enabled).toBe(true);
    });

    it('should default to classroom fake page', async () => {
      const res = await request(app)
        .post('/api/stealth/auto')
        .send({});

      expect(res.body.fakePage).toBe('classroom');
    });

    it('should accept custom config', async () => {
      const res = await request(app)
        .post('/api/stealth/auto')
        .send({
          enabled: false,
          fakePage: 'drive',
          keyBinding: 'Space',
          hideOnBlur: false,
          panicKey: '~',
        });

      expect(res.body.enabled).toBe(false);
      expect(res.body.fakePage).toBe('drive');
      expect(res.body.keyBinding).toBe('Space');
      expect(res.body.hideOnBlur).toBe(false);
      expect(res.body.panicKey).toBe('~');
    });

    it('should include behavior config with blur settings', async () => {
      const res = await request(app)
        .post('/api/stealth/auto')
        .send({ fakePage: 'classroom' });

      expect(res.body.behavior).toBeDefined();
      expect(res.body.behavior.changeTitleOnBlur).toBe(true);
      expect(res.body.behavior.changeFaviconOnBlur).toBe(true);
      expect(res.body.behavior.blurTitle).toContain('Classroom');
    });

    it('should list all available fake pages', async () => {
      const res = await request(app)
        .post('/api/stealth/auto')
        .send({});

      expect(res.body.availablePages).toContain('classroom');
      expect(res.body.availablePages).toContain('drive');
      expect(res.body.availablePages).toContain('docs');
    });
  });
});
