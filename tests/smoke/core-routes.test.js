import request from "supertest";
import cookieSignature from "cookie-signature";
import { afterAll, describe, expect, it } from "vitest";
import { app, server } from "../../src/index.js";

function signedAuthCookie(username = "smoke-user") {
  const secret = process.env.COOKIE_SECRET || "dev-secret-change-me";
  const signed = cookieSignature.sign(username, secret);
  return `strato_auth=${encodeURIComponent(`s:${signed}`)}`;
}

describe("server core route smoke", () => {
  afterAll(async () => {
    if (server?.listening) {
      await new Promise(resolve => server.close(resolve));

    }

  });

  it("serves /health without authentication", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body).toHaveProperty("features");
  });

  it("requires auth on /api/config/status", async () => {
    const res = await request(app).get("/api/config/status");
    expect(res.status).toBe(401);
  });

  it("allows authenticated /api/config/status", async () => {
    const res = await request(app)
      .get("/api/config/status")
      .set("Cookie", signedAuthCookie());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("games");
    expect(res.body).toHaveProperty("surfaces");
    expect(res.body).toHaveProperty("mirrors");
  });

  it("maps /play/:id to launch intent query", async () => {
    const res = await request(app)
      .get("/play/tetris")
      .set("Cookie", signedAuthCookie());
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/?play=tetris");
  });
});
