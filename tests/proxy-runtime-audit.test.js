import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("proxy runtime audit", () => {
  it("registers the UV wrapper worker and preloads the client bundle", () => {
    const content = fs.readFileSync("public/js/transport-init.js", "utf8");
    expect(content).toContain('"/frog/sw.js"');
    expect(content).toContain('"/frog/uv.bundle.js"');
    expect(content).toContain("STRATO_PROXY_URLS.uv");
  });

  it("does not recursively re-enter navigateProxy for engine fallback", () => {
    const content = fs.readFileSync("public/js/app.js", "utf8");
    expect(content).toContain("alternateProxyEngine(targetEngine)");
    expect(content).toContain("proxyNavigationInProgress");
    expect(content).toContain("proxyNavigationKey");
    expect(content).not.toContain(
      "navigateProxy(url, fallbackEngine, meta, attempt)",
    );
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
    expect(content).toContain("remote_wrapper_unverified");
    expect(content).toContain("remote_proxy_internal_error");
    expect(content).toContain("Active wrapper remote launch candidates");
    expect(content).toContain("frogiee_iframe_wrapper");
    expect(content).toContain("adfree_game_wrapper");
  });

  it("contains the wrapper resolver and UV error bridge", () => {
    const content = fs.readFileSync("public/js/app.js", "utf8");
    expect(content).toContain("originalUrl");
    expect(content).toContain("effectiveUrl");
    expect(content).toContain("strato-proxy-internal-error");
    expect(content).toContain("uv_internal_error");
    expect(content).toContain("Proxy hit an internal error");
  });
});
