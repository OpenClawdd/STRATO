/**
 * STRATO Stealth Module v3.0
 * ==========================
 * Tab cloaking, panic redirect, stealth CSS overlays,
 * keyboard shortcuts, and idle detection.
 *
 * Exposes: window.updateStealthTabTitle
 */

(function () {
  'use strict';

  // ── Cloak presets ─────────────────────────────────────────────────
  const PRESETS = {
    default: {
      title: 'STRATO — Next-Gen Proxy',
      favicon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>",
    },
    drive: {
      title: 'My Drive — Google Drive',
      favicon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png',
    },
    classroom: {
      title: 'Stream — Google Classroom',
      favicon: 'https://ssl.gstatic.com/classroom/favicon.png',
    },
  };

  let activePreset  = 'default';
  let stealthMode   = localStorage.getItem('strato-stealth') || 'off';
  let autoCloakEnabled = localStorage.getItem('strato-auto-cloak') !== 'false'; // default on
  let idleTimer     = null;
  const IDLE_TIMEOUT = 90_000; // 90 seconds

  // ── Favicon helper ────────────────────────────────────────────────
  function setFavicon(href) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  }

  // ── Apply a cloak preset ──────────────────────────────────────────
  function applyCloak(preset) {
    const p = PRESETS[preset] || PRESETS.default;
    document.title = p.title;
    setFavicon(p.favicon);
  }

  // ── Restore real identity ─────────────────────────────────────────
  function restoreIdentity() {
    const p = PRESETS[activePreset] || PRESETS.default;
    document.title = p.title;
    setFavicon(p.favicon);
  }

  // ── Stealth CSS overlays ──────────────────────────────────────────
  function applyStealthTheme(mode) {
    stealthMode = mode;
    localStorage.setItem('strato-stealth', mode);

    // Toggle CSS overlay stylesheets
    const driveCSS     = document.querySelector('link[href="stealth-drive.css"]');
    const classroomCSS = document.querySelector('link[href="stealth-classroom.css"]');

    if (driveCSS)     driveCSS.disabled     = (mode !== 'drive');
    if (classroomCSS) classroomCSS.disabled  = (mode !== 'classroom');

    // Also update cloak preset
    if (mode === 'drive')      { activePreset = 'drive';      applyCloak('drive'); }
    else if (mode === 'classroom') { activePreset = 'classroom'; applyCloak('classroom'); }
    else                       { activePreset = 'default';    restoreIdentity(); }

    // Update stealth btn state
    const btn = document.getElementById('stealth-btn');
    if (btn) {
      const dot = btn.querySelector('.dot');
      if (dot) {
        dot.style.background = mode !== 'off' ? '#00ffa3' : '#8b5cf6';
        dot.style.boxShadow  = mode !== 'off' ? '0 0 6px rgba(0,255,163,0.5)' : '0 0 6px rgba(139,92,246,0.5)';
      }
    }
  }

  // ── Auto-cloak on tab hide ────────────────────────────────────────
  function initVisibilityCloak() {
    document.addEventListener('visibilitychange', () => {
      if (!autoCloakEnabled) return;
      if (document.hidden) {
        applyCloak('drive'); // Always cloak as Drive when hidden
      } else {
        restoreIdentity();
      }
    });
  }

  // ── Panic redirect ────────────────────────────────────────────────
  function panic() {
    const url = localStorage.getItem('strato_panic') || localStorage.getItem('strato-panic-url') || 'https://classroom.google.com';
    location.replace(url);
  }
  window.panic = panic;

  // ── Idle detection ────────────────────────────────────────────────
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (localStorage.getItem('strato-idle') !== 'true') return;
    idleTimer = setTimeout(() => {
      if (!document.hidden) applyCloak('drive');
    }, IDLE_TIMEOUT);
  }

  function initIdleDetection() {
    ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach(ev =>
      document.addEventListener(ev, resetIdleTimer, { passive: true })
    );
    resetIdleTimer();
  }

  // ── updateStealthTabTitle — called by app.js on view switch ──────
  window.updateStealthTabTitle = function (viewName) {
    if (stealthMode !== 'off') return; // Don't override when stealth is active
    const TITLES = {
      home:     'STRATO — Dashboard',
      grid:     'STRATO — Arcade',
      watch:    'STRATO — Watch',
      listen:   'STRATO — Listen',
      browser:  'STRATO — Browser',
      ai:       'STRATO — Tools',
      settings: 'STRATO — Settings',
    };
    document.title = TITLES[viewName] || 'STRATO';
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────
  function initShortcuts() {
    document.addEventListener('keydown', e => {
      // Ctrl+Shift+D = toggle stealth
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const next = stealthMode === 'off' ? 'drive' : 'off';
        applyStealthTheme(next);
        return;
      }

      // Backtick / ~ = panic
      if ((e.key === '`' || e.key === '~') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
        if (!isTyping) { e.preventDefault(); panic(); }
        return;
      }

      // Escape while theater is open = close theater
      if (e.key === 'Escape' && window.StratoGameEngine?.isTheaterOpen()) {
        window.StratoGameEngine.close();
      }
    });

    // Panic button
    const panicBtn = document.getElementById('panic-btn');
    if (panicBtn) panicBtn.addEventListener('click', panic);

    // Stealth toggle button
    const stealthBtn = document.getElementById('stealth-btn');
    if (stealthBtn) {
      stealthBtn.addEventListener('click', () => {
        const next = stealthMode === 'off' ? 'drive' : 'off';
        applyStealthTheme(next);
      });
    }
  }

  // ── Settings wiring ───────────────────────────────────────────────
  function wireSettings() {
    // Cloak select
    const cloakSel = document.getElementById('setting-cloak');
    if (cloakSel) {
      cloakSel.value = activePreset;
      cloakSel.addEventListener('change', e => {
        activePreset = e.target.value;
        restoreIdentity();
      });
    }

    // Auto-cloak toggle
    const autoCloak = document.getElementById('setting-auto-cloak');
    if (autoCloak) {
      autoCloak.classList.toggle('on', autoCloakEnabled);
      autoCloak.addEventListener('click', () => {
        autoCloakEnabled = !autoCloakEnabled;
        autoCloak.classList.toggle('on', autoCloakEnabled);
        localStorage.setItem('strato-auto-cloak', autoCloakEnabled);
      });
    }

    // Stealth mode select
    const stealthSel = document.getElementById('setting-stealth');
    if (stealthSel) {
      stealthSel.value = stealthMode;
      stealthSel.addEventListener('change', e => applyStealthTheme(e.target.value));
    }

    // Idle detection toggle
    const idleTog = document.getElementById('setting-idle');
    if (idleTog) {
      const idleOn = localStorage.getItem('strato-idle') === 'true';
      idleTog.classList.toggle('on', idleOn);
      idleTog.addEventListener('click', () => {
        idleTog.classList.toggle('on');
        localStorage.setItem('strato-idle', idleTog.classList.contains('on'));
        resetIdleTimer();
      });
    }

    // History poisoning toggle
    const histTog = document.getElementById('setting-history');
    if (histTog) {
      const histOn = localStorage.getItem('strato-history') === 'true';
      histTog.classList.toggle('on', histOn);
      histTog.addEventListener('click', () => {
        histTog.classList.toggle('on');
        localStorage.setItem('strato-history', histTog.classList.contains('on'));
        if (histTog.classList.contains('on')) injectHistoryNoise();
      });
    }

    // Auto-cloak in games toggle
    const acgTog = document.getElementById('setting-auto-cloak-game');
    if (acgTog) {
      const acgOn = localStorage.getItem('strato-auto-cloak-game') === 'true';
      acgTog.classList.toggle('on', acgOn);
      acgTog.addEventListener('click', () => {
        acgTog.classList.toggle('on');
        localStorage.setItem('strato-auto-cloak-game', acgTog.classList.contains('on'));
      });
    }

    // Panic URL input
    const panicInput = document.getElementById('setting-panic-url');
    if (panicInput) {
      panicInput.value = localStorage.getItem('strato_panic') || 'https://classroom.google.com';
      panicInput.addEventListener('change', e => localStorage.setItem('strato_panic', e.target.value));
    }
  }

  // ── History poisoning ────────────────────────────────────────────
  function injectHistoryNoise() {
    const decoys = ['https://classroom.google.com', 'https://drive.google.com', 'https://docs.google.com'];
    decoys.forEach(url => history.pushState(null, '', location.pathname));
  }

  // ── Boot ─────────────────────────────────────────────────────────
  function init() {
    initVisibilityCloak();
    initShortcuts();
    initIdleDetection();
    // Wire settings after DOM is ready
    if (document.readyState !== 'loading') {
      wireSettings();
    } else {
      document.addEventListener('DOMContentLoaded', wireSettings);
    }

    // Restore stealth mode on page load
    if (stealthMode !== 'off') applyStealthTheme(stealthMode);

    console.log('[Stealth] Module loaded');
  }

  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
