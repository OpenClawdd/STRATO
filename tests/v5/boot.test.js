import { afterEach, describe, expect, it, vi } from "vitest";
import { runBootSequence, withTimeout } from "../../public/js/v5/core/boot.js";

function installTimerGlobals() {
  vi.stubGlobal("window", {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    showUpdateNotification: vi.fn(),
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("v5 boot watchdog", () => {
  it("resolves before timeout without surfacing an error", async () => {
    installTimerGlobals();

    const revealShell = vi.fn();
    const showBootFailure = vi.fn();

    await runBootSequence({
      initOpenHome: vi.fn().mockResolvedValue(undefined),
      revealShell,
      showBootFailure,
      timeoutMs: 50,
      label: "boot",
    });

    expect(showBootFailure).not.toHaveBeenCalled();
    expect(revealShell).toHaveBeenCalledTimes(1);
    expect(window.showUpdateNotification).not.toHaveBeenCalled();
  });

  it("surfaces rejected boot failures and still reveals the shell", async () => {
    installTimerGlobals();

    const error = new Error("catalog failed");
    const revealShell = vi.fn();
    const showBootFailure = vi.fn();

    await runBootSequence({
      initOpenHome: vi.fn().mockRejectedValue(error),
      revealShell,
      showBootFailure,
      timeoutMs: 50,
      label: "boot",
    });

    expect(showBootFailure).toHaveBeenCalledWith(error);
    expect(revealShell).toHaveBeenCalledTimes(1);
  });

  it("times out hung boot promises and reveals the degraded state", async () => {
    vi.useFakeTimers();
    installTimerGlobals();

    const revealShell = vi.fn();
    const showBootFailure = vi.fn();
    const pending = new Promise(() => {});

    const bootPromise = runBootSequence({
      initOpenHome: vi.fn(() => pending),
      revealShell,
      showBootFailure,
      timeoutMs: 25,
      label: "boot",
    });

    await vi.advanceTimersByTimeAsync(25);
    await bootPromise;

    expect(showBootFailure).toHaveBeenCalledTimes(1);
    expect(String(showBootFailure.mock.calls[0][0].message)).toContain("timed out");
    expect(revealShell).toHaveBeenCalledTimes(1);
  });

  it("rejects timed out work with a clear error message", async () => {
    vi.useFakeTimers();
    installTimerGlobals();

    const pending = new Promise(() => {});
    const timeoutPromise = withTimeout(pending, 10, "catalog load");
    const rejection = timeoutPromise.catch((error) => error);

    await vi.advanceTimersByTimeAsync(10);

    await expect(rejection).resolves.toMatchObject({
      message: "catalog load timed out after 10ms",
    });
  });
});
