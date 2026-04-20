import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync('./public/search.js', 'utf8');

// Mock browser globals needed by search.js
const context = vm.createContext({
    URL: URL,
    encodeURIComponent: encodeURIComponent
});
vm.runInContext(code, context);
const search = context.search;

describe('search utility function', () => {
    const template = 'https://duckduckgo.com/?q=%s';

    describe('valid URLs', () => {
        test('returns input when fully qualified URL', () => {
            assert.strictEqual(search('https://example.com', template), 'https://example.com/');
            assert.strictEqual(search('http://localhost:8080', template), 'http://localhost:8080/');
            assert.strictEqual(search('https://example.com/path?query=1', template), 'https://example.com/path?query=1');
        });
    });

    describe('URLs missing protocol', () => {
        test('adds http:// and returns when input has valid hostname with TLD', () => {
            assert.strictEqual(search('example.com', template), 'http://example.com/');
            assert.strictEqual(search('sub.example.com/test?q=param', template), 'http://sub.example.com/test?q=param');
            assert.strictEqual(search('test.co.uk', template), 'http://test.co.uk/');
        });
    });

    describe('search queries', () => {
        test('formats search query when input is plain text', () => {
            assert.strictEqual(search('hello world', template), 'https://duckduckgo.com/?q=hello%20world');
            assert.strictEqual(search('test query with spaces', template), 'https://duckduckgo.com/?q=test%20query%20with%20spaces');
        });

        test('formats search query when input is single word (no TLD)', () => {
            assert.strictEqual(search('localhost', template), 'https://duckduckgo.com/?q=localhost');
            assert.strictEqual(search('test', template), 'https://duckduckgo.com/?q=test');
        });

        test('formats search query when input contains special characters', () => {
            assert.strictEqual(search('test+query&other=true', template), 'https://duckduckgo.com/?q=test%2Bquery%26other%3Dtrue');
        });
    });
});
