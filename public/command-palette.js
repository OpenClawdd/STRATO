/**
 * STRATO Command Palette v3.0
 * ============================
 * Cmd+K / Ctrl+K instant navigation, game search,
 * and command execution — inspired by Vercel, Spotlight, and Warp.
 */

const CommandPalette = (() => {
  'use strict';

  // ── State ─────────────────────────────────────────────
  let isOpen = false;
  let selectedIndex = 0;
  let currentItems = [];
  let query = '';
  let debounceTimer = null;

  // ── HTML Escape ────────────────────────────────────────
  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
  }

  // ── DOM References ────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  let palette, searchInput, results;

  // ── Navigation Commands ───────────────────────────────
  const NAV_COMMANDS = [
    { type: 'nav', icon: '🏠', title: 'Home',          desc: 'Dashboard overview',       shortcut: '', action: () => switchView('home') },
    { type: 'nav', icon: '🎮', title: 'Arcade',        desc: 'Browse & play games',       shortcut: '', action: () => switchView('grid') },
    { type: 'nav', icon: '📺', title: 'Watch',         desc: 'Stream movies & shows',     shortcut: '', action: () => switchView('watch') },
    { type: 'nav', icon: '🎵', title: 'Listen',        desc: 'Music streaming services',  shortcut: '', action: () => switchView('listen') },
    { type: 'nav', icon: '🌐', title: 'Browser',       desc: 'Unrestricted web browsing', shortcut: '', action: () => switchView('browser') },
    { type: 'nav', icon: '🔧', title: 'Tools',          desc: 'Calculator, timer, notes',  shortcut: '', action: () => switchView('ai') },
    { type: 'nav', icon: '⚙️', title: 'Settings',      desc: 'Configuration panel',       shortcut: '', action: () => switchView('settings') },
  ];

  // ── Action Commands ───────────────────────────────────
  const ACTION_COMMANDS = [
    { type: 'action', icon: '🎭', title: 'Toggle Stealth Mode',   desc: 'Cycle through disguise skins',  shortcut: 'Ctrl+Shift+D', action: () => { if (typeof cycleStealthMode === 'function') cycleStealthMode(); } },
    { type: 'action', icon: '🚨', title: 'Panic',                 desc: 'Emergency redirect',            shortcut: '/', action: () => { if (typeof panic === 'function') panic(); } },
    { type: 'action', icon: '🔄', title: 'Clear Game Cache',      desc: 'Wipe StratoVault IndexedDB',     shortcut: '', action: () => { StratoGameEngine.vault.clear(); showToast('Cache cleared'); } },
    { type: 'action', icon: '📡', title: 'Reload Game Library',   desc: 'Re-fetch all game sources',      shortcut: '', action: () => { StratoGameEngine.init(); showToast('Reloading library...'); } },
    { type: 'action', icon: '🖥️', title: 'Toggle Sidebar',        desc: 'Expand or collapse sidebar',     shortcut: '', action: () => toggleSidebar() },
    { type: 'action', icon: '📋', title: 'Copy Current URL',      desc: 'Copy page URL to clipboard',     shortcut: '', action: () => { navigator.clipboard?.writeText(location.href); showToast('URL copied'); } },
    { type: 'action', icon: '🔢', title: 'Game Statistics',       desc: 'Show library stats',             shortcut: '', action: () => showToast(`${StratoGameEngine.gameCount} games loaded from ${StratoGameEngine.categories.length + 1} sources`) },
  ];

  // ── Initialize ────────────────────────────────────────
  function init() {
    palette = $('#command-palette');
    searchInput = $('#palette-search');
    results = $('#palette-results');

    if (!palette || !searchInput || !results) return;

    // Click backdrop to close
    palette.addEventListener('click', (e) => {
      if (e.target === palette) close();
    });

    // Input handler with 80ms debounce to prevent layout thrash
    searchInput.addEventListener('input', (e) => {
      query = e.target.value.trim();
      selectedIndex = 0;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(render, 80);
    });

    // Keyboard navigation
    searchInput.addEventListener('keydown', handleKeydown);

    // Global shortcut: Cmd+K / Ctrl+K
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    });

    // Topbar trigger
    const trigger = $('#palette-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => toggle());
    }
  }

  // ── Toggle / Open / Close ─────────────────────────────
  function toggle() {
    isOpen ? close() : open();
  }

  function open() {
    isOpen = true;
    selectedIndex = 0;
    searchInput.value = '';
    query = '';
    palette.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Small delay so the CSS transition plays before focusing
    requestAnimationFrame(() => {
      searchInput.focus();
      render();
    });
  }

  function close() {
    isOpen = false;
    palette.classList.remove('active');
    document.body.style.overflow = '';
    searchInput.blur();
  }

  // ── Keyboard Navigation ───────────────────────────────
  function handleKeydown(e) {
    const total = currentItems.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, total - 1);
        updateSelection();
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection();
        break;
      case 'Enter':
        e.preventDefault();
        executeSelected();
        break;
      case 'Backspace':
        if (query === '' && currentItems.length > 0) {
          // Go back — not needed, but nice UX
        }
        break;
    }
  }

  function updateSelection() {
    const items = results.querySelectorAll('.palette-item');
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === selectedIndex);
    });

    // Scroll into view
    if (items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function executeSelected() {
    if (currentItems[selectedIndex]) {
      close();
      currentItems[selectedIndex].action();
    }
  }

  // ── Fuzzy Scoring ─────────────────────────────────────
  function fuzzyScore(text, query) {
    const t = text.toLowerCase();
    const q = query.toLowerCase();

    if (t === q) return 100;
    if (t.startsWith(q)) return 80;
    if (t.includes(q)) return 60;

    // Character-by-character matching
    let ti = 0, qi = 0, score = 0;
    while (ti < t.length && qi < q.length) {
      if (t[ti] === q[qi]) {
        score += (ti === 0 ? 10 : 1); // bonus for starts
        qi++;
      }
      ti++;
    }
    return qi === q.length ? score : 0;
  }

  // ── Render Results ────────────────────────────────────
  function render() {
    currentItems = [];

    // Build item lists based on query
    let navItems = [];
    let actionItems = [];
    let gameItems = [];
    let categoryItems = [];

    // Navigation (always show if query matches or is empty)
    if (!query) {
      navItems = NAV_COMMANDS;
    } else {
      navItems = NAV_COMMANDS.filter((cmd) => fuzzyScore(cmd.title + cmd.desc, query) > 0)
        .sort((a, b) => fuzzyScore(b.title + b.desc, query) - fuzzyScore(a.title + a.desc, query));
    }

    // Actions
    if (!query) {
      actionItems = ACTION_COMMANDS;
    } else {
      actionItems = ACTION_COMMANDS.filter((cmd) => fuzzyScore(cmd.title + cmd.desc, query) > 0)
        .sort((a, b) => fuzzyScore(b.title + b.desc, query) - fuzzyScore(a.title + a.desc, query));
    }

    // Games (from engine)
    if (typeof StratoGameEngine !== 'undefined' && StratoGameEngine.allGames.length > 0) {
      if (query) {
        gameItems = StratoGameEngine.getGamesForPalette()
          .map((g) => ({ ...g, _score: fuzzyScore(g.title + g.description, query) }))
          .filter((g) => g._score > 0)
          .sort((a, b) => b._score - a._score)
          .slice(0, 8);
      }

      // Categories
      if (query) {
        categoryItems = StratoGameEngine.getCategoriesForPalette()
          .map((c) => ({ ...c, _score: fuzzyScore(c.title + c.description, query) }))
          .filter((c) => c._score > 0)
          .sort((a, b) => b._score - a._score)
          .slice(0, 5);
      }
    }

    // Also add game search for browsing without query
    if (!query && typeof StratoGameEngine !== 'undefined') {
      gameItems = StratoGameEngine.getGamesForPalette().slice(0, 5);
    }

    // Assemble all items
    currentItems = [...navItems, ...actionItems, ...categoryItems, ...gameItems];

    // Clamp selection
    selectedIndex = Math.min(selectedIndex, Math.max(currentItems.length - 1, 0));

    // Build HTML
    let html = '';

    if (navItems.length > 0) {
      html += `<div class="palette-group-label">Navigation</div>`;
      navItems.forEach((item) => { html += renderItem(item, currentItems.indexOf(item)); });
    }

    if (actionItems.length > 0) {
      html += `<div class="palette-group-label">Actions</div>`;
      actionItems.forEach((item) => { html += renderItem(item, currentItems.indexOf(item)); });
    }

    if (categoryItems.length > 0) {
      html += `<div class="palette-group-label">Categories</div>`;
      categoryItems.forEach((item) => { html += renderItem(item, currentItems.indexOf(item)); });
    }

    if (gameItems.length > 0) {
      html += `<div class="palette-group-label">Games${query ? ` (searching "${query}")` : ''}</div>`;
      gameItems.forEach((item) => { html += renderItem(item, currentItems.indexOf(item)); });
    }

    if (currentItems.length === 0) {
      html = `
        <div class="flex flex-col items-center justify-center py-8 text-txt-muted">
          <span class="text-2xl mb-2">🔍</span>
          <span class="text-sm">No results found</span>
        </div>`;
    }

    results.innerHTML = html;

    // Wire click events
    results.querySelectorAll('.palette-item').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index, 10);
        if (currentItems[idx]) {
          close();
          currentItems[idx].action();
        }
      });
    });

    // Update selection visual
    updateSelection();
  }

  function renderItem(item, index) {
    const isSelected = index === selectedIndex ? ' selected' : '';
    const shortcut = item.shortcut ? `<span class="item-shortcut">${item.shortcut}</span>` : '';
    return `
      <div class="palette-item${isSelected}" data-index="${index}">
        <div class="item-icon">${esc(item.icon)}</div>
        <div class="item-info">
          <div class="item-title">${highlightMatch(item.title, query)}</div>
          <div class="item-desc">${esc(item.desc)}</div>
        </div>
        ${shortcut}
      </div>`;
  }

  function highlightMatch(text, query) {
    if (!query) return esc(text);
    const safeText = esc(text);
    const safeQuery = esc(query);
    const idx = safeText.toLowerCase().indexOf(safeQuery.toLowerCase());
    if (idx === -1) return safeText;
    return safeText.slice(0, idx) + '<span style="color:#06b6d4; font-weight:600">' + safeText.slice(idx, idx + safeQuery.length) + '</span>' + safeText.slice(idx + safeQuery.length);
  }

  // ── Public API ────────────────────────────────────────
  return { init, open, close, toggle };
})();

// ── Toast notification (used by palette actions) ────────
function showToast(message, duration = 2000) {
  const existing = document.querySelector('.strato-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'strato-toast';
  toast.style.cssText = `
    position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(20px);
    padding: 0.625rem 1.25rem; background: rgba(18,18,26,0.95);
    backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px; font-size: 0.8125rem; color: #f1f5f9;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4); z-index: 99999;
    opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
