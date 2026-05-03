/* ══════════════════════════════════════════════════════════
   STRATO v21 — Transport Initialization
   Wisp / Bare Mux / UV / Scramjet service worker registration
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const WISP_URL = `${location.origin}/wisp/`;
  const BARE_URL = `${location.origin}/bare/`;

  let uvReady = false;
  let sjReady = false;

  // ── Suppress BareMux infinite retry spam ──
  // Override console.warn/console.error to throttle bare-mux messages (max 3 then mute)
  let bareMuxWarnings = 0;
  const MAX_BAREMUX_WARNINGS = 3;
  const originalWarn = console.warn;
  const originalError = console.error;
  function throttledWarn(...args) {
    const msg = args.join(' ');
    if (msg.includes('bare-mux') || msg.includes('SharedWorker MessagePort') || msg.includes('failed to get a bare-mux')) {
      bareMuxWarnings++;
      if (bareMuxWarnings <= MAX_BAREMUX_WARNINGS) {
        originalWarn.apply(console, args);
        if (bareMuxWarnings === MAX_BAREMUX_WARNINGS) {
          originalWarn.call(console, '[STRATO] Suppressing further bare-mux warnings — proxy transport not available. This is normal if BareMux is not installed.');
        }
      }
      return;
    }
    originalWarn.apply(console, args);
  }
  function throttledError(...args) {
    const msg = args.join(' ');
    if (msg.includes('bare-mux') || msg.includes('SharedWorker MessagePort') || msg.includes('failed to get a bare-mux')) {
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

  async function initTransport() {
    try {
      // ── Step 1: Set up BareMux transport with timeout ──
      if (typeof BareMux !== 'undefined' && BareMux.SetTransport) {
        try {
          // Race BareMux init against a 5-second timeout
          const transportPromise = BareMux.SetTransport('BareMux.BareTransport', {
            wispUrl: WISP_URL,
          });
          await Promise.race([
            transportPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
          ]);
          console.log('[STRATO] BareMux transport set with Wisp URL:', WISP_URL);
        } catch (err) {
          console.warn('[STRATO] BareMux SetTransport failed:', err.message);
          // Try alternative transport setup
          try {
            await Promise.race([
              BareMux.SetTransport('/epoxy/index.js', [{ wisp: WISP_URL }]),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
            ]);
            console.log('[STRATO] BareMux Epoxy transport set');
          } catch (err2) {
            console.warn('[STRATO] BareMux Epoxy transport also failed:', err2.message);
          }
        }
      } else {
        console.warn('[STRATO] BareMux not found — proxy may not work without it. This is normal if bare-mux is not installed.');
      }

      // ── Step 2: Register Ultraviolet service worker ──
      try {
        // UV SW file is uv.sw.js (from setup-proxy.cjs copy), registered at /frog/ scope
        const uvRegistration = await navigator.serviceWorker.register('/frog/uv.sw.js', {
          scope: '/frog/',
          updateViaCache: 'none',
        });
        await navigator.serviceWorker.ready;
        uvReady = true;
        console.log('[STRATO] Ultraviolet service worker registered');
      } catch (err) {
        // Try fallback: /frog/sw.js
        try {
          const uvReg2 = await navigator.serviceWorker.register('/frog/sw.js', {
            scope: '/frog/',
            updateViaCache: 'none',
          });
          await navigator.serviceWorker.ready;
          uvReady = true;
          console.log('[STRATO] Ultraviolet SW registered (fallback path)');
        } catch (err2) {
          console.warn('[STRATO] UV service worker registration failed:', err.message, err2?.message);
        }
      }

      // ── Step 3: Register Scramjet service worker ──
      try {
        const sjRegistration = await navigator.serviceWorker.register('/scramjet/sw.js', {
          scope: '/scramjet/',
          updateViaCache: 'none',
        });
        await navigator.serviceWorker.ready;
        sjReady = true;
        console.log('[STRATO] Scramjet service worker registered');
      } catch (err) {
        console.warn('[STRATO] Scramjet service worker registration failed:', err.message);
        // Scramjet is optional — UV may still work
      }

      // ── Step 4: Check if at least one engine is ready ──
      if (!uvReady && !sjReady) {
        console.error('[STRATO] No proxy engine is available');
        // Don't show blocking error — app can still function for games, chat, AI
        // Proxy just won't work
      }

      // ── Step 5: Emit proxy-ready event (ALWAYS, even if engines failed) ──
      const detail = {
        uv: uvReady,
        scramjet: sjReady,
      };
      window.dispatchEvent(new CustomEvent('proxy-ready', { detail }));
      console.log('[STRATO] Proxy ready:', detail);

    } catch (err) {
      console.error('[STRATO] Transport initialization error:', err);
      // Still emit proxy-ready so the app doesn't hang on the splash screen
      window.dispatchEvent(new CustomEvent('proxy-ready', { detail: { uv: false, scramjet: false } }));
    }
  }

  function showProxyError(message) {
    // Show a specific error — not generic
    const container = document.getElementById('splash') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(248,113,113,0.25);
      border-radius: 16px;
      padding: 32px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      color: #f87171;
      font-family: 'Manrope', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      z-index: 99999;
    `;
    // Escape message to prevent XSS — use textContent instead of innerHTML
    errorDiv.innerHTML = `
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;background:rgba(248,113,113,0.15);padding:4px 12px;border-radius:8px;display:inline-block;margin-bottom:12px;">PROXY ERROR</div>
      <p style="margin:0;" id="proxy-error-msg"></p>
      <button style="
        margin-top:16px;
        background:rgba(0,229,255,0.15);
        border:1px solid rgba(0,229,255,0.25);
        color:#00e5ff;
        padding:8px 24px;
        border-radius:12px;
        cursor:pointer;
        font-family:'Manrope',sans-serif;
        font-size:14px;
      " id="proxy-error-retry">Retry</button>
    `;
    // Safely set the error message text (no HTML injection)
    const msgEl = errorDiv.querySelector('#proxy-error-msg');
    if (msgEl) msgEl.textContent = message;
    // Add click handler via addEventListener instead of inline onclick
    const retryBtn = errorDiv.querySelector('#proxy-error-retry');
    if (retryBtn) retryBtn.addEventListener('click', () => location.reload());
    container.appendChild(errorDiv);

    // Also dispatch proxy-ready so app.js init doesn't hang forever
    window.dispatchEvent(new CustomEvent('proxy-ready', { detail: { uv: false, scramjet: false } }));
  }

  // ── Wait for DOM then initialize ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTransport);
  } else {
    initTransport();
  }
})();
