import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeGame } from "../../public/js/v5/core/catalog.js";
import {
  classifyProxyFailure,
  launchById,
  resolveProxyLaunchUrl,
  reportProxyBlockedOrFailed,
  reportProxyIframeLoaded,
  reportProxyInternalError,
} from "../../public/js/v5/core/launch.js";
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
  const navNode = {
    classList: { toggle: vi.fn() },
    dataset: { view: "browser" },
  };
  const browserBody = {
    classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
  };
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
    dispatchEvent: vi.fn(),
  });
}

describe("v5 launch reliability", () => {
  beforeEach(() => {
    installStorage();
    installDom();
    installWindow();
    state.launchBay = { status: "empty", gameId: null, reason: "" };
    state.proxyLaunchTelemetry = {
      stage: "idle",
      gameId: null,
      reason: "",
      kind: null,
      engine: null,
      sourceUrl: "",
      targetUrl: "",
      detail: "",
      at: 0,
    };
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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );

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
      [
        {
          id: "gamma",
          name: "Gamma",
          url: "https://orbit.strato.test/game",
          proxyVerified: true,
        },
      ],
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
    expect(state.proxyLaunchTelemetry.stage).toBe("handed_off");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not record proxy success without an iframe load signal", async () => {
    setGames(
      [
        {
          id: "delta",
          name: "Delta",
          url: "https://orbit.strato.test/play",
          proxyVerified: true,
        },
      ],
      normalizeGame,
    );
    vi.stubGlobal("fetch", vi.fn());

    const launched = await launchById("delta");

    expect(launched).toBe(true);
    expect(state.proxyLaunchTelemetry.stage).toBe("handed_off");
    expect(state.launchBay.status).toBe("loading");
    expect(state.launchBay.status).not.toBe("loaded");
  });

  it("records iframe-loaded telemetry when a detectable load signal arrives", async () => {
    setGames(
      [
        {
          id: "theta",
          name: "Theta",
          url: "https://orbit.strato.test/play",
          proxyVerified: true,
        },
      ],
      normalizeGame,
    );
    vi.stubGlobal("fetch", vi.fn());

    await launchById("theta");
    reportProxyIframeLoaded("theta");

    expect(state.proxyLaunchTelemetry.stage).toBe("iframe_loaded");
    expect(state.launchBay.status).toBe("loaded");
    expect(state.launchBay.reason).toContain("load signal");
  });

  it("classifies blocked or failed iframe signal truthfully", async () => {
    setGames(
      [
        {
          id: "iota",
          name: "Iota",
          url: "https://orbit.strato.test/play",
          proxyVerified: true,
        },
      ],
      normalizeGame,
    );
    vi.stubGlobal("fetch", vi.fn());
    const onFail = vi.fn();

    await launchById("iota", { onFail });
    reportProxyBlockedOrFailed("iota", "Iframe error event", onFail);

    expect(state.proxyLaunchTelemetry.stage).toBe("blocked_or_failed");
    expect(state.launchBay.status).toBe("failed");
    expect(state.launchBay.reason).toContain("Iframe error event");
    expect(onFail).toHaveBeenCalledWith(
      expect.objectContaining({ id: "iota" }),
      "Iframe error event",
    );
  });

  it("classifies UV internal proxy errors with source context", () => {
    const classified = classifyProxyFailure("UV internal error: headers is not iterable", {
      kind: "uv_internal_error",
      engine: "uv",
      sourceUrl:
        "https://adfree-sz-games.github.io/games/game.html?game=https://tylerpalko.github.io/gamehub/boxingrandom/",
      targetUrl: "https://tylerpalko.github.io/gamehub/boxingrandom/",
      detail: "headers is not iterable",
    });

    expect(classified.kind).toBe("uv_internal_error");
    expect(classified.engine).toBe("uv");
    expect(classified.sourceUrl).toContain("adfree-sz-games.github.io");
    expect(classified.targetUrl).toContain("tylerpalko.github.io");
  });

  it("preserves wrapper URLs when the nested target is not verified", () => {
    const wrapper =
      "https://adfree-sz-games.github.io/games/game.html?game=https://tylerpalko.github.io/gamehub/boxingrandom/";
    const resolved = resolveProxyLaunchUrl(wrapper, { id: "boxingrandom" }, { verifiedTargets: [] });

    expect(resolved.originalUrl).toBe(wrapper);
    expect(resolved.effectiveUrl).toBe(wrapper);
    expect(resolved.nestedUrl).toBe(
      "https://tylerpalko.github.io/gamehub/boxingrandom/",
    );
    expect(resolved.repaired).toBe(false);
  });

  it("rewrites wrapper URLs only when the nested target is verified", () => {
    const wrapper =
      "https://adfree-sz-games.github.io/games/game.html?game=https://play.example.test/game/";
    const resolved = resolveProxyLaunchUrl(wrapper, null, {
      verifiedTargets: ["https://play.example.test/game/"],
    });

    expect(resolved.originalUrl).toBe(wrapper);
    expect(resolved.nestedUrl).toBe("https://play.example.test/game/");
    expect(resolved.effectiveUrl).toBe("https://play.example.test/game/");
    expect(resolved.repaired).toBe(true);
  });

  it("records internal proxy errors with truthful telemetry details", async () => {
    setGames(
      [
        {
          id: "omega",
          name: "Omega",
          url: "https://orbit.strato.test/play",
          proxyVerified: true,
        },
      ],
      normalizeGame,
    );
    vi.stubGlobal("fetch", vi.fn());

    await launchById("omega");
    reportProxyInternalError({
      gameId: "omega",
      kind: "uv_internal_error",
      engine: "uv",
      reason: "UV internal error: headers is not iterable",
      sourceUrl:
        "https://adfree-sz-games.github.io/games/game.html?game=https://tylerpalko.github.io/gamehub/boxingrandom/",
      targetUrl: "https://tylerpalko.github.io/gamehub/boxingrandom/",
      detail: "headers is not iterable",
    });

    expect(state.proxyLaunchTelemetry.stage).toBe("blocked_or_failed");
    expect(state.proxyLaunchTelemetry.kind).toBe("uv_internal_error");
    expect(state.proxyLaunchTelemetry.engine).toBe("uv");
    expect(state.launchBay.status).toBe("failed");
    expect(state.launchBay.reason).toContain("UV internal error");
  });

  it("classifies timeout and supports retry recovery telemetry", async () => {
    vi.useFakeTimers();
    try {
      setGames(
        [
          {
            id: "lambda",
            name: "Lambda",
            url: "https://orbit.strato.test/play",
            proxyVerified: true,
          },
        ],
        normalizeGame,
      );
      vi.stubGlobal("fetch", vi.fn());
      const onFail = vi.fn();

      await launchById("lambda", { onFail });
      await vi.advanceTimersByTimeAsync(12050);

      expect(state.proxyLaunchTelemetry.stage).toBe("timeout");
      expect(state.launchBay.status).toBe("failed");
      expect(state.launchBay.reason).toContain("timed out");
      expect(onFail).toHaveBeenCalledTimes(1);

      await launchById("lambda", { onFail });

      expect(state.proxyLaunchTelemetry.stage).toBe("handed_off");
      expect(state.launchBay.status).toBe("loading");
      expect(state.launchBay.reason).toContain("Handed off");
    } finally {
      vi.useRealTimers();
    }
  });
});
