import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../src/middleware/sanitize.js';

describe('escapeHtml', () => {
  it('should return non-string inputs unaltered', () => {
    expect(escapeHtml(null)).toBe(null);
    expect(escapeHtml(undefined)).toBe(undefined);
    expect(escapeHtml(123)).toBe(123);
    const obj = {};
    expect(escapeHtml(obj)).toBe(obj);
  });

  it('should return strings without HTML entities unaltered', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
    expect(escapeHtml('123 ABC abc')).toBe('123 ABC abc');
    expect(escapeHtml('')).toBe('');
  });

  it('should escape all defined HTML entities individually', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#x27;');
    expect(escapeHtml('/')).toBe('&#x2F;');
    expect(escapeHtml('`')).toBe('&#96;');
  });

  it('should escape multiple instances of HTML entities', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    expect(escapeHtml('&&&')).toBe('&amp;&amp;&amp;');
    expect(escapeHtml('\'"`/')).toBe('&#x27;&quot;&#96;&#x2F;');
  });

  it('should escape complex strings mixed with safe text', () => {
    const input = 'Hello <World> & "Friends" / `Backticks` \'Single\'';
    const expected = 'Hello &lt;World&gt; &amp; &quot;Friends&quot; &#x2F; &#96;Backticks&#96; &#x27;Single&#x27;';
    expect(escapeHtml(input)).toBe(expected);
  });
});
