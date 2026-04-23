/**
 * STRATO Game Engine v3.0 — The "Strato CDN" Injector
 * ====================================================
 * Dynamic, resilient game fetching system that functions like a built-in app store.
 *
 * Features:
 *   • Multi-source game registry (local JSON + external GitHub repos)
 *   • StratoVault — IndexedDB cache for instant-load game assets
 *   • Theater Mode — seamless fullscreen game experience
 *   • Auto iframe scaling & ad-stripping
 *   • Metadata engine with categories, thumbnails, and popularity scores
 *
 * No build tools. Pure vanilla JS + IndexedDB.
 */

const StratoGameEngine = (() => {
  'use strict';

  // ── HTML Escape Utility ────────────────────────────────
  // Prevents XSS when injecting external game metadata into innerHTML
  const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  function esc(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
  }

  // ── Configuration ─────────────────────────────────────
  const CONFIG = {
    DB_NAME: 'stratovault',
    DB_VERSION: 3,
    RENDER_LIMIT: 150,
    INFINITE_SCROLL_THRESHOLD: 600,
    DEBOUNCE_MS: 60,
    EXTERNAL_SOURCES: [
      {
        name: 'Selenite',
        url: 'https://raw.githubusercontent.com/selenite-emu/selenite/refs/heads/main/src/static/json/apps.json',
        type: 'selenite',
      },
      {
        name: '3kh0-Lite',
        url: 'https://raw.githubusercontent.com/3kh0-website/3kh0-assets/refs/heads/main/json/games.json',
        type: '3kh0',
      },
      {
        name: 'Interstellar',
        url: 'https://raw.githubusercontent.com/InterstellarNetwork/Interstellar/refs/heads/main/games.json',
        type: 'interstellar',
      },
      {
        name: 'Nebula',
        url: 'https://raw.githubusercontent.com/NebulaServices/Nebula/refs/heads/main/json/games.json',
        type: 'nebula',
      },
    ],
    LOCAL_GAME_PATH: '/assets/games.json',
    FALLBACK_GAME_PATH: '/config/games.json',
    CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
    AD_SELECTORS: [
      'iframe[src*="ad"]',
      'iframe[src*="doubleclick"]',
      'iframe[src*="googlesyndication"]',
      'iframe[src*="amazon-adsystem"]',
      'div[id*="ad-"]',
      'div[class*="ad-"]',
      'div[id*="advertisement"]',
      'ins[class*="adsbygoogle"]',
      '#ads',
      '.ad-container',
      '.ad-banner',
      '.ad-wrapper',
    ],
  };

  // ── State ─────────────────────────────────────────────
  const state = {
    allGames: [],           // Master list of all games (normalized)
    filteredGames: [],      // After category + search filter
    activeCategory: 'All',
    searchQuery: '',
    currentLimit: CONFIG.RENDER_LIMIT,
    isLoading: false,
    externalLoaded: 0,
    db: null,               // IndexedDB reference
    proxyReady: false,
  };

  // ── IndexedDB — StratoVault ──────────────────────────
  const Vault = {
    _db: null,

    async init() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('games')) {
            db.createObjectStore('games', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('meta')) {
            const metaStore = db.createObjectStore('meta', { keyPath: 'key' });
            metaStore.createIndex('expires', 'expires');
          }
        };
        req.onsuccess = (e) => {
          this._db = e.target.result;
          state.db = e.target.result;
          resolve(this._db);
        };
        req.onerror = (e) => reject(e.target.error);
      });
    },

    async put(gameData) {
      if (!this._db) return;
      if (!gameData.id) {
        gameData.id = 'gen-' + (gameData.name || Date.now()).toString().toLowerCase().replace(/[^a-z0-9]/g, '-');
      }
      const tx = this._db.transaction('games', 'readwrite');
      tx.objectStore('games').put({
        ...gameData,
        _cachedAt: Date.now(),
      });
    },

    async get(id) {
      if (!this._db) return null;
      return new Promise((resolve) => {
        const tx = this._db.transaction('games', 'readonly');
        const req = tx.objectStore('games').get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    },

    async putMeta(key, value, ttlMs = CONFIG.CACHE_TTL) {
      if (!this._db) return;
      const tx = this._db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({
        key,
        value,
        expires: Date.now() + ttlMs,
      });
    },

    async getMeta(key) {
      if (!this._db) return null;
      return new Promise((resolve) => {
        const tx = this._db.transaction('meta', 'readonly');
        const req = tx.objectStore('meta').get(key);
        req.onsuccess = () => {
          const result = req.result;
          if (result && result.expires > Date.now()) {
            resolve(result.value);
          } else {
            resolve(null); // expired or missing
          }
        };
        req.onerror = () => resolve(null);
      });
    },

    async clear() {
      if (!this._db) return;
      const tx = this._db.transaction(['games', 'meta'], 'readwrite');
      tx.objectStore('games').clear();
      tx.objectStore('meta').clear();
    },

    async count() {
      if (!this._db) return 0;
      return new Promise((resolve) => {
        const tx = this._db.transaction('games', 'readonly');
        const req = tx.objectStore('games').count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      });
    },
  };

  // ── Normalization — unify game data from any source ───
  function normalizeGame(raw, source = 'local') {
    const id = raw.id || raw.slug || raw.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || `game-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    return {
      id,
      name: raw.name || raw.title || 'Unknown Game',
      category: raw.category || raw.genre || raw.type || 'Other',
      thumbnail: raw.thumbnail || raw.img || raw.image || raw.icon || raw.logo || '',
      url: raw.url || raw.link || raw.href || raw.iframe_url || '',
      description: raw.description || raw.desc || raw.about || '',
      source,          // 'local', 'selenite', '3kh0', etc.
      popularity: raw.popularity || raw.rating || (raw.playCount ? Math.min(raw.playCount / 1000, 100) : 50),
      tags: raw.tags || [],
      dev: raw.dev || raw.author || raw.developer || '',
      isExternal: source !== 'local',
    };
  }

  // ── Fetchers ──────────────────────────────────────────
  async function fetchLocalGames() {
    const cacheKey = 'local-games';
    const cached = await Vault.getMeta(cacheKey);
    if (cached) return cached;

    try {
      const resp = await fetch(CONFIG.LOCAL_GAME_PATH);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const games = Array.isArray(data) ? data : data.games || [];

      // Cache the result
      await Vault.putMeta(cacheKey, games);
      return games;
    } catch (err) {
      console.warn('[StratoEngine] Local fetch failed, trying fallback:', err.message);
      try {
        const resp = await fetch(CONFIG.FALLBACK_GAME_PATH);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        return Array.isArray(data) ? data : data.games || [];
      } catch {
        console.warn('[StratoEngine] Fallback also failed. Empty local library.');
        return [];
      }
    }
  }

  async function fetchExternalSource(source) {
    const cacheKey = `external-${source.name}`;
    const cached = await Vault.getMeta(cacheKey);
    if (cached) return cached;

    try {
      const resp = await fetch(source.url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const raw = await resp.json();

      let games = [];
      if (source.type === 'selenite') {
        games = (raw.Categories || []).flatMap((cat) =>
          (cat.apps || []).map((app) => ({
            ...app,
            category: cat.name || app.category || 'Apps',
          }))
        );
      } else if (source.type === '3kh0') {
        games = Array.isArray(raw) ? raw : raw.games || [];
      } else {
        games = Array.isArray(raw) ? raw : [];
      }

      await Vault.putMeta(cacheKey, games, CONFIG.CACHE_TTL);
      return games;
    } catch (err) {
      console.warn(`[StratoEngine] External source "${source.name}" failed:`, err.message);
      return [];
    }
  }

  // ── Core Engine ───────────────────────────────────────
  async function loadAllGames() {
    state.isLoading = true;
    updateGameCount('Loading...');

    // 1. Initialize Vault
    await Vault.init();

    // 2. Fetch local games
    const localRaw = await fetchLocalGames();
    const localGames = localRaw.map((g) => normalizeGame(g, 'local'));
    state.allGames = [...localGames];
    renderGrid(state.allGames);

    // 3. Fetch external sources in parallel
    const externalPromises = CONFIG.EXTERNAL_SOURCES.map(async (source) => {
      const raw = await fetchExternalSource(source);
      const games = raw.map((g) => normalizeGame(g, source.type));
      state.allGames.push(...games);
      state.externalLoaded++;
      applyFilters();
    });

    await Promise.allSettled(externalPromises);

    // Deduplicate by ID
    const seen = new Set();
    state.allGames = state.allGames.filter((g) => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });

    // Sort by popularity descending
    state.allGames.sort((a, b) => b.popularity - a.popularity);

    state.isLoading = false;
    applyFilters();
    buildCategoryBar();

    console.log(`[StratoEngine] Loaded ${state.allGames.length} games from ${state.externalLoaded + 1} sources. Vault: ${await Vault.count()} cached.`);
  }

  // ── Category Bar ──────────────────────────────────────
  function buildCategoryBar() {
    const bar = document.getElementById('category-bar');
    if (!bar) return;

    const cats = ['All', ...new Set(state.allGames.map((g) => g.category).filter(Boolean))];
    bar.innerHTML = '';

    cats.forEach((cat) => {
      const pill = document.createElement('div');
      pill.className = `category-pill${cat === state.activeCategory ? ' active' : ''}`;
      pill.textContent = cat;
      pill.addEventListener('click', () => {
        state.activeCategory = cat;
        document.querySelectorAll('.category-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        applyFilters();
      });
      bar.appendChild(pill);
    });
  }

  // ── Search & Filter ───────────────────────────────────
  function applyFilters() {
    let games = state.allGames;

    // Category filter
    if (state.activeCategory !== 'All') {
      games = games.filter((g) => g.category === state.activeCategory);
    }

    // Search filter — fuzzy scoring
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const scored = games.map((g) => {
        const name = g.name.toLowerCase();
        const tags = (g.tags || []).join(' ').toLowerCase();
        const cat = g.category.toLowerCase();
        const desc = g.description.toLowerCase();

        let score = 0;
        if (name === q) score = 100;
        else if (name.startsWith(q)) score = 80;
        else if (name.includes(q)) score = 60;
        else if (tags.includes(q)) score = 40;
        else if (cat.includes(q)) score = 30;
        else if (desc.includes(q)) score = 20;
        else {
          // Character matching (each char in order)
          let ci = 0;
          for (let i = 0; i < q.length && ci < name.length; i++) {
            if (q[i] === name[ci]) ci++;
          }
          score = ci > q.length * 0.5 ? 15 : 0;
        }
        return { game: g, score };
      });

      games = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.game);
    }

    state.filteredGames = games;
    state.currentLimit = CONFIG.RENDER_LIMIT;
    renderGrid(games.slice(0, state.currentLimit));
    updateGameCount(`${games.length} games`);
  }

  function updateGameCount(text) {
    const el = document.getElementById('game-count');
    if (el) el.textContent = text;
  }

  // ── Grid Rendering ────────────────────────────────────
  function renderGrid(games) {
    const grid = document.getElementById('game-grid');
    if (!grid) return;

    // Clear skeletons or existing tiles
    grid.innerHTML = '';

    if (!games || games.length === 0) {
      grid.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-txt-muted col-span-full">
          <span class="text-3xl mb-2">🎮</span>
          <span class="text-sm">No games found</span>
        </div>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    games.forEach((game, i) => {
      const tile = createTile(game, i);
      fragment.appendChild(tile);
    });

    grid.appendChild(fragment);

    // Lazy-load images
    initLazyImages(grid);
  }

  function appendGrid(newGames, startIndex) {
    const grid = document.getElementById('game-grid');
    if (!grid) return;

    const fragment = document.createDocumentFragment();
    newGames.forEach((game, i) => {
      fragment.appendChild(createTile(game, startIndex + i));
    });
    grid.appendChild(fragment);
    initLazyImages(grid);
  }

  function createTile(game, index) {
    const tile = document.createElement('div');
    tile.className = 'game-tile tile-enter';
    tile.style.animationDelay = `${Math.min(index * 30, 400)}ms`;
    tile.dataset.id = game.id;
    tile.dataset.name = game.name;
    tile.dataset.url = game.url;
    tile.dataset.category = game.category;

    if (game.thumbnail) {
      tile.innerHTML = `
        <img class="tile-img" data-src="${esc(game.thumbnail)}" alt="${esc(game.name)}" loading="lazy" />
        <div class="tile-overlay">
          <div class="tile-name">${esc(game.name)}</div>
          <div class="tile-category">${esc(game.category)}${game.source !== 'local' ? ' &middot; ' + esc(game.source) : ''}</div>
        </div>
        <div class="play-indicator">
          <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
        </div>`;
    } else {
      tile.innerHTML = `
        <div class="tile-fallback">
          <span class="fallback-icon">🎮</span>
          <span class="fallback-title">${esc(game.name)}</span>
        </div>
        <div class="play-indicator">
          <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
        </div>`;
    }

    tile.addEventListener('click', () => {
      openTheater(game);
    });

    return tile;
  }

  // ── Lazy Image Loading ────────────────────────────────
  function initLazyImages(container) {
    const images = container.querySelectorAll('img[data-src]');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target;
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              img.onerror = () => {
                img.style.display = 'none';
                const fallback = img.parentElement.querySelector('.tile-fallback');
                if (fallback) fallback.style.display = 'flex';
              };
              observer.unobserve(img);
            }
          });
        },
        { rootMargin: '300px' }
      );
      images.forEach((img) => observer.observe(img));
    } else {
      // Fallback: load all immediately
      images.forEach((img) => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }
  }

  // ── Infinite Scroll ───────────────────────────────────
  function initInfiniteScroll() {
    const main = document.getElementById('main');
    if (!main) return;

    main.addEventListener(
      'scroll',
      () => {
        if (state.isLoading) return;
        const { scrollTop, scrollHeight, clientHeight } = main;
        if (scrollTop + clientHeight >= scrollHeight - CONFIG.INFINITE_SCROLL_THRESHOLD) {
          const nextBatch = state.filteredGames.slice(state.currentLimit, state.currentLimit + CONFIG.RENDER_LIMIT);
          if (nextBatch.length > 0) {
            state.currentLimit += CONFIG.RENDER_LIMIT;
            appendGrid(nextBatch, state.currentLimit - CONFIG.RENDER_LIMIT);
          }
        }
      },
      { passive: true }
    );
  }

  // ── Theater Mode ──────────────────────────────────────
  function openTheater(game) {
    // Build game URL
    let gameUrl = game.url || game.iframe_url;
    if (!gameUrl) return;

    // Use standalone game page for better performance and "full details" feel
    const params = new URLSearchParams({
        url: gameUrl,
        name: game.name || game.title
    });
    
    window.location.href = `/game.html?${params.toString()}`;
  }

  function closeTheater() {
    const overlay = document.getElementById('game-overlay');
    const iframe = document.getElementById('theater-iframe');
    if (!overlay || !iframe) return;

    iframe.src = '';
    overlay.classList.remove('active');
    document.body.style.overflow = '';

    // Exit fullscreen if we're in it
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function tryFullscreen(el) {
    try {
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (req) req.call(el);
    } catch {}
  }

  function refreshTheater() {
    const iframe = document.getElementById('theater-iframe');
    if (iframe && iframe.src) {
      const src = iframe.src;
      iframe.src = '';
      setTimeout(() => { iframe.src = src; }, 50);
    }
  }

  // ── Ad Stripping ──────────────────────────────────────
  function stripAds() {
    const iframe = document.getElementById('theater-iframe');
    if (!iframe || !iframe.contentDocument) {
      // Cross-origin — can't directly access. Try injecting via postMessage
      // For same-origin games, this works directly
      return;
    }

    CONFIG.AD_SELECTORS.forEach((sel) => {
      try {
        const els = iframe.contentDocument.querySelectorAll(sel);
        els.forEach((el) => el.remove());
      } catch {
        // Cross-origin restriction — expected
      }
    });
  }

  // ── iframe Auto-Scaling ───────────────────────────────
  function autoScaleIframe() {
    const iframe = document.getElementById('theater-iframe');
    if (!iframe) return;

    // Listen for resize events to keep iframe fitted
    const resizeObserver = new ResizeObserver(() => {
      // Iframes auto-stretch via CSS flex:1, but some games need explicit dimensions
      // We post the container size to the iframe
      try {
        const rect = iframe.getBoundingClientRect();
        iframe.contentWindow?.postMessage(
          { type: 'STRATO_RESIZE', width: rect.width, height: rect.height },
          '*'
        );
      } catch {
        // Cross-origin — expected
      }
    });

    resizeObserver.observe(iframe.parentElement || iframe);
  }

  // ── Search Integration (debounced) ────────────────────
  let _searchDebounce = null;
  function handleSearch(query) {
    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(() => {
      state.searchQuery = query;
      applyFilters();
    }, 100);
  }

  // ── Command Palette Data ──────────────────────────────
  function getGamesForPalette() {
    return state.allGames.slice(0, 50).map((g) => ({
      type: 'game',
      icon: '🎮',
      title: g.name,
      description: g.category + (g.source !== 'local' ? ' · ' + g.source : ''),
      action: () => openTheater(g),
    }));
  }

  function getCategoriesForPalette() {
    const cats = [...new Set(state.allGames.map((g) => g.category).filter(Boolean))];
    return cats.map((cat) => ({
      type: 'category',
      icon: '📂',
      title: cat,
      description: `${state.allGames.filter((g) => g.category === cat).length} games`,
      action: () => {
        state.activeCategory = cat;
        document.querySelectorAll('.category-pill').forEach((p) => p.classList.remove('active'));
        document.querySelectorAll('.category-pill').forEach((p) => {
          if (p.textContent === cat) p.classList.add('active');
        });
        applyFilters();
      },
    }));
  }

  // ── Public API ────────────────────────────────────────
  return {
    init() {
      Vault.init().then(() => {
        loadAllGames();
        initInfiniteScroll();
        autoScaleIframe();
      });
    },

    // Theater controls — wired by app.js
    open: openTheater,
    close: closeTheater,
    refresh: refreshTheater,
    stripAds,
    tryFullscreen,

    // Search
    handleSearch,

    // Command palette integration
    getGamesForPalette,
    getCategoriesForPalette,

    // State access
    get allGames() { return state.allGames; },
    get filteredGames() { return state.filteredGames; },
    get categories() { return [...new Set(state.allGames.map((g) => g.category).filter(Boolean))]; },
    get gameCount() { return state.allGames.length; },

    // Vault access
    vault: Vault,
  };
})();
