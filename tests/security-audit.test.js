import { describe, it, expect } from "vitest";
import fs from "node:fs";

describe("STRATO Security Audit", () => {
  it("should not strip X-Frame-Options in middleware", () => {
    const content = fs.readFileSync("src/index.js", "utf8");
    // Verify that X-Frame-Options stripping is NOT present
    expect(content).not.toContain('lower === "x-frame-options"');
  });

  it("should not rewrite CSP frame-ancestors globally", () => {
    const content = fs.readFileSync("src/index.js", "utf8");
    expect(content).not.toContain("replace(/frame-ancestors/gi");
  });

  it("should allow the built-in media stream without broadening media-src", () => {
    const content = fs.readFileSync("src/index.js", "utf8");
    expect(content).toContain("https://stream.zeno.fm");
    expect(content).toContain(
      'mediaSrc: ["\'self\'", "blob:", "https://stream.zeno.fm"]',
    );
  });

  it("should have active containment shield in app.js", () => {
    const content = fs.readFileSync("public/js/app.js", "utf8");
    expect(content).toContain("Proxy Containment Shield");
    expect(content).toContain("win.open = function");
  });
});
