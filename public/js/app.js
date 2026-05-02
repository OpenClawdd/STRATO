/* ══════════════════════════════════════════════════════════
   STRATO v12 — CHROMATIC STORM ULTRA-MAXIMALIST
   Client Application
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ──────────────────────────────────────────
  // PARTICLE SYSTEM
  // Now handled by particles.js (rainbow + mouse repulsion)
  // ──────────────────────────────────────────

  // ──────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────
  const startTime = Date.now();
  let cpOpen = false; // Command palette state - declared early for keydown handler
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
    coins: parseInt(localStorage.getItem('strato-coins') || '0'),
    hubSites: [],
    filteredHubSites: [],
    dailyChallenges: JSON.parse(localStorage.getItem('strato-dailyChallenges') || '{}'),
    leaderboard: null, // REMOVED - fake feature
    favorites: JSON.parse(localStorage.getItem('strato-favorites') || '[]'),
    recentPlays: JSON.parse(localStorage.getItem('strato-recentPlays') || '[]'),
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
    none:               { title: 'STRATO', favicon: '/favicon.ico' },
    classroom:          { title: 'Classes', favicon: 'https://www.google.com/favicon.ico' },
    quizlet:            { title: 'Your Sets | Quizlet', favicon: 'https://www.quizlet.com/favicon.ico' },
    canvas:             { title: 'Dashboard', favicon: 'https://www.canvaslms.com/favicon.ico' },
    clever:             { title: 'Clever | Portal', favicon: 'https://www.clever.com/favicon.ico' },
    ixl:                { title: 'IXL | Math', favicon: 'https://www.ixl.com/favicon.ico' },
    'school-agreca':    { title: 'Escuela Agreca', favicon: 'https://www.google.com/favicon.ico' },
    'noahs-tutoring':   { title: "Noah's Tutoring — Programming & Writing", favicon: 'https://www.google.com/favicon.ico' },
    'byod-portal':      { title: 'BYOD Portal', favicon: 'https://www.google.com/favicon.ico' },
    'eclipse-castellon':{ title: 'Eclipse Castellon', favicon: 'https://www.google.com/favicon.ico' },
    'learning-policy':  { title: 'Learning Policy Institute', favicon: 'https://www.google.com/favicon.ico' },
    'petezah-games':    { title: 'Aletia Tours — Travel Deals', favicon: 'https://www.google.com/favicon.ico' },
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
    if (e.key === state.panicKey || e.key === 'Escape') handlePanicKey();

    // Number key shortcuts for views
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      const viewMap = { '1': 'home', '2': 'arcade', '3': 'browser', 'h': 'hub', '4': 'ai', '5': 'settings' };
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
        document.getElementById('command-palette')?.classList.add('hidden');
      }
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      document.getElementById('snap-fab')?.click();
    }

    // Command Palette: Cmd+K / Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (cpOpen) closeCommandPalette();
      else openCommandPalette();
    }
  });

  // ──────────────────────────────────────────
  // VIEW SWITCHING
  // ──────────────────────────────────────────
  const VIEWS = ['home', 'arcade', 'browser', 'hub', 'ai', 'settings'];

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
    addCoins(5);
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
    // Use the proper UV/SJ codec — the service workers expect XOR-encoded URLs
    // NOT encodeURIComponent (which was causing proxy breakage)
    const targetEngine = engine || state.currentEngine;
    if (targetEngine === 'uv') {
      // Ultraviolet uses Ultraviolet.codec.xor.encode at the SW level.
      // The SW intercepts /frog/service/ prefixed URLs and decodes them.
      // We just need to pass the raw URL — the SW handles encoding.
      // The prefix /frog/service/ is defined in uv.config.js
      try {
        if (typeof Ultraviolet !== 'undefined' && Ultraviolet.codec && Ultraviolet.codec.xor) {
          return `/frog/service/${Ultraviolet.codec.xor.encode(url)}`;
        }
      } catch (e) { /* fallback below */ }
      // Fallback: use the config prefix + encodeURIComponent (UV SW can handle both)
      return `/frog/service/${encodeURIComponent(url)}`;
    } else {
      // Scramjet uses Scramjet.codec.xor.encode
      try {
        if (typeof Scramjet !== 'undefined' && Scramjet.codec && Scramjet.codec.xor) {
          return `/scramjet/service/${Scramjet.codec.xor.encode(url)}`;
        }
      } catch (e) { /* fallback below */ }
      return `/scramjet/service/${encodeURIComponent(url)}`;
    }
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
    addCoins(2);
    updateDailyChallengeProgress('browse');
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
        const isFav = state.favorites.includes(game.id);
        const rel = game.reliability || 'green';
        const hasPassword = !!game.password;
        const proxyTier = game.proxy_tier;
        let tierIcon = '';
        if (proxyTier === 'good') tierIcon = '<span class="tier-gold">&#9733;</span>';
        else if (proxyTier === 'recommended') tierIcon = '<span class="tier-purple">&#9734;</span>';
        else if (game.tier === 1) tierIcon = '<span class="tier-standalone">LOCAL</span>';
        return `
          <div class="game-card glass ${isUnavailable ? 'unavailable' : ''}" data-game-id="${game.id}">
            <div class="game-card-inner">
              <div class="game-card-badges">
                ${tierIcon}
                <span class="reliability-dot rel-${rel}" title="${rel} reliability"></span>
                ${hasPassword ? '<span class="auth-hint" title="Password: ' + game.password + '">&#128272; ' + game.password + '</span>' : ''}
              </div>
              <button class="fav-btn ${isFav ? 'active' : ''}" data-fav-id="${game.id}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">${isFav ? '\u2605' : '\u2606'}</button>
              <img class="game-card-thumb" src="${game.thumbnail}" alt="${game.name}" loading="lazy" onerror="this.style.display='none'">
              <div class="game-card-info">
                <div class="game-card-name">${game.name}</div>
                <div class="game-card-category">${game.category}</div>
              </div>
            </div>
          </div>`;
      }).join('');

    grid.querySelectorAll('.game-card:not(.unavailable)').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.fav-btn')) return;
        launchGame(card.dataset.gameId);
      });
    });

    grid.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(btn.dataset.favId);
      });
    });

    // Attach hover prefetch for faster loads
    attachHoverPrefetch();
  }

  function toggleFavorite(gameId) {
    const idx = state.favorites.indexOf(gameId);
    if (idx === -1) state.favorites.push(gameId);
    else state.favorites.splice(idx, 1);
    localStorage.setItem('strato-favorites', JSON.stringify(state.favorites));
    renderGames();
    showToast(idx === -1 ? 'Added to favorites' : 'Removed from favorites', 'accent');
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
    addCoins(1);
    updateDailyChallengeProgress('play');
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
      if (activeCategories.has('favorites')) {
        if (!state.favorites.includes(game.id)) return false;
      } else if (activeCategories.has('recent')) {
        if (!state.recentlyPlayed.includes(game.id)) return false;
      } else if (!activeCategories.has('all') && !activeCategories.has(game.category)) {
        return false;
      }
      if (query) {
        const nameMatch = game.name.toLowerCase().includes(query);
        const descMatch = (game.description || '').toLowerCase().includes(query);
        const tagMatch = (game.tags || []).some(t => t.toLowerCase().includes(query));
        const catMatch = (game.category || '').toLowerCase().includes(query);
        if (!nameMatch && !descMatch && !tagMatch && !catMatch) return false;
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
    addCoins(1);
    updateDailyChallengeProgress('chat');
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

  // Idle timeout setting
  const idleInput = document.getElementById('setting-idle-seconds');
  if (idleInput) {
    idleInput.value = localStorage.getItem('strato-idleSeconds') || '45';
    idleInput.addEventListener('change', (e) => {
      localStorage.setItem('strato-idleSeconds', e.target.value);
      showToast(`Auto-cloak timeout: ${e.target.value}s`, 'accent');
    });
  }

  // Breadcrumb setting
  const breadcrumbInput = document.getElementById('setting-breadcrumb');
  if (breadcrumbInput) {
    breadcrumbInput.value = localStorage.getItem('strato-breadcrumb') || 'Classroom > AP History > Unit 4';
    breadcrumbInput.addEventListener('input', (e) => {
      updateBreadcrumb(e.target.value);
    });
  }

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
  // STRATO COINS
  // ──────────────────────────────────────────
  function addCoins(amount) {
    state.coins += amount;
    localStorage.setItem('strato-coins', String(state.coins));
    updateCoinsDisplay();
    // Show popup animation
    const popup = document.createElement('div');
    popup.className = 'coin-popup';
    popup.textContent = `+${amount} coins`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 2200);
  }

  function updateCoinsDisplay() {
    const el = document.getElementById('coins-count');
    if (el) el.textContent = state.coins;
  }

  // ──────────────────────────────────────────
  // HUB — SITE DIRECTORY
  // ──────────────────────────────────────────
  let hubSearchDebounce = null;

  async function loadHubSites() {
    try {
      const resp = await fetch('/api/hub/sites');
      if (!resp.ok) throw new Error('Failed to load hub');
      const data = await resp.json();
      state.hubSites = data.sites || [];
      state.filteredHubSites = [...state.hubSites];
      renderHubSites();
      const countEl = document.getElementById('hub-site-count');
      if (countEl) countEl.textContent = `${state.hubSites.length} sites`;
      const badgeEl = document.getElementById('hub-badge');
      if (badgeEl) badgeEl.textContent = state.hubSites.length;
      const homeCountEl = document.getElementById('home-hub-count');
      if (homeCountEl) homeCountEl.textContent = state.hubSites.length;
    } catch (err) {
      showToast('Failed to load Hub directory', 'error');
    }
  }

  function renderHubSites() {
    const grid = document.getElementById('hub-cards-grid');
    if (!grid) return;
    const topTierOnly = document.getElementById('hub-top-tier-toggle')?.checked || false;
    let sites = state.filteredHubSites;
    if (topTierOnly) sites = sites.filter(s => s.stars === 3);

    grid.innerHTML = sites.map(site => {
      const stars = Array.from({length: 3}, (_, i) =>
        `<svg class="hub-star ${i < site.stars ? 'filled' : ''}" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>`
      ).join('');
      const safeBadge = site.iframe_safe ? '<span class="hub-badge-iframe-safe">iframe-safe</span>' : '';
      return `
        <div class="hub-card" data-hub-url="${site.url}" data-hub-safe="${site.iframe_safe}">
          <div class="hub-card-top">
            <span class="hub-card-name">${site.name}</span>
            <span class="hub-card-stars">${stars}</span>
          </div>
          <p class="hub-card-desc">${site.description}</p>
          <div class="hub-card-bottom">
            <span class="hub-card-category ${site.category}">${site.category}</span>
            ${safeBadge}
            <button class="hub-card-open-btn" data-hub-launch="${site.url}" data-hub-safe="${site.iframe_safe}">Open</button>
          </div>
        </div>`;
    }).join('');

    // Attach click handlers for open buttons
    grid.querySelectorAll('.hub-card-open-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.hubLaunch;
        const safe = btn.dataset.hubSafe === 'true';
        launchSiteViaProxy(url, safe);
      });
    });
  }

  function launchSiteViaProxy(url, iframeSafe) {
    if (iframeSafe) {
      // Load in the browser iframe view
      navigateProxy(url);
      addCoins(2);
    } else {
      // Open in about:blank cloaked tab for non-iframe-safe sites
      launchCloakedProxy(url);
      addCoins(1);
    }
  }

  // launchCloakedProxy is defined in the new features section below

  // Hub search
  const hubSearchInput = document.getElementById('hub-search-input');
  if (hubSearchInput) {
    hubSearchInput.addEventListener('input', () => {
      clearTimeout(hubSearchDebounce);
      hubSearchDebounce = setTimeout(() => {
        const q = hubSearchInput.value.toLowerCase().trim();
        state.filteredHubSites = state.hubSites.filter(s =>
          s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
        );
        renderHubSites();
      }, 200);
    });
  }

  // Hub category filter
  const hubCategoryFilter = document.getElementById('hub-category-filter');
  if (hubCategoryFilter) {
    hubCategoryFilter.addEventListener('change', () => {
      const cat = hubCategoryFilter.value;
      if (cat === 'all') {
        state.filteredHubSites = [...state.hubSites];
      } else {
        state.filteredHubSites = state.hubSites.filter(s => s.category === cat);
      }
      // Re-apply search filter
      const q = hubSearchInput?.value?.toLowerCase().trim();
      if (q) {
        state.filteredHubSites = state.filteredHubSites.filter(s =>
          s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
        );
      }
      renderHubSites();
    });
  }

  // Hub top tier toggle
  document.getElementById('hub-top-tier-toggle')?.addEventListener('change', renderHubSites);

  // Hub quick launch buttons
  document.querySelectorAll('.hub-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.hubUrl;
      const safe = btn.dataset.hubSafe === 'true';
      if (url) launchSiteViaProxy(url, safe);
    });
  });

  // Hub error overlay handlers
  document.getElementById('hub-error-other-engine')?.addEventListener('click', () => {
    const otherEngine = state.currentEngine === 'uv' ? 'scramjet' : 'uv';
    setEngine(otherEngine);
    const url = document.getElementById('browser-url-input')?.value;
    if (url) navigateProxy(url, otherEngine);
    document.getElementById('hub-error-overlay')?.classList.add('hidden');
  });

  document.getElementById('hub-error-new-tab')?.addEventListener('click', () => {
    const url = document.getElementById('browser-url-input')?.value;
    if (url) launchCloakedProxy(url);
    document.getElementById('hub-error-overlay')?.classList.add('hidden');
  });

  // ──────────────────────────────────────────
  // DAILY CHALLENGES
  // ──────────────────────────────────────────
  function initDailyChallenges() {
    const today = new Date().toDateString();
    if (state.dailyChallenges.date !== today) {
      // Reset challenges for new day
      state.dailyChallenges = {
        date: today,
        gamesPlayed: 0,
        pagesLoaded: 0,
        aiMessagesSent: 0,
        completed: { play: false, browse: false, chat: false },
      };
      localStorage.setItem('strato-dailyChallenges', JSON.stringify(state.dailyChallenges));
    }
    renderDailyChallenges();
  }

  function updateDailyChallengeProgress(type) {
    if (!state.dailyChallenges.date) return;
    if (type === 'play') {
      state.dailyChallenges.gamesPlayed = (state.dailyChallenges.gamesPlayed || 0) + 1;
      if (state.dailyChallenges.gamesPlayed >= 3 && !state.dailyChallenges.completed?.play) {
        if (!state.dailyChallenges.completed) state.dailyChallenges.completed = {};
        state.dailyChallenges.completed.play = true;
        addCoins(5);
        showToast('Daily challenge complete: Play 3 games!', 'accent');
      }
    } else if (type === 'browse') {
      state.dailyChallenges.pagesLoaded = (state.dailyChallenges.pagesLoaded || 0) + 1;
      if (state.dailyChallenges.pagesLoaded >= 5 && !state.dailyChallenges.completed?.browse) {
        if (!state.dailyChallenges.completed) state.dailyChallenges.completed = {};
        state.dailyChallenges.completed.browse = true;
        addCoins(5);
        showToast('Daily challenge complete: Browse 5 pages!', 'accent');
      }
    } else if (type === 'chat') {
      state.dailyChallenges.aiMessagesSent = (state.dailyChallenges.aiMessagesSent || 0) + 1;
      if (state.dailyChallenges.aiMessagesSent >= 2 && !state.dailyChallenges.completed?.chat) {
        if (!state.dailyChallenges.completed) state.dailyChallenges.completed = {};
        state.dailyChallenges.completed.chat = true;
        addCoins(5);
        showToast('Daily challenge complete: Chat with AI 2x!', 'accent');
      }
    }
    localStorage.setItem('strato-dailyChallenges', JSON.stringify(state.dailyChallenges));
    renderDailyChallenges();
  }

  function renderDailyChallenges() {
    const playProgress = document.getElementById('challenge-play-progress');
    const playCount = document.getElementById('challenge-play-count');
    const browseProgress = document.getElementById('challenge-browse-progress');
    const browseCount = document.getElementById('challenge-browse-count');
    const chatProgress = document.getElementById('challenge-chat-progress');
    const chatCount = document.getElementById('challenge-chat-count');

    const ch = state.dailyChallenges;
    const gamesPlayed = ch.gamesPlayed || 0;
    const pagesLoaded = ch.pagesLoaded || 0;
    const aiMessagesSent = ch.aiMessagesSent || 0;

    if (playProgress) playProgress.style.width = `${Math.min(100, (gamesPlayed / 3) * 100)}%`;
    if (playCount) playCount.textContent = `${gamesPlayed}/3`;
    if (browseProgress) browseProgress.style.width = `${Math.min(100, (pagesLoaded / 5) * 100)}%`;
    if (browseCount) browseCount.textContent = `${pagesLoaded}/5`;
    if (chatProgress) chatProgress.style.width = `${Math.min(100, (aiMessagesSent / 2) * 100)}%`;
    if (chatCount) chatCount.textContent = `${aiMessagesSent}/2`;

    // Mark completed items
    document.querySelectorAll('.challenge-item').forEach(item => {
      const challenge = item.dataset.challenge;
      if (challenge === 'play-games' && ch.completed?.play) item.classList.add('completed');
      if (challenge === 'browse-sites' && ch.completed?.browse) item.classList.add('completed');
      if (challenge === 'chat-ai' && ch.completed?.chat) item.classList.add('completed');
    });
  }

  // ──────────────────────────────────────────
  // CLOAKED PROXY LAUNCHER (about:blank)
  // ──────────────────────────────────────────
  function launchCloakedProxy(url) {
    const proxyUrl = getProxyUrl(url);
    if (!proxyUrl) return;
    const cloak = CLOAKS[state.activeCloak] || CLOAKS['classroom'];
    const newWin = window.open('about:blank', '_blank');
    if (!newWin) { showToast('Popup blocked — allow popups for cloaked launch', 'error'); return; }
    try {
      const doc = newWin.document;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>${cloak.title}</title><link rel="icon" href="${cloak.favicon}"><style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:none}</style></head><body><iframe src="${proxyUrl}"></iframe><script>document.addEventListener('keydown',function(e){if(e.ctrlKey&&e.key==='l'){e.preventDefault();window.location.href=window.location.origin}})</script></body></html>`);
      doc.close();
      showToast('Cloaked window launched', 'accent');
      logActivity('Launched cloaked proxy', 'proxy');
    } catch (e) {
      showToast('Failed to write cloaked window', 'error');
    }
  }

  document.getElementById('browser-cloaked-btn')?.addEventListener('click', () => {
    const url = document.getElementById('browser-url-input')?.value;
    if (url) launchCloakedProxy(url);
  });

  // ──────────────────────────────────────────
  // PROXY HEALTH CHECK (stealth bar)
  // ──────────────────────────────────────────
  let proxyHealth = { uv: false, scramjet: false, bare: false, wisp: false, lastChecked: 0 };

  async function checkProxyHealth() {
    try {
      const resp = await fetch('/api/proxy/health');
      proxyHealth = await resp.json();
      updateStealthBar();
    } catch (e) {
      proxyHealth = { uv: false, scramjet: false, bare: false, wisp: false, lastChecked: Date.now() };
      updateStealthBar();
    }
  }

  function updateStealthBar() {
    const dot = document.getElementById('stealth-health-dot');
    if (!dot) return;
    const up = [proxyHealth.uv, proxyHealth.scramjet, proxyHealth.bare, proxyHealth.wisp];
    const upCount = up.filter(Boolean).length;
    if (upCount >= 3) { dot.className = 'stealth-health-dot healthy'; dot.title = 'All systems go'; }
    else if (upCount >= 1) { dot.className = 'stealth-health-dot warning'; dot.title = 'Partial service'; }
    else { dot.className = 'stealth-health-dot error'; dot.title = 'Service down'; }
  }

  setInterval(checkProxyHealth, 30000);
  checkProxyHealth();

  // Stealth bar: cloak switcher
  document.getElementById('stealth-cloak-switcher')?.addEventListener('change', (e) => {
    applyCloak(e.target.value);
    showToast(`Tab cloaked as ${CLOAKS[e.target.value]?.title || 'None'}`, 'accent');
  });

  // Stealth bar: breadcrumb text from settings
  const savedBreadcrumb = localStorage.getItem('strato-breadcrumb') || 'Classroom > AP History > Unit 4';
  const breadcrumbEl = document.getElementById('stealth-breadcrumb');
  if (breadcrumbEl) breadcrumbEl.textContent = savedBreadcrumb;

  function updateBreadcrumb(text) {
    localStorage.setItem('strato-breadcrumb', text);
    if (breadcrumbEl) breadcrumbEl.textContent = text;
  }

  // ──────────────────────────────────────────
  // COMMAND PALETTE (Cmd+K / Ctrl+K)
  // ──────────────────────────────────────────
  const commandPalette = document.getElementById('command-palette');
  const cpInput = document.getElementById('command-palette-input');
  const cpResults = document.getElementById('command-palette-results');

  function openCommandPalette() {
    if (!commandPalette) return;
    cpOpen = true;
    commandPalette.classList.remove('hidden');
    cpInput.value = '';
    cpInput.focus();
    renderCommandResults('');
  }

  function closeCommandPalette() {
    if (!commandPalette) return;
    cpOpen = false;
    commandPalette.classList.add('hidden');
    cpInput.value = '';
  }

  function renderCommandResults(query) {
    if (!cpResults) return;
    const q = query.toLowerCase().trim();
    const results = [];

    // Search games
    if (state.games.length > 0) {
      const gameResults = q ? state.games.filter(g => g.name.toLowerCase().includes(q) || (g.category || '').toLowerCase().includes(q)).slice(0, 5) : state.games.slice(0, 5);
      gameResults.forEach(g => results.push({ type: 'game', label: g.name, sub: g.category, action: () => { closeCommandPalette(); launchGame(g.id); } }));
    }

    // Search quick links
    document.querySelectorAll('.quick-link-btn').forEach(btn => {
      const name = btn.textContent.trim();
      const url = btn.dataset.url;
      if (!q || name.toLowerCase().includes(q) || url.toLowerCase().includes(q)) {
        results.push({ type: 'link', label: name, sub: url, action: () => { closeCommandPalette(); navigateProxy(url); } });
      }
    });

    // View switches
    VIEWS.forEach(v => {
      if (!q || v.includes(q)) {
        results.push({ type: 'view', label: `Go to ${v.charAt(0).toUpperCase() + v.slice(1)}`, sub: 'Switch view', action: () => { closeCommandPalette(); switchView(v); } });
      }
    });

    // Actions
    const actions = [
      { label: 'Panic', sub: 'Activate panic mode', match: 'panic', action: () => { closeCommandPalette(); handlePanicKey(); } },
      { label: 'Cloak: Classroom', sub: 'Switch cloak preset', match: 'cloak classroom', action: () => { closeCommandPalette(); applyCloak('classroom'); showToast('Cloaked as Classroom', 'accent'); } },
      { label: 'Cloak: Quizlet', sub: 'Switch cloak preset', match: 'cloak quizlet', action: () => { closeCommandPalette(); applyCloak('quizlet'); showToast('Cloaked as Quizlet', 'accent'); } },
      { label: 'Cloak: Canvas', sub: 'Switch cloak preset', match: 'cloak canvas', action: () => { closeCommandPalette(); applyCloak('canvas'); showToast('Cloaked as Canvas', 'accent'); } },
      { label: 'Cloak: None', sub: 'Remove cloak', match: 'cloak none', action: () => { closeCommandPalette(); applyCloak('none'); showToast('Cloak removed', 'accent'); } },
    ];
    actions.forEach(a => {
      if (!q || a.label.toLowerCase().includes(q) || a.match.includes(q)) results.push({ type: 'action', label: a.label, sub: a.sub, action: a.action });
    });

    // If query looks like a URL, offer to proxy it
    if (q && (q.includes('.') || q.startsWith('http'))) {
      const url = q.startsWith('http') ? q : 'https://' + q;
      results.unshift({ type: 'proxy', label: `Proxy: ${url}`, sub: 'Open in browser', action: () => { closeCommandPalette(); navigateProxy(url); } });
    }

    if (results.length === 0) {
      cpResults.innerHTML = '<div class="command-palette-empty">No results found</div>';
      return;
    }

    const typeLabels = { game: 'Games', link: 'Quick Links', view: 'Views', action: 'Actions', proxy: 'Proxy' };
    let html = '';
    let lastType = '';
    results.slice(0, 12).forEach((r, i) => {
      if (r.type !== lastType) {
        html += `<div class="command-palette-group">${typeLabels[r.type] || r.type}</div>`;
        lastType = r.type;
      }
      html += `<div class="command-palette-item" data-cp-idx="${i}"><span class="cp-item-label">${r.label}</span><span class="cp-item-sub">${r.sub}</span></div>`;
    });
    cpResults.innerHTML = html;

    cpResults.querySelectorAll('.command-palette-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.cpIdx);
        if (results[idx]) results[idx].action();
      });
      item.addEventListener('mouseenter', () => {
        cpResults.querySelectorAll('.command-palette-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
      });
    });
  }

  if (cpInput) {
    cpInput.addEventListener('input', () => renderCommandResults(cpInput.value));
    cpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeCommandPalette(); }
      if (e.key === 'Enter') {
        const sel = cpResults?.querySelector('.command-palette-item.selected, .command-palette-item:first-child');
        if (sel) sel.click();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = cpResults?.querySelectorAll('.command-palette-item');
        if (!items || items.length === 0) return;
        const currentIdx = Array.from(items).findIndex(i => i.classList.contains('selected'));
        items.forEach(i => i.classList.remove('selected'));
        let next = e.key === 'ArrowDown' ? currentIdx + 1 : currentIdx - 1;
        if (next < 0) next = items.length - 1;
        if (next >= items.length) next = 0;
        items[next]?.classList.add('selected');
        items[next]?.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  document.getElementById('command-palette-backdrop')?.addEventListener('click', closeCommandPalette);
  document.getElementById('command-palette-btn')?.addEventListener('click', openCommandPalette);

  // ──────────────────────────────────────────
  // DAILY STREAK SYSTEM
  // ──────────────────────────────────────────
  function updateDailyStreak() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('strato-lastVisit');
    let streak = parseInt(localStorage.getItem('strato-streak') || '0');

    if (lastVisit === today) {
      // Same day, no change
    } else if (lastVisit) {
      const lastDate = new Date(lastVisit);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
        localStorage.setItem('strato-streak', String(streak));
        showToast(`Day ${streak} streak! 🔥`, 'accent');
      } else if (diffDays > 1) {
        streak = 1;
        localStorage.setItem('strato-streak', '1');
      }
    } else {
      streak = 1;
      localStorage.setItem('strato-streak', '1');
    }

    localStorage.setItem('strato-lastVisit', today);

    // Update display
    const countEl = document.getElementById('streak-count');
    const badgeEl = document.getElementById('streak-badge');
    if (countEl) countEl.textContent = streak;

    // Streak unlocks custom accent colors
    if (badgeEl) {
      badgeEl.className = 'streak-badge';
      if (streak >= 14) {
        badgeEl.classList.add('rainbow');
        badgeEl.textContent = '🌈';
        // Apply rainbow cycling accent
        if (state.accentColor !== 'rainbow') {
          state.accentColor = 'rainbow';
          document.documentElement.setAttribute('data-accent', 'cyan'); // base
          startRainbowCycle();
        }
      } else if (streak >= 7) {
        badgeEl.classList.add('gold');
        badgeEl.textContent = '⭐';
      } else if (streak >= 3) {
        badgeEl.classList.add('purple');
        badgeEl.textContent = '💜';
      }
    }
  }

  function startRainbowCycle() {
    const colors = ['cyan', 'purple', 'pink', 'green', 'orange', 'red'];
    let idx = 0;
    setInterval(() => {
      if (state.accentColor !== 'rainbow') return;
      idx = (idx + 1) % colors.length;
      document.documentElement.setAttribute('data-accent', colors[idx]);
    }, 3000);
  }

  updateDailyStreak();

  // ──────────────────────────────────────────
  // AUTO-CLOAK ON IDLE
  // ──────────────────────────────────────────
  let lastActivityTime = Date.now();
  let autoCloakActive = false;

  function getActivityIdleMs() {
    return parseInt(localStorage.getItem('strato-idleSeconds') || '45') * 1000;
  }

  function recordActivity() {
    lastActivityTime = Date.now();
    if (autoCloakActive) dismissAutoCloak();
  }

  function dismissAutoCloak() {
    autoCloakActive = false;
    const overlay = document.getElementById('auto-cloak-overlay');
    if (overlay) overlay.classList.add('hidden');
    // Restore original title/favicon
    const cloak = CLOAKS[state.activeCloak];
    if (cloak) {
      document.title = cloak.title;
      const icon = document.querySelector('link[rel="icon"]');
      if (icon) icon.href = cloak.favicon;
    }
  }

  function triggerAutoCloak() {
    autoCloakActive = true;
    const overlay = document.getElementById('auto-cloak-overlay');
    const iframe = document.getElementById('auto-cloak-iframe');
    if (!overlay || !iframe) return;

    // Change tab to Google Docs
    document.title = 'Google Docs';
    const icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.href = 'https://fonts.gstatic.com/s/i/productlogos/docs_2020q4/v6/192px.svg';

    // Load a fake Google Doc in the overlay iframe
    iframe.srcdoc = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;padding:40px 80px;color:#333;background:#fff}h1{font-size:22px;font-weight:normal;margin-bottom:8px}p{font-size:14px;color:#666;line-height:1.6}.toolbar{height:40px;background:#f1f3f4;border-bottom:1px solid #dadce0;margin:-40px -80px 24px;padding:8px 80px;display:flex;gap:16px;align-items:center}.toolbar span{font-size:13px;color:#5f6368}</style></head><body><div class="toolbar"><span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Format</span><span>Tools</span></div><h1>Untitled document</h1><p>Start typing your document here...</p></body></html>`;
    overlay.classList.remove('hidden');
    logActivity('Auto-cloak activated (idle)', 'proxy');
  }

  setInterval(() => {
    if (autoCloakActive) return;
    const idleMs = Date.now() - lastActivityTime;
    if (idleMs >= getActivityIdleMs()) triggerAutoCloak();
  }, 2000);

  document.addEventListener('mousemove', recordActivity);
  document.addEventListener('keydown', recordActivity);
  document.addEventListener('mousedown', recordActivity);
  document.addEventListener('touchstart', recordActivity);

  // ──────────────────────────────────────────
  // PRELOAD-ON-HOVER
  // ──────────────────────────────────────────
  let hoverPrefetchTimer = null;
  let hoverPrefetchLink = null;

  function startHoverPrefetch(proxyUrl) {
    clearHoverPrefetch();
    hoverPrefetchTimer = setTimeout(() => {
      hoverPrefetchLink = document.createElement('link');
      hoverPrefetchLink.rel = 'prefetch';
      hoverPrefetchLink.href = proxyUrl;
      document.head.appendChild(hoverPrefetchLink);
    }, 400);
  }

  function clearHoverPrefetch() {
    clearTimeout(hoverPrefetchTimer);
    if (hoverPrefetchLink) {
      hoverPrefetchLink.remove();
      hoverPrefetchLink = null;
    }
  }

  // Attach hover prefetch to game cards after render
  function attachHoverPrefetch() {
    document.querySelectorAll('.game-card[data-game-id]').forEach(card => {
      card.addEventListener('mouseenter', () => {
        const game = state.games.find(g => g.id === card.dataset.gameId);
        if (!game || game.tier === 1 || game.tier === 2) return;
        const proxyUrl = getProxyUrl(game.url);
        if (proxyUrl) startHoverPrefetch(proxyUrl);
      });
      card.addEventListener('mouseleave', clearHoverPrefetch);
    });

    document.querySelectorAll('.quick-link-btn[data-url]').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        const proxyUrl = getProxyUrl(btn.dataset.url);
        if (proxyUrl) startHoverPrefetch(proxyUrl);
      });
      btn.addEventListener('mouseleave', clearHoverPrefetch);
    });
  }

  // ──────────────────────────────────────────
  // SESSION PERSISTENCE
  // ──────────────────────────────────────────
  async function saveSession() {
    try {
      const db = await openVault();
      const tx = db.transaction(VAULT_STORE, 'readwrite');
      const store = tx.objectStore(VAULT_STORE);
      store.put({
        gameId: '__session__',
        currentView: state.currentView,
        browserUrl: document.getElementById('browser-url-input')?.value || '',
        searchInput: document.getElementById('home-url-input')?.value || document.getElementById('search-input')?.value || '',
        timestamp: Date.now(),
      });
    } catch (e) {}
  }

  async function restoreSession() {
    try {
      const db = await openVault();
      const tx = db.transaction(VAULT_STORE, 'readonly');
      const store = tx.objectStore(VAULT_STORE);
      const req = store.get('__session__');
      return new Promise((resolve) => {
        req.onsuccess = () => {
          const session = req.result;
          if (session && session.timestamp && (Date.now() - session.timestamp) < 10 * 60 * 1000) {
            resolve(session);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch (e) { return null; }
  }

  // Auto-save session periodically
  setInterval(saveSession, 5000);

  // Check for session restore on load
  async function checkSessionRestore() {
    const session = await restoreSession();
    if (!session) return;
    showToast('Resume previous session?', 'accent');
    // Auto-restore after a brief moment
    setTimeout(() => {
      if (session.currentView) switchView(session.currentView);
      if (session.browserUrl && session.currentView === 'browser') {
        const urlInput = document.getElementById('browser-url-input');
        if (urlInput) urlInput.value = session.browserUrl;
      }
      if (session.searchInput) {
        const homeInput = document.getElementById('home-url-input');
        const searchInput = document.getElementById('search-input');
        if (homeInput) homeInput.value = session.searchInput;
        if (searchInput) searchInput.value = session.searchInput;
      }
      showToast('Session restored', 'accent');
    }, 1500);
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
    updateCoinsDisplay();
    initDailyChallenges();
    checkSessionRestore();

    // Load Hub sites
    loadHubSites();

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
