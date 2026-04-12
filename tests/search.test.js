import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const searchJsPath = path.join(__dirname, '../public/search.js');
const searchJsContent = fs.readFileSync(searchJsPath, 'utf8');

// Execute the script in a way that we can access the search function
// Since search.js is not a module, we can use Function constructor
const search = new Function(`${searchJsContent}; return search;`)();

test('search function', async (t) => {
	await t.test('returns valid URL as is', () => {
		assert.strictEqual(
			search('https://google.com', 'https://duckduckgo.com/?q=%s'),
			'https://google.com/'
		);
		assert.strictEqual(
			search('http://example.com/test?q=param', 'https://google.com/search?q=%s'),
			'http://example.com/test?q=param'
		);
	});

	await t.test('prefixes example.com with http://', () => {
		assert.strictEqual(
			search('example.com', 'https://google.com/search?q=%s'),
			'http://example.com/'
		);
	});

	await t.test('handles search queries with templates', () => {
		assert.strictEqual(
			search('hello world', 'https://google.com/search?q=%s'),
			'https://google.com/search?q=hello%20world'
		);
		assert.strictEqual(
			search('npm', 'https://www.npmjs.com/search?q=%s'),
			'https://www.npmjs.com/search?q=npm'
		);
	});

	await t.test('handles hostnames without dots as search queries', () => {
		// 'localhost' doesn't contain a dot, so it should be treated as a search query
		assert.strictEqual(
			search('localhost', 'https://google.com/search?q=%s'),
			'https://google.com/search?q=localhost'
		);
	});

	await t.test('handles complex queries', () => {
		assert.strictEqual(
			search('what is 2+2?', 'https://google.com/search?q=%s'),
			'https://google.com/search?q=what%20is%202%2B2%3F'
		);
	});

	await t.test('handles URLs with subdomains', () => {
		assert.strictEqual(
			search('sub.example.com', 'https://google.com/search?q=%s'),
			'http://sub.example.com/'
		);
	});

	await t.test('handles URLs with paths and no protocol', () => {
		assert.strictEqual(
			search('example.com/path', 'https://google.com/search?q=%s'),
			'http://example.com/path'
		);
	});
});
