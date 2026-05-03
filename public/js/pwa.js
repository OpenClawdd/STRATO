/* ══════════════════════════════════════════════════════════
   STRATO v20 — PWA Support Module
   Service worker registration, install prompt, offline detection,
   update notification, install banner
   ══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  let deferredPrompt = null;
  let swRegistration = null;

  // ── Register service worker at /sw.js ──
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Workers not supported');
      return;
    }

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        swRegistration = reg;
        console.log('[PWA] Service Worker registered:', reg.scope);

        // Check for updates periodically
        setInterval(() => reg.update(), 60 * 60 * 1000);

        // Listen for update found
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification();
            }
          });
        });
      })
      .catch(err => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] New service worker activated');
    });
  }

  // ── Handle beforeinstallprompt event ──
  function handleInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallBanner();
      console.log('[PWA] Install prompt captured');
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      hideInstallBanner();
      console.log('[PWA] App installed successfully');
      if (window.showToast) window.showToast('STRATO installed as app!', 'accent');
      if (window.STRATO_NOTIFY) window.STRATO_NOTIFY('STRATO installed as app!', 'info');
    });
  }

  // ── Show install banner ──
  function showInstallBanner() {
    const container = document.getElementById('pwa-install-container');
    if (!container) return;

    // Don't show if dismissed recently
    const dismissed = localStorage.getItem('strato-pwa-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 86400000) return;

    container.innerHTML = `
      <div class="pwa-install-prompt" id="pwa-install-prompt">
        <div class="pwa-install-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </div>
        <div class="pwa-install-text">Install <strong>STRATO</strong> for quick access and offline support</div>
        <div class="pwa-install-actions">
          <button class="glass-btn small primary" id="pwa-install-btn">Install</button>
          <button class="pwa-dismiss" id="pwa-dismiss-btn">&times;</button>
        </div>
      </div>
    `;

    document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      console.log('[PWA] Install choice:', result.outcome);
      deferredPrompt = null;
    });

    document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
      hideInstallBanner();
      localStorage.setItem('strato-pwa-dismissed', String(Date.now()));
    });
  }

  function hideInstallBanner() {
    const prompt = document.getElementById('pwa-install-prompt');
    if (prompt) prompt.remove();
  }

  // ── Show update available notification ──
  function showUpdateNotification() {
    const container = document.getElementById('pwa-update-container');
    if (container) {
      container.innerHTML = `
        <div class="pwa-update-prompt" id="pwa-update-prompt">
          <div class="pwa-update-text">A new version of STRATO is available</div>
          <div class="pwa-update-actions">
            <button class="glass-btn small primary" id="pwa-update-btn">Update Now</button>
            <button class="pwa-dismiss" id="pwa-update-dismiss-btn">&times;</button>
          </div>
        </div>
      `;
      document.getElementById('pwa-update-btn')?.addEventListener('click', () => {
        if (swRegistration && swRegistration.waiting) {
          swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
      });
      document.getElementById('pwa-update-dismiss-btn')?.addEventListener('click', () => {
        const p = document.getElementById('pwa-update-prompt');
        if (p) p.remove();
      });
    }

    // Also show a toast
    if (window.showToast) {
      window.showToast('STRATO updated! Refresh to get the latest version.', 'accent');
    }
    if (window.STRATO_NOTIFY) {
      window.STRATO_NOTIFY('Update available — refresh to update', 'info');
    }
  }

  // ── Offline/Online detection ──
  function handleOfflineDetection() {
    function updateStatus() {
      const dot = document.getElementById('connection-dot');
      const label = document.querySelector('.status-dot-wrap .status-label');
      const offlineBanner = document.getElementById('offline-banner');

      if (navigator.onLine) {
        if (dot) { dot.classList.remove('error', 'warning'); }
        if (label) label.textContent = 'Connected';
        if (offlineBanner) offlineBanner.classList.add('hidden');
      } else {
        if (dot) { dot.classList.add('error'); dot.classList.remove('warning'); }
        if (label) label.textContent = 'Offline';
        if (offlineBanner) offlineBanner.classList.remove('hidden');
      }
    }

    window.addEventListener('online', () => {
      updateStatus();
      if (window.showToast) window.showToast('Back online', 'accent');
    });
    window.addEventListener('offline', () => {
      updateStatus();
      if (window.showToast) window.showToast('You are offline', 'error');
    });
    updateStatus();
  }

  // ── Manual install trigger ──
  async function promptInstall() {
    if (!deferredPrompt) {
      if (window.showToast) window.showToast('App is already installed or not available for install', 'default');
      return false;
    }
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return result.outcome === 'accepted';
  }

  // ── Check if running as PWA ──
  function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // ── Initialize ──
  function init() {
    registerServiceWorker();
    handleInstallPrompt();
    handleOfflineDetection();

    // Show PWA status
    if (isPWA()) {
      console.log('[PWA] Running as installed app');
    }

    // Manual install button in settings
    document.getElementById('pwa-install-settings-btn')?.addEventListener('click', promptInstall);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.StratoPWA = {
    registerServiceWorker,
    handleInstallPrompt,
    promptInstall,
    isPWA,
    showUpdateNotification,
  };
})();
