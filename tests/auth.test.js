import test from "node:test";
import assert from "node:assert";
import { authPage } from "../src/auth.js";

test("authPage utility function", async (t) => {
	await t.test("should return a string containing basic HTML structure", () => {
		const html = authPage("");
		assert.strictEqual(typeof html, "string");
		assert.match(html, /<!DOCTYPE html>/i);
		assert.match(html, /<html lang="en">/i);
		assert.match(html, /<title>Access Restricted<\/title>/i);
		assert.match(html, /<form method="POST">/i);
		assert.match(
			html,
			/<input type="password" name="password" required autofocus autocomplete="off">/i
		);
	});

	await t.test("should display the provided error message", () => {
		const errorMsg = "Incorrect password.";
		const html = authPage(errorMsg);
		assert.match(html, /<div class="error">Incorrect password.<\/div>/i);
	});

	await t.test(
		"should not display the error div when no error message is provided",
		() => {
			const html = authPage("");
			assert.doesNotMatch(html, /<div class="error">/i);
		}
	);
});
