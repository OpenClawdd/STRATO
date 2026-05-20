import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeGame } from "../../public/js/v5/core/catalog.js";
import { launchById } from "../../public/js/v5/core/launch.js";
import { setGames, state } from "../../public/js/v5/core/state.js";
import { keys, readJson, writeJson } from "../../public/js/v5/core/storage.js";

function installStorage() {
  const store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  });
}

function installDom() {
  const viewNode = { classList: { remove: vi.fn(), add: vi.fn() } };
  const navNode = { classList: { toggle: vi.fn() }, dataset: { view: "browser" } };
  const browserBody = { classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() } };
  const iframe = { src: "", addEventListener: vi.fn() };
  const input = { value: "" };

  vi.stubGlobal("document", {
    querySelectorAll: vi.fn((selector) => {
      if (selector === ".view") return [viewNode];
      if (selector === ".nav-btn") return [navNode];
      return [];
    }),
    querySelector: vi.fn((selector) =>
      selector === ".browser-body" ? browserBody : null,
    ),
    getElementById: vi.fn((id) => {
      if (id === "proxy-iframe") return iframe;
      if (id === "url-input") return input;
      if (id === "view-browser") return viewNode;
      return null;
    }),
  });
}

function installWindow() {
  vi.stubGlobal("window", {
    location: { href: "http://localhost:8080/" },
    setTimeout,
    clearTimeout,
    STRATO_NAVIGATE_PROXY: vi.fn(),
  });
}

describe("v5 launch reliability", () => {
  beforeEach(() => {
    installStorage();
    installDom();
    installWindow();
    state.launchBay = { status: "empty", gameId: null, reason: "" };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to GET preflight when HEAD is rejected and still launches", async () => {
    setGames(
      [{ id: "alpha", name: "Alpha", url: "/games/alpha/index.html" }],
      normalizeGame,
    );
    vi.stubGlobal("fetch", vi.fn());
    fetch
      .mockResolvedValueOnce({ ok: false, status: 405 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const onFail = vi.fn();
    const launched = await launchById("alpha", { onFail });

    expect(launched).toBe(true);
    expect(onFail).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/games/alpha/index.html",
      expect.objectContaining({ method: "HEAD" }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/games/alpha/index.html",
      expect.objectContaining({ method: "GET" }),
    );
    expect(readJson(keys.failures, {})).toEqual({});
  });

  it("self-heals failed-local entries by re-checking the route on next launch", async () => {
    setGames(
      [{ id: "beta", name: "Beta", url: "/games/beta/index.html" }],
      normalizeGame,
    );
    writeJson(keys.failures, {
      beta: { reason: "Local route unavailable", timestamp: Date.now() },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    const launched = await launchById("beta");

    expect(launched).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "/games/beta/index.html",
      expect.objectContaining({ method: "HEAD" }),
    );
    expect(readJson(keys.failures, {})).toEqual({});
  });

  it("sets launch bay loading state for external proxy launches", async () => {
    setGames(
      [{ id: "gamma", name: "Gamma", url: "https://orbit.strato.test/game" }],
      normalizeGame,
    );
    vi.stubGlobal("fetch", vi.fn());

    const launched = await launchById("gamma");

    expect(launched).toBe(true);
    expect(window.STRATO_NAVIGATE_PROXY).toHaveBeenCalledTimes(1);
    expect(window.STRATO_NAVIGATE_PROXY).toHaveBeenCalledWith(
      "https://orbit.strato.test/game",
      null,
      expect.objectContaining({
        title: "Gamma",
        external: true,
      }),
    );
    expect(state.launchBay.status).toBe("loading");
    expect(state.launchBay.gameId).toBe("gamma");
    expect(fetch).not.toHaveBeenCalled();
  });
});
