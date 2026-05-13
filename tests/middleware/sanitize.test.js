import { describe, it } from 'node:test';
import assert from 'node:assert';
import { escapeHtml } from '../../src/middleware/sanitize.js';

describe('escapeHtml', () => {
  it('should return non-string inputs unaltered', () => {
    assert.strictEqual(escapeHtml(null), null);
    assert.strictEqual(escapeHtml(undefined), undefined);
    assert.strictEqual(escapeHtml(123), 123);
    const obj = {};
    assert.strictEqual(escapeHtml(obj), obj);
  });

  it('should return strings without HTML entities unaltered', () => {
    assert.strictEqual(escapeHtml('hello world'), 'hello world');
    assert.strictEqual(escapeHtml('123 ABC abc'), '123 ABC abc');
    assert.strictEqual(escapeHtml(''), '');
  });

  it('should escape all defined HTML entities individually', () => {
    assert.strictEqual(escapeHtml('&'), '&amp;');
    assert.strictEqual(escapeHtml('<'), '&lt;');
    assert.strictEqual(escapeHtml('>'), '&gt;');
    assert.strictEqual(escapeHtml('"'), '&quot;');
    assert.strictEqual(escapeHtml("'"), '&#x27;');
    assert.strictEqual(escapeHtml('/'), '&#x2F;');
    assert.strictEqual(escapeHtml('`'), '&#96;');
  });

  it('should escape multiple instances of HTML entities', () => {
    assert.strictEqual(
      escapeHtml('<script>alert("XSS")</script>'),
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
    );
    assert.strictEqual(escapeHtml('&&&'), '&amp;&amp;&amp;');
    assert.strictEqual(escapeHtml('\'"`/'), '&#x27;&quot;&#96;&#x2F;');
  });

  it('should escape complex strings mixed with safe text', () => {
    const input = 'Hello <World> & "Friends" / `Backticks` \'Single\'';
    const expected = 'Hello &lt;World&gt; &amp; &quot;Friends&quot; &#x2F; &#96;Backticks&#96; &#x27;Single&#x27;';
    assert.strictEqual(escapeHtml(input), expected);
  });
});
