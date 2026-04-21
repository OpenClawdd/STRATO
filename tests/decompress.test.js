import test from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { promisify } from "node:util";
import { decompress } from "../src/decompress.js";

const gzip = promisify(zlib.gzip);
const deflate = promisify(zlib.deflate);
const brotliCompress = promisify(zlib.brotliCompress);

test("decompress utility", async (t) => {
	const originalString = "Hello, STRATO! Testing decompression utility.";
	const originalBuffer = Buffer.from(originalString);

	await t.test("should decompress gzip", async () => {
		const compressed = await gzip(originalBuffer);
		const decompressed = await decompress(compressed, "gzip");
		assert.equal(decompressed.toString(), originalString);
	});

	await t.test("should decompress deflate", async () => {
		const compressed = await deflate(originalBuffer);
		const decompressed = await decompress(compressed, "deflate");
		assert.equal(decompressed.toString(), originalString);
	});

	await t.test("should decompress brotli (br)", async () => {
		const compressed = await brotliCompress(originalBuffer);
		const decompressed = await decompress(compressed, "br");
		assert.equal(decompressed.toString(), originalString);
	});

	await t.test(
		"should return original buffer for unknown encoding",
		async () => {
			const result = await decompress(originalBuffer, "unknown-encoding");
			assert.deepEqual(result, originalBuffer);
		}
	);

	await t.test(
		"should return original buffer for missing encoding",
		async () => {
			const result = await decompress(originalBuffer);
			assert.deepEqual(result, originalBuffer);
		}
	);

	await t.test("should reject on invalid gzip data", async () => {
		const invalidBuffer = Buffer.from("not a gzip buffer");
		await assert.rejects(async () => {
			await decompress(invalidBuffer, "gzip");
		});
	});

	await t.test("should reject on invalid deflate data", async () => {
		const invalidBuffer = Buffer.from("not a deflate buffer");
		await assert.rejects(async () => {
			await decompress(invalidBuffer, "deflate");
		});
	});

	await t.test("should reject on invalid brotli data", async () => {
		const invalidBuffer = Buffer.from("not a brotli buffer");
		await assert.rejects(async () => {
			await decompress(invalidBuffer, "br");
		});
	});
});
