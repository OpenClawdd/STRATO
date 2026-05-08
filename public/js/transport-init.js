/* ══════════════════════════════════════════════════════════
   STRATO v21 — Transport Initialization
   Wisp / Bare Mux / UV / Scramjet service worker registration
   ══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const WISP_URL = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/wisp/`;
  const DEBUG_TRANSPORT = false;
  const transportLog = (...args) => {
    if (DEBUG_TRANSPORT) console.debug(...args);
  };
  const transportWarn = (...args) => {
    if (DEBUG_TRANSPORT) console.warn(...args);
  };

  let uvReady = false;
  let sjReady = false;

  // ── Suppress BareMux infinite retry spam ──
  // Override console.warn/console.error to throttle bare-mux messages (max 3 then mute)
  // Also patch the SharedWorker constructor to prevent infinite retries
  let bareMuxWarnings = 0;
  const MAX_BAREMUX_WARNINGS = 3;
  const BAREMUX_RETRY_LIMIT = 10; // Stop retrying after this many attempts
  const originalWarn = console.warn;
  const originalError = console.error;

  function throttledWarn(...args) {
    const msg = args.join(" ");
    if (
      msg.includes("bare-mux") ||
      msg.includes("SharedWorker MessagePort") ||
      msg.includes("failed to get a bare-mux")
    ) {
      bareMuxWarnings++;
      if (DEBUG_TRANSPORT && bareMuxWarnings <= MAX_BAREMUX_WARNINGS) {
        originalWarn.apply(console, args);
        if (bareMuxWarnings === MAX_BAREMUX_WARNINGS) {
          originalWarn.call(
            console,
            "[STRATO] Suppressing further bare-mux warnings — proxy transport not available. This is normal if BareMux SharedWorker is not reachable.",
          );
        }
      }
      return;
    }
    originalWarn.apply(console, args);
  }
  function throttledError(...args) {
    const msg = args.join(" ");
    if (
      msg.includes("bare-mux") ||
      msg.includes("SharedWorker MessagePort") ||
      msg.includes("failed to get a bare-mux")
    ) {
      bareMuxWarnings++;
      if (bareMuxWarnings <= MAX_BAREMUX_WARNINGS) {
        originalError.apply(console, args);
      }
      return;
    }
    originalError.apply(console, args);
  }
  console.warn = throttledWarn;
  console.error = throttledError;

  // ── Patch bare-mux retry loop ──
  // The bare-mux library has an infinite retry loop for SharedWorker connections.
  // We monkey-patch the SharedWorker constructor to track attempts and abort after limit.
  let sharedWorkerAttempts = 0;
  const OriginalSharedWorker = window.SharedWorker;
  if (OriginalSharedWorker) {
    window.SharedWorker = function (url, options) {
      sharedWorkerAttempts++;
      if (sharedWorkerAttempts > BAREMUX_RETRY_LIMIT * 2) {
        // Too many SharedWorker creation attempts — return a dummy that won't loop
        transportWarn(
          "[STRATO] Aborting bare-mux SharedWorker retry loop after",
          sharedWorkerAttempts,
          "attempts",
        );
        const dummy = {
          port: {
            start: () => {},
            close: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            postMessage: () => {},
          },
          terminate: () => {},
        };
        // Dispatch a fake error event to stop the retry loop
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("proxy-ready", {
              detail: { uv: uvReady, scramjet: sjReady },
            }),
          );
        }, 100);
        return dummy;
      }
      return new OriginalSharedWorker(url, options);
    };
    // Copy static properties
    Object.setPrototypeOf(window.SharedWorker, OriginalSharedWorker);
    window.SharedWorker.prototype = OriginalSharedWorker.prototype;
  }

  async function initTransport() {
    try {
      // ── Step 1: Set up BareMux transport with timeout ──
      if (window.BareMux?.BareMuxConnection) {
        try {
          const conn = new BareMux.BareMuxConnection("/bare-mux/worker.js");
          const transportPromise = conn.setTransport("/epoxy/index.mjs", [
            { wisp: WISP_URL },
          ]);
          await Promise.race([
            transportPromise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 5000),
            ),
          ]);
          window.STRATO_BAREMUX = conn;
          transportLog(
            "[STRATO] BareMux transport ready:",
            await conn.getTransport(),
          );
        } catch (err) {
          transportWarn(
            "[STRATO] BareMux transport setup failed:",
            err.message,
          );
        }
      } else {
        transportLog("[STRATO] Continuing with available service workers.");
      }

      // ── Step 2: Register Ultraviolet service worker ──
      try {
        // UV SW file is uv.sw.js (from setup-proxy.cjs copy), registered at /frog/ scope
        const uvRegistration = await navigator.serviceWorker.register(
          "/frog/uv.sw.js",
          {
            scope: "/frog/",
            updateViaCache: "none",
          },
        );
        await navigator.serviceWorker.ready;
        uvReady = true;
        transportLog("[STRATO] Ultraviolet service worker registered");
      } catch (err) {
        // Try fallback: /frog/sw.js
        try {
          const uvReg2 = await navigator.serviceWorker.register("/frog/sw.js", {
            scope: "/frog/",
            updateViaCache: "none",
          });
          await navigator.serviceWorker.ready;
          uvReady = true;
          transportLog("[STRATO] Ultraviolet SW registered (fallback path)");
        } catch (err2) {
          transportWarn(
            "[STRATO] UV service worker registration failed:",
            err.message,
            err2?.message,
          );
        }
      }

      // ── Step 3: Register Scramjet service worker ──
      // Scramjet has two SW entry points:
      //   sw.js          — ESM: uses `import` (requires type: 'module')
      //   sw.classic.js  — Classic: uses `importScripts` (IIFE bundle)
      // Try module first, fall back to classic.
      try {
        // Module-type registration — required for scramjet.bundle.js (ESM)
        const sjRegistration = await navigator.serviceWorker.register(
          "/scramjet/sw.js",
          {
            scope: "/scramjet/",
            type: "module",
            updateViaCache: "none",
          },
        );
        await navigator.serviceWorker.ready;
        sjReady = true;
        transportLog(
          "[STRATO] Scramjet service worker registered (module type)",
        );
      } catch (err) {
        // Classic-type fallback — uses importScripts + scramjet.all.js (IIFE)
        try {
          const sjReg2 = await navigator.serviceWorker.register(
            "/scramjet/sw.classic.js",
            {
              scope: "/scramjet/",
              updateViaCache: "none",
            },
          );
          await navigator.serviceWorker.ready;
          sjReady = true;
          transportLog("[STRATO] Scramjet SW registered (classic fallback)");
        } catch (err2) {
          transportWarn(
            "[STRATO] Scramjet service worker registration failed:",
            err.message,
            err2?.message,
          );
          // Scramjet is optional — UV may still work
        }
      }

      // ── Step 4: Check if at least one engine is ready ──
      if (!uvReady && !sjReady) {
        console.error("[STRATO] No proxy engine is available");
        // Don't show blocking error — app can still function for games, chat, AI
        // Proxy just won't work
      }

      // ── Step 5: Emit proxy-ready event (ALWAYS, even if engines failed) ──
      const detail = {
        uv: uvReady,
        scramjet: sjReady,
      };
      window.dispatchEvent(new CustomEvent("proxy-ready", { detail }));
      transportLog("[STRATO] Proxy ready:", detail);
    } catch (err) {
      console.error("[STRATO] Transport initialization error:", err);
      // Still emit proxy-ready so the app doesn't hang on the splash screen
      window.dispatchEvent(
        new CustomEvent("proxy-ready", {
          detail: { uv: false, scramjet: false },
        }),
      );
    }
  }

  // ── Wait for DOM then initialize ──
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTransport);
  } else {
    initTransport();
  }
})();
