/* ══════════════════════════════════════════════════════════
   STRATO v12 — CHROMATIC STORM ULTRA-MAXIMALIST
   Client Application
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ──────────────────────────────────────────
  // PARTICLE SYSTEM
  // ──────────────────────────────────────────
  const canvas = document.getElementById('particle-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 70;
    const COLORS = [
      'rgba(0,229,255,', 'rgba(168,85,247,',
      'rgba(244,114,182,', 'rgba(34,197,94,', 'rgba(251,146,60,',
    ];

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticle() {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.35 + 0.08,
        alphaDir: Math.random() > 0.5 ? 0.001 : -0.001,
        color: color,
      };
    }

    function initParticles() {
      resizeCanvas();
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle());
    }

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        p.alpha += p.alphaDir;
        if (p.alpha > 0.4) { p.alpha = 0.4; p.alphaDir = -0.001; }
        if (p.alpha < 0.04) { p.alpha = 0.04; p.alphaDir = 0.001; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (p.alpha * 0.15) + ')';
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,229,255,${(1 - dist / 110) * 0.06})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animateParticles);
    }

    window.addEventListener('resize', resizeCanvas);
    initParticles();
    animateParticles();
  }

  // ──────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────
  const startTime = Date.now();
  const state = {
    currentView: 'home',
    currentEngine: localStorage.getItem('strato-engine') || 'uv',
    autoFallback: localStorage.getItem('strato-autoFallback') !== 'false',
    panicKey: localStorage.getItem('strato-panicKey') || '`',
    activeCloak: localStorage.getItem('strato-cloak') || 'none',
    accentColor: localStorage.getItem('strato-accent') || 'cyan',
    particlesEnabled: localStorage.getItem('strato-particles') !== 'false',
    animationsEnabled: localStorage.getItem('strato-animations') !== 'false',
    games: [],
    filteredGames: [],
    aiMessages: [],
    aiOnline: false,
    proxyReady: false,
    unavailableGames: JSON.parse(localStorage.getItem('strato-unavailable') || '{}'),
    recentlyPlayed: JSON.parse(localStorage.getItem('strato-recent') || '[]'),
    changingPanicKey: false,
    gamesPlayed: parseInt(localStorage.getItem('strato-gamesPlayed') || '0'),
    pagesLoaded: parseInt(localStorage.getItem('strato-pagesLoaded') || '0'),
    aiMessagesSent: parseInt(localStorage.getItem('strato-aiMessagesSent') || '0'),
    achievements: JSON.parse(localStorage.getItem('strato-achievements') || '[]'),
    notifications: [],
    activityLog: JSON.parse(localStorage.getItem('strato-activity') || '[]'),
  };

  // Apply saved accent color
  document.documentElement.setAttribute('data-accent', state.accentColor);

  // ──────────────────────────────────────────
  // LIVE CLOCK
  // ──────────────────────────────────────────
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const el = document.getElementById('clock-text');
    if (el) el.textContent = `${h}:${m}:${s}`;
  }

  function updateUptime() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const text = `${mins}:${String(secs).padStart(2, '0')}`;
    const els = [document.getElementById('uptime-text'), document.getElementById('stat-uptime')];
    els.forEach(el => { if (el) el.textContent = text; });
  }

  setInterval(updateClock, 1000);
  setInterval(updateUptime, 1000);
  updateClock();
  updateUptime();

  // ──────────────────────────────────────────
  // TAB CLOAKS
  // ──────────────────────────────────────────
  const CLOAKS = {
    none:      { title: 'STRATO', favicon: '/favicon.ico' },
    classroom: { title: 'Classes', favicon: '/cloaks/classroom.ico' },
    quizlet:   { title: 'Your Sets | Quizlet', favicon: '/cloaks/quizlet.ico' },
    canvas:    { title: 'Dashboard', favicon: '/cloaks/canvas.ico' },
    clever:    { title: 'Clever | Portal', favicon: '/cloaks/clever.ico' },
    ixl:       { title: 'IXL | Math', favicon: '/cloaks/ixl.ico' },
  };

  function applyCloak(key) {
    const cloak = CLOAKS[key];
    if (!cloak) return;
    state.activeCloak = key;
    localStorage.setItem('strato-cloak', key);
    document.title = cloak.title;
    const existingIcon = document.querySelector('link[rel="icon"]');
    if (existingIcon) existingIcon.href = cloak.favicon;
    else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = cloak.favicon;
      document.head.appendChild(link);
    }
    if (key !== 'none') unlockAchievement('tab-cloak');
  }

  // ──────────────────────────────────────────
  // PANIC KEY
  // ──────────────────────────────────────────
  function handlePanicKey() {
    const cloakKey = state.activeCloak !== 'none' ? state.activeCloak : 'classroom';
    applyCloak(cloakKey);
    const cloak = CLOAKS[cloakKey];
    if (state.currentView === 'browser' && cloak.url) {
      const iframe = document.getElementById('browser-iframe');
      if (iframe) iframe.src = cloak.url;
    }
  }

  document.addEventListener('keydown', (e) => {
    if (state.changingPanicKey) {
      e.preventDefault();
      state.panicKey = e.key;
      localStorage.setItem('strato-panicKey', e.key);
      const el = document.getElementById('setting-panic-key');
      if (el) el.textContent = e.key;
      state.changingPanicKey = false;
      showToast('Panic key updated', 'accent');
      return;
    }
    if (e.key === state.panicKey) handlePanicKey();

    // Number key shortcuts for views
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      const viewMap = { '1': 'home', '2': 'arcade', '3': 'browser', '4': 'ai', '5': 'settings' };
      if (viewMap[e.key] && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        switchView(viewMap[e.key]);
      }
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        const urlInput = document.getElementById('home-url-input');
        if (urlInput) { switchView('home'); urlInput.focus(); }
      }
      if (e.key === '?' && document.activeElement.tagName !== 'INPUT') {
        toggleShortcuts();
      }
      if (e.key === 'Escape') {
        document.getElementById('shortcuts-overlay')?.classList.add('hidden');
        document.getElementById('notification-panel')?.classList.add('hidden');
      }
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      document.getElementById('snap-fab')?.click();
    }
  });

  // ──────────────────────────────────────────
  // VIEW SWITCHING
  // ──────────────────────────────────────────
  const VIEWS = ['home', 'arcade', 'browser', 'ai', 'settings'];

  function switchView(viewName) {
    if (!VIEWS.includes(viewName)) return;
    document.querySelectorAll('.view').forEach(el => el.classList.remove('view-active'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.add('view-active');
    document.querySelectorAll('.nav-link, .bottom-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    state.currentView = viewName;
  }

  document.querySelectorAll('.nav-link, .bottom-link').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.view) switchView(btn.dataset.view);
    });
  });

  // Category circles
  document.querySelectorAll('.category-circle').forEach(circle => {
    circle.addEventListener('click', () => {
      const target = circle.dataset.nav;
      if (target) switchView(target);
    });
  });

  // Section links
  document.querySelectorAll('.section-link[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.nav));
  });

  // ──────────────────────────────────────────
  // TOAST NOTIFICATIONS
  // ──────────────────────────────────────────
  function showToast(message, type = 'default') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ──────────────────────────────────────────
  // NOTIFICATION CENTER
  // ──────────────────────────────────────────
  function addNotification(message, type = 'info') {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    state.notifications.unshift({ message, type, time });
    if (state.notifications.length > 20) state.notifications.pop();
    renderNotifications();
  }

  function renderNotifications() {
    const list = document.getElementById('notification-list');
    const badge = document.getElementById('notification-badge');
    if (!list) return;

    if (state.notifications.length === 0) {
      list.innerHTML = '<div class="notification-empty">No notifications</div>';
      if (badge) { badge.textContent = '0'; badge.classList.add('hidden'); }
      return;
    }

    list.innerHTML = state.notifications.map(n => `
      <div class="notification-item ${n.type === 'error' ? 'error' : ''}">
        <span>${n.message}</span>
        <span class="notification-time">${n.time}</span>
      </div>
    `).join('');

    if (badge) {
      badge.textContent = state.notifications.length;
      badge.classList.toggle('hidden', state.notifications.length === 0);
    }
  }

  document.getElementById('notification-btn')?.addEventListener('click', () => {
    const panel = document.getElementById('notification-panel');
    if (panel) panel.classList.toggle('hidden');
  });

  document.getElementById('clear-notifications-btn')?.addEventListener('click', () => {
    state.notifications = [];
    renderNotifications();
  });

  // ──────────────────────────────────────────
  // ACTIVITY LOG
  // ──────────────────────────────────────────
  function logActivity(action, type = 'info') {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    state.activityLog.unshift({ action, type, time });
    if (state.activityLog.length > 15) state.activityLog.pop();
    localStorage.setItem('strato-activity', JSON.stringify(state.activityLog));
    renderActivity();
  }

  function renderActivity() {
    const list = document.getElementById('recent-activity-list');
    if (!list) return;
    if (state.activityLog.length === 0) {
      list.innerHTML = '<div class="activity-empty">No recent activity</div>';
      return;
    }
    list.innerHTML = state.activityLog.slice(0, 8).map(a => `
      <div class="activity-item">
        <span class="activity-dot ${a.type}"></span>
        <span>${a.action}</span>
        <span class="activity-time">${a.time}</span>
      </div>
    `).join('');
  }

  // ──────────────────────────────────────────
  // ACHIEVEMENTS
  // ──────────────────────────────────────────
  function unlockAchievement(id) {
    if (state.achievements.includes(id)) return;
    state.achievements.push(id);
    localStorage.setItem('strato-achievements', JSON.stringify(state.achievements));
    renderAchievements();
    showToast(`Achievement unlocked!`, 'accent');
    addNotification(`Achievement unlocked!`, 'info');
  }

  function renderAchievements() {
    const items = document.querySelectorAll('.achievement-item');
    items.forEach(item => {
      const id = item.dataset.achievement;
      if (state.achievements.includes(id)) {
        item.classList.remove('locked');
        item.classList.add('unlocked');
      }
    });
    const countEl = document.getElementById('achievement-count');
    if (countEl) countEl.textContent = `${state.achievements.length}/8`;
  }

  // ──────────────────────────────────────────
  // PROXY ENGINE
  // ──────────────────────────────────────────
  function getProxyUrl(rawUrl, engine) {
    let url = rawUrl.trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) {
      if (url.includes(' ') || !url.includes('.')) {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      } else {
        url = 'https://' + url;
      }
    }
    return engine === 'uv' ? `/frog/${encodeURIComponent(url)}` : `/scramjet/${encodeURIComponent(url)}`;
  }

  function setEngine(engine) {
    state.currentEngine = engine;
    localStorage.setItem('strato-engine', engine);
    document.querySelectorAll('[data-engine]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.engine === engine);
    });
    const label = document.getElementById('proxy-label');
    if (label) label.textContent = engine === 'uv' ? 'Ultraviolet' : 'Scramjet';
    const statusEngine = document.getElementById('status-engine');
    if (statusEngine) statusEngine.querySelector('span:last-child').textContent = engine === 'uv' ? 'Ultraviolet' : 'Scramjet';
    const statEngine = document.getElementById('stat-engine');
    if (statEngine) statEngine.textContent = engine === 'uv' ? 'Ultraviolet' : 'Scramjet';
    const settingEngine = document.getElementById('setting-engine');
    if (settingEngine) settingEngine.value = engine;
  }

  document.querySelectorAll('[data-engine]').forEach(btn => {
    btn.addEventListener('click', () => setEngine(btn.dataset.engine));
  });

  const autoFallbackToggle = document.getElementById('auto-fallback-toggle');
  const settingAutoFallback = document.getElementById('setting-auto-fallback');

  function setAutoFallback(on) {
    state.autoFallback = on;
    localStorage.setItem('strato-autoFallback', String(on));
    [autoFallbackToggle, settingAutoFallback].forEach(el => {
      if (!el) return;
      if (on) el.classList.add('on');
      else el.classList.remove('on');
    });
  }

  [autoFallbackToggle, settingAutoFallback].forEach(el => {
    if (!el) return;
    el.addEventListener('click', () => setAutoFallback(!state.autoFallback));
  });

  if (autoFallbackToggle && state.autoFallback) autoFallbackToggle.classList.add('on');
  if (settingAutoFallback && state.autoFallback) settingAutoFallback.classList.add('on');

  function navigateProxy(url, engine) {
    if (!url) return;
    const targetEngine = engine || state.currentEngine;
    const proxyUrl = getProxyUrl(url, targetEngine);
    if (!proxyUrl) return;

    switchView('browser');
    const iframe = document.getElementById('browser-iframe');
    const shimmer = document.getElementById('browser-shimmer');
    const urlInput = document.getElementById('browser-url-input');
    if (urlInput) urlInput.value = url;
    if (shimmer) shimmer.classList.remove('hidden');
    iframe.src = proxyUrl;

    state.pagesLoaded++;
    localStorage.setItem('strato-pagesLoaded', String(state.pagesLoaded));
    updateStats();
    logActivity(`Loaded ${url.substring(0, 30)}`, 'proxy');
    unlockAchievement('first-proxy');

    if (state.autoFallback) {
      const fallbackTimer = setTimeout(() => {
        const otherEngine = targetEngine === 'uv' ? 'scramjet' : 'uv';
        logProxyFailure(targetEngine, url, 'ETIMEDOUT');
        setEngine(otherEngine);
        iframe.src = getProxyUrl(url, otherEngine);
        showToast(`Switched to ${otherEngine === 'uv' ? 'Ultraviolet' : 'Scramjet'}`, 'accent');
      }, 15000);

      const onLoad = () => {
        clearTimeout(fallbackTimer);
        if (shimmer) shimmer.classList.add('hidden');
        iframe.removeEventListener('load', onLoad);
        iframe.removeEventListener('error', onError);
      };

      const onError = () => {
        clearTimeout(fallbackTimer);
        if (shimmer) shimmer.classList.add('hidden');
        iframe.removeEventListener('load', onLoad);
        iframe.removeEventListener('error', onError);
        if (state.autoFallback) {
          const otherEngine = targetEngine === 'uv' ? 'scramjet' : 'uv';
          logProxyFailure(targetEngine, url, 'ECONNREFUSED');
          setEngine(otherEngine);
          iframe.src = getProxyUrl(url, otherEngine);
          showToast(`Switched to ${otherEngine === 'uv' ? 'Ultraviolet' : 'Scramjet'}`, 'accent');
        } else {
          showToast('Failed to load page', 'error');
        }
      };

      iframe.addEventListener('load', onLoad);
      iframe.addEventListener('error', onError);
    } else {
      iframe.addEventListener('load', () => {
        if (shimmer) shimmer.classList.add('hidden');
      }, { once: true });
    }
  }

  function logProxyFailure(engine, url, error) {
    const log = JSON.parse(localStorage.getItem('strato-failureLog') || '[]');
    log.push({ engine, url, error, timestamp: Date.now() });
    while (log.length > 50) log.shift();
    localStorage.setItem('strato-failureLog', JSON.stringify(log));
  }

  // URL bar handlers
  const homeUrlInput = document.getElementById('home-url-input');
  const homeGoBtn = document.getElementById('home-go-btn');
  if (homeGoBtn) homeGoBtn.addEventListener('click', () => navigateProxy(homeUrlInput.value));
  if (homeUrlInput) homeUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigateProxy(homeUrlInput.value);
  });

  const browserUrlInput = document.getElementById('browser-url-input');
  const browserGoBtn = document.getElementById('browser-go-btn');
  if (browserGoBtn) browserGoBtn.addEventListener('click', () => navigateProxy(browserUrlInput.value));
  if (browserUrlInput) browserUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigateProxy(browserUrlInput.value);
  });

  // Quick links
  document.querySelectorAll('.quick-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (url) navigateProxy(url);
    });
  });

  // Browser nav buttons
  document.getElementById('browser-refresh-btn')?.addEventListener('click', () => {
    const iframe = document.getElementById('browser-iframe');
    if (iframe) iframe.src = iframe.src;
  });

  document.getElementById('browser-fullscreen-btn')?.addEventListener('click', () => {
    const container = document.querySelector('.browser-frame-container');
    if (container) {
      if (document.fullscreenElement) document.exitFullscreen();
      else container.requestFullscreen?.();
    }
  });

  window.addEventListener('message', (e) => {
    if (e.data?.type === 'proxy-switch-engine') {
      const otherEngine = state.currentEngine === 'uv' ? 'scramjet' : 'uv';
      setEngine(otherEngine);
      const url = browserUrlInput?.value;
      if (url) navigateProxy(url, otherEngine);
    }
  });

  // ──────────────────────────────────────────
  // GAMES
  // ──────────────────────────────────────────
  let searchDebounce = null;

  async function loadGames() {
    try {
      const resp = await fetch('/assets/games.json');
      if (!resp.ok) throw new Error('Failed to load games');
      state.games = await resp.json();
      state.filteredGames = [...state.games];
      renderGames();
      renderFeatured();
      updateGameStats();
    } catch (err) {
      showToast('Failed to load game library', 'error');
    }
  }

  function updateGameStats() {
    const total = state.games.length;
    const tier1 = state.games.filter(g => g.tier === 1).length;
    const available = state.games.filter(g => (state.unavailableGames[g.id] || 0) < 3).length;

    const els = {
      'arcade-total': total,
      'arcade-available': available,
      'arcade-tier1': tier1,
      'games-count-text': `${total} games`,
      'home-games-count': total,
      'arcade-badge': total,
    };
    for (const [id, val] of Object.entries(els)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  }

  function renderGames() {
    const grid = document.getElementById('game-grid');
    if (!grid) return;
    const showUnavailable = document.getElementById('show-unavailable')?.checked || false;

    grid.innerHTML = state.filteredGames
      .filter(game => showUnavailable || (state.unavailableGames[game.id] || 0) < 3)
      .map(game => {
        const isUnavailable = (state.unavailableGames[game.id] || 0) >= 3;
        return `
          <div class="game-card glass ${isUnavailable ? 'unavailable' : ''}" data-game-id="${game.id}">
            <div class="game-card-inner">
              <span class="tier-badge tier-${game.tier}">T${game.tier}</span>
              <img class="game-card-thumb" src="${game.thumbnail}" alt="${game.name}" loading="lazy" onerror="this.style.display='none'">
              <div class="game-card-info">
                <div class="game-card-name">${game.name}</div>
                <div class="game-card-category">${game.category}</div>
              </div>
            </div>
          </div>`;
      }).join('');

    grid.querySelectorAll('.game-card:not(.unavailable)').forEach(card => {
      card.addEventListener('click', () => launchGame(card.dataset.gameId));
    });
  }

  function renderFeatured() {
    const scroll = document.getElementById('featured-scroll');
    if (!scroll) return;
    const featured = [...state.games].sort((a, b) => a.tier - b.tier).slice(0, 10);

    scroll.innerHTML = featured.map(game => `
      <div class="featured-card">
        <div class="game-card glass" data-game-id="${game.id}">
          <div class="game-card-inner">
            <img class="game-card-thumb" src="${game.thumbnail}" alt="${game.name}" loading="lazy" onerror="this.style.display='none'">
            <div class="game-card-info">
              <div class="game-card-name">${game.name}</div>
              <div class="game-card-category">${game.category}</div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    scroll.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => launchGame(card.dataset.gameId));
    });
  }

  function launchGame(gameId) {
    const game = state.games.find(g => g.id === gameId);
    if (!game) return;

    state.recentlyPlayed = state.recentlyPlayed.filter(id => id !== gameId);
    state.recentlyPlayed.unshift(gameId);
    if (state.recentlyPlayed.length > 20) state.recentlyPlayed.pop();
    localStorage.setItem('strato-recent', JSON.stringify(state.recentlyPlayed));

    state.gamesPlayed++;
    localStorage.setItem('strato-gamesPlayed', String(state.gamesPlayed));
    updateStats();
    logActivity(`Played ${game.name}`, 'game');
    unlockAchievement('first-game');
    if (state.gamesPlayed >= 10) unlockAchievement('ten-games');

    if (game.tier === 1) {
      switchView('browser');
      const iframe = document.getElementById('browser-iframe');
      const urlInput = document.getElementById('browser-url-input');
      if (urlInput) urlInput.value = game.url;
      if (iframe) iframe.src = game.url;
    } else if (game.tier === 2) {
      const cdnBase = window.__CDN_BASE_URL || '';
      const gameUrl = cdnBase ? `${cdnBase}/${game.url}` : game.url;
      switchView('browser');
      const iframe = document.getElementById('browser-iframe');
      const urlInput = document.getElementById('browser-url-input');
      if (urlInput) urlInput.value = gameUrl;
      if (iframe) iframe.src = gameUrl;
    } else {
      navigateProxy(game.url);
    }
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(filterGames, 200);
    });
  }

  let activeCategories = new Set(['all']);
  document.getElementById('category-pills')?.addEventListener('click', (e) => {
    const pill = e.target.closest('.glass-pill');
    if (!pill) return;
    const cat = pill.dataset.category;
    if (cat === 'all') {
      activeCategories = new Set(['all']);
      document.querySelectorAll('#category-pills .glass-pill').forEach(p => p.classList.toggle('active', p.dataset.category === 'all'));
    } else {
      activeCategories.delete('all');
      document.querySelector('#category-pills [data-category="all"]')?.classList.remove('active');
      if (activeCategories.has(cat)) { activeCategories.delete(cat); pill.classList.remove('active'); }
      else { activeCategories.add(cat); pill.classList.add('active'); }
      if (activeCategories.size === 0) {
        activeCategories = new Set(['all']);
        document.querySelector('#category-pills [data-category="all"]')?.classList.add('active');
      }
    }
    filterGames();
  });

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.addEventListener('change', filterGames);

  const showUnavailableCheckbox = document.getElementById('show-unavailable');
  if (showUnavailableCheckbox) showUnavailableCheckbox.addEventListener('change', renderGames);

  function filterGames() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    const sort = sortSelect?.value || 'popular';
    state.filteredGames = state.games.filter(game => {
      if (!activeCategories.has('all') && !activeCategories.has(game.category)) return false;
      if (query) {
        const nameMatch = game.name.toLowerCase().includes(query);
        const descMatch = (game.description || '').toLowerCase().includes(query);
        if (!nameMatch && !descMatch) return false;
      }
      return true;
    });
    switch (sort) {
      case 'az': state.filteredGames.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'recent': state.filteredGames.sort((a, b) => {
        const aIdx = state.recentlyPlayed.indexOf(a.id);
        const bIdx = state.recentlyPlayed.indexOf(b.id);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      }); break;
      case 'random': state.filteredGames.sort(() => Math.random() - 0.5); break;
      case 'tier': state.filteredGames.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name)); break;
      default: state.filteredGames.sort((a, b) => a.tier - b.tier); break;
    }
    renderGames();
  }

  // ──────────────────────────────────────────
  // STRATOVAULT
  // ──────────────────────────────────────────
  const VAULT_DB = 'stratoVault';
  const VAULT_STORE = 'gameCache';
  const VAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  async function openVault() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(VAULT_DB, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(VAULT_STORE)) db.createObjectStore(VAULT_STORE, { keyPath: 'gameId' });
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function clearVault() {
    try {
      const db = await openVault();
      const tx = db.transaction(VAULT_STORE, 'readwrite');
      tx.objectStore(VAULT_STORE).clear();
      await new Promise(resolve => { tx.oncomplete = resolve; });
      showToast('Game cache cleared', 'accent');
      updateCacheSize();
    } catch { showToast('Failed to clear cache', 'error'); }
  }

  async function updateCacheSize() {
    try {
      const estimate = await navigator.storage.estimate();
      const sizeMB = (estimate.usage / (1024 * 1024)).toFixed(1);
      const el = document.getElementById('cache-size');
      if (el) el.textContent = `${sizeMB} MB`;
    } catch {}
  }

  document.getElementById('clear-cache-btn')?.addEventListener('click', clearVault);

  // ──────────────────────────────────────────
  // AI CHAT
  // ──────────────────────────────────────────
  const aiInput = document.getElementById('ai-input');
  const aiSendBtn = document.getElementById('ai-send-btn');
  const aiMessages = document.getElementById('ai-messages');
  const aiOfflineBanner = document.getElementById('ai-offline-banner');

  async function checkAiStatus() {
    try {
      const resp = await fetch('/api/ai/status');
      const data = await resp.json();
      state.aiOnline = data.online;
      const aiDot = document.getElementById('ai-connection-dot');
      const aiNavDot = document.getElementById('ai-nav-dot');
      const aiStatusText = document.getElementById('ai-status-text');
      const aiStatusSettings = document.getElementById('ai-status-settings');
      const homeAiStatus = document.getElementById('home-ai-status');
      if (aiDot) aiDot.classList.toggle('error', !data.online);
      if (aiNavDot) { aiNavDot.className = `nav-dot ${data.online ? 'online' : 'offline'}`; }
      if (aiStatusText) aiStatusText.textContent = data.online ? 'Online' : 'Offline';
      if (aiStatusSettings) { aiStatusSettings.textContent = data.online ? 'Online' : 'Offline'; aiStatusSettings.style.color = data.online ? 'var(--success)' : 'var(--error)'; }
      if (homeAiStatus) homeAiStatus.textContent = data.online ? 'Online' : 'Offline';
      if (aiOfflineBanner) aiOfflineBanner.classList.toggle('hidden', data.online);
    } catch {
      state.aiOnline = false;
      if (aiOfflineBanner) aiOfflineBanner.classList.remove('hidden');
    }
  }

  function addAiBubble(role, content) {
    const bubble = document.createElement('div');
    bubble.className = `ai-bubble ${role}`;
    bubble.textContent = content;
    aiMessages.appendChild(bubble);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }

  async function sendAiMessage() {
    const text = aiInput?.value?.trim();
    if (!text || !state.aiOnline) return;
    addAiBubble('user', text);
    aiInput.value = '';
    state.aiMessages.push({ role: 'user', content: text });
    state.aiMessagesSent++;
    localStorage.setItem('strato-aiMessagesSent', String(state.aiMessagesSent));
    updateStats();
    unlockAchievement('first-ai');

    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfMeta?.content || '' },
        body: JSON.stringify({ messages: state.aiMessages }),
      });
      const data = await resp.json();
      if (resp.ok && data.message) {
        addAiBubble('assistant', data.message.content);
        state.aiMessages.push(data.message);
      } else {
        addAiBubble('error', data.error || 'Unknown error');
      }
    } catch { addAiBubble('error', 'Failed to reach AI service'); }
  }

  if (aiSendBtn) aiSendBtn.addEventListener('click', sendAiMessage);
  if (aiInput) aiInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendAiMessage(); }
  });

  // AI quick prompts
  document.querySelectorAll('.ai-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (aiInput) { aiInput.value = btn.dataset.prompt; aiInput.focus(); }
    });
  });

  // AI mode tabs
  document.querySelectorAll('[data-ai-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-ai-mode]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.aiMode;
      document.getElementById('ai-chat-panel')?.classList.toggle('hidden', mode !== 'chat');
      document.getElementById('ai-snap-panel')?.classList.toggle('hidden', mode !== 'snap');
    });
  });

  // ──────────────────────────────────────────
  // SNAP & SOLVE
  // ──────────────────────────────────────────
  let snapImage = null;
  let snapPrompt = 'Solve this question step by step. Show your work and give the final answer clearly.';
  let snapSolving = false;

  document.getElementById('snap-fab')?.addEventListener('click', () => {
    switchView('ai');
    document.querySelectorAll('[data-ai-mode]').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-ai-mode="snap"]')?.classList.add('active');
    document.getElementById('ai-chat-panel')?.classList.add('hidden');
    document.getElementById('ai-snap-panel')?.classList.remove('hidden');
  });

  const snapDropZone = document.getElementById('snap-drop-zone');
  const snapFileInput = document.getElementById('snap-file-input');

  snapDropZone?.addEventListener('click', () => snapFileInput?.click());
  snapFileInput?.addEventListener('change', (e) => { if (e.target.files?.[0]) handleSnapFile(e.target.files[0]); });
  snapDropZone?.addEventListener('dragover', (e) => { e.preventDefault(); snapDropZone.classList.add('dragover'); });
  snapDropZone?.addEventListener('dragleave', () => snapDropZone.classList.remove('dragover'));
  snapDropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    snapDropZone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) handleSnapFile(file);
  });

  document.addEventListener('paste', (e) => {
    const snapPanel = document.getElementById('ai-snap-panel');
    if (snapPanel?.classList.contains('hidden') && state.currentView !== 'ai') return;
    for (const item of e.clipboardData?.items || []) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          switchView('ai');
          document.querySelectorAll('[data-ai-mode]').forEach(t => t.classList.remove('active'));
          document.querySelector('[data-ai-mode="snap"]')?.classList.add('active');
          document.getElementById('ai-chat-panel')?.classList.add('hidden');
          document.getElementById('ai-snap-panel')?.classList.remove('hidden');
          handleSnapFile(file);
        }
        break;
      }
    }
  });

  function handleSnapFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      snapImage = e.target.result;
      const previewImg = document.getElementById('snap-preview-img');
      if (previewImg) previewImg.src = snapImage;
      document.getElementById('snap-preview-container')?.classList.remove('hidden');
      document.getElementById('snap-drop-zone')?.classList.add('hidden');
      document.getElementById('snap-solve-btn').disabled = false;
      document.getElementById('snap-result')?.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }

  document.getElementById('snap-clear-btn')?.addEventListener('click', () => {
    snapImage = null;
    document.getElementById('snap-preview-container')?.classList.add('hidden');
    document.getElementById('snap-drop-zone')?.classList.remove('hidden');
    document.getElementById('snap-solve-btn').disabled = true;
    document.getElementById('snap-result')?.classList.add('hidden');
    if (snapFileInput) snapFileInput.value = '';
  });

  document.querySelectorAll('.snap-prompt-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.snap-prompt-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      snapPrompt = pill.dataset.snapPrompt;
    });
  });
  document.querySelector('.snap-prompt-pill')?.classList.add('active');

  document.getElementById('snap-solve-btn')?.addEventListener('click', () => {
    if (!snapImage || snapSolving || !state.aiOnline) return;
    solveSnap();
  });

  async function solveSnap() {
    snapSolving = true;
    const solveBtn = document.getElementById('snap-solve-btn');
    const resultDiv = document.getElementById('snap-result');
    const resultContent = document.getElementById('snap-result-content');
    if (solveBtn) { solveBtn.disabled = true; solveBtn.textContent = 'Solving...'; }
    resultDiv?.classList.add('hidden');

    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const resp = await fetch('/api/ai/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfMeta?.content || '' },
        body: JSON.stringify({ image: snapImage, prompt: snapPrompt }),
      });
      const data = await resp.json();
      if (resp.ok && data.message) {
        if (resultContent) resultContent.textContent = data.message.content;
        resultDiv?.classList.remove('hidden');
        unlockAchievement('snap-solve');
      } else {
        showToast(data.error || 'Failed to solve', 'error');
      }
    } catch { showToast('Failed to reach AI service', 'error'); }
    finally {
      snapSolving = false;
      if (solveBtn) { solveBtn.disabled = false; solveBtn.textContent = 'Solve Question'; }
    }
  }

  document.getElementById('snap-copy-btn')?.addEventListener('click', () => {
    const content = document.getElementById('snap-result-content')?.textContent;
    if (content) {
      navigator.clipboard.writeText(content).then(() => showToast('Answer copied', 'accent')).catch(() => showToast('Failed to copy', 'error'));
    }
  });

  // ──────────────────────────────────────────
  // STATS UPDATE
  // ──────────────────────────────────────────
  function updateStats() {
    const els = {
      'stat-games-played': state.gamesPlayed,
      'stat-pages-loaded': state.pagesLoaded,
      'stat-ai-messages': state.aiMessagesSent,
    };
    for (const [id, val] of Object.entries(els)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  }

  // ──────────────────────────────────────────
  // HEALTH CHECK
  // ──────────────────────────────────────────
  async function healthCheck() {
    try {
      const resp = await fetch('/health');
      const data = await resp.json();
      const dot = document.getElementById('connection-dot');
      const browserDot = document.getElementById('browser-connection-dot');
      [dot, browserDot].forEach(d => {
        if (!d) return;
        d.className = data.status === 'ok' ? 'connection-dot' : 'connection-dot warning';
        if (d.classList.contains('browser-dot')) d.className += ' browser-dot';
      });

      const engineStatus = document.getElementById('engine-status');
      if (engineStatus) {
        engineStatus.textContent = `UV: ${data.engines?.uv ? 'OK' : 'Down'} | SJ: ${data.engines?.scramjet ? 'OK' : 'Down'}`;
        engineStatus.style.color = (data.engines?.uv && data.engines?.scramjet) ? 'var(--success)' : 'var(--warning)';
      }

      const wispStatus = document.getElementById('wisp-status');
      if (wispStatus) {
        wispStatus.textContent = data.wisp ? 'Connected' : 'Down';
        wispStatus.style.color = data.wisp ? 'var(--success)' : 'var(--error)';
      }

      const proxyState = document.getElementById('status-proxy-state');
      if (proxyState) {
        const indicator = proxyState.querySelector('.status-indicator');
        const label = proxyState.querySelector('span:last-child');
        if (indicator) indicator.className = `status-indicator ${data.status === 'ok' ? 'active' : 'warning'}`;
        if (label) label.textContent = data.status === 'ok' ? 'Proxy Ready' : 'Issues';
      }
    } catch {
      const dot = document.getElementById('connection-dot');
      const browserDot = document.getElementById('browser-connection-dot');
      [dot, browserDot].forEach(d => {
        if (d) { d.className = 'connection-dot error'; if (d.classList.contains('browser-dot')) d.className += ' browser-dot'; }
      });
    }
  }

  setInterval(healthCheck, 30000);

  // ──────────────────────────────────────────
  // SETTINGS
  // ──────────────────────────────────────────
  document.getElementById('setting-engine')?.addEventListener('change', (e) => setEngine(e.target.value));
  document.getElementById('setting-cloak')?.addEventListener('change', (e) => {
    applyCloak(e.target.value);
    showToast(`Tab cloaked as ${CLOAKS[e.target.value]?.title || 'None'}`, 'accent');
  });

  document.getElementById('change-panic-key')?.addEventListener('click', () => {
    state.changingPanicKey = true;
    const el = document.getElementById('setting-panic-key');
    if (el) el.textContent = '...';
    showToast('Press any key to set as panic key', 'accent');
  });

  // Settings nav
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const section = item.dataset.settingsSection;
      if (section) {
        document.querySelectorAll('.settings-section').forEach(s => s.style.display = 'none');
        const target = document.getElementById(`settings-${section}`);
        if (target) target.style.display = '';
      }
    });
  });

  // Accent color picker
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const color = swatch.dataset.color;
      document.documentElement.setAttribute('data-accent', color);
      state.accentColor = color;
      localStorage.setItem('strato-accent', color);
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      unlockAchievement('theme-change');
      showToast(`Accent changed to ${color}`, 'accent');
    });
  });

  // Apply saved color swatch
  document.querySelector(`.color-swatch[data-color="${state.accentColor}"]`)?.classList.add('active');

  // Particles toggle
  const particlesToggle = document.getElementById('setting-particles');
  if (particlesToggle) {
    if (state.particlesEnabled) particlesToggle.classList.add('on');
    else particlesToggle.classList.remove('on');
    particlesToggle.addEventListener('click', () => {
      state.particlesEnabled = !state.particlesEnabled;
      localStorage.setItem('strato-particles', String(state.particlesEnabled));
      particlesToggle.classList.toggle('on');
      if (canvas) canvas.style.display = state.particlesEnabled ? '' : 'none';
      document.querySelectorAll('.floating-orb, .bg-grid, .bg-scanline').forEach(el => {
        el.style.display = state.particlesEnabled ? '' : 'none';
      });
    });
  }

  // Animations toggle
  const animationsToggle = document.getElementById('setting-animations');
  if (animationsToggle) {
    if (state.animationsEnabled) animationsToggle.classList.add('on');
    else animationsToggle.classList.remove('on');
    animationsToggle.addEventListener('click', () => {
      state.animationsEnabled = !state.animationsEnabled;
      localStorage.setItem('strato-animations', String(state.animationsEnabled));
      animationsToggle.classList.toggle('on');
      document.body.style.setProperty('--duration-fast', state.animationsEnabled ? '0.12s' : '0s');
      document.body.style.setProperty('--duration-normal', state.animationsEnabled ? '0.25s' : '0s');
    });
  }

  // Clear all data
  document.getElementById('clear-all-data-btn')?.addEventListener('click', () => {
    localStorage.clear();
    indexedDB.deleteDatabase('stratoVault');
    showToast('All data cleared', 'accent');
    setTimeout(() => location.reload(), 1000);
  });

  // Keyboard shortcuts overlay
  function toggleShortcuts() {
    const overlay = document.getElementById('shortcuts-overlay');
    if (overlay) overlay.classList.toggle('hidden');
  }

  document.getElementById('shortcuts-btn')?.addEventListener('click', toggleShortcuts);
  document.getElementById('close-shortcuts-btn')?.addEventListener('click', () => {
    document.getElementById('shortcuts-overlay')?.classList.add('hidden');
  });

  // Theme cycle button
  document.getElementById('theme-cycle-btn')?.addEventListener('click', () => {
    const colors = ['cyan', 'purple', 'pink', 'green', 'orange', 'red'];
    const currentIdx = colors.indexOf(state.accentColor);
    const nextIdx = (currentIdx + 1) % colors.length;
    const nextColor = colors[nextIdx];
    document.documentElement.setAttribute('data-accent', nextColor);
    state.accentColor = nextColor;
    localStorage.setItem('strato-accent', nextColor);
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === nextColor));
    unlockAchievement('theme-change');
    showToast(`Accent: ${nextColor}`, 'accent');
  });

  // ──────────────────────────────────────────
  // USERNAME DISPLAY
  // ──────────────────────────────────────────
  function getUsername() {
    return localStorage.getItem('strato-username') || '';
  }

  // ──────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────
  async function init() {
    const splash = document.getElementById('splash');
    const splashBar = splash?.querySelector('.splash-bar');
    const splashStatus = splash?.querySelector('.splash-status');

    // Step 1: Transport
    if (splashBar) splashBar.style.width = '20%';
    if (splashStatus) splashStatus.textContent = 'Initializing proxy transport...';

    try {
      await new Promise(resolve => {
        const onReady = (e) => {
          window.removeEventListener('proxy-ready', onReady);
          state.proxyReady = true;
          // Update splash engine indicators
          if (e.detail) {
            const uvDot = document.querySelector('#splash-engine-uv .splash-dot');
            const sjDot = document.querySelector('#splash-engine-sj .splash-dot');
            if (uvDot) uvDot.className = `splash-dot ${e.detail.uv ? 'ready' : 'error'}`;
            if (sjDot) sjDot.className = `splash-dot ${e.detail.scramjet ? 'ready' : 'error'}`;
          }
          resolve();
        };
        window.addEventListener('proxy-ready', onReady);
        setTimeout(() => { window.removeEventListener('proxy-ready', onReady); resolve(); }, 8000);
      });
    } catch {}

    // Step 2: Load games
    if (splashBar) splashBar.style.width = '50%';
    if (splashStatus) splashStatus.textContent = 'Loading game library...';
    await loadGames();

    // Step 3: AI status
    if (splashBar) splashBar.style.width = '75%';
    if (splashStatus) splashStatus.textContent = 'Checking AI service...';
    await checkAiStatus();

    // Step 4: Health check
    if (splashBar) splashBar.style.width = '90%';
    if (splashStatus) splashStatus.textContent = 'Running health check...';
    await healthCheck();

    // Mark all splash indicators ready
    document.querySelectorAll('#splash-engine-wisp .splash-dot, #splash-engine-bare .splash-dot').forEach(d => d.className = 'splash-dot ready');

    // Step 5: Apply settings
    if (splashBar) splashBar.style.width = '100%';
    if (splashStatus) splashStatus.textContent = 'Ready';

    if (state.activeCloak !== 'none') applyCloak(state.activeCloak);
    setEngine(state.currentEngine);
    updateCacheSize();
    updateStats();
    renderAchievements();
    renderActivity();

    // Username
    const usernameEl = document.getElementById('username-display');
    const username = getUsername();
    if (usernameEl && username) usernameEl.textContent = `@${username}`;

    // Unlock first launch
    unlockAchievement('first-launch');

    // Welcome notification
    addNotification('STRATO v12 Chromatic Storm loaded', 'info');

    // Fade out splash
    await new Promise(resolve => setTimeout(resolve, 400));
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 500);
    }

    const app = document.getElementById('app');
    if (app) app.classList.remove('hidden');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
