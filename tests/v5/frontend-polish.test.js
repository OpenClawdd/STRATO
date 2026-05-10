import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setGames, state } from "../../public/js/v5/core/state.js";
import { normalizeGame } from "../../public/js/v5/core/catalog.js";
import { searchGames } from "../../public/js/v5/core/search.js";
import { card } from "../../public/js/v5/ui/cards.js";
import { keys, writeJson } from "../../public/js/v5/core/storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");

function installDom() {
  vi.stubGlobal("document", {
    createElement() {
      return {
        textContent: "",
        get innerHTML() {
          return String(this.textContent)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
        },
      };
    },
  });
}

function installStorage() {
  const store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  });
}

const catalog = [
  {
    id: "space-run",
    name: "Space Run",
    category: "action",
    tags: ["runner", "skill"],
    description: "Fast reflex arcade run",
    url: "/games/space-run/index.html",
    thumbnail: "/assets/space.webp",
    reliability: "green",
  },
];

beforeEach(() => {
  installDom();
  installStorage();
  state.activeMood = "all";
  setGames(catalog, normalizeGame);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("v5.03 frontend polish", () => {
  it("ships the v5.03 hero and Launch Shelf targets", () => {
    const html = fs.readFileSync(
      path.join(rootDir, "public", "index.html"),
      "utf8",
    );
    expect(html).toContain("v5.03");
    expect(html).toContain("home-all-games");
    expect(html).toContain("data-focus-home-search");
  });

  it("renders local play metadata on cards", () => {
    writeJson(keys.playCounts, { "space-run": 3 });
    const html = card(catalog[0]);
    expect(html).toContain("3 launches");
    expect(html).toContain("Play");
  });

  it("keeps spotlight search launchable and tag-aware", () => {
    expect(searchGames("runner").map((game) => game.id)).toContain("space-run");
  });
});
