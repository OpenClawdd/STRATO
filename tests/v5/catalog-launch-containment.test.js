import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { launchability } from "../../public/js/v5/core/health.js";

const games = JSON.parse(fs.readFileSync("public/assets/games.json", "utf8"));

describe.skip("catalog launch containment", () => {
  it("keeps every catalog game launchable inside STRATO", () => {
    const failures = games
      .map((game) => {
        const result = launchability(game, { failures: {} });
        return result.launchable
          ? null
          : {
              id: game.id,
              url: game.url,
              status: result.status,
              reason: result.reason,
            };
      })
      .filter(Boolean);

    expect(failures).toEqual([]);
  });

  it("uses only local routes or proxy-compatible external URLs", () => {
    const escaped = games
      .filter((game) => {
        const url = String(game.url || "");
        return !url.startsWith("/") && !/^https?:\/\//i.test(url);
      })
      .map((game) => ({ id: game.id, url: game.url }));

    expect(escaped).toEqual([]);
  });
});
