/**
 * STRATO — omni.js
 * Arsenal Proxy Engine + Terminal Array Aesthetics
 */

const RENDER_LIMIT = 150;
const DEBOUNCE_MS = 60;

let masterGames = [];
let filteredGames = [];
let activeCategory = 'All';
let searchQuery = '';
let currentLimit = RENDER_LIMIT;
let uvActive = false;

/* ── DOM REFS ── */
const $ = (id) => document.getElementById(id);

/* ═══════════════════════════════
   PROXY TUNNEL (Ultraviolet)
   ═══════════════════════════════ */
async function initProxy() {
  if ('serviceWorker' in navigator && window.BareMux) {
    try {
      window.stratoConnection = new BareMux.BareMuxConnection("/surf/baremux/worker.js");
      const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
      await window.stratoConnection.setTransport("/epoxy-wrapper.js?v=" + Date.now(), [{ wisp: wispUrl }]);
      console.log('[STRATO] Bare-Mux + Epoxy Transport initialized');
    } catch (err) {
      console.error('[STRATO] Bare-Mux initialization failed:', err);
    }
    
    try {
      await navigator.serviceWorker.register('/uv/sw.js', { scope: '/uv/service/' });
      uvActive = true;
      console.log('[STRATO] UV SW Active');
    } catch (err) {
      console.warn('[STRATO] UV SW Registration failed:', err);
    }
  }
}

function proxifyUrl(url) {
  // Use the native backend "Splash" proxy as primary
  // UV acts as a fallback for pure static environments
  return `/proxy?url=${encodeURIComponent(url)}`;
}

/* ═══════════════════════════════
   NAVIGATION / DOCK
   ═══════════════════════════════ */
function initDock() {
  const tabs = document.querySelectorAll('.dtab');
  const panels = document.querySelectorAll('.view');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('on'));
      tab.classList.add('on');
      
      const v = tab.dataset.view;
      panels.forEach(p => {
        if (p.id === `view-${v}`) p.classList.add('active');
        else p.classList.remove('active');
      });
    });
  });
}

/* ═══════════════════════════════
   MEDIA CARDS (Watch & Listen)
   ═══════════════════════════════ */
function initMediaCards() {
  // Watch
  document.querySelectorAll('[data-action="watch"]').forEach(el => {
    el.addEventListener('click', () => {
      // Create iframe dynamically so it doesn't try to load unproxied early
      const url = el.dataset.url;
      openOverlay(url, el.querySelector('.mc-label').textContent);
    });
  });

  // Listen
  document.querySelectorAll('[data-action="listen"]').forEach(el => {
    el.addEventListener('click', () => {
      const url = el.dataset.url;
      openOverlay(url, el.querySelector('.mc-label').textContent);
    });
  });
}

/* ═══════════════════════════════
   SEARCH & BROWSE
   ═══════════════════════════════ */
function initSearch() {
  const input = $('searchInput');
  if (!input) return;

  let timer = null;
  input.addEventListener('input', e => {
    const raw = e.target.value.toLowerCase().trim();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      searchQuery = raw;
      applyFilters();
      // Ensure we are on the grid view if typing
      if (!$('view-grid').classList.contains('active') && !raw.includes('.')) {
        document.querySelector('.dtab[data-view="grid"]').click();
      }
    }, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const v = input.value.trim();
      if (!v) return;
      if (v.includes('.') && !v.includes(' ')) {
        // Drop it into the proxy (Browse functionality)
        let t = v;
        if (!/^https?:\/\//i.test(t)) t = "https://" + t;
        openOverlay(t, "Surfing: " + t);
      }
    }
    if (e.key === 'Escape') {
      input.value = '';
      searchQuery = '';
      applyFilters();
      input.blur();
    }
  });
}

/* ═══════════════════════════════
   CLOAK & SETTINGS
   ═══════════════════════════════ */
