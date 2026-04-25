/**
 * STRATO Game Engine v3.1
 * =========================
 * Manages game library loading, tile rendering,
 * category filtering, theater mode, and StratoVault caching.
 *
 * Exposes: window.StratoGameEngine
 */

(function () {
  'use strict';

  // ── StratoVault — localStorage-backed game save cache ──────────────
  const vault = {
    _prefix: 'sv_',
    get(key)    { try { return JSON.parse(localStorage.getItem(this._prefix + key)); } catch { return null; } },
    set(key, v) { try { localStorage.setItem(this._prefix + key, JSON.stringify(v)); } catch {} },
    del(key)    { try { localStorage.removeItem(this._prefix + key); } catch {} },
    clear() {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(this._prefix));
      keys.forEach(k => localStorage.removeItem(k));
      console.log(`[Vault] Cleared ${keys.length} entries`);
    },
  };

  // ── State ───────────────────────────────────────────────────────────
  let masterGames   = [];
  let filteredGames = [];
  let activeCategory = 'All';
  let searchQuery    = '';
  let renderLimit    = 150;
  let theaterOpen    = false;

  // ── DOM helpers ─────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const qsa = sel => document.querySelectorAll(sel);

  // ── Lazy image loading ──────────────────────────────────────────────
  const lazyObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.onload  = () => img.removeAttribute('data-src');
        img.onerror = () => { img.style.display = 'none'; };
        img.removeAttribute('data-src');
      }
      obs.unobserve(img);
    });
  }, { rootMargin: '300px' });

  // ── Category color map ────────────────────────────────────────────────
  const CAT_COLORS = {
    shooter: '#ef4444', fps: '#ef4444', puzzle: '#a855f7', action: '#f97316',
    racing: '#06b6d4', strategy: '#eab308', sport: '#22c55e', sports: '#22c55e',
    platformer: '#ec4899', adventure: '#8b5cf6', '3kh0': '#3b82f6', selenite: '#14b8a6',
  };
  function getCatColor(cat) { return (cat && CAT_COLORS[cat.toLowerCase()]) || '#64748b'; }

  // ── Create game tile ────────────────────────────────────────────────
  function createTile(game, index = 0) {
    const title = game.title || game.n || 'Unknown';
    const url   = game.iframe_url || game.u || game.url || '';
    const type  = game.t || 'GAME';
    const img   = game.thumbnail || game.img || '';
    const catColor = getCatColor(type);

    const tile = document.createElement('div');
    tile.className = 'game-tile';
    tile.style.animationDelay = `${Math.min(index * 30, 1200)}ms`;
    tile.style.setProperty('--tile-accent', catColor);
    tile.setAttribute('data-cat-color', '');
    tile.setAttribute('role', 'button');
    tile.setAttribute('tabindex', '0');
    tile.setAttribute('aria-label', `Play ${title}`);

    // Sanitize title for HTML output
    const safe = title.replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'})[c]);

    function addPlaceholder() {
      const ph = document.createElement('div');
      ph.className = 'game-tile-placeholder';
      ph.textContent = (title || '?')[0].toUpperCase();
      tile.prepend(ph);
    }

    if (img) {
      const imgEl = document.createElement('img');
      imgEl.dataset.src = img;
      imgEl.alt = safe;
      imgEl.loading = 'lazy';
      imgEl.onerror = () => { imgEl.remove(); addPlaceholder(); };
      tile.appendChild(imgEl);
      lazyObserver.observe(imgEl);
    } else {
      addPlaceholder();
    }

    const badge = document.createElement('div');
    badge.className = 'tile-badge';
    badge.textContent = type;
    tile.appendChild(badge);

    const info = document.createElement('div');
    info.className = 'tile-info';
    info.textContent = title;
    tile.appendChild(info);

    const gameData = { name: title, url, id: title, category: type, img };
    const launch = () => { if (url) StratoGameEngine.open(gameData); };
    tile.addEventListener('click', launch);
    tile.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(); }
    });

    // Context menu (right-click / long-press)
    tile.addEventListener('contextmenu', e => {
      if (window.__stratoShowContextMenu) window.__stratoShowContextMenu(e, gameData);
    });
    let longPressTimer;
    tile.addEventListener('touchstart', e => {
      longPressTimer = setTimeout(() => {
        if (window.__stratoShowContextMenu) {
          const touch = e.touches[0];
          window.__stratoShowContextMenu({ preventDefault: ()=>{}, stopPropagation: ()=>{}, clientX: touch.clientX, clientY: touch.clientY }, gameData);
        }
      }, 500);
    }, { passive: true });
    tile.addEventListener('touchend', () => clearTimeout(longPressTimer), { passive: true });
    tile.addEventListener('touchmove', () => clearTimeout(longPressTimer), { passive: true });

    return tile;
  }

  // ── Render game grid ────────────────────────────────────────────────
  function renderGrid(list) {
    const grid  = $('game-grid');
    const count = $('game-count');
    if (!grid) return;

    // Replace skeleton loaders or existing content
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    list.slice(0, renderLimit).forEach((g, i) => frag.appendChild(createTile(g, i)));
    grid.appendChild(frag);

    if (count) count.textContent = list.length.toLocaleString() + '+ GAMES';

    // Update home stat
    const statEl = $('stat-games');
    if (statEl) statEl.textContent = masterGames.length + '+';
  }

  function appendGrid(list) {
    const grid = $('game-grid');
    if (!grid) return;
    const start = grid.children.length;
    if (start >= Math.min(renderLimit, list.length)) return;
    const frag = document.createDocumentFragment();
    list.slice(start, renderLimit).forEach((g, i) => frag.appendChild(createTile(g, start + i)));
    grid.appendChild(frag);
  }

  // ── Build category bar ──────────────────────────────────────────────
  function buildCategoryBar() {
    const bar = $('category-bar');
    if (!bar) return;

    const counts = {};
    masterGames.forEach(g => {
      const c = g.t || 'Other';
      counts[c] = (counts[c] || 0) + 1;
    });
    const cats = ['All', ...Object.entries(counts).sort((a, b) => b[1] - a[1]).map(e => e[0])];

    bar.innerHTML = '';
    cats.forEach(cat => {
      const btn = document.createElement('div');
      btn.className = 'filter-pill' + (cat === activeCategory ? ' active' : '');
      btn.textContent = cat + (cat === 'All' ? '' : ` (${counts[cat] || ''})`);
      btn.addEventListener('click', () => {
        activeCategory = cat;
        bar.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        applyFilters();
      });
      bar.appendChild(btn);
    });
  }

  // ── Filter & search ─────────────────────────────────────────────────
  function applyFilters() {
    let result = [...masterGames];

    if (activeCategory !== 'All') {
      result = result.filter(g => (g.t || 'Other') === activeCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.map(g => {
        const title = (g.title || g.n || '').toLowerCase();
        let score = 0;
        if (title === q) score = 100;
        else if (title.startsWith(q)) score = 80;
        else if (title.includes(q)) score = 50;
        if ((g.t || '').toLowerCase().includes(q)) score += 20;
        // Fuzzy: check if most query chars appear in title
        let matched = 0;
        for (const ch of q) if (title.includes(ch)) matched++;
        if (q.length > 0 && matched / q.length > 0.75) score += 10;
        return { ...g, _score: score };
      }).filter(g => g._score > 0).sort((a, b) => b._score - a._score);
    }

    filteredGames = result;
    renderLimit = 150;
    renderGrid(filteredGames);
  }

  // Expose for command palette search
  function searchGames(query) {
    return masterGames
      .filter(g => {
        const t = (g.title || g.n || '').toLowerCase();
        return t.includes(query.toLowerCase());
      })
      .slice(0, 20);
  }

  // ── External game sources ───────────────────────────────────────────
  async function fetchExternalGames() {
    const sources = [
      {
        url: 'https://raw.githubusercontent.com/skid9000/selenite-v2/main/src/games.json',
        map: g => ({ title: g.name, iframe_url: g.link, t: 'Selenite', img: g.image }),
      },
      {
        url: 'https://raw.githubusercontent.com/3kh0/3kh0-assets/main/games.json',
        map: g => ({ title: g.name, iframe_url: g.url, t: '3KH0', img: g.img }),
      },
    ];

    for (const src of sources) {
      try {
        const ac  = new AbortController();
        const tid = setTimeout(() => ac.abort(), 5000);
        const res = await fetch(src.url, { signal: ac.signal });
        clearTimeout(tid);
        if (!res.ok) continue;
        const data = await res.json();
        let added = 0;
        data.slice(0, 120).map(src.map).forEach(g => {
          if (g.title && g.iframe_url && !masterGames.some(m => (m.title || m.n) === g.title)) {
            masterGames.push(g);
            added++;
          }
        });
        if (added > 0) {
          buildCategoryBar();
          applyFilters();
        }
      } catch { /* network errors silently ignored */ }
    }
  }

  // ── Infinite scroll ─────────────────────────────────────────────────
  function initInfiniteScroll() {
    const main = document.getElementById('main');
    if (!main) return;
    main.addEventListener('scroll', () => {
      if (main.scrollTop + main.clientHeight < main.scrollHeight - 400) return;
      if (renderLimit < filteredGames.length) {
        renderLimit += 150;
        appendGrid(filteredGames);
      }
    }, { passive: true });
  }

  // ── Theater mode ────────────────────────────────────────────────────
  function openTheater(game) {
    const overlay = $('game-overlay');
    const iframe  = $('theater-iframe');
    const title   = $('theater-game-title') || $('theater-title');
    if (!overlay || !iframe) return;

    // Local paths load directly; external URLs go through proxy
    const rawUrl = game.url || '';
    const isLocal = rawUrl.startsWith('/') || rawUrl.startsWith('about:');
    const url = isLocal ? rawUrl : (typeof window.proxifyUrl === 'function' ? window.proxifyUrl(rawUrl) : rawUrl);

    if (title) title.textContent = game.name || 'Loading...';

    // Show loading state
    overlay.classList.add('loading');
    iframe.src = url;
    overlay.classList.add('active');
    theaterOpen = true;
    document.body.style.overflow = 'hidden';

    // Remove loading state when iframe loads or errors
    const onLoad = () => {
      overlay.classList.remove('loading');
      cleanup();
    };
    const onError = () => {
      overlay.classList.remove('loading');
      // If UV/Scramjet proxy failed, try server-side fallback for external URLs
      if (!isLocal && rawUrl.startsWith('http')) {
        console.warn('[STRATO] Proxy failed for', rawUrl, '— trying server-side fallback');
        iframe.src = '/proxy?url=' + encodeURIComponent(rawUrl);
      }
      cleanup();
    };
    const cleanup = () => {
      iframe.removeEventListener('load', onLoad);
      iframe.removeEventListener('error', onError);
    };

    iframe.addEventListener('load', onLoad);
    iframe.addEventListener('error', onError);

    // Timeout fallback — if iframe doesn't load in 15 seconds, try server-side proxy
    setTimeout(() => {
      if (overlay.classList.contains('loading') && !isLocal && rawUrl.startsWith('http')) {
        console.warn('[STRATO] Proxy timeout for', rawUrl, '— trying server-side fallback');
        overlay.classList.remove('loading');
        iframe.src = '/proxy?url=' + encodeURIComponent(rawUrl);
      }
    }, 15000);
  }

  function closeTheater() {
    const overlay = $('game-overlay');
    const iframe  = $('theater-iframe');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.classList.remove('loading');
    theaterOpen = false;
    document.body.style.overflow = '';
    // Delay clearing src to avoid flash
    setTimeout(() => { if (iframe) iframe.src = 'about:blank'; }, 150);
  }

  // ── Init ────────────────────────────────────────────────────────────
  async function init() {
    try {
      // Try local first, then CDN fallback
      const paths = ['/assets/games.json', '/config/games.json'];
      let games = null;

      for (const path of paths) {
        try {
          const res = await fetch(path);
          if (!res.ok) continue;
          games = await res.json();
          break;
        } catch { /* try next */ }
      }

      if (!games) throw new Error('Could not load games from any source');

      const spam = /badge|listed|hunt|stash|vault|directory|powered|dang\.ai|launchlist/i;
      masterGames = games.filter(g => {
        const n = g.title || g.n || '';
        const u = g.iframe_url || g.u || g.url || '';
        return n && u && !spam.test(n);
      });

      buildCategoryBar();
      applyFilters();

      // Fetch extra games after initial render settles
      setTimeout(fetchExternalGames, 2500);
    } catch (err) {
      console.error('[GameEngine] Failed to load game library:', err);
      // Show friendly error in grid
      const grid = $('game-grid');
      if (grid) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:0.5rem;opacity:0.5"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>
          <div style="font-size:0.85rem">Could not load games. Check your connection.</div>
        </div>`;
      }
    }

    initInfiniteScroll();

    // Wire search from command palette / any search input
    document.addEventListener('strato:search', e => {
      searchQuery = e.detail || '';
      applyFilters();
    });
  }

  // ── Recently Played ────────────────────────────────────────────────
  const RECENT_KEY = 'strato_recent';
  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
  }
  function addRecent(game) {
    let recent = getRecent();
    recent = recent.filter(g => g.id !== game.id);
    recent.unshift(game);
    recent = recent.slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    document.dispatchEvent(new CustomEvent('strato:recent_updated'));
  }

  // ── Public API ──────────────────────────────────────────────────────
  window.StratoGameEngine = {
    init,
    open(game) { 
      addRecent(game);
      openTheater(game); 
    },
    close()    { closeTheater(); },
    refresh() {
      const iframe = $('theater-iframe');
      if (iframe) { const s = iframe.src; iframe.src = ''; iframe.src = s; }
    },
    tryFullscreen(el) {
      const target = $('theater-iframe') || el;
      if (target?.requestFullscreen) target.requestFullscreen().catch(() => {});
      else if (target?.webkitRequestFullscreen) target.webkitRequestFullscreen();
    },
    stripAds() {
      try {
        const doc = $('theater-iframe')?.contentDocument;
        if (!doc) return;
        doc.querySelectorAll('iframe[src*="ads"], [id*="ad-"], [class*="ad-container"]')
          .forEach(el => el.remove());
      } catch { }
    },
    searchGames,
    getAllGames: () => masterGames,
    getRecent,
    vault,
    isTheaterOpen: () => theaterOpen,
  };

})();
