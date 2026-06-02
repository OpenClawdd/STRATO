import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { validateRegistry } from "../scripts/source-radar-lib.mjs";

const sources = JSON.parse(
  fs.readFileSync("scripts/catalog-sources.json", "utf8"),
);

describe("requested source registry domains", () => {
  it("tracks requested game source domains as review-first sources", () => {
    const byUrl = new Map(sources.map((source) => [source.url, source]));
    const requested = [
      "https://gn-math.dev",
      "https://selenite.cc",
      "https://frogiesarcade.win",
      "https://1key.lol",
      "https://vapor.onl",
    ];

    for (const url of requested) {
      const source = byUrl.get(url);
      expect(source, url).toBeTruthy();
      expect(source.importMode).toBe("metadata-only");
      expect(source.allowAutoMerge).toBe(false);
      expect(source.status).toBe("review");
    }
  });

  it("keeps the source registry valid after adding requested domains", () => {
    expect(validateRegistry(sources)).toEqual([]);
  });

  it("lets the capture importer read nested applied capture exports", () => {
    const script = fs.readFileSync("scripts/import-captures.mjs", "utf8");
    expect(script).toContain("function captureFiles");
    expect(script).toContain("entry.isDirectory()");
    expect(script).toContain("captureFiles(capturesDir)");
    expect(fs.existsSync("captures/applied/gn-math.raw.json")).toBe(true);
  });

  it("has reviewable GN Math candidates and a Vapor capture attempt", () => {
    const candidates = JSON.parse(
      fs.readFileSync("data/import-review/captured-candidates.json", "utf8"),
    );
    const gnMathCandidates = candidates.filter(
      (candidate) => candidate.provider === "gn-math",
    );
    expect(gnMathCandidates.length).toBeGreaterThanOrEqual(800);
    expect(
      gnMathCandidates
        .slice(0, 12)
        .every((candidate) =>
          candidate.href.startsWith(
            "https://cdn.jsdelivr.net/gh/freebuisness/html@",
          ),
        ),
    ).toBe(true);
    expect(
      gnMathCandidates
        .slice(0, 12)
        .every((candidate) => candidate.href.endsWith(".html")),
    ).toBe(true);

    const vaporCapture = JSON.parse(
      fs.readFileSync("captures/applied/vapor-onl.raw.json", "utf8"),
    );
    expect(vaporCapture.sourceUrl).toBe("https://vapor.onl/");
    expect(vaporCapture.items).toEqual([]);
  });

  it("promotes a small GN Math starter set with direct launch URLs", () => {
    const games = JSON.parse(
      fs.readFileSync("public/assets/games.json", "utf8"),
    );
    const gnMathGames = games.filter((game) => game.provider === "gn-math");
    expect(gnMathGames.map((game) => game.id)).toContain(
      "gn-math-bowmasters",
    );
    expect(gnMathGames.length).toBeGreaterThanOrEqual(8);
    expect(
      gnMathGames.every((game) =>
        game.url.startsWith("https://cdn.jsdelivr.net/gh/freebuisness/html@"),
      ),
    ).toBe(true);
    expect(
      gnMathGames.every((game) => !game.url.includes("gn-math.dev/#game-")),
    ).toBe(true);
  });
});
