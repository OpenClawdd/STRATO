import { test, describe } from "node:test";
import assert from "node:assert";
import request from "supertest";
import { app } from "../src/index.js";
import cookieSignature from "cookie-signature";

const DUMMY_SECRET = process.env.COOKIE_SECRET || "dummy_secret";
process.env.COOKIE_SECRET = DUMMY_SECRET;
const signedAuthCookie = `auth=s%3A${cookieSignature.sign("true", DUMMY_SECRET)}`;

describe("Express App Tests", () => {
	test("GET /proxy missing URL should return 400", async () => {
		const res = await request(app).get("/proxy").set("Cookie", signedAuthCookie);
		assert.strictEqual(res.statusCode, 400);
		assert.strictEqual(res.text, "No URL provided");
	});

	test("POST /api/smuggle missing targetUrl should return 400", async () => {
		const res = await request(app).post("/api/smuggle").set("Cookie", signedAuthCookie).send({});
		assert.strictEqual(res.statusCode, 400);
		assert.strictEqual(res.text, "No targetUrl provided");
	});

	test("GET /uv/uv.config.js should return 200", async () => {
		const res = await request(app).get("/uv/uv.config.js");
		assert.strictEqual(res.statusCode, 200);
	});
});

describe("Save and Auth endpoints", () => {
	test("POST /api/save missing data should return 400", async () => {
		const res = await request(app).post("/api/save").set("Cookie", signedAuthCookie).send({});
		assert.strictEqual(res.statusCode, 400);
		assert.strictEqual(res.text, "No data");
	});

	test("POST /api/save valid data should return 200", async () => {
		const res = await request(app)
			.post("/api/save")
			.set("Cookie", signedAuthCookie)
			.send({ data: { test: true } });
		assert.strictEqual(res.statusCode, 200);
		assert.strictEqual(res.text, "Saved.");
	});

	test("POST /api/save payload too large should return 413", async () => {
		const largeStr = "a".repeat(1_000_001);
		const res = await request(app).post("/api/save").set("Cookie", signedAuthCookie).send({ data: largeStr });
		assert.strictEqual(res.statusCode, 413);
		assert.strictEqual(res.text, "Data too large");
	});
});

describe("Static files serving", () => {
	test("GET / should return 200", async () => {
		const res = await request(app).get("/");
		assert.strictEqual(res.statusCode, 200);
	});

	test("GET /unknown-path should return 404", async () => {
		const res = await request(app).get("/unknown-path").set("Cookie", signedAuthCookie);
		assert.strictEqual(res.statusCode, 404);
	});
});
