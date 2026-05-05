/**
 * STRATO v21 — Test Setup
 * Global setup, mocks, and utilities for all tests
 */

import { vi } from 'vitest';
import express from 'express';

// ── Mock environment variables ──
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECRET = 'test-secret-key-for-vitest';
process.env.PORT = '0'; // Random available port
process.env.ADMIN_SECRET = 'test-admin-secret';

// ── Mock the database store ──
const mockCollections = {};

function getCollection(name) {
  if (!mockCollections[name]) mockCollections[name] = [];
  return mockCollections[name];
}

vi.mock('../src/db/store.js', () => ({
  default: {
    getAll: vi.fn(async (col) => [...getCollection(col)]),
    getOne: vi.fn(async (col, pred) => getCollection(col).find(pred) || null),
    create: vi.fn(async (col, item) => {
      const record = {
        id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      getCollection(col).push(record);
      return record;
    }),
    update: vi.fn(async (col, pred, updates) => {
      const data = getCollection(col);
      const index = data.findIndex(pred);
      if (index === -1) return null;
      data[index] = { ...data[index], ...updates, updated_at: new Date().toISOString() };
      return data[index];
    }),
    deleteOne: vi.fn(async (col, pred) => {
      const data = getCollection(col);
      const index = data.findIndex(pred);
      if (index === -1) return false;
      data.splice(index, 1);
      return true;
    }),
    deleteMany: vi.fn(async (col, pred) => {
      const data = getCollection(col);
      const before = data.length;
      const filtered = data.filter((item) => !pred(item));
      mockCollections[col] = filtered;
      return before - filtered.length;
    }),
    query: vi.fn(async (col, pred, opts = {}) => {
      let results = getCollection(col).filter(pred);
      if (opts.sort) {
        const { field, order = 'asc' } = opts.sort;
        results.sort((a, b) => {
          if (a[field] < b[field]) return order === 'asc' ? -1 : 1;
          if (a[field] > b[field]) return order === 'asc' ? 1 : -1;
          return 0;
        });
      }
      return { total: results.length, data: results };
    }),
    count: vi.fn(async (col, pred) => {
      const data = getCollection(col);
      return pred ? data.filter(pred).length : data.length;
    }),
    generateId: vi.fn(() => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    initStore: vi.fn(),
  },
  getAll: vi.fn(async (col) => [...getCollection(col)]),
  getOne: vi.fn(async (col, pred) => getCollection(col).find(pred) || null),
  create: vi.fn(async (col, item) => {
    const record = {
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    getCollection(col).push(record);
    return record;
  }),
  update: vi.fn(async (col, pred, updates) => {
    const data = getCollection(col);
    const index = data.findIndex(pred);
    if (index === -1) return null;
    data[index] = { ...data[index], ...updates, updated_at: new Date().toISOString() };
    return data[index];
  }),
  deleteOne: vi.fn(async (col, pred) => {
    const data = getCollection(col);
    const index = data.findIndex(pred);
    if (index === -1) return false;
    data.splice(index, 1);
    return true;
  }),
  deleteMany: vi.fn(async (col, pred) => {
    const data = getCollection(col);
    const before = data.length;
    const filtered = data.filter((item) => !pred(item));
    mockCollections[col] = filtered;
    return before - filtered.length;
  }),
  query: vi.fn(async (col, pred, opts = {}) => {
    let results = getCollection(col).filter(pred);
    return { total: results.length, data: results };
  }),
  count: vi.fn(async (col, pred) => {
    const data = getCollection(col);
    return pred ? data.filter(pred).length : data.length;
  }),
  generateId: vi.fn(() => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
  initStore: vi.fn(),
}));

// ── Test utilities ──
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-1',
    username: 'testuser',
    avatar: null,
    bio: '',
    coins: 0,
    xp: 0,
    level: 1,
    theme: 'default',
    stats: {
      games_played: 0,
      total_score: 0,
      achievements: [],
      bookmarks_count: 0,
      history_count: 0,
      saves_count: 0,
      chat_messages: 0,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockRequest(overrides = {}) {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    cookies: {},
    signedCookies: {},
    path: '/',
    method: 'GET',
    ip: '127.0.0.1',
    accepts: () => true,
    ...overrides,
  };
}

export function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    locals: {},
    json: vi.fn(function (data) { this.body = data; return this; }),
    status: vi.fn(function (code) { this.statusCode = code; return this; }),
    send: vi.fn(function (data) { this.body = data; return this; }),
    redirect: vi.fn(function (code, url) { this.statusCode = code; this.body = url; return this; }),
    setHeader: vi.fn(function (name, value) { this.headers[name] = value; return this; }),
    cookie: vi.fn(function (name, value, opts) { this.cookies[name] = { value, opts }; return this; }),
    clearCookie: vi.fn(function (name) { delete this.cookies[name]; return this; }),
    type: vi.fn(function (t) { this.headers['Content-Type'] = t; return this; }),
  };
  return res;
}

export function createMockNext() {
  return vi.fn();
}

export function createMockStore(initialCollections = {}) {
  const collections = {};
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  let idCounter = 0;

  function collection(name) {
    if (!collections[name]) collections[name] = [];
    return collections[name];
  }

  const mockStore = {
    _collections: collections,
    _seed(name, rows) {
      collections[name] = clone(rows);
    },
    _reset() {
      Object.keys(collections).forEach((key) => delete collections[key]);
    },
    getAll: vi.fn(async (name) => clone(collection(name))),
    getOne: vi.fn(async (name, predicate) => collection(name).find(predicate) || null),
    create: vi.fn(async (name, item) => {
      const record = {
        id: item.id || `test-${++idCounter}`,
        ...clone(item),
        created_at: item.created_at || now(),
        updated_at: item.updated_at || now(),
      };
      collection(name).push(record);
      return clone(record);
    }),
    update: vi.fn(async (name, predicate, updates) => {
      const rows = collection(name);
      const index = rows.findIndex(predicate);
      if (index === -1) return null;
      rows[index] = {
        ...rows[index],
        ...clone(updates),
        updated_at: now(),
      };
      return clone(rows[index]);
    }),
    deleteOne: vi.fn(async (name, predicate) => {
      const rows = collection(name);
      const index = rows.findIndex(predicate);
      if (index === -1) return false;
      rows.splice(index, 1);
      return true;
    }),
    deleteMany: vi.fn(async (name, predicate) => {
      const rows = collection(name);
      const before = rows.length;
      collections[name] = rows.filter((row) => !predicate(row));
      return before - collections[name].length;
    }),
    query: vi.fn(async (name, predicate, options = {}) => {
      let results = collection(name).filter(predicate);
      if (options.sort) {
        const { field, order = 'asc' } = options.sort;
        results = [...results].sort((a, b) => {
          const av = a[field];
          const bv = b[field];
          if (av < bv) return order === 'asc' ? -1 : 1;
          if (av > bv) return order === 'asc' ? 1 : -1;
          return 0;
        });
      }
      const page = Number(options.page || 1);
      const limit = Number(options.limit || results.length || 0);
      const start = limit > 0 ? (page - 1) * limit : 0;
      const data = limit > 0 ? results.slice(start, start + limit) : results;
      return { total: results.length, page, limit, data: clone(data) };
    }),
    count: vi.fn(async (name, predicate) => {
      const rows = collection(name);
      return predicate ? rows.filter(predicate).length : rows.length;
    }),
    generateId: vi.fn(() => `test-${++idCounter}`),
    initStore: vi.fn(),
  };

  Object.entries(initialCollections).forEach(([name, rows]) => mockStore._seed(name, rows));
  return mockStore;
}

export async function buildApp(router, mockStore = null, options = {}) {
  const app = express();
  app.use(express.json({ limit: options.jsonLimit || '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: options.urlencodedLimit || '1mb' }));
  app.use((req, res, next) => {
    res.locals.username = options.username || 'testuser';
    req.signedCookies = { strato_auth: res.locals.username };
    next();
  });
  app.use(router);
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message || 'Test route error' });
  });
  return app;
}

export const sampleUser = createMockUser({ xp: 250, level: 3, coins: 25 });

export const sampleBookmark = {
  id: 'bm1',
  username: 'testuser',
  url: 'https://example.com',
  title: 'Example',
  favicon: 'https://example.com/favicon.ico',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const sampleChatRoom = {
  id: 'room1',
  name: 'general',
  description: 'General chat',
  created_by: 'system',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const sampleExtension = {
  id: 'ext1',
  name: 'Dark Reader',
  code: 'dark-reader',
  description: 'Simple theme helper',
  script: 'document.documentElement.dataset.theme = "dark";',
  version: '1.0.0',
  downloads: 0,
  created_by: 'testuser',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const sampleTheme = {
  id: 'theme1',
  name: 'Neon Night',
  code: 'neon-night',
  config: { accent: '#00e5ff', bg: '#0a0a12' },
  downloads: 0,
  created_by: 'testuser',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const sampleScore = {
  id: 'score1',
  gameId: 'tetris',
  username: 'testuser',
  score: 1000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const sampleSave = {
  id: 'save1',
  username: 'testuser',
  gameId: 'tetris',
  data: JSON.stringify({ level: 1, score: 0 }),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
