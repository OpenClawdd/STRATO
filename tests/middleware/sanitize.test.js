import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeQuery } from '../../src/middleware/sanitize.js';

describe('sanitizeQuery', () => {
  it('should return non-objects as-is', () => {
    assert.equal(sanitizeQuery(null), null);
    assert.equal(sanitizeQuery(undefined), undefined);
    assert.equal(sanitizeQuery('string'), 'string');
    assert.equal(sanitizeQuery(123), 123);
    assert.equal(sanitizeQuery(true), true);
  });

  it('should return an empty object for an empty object', () => {
    assert.deepEqual(sanitizeQuery({}), {});
  });

  it('should return an empty array for an empty array', () => {
    assert.deepEqual(sanitizeQuery([]), []);
  });

  it('should keep normal keys and values unchanged', () => {
    const input = { a: 1, b: true, c: 'hello' };
    assert.deepEqual(sanitizeQuery(input), { a: 1, b: true, c: 'hello' });
  });

  it('should sanitize string values inside objects', () => {
    // String sanitization currently removes null bytes according to sanitizeString.
    // Testing specific behavior of sanitizeString here.
    const input = { a: 'hello\0world' };
    assert.deepEqual(sanitizeQuery(input), { a: 'helloworld' });
  });

  it('should filter out keys starting with $ (NoSQL operators)', () => {
    const input = {
      $where: 'something',
      $ne: 'other',
      $gt: 5,
      normalKey: 'value',
    };
    assert.deepEqual(sanitizeQuery(input), { normalKey: 'value' });
  });

  it('should filter out keys starting with $ recursively in objects', () => {
    const input = {
      user: {
        $ne: null,
        username: 'admin',
      },
      stats: {
        $gt: {
          $in: [1, 2, 3],
        },
        count: 5,
      },
      valid: true,
    };
    assert.deepEqual(sanitizeQuery(input), {
      user: {
        username: 'admin',
      },
      stats: {
        count: 5,
      },
      valid: true,
    });
  });

  it('should handle arrays recursively', () => {
    const input = [
      { $ne: 1 },
      { id: 5 },
      'string',
      123,
      {
        nested: [
          { $in: [1, 2, 3] },
          { valid: true }
        ]
      }
    ];
    // Array keys are index strings ('0', '1', etc.), which do not start with $
    // However, the items inside might be objects containing keys starting with $.
    assert.deepEqual(sanitizeQuery(input), [
      {}, // First element becomes empty because key '$ne' is filtered
      { id: 5 },
      'string',
      123,
      {
        nested: [
          {}, // First element becomes empty because key '$in' is filtered
          { valid: true }
        ]
      }
    ]);
  });

  it('should handle arrays correctly as values within objects', () => {
      const input = {
          tags: ['a', 'b', { $ne: 'c' }, 'd']
      };
      assert.deepEqual(sanitizeQuery(input), {
          tags: ['a', 'b', {}, 'd']
      });
  });

});
