(function () {
  'use strict';
  window.STRATO_OPEN_HOME_RUNTIME_ACTIVE = true;

  const blockedCategories = new Set(['proxies', 'directories', 'game-hubs']);
  const blockedTerms = ['google', 'chrome', 'nytimes', 'school', 'proxy', 'cloak', 'unblocked', 'exploit'];
  const keys = {
    favorites: 'strato-favorites',
    recent: 'strato-recent',
    playCounts: 'strato-playCounts',
    lastPlayed: 'strato-lastPlayed',
    preferences: 'strato-preferences',
    failures: 'strato-localFailures',
  };

  let games = [];

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
  }

  function hash(value) {
    let out = 2166136261;
    for (let i = 0; i < value.length; i++) {
      out ^= value.charCodeAt(i);
      out = Math.imul(out, 16777619);
    }
    return out >>> 0;
  }

  function nameOf(game) {
    return game?.name || game?.title || 'Untitled';
  }

  function tagsOf(game) {
    return Array.isArray(game?.tags) ? game.tags.filter(Boolean).map(String) : [];
  }

  function isPlaceholder(url) {
    const value = String(url || '').trim();
    return !value || value === '#' || value === 'about:blank' || /^\$\{[^}]+\}$/.test(value) || /example\.(com|org|net)/i.test(value);
  }

  function health(game) {
    if (!game) return { status: 'invalid', reason: 'unavailable' };
    if (!game.url) return { status: 'missing-url', reason: 'missing URL' };
    if (game.needsConfig || game.config_required || isPlaceholder(game.url)) return { status: 'needs-config', reason: 'needs config' };
    if (!String(game.url).startsWith('/') && !/^https?:\/\//i.test(game.url)) return { status: 'invalid', reason: 'unavailable' };
    const failures = readJson(keys.failures, {});
    if (failures[game.id] && Date.now() - failures[game.id].timestamp < 24 * 60 * 60 * 1000) {
      return { status: 'recently-failed-locally', reason: failures[game.id].reason || 'failed locally' };
    }
    if (!game.thumbnail || isPlaceholder(game.thumbnail)) return { status: 'thumbnail-fallback', reason: 'thumbnail missing' };
    if (game.reliability === 'red') return { status: 'playable', reason: 'playable' };
    return { status: 'ready', reason: 'ready' };
  }

  function homeSafe(game) {
    const category = String(game.category || '').toLowerCase();
    if (blockedCategories.has(category)) return false;
    const text = [nameOf(game), game.description || '', category, ...tagsOf(game)].join(' ').toLowerCase();
    return !blockedTerms.some(term => text.includes(term));
  }

  function promotable(game) {
    const status = health(game).status;
    return homeSafe(game) && ['ready', 'thumbnail-fallback', 'playable'].includes(status) && game.reliability !== 'red';
  }

  function isSelfHosted(game) {
    return String(game?.url || '').startsWith('/games/');
  }

  function catalog() {
    return games.filter(promotable);
  }

  function fallbackThumb(game) {
    const title = nameOf(game);
    const initials = title.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'S';
    const colors = ['#00e5ff', '#a855f7', '#22c55e', '#fbbf24', '#f472b6', '#3b82f6'];
    const accent = colors[hash(title) % colors.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="18" fill="#0b1020"/><circle cx="252" cy="42" r="52" fill="${accent}" opacity=".16"/><circle cx="74" cy="170" r="80" fill="${accent}" opacity=".1"/><path d="M44 138h232" stroke="${accent}" stroke-opacity=".22"/><text x="160" y="113" text-anchor="middle" font-family="Arial,sans-serif" font-size="56" font-weight="800" fill="${accent}">${initials}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function thumb(game) {
    return game.thumbnail && !isPlaceholder(game.thumbnail) ? game.thumbnail : fallbackThumb(game);
  }

  function category(game) {
    return String(game.category || 'Arcade').replace(/-/g, ' ');
  }

  function statusLabel(game) {
    const labels = {
      playable: 'Check first',
      'thumbnail-fallback': 'Fallback art',
      'recently-failed-locally': 'Failed locally',
      'missing-url': 'Missing URL',
      'needs-config': 'Needs config',
      invalid: 'Unavailable',
    };
    const current = health(game).status;
    return current === 'ready' ? '' : labels[current] || '';
  }

  function card(game) {
    const favorites = readJson(keys.favorites, []);
    const fav = favorites.includes(game.id);
    const label = statusLabel(game);
    return `
      <article class="home-game-card" data-game-id="${escapeHtml(game.id)}" tabindex="0" aria-label="Launch ${escapeHtml(nameOf(game))}">
        <button class="home-fav-btn ${fav ? 'active' : ''}" type="button" data-fav-id="${escapeHtml(game.id)}" aria-label="${fav ? 'Remove from favorites' : 'Add to favorites'}">${fav ? '\u2605' : '\u2606'}</button>
        <img class="home-card-thumb" src="${escapeHtml(thumb(game))}" alt="" loading="lazy" data-fallback-src="${escapeHtml(fallbackThumb(game))}">
        <div class="home-card-body">
          <div>
            <div class="home-card-title">${escapeHtml(nameOf(game))}</div>
            <div class="home-card-meta">${escapeHtml(category(game))}</div>
          </div>
          <div class="home-card-tags">${tagsOf(game).slice(0, 2).map(tag => `<span class="home-card-tag">${escapeHtml(tag)}</span>`).join('')}${label ? `<span class="home-status-badge">${escapeHtml(label)}</span>` : ''}</div>
          <button class="home-launch-btn" type="button" data-launch-id="${escapeHtml(game.id)}">Launch</button>
        </div>
      </article>
    `;
  }

  function bind(container) {
    container.querySelectorAll('img[data-fallback-src]').forEach((img) => {
      img.addEventListener('error', () => {
        if (img.src !== img.dataset.fallbackSrc) img.src = img.dataset.fallbackSrc;
      }, { once: true });
    });
    container.querySelectorAll('[data-launch-id]').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        launch(btn.dataset.launchId);
      });
    });
    container.querySelectorAll('[data-fav-id]').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleFavorite(btn.dataset.favId);
      });
    });
    container.querySelectorAll('.home-game-card').forEach(item => {
      item.addEventListener('click', (event) => {
        if (!event.target.closest('button')) launch(item.dataset.gameId);
      });
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          launch(item.dataset.gameId);
        }
      });
    });
  }

  function renderCards(id, list, empty) {
    const container = document.getElementById(id);
    if (!container) return;
    if (!list.length) {
      container.innerHTML = `<div class="home-empty">${empty}</div>`;
      return;
    }
    container.innerHTML = list.map(card).join('');
    bind(container);
  }

  function dailyPicks(list) {
    const now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const picked = [];
    const categoryCounts = new Map();
    for (const game of [...list].sort((a, b) => {
      const localWeight = Number(isSelfHosted(b)) - Number(isSelfHosted(a));
      if (localWeight) return localWeight;
      return hash(`${key}:${a.id}`) - hash(`${key}:${b.id}`);
    })) {
      const cat = game.category || 'arcade';
      if ((categoryCounts.get(cat) || 0) >= 2 && picked.length < 5) continue;
      picked.push(game);
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      if (picked.length === 6) break;
    }
    return picked;
  }

  function renderSearch(query) {
    const container = document.getElementById('home-search-results');
    if (!container) return;
    const q = String(query || '').trim().toLowerCase();
    if (!q) {
      container.innerHTML = '';
      return;
    }
    const matches = catalog().filter(game => [nameOf(game), game.description || '', game.category || '', ...tagsOf(game)].join(' ').toLowerCase().includes(q)).slice(0, 6);
    if (!matches.length) {
      container.innerHTML = '<div class="home-empty">No signal. Try another.</div>';
      return;
    }
    container.innerHTML = matches.map(game => `
      <div class="home-search-result" data-game-id="${escapeHtml(game.id)}">
        <img src="${escapeHtml(thumb(game))}" alt="" loading="lazy" data-fallback-src="${escapeHtml(fallbackThumb(game))}">
        <div>
          <div class="home-result-title">${escapeHtml(nameOf(game))}</div>
          <div class="home-result-meta">${escapeHtml(category(game))}${tagsOf(game).length ? ' / ' + escapeHtml(tagsOf(game).slice(0, 3).join(' / ')) : ''}</div>
        </div>
        <button class="home-launch-btn" type="button" data-launch-id="${escapeHtml(game.id)}">Launch</button>
      </div>
    `).join('');
    bind(container);
  }

  function renderHome() {
    const list = catalog();
    document.documentElement.dataset.homeCatalogCount = String(list.length);
    renderCards('daily-picks', dailyPicks(list), 'No launchable Daily Picks yet.');
    renderCards('home-favorites', readJson(keys.favorites, []).map(id => games.find(game => game.id === id)).filter(game => game && promotable(game)).slice(0, 6), 'Launch a game, then star it.');
    renderCards('home-recent', readJson(keys.recent, []).map(id => games.find(game => game.id === id)).filter(game => game && promotable(game)).slice(0, 6), 'Nothing played here yet.');

    const counts = readJson(keys.playCounts, {});
    const most = Object.entries(counts).filter(([, count]) => Number(count) > 0).map(([id, count]) => ({ game: games.find(item => item.id === id), count: Number(count) })).filter(item => item.game && promotable(item.game)).sort((a, b) => b.count - a.count).map(item => item.game).slice(0, 6);
    document.getElementById('home-most-played-section')?.classList.toggle('hidden', most.length === 0);
    renderCards('home-most-played', most, '');

    const dated = list.map(game => ({ game, date: Date.parse(game.addedDate || game.addedAt || game.date || '') })).filter(item => Number.isFinite(item.date)).sort((a, b) => b.date - a.date).map(item => item.game).slice(0, 6);
    document.getElementById('home-recently-added-section')?.classList.toggle('hidden', dated.length === 0);
    renderCards('home-recently-added', dated, '');
    renderSearch(document.getElementById('home-search')?.value || '');
  }

  function switchView(view) {
    document.querySelectorAll('.view').forEach(item => item.classList.remove('active'));
    document.getElementById(`view-${view}`)?.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  }

  function record(game) {
    const recent = readJson(keys.recent, []).filter(id => id !== game.id);
    recent.unshift(game.id);
    writeJson(keys.recent, recent.slice(0, 20));
    const counts = readJson(keys.playCounts, {});
    counts[game.id] = (Number(counts[game.id]) || 0) + 1;
    writeJson(keys.playCounts, counts);
    const last = readJson(keys.lastPlayed, {});
    last[game.id] = Date.now();
    writeJson(keys.lastPlayed, last);
  }

  function fail(game, reason) {
    document.getElementById('launch-failure-overlay')?.remove();
    const similar = catalog().filter(item => item.id !== game?.id && (item.category === game?.category || tagsOf(item).some(tag => tagsOf(game || {}).includes(tag)))).slice(0, 3);
    const overlay = document.createElement('div');
    overlay.className = 'launch-failure-overlay';
    overlay.id = 'launch-failure-overlay';
    overlay.innerHTML = `
      <div class="launch-failure-panel" role="dialog" aria-modal="true">
        <div class="launch-failure-title">No signal.</div>
        <p class="launch-failure-copy">${escapeHtml(nameOf(game || {}))} could not launch: ${escapeHtml(reason)}.</p>
        <div class="home-failure-actions">
          <button class="glass-btn" type="button" data-failure="retry">Retry</button>
          <button class="glass-btn" type="button" data-failure="surprise">Try Surprise Me</button>
          <button class="glass-btn" type="button" data-failure="home">Back to STRATO</button>
        </div>
        <div class="similar-games">${similar.map(item => `<button class="similar-game-btn" type="button" data-similar="${escapeHtml(item.id)}"><span>${escapeHtml(nameOf(item))}</span><span>${escapeHtml(category(item))}</span></button>`).join('')}</div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (event) => {
      const failure = event.target.closest('[data-failure]')?.dataset.failure;
      const similarId = event.target.closest('[data-similar]')?.dataset.similar;
      if (event.target === overlay || failure === 'home') {
        overlay.remove();
        switchView('home');
      } else if (failure === 'surprise') {
        overlay.remove();
        surprise();
      } else if (failure === 'retry' && game) {
        const failures = readJson(keys.failures, {});
        delete failures[game.id];
        writeJson(keys.failures, failures);
        overlay.remove();
        launch(game.id);
      } else if (similarId) {
        overlay.remove();
        launch(similarId);
      }
    });
  }

  async function launch(id) {
    const game = games.find(item => item.id === id);
    if (!game) return fail(null, 'unavailable');
    const current = health(game);
    if (!['ready', 'playable', 'thumbnail-fallback'].includes(current.status)) return fail(game, current.reason);
    if (String(game.url).startsWith('/')) {
      try {
        const response = await fetch(game.url, { method: 'HEAD', cache: 'no-store' });
        if (!response.ok) throw new Error('missing local file');
      } catch {
        const failures = readJson(keys.failures, {});
        failures[game.id] = { reason: 'failed locally', timestamp: Date.now() };
        writeJson(keys.failures, failures);
        renderHome();
        return fail(game, 'failed locally');
      }
    }
    record(game);
    renderHome();
    switchView('browser');
    const iframe = document.getElementById('proxy-iframe');
    const input = document.getElementById('url-input');
    if (input) input.value = game.url;
    if (String(game.url).startsWith('/') || game.tier === 1 || game.tier === 2) {
      if (iframe) iframe.src = game.url;
    } else if (window.STRATO_NAVIGATE) {
      window.STRATO_NAVIGATE(game.url);
    } else if (iframe) {
      iframe.src = game.url;
    }
  }

  function surprise() {
    const list = catalog();
    if (!list.length) return;
    const button = document.getElementById('surprise-me');
    const prefs = readJson(keys.preferences, {});
    if (button && !prefs.lowPower && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      button.classList.remove('shuffle-lock');
      void button.offsetWidth;
      button.classList.add('shuffle-lock');
      setTimeout(() => button.classList.remove('shuffle-lock'), 480);
    }
    const stable = list.filter(isSelfHosted);
    const choices = stable.length ? stable : list;
    const recent = new Set(readJson(keys.recent, []).slice(0, Math.min(6, choices.length - 1)));
    const pool = choices.filter(game => !recent.has(game.id));
    launch((pool.length ? pool : choices)[Math.floor(Math.random() * (pool.length ? pool.length : choices.length))].id);
  }

  function toggleFavorite(id) {
    const favorites = readJson(keys.favorites, []);
    const index = favorites.indexOf(id);
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push(id);
    writeJson(keys.favorites, favorites);
    renderHome();
  }

  function wireChrome() {
    document.getElementById('home-search')?.addEventListener('input', event => renderSearch(event.target.value));
    document.getElementById('surprise-me')?.addEventListener('click', surprise);
    document.querySelectorAll('[data-home-nav]').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.homeNav)));
    document.getElementById('home-favorites-action')?.addEventListener('click', () => document.getElementById('home-favorites-section')?.scrollIntoView({ behavior: 'smooth' }));
    document.getElementById('home-recent-action')?.addEventListener('click', () => document.getElementById('home-recent-section')?.scrollIntoView({ behavior: 'smooth' }));
    document.getElementById('low-power-toggle')?.addEventListener('click', () => {
      const prefs = readJson(keys.preferences, {});
      prefs.lowPower = !prefs.lowPower;
      writeJson(keys.preferences, prefs);
      document.body.classList.toggle('low-power', !!prefs.lowPower);
      document.getElementById('low-power-toggle')?.setAttribute('aria-pressed', String(!!prefs.lowPower));
    });
  }

  async function init() {
    document.documentElement.dataset.openHomeRuntime = '3';
    wireChrome();
    try {
      const response = await fetch('/assets/games.json', { cache: 'no-store' });
      games = await response.json();
      renderHome();
    } catch (error) {
      console.error('[STRATO] Open Home runtime failed:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.addEventListener('strato-open-home-refresh', renderHome);
}());
