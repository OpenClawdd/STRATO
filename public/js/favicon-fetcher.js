/**
 * STRATO Favicon Fetcher
 * Multi-source favicon resolution with memory cache + colored initials fallback.
 *
 * Usage:
 *   window.FaviconFetcher.getFavicon(url).then(faviconUrl => ...);
 *   const svg = window.FaviconFetcher.renderInitial('S', '#00e5ff');
 */
(function () {
  'use strict';

  const cache = new Map();
  const TIMEOUT = 4000;

  /**
   * Attempt to load an image, resolving true if it loads successfully.
   */
  function tryImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => { img.src = ''; resolve(false); }, TIMEOUT);
      img.onload = () => { clearTimeout(timer); resolve(true); };
      img.onerror = () => { clearTimeout(timer); resolve(false); };
      img.src = src;
    });
  }

  /**
   * Extract hostname from a URL string.
   */
  function getDomain(url) {
    try { return new URL(url).hostname; } catch { return ''; }
  }

  /**
   * Fetch a favicon for a given URL using 4 fallback sources.
   * Returns the first successful image URL, or null if all fail.
   */
  async function getFavicon(url) {
    if (!url || /^\$\{/.test(url)) return null;

    const domain = getDomain(url);
    if (!domain) return null;

    if (cache.has(domain)) return cache.get(domain);

    const sources = [
      `https://${domain}/favicon.ico`,
      `https://${domain}/favicon.png`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      `https://icon.horse/icon/${domain}`,
    ];

    for (const src of sources) {
      const ok = await tryImage(src);
      if (ok) {
        cache.set(domain, src);
        return src;
      }
    }

    cache.set(domain, null);
    return null;
  }

  /**
   * Generate an SVG colored circle with a letter, for use as a fallback thumbnail.
   * Input is sanitized to prevent SVG injection.
   */
  function renderInitial(letter, color) {
    // Sanitize inputs to prevent SVG/XSS injection
    const ch = (letter || '?').charAt(0).toUpperCase().replace(/[^A-Z0-9?]/g, '?');
    const c = (color || '#00e5ff').replace(/[^a-zA-Z0-9#(),.]/g, '');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="12" fill="${c}"/>
      <text x="32" y="44" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="32" font-weight="700">${ch}</text>
    </svg>`;
  }

  // Expose globally
  window.FaviconFetcher = { getFavicon, renderInitial };
})();
