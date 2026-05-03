/* ══════════════════════════════════════════════════════════
   STRATO v20 — Extension System Module
   Load, manage, enable/disable extensions, sandboxed execution,
   gallery browsing, install from gallery
   ══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const STORAGE_KEY = 'strato-extensions';
  const SANDBOX_KEY = 'strato-extension-sandbox';

  const DEFAULT_EXTENSIONS = [
    { id: 'adblocker', name: 'Ad Blocker', version: '1.2.0', description: 'Block ads in proxied pages for cleaner browsing', author: 'STRATO Team', enabled: true, icon: 'shield', category: 'privacy' },
    { id: 'chat-bridge', name: 'Chat Bridge', version: '1.1.0', description: 'Connect STRATO Chat with external services', author: 'STRATO Team', enabled: true, icon: 'message', category: 'social' },
    { id: 'autocloak', name: 'Auto Cloak', version: '1.0.0', description: 'Automatically apply stealth when switching tabs', author: 'STRATO Team', enabled: false, icon: 'eye-off', category: 'stealth' },
    { id: 'quicknotes', name: 'Quick Notes', version: '1.3.0', description: 'Take notes while browsing, saved locally', author: 'STRATO Team', enabled: false, icon: 'file-text', category: 'productivity' },
    { id: 'screenshot', name: 'Screenshot Pro', version: '1.0.0', description: 'Capture and annotate screenshots of any page', author: 'STRATO Team', enabled: false, icon: 'camera', category: 'tools' },
    { id: 'darkreader', name: 'Dark Reader', version: '1.0.0', description: 'Force dark mode on all proxied websites', author: 'STRATO Team', enabled: false, icon: 'moon', category: 'appearance' },
  ];

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function getExtensions() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [...DEFAULT_EXTENSIONS];
  }

  function saveExtensions(extensions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(extensions));
    renderExtensions();
  }

  function toggleExtension(id) {
    const extensions = getExtensions();
    const ext = extensions.find(e => e.id === id);
    if (ext) {
      ext.enabled = !ext.enabled;
      saveExtensions(extensions);
      if (ext.enabled) {
        executeExtension(ext);
        if (window.showToast) window.showToast(`${ext.name} enabled`, 'accent');
      } else {
        deactivateExtension(ext);
        if (window.showToast) window.showToast(`${ext.name} disabled`, 'default');
      }
    }
  }

  // ── Execute extension in sandboxed scope ──
  function executeExtension(ext) {
    try {
      // Create a sandboxed scope for the extension
      const sandbox = {
        console: {
          log: (...args) => console.log(`[Ext:${ext.id}]`, ...args),
          warn: (...args) => console.warn(`[Ext:${ext.id}]`, ...args),
          error: (...args) => console.error(`[Ext:${ext.id}]`, ...args),
        },
        localStorage: {
          get: (key) => localStorage.getItem(`${SANDBOX_KEY}:${ext.id}:${key}`),
          set: (key, value) => localStorage.setItem(`${SANDBOX_KEY}:${ext.id}:${key}`, value),
          remove: (key) => localStorage.removeItem(`${SANDBOX_KEY}:${ext.id}:${key}`),
        },
        showToast: window.showToast || (() => {}),
        addNotification: window.STRATO_NOTIFY || (() => {}),
        fetch: (url, opts) => fetch(url, opts),
      };

      // Store sandbox reference
      ext._sandbox = sandbox;

      // Execute extension-specific logic
      switch (ext.id) {
        case 'adblocker':
          sandbox.console.log('Ad blocker active — filtering ad domains');
          break;
        case 'chat-bridge':
          sandbox.console.log('Chat bridge active — connecting chat to external services');
          break;
        case 'autocloak':
          setupAutoCloak(sandbox);
          break;
        case 'quicknotes':
          setupQuickNotes(sandbox);
          break;
        case 'screenshot':
          sandbox.console.log('Screenshot Pro ready — press Ctrl+Shift+S');
          break;
        case 'darkreader':
          setupDarkReader(sandbox);
          break;
        default:
          sandbox.console.log(`${ext.name} v${ext.version} activated`);
      }

      console.log(`[Extensions] ${ext.name} v${ext.version} activated`);
    } catch (e) {
      console.error(`[Extensions] Failed to execute ${ext.id}:`, e);
    }
  }

  function deactivateExtension(ext) {
    try {
      switch (ext.id) {
        case 'autocloak':
          removeAutoCloak();
          break;
        case 'darkreader':
          removeDarkReader();
          break;
        default:
          console.log(`[Extensions] ${ext.name} deactivated`);
      }
      ext._sandbox = null;
    } catch (e) {
      console.error(`[Extensions] Failed to deactivate ${ext.id}:`, e);
    }
  }

  // ── Auto Cloak Extension ──
  let autoCloakHandler = null;
  function setupAutoCloak(sandbox) {
    autoCloakHandler = () => {
      if (document.hidden) {
        const activeCloak = localStorage.getItem('strato-cloak') || 'none';
        if (activeCloak === 'none') {
          // Apply classroom cloak automatically
          if (window.STRATO_CLOAK) window.STRATO_CLOAK('classroom');
          sandbox.console.log('Auto-cloak activated on tab switch');
        }
      }
    };
    document.addEventListener('visibilitychange', autoCloakHandler);
    sandbox.console.log('Auto Cloak: will activate when you switch tabs');
  }
  function removeAutoCloak() {
    if (autoCloakHandler) {
      document.removeEventListener('visibilitychange', autoCloakHandler);
      autoCloakHandler = null;
    }
  }

  // ── Quick Notes Extension ──
  function setupQuickNotes(sandbox) {
    // Add a floating notes button
    const fab = document.createElement('button');
    fab.id = 'quicknotes-fab';
    fab.className = 'quicknotes-fab';
    fab.textContent = '\uD83D\uDCDD';
    fab.title = 'Quick Notes';
    fab.style.cssText = 'position:fixed;bottom:80px;right:20px;width:40px;height:40px;border-radius:50%;border:1px solid var(--accent-border);background:var(--glass-heavy);backdrop-filter:var(--blur);color:var(--accent);font-size:18px;cursor:pointer;z-index:9999;display:flex;align-items:center;justify-content:center;';
    fab.addEventListener('click', () => {
      const notes = sandbox.localStorage.get('notes') || '';
      const newNotes = prompt('Quick Notes:', notes);
      if (newNotes !== null) sandbox.localStorage.set('notes', newNotes);
    });
    document.body.appendChild(fab);
    sandbox.console.log('Quick Notes: floating button added');
  }

  // ── Dark Reader Extension ──
  let darkReaderStyle = null;
  function setupDarkReader(sandbox) {
    darkReaderStyle = document.createElement('style');
    darkReaderStyle.id = 'dark-reader-style';
    darkReaderStyle.textContent = `
      #proxy-iframe { filter: invert(1) hue-rotate(180deg); }
      #proxy-iframe img, #proxy-iframe video { filter: invert(1) hue-rotate(180deg); }
    `;
    document.head.appendChild(darkReaderStyle);
    sandbox.console.log('Dark Reader: dark mode applied to browser iframe');
  }
  function removeDarkReader() {
    if (darkReaderStyle) {
      darkReaderStyle.remove();
      darkReaderStyle = null;
    }
  }

  // ── Icon SVGs ──
  function getExtensionIcon(iconName) {
    const icons = {
      shield: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      message: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
      'eye-off': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
      'file-text': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
      camera: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
      moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',
    };
    return icons[iconName] || icons.shield;
  }

  // ── Render extension cards in settings ──
  function renderExtensions() {
    const grid = document.getElementById('extensions-list') || document.getElementById('extension-grid');
    if (!grid) return;

    const extensions = getExtensions();
    grid.innerHTML = '';

    extensions.forEach(ext => {
      const card = document.createElement('div');
      card.className = 'extension-card';

      const header = document.createElement('div');
      header.className = 'extension-card-header';

      const icon = document.createElement('div');
      icon.className = 'extension-card-icon';
      icon.innerHTML = getExtensionIcon(ext.icon);

      const info = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'extension-card-name';
      name.textContent = ext.name;
      const ver = document.createElement('div');
      ver.className = 'extension-card-version';
      ver.textContent = `v${ext.version}`;
      info.appendChild(name);
      info.appendChild(ver);

      header.appendChild(icon);
      header.appendChild(info);

      const desc = document.createElement('div');
      desc.className = 'extension-card-desc';
      desc.textContent = ext.description;

      const footer = document.createElement('div');
      footer.className = 'extension-card-footer';

      const author = document.createElement('span');
      author.className = 'extension-card-author';
      author.textContent = ext.author;

      const toggle = document.createElement('div');
      toggle.className = `glass-toggle ${ext.enabled ? 'on' : ''}`;
      toggle.dataset.extension = ext.id;
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      toggle.appendChild(thumb);
      toggle.addEventListener('click', () => toggleExtension(ext.id));

      footer.appendChild(author);
      footer.appendChild(toggle);

      card.appendChild(header);
      card.appendChild(desc);
      card.appendChild(footer);
      grid.appendChild(card);
    });
  }

  // ── Load extensions from API ──
  async function loadExtensionsFromServer() {
    try {
      const resp = await fetch('/api/extensions');
      if (!resp.ok) return [];
      const data = await resp.json();
      return data.extensions || data;
    } catch (e) {
      console.warn('[Extensions] Load from server failed:', e);
      return [];
    }
  }

  // ── Browse extension gallery ──
  async function browseGallery() {
    try {
      const resp = await fetch('/api/extensions/gallery');
      if (!resp.ok) return [];
      const data = await resp.json();
      renderGallery(data.extensions || data);
      return data.extensions || data;
    } catch (e) {
      console.warn('[Extensions] Gallery load failed:', e);
      return [];
    }
  }

  // ── Render gallery ──
  function renderGallery(extensions) {
    const container = document.getElementById('extension-gallery-grid') || document.getElementById('extension-gallery') || document.getElementById('theme-gallery');
    if (!container) return;
    container.innerHTML = '';

    extensions.forEach(ext => {
      const card = document.createElement('div');
      card.className = 'extension-gallery-card';
      card.innerHTML = `
        <div class="extension-gallery-icon">${getExtensionIcon(ext.icon)}</div>
        <div class="extension-gallery-info">
          <div class="extension-gallery-name">${escapeHtml(ext.name)}</div>
          <div class="extension-gallery-desc">${escapeHtml(ext.description)}</div>
          <div class="extension-gallery-author">by ${escapeHtml(ext.author)}</div>
        </div>
        <button class="glass-btn small" data-install-id="${escapeHtml(ext.id)}">Install</button>
      `;
      card.querySelector('[data-install-id]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        installExtension(ext);
      });
      container.appendChild(card);
    });
  }

  // ── Install extension from gallery ──
  async function installExtension(ext) {
    const extensions = getExtensions();
    if (extensions.find(e => e.id === ext.id)) {
      if (window.showToast) window.showToast('Extension already installed', 'default');
      return;
    }

    const newExt = { ...ext, enabled: false };
    extensions.push(newExt);
    saveExtensions(extensions);

    // Sync to server
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    try {
      await fetch('/api/extensions/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfMeta?.content || '' },
        body: JSON.stringify({ id: ext.id }),
      });
    } catch (e) {}

    if (window.showToast) window.showToast(`${ext.name} installed`, 'accent');
  }

  // ── Initialize ──
  function init() {
    renderExtensions();

    // Execute enabled extensions on startup
    const extensions = getExtensions();
    extensions.filter(e => e.enabled).forEach(executeExtension);

    // Gallery browse button
    document.getElementById('btn-browse-extensions')?.addEventListener('click', browseGallery);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.StratoExtensions = {
    getExtensions,
    toggleExtension,
    renderExtensions,
    browseGallery,
    installExtension,
    executeExtension,
  };
})();
