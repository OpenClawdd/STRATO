import { describe, it, expect, vi } from 'vitest';
import {
  escapeHtml,
  stripHtml,
  sanitizeString,
  sanitizeUsername,
  validateUrl,
  sanitizeQuery,
  sanitizeBody,
  validateMessage,
} from '../../src/middleware/sanitize.js';

describe('Sanitize Middleware Functions', () => {
  describe('escapeHtml', () => {
    it('should escape HTML entities correctly', () => {
      expect(escapeHtml('<div>Test & "quote" \'apostrophe\' `backtick` /slash/</div>'))
        .toBe('&lt;div&gt;Test &amp; &quot;quote&quot; &#x27;apostrophe&#x27; &#96;backtick&#96; &#x2F;slash&#x2F;&lt;&#x2F;div&gt;');
    });

    it('should return original string if no entities', () => {
      expect(escapeHtml('plain text')).toBe('plain text');
    });

    it('should handle non-string input gracefully', () => {
      expect(escapeHtml(123)).toBe(123);
      expect(escapeHtml(null)).toBeNull();
      expect(escapeHtml(undefined)).toBeUndefined();
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    it('should handle malformed tags safely', () => {
      expect(stripHtml('<<script>alert(1)</script>')).toBe('alert(1)');
    });

    it('should return original string if no tags', () => {
      expect(stripHtml('Hello World')).toBe('Hello World');
    });

    it('should handle non-string input gracefully', () => {
      expect(stripHtml(123)).toBe(123);
      expect(stripHtml(null)).toBeNull();
    });
  });

  describe('sanitizeString', () => {
    it('should remove null bytes', () => {
      expect(sanitizeString('hello\0world')).toBe('helloworld');
    });

    it('should trim whitespace by default', () => {
      expect(sanitizeString('  hello world  ')).toBe('hello world');
    });

    it('should not trim if opts.trim is false', () => {
      expect(sanitizeString('  hello world  ', { trim: false })).toBe('  hello world  ');
    });

    it('should strip HTML if opts.stripHtml is true', () => {
      expect(sanitizeString('<p>hello</p>', { stripHtml: true })).toBe('hello');
    });

    it('should enforce maxLength if provided', () => {
      expect(sanitizeString('hello world', { maxLength: 5 })).toBe('hello');
    });

    it('should normalize unicode to NFC form', () => {
      // "amélie" using e + combining acute accent
      const nfd = 'ame\u0301lie';
      const nfc = 'am\u00E9lie';
      expect(sanitizeString(nfd)).toBe(nfc);
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(123)).toBe(123);
      expect(sanitizeString(null)).toBeNull();
    });
  });

  describe('sanitizeUsername', () => {
    it('should accept valid username', () => {
      expect(sanitizeUsername('valid_User1')).toBe('valid_User1');
    });

    it('should trim valid username', () => {
      expect(sanitizeUsername(' valid_User1 ')).toBe('valid_User1');
    });

    it('should reject usernames that are too short', () => {
      expect(sanitizeUsername('')).toBeNull();
      expect(sanitizeUsername('   ')).toBeNull();
    });

    it('should reject usernames that are too long', () => {
      expect(sanitizeUsername('a'.repeat(25))).toBeNull();
    });

    it('should reject usernames with special characters', () => {
      expect(sanitizeUsername('user@name')).toBeNull();
      expect(sanitizeUsername('user!name')).toBeNull();
      expect(sanitizeUsername('user name')).toBeNull();
    });

    it('should handle non-string input', () => {
      expect(sanitizeUsername(123)).toBeNull();
      expect(sanitizeUsername(null)).toBeNull();
    });
  });

  describe('validateUrl', () => {
    it('should accept valid HTTP/HTTPS URLs', () => {
      expect(validateUrl('http://example.com')).toBe('http://example.com');
      expect(validateUrl('https://example.com/path')).toBe('https://example.com/path');
    });

    it('should block valid relative paths since it expects absolute URL to check SSRF', () => {
      expect(validateUrl('/api/test')).toBeNull();
    });

    it('should block dangerous protocols', () => {
      expect(validateUrl('javascript:alert(1)')).toBeNull();
      expect(validateUrl('data:text/html,<html>')).toBeNull();
      expect(validateUrl('vbscript:msgbox(1)')).toBeNull();
      expect(validateUrl('file:///etc/passwd')).toBeNull();
      expect(validateUrl('blob:http://example.com/123')).toBeNull();
    });

    it('should block private/internal IPs to prevent SSRF', () => {
      expect(validateUrl('http://localhost:8080')).toBeNull();
      expect(validateUrl('http://127.0.0.1')).toBeNull();
      expect(validateUrl('http://10.0.0.1')).toBeNull();
      expect(validateUrl('http://172.16.0.1')).toBeNull();
      expect(validateUrl('http://192.168.1.1')).toBeNull();
      expect(validateUrl('http://0.0.0.0')).toBeNull();
      expect(validateUrl('http://[::1]')).toBeNull();
      expect(validateUrl('http://fc00::')).toBeNull();
      expect(validateUrl('http://fe80::')).toBeNull();
    });

    it('should return null for malformed URLs that fail parsing', () => {
      expect(validateUrl('http://%')).toBeNull(); // URI malformed
    });

    it('should return null for non-URLs', () => {
      expect(validateUrl('not-a-url')).toBeNull();
    });

    it('should handle non-string input', () => {
      expect(validateUrl(123)).toBeNull();
      expect(validateUrl(null)).toBeNull();
    });
  });

  describe('sanitizeQuery', () => {
    it('should strip keys starting with $', () => {
      const input = { normal: 'value', $where: '1==1' };
      expect(sanitizeQuery(input)).toEqual({ normal: 'value' });
    });

    it('should sanitize string values', () => {
      const input = { text: ' hello\0 ' };
      expect(sanitizeQuery(input)).toEqual({ text: 'hello' });
    });

    it('should preserve numbers and booleans', () => {
      const input = { num: 123, bool: true };
      expect(sanitizeQuery(input)).toEqual({ num: 123, bool: true });
    });

    it('should recursively sanitize nested objects and arrays', () => {
      const input = {
        nested: {
          $ne: 1,
          valid: ' text '
        },
        arr: [{ $in: [1, 2] }, ' value ']
      };
      const expected = {
        nested: { valid: 'text' },
        arr: [{}, 'value']
      };
      expect(sanitizeQuery(input)).toEqual(expected);
    });

    it('should handle non-object inputs', () => {
      expect(sanitizeQuery(null)).toBeNull();
      expect(sanitizeQuery('string')).toBe('string');
    });
  });

  describe('sanitizeBody', () => {
    it('should call sanitizeQuery on req.body and call next()', () => {
      const req = { body: { $where: '1==1', text: ' hello ' } };
      const res = {};
      const next = vi.fn();

      sanitizeBody(req, res, next);

      expect(req.body).toEqual({ text: 'hello' });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should just call next() if req.body is missing or not an object', () => {
      const req1 = {};
      const req2 = { body: 'string' };
      const res = {};
      const next1 = vi.fn();
      const next2 = vi.fn();

      sanitizeBody(req1, res, next1);
      expect(next1).toHaveBeenCalledTimes(1);

      sanitizeBody(req2, res, next2);
      expect(req2.body).toBe('string');
      expect(next2).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateMessage', () => {
    it('should reject non-string messages', () => {
      const result = validateMessage(123);
      expect(result).toEqual({ valid: false, error: 'Message must be a string' });
    });

    it('should reject empty messages', () => {
      const result = validateMessage('   ');
      expect(result).toEqual({ valid: false, error: 'Message cannot be empty' });
    });

    it('should reject messages exceeding max length', () => {
      const result = validateMessage('a'.repeat(2001));
      expect(result).toEqual({ valid: false, error: 'Message exceeds 2000 characters' });
    });

    it('should block script injection patterns', () => {
      const payloads = [
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '<iframe src="x"></iframe>',
        '<object data="x"></object>',
        '<embed src="x"></embed>',
        '<link rel="stylesheet" href="x">',
        '<meta http-equiv="refresh" content="0;url=x">',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      ];

      for (const payload of payloads) {
        const result = validateMessage(payload);
        expect(result).toEqual({ valid: false, error: 'Message contains disallowed content' });
      }
    });

    it('should return valid and sanitized output for safe messages', () => {
      const result = validateMessage(' hello world\0 ');
      expect(result).toEqual({ valid: true, sanitized: 'hello world' });
    });
  });
});
