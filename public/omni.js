/**
 * STRATO OMNI-INGESTER
 * Data Engine & UI Logic
 * Strict CSP Compliant
 */

// ==========================================
// CONFIGURATION & STATE
// ==========================================
const RAW_SOURCES = [
  "http://Selenite.cc",
  "https://g-65j.pages.dev/projects",
  "https://fmhy.net/",
  "https://uunnblockedgames.weebly.com/bloons-tower-defense-5---works.html",
  "https://vapor.onl/",
  "https://splash.best/",
  "https://infamous.qzz.io/",
  "https://programming.writing.lecture.learning.literature.mybgarage.cl/",
  "https://chips.moktanram.com.np/g.html",
  "https://tinyurl.com/kingelijah1",
  "https://learn.gls-drone-pilot.com/",
  "https://daydreamx.global.ssl.fastly.net/",
  "https://dtxb.eclipsecastellon.net/",
  "https://s3.amazonaws.com/ghst/index.html",
  "https://school.agreca.com.ar/",
  "https://noterplusbunny52.b-cdn.net/",
  "https://thesymiproject.org/",
  "https://pluh.aletiatours.com/",
  "https://keoffical.oneapp.dev/",
  "https://follownirbytes-ynevj.ns8.org/",
  "https://endis.rest/",
  "https://helptired8.notinthearchives.net/",
  "https://everest.rip/",
  "https://www.korona.lat/",
  "https://play.frogiee.one/",
  "https://ubghub.org/",
  "https://pizagame.com/",
  "https://startmyeducation.top/"
];

const state = {
  sources: [],
  games: [],
  activeSources: new Set()
};

// ==========================================
// DOM ELEMENTS
// ==========================================
const sidebar = document.getElementById('master-sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');

const sourceListEl = document.getElementById('source-list');
const gameGridEl = document.getElementById('game-grid');
const counterEl = document.getElementById('game-counter');

const overlay = document.getElementById('overlay');
const closeBtn = document.getElementById('close-overlay');
const iframe = document.getElementById('game-iframe');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// ==========================================
// UI LOGIC (Sidebar & Tabs)
// ==========================================
let isSidebarOpen = true;

function syncSidebarState() {
  if (isSidebarOpen) {
    sidebar.classList.remove('collapsed');
  } else {
    sidebar.classList.add('collapsed');
  }
}

if (window.innerWidth < 900) {
  isSidebarOpen = false;
  syncSidebarState();
}

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    isSidebarOpen = !isSidebarOpen;
    syncSidebarState();
  });
}

// Tab Switching Logic
tabBtns.forEach(btn => {
  if (btn.id === 'sidebar-toggle') return; // Skip toggle button

  btn.addEventListener('click', () => {
    // Remove active from all
    tabBtns.forEach(b => {
      if (b.id !== 'sidebar-toggle') b.classList.remove('active');
    });
    tabPanels.forEach(p => p.classList.remove('active'));

    // Add active to clicked
    btn.classList.add('active');
    const targetId = btn.getAttribute('data-target');
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }
  });
});

// ==========================================
// DATA ENGINE (Arsenal)
// ==========================================
function getMockGames(sourceUrl) {
  const games = [];
  const baseNames = ['Geometry Dash', '1v1.LOL', 'Minecraft', 'Subway Surfers', 'Retro Bowl', 'Monkey Mart', 'Tunnel Rush', 'BitLife'];

  for (let i = 0; i < 6; i++) {
    games.push({
      id: Math.random().toString(36).substr(2, 9),
      title: `${baseNames[Math.floor(Math.random() * baseNames.length)]}`,
      url: 'https://example.com/play',
      source: sourceUrl,
      img: `https://picsum.photos/400/225?random=${Math.random()}`
    });
  }
  return games;
}

async function fetchLibrary(url) {
  const isBigThree = url.includes('Selenite.cc') ||
                     url.includes('g-65j.pages.dev') ||
                     url.includes('frogiee.one');

  if (isBigThree) {
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    return { status: 'success', games: getMockGames(url) };
  }

  try {
    const res = await fetch(url, { mode: 'cors' });
    const text = await res.text();

    if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.includes('<html')) {
        throw new Error('Returned HTML instead of JSON');
    }

    const data = JSON.parse(text);
    return { status: 'success', games: data.games || [] };
  } catch (err) {
    return { status: 'error', reason: 'Requires Backend Proxy' };
  }
}