function initSettings() {
  const saveBtn = $('saveSettingsBtn');
  const clearBtn = $('clearCacheBtn');
  const panicInput = $('panicUrlInput');
  const proxySel = $('proxyEngine');
  
  // Load saved settings
  const savedPanic = localStorage.getItem('strato_panic') || 'https://classroom.google.com';
  const savedProxy = localStorage.getItem('strato_proxy') || 'splash';
  
  if (panicInput) panicInput.value = savedPanic;
  if (proxySel) proxySel.value = savedProxy;

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      localStorage.setItem('strato_panic', panicInput.value);
      localStorage.setItem('strato_proxy', proxySel.value);
      // Small feedback
      saveBtn.textContent = 'Saved!';
      setTimeout(() => saveBtn.textContent = 'Apply & Save', 1500);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all settings and cached array data?')) {
        localStorage.clear();
        window.location.reload();
      }
    });
  }
}

function initCloak() {
  const panicBtn = $('panicBtn');
  if (panicBtn) {
    panicBtn.addEventListener('click', () => {
      const url = localStorage.getItem('strato_panic') || 'https://classroom.google.com';
      window.location.replace(url);
    });
  }

  // Bind Escape key to close overlays / panic wrapper
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$('game-overlay').hasAttribute('hidden')) {
        closeOverlay();
      } else {
        const url = localStorage.getItem('strato_panic') || 'https://classroom.google.com';
        window.location.replace(url);
      }
    }
  });

  $('splash-enter').addEventListener('click', () => {
    $('splash').style.opacity = '0';
    $('splash').style.pointerEvents = 'none';
    setTimeout(() => {
      $('splash').style.display = 'none';
    }, 800);
  });
}

/* ═══════════════════════════════
   THEME ENGINE & PARTICLES
   ═══════════════════════════════ */
function initTheme() {
  const sel = $('themeSelector');
  if (!sel) return;
  const saved = localStorage.getItem('strato_theme') || 'midnight';
  document.documentElement.dataset.theme = saved;
  sel.value = saved;
  sel.addEventListener('change', e => {
    document.documentElement.dataset.theme = e.target.value;
    localStorage.setItem('strato_theme', e.target.value);
  });
}

function initParticles() {
  const canvas = $('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 2 + 0.5,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4
  }));

  window.addEventListener('resize', () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const isSky = document.documentElement.dataset.theme === 'sky';
    ctx.fillStyle = isSky ? 'rgba(255, 255, 255, 0.4)' : 'rgba(26, 122, 255, 0.3)';
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* --- LAZY LOADING OBSERVER --- */
const lazyObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.onload = () => img.classList.add('loaded');
        img.removeAttribute('data-src');
      }
      observer.unobserve(img);
    }
  });
}, { rootMargin: '200px' });

/* ═══════════════════════════════
   ARRAY / GRID RENDERER
   ═══════════════════════════════ */
function applyFilters() {
  let result = masterGames;
  if (activeCategory !== 'All') {
    result = result.filter(g => (g.t || 'Other') === activeCategory);
  }
  if (searchQuery) {
    result = result.filter(g => (g.title || g.n || '').toLowerCase().includes(searchQuery));
  }
  filteredGames = result;
  currentLimit = RENDER_LIMIT;
  renderGrid(filteredGames);
}

function buildCategoryBar() {
  const bar = $('category-bar');
  if (!bar) return;
  const counts = {};
  masterGames.forEach(g => { const c = g.t || 'Other'; counts[c] = (counts[c]||0)+1; });

  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).map(e => e[0]);
  const cats = ['All', ...sorted];

  bar.innerHTML = '';
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-pill' + (cat === 'All' ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      bar.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
    bar.appendChild(btn);
  });
}

