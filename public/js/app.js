/* ══════════════════════════════════════════════════════════
   STRATO v12 — CHROMATIC STORM (Ultra-Maximalist)
   Client Application: Particle system, games, proxy, AI, tab cloak
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ──────────────────────────────────────────
  // PARTICLE SYSTEM — Cosmic background
  // ──────────────────────────────────────────
  const canvas = document.getElementById('particle-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 80;
    const COLORS = [
      'rgba(0,229,255,',   // cyan
      'rgba(168,85,247,',  // purple
      'rgba(244,114,182,', // pink
      'rgba(34,197,94,',   // green
      'rgba(251,146,60,',  // orange
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
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        alphaDir: Math.random() > 0.5 ? 0.002 : -0.002,
        color: color,
      };
    }

    function initParticles() {
      resizeCanvas();
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle());
      }
    }

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Pulse alpha
        p.alpha += p.alphaDir;
        if (p.alpha > 0.5) { p.alpha = 0.5; p.alphaDir = -0.002; }
        if (p.alpha < 0.05) { p.alpha = 0.05; p.alphaDir = 0.002; }

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.fill();

        // Outer glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (p.alpha * 0.2) + ')';
        ctx.fill();
      }

      // Draw connections between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.08;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,229,255,${alpha})`;
            ctx.lineWidth = 0.5;
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
  const state = {
    currentView: 'home',
    currentEngine: localStorage.getItem('strato-engine') || 'uv',
    autoFallback: localStorage.getItem('strato-autoFallback') !== 'false',
    panicKey: localStorage.getItem('strato-panicKey') || '`',
    activeCloak: localStorage.getItem('strato-cloak') || 'none',
    games: [],
    filteredGames: [],
    aiMessages: [],
    aiOnline: false,
    proxyReady: false,
    unavailableGames: JSON.parse(localStorage.getItem('strato-unavailable') || '{}'),
    recentlyPlayed: JSON.parse(localStorage.getItem('strato-recent') || '[]'),
    changingPanicKey: false,
  };

  // ──────────────────────────────────────────
  // TAB CLOAKS
  // ──────────────────────────────────────────
  const CLOAKS = {
    none:      { title: 'STRATO',                  favicon: '/favicon.ico' },
    classroom: { title: 'Classes',                 favicon: '/cloaks/classroom.ico', url: 'https://classroom.google.com' },
    quizlet:   { title: 'Your Sets | Quizlet',     favicon: '/cloaks/quizlet.ico',   url: 'https://quizlet.com' },
    canvas:    { title: 'Dashboard',               favicon: '/cloaks/canvas.ico',    url: 'https://canvas.instructure.com' },
    clever:    { title: 'Clever | Portal',         favicon: '/cloaks/clever.ico',    url: 'https://clever.com' },
    ixl:       { title: 'IXL | Math',              favicon: '/cloaks/ixl.ico',       url: 'https://ixl.com' },
  };

  function applyCloak(key) {
    const cloak = CLOAKS[key];
    if (!cloak) return;
    state.activeCloak = key;
    localStorage.setItem('strato-cloak', key);

    document.title = cloak.title;
    const existingIcon = document.querySelector('link[rel="icon"]');
    if (existingIcon) {
      existingIcon.href = cloak.favicon;
    } else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = cloak.favicon;
      document.head.appendChild(link);
    }
  }

  // ──────────────────────────────────────────
  // PANIC KEY — ZERO ANIMATION, INSTANT SWAP
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
      document.getElementById('setting-panic-key').value = e.key;
      state.changingPanicKey = false;
      showToast('Panic key updated', 'accent');
      return;
    }

    if (e.key === state.panicKey) {
      handlePanicKey();
    }
  });

  // ──────────────────────────────────────────
  // VIEW SWITCHING
  // ──────────────────────────────────────────
  const VIEWS = ['home', 'arcade', 'browser', 'ai', 'settings'];

  function switchView(viewName) {
    if (!VIEWS.includes(viewName)) return;

    document.querySelectorAll('.view').forEach((el) => {
      el.classList.remove('view-active');
    });

    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.add('view-active');
    }

    document.querySelectorAll('.nav-link, .bottom-link').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    state.currentView = viewName;
  }

  // Top nav click handlers
  document.querySelectorAll('.nav-link, .bottom-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.view) {
        switchView(btn.dataset.view);
      }
    });
  });

  // Category circle navigation
  document.querySelectorAll('.category-circle').forEach((circle) => {
    circle.addEventListener('click', () => {
      const target = circle.dataset.nav;
      if (target) switchView(target);
    });
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

    if (engine === 'uv') {
      return `/frog/${encodeURIComponent(url)}`;
    } else {
      return `/scramjet/${encodeURIComponent(url)}`;
    }
  }

  function setEngine(engine) {
    state.currentEngine = engine;
    localStorage.setItem('strato-engine', engine);

    document.querySelectorAll('[data-engine]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.engine === engine);
    });

    const label = document.getElementById('proxy-label');
    if (label) {
      label.textContent = engine === 'uv' ? 'Ultraviolet' : 'Scramjet';
    }

    const settingEngine = document.getElementById('setting-engine');
    if (settingEngine) settingEngine.value = engine;
  }

  // Engine pill click handlers
  document.querySelectorAll('[data-engine]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setEngine(btn.dataset.engine);
    });
  });

  // Auto-fallback toggle
  const autoFallbackToggle = document.getElementById('auto-fallback-toggle');
  const settingAutoFallback = document.getElementById('setting-auto-fallback');

  function setAutoFallback(on) {
    state.autoFallback = on;
    localStorage.setItem('strato-autoFallback', String(on));

    [autoFallbackToggle, settingAutoFallback].forEach((el) => {
      if (!el) return;
      if (on) el.classList.add('on');
      else el.classList.remove('on');
    });
  }

  [autoFallbackToggle, settingAutoFallback].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => {
      setAutoFallback(!state.autoFallback);
    });
  });

  if (autoFallbackToggle && state.autoFallback) autoFallbackToggle.classList.add('on');
  if (settingAutoFallback && state.autoFallback) settingAutoFallback.classList.add('on');

  // ── Navigate proxy ──
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

    if (state.autoFallback) {
      const fallbackTimer = setTimeout(() => {
        const otherEngine = targetEngine === 'uv' ? 'scramjet' : 'uv';
        const fallbackUrl = getProxyUrl(url, otherEngine);
        logProxyFailure(targetEngine, url, 'ETIMEDOUT', true, false);
        setEngine(otherEngine);
        iframe.src = fallbackUrl;
        showToast(`Switched to ${otherEngine === 'uv' ? 'Ultraviolet' : 'Scramjet'} — retrying...`, 'accent');
      }, 15_000);

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
          logProxyFailure(targetEngine, url, 'ECONNREFUSED', true, null);
          setEngine(otherEngine);
          iframe.src = getProxyUrl(url, otherEngine);
          showToast(`Switched to ${otherEngine === 'uv' ? 'Ultraviolet' : 'Scramjet'} — retrying...`, 'accent');
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

  // ── Proxy failure log ──
  function logProxyFailure(engine, url, error, fallbackAttempted, fallbackSuccess) {
    const log = JSON.parse(localStorage.getItem('strato-failureLog') || '[]');
    log.push({ engine, url, error, timestamp: Date.now(), fallbackAttempted, fallbackSuccess });
    while (log.length > 50) log.shift();
    localStorage.setItem('strato-failureLog', JSON.stringify(log));
  }

  // ── Home URL bar ──
  const homeUrlInput = document.getElementById('home-url-input');
  const homeGoBtn = document.getElementById('home-go-btn');

  if (homeGoBtn) {
    homeGoBtn.addEventListener('click', () => {
      navigateProxy(homeUrlInput.value);
    });
  }

  if (homeUrlInput) {
    homeUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        navigateProxy(homeUrlInput.value);
      }
    });
  }

  // ── Browser URL bar ──
  const browserUrlInput = document.getElementById('browser-url-input');
  const browserGoBtn = document.getElementById('browser-go-btn');

  if (browserGoBtn) {
    browserGoBtn.addEventListener('click', () => {
      navigateProxy(browserUrlInput.value);
    });
  }

  if (browserUrlInput) {
    browserUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        navigateProxy(browserUrlInput.value);
      }
    });
  }

  // ── Proxy switch engine message listener ──
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
    } catch (err) {
      console.error('[STRATO] Failed to load games:', err);
      showToast('Failed to load game library', 'error');
    }
  }

  function renderGames() {
    const grid = document.getElementById('game-grid');
    if (!grid) return;

    const showUnavailable = document.getElementById('show-unavailable')?.checked || false;

    grid.innerHTML = state.filteredGames
      .filter((game) => {
        if (!showUnavailable && state.unavailableGames[game.id] >= 3) return false;
        return true;
      })
      .map((game) => {
        const isUnavailable = (state.unavailableGames[game.id] || 0) >= 3;
        const tierClass = `tier-${game.tier}`;
        return `
          <div class="game-card glass ${isUnavailable ? 'unavailable' : ''}" data-game-id="${game.id}">
            <div class="game-card-inner">
              <span class="tier-badge ${tierClass}">T${game.tier}</span>
              <img class="game-card-thumb" src="${game.thumbnail}" alt="${game.name}" loading="lazy" onerror="this.style.display='none'">
              <div class="game-card-info">
                <div class="game-card-name">${game.name}</div>
                <div class="game-card-category">${game.category}</div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    grid.querySelectorAll('.game-card:not(.unavailable)').forEach((card) => {
      card.addEventListener('click', () => {
        launchGame(card.dataset.gameId);
      });
    });
  }

  function renderFeatured() {
    const scroll = document.getElementById('featured-scroll');
    if (!scroll) return;

    const featured = [...state.games]
      .sort((a, b) => a.tier - b.tier)
      .slice(0, 10);

    scroll.innerHTML = featured.map((game) => `
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

    scroll.querySelectorAll('.game-card').forEach((card) => {
      card.addEventListener('click', () => {
        launchGame(card.dataset.gameId);
      });
    });
  }

  function launchGame(gameId) {
    const game = state.games.find((g) => g.id === gameId);
    if (!game) return;

    state.recentlyPlayed = state.recentlyPlayed.filter((id) => id !== gameId);
    state.recentlyPlayed.unshift(gameId);
    if (state.recentlyPlayed.length > 20) state.recentlyPlayed.pop();
    localStorage.setItem('strato-recent', JSON.stringify(state.recentlyPlayed));

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

  // ── Game search ──
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        filterGames();
      }, 200);
    });
  }

  // ── Category filter ──
  let activeCategories = new Set(['all']);

  document.getElementById('category-pills')?.addEventListener('click', (e) => {
    const pill = e.target.closest('.glass-pill');
    if (!pill) return;

    const cat = pill.dataset.category;

    if (cat === 'all') {
      activeCategories = new Set(['all']);
      document.querySelectorAll('#category-pills .glass-pill').forEach((p) => {
        p.classList.toggle('active', p.dataset.category === 'all');
      });
    } else {
      activeCategories.delete('all');
      document.querySelector('#category-pills [data-category="all"]')?.classList.remove('active');

      if (activeCategories.has(cat)) {
        activeCategories.delete(cat);
        pill.classList.remove('active');
      } else {
        activeCategories.add(cat);
        pill.classList.add('active');
      }

      if (activeCategories.size === 0) {
        activeCategories = new Set(['all']);
        document.querySelector('#category-pills [data-category="all"]')?.classList.add('active');
      }
    }

    filterGames();
  });

  // ── Sort ──
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      filterGames();
    });
  }

  // ── Show unavailable ──
  const showUnavailableCheckbox = document.getElementById('show-unavailable');
  if (showUnavailableCheckbox) {
    showUnavailableCheckbox.addEventListener('change', () => {
      renderGames();
    });
  }

  function filterGames() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    const sort = sortSelect?.value || 'popular';

    state.filteredGames = state.games.filter((game) => {
      if (!activeCategories.has('all') && !activeCategories.has(game.category)) return false;
      if (query) {
        const nameMatch = game.name.toLowerCase().includes(query);
        const descMatch = (game.description || '').toLowerCase().includes(query);
        if (!nameMatch && !descMatch) return false;
      }
      return true;
    });

    switch (sort) {
      case 'az':
        state.filteredGames.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
        state.filteredGames.sort((a, b) => {
          const aIdx = state.recentlyPlayed.indexOf(a.id);
          const bIdx = state.recentlyPlayed.indexOf(b.id);
          if (aIdx === -1 && bIdx === -1) return 0;
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
        break;
      case 'random':
        state.filteredGames.sort(() => Math.random() - 0.5);
        break;
      case 'popular':
      default:
        state.filteredGames.sort((a, b) => a.tier - b.tier);
        break;
    }

    renderGames();
  }

  // ──────────────────────────────────────────
  // STRATOVAULT — IndexedDB Game Cache
  // ──────────────────────────────────────────
  const VAULT_DB = 'stratoVault';
  const VAULT_STORE = 'gameCache';
  const VAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  async function openVault() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(VAULT_DB, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(VAULT_STORE)) {
          db.createObjectStore(VAULT_STORE, { keyPath: 'gameId' });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function cacheGame(gameId, html) {
    try {
      const db = await openVault();
      const tx = db.transaction(VAULT_STORE, 'readwrite');
      const store = tx.objectStore(VAULT_STORE);
      store.put({ gameId, html, cachedAt: Date.now() });
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[StratoVault] Failed to cache game:', err);
    }
  }

  async function getCachedGame(gameId) {
    try {
      const db = await openVault();
      const tx = db.transaction(VAULT_STORE, 'readonly');
      const store = tx.objectStore(VAULT_STORE);
      const req = store.get(gameId);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => {
          const result = req.result;
          if (result && Date.now() - result.cachedAt < VAULT_MAX_AGE) {
            resolve(result.html);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async function clearVault() {
    try {
      const db = await openVault();
      const tx = db.transaction(VAULT_STORE, 'readwrite');
      tx.objectStore(VAULT_STORE).clear();
      await new Promise((resolve) => { tx.oncomplete = resolve; });
      showToast('Game cache cleared', 'accent');
      updateCacheSize();
    } catch (err) {
      showToast('Failed to clear cache', 'error');
    }
  }

  async function updateCacheSize() {
    try {
      const estimate = await navigator.storage.estimate();
      const sizeMB = (estimate.usage / (1024 * 1024)).toFixed(1);
      const el = document.getElementById('cache-size');
      if (el) el.textContent = `${sizeMB} MB`;
    } catch {
      // Silently ignore
    }
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
      if (aiDot) {
        aiDot.classList.toggle('error', !data.online);
      }

      if (aiOfflineBanner) {
        aiOfflineBanner.classList.toggle('hidden', data.online);
      }
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

    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const csrfToken = csrfMeta?.content || '';

      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ messages: state.aiMessages }),
      });

      const data = await resp.json();

      if (resp.ok && data.message) {
        addAiBubble('assistant', data.message.content);
        state.aiMessages.push(data.message);
      } else {
        addAiBubble('error', data.error || 'Unknown error occurred');
      }
    } catch (err) {
      addAiBubble('error', 'Failed to reach AI service');
    }
  }

  if (aiSendBtn) {
    aiSendBtn.addEventListener('click', sendAiMessage);
  }

  if (aiInput) {
    aiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendAiMessage();
      }
    });
  }

  // ──────────────────────────────────────────
  // SNAP & SOLVE
  // ──────────────────────────────────────────
  let snapImage = null;
  let snapPrompt = 'Solve this question step by step. Show your work and give the final answer clearly.';
  let snapSolving = false;

  document.querySelectorAll('[data-ai-mode]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-ai-mode]').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.dataset.aiMode;
      document.getElementById('ai-chat-panel')?.classList.toggle('hidden', mode !== 'chat');
      document.getElementById('ai-snap-panel')?.classList.toggle('hidden', mode !== 'snap');
    });
  });

  document.getElementById('snap-fab')?.addEventListener('click', () => {
    switchView('ai');
    document.querySelectorAll('[data-ai-mode]').forEach((t) => t.classList.remove('active'));
    document.querySelector('[data-ai-mode="snap"]')?.classList.add('active');
    document.getElementById('ai-chat-panel')?.classList.add('hidden');
    document.getElementById('ai-snap-panel')?.classList.remove('hidden');
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      document.getElementById('snap-fab')?.click();
    }
  });

  const snapDropZone = document.getElementById('snap-drop-zone');
  const snapFileInput = document.getElementById('snap-file-input');

  snapDropZone?.addEventListener('click', () => {
    snapFileInput?.click();
  });

  snapFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleSnapFile(file);
  });

  snapDropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    snapDropZone.classList.add('dragover');
  });

  snapDropZone?.addEventListener('dragleave', () => {
    snapDropZone.classList.remove('dragover');
  });

  snapDropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    snapDropZone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) handleSnapFile(file);
  });

  document.addEventListener('paste', (e) => {
    const snapPanel = document.getElementById('ai-snap-panel');
    if (snapPanel?.classList.contains('hidden') && state.currentView !== 'ai') return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          switchView('ai');
          document.querySelectorAll('[data-ai-mode]').forEach((t) => t.classList.remove('active'));
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

      const previewContainer = document.getElementById('snap-preview-container');
      const previewImg = document.getElementById('snap-preview-img');
      const dropZone = document.getElementById('snap-drop-zone');
      const solveBtn = document.getElementById('snap-solve-btn');

      if (previewImg) previewImg.src = snapImage;
      previewContainer?.classList.remove('hidden');
      dropZone?.classList.add('hidden');
      if (solveBtn) solveBtn.disabled = false;

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

  document.querySelectorAll('.snap-prompt-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.snap-prompt-pill').forEach((p) => p.classList.remove('active'));
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

    if (solveBtn) {
      solveBtn.disabled = true;
      solveBtn.textContent = 'Solving...';
    }
    resultDiv?.classList.add('hidden');

    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const csrfToken = csrfMeta?.content || '';

      const resp = await fetch('/api/ai/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ image: snapImage, prompt: snapPrompt }),
      });

      const data = await resp.json();

      if (resp.ok && data.message) {
        if (resultContent) resultContent.textContent = data.message.content;
        resultDiv?.classList.remove('hidden');
      } else {
        showToast(data.error || 'Failed to solve', 'error');
      }
    } catch (err) {
      showToast('Failed to reach AI service', 'error');
    } finally {
      snapSolving = false;
      if (solveBtn) {
        solveBtn.disabled = false;
        solveBtn.textContent = 'Solve Question';
      }
    }
  }

  document.getElementById('snap-copy-btn')?.addEventListener('click', () => {
    const content = document.getElementById('snap-result-content')?.textContent;
    if (content) {
      navigator.clipboard.writeText(content).then(() => {
        showToast('Answer copied', 'accent');
      }).catch(() => {
        showToast('Failed to copy', 'error');
      });
    }
  });

  // ──────────────────────────────────────────
  // HEALTH CHECK
  // ──────────────────────────────────────────
  async function healthCheck() {
    try {
      const resp = await fetch('/health');
      const data = await resp.json();

      const dot = document.getElementById('connection-dot');
      const browserDot = document.getElementById('browser-connection-dot');

      [dot, browserDot].forEach((d) => {
        if (!d) return;
        if (data.status === 'ok') {
          d.className = 'connection-dot browser-dot';
        } else {
          d.className = 'connection-dot browser-dot warning';
        }
      });

      const engineStatus = document.getElementById('engine-status');
      if (engineStatus) {
        const uvStatus = data.engines?.uv ? 'OK' : 'Down';
        const sjStatus = data.engines?.scramjet ? 'OK' : 'Down';
        engineStatus.textContent = `UV: ${uvStatus} | SJ: ${sjStatus}`;
      }
    } catch {
      const dot = document.getElementById('connection-dot');
      const browserDot = document.getElementById('browser-connection-dot');
      [dot, browserDot].forEach((d) => {
        if (d) d.className = 'connection-dot browser-dot error';
      });
    }
  }

  setInterval(healthCheck, 30_000);

  // ──────────────────────────────────────────
  // SETTINGS
  // ──────────────────────────────────────────
  document.getElementById('setting-engine')?.addEventListener('change', (e) => {
    setEngine(e.target.value);
  });

  document.getElementById('setting-cloak')?.addEventListener('change', (e) => {
    applyCloak(e.target.value);
    showToast(`Tab cloaked as ${CLOAKS[e.target.value]?.title || 'None'}`, 'accent');
  });

  document.getElementById('change-panic-key')?.addEventListener('click', () => {
    state.changingPanicKey = true;
    document.getElementById('setting-panic-key').value = '...';
    showToast('Press any key to set as panic key', 'accent');
  });

  // ──────────────────────────────────────────
  // USERNAME DISPLAY
  // ──────────────────────────────────────────
  function getUsername() {
    // Try to get username from cookie (it's signed, so we can't read it directly)
    // Instead, we'll display a generic greeting or try from localStorage
    const saved = localStorage.getItem('strato-username');
    if (saved) return saved;
    return '';
  }

  // ──────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────
  async function init() {
    const splash = document.getElementById('splash');
    const splashBar = splash?.querySelector('.splash-bar');
    const splashStatus = splash?.querySelector('.splash-status');

    // Step 1: Initialize proxy transport
    if (splashBar) splashBar.style.width = '20%';
    if (splashStatus) splashStatus.textContent = 'Initializing proxy transport...';

    try {
      await new Promise((resolve) => {
        const onReady = () => {
          window.removeEventListener('proxy-ready', onReady);
          state.proxyReady = true;
          resolve();
        };
        window.addEventListener('proxy-ready', onReady);

        setTimeout(() => {
          window.removeEventListener('proxy-ready', onReady);
          resolve();
        }, 8000);
      });
    } catch (err) {
      console.warn('[STRATO] Transport init error:', err);
    }

    // Step 2: Load games
    if (splashBar) splashBar.style.width = '50%';
    if (splashStatus) splashStatus.textContent = 'Loading game library...';
    await loadGames();

    // Step 3: Check AI status
    if (splashBar) splashBar.style.width = '75%';
    if (splashStatus) splashStatus.textContent = 'Checking AI service...';
    await checkAiStatus();

    // Step 4: Health check
    if (splashBar) splashBar.style.width = '90%';
    if (splashStatus) splashStatus.textContent = 'Running health check...';
    await healthCheck();

    // Step 5: Apply saved settings
    if (splashBar) splashBar.style.width = '100%';
    if (splashStatus) splashStatus.textContent = 'Ready';

    if (state.activeCloak !== 'none') {
      applyCloak(state.activeCloak);
    }

    setEngine(state.currentEngine);
    updateCacheSize();

    // Display username
    const usernameEl = document.getElementById('username-display');
    const username = getUsername();
    if (usernameEl && username) {
      usernameEl.textContent = `@${username}`;
    }

    // Fade out splash and show the app
    setTimeout(() => {
      const appEl = document.getElementById('app');
      if (appEl) appEl.classList.remove('hidden');

      if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 500);
      }
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
