/* ══════════════════════════════════════════════════════════
   STRATO v20 — App Runtime Patch
   Patches the existing app.js IIFE at runtime to integrate
   all new v20 modules (Chat, Themes, Media, Profile,
   Bookmarks, Extensions, PWA) plus XP tracking, keyboard
   shortcut updates, and new event handlers.
   ══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  console.log('[STRATO v20] Applying runtime patch...');

  // ──────────────────────────────────────────
  // 1. EXPOSE GLOBAL UTILITIES FOR MODULES
  // ──────────────────────────────────────────

  // Make showToast available globally for modules that reference it
  if (!window.showToast) {
    window.showToast = function(message, type) {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast ${type || 'default'}`;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    };
  }

  // Notification helper for modules
  if (!window.STRATO_NOTIFY) {
    window.STRATO_NOTIFY = function(message, type) {
      console.log(`[STRATO Notify] ${type}: ${message}`);
      // Try to add to the notifications panel
      const list = document.getElementById('notifications-list');
      if (list) {
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const item = document.createElement('div');
        item.className = `notification-item ${type || 'info'}`;
        item.innerHTML = `<span>${message}</span><span class="notification-time">${time}</span>`;
        list.prepend(item);
      }
    };
  }

  // XP callback — modules call this when actions happen
  window.STRATO_XP = function(actionType) {
    if (window.StratoProfile && window.StratoProfile.addXPAction) {
      window.StratoProfile.addXPAction(actionType);
    }
  };

  // Navigation callback for bookmarks
  if (!window.STRATO_NAVIGATE) {
    window.STRATO_NAVIGATE = function(url) {
      const urlInput = document.getElementById('url-input') || document.getElementById('home-url-input');
      if (urlInput) urlInput.value = url;
      const goBtn = document.getElementById('btn-go') || document.getElementById('home-go-btn');
      if (goBtn) goBtn.click();
    };
  }

  // Cloak helper
  window.STRATO_CLOAK = function(key) {
    const cloakSelect = document.getElementById('cloak-select');
    if (cloakSelect) {
      cloakSelect.value = key;
      cloakSelect.dispatchEvent(new Event('change'));
    }
  };

  // Username helper
  window.STRATO_USERNAME = localStorage.getItem('strato-username') || 'Anonymous';

  // ──────────────────────────────────────────
  // 2. UPDATE KEYBOARD SHORTCUTS
  // ──────────────────────────────────────────

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    // New v20 keymap: 6=chat, 7=ai, 8=settings
    const v20ViewMap = {
      '1': 'home',
      '2': 'arcade',
      '3': 'browser',
      'h': 'hub',
      '6': 'chat',
      '7': 'ai',
      '8': 'settings',
    };

    if (v20ViewMap[e.key]) {
      e.stopImmediatePropagation();
      e.preventDefault();
      // Click the nav button for this view
      const navBtn = document.querySelector(`[data-view="${v20ViewMap[e.key]}"]`);
      if (navBtn) {
        navBtn.click();
      } else {
        // Fallback: direct view switch
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(`view-${v20ViewMap[e.key]}`);
        if (target) target.classList.add('active');
      }
    }

    // Media player toggle: 'm' key
    if (e.key === 'm' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (window.StratoMedia) {
        const mpState = window.StratoMedia.getState();
        if (mpState.visible) window.StratoMedia.hidePlayer();
        else window.StratoMedia.showPlayer();
      }
    }

  }, true); // Capture phase to intercept before app.js handler

  console.log('[STRATO v20] Keyboard shortcuts patched: 6=chat, 7=ai, 8=settings, m=media');

  // ──────────────────────────────────────────
  // 3. ADD XP TRACKING TO APP ACTIONS
  // ──────────────────────────────────────────

  function patchXPTracking() {
    // Patch game card clicks — award XP when a game is played
    document.addEventListener('click', function(e) {
      const gameCard = e.target.closest('[data-game-id]');
      if (gameCard && !e.target.closest('.fav-btn')) {
        if (window.STRATO_XP) window.STRATO_XP('game');
      }
    }, true);

    // Patch AI chat — award XP when AI message is sent
    const aiSendBtn = document.getElementById('btn-ai-send') || document.getElementById('ai-send-btn');
    const tutorSendBtn = document.getElementById('btn-tutor-send') || document.getElementById('ai-tutor-send-btn');
    const visionSendBtn = document.getElementById('btn-vision-send');
    if (aiSendBtn) aiSendBtn.addEventListener('click', () => { if (window.STRATO_XP) window.STRATO_XP('ai'); });
    if (tutorSendBtn) tutorSendBtn.addEventListener('click', () => { if (window.STRATO_XP) window.STRATO_XP('ai'); });
    if (visionSendBtn) visionSendBtn.addEventListener('click', () => { if (window.STRATO_XP) window.STRATO_XP('snap'); });

    // Patch proxy navigation — award XP when page is browsed
    const goBtn = document.getElementById('btn-go') || document.getElementById('home-go-btn');
    if (goBtn) goBtn.addEventListener('click', () => { if (window.STRATO_XP) window.STRATO_XP('browse'); });

    // Patch chat messages — award XP when chat message is sent
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('btn-send-message') || document.getElementById('chat-send-btn');
    if (chatSendBtn) chatSendBtn.addEventListener('click', () => { if (window.STRATO_XP) window.STRATO_XP('chat'); });
    if (chatInput) chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && window.STRATO_XP) window.STRATO_XP('chat');
    });

    console.log('[STRATO v20] XP tracking patched');
  }

  // ──────────────────────────────────────────
  // 4. ADD BOOKMARK/HISTORY INTEGRATION
  // ──────────────────────────────────────────

  function patchBrowserHistory() {
    const iframe = document.getElementById('proxy-iframe') || document.getElementById('browser-iframe');
    if (!iframe) return;

    iframe.addEventListener('load', function() {
      const urlInput = document.getElementById('url-input') || document.getElementById('browser-url-input');
      const url = urlInput?.value;
      if (url && window.StratoBookmarks) {
        window.StratoBookmarks.addHistory(url, url);
      }
    });

    console.log('[STRATO v20] Browser history integration patched');
  }

  // ──────────────────────────────────────────
  // 5. STEALTH BAR INTERACTIONS
  // ──────────────────────────────────────────

  function patchStealthBar() {
    // Auto-stealth toggle
    const autoStealthCheckbox = document.getElementById('auto-stealth') || document.getElementById('stealth-auto-blur');
    if (autoStealthCheckbox) {
      autoStealthCheckbox.addEventListener('change', function() {
        if (this.checked) {
          localStorage.setItem('strato-auto-stealth', 'true');
          if (window.showToast) window.showToast('Auto-stealth enabled', 'accent');
        } else {
          localStorage.setItem('strato-auto-stealth', 'false');
        }
      });
      // Restore saved state
      const saved = localStorage.getItem('strato-auto-stealth');
      if (saved === 'true') autoStealthCheckbox.checked = true;
    }

    // Dynamic cloak timer
    const dynamicCloakCheckbox = document.getElementById('stealth-dynamic-cloak');
    if (dynamicCloakCheckbox) {
      let cloakInterval = null;
      dynamicCloakCheckbox.addEventListener('change', function() {
        if (this.checked) {
          localStorage.setItem('strato-dynamic-cloak', 'true');
          // Rotate cloak every 5 minutes
          cloakInterval = setInterval(() => {
            const cloakSelect = document.getElementById('cloak-select');
            if (cloakSelect) {
              const options = Array.from(cloakSelect.options).filter(o => o.value !== 'none');
              const currentIndex = options.findIndex(o => o.value === cloakSelect.value);
              const nextIndex = (currentIndex + 1) % options.length;
              cloakSelect.value = options[nextIndex].value;
              cloakSelect.dispatchEvent(new Event('change'));
            }
          }, 5 * 60 * 1000);
          if (window.showToast) window.showToast('Dynamic cloak enabled (5min rotation)', 'accent');
        } else {
          localStorage.setItem('strato-dynamic-cloak', 'false');
          if (cloakInterval) clearInterval(cloakInterval);
        }
      });
      // Restore saved state
      if (localStorage.getItem('strato-dynamic-cloak') === 'true') {
        dynamicCloakCheckbox.checked = true;
        dynamicCloakCheckbox.dispatchEvent(new Event('change'));
      }
    }

    console.log('[STRATO v20] Stealth bar interactions patched');
  }

  // ──────────────────────────────────────────
  // 6. ADD NOTIFICATION TYPE STYLES
  // ──────────────────────────────────────────

  function enhanceNotifications() {
    const style = document.createElement('style');
    style.textContent = `
      .notification-item.chat { border-left: 3px solid var(--accent); }
      .notification-item.achievement { border-left: 3px solid #fbbf24; }
      .notification-item.levelup { border-left: 3px solid #22c55e; }
      .notification-item.levelup .notification-time { color: #22c55e; }
    `;
    document.head.appendChild(style);
  }

  // ──────────────────────────────────────────
  // 7. MEDIA PLAYER BUTTON IN TOPBAR
  // ──────────────────────────────────────────

  function patchMediaPlayerButton() {
    const mediaBtn = document.getElementById('btn-media');
    if (mediaBtn) {
      mediaBtn.addEventListener('click', () => {
        if (window.StratoMedia) {
          const mpState = window.StratoMedia.getState();
          if (mpState.visible) window.StratoMedia.hidePlayer();
          else window.StratoMedia.showPlayer();
        }
      });
    }
  }

  // ──────────────────────────────────────────
  // 8. INITIALIZE ALL v20 MODULES
  // ──────────────────────────────────────────

  function initV20Modules() {
    const moduleStatus = {
      Chat: !!window.StratoChat,
      Themes: !!window.StratoThemes,
      Media: !!window.StratoMedia,
      Profile: !!window.StratoProfile,
      Bookmarks: !!window.StratoBookmarks,
      Extensions: !!window.StratoExtensions,
      PWA: !!window.StratoPWA,
    };

    Object.entries(moduleStatus).forEach(([name, loaded]) => {
      console.log(`[STRATO v20] Module ${name}: ${loaded ? 'LOADED' : 'NOT FOUND'}`);
    });

    return moduleStatus;
  }

  // ──────────────────────────────────────────
  // APPLY ALL PATCHES ON DOM READY
  // ──────────────────────────────────────────

  function applyPatches() {
    console.log('[STRATO v20] Applying runtime patches to app.js...');

    try {
      patchXPTracking();
      patchBrowserHistory();
      patchStealthBar();
      enhanceNotifications();
      patchMediaPlayerButton();
      initV20Modules();

      console.log('[STRATO v20] All runtime patches applied successfully!');

      // Show welcome toast
      if (window.showToast) {
        setTimeout(() => window.showToast('STRATO v20 APEX loaded', 'accent'), 1000);
      }
    } catch (e) {
      console.error('[STRATO v20] Patch error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPatches);
  } else {
    setTimeout(applyPatches, 100);
  }

  // Expose version info
  window.STRATO_VERSION = 'v20 APEX';
  window.STRATO_PATCH_APPLIED = true;

  console.log('[STRATO v20] Runtime patch script loaded');
})();
