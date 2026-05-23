import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("proxy runtime audit", () => {
  it("registers the UV wrapper worker and preloads the client bundle", () => {
    const content = fs.readFileSync("public/js/transport-init.js", "utf8");
    expect(content).toContain('"/frog/sw.js"');
    expect(content).toContain('"/frog/uv.bundle.js"');
    expect(content).toContain("STRATO_PROXY_URLS.uv");
  });

  it("keeps v5 proxy launches on the transport bridge without recursive navigation", () => {
    const content = fs.readFileSync("public/js/v5/core/launch.js", "utf8");
    expect(content).toContain("STRATO_NAVIGATE_PROXY");
    expect(content).toContain("queueProxyTimeout(game, onFail)");
    expect(content).not.toContain("navigateProxy(");
  });

  it("keeps the proxy smoke check pointed at wrapper assets", () => {
    const content = fs.readFileSync("scripts/check-proxy.mjs", "utf8");
    expect(content).toContain("/frog/uv.bundle.js");
    expect(content).toContain("/frog/sw.js");
    expect(content).toContain("/scramjet/scramjet.bundle.js");
    expect(content).toContain("expected JavaScript");
  });

  it("fails proxy smoke when active wrapper launch candidates return", () => {
    const content = fs.readFileSync("scripts/check-proxy.mjs", "utf8");
    expect(content).toContain("remote_proxy_unverified");
    expect(content).toContain("remote_proxy_verified");
    expect(content).toContain("remote_wrapper_quarantined");
    expect(content).toContain("Active wrapper remote launch candidates");
    expect(content).toContain("frogiee_iframe_wrapper");
    expect(content).toContain("adfree_game_wrapper");
    expect(content).toContain("proxy-proof-queue.json");
  });

  it("contains the wrapper resolver and UV error bridge", () => {
    const launch = fs.readFileSync("public/js/v5/core/launch.js", "utf8");
    const main = fs.readFileSync("public/js/v5/main.js", "utf8");
    expect(launch).toContain("originalUrl");
    expect(launch).toContain("effectiveUrl");
    expect(main).toContain("strato-proxy-internal-error");
    expect(launch).toContain("uv_internal_error");
    expect(launch).toContain("Proxy internal error");
  });

  it("keeps hover prefetch out of v5 proxy launch code", () => {
    const content = fs.readFileSync("public/js/v5/core/launch.js", "utf8");
    expect(content).not.toContain("startHoverPrefetch");
    expect(content).not.toContain('rel="prefetch"');
    expect(content).toContain("verifyLocalRoute");
  });

  it("uses local-first truth copy for v5 stats", () => {
    const content = fs.readFileSync("public/js/v5/ui/home.js", "utf8");
    expect(content).toContain("verified local");
    expect(content).toContain("remote proof pending");
    expect(content).toContain("remote-proxy-unverified");
    expect(content).not.toContain("verified playable");
  });
});
