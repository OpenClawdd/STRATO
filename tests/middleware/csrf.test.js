import test from 'node:test';
import assert from 'node:assert';
import { generateCsrfToken, validateCsrfToken } from '../../src/middleware/csrf.js';

test('validateCsrfToken', async (t) => {
  await t.test('returns false for missing or non-string tokens', () => {
    assert.strictEqual(validateCsrfToken(), false);
    assert.strictEqual(validateCsrfToken(null), false);
    assert.strictEqual(validateCsrfToken(123), false);
    assert.strictEqual(validateCsrfToken({}), false);
  });

  await t.test('returns false for non-existent token', () => {
    assert.strictEqual(validateCsrfToken('invalid-token'), false);
  });

  await t.test('returns true for valid token', () => {
    const token = generateCsrfToken();
    assert.strictEqual(validateCsrfToken(token), true);
  });

  await t.test('returns false for expired token', () => {
    const token = generateCsrfToken();

    // Mock Date.now to simulate time passing beyond CSRF_TTL (30 * 60 * 1000)
    const originalDateNow = Date.now;
    Date.now = () => originalDateNow() + 31 * 60 * 1000;

    try {
      assert.strictEqual(validateCsrfToken(token), false);
    } finally {
      Date.now = originalDateNow;
    }
  });
});
