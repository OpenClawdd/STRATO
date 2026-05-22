import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  classifyGenericOnlyLikeSourceDoctor,
  validateGames,
} from "../scripts/validate-games.mjs";

const tmpDirs = [];

async function writeCatalog(games) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "strato-validate-games-"));
  tmpDirs.push(dir);
  const catalogPath = path.join(dir, "games.json");
  await fs.writeFile(catalogPath, `${JSON.stringify(games, null, 2)}\n`, "utf8");
  return catalogPath;
}

afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("validate-games generic-only gate", () => {
  it("classifies active homepage-only entries as generic_only", () => {
    const game = {
      id: "krunker",
      name: "Krunker",
      url: "https://krunker.io",
      reliability: "yellow",
      thumbnail: "/assets/thumbnails/krunker.webp",
      description: "Fast browser shooter",
      tags: ["fps", "multiplayer"],
      category: "shooter",
    };
    expect(classifyGenericOnlyLikeSourceDoctor(game)).toBe(true);
  });

  it("fails validation for active non-red generic_only entries", async () => {
    const catalogPath = await writeCatalog([
      {
        id: "active-generic",
        name: "Active Generic",
        url: "https://example-play-host.test/",
        reliability: "yellow",
        thumbnail: "/assets/thumbnails/krunker.webp",
        description: "Homepage link, not a playable route",
        tags: ["external"],
        category: "action",
      },
    ]);

    const result = await validateGames(catalogPath);
    const hit = result.issues.find(
      (issue) => issue.type === "active-generic-only-launch-candidate",
    );
    expect(hit).toBeTruthy();
    expect(hit?.severity).toBe("error");
    expect(hit?.message).toBe(
      "Active generic_only launch candidates are not allowed. Quarantine or repair these entries.",
    );
    expect(
      result.quarantine.some(
        (item) => item.id === "active-generic",
      ),
    ).toBe(true);
  });

  it("does not fail for quarantined red generic_only entries", async () => {
    const catalogPath = await writeCatalog([
      {
        id: "quarantined-generic",
        name: "Quarantined Generic",
        url: "https://example-play-host.test/",
        reliability: "red",
        thumbnail: "/assets/thumbnails/krunker.webp",
        description: "Quarantined homepage link",
        tags: ["external"],
        category: "action",
      },
    ]);

    const result = await validateGames(catalogPath);
    expect(
      result.issues.some(
        (issue) => issue.type === "active-generic-only-launch-candidate",
      ),
    ).toBe(false);
  });
});
