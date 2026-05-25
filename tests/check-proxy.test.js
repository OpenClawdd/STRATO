import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("check-proxy report writing", () => {
  it("keeps proxy proof report generation opt-in", () => {
    const content = fs.readFileSync("scripts/check-proxy.mjs", "utf8");

    expect(content).toContain("WRITE_REPORT");
    expect(content).toContain("--write-report");
    expect(content).toContain("STRATO_WRITE_PROXY_REPORT");
    expect(content).toContain("not written; rerun with --write-report");
    expect(content).toContain("if (WRITE_REPORT)");
  });

  it("exposes an explicit report-writing command", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

    expect(pkg.scripts["check:proxy"]).toBe(
      "STRATO_BASE=http://localhost:8080 node scripts/check-proxy.mjs",
    );
    expect(pkg.scripts["check:proxy:write-report"]).toContain("--write-report");
  });
});
