import { describe, it, expect, vi } from 'vitest';
import { generateCsrfToken, validateCsrfToken } from '../../src/middleware/csrf.js';

describe('CSRF Middleware', () => {
  describe('validateCsrfToken', () => {
    it('returns false for missing or non-string tokens', () => {
      expect(validateCsrfToken()).toBe(false);
      expect(validateCsrfToken(null)).toBe(false);
      expect(validateCsrfToken(123)).toBe(false);
      expect(validateCsrfToken({})).toBe(false);
    });

    it('returns false for non-existent token', () => {
      expect(validateCsrfToken('invalid-token')).toBe(false);
    });

    it('returns true for valid token', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token)).toBe(true);
    });

    it('returns false for expired token', () => {
      const token = generateCsrfToken();

      // Mock Date.now to simulate time passing beyond CSRF_TTL (30 * 60 * 1000)
      const originalDateNow = Date.now;
      Date.now = () => originalDateNow() + 31 * 60 * 1000;

      try {
        expect(validateCsrfToken(token)).toBe(false);
      } finally {
        Date.now = originalDateNow;
      }
    });
  });
});
