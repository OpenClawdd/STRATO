/**
 * STRATO App Controller v5.0 (Wii-Stealth Edition)
 */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────
  let currentView = 'home';
  let fpsFrames = 0;
  let fpsLast = performance.now();
  let isPanicked = false;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── about:blank Cloaking ─────────────────────────────
  function cloak() {
    try {
      const url = window.location.href;
      const win = window.open('about:blank', '_blank');
      if (!win) {
        alert('Popup blocked! Please allow popups for STRATO to enable Stealth Mode.');
        return;
      }
      const doc = win.document;
      const iframe = doc.createElement('iframe');
      
      doc.title = 'Google Drive'; // Default cloak title
      iframe.src = url;
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.border = 'none';
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      
      doc.body.style.margin = '0';
      doc.body.style.padding = '0';
      doc.body.style.overflow = 'hidden';
      doc.body.appendChild(iframe);

      // Close the original tab
      window.close();
      // If window.close() is blocked, just show the app normally
      initApp();
    } catch (e) {
      console.warn('Cloaking failed:', e);
      initApp();
    }
  }

  // ── Panic System ──────────────────────────────────────
  const PANIC_KEY = '`'; // Tilde key (without shift)
  const DECOY_HTML = `
    <div style="font-family: 'Roboto', Arial, sans-serif; background: #fff; color: #3c4043; height: 100vh; width: 100vw; display: flex; flex-direction: column; overflow: hidden;">
      <header style="height: 64px; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; padding: 0 16px; justify-content: space-between; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button style="padding: 12px; border-radius: 50%; hover: background: #f1f3f4;">
            <svg width="24" height="24" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </button>
          <img src="https://www.gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24dp.svg" height="24" />
          <span style="font-size: 22px; color: #5f6368; padding-left: 4px;">Classroom</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button style="padding: 12px; border-radius: 50%;"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg></button>
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #1a73e8; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 500; font-size: 14px;">S</div>
        </div>
      </header>
      <nav style="height: 48px; border-bottom: 1px solid #e0e0e0; display: flex; padding: 0 64px; gap: 32px;">
        <div style="height: 100%; display: flex; align-items: center; color: #1a73e8; border-bottom: 3px solid #1a73e8; font-weight: 500; font-size: 14px; cursor: pointer;">To-do</div>
        <div style="height: 100%; display: flex; align-items: center; color: #5f6368; font-weight: 500; font-size: 14px; cursor: pointer;">Calendar</div>
      </nav>
      <main style="flex: 1; padding: 24px; background: #f8f9fa; overflow-y: auto;">
        <div style="max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
          ${[
            { name: "AP Computer Science A", teacher: "Mr. Henderson", color: "#1a73e8" },
            { name: "Physics Honors — Period 4", teacher: "Dr. Aris", color: "#1e8e3e" },
            { name: "English 101: Creative Writing", teacher: "Ms. Vance", color: "#d93025" },
            { name: "World History — Section B", teacher: "Coach Miller", color: "#f29900" },
          ].map(c => `
            <div style="background: #fff; border: 1px solid #dadce0; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; height: 280px;">
              <div style="background: ${c.color}; padding: 16px; height: 100px; color: #fff; position: relative;">
                <h3 style="margin: 0; font-size: 22px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.name}</h3>
                <p style="margin: 4px 0 0; font-size: 14px;">${c.teacher}</p>
                <div style="position: absolute; bottom: -30px; right: 16px; width: 60px; height: 60px; border-radius: 50%; background: #eee; border: 2px solid #fff;"></div>
              </div>
              <div style="flex: 1;"></div>
              <div style="height: 56px; border-top: 1px solid #e0e0e0; display: flex; justify-content: flex-end; padding: 0 12px; align-items: center; gap: 8px;">
                <button style="padding: 8px;"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg></button>
                <button style="padding: 8px;"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg></button>
              </div>
            </div>
          `).join('')}
        </div>
      </main>
    </div>
  `;

  function panic() {
    if (isPanicked) return;
    isPanicked = true;
    
    // Completely replace the DOM
    document.body.innerHTML = DECOY_HTML;
    document.title = 'Google Classroom';
    
    // Block any further script execution by throwing an error or clearing intervals
    window.location.hash = '#panicked';
    // Remove background image/gradients
    document.body.style.backgroundImage = 'none';
    document.body.style.background = '#f8f9fa';
  }

  // ── Core App Logic ────────────────────────────────────
  function initApp() {
    $('#app').classList.add('visible');
    $('#splash').style.opacity = '0';
    setTimeout(() => $('#splash').style.display = 'none', 500);
    
    // Start systems
    initSearch();
    initBrowser();
    initSettings();
    initFPS();
    
    if (window.StratoGameEngine) {
      StratoGameEngine.init();
      renderRecentlyPlayed();
      document.addEventListener('strato:recent_updated', renderRecentlyPlayed);
    }
  }

  function initSearch() {
    const search = $('#global-search');
    if (search) {
      search.oninput = (e) => {
        const query = e.target.value.trim();
        if (query.length > 0 && currentView !== 'arcade') switchView('arcade');
        document.dispatchEvent(new CustomEvent('strato:search', { detail: query }));
      };
    }
  }

  function switchView(viewName) {
    currentView = viewName;
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#view-${viewName}`)?.classList.add('active');
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === viewName));
    if ($('#main')) $('#main').scrollTop = 0;
  }

  function renderRecentlyPlayed() {
    const recent = StratoGameEngine.getRecent();
    const section = $('#section-recent');
    const grid = $('#recent-grid');
    if (!section || !grid) return;
    if (recent.length === 0) { section.style.display = 'none'; return; }

    section.style.display = 'block';
    grid.innerHTML = '';
    recent.forEach(game => {
      const tile = document.createElement('div');
      tile.className = 'game-tile';
      tile.innerHTML = `<img src="${game.img || ''}" loading="lazy" /><div class="tile-overlay"><div class="tile-title">${game.name}</div></div>`;
      tile.onclick = () => StratoGameEngine.open(game);
      grid.appendChild(tile);
    });
  }

  function initBrowser() {
    const input = $('#browser-input');
    const go = $('#browser-go');
    const iframe = $('#browser-iframe');
    if (!input || !iframe) return;

    function navigate() {
      let url = input.value.trim();
      if (!url) return;
      if (!url.startsWith('http')) url = url.includes('.') ? 'https://' + url : 'https://www.google.com/search?q=' + encodeURIComponent(url);
      iframe.src = window.proxifyUrl(url);
    }
    go.onclick = navigate;
    input.onkeydown = (e) => { if (e.key === 'Enter') navigate(); };
  }

  function initSettings() {
    const lowPerf = $('#setting-low-perf');
    if (lowPerf) {
      const active = localStorage.getItem('strato-low-perf') === 'true';
      lowPerf.classList.toggle('on', active);
      if (active) document.body.classList.add('low-perf-mode');
      lowPerf.onclick = () => {
        const isOn = lowPerf.classList.toggle('on');
        localStorage.setItem('strato-low-perf', isOn);
        document.body.classList.toggle('low-perf-mode', isOn);
      };
    }
  }

  function initFPS() {
    const el = $('#fps-counter');
    function tick(now) {
      fpsFrames++;
      if (now - fpsLast >= 1000) {
        if (el) el.textContent = Math.round(fpsFrames * 1000 / (now - fpsLast)) + ' FPS';
        fpsFrames = 0;
        fpsLast = now;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ── Boot sequence ─────────────────────────────────────
  async function boot() {
    // Register Service Workers
    if ('serviceWorker' in navigator) {
      const sws = [
        { script: '/sw.js', scope: '/' },
        { script: '/frog/sw.js', scope: '/frog/service/' },
        { script: '/scramjet.sw.js', scope: '/surf/service/' }
      ];
      for (const sw of sws) {
        navigator.serviceWorker.register(sw.script, { scope: sw.scope, updateViaCache: 'none' }).catch(e => {});
      }
    }

    const progress = $('#splash-progress');
    const launchBtn = $('#launch-btn');
    
    // Simulate loading progress
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 10;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        // Show launch button instead of auto-running
        if (progress) progress.style.width = '100%';
        if (launchBtn) launchBtn.style.display = 'block';
      } else {
        if (progress) progress.style.width = p + '%';
      }
    }, 50);

    // Manual Launch Trigger
    if (launchBtn) {
      launchBtn.onclick = () => {
        // Only cloak if not already in about:blank (or if forced)
        if (window.location.protocol === 'about:' || window.top !== window.self) {
          initApp();
        } else {
          cloak();
        }
      };
    }

    // Global Panic Listener
    document.addEventListener('keydown', (e) => {
      if (e.key === PANIC_KEY) {
        e.preventDefault();
        panic();
      }
    });

    // Nav wiring
    $$('.nav-item').forEach(item => item.onclick = () => switchView(item.dataset.view));
    $$('.quick-tile').forEach(tile => tile.onclick = () => switchView(tile.dataset.view));
    $('#theater-close').onclick = () => $('#game-overlay').classList.remove('active');
  }

  // Proxify helper
  window.proxifyUrl = window.proxifyUrl || ((url) => {
    const engine = localStorage.getItem('strato-proxy') || 'uv';
    if (engine === 'uv' && window.__uv$config) return __uv$config.prefix + __uv$config.encodeUrl(url);
    return url;
  });

  boot();
})();
