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
      const engine = localStorage.getItem('strato-proxy') || CONFIG.PROXY_ENGINE;
      const wispUrl = `wss://${location.host}/wisp/`;

      if (typeof BareMux !== 'undefined') {
        const connection = new BareMux.BareMuxConnection('/frog/baremux/worker.js');
        
        // Use Epoxy transport for maximum compatibility and performance
        await connection.setTransport('/surf/epoxy/index.mjs', [{ wisp: wispUrl }]);
        
        proxyService = connection;
        proxyReady = true;

        if (label) label.textContent = engine === 'uv' ? 'UV' : 'SJ';
        if (pill) pill.classList.remove('warn');
        console.log(`[STRATO] Proxy initialized with ${engine.toUpperCase()} engine and Epoxy transport`);
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
        return __uv$config.prefix + __uv$config.encodeUrl(url);
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
      if (!win) {
        // Fallback to regular window if blocked
        window.open(proxiedUrl, '_blank');
        return;
      }
      
      const doc = win.document;
      doc.title = realUrl || 'STRATO';
      
      const iframe = doc.createElement('iframe');
      iframe.src = proxiedUrl;
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.border = 'none';
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.setAttribute('allow', 'fullscreen');
      
      doc.body.style.margin = '0';
      doc.body.style.padding = '0';
      doc.body.style.overflow = 'hidden';
      doc.body.appendChild(iframe);
    } catch (e) {
      console.warn('[STRATO] About:blank fallback:', e);
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
          const id = 'media-' + (title || url).toLowerCase().replace(/[^a-z0-9]/g, '-');
          StratoGameEngine.open({ id, name: title || url, url, category: 'Media' });
        }
      });
    });

    // Listen cards
    $$('#listen-grid .media-card').forEach((card) => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        const title = card.dataset.title;
        if (url) {
          const id = 'media-' + (title || url).toLowerCase().replace(/[^a-z0-9]/g, '-');
          StratoGameEngine.open({ id, name: title || url, url, category: 'Music' });
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
            // Enhanced safety check — strictly allow arithmetic only
            const sanitized = expression.replace(/\s+/g, '');
            if (/^[\d+\-*/.%()]+$/.test(sanitized)) {
              // Using a slightly safer eval wrapper with restricted context
              const result = new Function(`"use strict"; return (${sanitized})`)();
              if (typeof result === 'number' && isFinite(result)) {
                display.value = parseFloat(result.toFixed(10));
                expression = String(display.value);
                lastResult = true;
              } else {
                throw new Error('Invalid');
              }
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
      if (/[\d+\-*/.%()]/.test(key)) {
        expression += key;
        display.value = expression;
      } else if (key === 'Enter') {
        e.preventDefault();
        // Manually trigger the '=' logic
        const equalsBtn = document.querySelector('.calc-btn[data-calc="="]');
        if (equalsBtn) equalsBtn.click();
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

    // Toggles
    initToggle('setting-math-decoy', 'strato-math-decoy', false);
    initToggle('setting-cache', 'strato-cache', true);

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







  // ── Theme System ──────────────────────────────────────
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const root = document.documentElement;
    switch (theme) {
      case 'midnight':
        root.style.setProperty('--bg-main', '#0a0a0f');
        root.style.setProperty('--accent', '#00e5ff');
        root.style.setProperty('--accent-glow', 'rgba(0, 229, 255, 0.4)');
        break;
      case 'sky':
        root.style.setProperty('--bg-main', '#0f172a');
        root.style.setProperty('--accent', '#38bdf8');
        root.style.setProperty('--accent-glow', 'rgba(56, 189, 248, 0.4)');
        break;
      case 'terminal':
        root.style.setProperty('--bg-main', '#050805');
        root.style.setProperty('--accent', '#10b981');
        root.style.setProperty('--accent-glow', 'rgba(16, 185, 129, 0.4)');
        break;
      case 'light':
        root.style.setProperty('--bg-main', '#f8fafc');
        root.style.setProperty('--accent', '#0ea5e9');
        root.style.setProperty('--accent-glow', 'rgba(14, 165, 233, 0.2)');
        root.style.setProperty('--text-main', '#0f172a');
        root.style.setProperty('--text-dim', '#475569');
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

      if (delta > 18) { // Target 55+ FPS
        slowFramesCount++;
      } else {
        slowFramesCount = 0;
      }

      if (slowFramesCount >= 3 && !document.body.classList.contains('eco-mode')) {
        document.body.classList.add('eco-mode');
        console.log('[STRATO] Turbo Mode: Eco Active');
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

    const steps = [50, 100];
    let step = 0;
    const interval = setInterval(() => {
      if (step < steps.length) {
        progress.style.width = steps[step] + "%";
        step++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          splash.classList.add("hidden");
          app.classList.add("visible");
          setTimeout(() => { splash.style.display = "none"; }, 200);
        }, 50);
      }
    }, 50);
  }
  function initParticles() { 
    // Stubbed for performance
    return; 
  }

  // ── Boot Sequence ─────────────────────────────────────
  async function boot() {
    console.log(`%c STRATO v${CONFIG.VERSION} %c Technozen UI `, 'background:#06b6d4;color:#000;font-weight:bold;padding:4px 8px;border-radius:4px 0 0 4px', 'background:#8b5cf6;color:#fff;padding:4px 8px;border-radius:0 4px 4px 0');

    // 0. Register Service Worker (Critical for proxy)
    try {
      if (typeof registerSW === 'function') {
        await registerSW();
        console.log('[STRATO] Service Worker registered');
      }
    } catch (err) {
      console.warn('[STRATO] Service Worker initialization error:', err);
    }

    // Give a small delay for SW to activate
    await new Promise(r => setTimeout(r, 100));

    // 1. Apply saved theme
    const savedTheme = localStorage.getItem('strato-theme') || 'midnight';
    applyTheme(savedTheme);



    // 4. Initialize proxy
    await initProxy();

    // 5. Wire all UI systems
    initNav();
    initTheaterControls();
    initBrowser();
    initMediaCards();
    initTools();
    initSettings();
    initFPS();

    // 6. Initialize command palette
    CommandPalette.init();

    // 7. Start game engine
    StratoGameEngine.init();

    // 8. Ignition sequence
    igniteStratosphere();


  }

  // ── Initialize on DOM ready ───────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