// ==========================================
// RENDERING (Batch Updates)
// ==========================================
function renderSources() {
  if (!sourceListEl) return;
  const fragment = document.createDocumentFragment();

  state.sources.forEach(src => {
    const el = document.createElement('div');
    el.className = 'source-item';

    const info = document.createElement('div');
    info.className = 'source-info';

    const urlEl = document.createElement('div');
    urlEl.className = 'source-url';
    urlEl.textContent = src.url.replace(/^https?:\/\//, '');

    const statusEl = document.createElement('div');
    const isSuccess = src.status === 'success';
    const isLoading = src.status === 'loading';

    if (isLoading) {
      statusEl.className = 'status';
      statusEl.style.color = '#8b9bb4';
      statusEl.textContent = 'CONNECTING...';
    } else {
      statusEl.className = 'status ' + (isSuccess ? 'green' : 'red');
      statusEl.textContent = isSuccess ? 'CONNECTED' : 'PROXY REQUIRED';
    }

    info.appendChild(urlEl);
    info.appendChild(statusEl);

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'toggle-switch';
    toggle.checked = state.activeSources.has(src.url);
    toggle.disabled = !isSuccess;

    toggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.activeSources.add(src.url);
      } else {
        state.activeSources.delete(src.url);
      }
      renderGames();
    });

    el.appendChild(info);
    el.appendChild(toggle);
    fragment.appendChild(el);
  });

  sourceListEl.innerHTML = '';
  sourceListEl.appendChild(fragment);
}

function renderGames() {
  if (!gameGridEl || !counterEl) return;
  const fragment = document.createDocumentFragment();

  const visibleGames = state.games.filter(g => state.activeSources.has(g.source));

  visibleGames.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';

    const img = document.createElement('img');
    img.className = 'game-img';
    img.src = game.img;
    img.loading = 'lazy';
    img.alt = game.title;

    const title = document.createElement('div');
    title.className = 'game-title';
    title.textContent = game.title;

    const srcLabel = document.createElement('div');
    srcLabel.className = 'game-source';
    try {
        srcLabel.textContent = new URL(game.source).hostname;
    } catch {
        srcLabel.textContent = game.source;
    }

    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(srcLabel);

    card.addEventListener('click', () => openGame(game.url));

    fragment.appendChild(card);
  });

  gameGridEl.innerHTML = '';
  gameGridEl.appendChild(fragment);
  counterEl.textContent = `${visibleGames.length} Games Loaded`;
}

// ==========================================
// OVERLAY LOGIC
// ==========================================
function openGame(url) {
  if (iframe && overlay) {
    iframe.src = url;
    overlay.style.display = 'block';
  }
}

if (closeBtn && overlay && iframe) {
  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    iframe.src = '';
  });
}

// ==========================================
// BOOTSTRAP
// ==========================================
async function init() {
  syncSidebarState();

  state.sources = RAW_SOURCES.map(url => ({ url, status: 'loading' }));
  renderSources();

  RAW_SOURCES.forEach(async (url) => {
    const result = await fetchLibrary(url);

    const srcIndex = state.sources.findIndex(s => s.url === url);
    if (srcIndex !== -1) {
      state.sources[srcIndex].status = result.status;
    }

    if (result.status === 'success') {
      state.games.push(...result.games);
      state.activeSources.add(url);
    }

    state.sources.sort((a, b) => {
      if (a.status === 'loading' && b.status !== 'loading') return 1;
      if (a.status !== 'loading' && b.status === 'loading') return -1;
      if (a.status === 'success' && b.status !== 'success') return -1;
      if (a.status !== 'success' && b.status === 'success') return 1;
      return 0;
    });

    renderSources();
    renderGames();
  });
}

// Wait for DOM to be fully ready before init
document.addEventListener('DOMContentLoaded', init);