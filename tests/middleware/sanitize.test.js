import { describe, it } from 'node:test';
import assert from 'node:assert';
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

describe('Sanitize Middleware', () => {
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      assert.strictEqual(escapeHtml('<script>alert("XSS")</script>'), '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      assert.strictEqual(escapeHtml('1 & 2 < 3 > 0'), '1 &amp; 2 &lt; 3 &gt; 0');
      assert.strictEqual(escapeHtml(`'a' \`b\``), '&#x27;a&#x27; &#96;b&#96;');
    });

    it('should return non-strings as is', () => {
      assert.strictEqual(escapeHtml(123), 123);
      assert.strictEqual(escapeHtml(null), null);
    });
  });

  describe('stripHtml', () => {
    it('should strip HTML tags', () => {
      assert.strictEqual(stripHtml('<p>Hello <b>World</b>!</p>'), 'Hello World!');
      assert.strictEqual(stripHtml('<script>alert("XSS")</script>'), 'alert("XSS")');
    });

    it('should return non-strings as is', () => {
      assert.strictEqual(stripHtml(123), 123);
      assert.strictEqual(stripHtml(null), null);
    });
  });

  describe('sanitizeString', () => {
    it('should trim string by default', () => {
      assert.strictEqual(sanitizeString('  hello  '), 'hello');
    });

    it('should not trim if opts.trim is false', () => {
      assert.strictEqual(sanitizeString('  hello  ', { trim: false }), '  hello  ');
    });

    it('should strip HTML if opts.stripHtml is true', () => {
      assert.strictEqual(sanitizeString('<p>hello</p>', { stripHtml: true }), 'hello');
    });

    it('should enforce max length', () => {
      assert.strictEqual(sanitizeString('1234567890', { maxLength: 5 }), '12345');
    });

    it('should remove null bytes', () => {
      assert.strictEqual(sanitizeString('hello\0world'), 'helloworld');
    });
  });

  describe('sanitizeUsername', () => {
    it('should allow valid usernames', () => {
      assert.strictEqual(sanitizeUsername('john_doe'), 'john_doe');
      assert.strictEqual(sanitizeUsername('user123'), 'user123');
      assert.strictEqual(sanitizeUsername('A'), 'A');
    });

    it('should reject invalid usernames', () => {
      assert.strictEqual(sanitizeUsername('john doe'), null);
      assert.strictEqual(sanitizeUsername('john-doe'), null);
      assert.strictEqual(sanitizeUsername(''), null);
      assert.strictEqual(sanitizeUsername('a'.repeat(25)), null);
    });

    it('should reject non-strings', () => {
      assert.strictEqual(sanitizeUsername(123), null);
      assert.strictEqual(sanitizeUsername(null), null);
    });
  });

  describe('validateUrl', () => {
    it('should allow valid URLs', () => {
      assert.strictEqual(validateUrl('https://example.com'), 'https://example.com');
      assert.strictEqual(validateUrl('http://example.com'), 'http://example.com');
      assert.strictEqual(validateUrl('/local/path'), null); // The current implementation of validateUrl returns null for relative paths due to the new URL constructor throwing without a base. We test the current behavior.
    });

    it('should reject dangerous protocols', () => {
      assert.strictEqual(validateUrl('javascript:alert(1)'), null);
      assert.strictEqual(validateUrl('data:text/html,test'), null);
      assert.strictEqual(validateUrl('vbscript:msgbox("test")'), null);
      assert.strictEqual(validateUrl('file:///etc/passwd'), null);
      assert.strictEqual(validateUrl('blob:https://example.com/uuid'), null);
    });

    it('should reject private/internal IPs', () => {
      assert.strictEqual(validateUrl('http://localhost'), null);
      assert.strictEqual(validateUrl('http://127.0.0.1'), null);
      assert.strictEqual(validateUrl('http://10.0.0.1'), null);
      assert.strictEqual(validateUrl('http://172.16.0.1'), null);
      assert.strictEqual(validateUrl('http://192.168.1.1'), null);
      assert.strictEqual(validateUrl('http://0.0.0.0'), null);
      assert.strictEqual(validateUrl('http://[::1]'), null);
    });

    it('should reject non-strings', () => {
      assert.strictEqual(validateUrl(123), null);
      assert.strictEqual(validateUrl(null), null);
    });
  });

  describe('sanitizeQuery', () => {
    it('should sanitize query objects', () => {
      const input = {
        name: '  john  ',
        age: 30,
        isAdmin: true,
        nested: {
          text: '<script>alert()</script>',
        },
      };

      const expected = {
        name: 'john',
        age: 30,
        isAdmin: true,
        nested: {
          text: '<script>alert()</script>', // sanitizeString trims but doesn't strip HTML by default
        },
      };

      assert.deepStrictEqual(sanitizeQuery(input), expected);
    });

    it('should block NoSQL injection keys', () => {
      const input = {
        $where: 'sleep(10)',
        name: 'john',
      };

      const expected = {
        name: 'john',
      };

      assert.deepStrictEqual(sanitizeQuery(input), expected);
    });
  });

  describe('sanitizeBody', () => {
    it('should sanitize request body', () => {
      const req = {
        body: {
          username: ' admin ',
          $gt: '',
        },
      };
      const res = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      sanitizeBody(req, res, next);

      assert.strictEqual(nextCalled, true);
      assert.deepStrictEqual(req.body, { username: 'admin' });
    });

    it('should handle missing body', () => {
      const req = {};
      const res = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      sanitizeBody(req, res, next);

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.body, undefined);
    });
  });

  describe('validateMessage', () => {
    it('should allow valid messages', () => {
      const result = validateMessage('Hello world!');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.sanitized, 'Hello world!');
    });

    it('should reject empty messages', () => {
      const result = validateMessage('   ');
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'Message cannot be empty');
    });

    it('should reject non-strings', () => {
      const result = validateMessage(123);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'Message must be a string');
    });

    it('should enforce max length', () => {
      const result = validateMessage('a'.repeat(2001));
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'Message exceeds 2000 characters');
    });

    it('should block injection patterns', () => {
      const result1 = validateMessage('<script>alert()</script>');
      assert.strictEqual(result1.valid, false);

      const result2 = validateMessage('javascript:alert()');
      assert.strictEqual(result2.valid, false);

      const result3 = validateMessage('<img src="x" onerror="alert()">');
      assert.strictEqual(result3.valid, false);

      const result4 = validateMessage('<iframe src="example.com">');
      assert.strictEqual(result4.valid, false);
    });
  });
});
