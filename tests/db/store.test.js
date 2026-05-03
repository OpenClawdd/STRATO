/**
 * STRATO v21 — Store (Database) Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// We test the actual sanitize utility instead of mocking the full store
import { sanitizeString, validateMessage, escapeHtml, validateUrl, sanitizeUsername } from '../../src/middleware/sanitize.js';

describe('Input Sanitization', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('should return non-string values unchanged', () => {
      expect(escapeHtml(42)).toBe(42);
      expect(escapeHtml(null)).toBe(null);
    });

    it('should escape backticks', () => {
      expect(escapeHtml('`code`')).toBe('&#96;code&#96;');
    });
  });

  describe('sanitizeString', () => {
    it('should remove null bytes', () => {
      expect(sanitizeString('hello\0world')).toBe('helloworld');
    });

    it('should trim whitespace by default', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should enforce max length', () => {
      expect(sanitizeString('abcdefghij', { maxLength: 5 })).toBe('abcde');
    });

    it('should strip HTML tags when requested', () => {
      expect(sanitizeString('<b>bold</b> text', { stripHtml: true })).toBe('bold text');
    });

    it('should return non-string values unchanged', () => {
      expect(sanitizeString(123)).toBe(123);
    });
  });

  describe('validateMessage', () => {
    it('should validate a normal message', () => {
      const result = validateMessage('Hello, how are you?');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Hello, how are you?');
    });

    it('should reject empty messages', () => {
      expect(validateMessage('').valid).toBe(false);
      expect(validateMessage('   ').valid).toBe(false);
    });

    it('should reject overly long messages', () => {
      const longMsg = 'a'.repeat(2001);
      expect(validateMessage(longMsg).valid).toBe(false);
    });

    it('should reject script injection', () => {
      expect(validateMessage('<script>alert(1)</script>').valid).toBe(false);
    });

    it('should reject iframe injection', () => {
      expect(validateMessage('<iframe src="evil.com">').valid).toBe(false);
    });

    it('should reject event handler injection', () => {
      expect(validateMessage('<img onerror="alert(1)">').valid).toBe(false);
    });

    it('should reject javascript: protocol', () => {
      expect(validateMessage('javascript:alert(1)').valid).toBe(false);
    });

    it('should accept normal text with angle brackets that are not HTML', () => {
      expect(validateMessage('5 > 3 and 2 < 4').valid).toBe(true);
    });
  });

  describe('validateUrl', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(validateUrl('https://example.com')).toBe('https://example.com');
    });

    it('should accept valid HTTP URLs', () => {
      expect(validateUrl('http://example.com')).toBe('http://example.com');
    });

    it('should reject javascript: protocol', () => {
      expect(validateUrl('javascript:alert(1)')).toBe(null);
    });

    it('should reject data: protocol', () => {
      expect(validateUrl('data:text/html,<h1>evil</h1>')).toBe(null);
    });

    it('should reject localhost (SSRF prevention)', () => {
      expect(validateUrl('http://localhost:8080/admin')).toBe(null);
    });

    it('should reject private IP addresses', () => {
      expect(validateUrl('http://127.0.0.1/admin')).toBe(null);
      expect(validateUrl('http://192.168.1.1/admin')).toBe(null);
      expect(validateUrl('http://10.0.0.1/admin')).toBe(null);
    });

    it('should reject URLs without protocol', () => {
      expect(validateUrl('example.com')).toBe(null);
    });
  });

  describe('sanitizeUsername', () => {
    it('should accept valid usernames', () => {
      expect(sanitizeUsername('cooluser42')).toBe('cooluser42');
      expect(sanitizeUsername('user_name')).toBe('user_name');
    });

    it('should reject empty usernames', () => {
      expect(sanitizeUsername('')).toBe(null);
      expect(sanitizeUsername('   ')).toBe(null);
    });

    it('should reject overly long usernames', () => {
      expect(sanitizeUsername('a'.repeat(25))).toBe(null);
    });

    it('should reject special characters', () => {
      expect(sanitizeUsername('user@name')).toBe(null);
      expect(sanitizeUsername('user name')).toBe(null);
      expect(sanitizeUsername('user!name')).toBe(null);
    });
  });
});

describe('CSRF Protection', () => {
  // Import CSRF module
  let csrf;
  beforeEach(async () => {
    csrf = await import('../../src/middleware/csrf.js');
  });

  it('should generate unique tokens', () => {
    const token1 = csrf.generateCsrfToken();
    const token2 = csrf.generateCsrfToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it('should validate a generated token', () => {
    const token = csrf.generateCsrfToken();
    expect(csrf.validateCsrfToken(token)).toBe(true);
  });

  it('should reject invalid tokens', () => {
    expect(csrf.validateCsrfToken('invalid-token')).toBe(false);
    expect(csrf.validateCsrfToken('')).toBe(false);
    expect(csrf.validateCsrfToken(null)).toBe(false);
  });

  it('should consume tokens on validation (one-time use)', () => {
    const token = csrf.generateCsrfToken();
    expect(csrf.validateCsrfToken(token)).toBe(true);
    expect(csrf.validateCsrfToken(token)).toBe(false); // Already consumed
  });

  it('should report active token count', () => {
    csrf.generateCsrfToken();
    csrf.generateCsrfToken();
    const stats = csrf.getCsrfStats();
    expect(stats.activeTokens).toBeGreaterThanOrEqual(2);
    expect(stats.ttl).toBe(30 * 60 * 1000);
  });
});

describe('Auth Middleware', () => {
  let authModule;
  let mockStore;

  beforeEach(async () => {
    // Re-import for fresh module
    vi.resetModules();
    authModule = await import('../../src/middleware/auth.js');
  });

  it('should export validateAuthCookie function', () => {
    expect(typeof authModule.validateAuthCookie).toBe('function');
  });

  it('should export default middleware function', () => {
    expect(typeof authModule.default).toBe('function');
  });

  it('should reject null cookie header', () => {
    expect(authModule.validateAuthCookie(null)).toBe(null);
  });

  it('should reject empty cookie header', () => {
    expect(authModule.validateAuthCookie('')).toBe(null);
  });

  it('should reject cookie without strato_auth', () => {
    expect(authModule.validateAuthCookie('other_cookie=value')).toBe(null);
  });
});

describe('Sanitize Body Middleware', () => {
  it('should strip $-prefixed keys from request body', async () => {
    const { sanitizeBody } = await import('../../src/middleware/sanitize.js');
    const req = { body: { $gt: '', username: 'test', $where: 'evil' } };
    const res = {};
    const next = vi.fn();

    sanitizeBody(req, res, next);

    expect(req.body.$gt).toBeUndefined();
    expect(req.body.$where).toBeUndefined();
    expect(req.body.username).toBe('test');
    expect(next).toHaveBeenCalled();
  });

  it('should handle null body', async () => {
    const { sanitizeBody } = await import('../../src/middleware/sanitize.js');
    const req = { body: null };
    const res = {};
    const next = vi.fn();

    sanitizeBody(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