function createDataTile(game) {
  const title = game.title || game.n || 'UnknownData';
  const url = game.iframe_url || game.u;
  const type = game.t || 'BIN';
  const imgUrl = game.thumbnail || game.img || '';
  
  const tile = document.createElement('div');
  tile.className = 'unified-tile';
  
  // Unified DOM rendering: Includes both Image Thumbnail AND Terminal HUD
  tile.innerHTML = `
    <img class="ut-img" data-src="${imgUrl}" alt="${title}" onerror="this.style.display='none'">
    
    <div class="ut-terminal-hud">
      <div class="tt-head">
        <span class="tt-type">[${type}]</span>
        <span class="tt-status">ONLINE</span>
      </div>
      <div class="tt-body">
        <div class="tt-name">${title}</div>
        <div class="tt-hex">0x${Math.floor(Math.random()*16777215).toString(16).toUpperCase()} // Mount Ready</div>
      </div>
    </div>
    
    <div class="ut-sky-hud">
      <div class="sh-name">${title}</div>
      <div class="sh-tag">${type}</div>
    </div>
  `;

  tile.addEventListener('click', () => {
    if (url) openOverlay(url, title);
  });

  // Start lazy observe
  const img = tile.querySelector('.ut-img');
  if (img) lazyObserver.observe(img);

  return tile;
}

function renderGrid(list) {
  const grid = $('gameGrid');
  const count = $('gameCount');
  
  grid.innerHTML = '';
  const batch = list.slice(0, currentLimit);
  const frag = document.createDocumentFragment();
  batch.forEach(g => frag.appendChild(createDataTile(g)));
  grid.appendChild(frag);

  count.textContent = list.length;
}

function appendGrid(list, limit) {
  const grid = $('gameGrid');
  const start = grid.children.length;
  const end = Math.min(limit, list.length);
  if (start >= end) return;

  const frag = document.createDocumentFragment();
  const batch = list.slice(start, end);
  batch.forEach(g => frag.appendChild(createDataTile(g)));
  grid.appendChild(frag);

  $('gameCount').textContent = list.length;
}

/* ═══════════════════════════════
   OVERLAY / LAUNCHER (Unified)
   ═══════════════════════════════ */
function openOverlay(url, title) {
  const overlay = $('game-overlay');
  const iframe = $('game-iframe');
  
  if ($('ov-game-title')) $('ov-game-title').textContent = title;

  // Local URLs don't need proxying if they are relative mapped, 
  // but if it's an absolute URL (game or watch/listen), drop it in UV
  iframe.src = url.startsWith('/') ? url : proxifyUrl(url);

  overlay.removeAttribute('hidden');
}

function closeOverlay() {
  const overlay = $('game-overlay');
  const iframe = $('game-iframe');
  overlay.setAttribute('hidden', '');
  iframe.src = 'about:blank';
}

/* ═══════════════════════════════
   BOOT ENGINE
   ═══════════════════════════════ */
async function boot() {
  try {
    await initProxy();
    
    const res = await fetch('/assets/games.json');
    if (!res.ok) throw new Error('DB Load Fail');
    const rawGames = await res.json();
    
    // Antispam Filter
    const promoRegex = /badge|listed|hunt|stash|vault|directory|market|logo|featured|powered|dang\.ai|launchlist/i;
    masterGames = rawGames.filter(g => {
      const name = (g.title || g.n || '');
      const url  = (g.iframe_url || g.u || '');
      return name && url && !promoRegex.test(name);
    });

    $('searchInput').placeholder = `Search ${masterGames.length.toLocaleString()} array items or enter a URL...`;
    
    buildCategoryBar();
    applyFilters();

    // Infinite scroll
    const grid = $('gameGrid');
    let scrollTick = false;
    grid.addEventListener('scroll', () => {
      if (scrollTick) return;
      scrollTick = true;
      requestAnimationFrame(() => {
        if (grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 300) {
          if (currentLimit < filteredGames.length) {
            currentLimit += RENDER_LIMIT;
            appendGrid(filteredGames, currentLimit);
          }
        }
        scrollTick = false;
      });
    });

  } catch (err) {
    console.error('[STRATO] Boot failure:', err);
  }

  // Bind Overlay Close
  $('overlay-back-btn').addEventListener('click', closeOverlay);
  $('overlay-fs-btn').addEventListener('click', () => {
    const ifr = $('game-iframe');
    (ifr.requestFullscreen || ifr.webkitRequestFullscreen || function(){}).call(ifr);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initParticles();
  initDock();
  initMediaCards();
  initSearch();
  initSettings();
  initCloak();
  boot();
});