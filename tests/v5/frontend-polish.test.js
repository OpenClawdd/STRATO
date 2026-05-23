import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setGames, state } from "../../public/js/v5/core/state.js";
import { normalizeGame } from "../../public/js/v5/core/catalog.js";
import { searchGames } from "../../public/js/v5/core/search.js";
import { initHealthCache } from "../../public/js/v5/core/health.js";
import { card, fallbackThumb } from "../../public/js/v5/ui/cards.js";
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
  initHealthCache(catalog);
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
    expect(html).toContain("STRATO");
    expect(html).not.toContain("Launch OS");
    expect(html).toContain("home-all-games");
    expect(html).toContain("data-focus-home-search");
    expect(html).toContain('placeholder="Search verified games..."');
    expect(html).toContain("Proxy Lab");
    expect(html).toContain("Launchable Now");
    expect(html).not.toContain("Verified Playable");
    expect(html).toMatch(/<\/head>\s*<body/);
  });

  it("renders local play metadata on cards", () => {
    writeJson(keys.playCounts, { "space-run": 3 });
    const html = card(catalog[0]);
    expect(html).toContain("3 launches");
    expect(html).toContain("Play");
  });

  it("keeps game icon fallbacks visual instead of text placeholders", () => {
    const fallbackSvg = decodeURIComponent(
      fallbackThumb(catalog[0]).split(",")[1],
    );
    expect(fallbackSvg).not.toContain("<text");

    const games = JSON.parse(
      fs.readFileSync(
        path.join(rootDir, "public", "assets", "games.json"),
        "utf8",
      ),
    );
    const missingThumbnails = games.filter(
      (game) => !String(game.thumbnail || "").trim(),
    );
    expect(missingThumbnails).toEqual([]);

    const generatedThumbnails = games
      .map((game) => game.thumbnail)
      .filter((thumbnail) =>
        String(thumbnail).includes("/assets/thumbnails/generated/"),
      );

    for (const thumbnail of generatedThumbnails) {
      const filePath = path.join(rootDir, "public", thumbnail);
      const svg = fs.readFileSync(filePath, "utf8");
      expect(svg).not.toContain("<text");
    }
  });

  it("keeps spotlight search launchable and tag-aware", () => {
    expect(searchGames("runner").map((game) => game.id)).toContain("space-run");
  });

  it("keeps particles disabled by default unless explicitly enabled", () => {
    const particles = fs.readFileSync(
      path.join(rootDir, "public", "js", "particles.js"),
      "utf8",
    );
    expect(particles).toContain('particlePreference !== "true"');
    expect(particles).toContain('canvas.style.display = "none"');
  });

  it("defers chat connection and setup until chat view is navigated", () => {
    const chat = fs.readFileSync(
      path.join(rootDir, "public", "js", "chat.js"),
      "utf8",
    );
    // Verify it uses the initialization guard
    expect(chat).toContain("if (initialized) return;");
    // Verify it doesn't automatically call init on DOM ready or immediately
    expect(chat).not.toMatch(/addEventListener\("DOMContentLoaded",\s*init\)/);
    // Verify it is exposed as window.StratoChat = { init, ... }
    expect(chat).toContain("window.StratoChat = {");
    expect(chat).toContain("init,");
  });

  it("defers media audio creation and setup until click or interaction", () => {
    const media = fs.readFileSync(
      path.join(rootDir, "public", "js", "media-player.js"),
      "utf8",
    );
    // Verify it uses the initialization guard
    expect(media).toContain("if (!initialized)");
    // Verify it binds early for setup early binding without full init
    expect(media).toContain("setupEarlyBinding");
    expect(media).toContain("window.StratoMedia = {");
    expect(media).toContain("init: ensureInitialized,");
  });

  it("aligns release versioning around 1.0.0", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
    );
    expect(pkg.version).toBe("1.0.0");

    const sw = fs.readFileSync(path.join(rootDir, "public", "sw.js"), "utf8");
    expect(sw).toContain("strato-v1.0.0");
  });
});
