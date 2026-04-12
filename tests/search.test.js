import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

const code = fs.readFileSync(path.resolve("public/search.js"), "utf8");
const context = vm.createContext({ URL }); // Pass URL to the context
vm.runInContext(code, context);
const search = context.search;

test("search function", async (t) => {
	const template = "https://www.google.com/search?q=%s";

	await t.test("valid URL with protocol", () => {
		assert.strictEqual(
			search("https://example.com", template),
			"https://example.com/"
		);
		assert.strictEqual(
			search("http://example.com/test?q=param", template),
			"http://example.com/test?q=param"
		);
	});

	await t.test("valid URL without protocol", () => {
		assert.strictEqual(search("example.com", template), "http://example.com/");
		assert.strictEqual(
			search("google.com/search", template),
			"http://google.com/search"
		);
	});

	await t.test("search query", () => {
		assert.strictEqual(
			search("hello world", template),
			"https://www.google.com/search?q=hello%20world"
		);
		assert.strictEqual(
			search("something", template),
			"https://www.google.com/search?q=something"
		);
	});

	await t.test(
		"invalid hostname without dot should be treated as search query",
		() => {
			assert.strictEqual(
				search("localhost", template),
				"https://www.google.com/search?q=localhost"
			);
		}
	);
});
