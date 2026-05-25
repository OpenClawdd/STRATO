import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("runtime smoke command", () => {
  it("runs proxy and launch checks in order", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

    expect(pkg.scripts["check:runtime"]).toBe(
      "pnpm run check:proxy && pnpm run check:launch",
    );
  });
});
