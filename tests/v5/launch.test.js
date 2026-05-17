import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setGames, state } from '../../public/js/v5/core/state.js';
import { normalizeGame } from '../../public/js/v5/core/catalog.js';
import { keys, readJson } from '../../public/js/v5/core/storage.js';
import { launchById, resolveLaunchTarget } from '../../public/js/v5/core/launch.js';

const catalog = [
  {
    id: '2048',
    name: '2048',
    category: 'puzzle',
    url: '/games/2048/index.html',
    thumbnail: '/assets/thumbnails/2048.webp',
    reliability: 'green',
    tags: ['numbers', 'strategy', 'offline'],
  },
  {
    id: 'slope',
    name: 'Slope',
    category: 'action',
    url: 'https://slope-game.com',
    thumbnail: '/assets/thumbnails/slope.webp',
    reliability: 'yellow',
    sourceTrust: 'verified-external',
    tags: ['speed', '3d'],
  },
  {
    id: 'broken',
    name: 'Broken',
    category: 'arcade',
    url: '',
    thumbnail: '',
    reliability: 'green',
    tags: [],
  },
  {
    id: 'missing-local',
    name: 'Missing Local',
    category: 'arcade',
    url: '/games/missing/index.html',
    thumbnail: '',
    reliability: 'green',
    tags: [],
  },
];

function createClassList(initial = []) {
  const set = new Set(initial);
  return {
    add(...items) {
      items.forEach((item) => set.add(item));
    },
    remove(...items) {
      items.forEach((item) => set.delete(item));
    },
    toggle(item, force) {
      if (force === true) {
        set.add(item);
        return true;
      }
      if (force === false) {
        set.delete(item);
        return false;
      }
      if (set.has(item)) {
        set.delete(item);
        return false;
      }
      set.add(item);
      return true;
    },
    contains(item) {
      return set.has(item);
    },
  };
}

function createElement({ id = "", classes = [] } = {}) {
  const listeners = new Map();
  return {
    id,
    dataset: {},
    value: "",
    src: "",
    textContent: "",
    innerHTML: "",
    classList: createClassList(classes),
    addEventListener(type, handler) {
      const list = listeners.get(type) || [];
      list.push(handler);
      listeners.set(type, list);
    },
    removeEventListener(type, handler) {
      const list = listeners.get(type) || [];
      listeners.set(
        type,
        list.filter((entry) => entry !== handler),
      );
    },
    dispatchEvent(event) {
      const list = listeners.get(event.type) || [];
      list.forEach((handler) => handler.call(this, event));
      return true;
    },
    querySelector(selector) {
      if (selector === 'h3') return this._heading || null;
      if (selector === 'p') return this._copy || null;
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function installStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  };
}

function installLaunchDom() {
  const body = createElement({ classes: ['browser-body'] });
  const launchBay = createElement({ id: 'launch-bay-empty' });
  const launchHeading = createElement();
  const launchCopy = createElement();
  launchBay._heading = launchHeading;
  launchBay._copy = launchCopy;

  const iframe = createElement({ id: 'proxy-iframe' });
  const input = createElement({ id: 'url-input' });
  const viewHome = createElement({ id: 'view-home', classes: ['view'] });
  const viewBrowser = createElement({ id: 'view-browser', classes: ['view'] });
  const navBrowser = createElement({ classes: ['nav-btn'] });
  navBrowser.dataset.view = 'browser';
  const launchMeta = createElement({ id: 'launch-meta' });
  const launchMetaTitle = createElement({ id: 'launch-meta-title' });
  launchMeta._title = launchMetaTitle;

  const elements = new Map([
    ['proxy-iframe', iframe],
    ['url-input', input],
    ['view-home', viewHome],
    ['view-browser', viewBrowser],
    ['launch-bay-empty', launchBay],
    ['launch-meta', launchMeta],
    ['launch-meta-title', launchMetaTitle],
  ]);

  globalThis.document = {
    body,
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector(selector) {
      if (selector === '.browser-body') return body;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.view') return [viewHome, viewBrowser];
      if (selector === '.nav-btn') return [navBrowser];
      return [];
    },
  };

  return { body, iframe, input, launchBay, launchHeading, launchCopy, viewBrowser, navBrowser, launchMetaTitle };
}

beforeEach(() => {
  installStorage();
  const dom = installLaunchDom();
  setGames(catalog, normalizeGame);
  state.launchBay = { status: 'empty', gameId: null, reason: '' };
  state.activeMood = 'all';
  globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200 }));
  globalThis.window = globalThis;
  globalThis.location = { origin: 'http://localhost' };
  globalThis.STRATO_NAVIGATE_PROXY = vi.fn();
  globalThis.__launchDom = dom;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete globalThis.__launchDom;
  delete globalThis.window;
  delete globalThis.location;
  delete globalThis.document;
  delete globalThis.STRATO_NAVIGATE_PROXY;
  delete globalThis.fetch;
  delete globalThis.localStorage;
});

describe('v5 launch resolver', () => {
  it('resolves a local catalog game to its direct local path', () => {
    const target = resolveLaunchTarget(catalog[0]);
    expect(target.ok).toBe(true);
    expect(target.mode).toBe('iframe');
    expect(target.url).toBe('/games/2048/index.html');
  });

  it('keeps local launches direct even when a proxy bridge exists', () => {
    const target = resolveLaunchTarget(catalog[0]);
    expect(target.mode).toBe('iframe');
  });

  it('routes external launchable entries through the proxy bridge when available', () => {
    const target = resolveLaunchTarget(catalog[1]);
    expect(target.ok).toBe(true);
    expect(target.mode).toBe('proxy');
    expect(target.url).toBe('https://slope-game.com');
  });

  it('rejects missing URLs as recoverable failures', () => {
    const target = resolveLaunchTarget(catalog[2]);
    expect(target.ok).toBe(false);
    expect(target.reason).toBe('Missing URL');
  });
});

describe('v5 launch attempts', () => {
  it('records recent and play counts after a valid local launch attempt starts', async () => {
    const result = await launchById('2048');
    expect(result).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    globalThis.document.getElementById('proxy-iframe')?.dispatchEvent({ type: 'load' });
    expect(readJson(keys.recent, [])).toEqual(['2048']);
    expect(readJson(keys.playCounts, {})).toEqual({ 2048: 1 });
  });

  it('does not update recent or play counts for a missing URL', async () => {
    const result = await launchById('broken', {
      onFail: vi.fn(),
    });
    expect(result).toBe(false);
    expect(readJson(keys.recent, [])).toEqual([]);
    expect(readJson(keys.playCounts, {})).toEqual({});
  });

  it('does not update recent or play counts when a local route is broken', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 404 }));
    const result = await launchById('missing-local', {
      onFail: vi.fn(),
    });
    expect(result).toBe(false);
    expect(readJson(keys.recent, [])).toEqual([]);
    expect(readJson(keys.playCounts, {})).toEqual({});
  });
});
