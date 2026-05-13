import { describe, it, expect } from 'vitest';
import { stripHtml } from '../../src/middleware/sanitize.js';

describe('Sanitize Middleware', () => {
  describe('stripHtml', () => {
    it('should return original string if no HTML is present', () => {
      expect(stripHtml('hello world')).toBe('hello world');
    });

    it('should remove simple HTML tags', () => {
      expect(stripHtml('<p>hello world</p>')).toBe('hello world');
    });

    it('should remove nested HTML tags', () => {
      expect(stripHtml('<div><p>hello <strong>world</strong></p></div>')).toBe('hello world');
    });

    it('should remove script tags and their content', () => {
      expect(stripHtml('<script>alert("XSS")</script>hello')).toBe('hello');
    });

    it('should remove attributes from tags', () => {
      expect(stripHtml('<a href="javascript:alert(1)">click me</a>')).toBe('click me');
    });

    it('should handle malformed HTML correctly', () => {
      expect(stripHtml('<div onmouseover="alert(1)" hello>')).toBe('');
    });

    it('should handle non-string inputs gracefully', () => {
      expect(stripHtml(null)).toBe(null);
      expect(stripHtml(123)).toBe(123);
      expect(stripHtml(undefined)).toBe(undefined);
    });
  });
});
