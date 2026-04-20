import { describe, it } from "node:test";
import assert from "node:assert";
import { safeName } from "../expand-library.js";

describe("safeName utility function", () => {
	it("should return the same string for already safe lowercase names", () => {
		assert.strictEqual(safeName("tetris"), "tetris");
		assert.strictEqual(safeName("slope"), "slope");
	});

	it("should convert uppercase characters to lowercase", () => {
		assert.strictEqual(safeName("TETRIS"), "tetris");
		assert.strictEqual(safeName("Retro Bowl"), "retro_bowl");
	});

	it("should replace spaces and punctuation with underscores", () => {
		assert.strictEqual(safeName("1v1.LOL"), "1v1_lol");
		assert.strictEqual(safeName("Papa's Pizzeria"), "papa_s_pizzeria");
		assert.strictEqual(safeName("A & B"), "a_b");
	});

	it("should remove trailing underscores", () => {
		assert.strictEqual(safeName("Test!!!"), "test");
		assert.strictEqual(safeName("Hello World!"), "hello_world");
		assert.strictEqual(safeName("Trailing_ _ _"), "trailing");
	});

	it("should collapse multiple consecutive invalid characters into a single underscore", () => {
		assert.strictEqual(safeName("Hello...World"), "hello_world");
		assert.strictEqual(safeName("A   B"), "a_b");
	});

	it("should return an empty string if it only contains invalid characters", () => {
		assert.strictEqual(safeName("!!!"), "");
		assert.strictEqual(safeName("   "), "");
	});

	it("should handle empty strings correctly", () => {
		assert.strictEqual(safeName(""), "");
	});
});
