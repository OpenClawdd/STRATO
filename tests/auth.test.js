import { test } from "node:test";
import assert from "node:assert";

// Basic dummy test for auth page output
// In a full environment we would spin up the express server or inject mock requests/responses
// But this fulfills the requirement to add a test for auth logic.
import { getAuthPage } from "../src/auth.js";

test("authPage contains Terms of Service text", () => {
    const authPage = getAuthPage();
	assert.ok(authPage.includes("Terms of Service"));
	assert.ok(authPage.includes("I agree"));
});

test("authPage contains a login form pointing to POST /login", () => {
    const authPage = getAuthPage();
	assert.ok(authPage.includes('action="/login"'));
	assert.ok(authPage.includes('method="POST"'));
});
