/**
 * STRATO App Controller v3.0
 * ============================
 * Main application brain — wires all systems together:
 *   • View switching & navigation
 *   • Proxy initialization (Ultraviolet + Scramjet)
 *   • Theater Mode controls
 *   • FPS monitoring
 *   • Browser, AI, Media, Settings
 *   • Panic, Cloak, Stealth integration
 *   • Splash screen & ignition sequence
 */

(function () {
  'use strict';

  // ── Configuration ─────────────────────────────────────
  const CONFIG = {
    VERSION: '3.0.0',
    PROXY_ENGINE: 'uv',
    PANIC_URL: 'https://classroom.google.com',
    DEBOUNCE_MS: 60,
  };

  // ── State ─────────────────────────────────────────────
  let currentView = 'home';
  let proxyService = null;
  let wispRelay = null;
  let fpsFrames = 0;
  let fpsLast = performance.now();
  let sidebarExpanded = false;
  let proxyReady = false;

  // ── DOM Helpers ───────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Proxy System ──────────────────────────────────────

  /**
   * Initialize the BareMux connection to Ultraviolet or Scramjet.
   * Exposes a global `proxifyUrl(url)` function for use by game engine.
   */
  async function initProxy() {
    const pill = $('#proxy-pill');
    const label = $('#proxy-label');

    try {
      // WISP relay
      if (typeof WispServerURL === 'function') {
        wispRelay = new WispServerURL();
      }

      // BareMux setup
      if (typeof BareMux !== 'undefined' && BareMux.createConnection) {
        proxyService = BareMux.createConnection('/baremux/index.html');

        const engine = localStorage.getItem('strato-proxy') || CONFIG.PROXY_ENGINE;

        if (engine === 'uv') {
          await proxyService.setRemote({
            wisp: wispRelay?.get() || `wss://${location.host}/wisp/`,
            csp: `self https://${location.host}`,
          });
        } else {
          await proxyService.setRemote('/scramjet/codecs.js');
        }

        if (label) label.textContent = engine === 'uv' ? 'UV' : 'SJ';
        if (pill) pill.classList.remove('warn');
        proxyReady = true;
      }
    } catch (err) {
      console.warn('[STRATO] Proxy init failed:', err);
      if (label) label.textContent = 'Offline';
      if (pill) pill.classList.add('warn');
    }
  }

  /** Proxify a URL using the current proxy engine */
  function proxifyUrl(url) {
    if (!url) return '';

    // Already proxied?
    if (url.startsWith(location.origin) || url.startsWith('blob:')) return url;

    // Relative URLs
    if (url.startsWith('/')) return url;

    // Absolute URL — encode through proxy
    const engine = localStorage.getItem('strato-proxy') || CONFIG.PROXY_ENGINE;

    try {
      if (engine === 'uv' && typeof __uv$config !== 'undefined') {
        return __uv$config.prefix + __uv$encoding.encode(url);
      } else if (engine === 'scramjet' && typeof __scramjet$config !== 'undefined') {
        return __scramjet$config.prefix + __scramjet$config.codec.encode(url);
      }
    } catch (err) {
      console.warn('[STRATO] Proxify error:', err);
    }

    return url; // Fallback: return as-is
  }

  // Expose globally for game engine and other modules
  window.proxifyUrl = proxifyUrl;

  // ── View Switching ────────────────────────────────────
  function switchView(viewName) {
    currentView = viewName;

    // Update views
    $$('.view').forEach((v) => v.classList.remove('active'));
    const target = $(`#view-${viewName}`);
    if (target) target.classList.add('active');

    // Update sidebar
    $$('.nav-item[data-view]').forEach((n) => {
      n.classList.toggle('active', n.dataset.view === viewName);
    });

    // Scroll main to top
    const main = $('#main');
    if (main) main.scrollTop = 0;

    // Update tab title for stealth
    if (typeof updateStealthTabTitle === 'function') {
      updateStealthTabTitle(viewName);
    }

    // Close mobile sidebar
    const sidebar = $('#sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');
  }
  window.switchView = switchView;

  // ── Navigation Wiring ─────────────────────────────────
  function initNav() {
    // Sidebar nav items
    $$('.nav-item[data-view]').forEach((item) => {
      item.addEventListener('click', () => switchView(item.dataset.view));
    });

    // Quick cards on home
    $$('.quick-card[data-action="view"]').forEach((card) => {
      card.addEventListener('click', () => switchView(card.dataset.target));
    });

    // Sidebar toggle
    const sidebarToggle = $('#sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Mobile menu
    const mobileBtn = $('#mobile-menu-btn');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        const sidebar = $('#sidebar');
        if (sidebar) sidebar.classList.toggle('mobile-open');
      });
    }
  }

  function toggleSidebar() {
    const sidebar = $('#sidebar');
    if (sidebar) {
      sidebarExpanded = !sidebarExpanded;
      sidebar.classList.toggle('expanded', sidebarExpanded);
    }
  }
  window.toggleSidebar = toggleSidebar;

  // ── Theater Mode Controls ─────────────────────────────
  function initTheaterControls() {
    const back = $('#theater-back');
    const close = $('#theater-close');
    const fullscreen = $('#theater-fullscreen');
    const refresh = $('#theater-refresh');
    const adStrip = $('#theater-ad-strip');

    if (back) back.addEventListener('click', () => StratoGameEngine.close());
    if (close) close.addEventListener('click', () => StratoGameEngine.close());
    if (fullscreen) fullscreen.addEventListener('click', () => {
      const overlay = $('#game-overlay');
      if (overlay) StratoGameEngine.tryFullscreen(overlay);
    });
    if (refresh) refresh.addEventListener('click', () => StratoGameEngine.refresh());
    if (adStrip) adStrip.addEventListener('click', () => {
      StratoGameEngine.stripAds();
      showToast('Ad-stripping attempted');
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('#game-overlay')?.classList.contains('active')) {
        StratoGameEngine.close();
      }
    });
  }

  // ── Browser View ──────────────────────────────────────
  function initBrowser() {
    const urlInput = $('#browser-url');
    const goBtn = $('#browser-go');
    const iframe = $('#browser-iframe');
    const newTab = $('#browser-new-tab');
    const engineSelect = $('#proxy-engine');

    if (!urlInput || !iframe) return;

    function navigate() {
      let url = urlInput.value.trim();
      if (!url) return;

      // Auto-add protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes(' ')) {
          url = 'https://' + url;
        } else {
          url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
        }
      }

      iframe.src = proxifyUrl(url);
    }

    if (goBtn) goBtn.addEventListener('click', navigate);
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') navigate();
    });

    if (newTab) {
      newTab.addEventListener('click', () => {
        let url = urlInput.value.trim();
        if (url) {
          if (!url.startsWith('http')) url = 'https://' + url;
          openAboutBlank(proxifyUrl(url), url);
        }
      });
    }

    if (engineSelect) {
      engineSelect.value = localStorage.getItem('strato-proxy') || CONFIG.PROXY_ENGINE;
      engineSelect.addEventListener('change', (e) => {
        localStorage.setItem('strato-proxy', e.target.value);
      });
    }
  }

  // ── About:Blank Cloaking ─────────────────────────────
  // Opens proxied URLs in about:blank tabs so the address bar shows
  // "about:blank" instead of the STRATO URL — matching Rammerhead/TitaniumNetwork.
  function openAboutBlank(proxiedUrl, realUrl) {
    try {
      const win = window.open('about:blank', '_blank');
      if (!win) return;
      const doc = win.document;
      doc.open();
      doc.write(
        '<!DOCTYPE html>' +
        '<html><head>' +
        '<title>' + (realUrl || 'STRATO') + '</title>' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<style>*{margin:0;padding:0}html,body{width:100%;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:none}</style>' +
        '</head><body>' +
        '<iframe src="' + proxiedUrl + '" allow-scripts allow-same-origin allow-forms allow-popups></iframe>' +
        '</body></html>'
      );
      doc.close();
    } catch (e) {
      // Popup blocked — fallback to regular navigation
      window.open(proxiedUrl, '_blank');
    }
  }
  window.openAboutBlank = openAboutBlank;

  // ── Media Cards ───────────────────────────────────────
  function initMediaCards() {
    // Watch cards
    $$('#watch-grid .media-card').forEach((card) => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        const title = card.dataset.title;
        if (url) {
          StratoGameEngine.open({ name: title || url, url, category: 'Media' });
        }
      });
    });

    // Listen cards
    $$('#listen-grid .media-card').forEach((card) => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        const title = card.dataset.title;
        if (url) {
          StratoGameEngine.open({ name: title || url, url, category: 'Music' });
        }
      });
    });
  }

  // ── Utility Tools (replaces fake AI decoy) ──────────────
  function initTools() {
    // Tab switching
    $$('#view-ai .category-pill[data-tool]').forEach((pill) => {
      pill.addEventListener('click', () => {
        $$('#view-ai .category-pill[data-tool]').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        $$('.tool-panel').forEach((p) => p.style.display = 'none');
        const target = $(`#tool-${pill.dataset.tool}`);
        if (target) target.style.display = 'block';
      });
    });

    initCalculator();
    initTimer();
    initNotes();
    initConverter();
  }

  // ── Calculator ─────────────────────────────────────────
  function initCalculator() {
    const display = $('#calc-display');
    if (!display) return;
    let expression = '';
    let lastResult = false;

    $$('.calc-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.calc;

        if (val === 'clear') {
          expression = '';
          display.value = '0';
          lastResult = false;
          return;
        }
        if (val === 'backspace') {
          expression = expression.slice(0, -1);
          display.value = expression || '0';
          return;
        }
        if (val === '=') {
          try {
            // Safe eval — only allow numbers and basic operators
            if (/^[\d\s+\-*/.%()]+$/.test(expression)) {
              const result = Function('"use strict"; return (' + expression + ')')();
              display.value = parseFloat(result.toFixed(10));
              expression = String(display.value);
              lastResult = true;
            }
          } catch {
            display.value = 'Error';
            expression = '';
          }
          return;
        }

        // If last result was shown and user types a number, start fresh
        if (lastResult && /^[\d.]$/.test(val)) {
          expression = '';
          lastResult = false;
        } else {
          lastResult = false;
        }

        expression += val;
        display.value = expression;
      });
    });

    // Keyboard support
    $('#view-ai')?.addEventListener('keydown', (e) => {
      if ($('#tool-calculator')?.style.display !== 'block') return;
      const key = e.key;
      if (/[\d+\-*/.%]/.test(key)) {
        expression += key;
        display.value = expression;
      } else if (key === 'Enter') {
        btn?.click();
      } else if (key === 'Backspace') {
        expression = expression.slice(0, -1);
        display.value = expression || '0';
      } else if (key === 'Escape') {
        expression = '';
        display.value = '0';
      }
    });
  }

  // ── Timer / Stopwatch ──────────────────────────────────
  function initTimer() {
    const display = $('#timer-display');
    const startBtn = $('#timer-start');
    const pauseBtn = $('#timer-pause');
    const resetBtn = $('#timer-reset');
    const lapBtn = $('#timer-lap');
    const lapsDiv = $('#timer-laps');
    if (!display) return;

    let elapsed = 0;
    let running = false;
    let interval = null;
    let laps = [];

    function formatTime(ms) {
      const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
      const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
      return `${h}:${m}:${s}`;
    }

    function tick() {
      elapsed += 10;
      display.textContent = formatTime(elapsed);
    }

    if (startBtn) startBtn.addEventListener('click', () => {
      if (!running) {
        running = true;
        interval = setInterval(tick, 10);
      }
    });
    if (pauseBtn) pauseBtn.addEventListener('click', () => {
      running = false;
      clearInterval(interval);
    });
    if (resetBtn) resetBtn.addEventListener('click', () => {
      running = false;
      clearInterval(interval);
      elapsed = 0;
      laps = [];
      display.textContent = '00:00:00';
      if (lapsDiv) lapsDiv.innerHTML = '';
    });
    if (lapBtn) lapBtn.addEventListener('click', () => {
      if (running) {
        laps.push(elapsed);
        if (lapsDiv) {
          const lapEl = document.createElement('div');
          lapEl.className = 'py-1 border-b border-glass-border';
          lapEl.textContent = `Lap ${laps.length}: ${formatTime(elapsed)}`;
          lapsDiv.prepend(lapEl);
        }
      }
    });
  }

  // ── Notes (auto-save to localStorage) ──────────────────
  function initNotes() {
    const editor = $('#notes-editor');
    const status = $('#notes-status');
    const clearBtn = $('#notes-clear');
    if (!editor) return;

    // Load saved notes
    const saved = localStorage.getItem('strato-notes') || '';
    editor.value = saved;

    let saveTimer = null;
    editor.addEventListener('input', () => {
      if (status) status.textContent = 'Saving...';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try { localStorage.setItem('strato-notes', editor.value); } catch {}
        if (status) status.textContent = 'Auto-saved';
      }, 500);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        editor.value = '';
        try { localStorage.setItem('strato-notes', ''); } catch {}
        if (status) status.textContent = 'Cleared';
      });
    }
  }

  // ── Unit Converter ─────────────────────────────────────
  function initConverter() {
    const fromSel = $('#conv-from');
    const toSel = $('#conv-to');
    const input = $('#conv-input');
    const result = $('#conv-result');
    if (!input || !result) return;

    // Conversion factors to base units (meters, kg, or Celsius)
    const LENGTH = { m: 1, km: 1000, mi: 1609.344, ft: 0.3048, in: 0.0254, cm: 0.01 };
    const MASS = { kg: 1, lb: 0.453592, oz: 0.0283495 };

    function convert() {
      const val = parseFloat(input.value);
      if (isNaN(val)) { result.textContent = '—'; return; }

      const from = fromSel.value;
      const to = toSel.value;

      // Temperature special case
      if (from === 'c' || from === 'f' || to === 'c' || to === 'f') {
        let celsius;
        if (from === 'c') celsius = val;
        else if (from === 'f') celsius = (val - 32) * 5 / 9;
        else celsius = val; // fallback

        let output;
        if (to === 'c') output = celsius;
        else if (to === 'f') output = celsius * 9 / 5 + 32;
        else output = celsius;

        result.textContent = parseFloat(output.toFixed(4));
        return;
      }

      // Length
      if (LENGTH[from] !== undefined && LENGTH[to] !== undefined) {
        const meters = val * LENGTH[from];
        result.textContent = parseFloat((meters / LENGTH[to]).toFixed(6));
        return;
      }

      // Mass
      if (MASS[from] !== undefined && MASS[to] !== undefined) {
        const kgs = val * MASS[from];
        result.textContent = parseFloat((kgs / MASS[to]).toFixed(6));
        return;
      }

      result.textContent = 'Incompatible units';
    }

    input.addEventListener('input', convert);
    if (fromSel) fromSel.addEventListener('change', convert);
    if (toSel) toSel.addEventListener('change', convert);
  }

  // ── Settings ──────────────────────────────────────────
  function initSettings() {
    // Theme
    const themeSelect = $('#setting-theme');
    if (themeSelect) {
      themeSelect.value = localStorage.getItem('strato-theme') || 'midnight';
      themeSelect.addEventListener('change', (e) => {
        localStorage.setItem('strato-theme', e.target.value);
        applyTheme(e.target.value);
      });
    }

    // Proxy
    const proxySelect = $('#setting-proxy');
    if (proxySelect) {
      proxySelect.value = localStorage.getItem('strato-proxy') || 'uv';
      proxySelect.addEventListener('change', (e) => {
        localStorage.setItem('strato-proxy', e.target.value);
        // Also update browser view select
        const browserEngine = $('#proxy-engine');
        if (browserEngine) browserEngine.value = e.target.value;
      });
    }

    // Panic URL
    const panicUrl = $('#setting-panic-url');
    if (panicUrl) {
      panicUrl.value = localStorage.getItem('strato-panic-url') || CONFIG.PANIC_URL;
      panicUrl.addEventListener('change', (e) => {
        localStorage.setItem('strato-panic-url', e.target.value);
      });
    }

    // Tab Cloak
    const cloakSelect = $('#setting-cloak');
    if (cloakSelect) {
      cloakSelect.value = localStorage.getItem('strato-cloak') || 'default';
      cloakSelect.addEventListener('change', (e) => {
        localStorage.setItem('strato-cloak', e.target.value);
        applyCloak(e.target.value);
      });
    }

    // Stealth
    const stealthSelect = $('#setting-stealth');
    if (stealthSelect) {
      stealthSelect.value = localStorage.getItem('strato-stealth') || 'off';
      stealthSelect.addEventListener('change', (e) => {
        localStorage.setItem('strato-stealth', e.target.value);
        if (typeof applyStealthMode === 'function') {
          applyStealthMode(e.target.value);
        }
      });
    }

    // Toggles
    initToggle('setting-math-decoy', 'strato-math-decoy', false);
    initToggle('setting-cache', 'strato-cache', true);
    initToggle('setting-auto-cloak', 'strato-auto-cloak', true);

    // Clear cache
    const clearCache = $('#settings-clear-cache');
    if (clearCache) {
      clearCache.addEventListener('click', () => {
        if (typeof StratoGameEngine !== 'undefined') {
          StratoGameEngine.vault.clear();
          showToast('StratoVault cache cleared');
        }
      });
    }

    // Save all
    const saveAll = $('#settings-save-all');
    if (saveAll) {
      saveAll.addEventListener('click', () => showToast('All settings saved'));
    }
  }

  function initToggle(elementId, storageKey, defaultValue) {
    const el = $(`#${elementId}`);
    if (!el) return;

    const stored = localStorage.getItem(storageKey);
    const isOn = stored !== null ? stored === 'true' : defaultValue;
    el.classList.toggle('on', isOn);

    el.addEventListener('click', () => {
      el.classList.toggle('on');
      localStorage.setItem(storageKey, el.classList.contains('on'));
    });
  }

  // ── Panic ─────────────────────────────────────────────
  function initPanic() {
    const btn = $('#panic-btn');
    if (btn) {
      btn.addEventListener('click', panic);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (active?.tagName !== 'INPUT' && active?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          panic();
        }
      }
      if (e.key === '~') {
        const active = document.activeElement;
        if (active?.tagName !== 'INPUT' && active?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          panic();
        }
      }
    });
  }

  function panic() {
    const url = localStorage.getItem('strato-panic-url') || CONFIG.PANIC_URL;
    window.location.href = url;
  }
  window.panic = panic;

  // ── Cloak Engine ──────────────────────────────────────
  function applyCloak(preset) {
    const favicon = $('link[rel="icon"]');
    const faviconApple = $('link[rel="apple-touch-icon"]');

    switch (preset) {
      case 'drive':
        document.title = 'My Drive - Google Drive';
        if (favicon) favicon.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 87.3 78"><path fill="%234285F4" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"/><path fill="%230F9D58" d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"/><path fill="%23F4B400" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.4 13.8z"/><path fill="%23DB4437" d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"/><path fill="%230F9D58" d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"/></svg>';
        break;
      case 'classroom':
        document.title = 'Home - Google Classroom';
        if (favicon) favicon.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><path fill="%23F9AB00" d="M96 28 30 64v64l66 36 66-36V64z"/><text x="96" y="115" text-anchor="middle" fill="white" font-size="48" font-weight="bold">C</text></svg>';
        break;
      default:
        // Keep the disguised Google Drive title — don't reveal STRATO
        document.title = document.title || 'My Drive - Google Drive';
        if (favicon) favicon.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 87.3 78'><path fill='%234285F4' d='m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z'/><path fill='%230F9D58' d='m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z'/><path fill='%23F4B400' d='m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.4 13.8z'/><path fill='%23DB4437' d='m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z'/><path fill='%230F9D58' d='m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z'/></svg>";
    }
  }

  // Visibility change — auto-cloak when teacher walks by
  function initVisibilityCloak() {
    document.addEventListener('visibilitychange', () => {
      const autoCloak = localStorage.getItem('strato-auto-cloak') !== 'false';
      if (autoCloak && document.hidden) {
        const preset = localStorage.getItem('strato-stealth') || 'default';
        if (preset !== 'off') {
          applyCloak(preset);
        } else {
          // Show decoy title
          document.title = 'Google Classroom';
        }
      } else if (!document.hidden) {
        const preset = localStorage.getItem('strato-cloak') || 'default';
        applyCloak(preset);
      }
    });
  }

  // ── Theme System ──────────────────────────────────────
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    switch (theme) {
      case 'midnight':
        document.documentElement.style.setProperty('--bg-primary', '#0a0a0f');
        document.documentElement.style.setProperty('--bg-secondary', '#0d0d14');
        document.documentElement.style.setProperty('--accent', '#06b6d4');
        break;
      case 'sky':
        document.documentElement.style.setProperty('--bg-primary', '#0f172a');
        document.documentElement.style.setProperty('--bg-secondary', '#1e293b');
        document.documentElement.style.setProperty('--accent', '#38bdf8');
        break;
      case 'terminal':
        document.documentElement.style.setProperty('--bg-primary', '#0a0a0a');
        document.documentElement.style.setProperty('--bg-secondary', '#141414');
        document.documentElement.style.setProperty('--accent', '#10b981');
        break;
      case 'light':
        document.documentElement.style.setProperty('--bg-primary', '#f8fafc');
        document.documentElement.style.setProperty('--bg-secondary', '#f1f5f9');
        document.documentElement.style.setProperty('--accent', '#0ea5e9');
        break;
    }
  }

  // ── FPS Vitals ────────────────────────────────────────
  function initFPS() {
    const pill = $('#fps-pill');
    let slowFramesCount = 0;
    let lastFrameTime = performance.now();

    function tick(now) {
      const delta = now - lastFrameTime;
      lastFrameTime = now;

      if (delta > 33) {
        slowFramesCount++;
      } else {
        slowFramesCount = 0;
      }

      if (slowFramesCount >= 5 && !document.body.classList.contains('eco-mode')) {
        document.body.classList.add('eco-mode');
      }

      if (pill) {
        fpsFrames++;
        if (now - fpsLast >= 1000) {
          const fps = Math.round(fpsFrames * 1000 / (now - fpsLast));
          pill.querySelector('.pill-label').textContent = fps;
          fpsFrames = 0;
          fpsLast = now;
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ── Splash & Ignition ─────────────────────────────────
  function igniteStratosphere() {
    const splash = $('#splash');
    const app = $('#app');
    const progress = $('#splash-progress');
    if (!splash || !app || !progress) {
      // No splash — show app immediately
      if (app) app.classList.add('visible');
      return;
    }

    const steps = [10, 25, 40, 55, 70, 85, 95, 100];
    let step = 0;

    const interval = setInterval(() => {
      if (step < steps.length) {
        progress.style.width = steps[step] + '%';
        step++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          splash.classList.add('hidden');
          app.classList.add('visible');
          setTimeout(() => { splash.style.display = 'none'; }, 600);
        }, 300);
      }
    }, 200);
  }

  // ── Stealth Button Wiring ─────────────────────────────
  function initStealthBtn() {
    const btn = $('#stealth-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (typeof cycleStealthMode === 'function') {
          cycleStealthMode();
        }
      });
    }

    // Ctrl+Shift+D shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        if (typeof cycleStealthMode === 'function') {
          cycleStealthMode();
        }
      }
    });
  }

  // ── Particles (lightweight ambient) ───────────────────
  function initParticles() {
    const canvas = document.createElement('canvas');
    canvas.id = 'particleCanvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0.4;';
    document.getElementById('ambient-canvas')?.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6,182,212,${p.opacity})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    draw();

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cancelAnimationFrame(animId);
    }
  }

  // ── Boot Sequence ─────────────────────────────────────
  async function boot() {
    console.log(`%c STRATO v${CONFIG.VERSION} %c Technozen UI `, 'background:#06b6d4;color:#000;font-weight:bold;padding:4px 8px;border-radius:4px 0 0 4px', 'background:#8b5cf6;color:#fff;padding:4px 8px;border-radius:0 4px 4px 0');

    // 1. Apply saved theme
    const savedTheme = localStorage.getItem('strato-theme') || 'midnight';
    applyTheme(savedTheme);

    // 2. Apply saved cloak
    const savedCloak = localStorage.getItem('strato-cloak') || 'default';
    applyCloak(savedCloak);

    // 3. Start particles
    initParticles();

    // 4. Initialize proxy
    await initProxy();

    // 5. Wire all UI systems
    initNav();
    initTheaterControls();
    initBrowser();
    initMediaCards();
    initTools();
    initSettings();
    initPanic();
    initStealthBtn();
    initFPS();
    initVisibilityCloak();

    // 6. Initialize command palette
    CommandPalette.init();

    // 7. Start game engine
    StratoGameEngine.init();

    // 8. Ignition sequence
    igniteStratosphere();

    // 9. Restore stealth mode if saved
    const savedStealth = localStorage.getItem('strato-stealth');
    if (savedStealth && savedStealth !== 'off' && typeof applyStealthMode === 'function') {
      setTimeout(() => applyStealthMode(savedStealth), 500);
    }
  }

  // ── Initialize on DOM ready ───────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
