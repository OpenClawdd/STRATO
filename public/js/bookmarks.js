/* ══════════════════════════════════════════════════════════
   STRATO v20 — Bookmarks & History Module
   Bookmark bar, sidebar, history sidebar, import/export,
   API integration for server-side persistence
   Works with existing HTML elements
   ══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  const STORAGE_BOOKMARKS = 'strato-bookmarks';
  const STORAGE_HISTORY = 'strato-history';

  // ── Bookmarks ──

  function getBookmarks() {
    return JSON.parse(localStorage.getItem(STORAGE_BOOKMARKS) || '[]');
  }

  function saveBookmarks(bookmarks) {
    localStorage.setItem(STORAGE_BOOKMARKS, JSON.stringify(bookmarks));
    renderBookmarksBar();
    updateBookmarkCount();
  }

  function addBookmark(url, title) {
    if (!url) return;
    const bookmarks = getBookmarks();
    if (bookmarks.some(b => b.url === url)) return;
    bookmarks.unshift({ url, title: title || url, addedAt: Date.now() });
    if (bookmarks.length > 100) bookmarks.pop();
    saveBookmarks(bookmarks);
    syncBookmarkToServer('add', url, title);
  }

  function removeBookmark(url) {
    const bookmarks = getBookmarks().filter(b => b.url !== url);
    saveBookmarks(bookmarks);
    syncBookmarkToServer('remove', url);
  }

  function isBookmarked(url) {
    return getBookmarks().some(b => b.url === url);
  }

  // ── History ──

  function getHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || '[]');
  }

  function saveHistory(history) {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
    updateHistoryCount();
  }

  function addHistory(url, title) {
    if (!url) return;
    const history = getHistory();
    history.unshift({ url, title: title || url, visitedAt: Date.now() });
    if (history.length > 200) history.splice(200);
    saveHistory(history);
    syncHistoryToServer(url, title);
  }

  function clearHistory() {
    localStorage.setItem(STORAGE_HISTORY, '[]');
    updateHistoryCount();
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    fetch('/api/history', {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': csrfMeta?.content || '' },
    }).catch(() => {});
  }

  // ── Server sync ──

  async function syncBookmarkToServer(action, url, title) {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const csrf = csrfMeta ? csrfMeta.content : '';
    try {
      if (action === 'add') {
        await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ url, title }),
        });
      } else if (action === 'remove') {
        await fetch('/api/bookmarks', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ url }),
        });
      }
    } catch (e) {}
  }

  async function syncHistoryToServer(url, title) {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const csrf = csrfMeta ? csrfMeta.content : '';
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ url, title }),
      });
    } catch (e) {}
  }

  async function loadBookmarksFromServer() {
    try {
      const resp = await fetch('/api/bookmarks');
      if (!resp.ok) return;
      const data = await resp.json();
      const serverBookmarks = data.bookmarks || data;
      if (Array.isArray(serverBookmarks) && serverBookmarks.length > 0) {
        const local = getBookmarks();
        const merged = [...serverBookmarks, ...local].filter((b, i, arr) =>
          arr.findIndex(x => x.url === b.url) === i
        );
        localStorage.setItem(STORAGE_BOOKMARKS, JSON.stringify(merged));
        renderBookmarksBar();
        updateBookmarkCount();
      }
    } catch (e) {}
  }

  async function loadHistoryFromServer() {
    try {
      const resp = await fetch('/api/history');
      if (!resp.ok) return;
      const data = await resp.json();
      const serverHistory = data.history || data;
      if (Array.isArray(serverHistory) && serverHistory.length > 0) {
        const local = getHistory();
        const merged = [...serverHistory, ...local].filter((h, i, arr) =>
          arr.findIndex(x => x.url === h.url) === i
        ).sort((a, b) => (b.visitedAt || 0) - (a.visitedAt || 0));
        localStorage.setItem(STORAGE_HISTORY, JSON.stringify(merged.slice(0, 200)));
        updateHistoryCount();
      }
    } catch (e) {}
  }

  // ── Rendering ──

  function renderBookmarksBar() {
    const bar = document.getElementById('bookmarks-bar');
    if (!bar) return;
    const bookmarks = getBookmarks();
    bar.innerHTML = '';

    bookmarks.slice(0, 10).forEach(bm => {
      const chip = document.createElement('span');
      chip.className = 'bookmark-chip';
      chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 8px;font-size:var(--text-xs);cursor:pointer;border-radius:4px;background:var(--glass-heavy);border:1px solid var(--border);margin-right:4px';
      chip.title = bm.url;
      chip.textContent = bm.title.length > 16 ? bm.title.slice(0, 16) + '...' : bm.title;
      chip.addEventListener('click', () => {
        if (window.STRATO_NAVIGATE) window.STRATO_NAVIGATE(bm.url);
      });
      bar.appendChild(chip);
    });
  }

  function updateBookmarkCount() {
    // Update any bookmark count display
    const count = getBookmarks().length;
    const btn = document.getElementById('btn-bookmarks-panel');
    if (btn) btn.title = `${count} bookmarks`;
  }

  function updateHistoryCount() {
    const count = getHistory().length;
    const btn = document.getElementById('btn-history-panel');
    if (btn) btn.title = `${count} history entries`;
  }

  function exportBookmarks() {
    const data = JSON.stringify(getBookmarks(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'strato-bookmarks.json';
    a.click();
    URL.revokeObjectURL(url);
    if (window.showToast) window.showToast('Bookmarks exported', 'accent');
  }

  function importBookmarks() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (Array.isArray(imported)) {
            const existing = getBookmarks();
            const merged = [...imported, ...existing].filter((b, i, arr) =>
              arr.findIndex(x => x.url === b.url) === i
            );
            saveBookmarks(merged);
            if (window.showToast) window.showToast(`Imported ${imported.length} bookmarks`, 'accent');
          }
        } catch (e) {
          if (window.showToast) window.showToast('Import failed', 'error');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function init() {
    renderBookmarksBar();
    updateBookmarkCount();
    updateHistoryCount();

    // Bookmark button in browser toolbar
    const bookmarkBtn = document.getElementById('btn-bookmark');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => {
        const urlInput = document.getElementById('url-input') || document.getElementById('browser-url-input');
        const url = urlInput?.value;
        if (url) {
          if (isBookmarked(url)) {
            removeBookmark(url);
            bookmarkBtn.textContent = '☆';
            if (window.showToast) window.showToast('Bookmark removed', 'default');
          } else {
            addBookmark(url, url);
            bookmarkBtn.textContent = '★';
            if (window.showToast) window.showToast('Page bookmarked', 'accent');
          }
        }
      });
    }

    // Clear history button
    document.getElementById('btn-clear-history')?.addEventListener('click', () => {
      clearHistory();
      if (window.showToast) window.showToast('History cleared', 'accent');
    });

    // Export/Import buttons
    document.getElementById('btn-export-bookmarks')?.addEventListener('click', exportBookmarks);
    document.getElementById('btn-import-bookmarks')?.addEventListener('click', importBookmarks);

    // Load from server
    loadBookmarksFromServer();
    loadHistoryFromServer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.StratoBookmarks = {
    getBookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked,
    addHistory,
    getHistory,
    clearHistory,
    exportBookmarks,
    importBookmarks,
    renderBookmarksBar,
  };
})();
