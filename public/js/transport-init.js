/* ══════════════════════════════════════════════════════════
   STRATO v12 — Transport Initialization
   Wisp / Bare Mux / UV / Scramjet service worker registration
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const WISP_URL = `${location.origin}/wisp/`;
  const BARE_URL = `${location.origin}/bare/`;

  let uvReady = false;
  let sjReady = false;

  async function initTransport() {
    try {
      // ── Step 1: Destroy existing BareMux transport if present ──
      if (typeof BareMux !== 'undefined' && BareMux.SetTransport) {
        try {
          await BareMux.SetTransport('BareMux.BareTransport', {
            wispUrl: WISP_URL,
          });
          console.log('[STRATO] BareMux transport set with Wisp URL:', WISP_URL);
        } catch (err) {
          console.warn('[STRATO] BareMux SetTransport failed:', err);
          // Try alternative transport setup
          try {
            await BareMux.SetTransport('/epoxy/index.js', [
              { wisp: WISP_URL },
            ]);
            console.log('[STRATO] BareMux Epoxy transport set');
          } catch (err2) {
            console.warn('[STRATO] BareMux Epoxy transport also failed:', err2);
          }
        }
      } else {
        console.warn('[STRATO] BareMux not found — proxy may not work');
      }

      // ── Step 2: Register Ultraviolet service worker ──
      try {
        const uvRegistration = await navigator.serviceWorker.register('/frog/sw.js', {
          scope: '/frog/',
          updateViaCache: 'none',
        });
        await navigator.serviceWorker.ready;
        uvReady = true;
        console.log('[STRATO] Ultraviolet service worker registered');
      } catch (err) {
        console.warn('[STRATO] UV service worker registration failed:', err.message);
        // UV is optional — Scramjet may still work
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
        showProxyError('No proxy engine could be initialized. Both Ultraviolet and Scramjet failed to register their service workers. Try refreshing the page.');
        return;
      }

      // ── Step 5: Emit proxy-ready event ──
      const detail = {
        uv: uvReady,
        scramjet: sjReady,
      };
      window.dispatchEvent(new CustomEvent('proxy-ready', { detail }));
      console.log('[STRATO] Proxy ready:', detail);

    } catch (err) {
      console.error('[STRATO] Transport initialization error:', err);
      showProxyError(`Transport initialization failed: ${err.message}`);
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
