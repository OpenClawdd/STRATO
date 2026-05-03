/**
 * STRATO v21 — Test Setup
 * Global setup, mocks, and utilities for all tests
 */

import { vi } from 'vitest';

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
