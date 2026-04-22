
import { test, describe } from "node:test";
import assert from "node:assert";
import request from "supertest";
import { app } from "../src/index.js";
import cookieSignature from "cookie-signature";

const validCookie = "strato_auth=s:" + cookieSignature.sign("granted", process.env.COOKIE_SECRET || "change_this_to_a_long_random_string");

describe("Express App Tests", () => {
	test("GET /proxy missing URL should return 400", async () => {
		const res = await request(app).get("/proxy").set("Cookie", validCookie);
		assert.strictEqual(res.statusCode, 400);
		assert.strictEqual(res.text, "No URL provided");
	});

	test("POST /api/smuggle missing targetUrl should return 400", async () => {
		const res = await request(app).post("/api/smuggle").set("Cookie", validCookie).send({});
		assert.strictEqual(res.statusCode, 400);
		assert.strictEqual(res.text, "No targetUrl provided");
	});

	test("GET /uv/uv.config.js should return 200", async () => {
		const res = await request(app).get("/uv/uv.config.js").set("Cookie", validCookie);
		assert.strictEqual(res.statusCode, 200);
	});
});

describe("Save and Auth endpoints", () => {
	test("POST /api/save missing data should return 400", async () => {
		const res = await request(app).post("/api/save").set("Cookie", validCookie).send({});
		assert.strictEqual(res.statusCode, 400);
		assert.strictEqual(res.text, "No data");
	});

	test("POST /api/save valid data should return 200", async () => {
		const res = await request(app)
			.post("/api/save")
            .set("Cookie", validCookie)
			.send({ data: { test: true } });
		assert.strictEqual(res.statusCode, 200);
		assert.strictEqual(res.text, "Saved.");
	});

	test("POST /api/save payload too large should return 413", async () => {
		const largeStr = "a".repeat(1_000_001);
		const res = await request(app).post("/api/save").set("Cookie", validCookie).send({ data: largeStr });
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
		const res = await request(app).get("/unknown-path").set("Cookie", validCookie);
		assert.strictEqual(res.statusCode, 404);
	});
});


describe("Unauthenticated access", () => {
    test("GET /proxy without cookie should return 302", async () => {
        const res = await request(app).get("/proxy");
        assert.strictEqual(res.statusCode, 302);
        assert.strictEqual(res.headers.location, "/");
    });

    test("POST /api/save without cookie should return 302", async () => {
        const res = await request(app).post("/api/save").send({});
        assert.strictEqual(res.statusCode, 302);
        assert.strictEqual(res.headers.location, "/");
    });
});
