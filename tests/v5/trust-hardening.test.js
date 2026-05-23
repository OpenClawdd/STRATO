import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  playableCatalog,
  clearCatalogMemo,
  normalizeGame,
} from "../../public/js/v5/core/catalog.js";
import { initHealthCache } from "../../public/js/v5/core/health.js";
import { state, setGames } from "../../public/js/v5/core/state.js";
import { showRecovery } from "../../public/js/v5/ui/recovery.js";

function installDom() {
  const container = {
    innerHTML: "",
    appendChild: vi.fn(),
    remove: vi.fn(),
    addEventListener: vi.fn(),
    dataset: {},
    style: {},
    classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
    closest: vi.fn(() => ({ dataset: {} })),
  };
  vi.stubGlobal("document", {
    createElement: vi.fn(() => ({ ...container })),
    getElementById: vi.fn(() => ({ ...container })),
    body: { appendChild: vi.fn() },
  });
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  });
}

describe("STRATO Trust & Hardening", () => {
  beforeEach(() => {
    installDom();
    clearCatalogMemo();
    setGames(
      [
        {
          id: "good",
          reliability: "green",
          name: "Good Game",
          category: "action",
          url: "/games/good",
        },
        {
          id: "bad",
          reliability: "red",
          name: "Broken Game",
          category: "action",
          url: "/games/bad",
        },
      ],
      normalizeGame,
    );
    initHealthCache(state.games);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("excludes red games from the playable catalog", () => {
    setGames(
      [
        {
          id: "good",
          reliability: "green",
          name: "Good Game",
          category: "action",
          url: "/games/good",
        },
        {
          id: "bad",
          reliability: "red",
          name: "Broken Game",
          category: "action",
          url: "/games/bad",
        },
      ],
      normalizeGame,
    );
    initHealthCache(state.games);
    const list = playableCatalog();
    expect(list.some((g) => g.id === "bad")).toBe(false);
    expect(list.some((g) => g.id === "good")).toBe(true);
  });

  it("preserves verified status during normalization", () => {
    const game = normalizeGame({
      id: "test",
      reliability: "green",
      url: "/test",
    });
    expect(game.reliability).toBe("green");
  });
});
