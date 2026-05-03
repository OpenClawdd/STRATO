import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CACHE_TTL = 30_000; // 30 seconds

// ── Valid collections ──
const VALID_COLLECTIONS = new Set([
  'users',
  'scores',
  'bookmarks',
  'history',
  'saves',
  'themes',
  'extensions',
  'chat_rooms',
  'chat_messages',
]);

// ── In-memory cache ──
const cache = new Map();

// ── Write locks per collection to handle concurrent access ──
const locks = new Map();

function getLock(collection) {
  if (!locks.has(collection)) {
    locks.set(collection, { writing: false, queue: [] });
  }
  return locks.get(collection);
}

function acquireLock(collection) {
  return new Promise((resolve) => {
    const lock = getLock(collection);
    if (!lock.writing) {
      lock.writing = true;
      resolve();
    } else {
      lock.queue.push(resolve);
    }
  });
}

function releaseLock(collection) {
  const lock = getLock(collection);
  lock.writing = false;
  if (lock.queue.length > 0) {
    lock.writing = true;
    const next = lock.queue.shift();
    next();
  }
}

// ── Ensure data directory and collection files exist ──
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function collectionPath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function ensureCollectionFile(collection) {
  ensureDataDir();
  const filePath = collectionPath(collection);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
  }
}

// ── Atomic write: write to temp file, then rename ──
function atomicWrite(filePath, data) {
  const tmpPath = filePath + '.tmp.' + crypto.randomBytes(6).toString('hex');
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

// ── Cache helpers ──
function cacheGet(collection) {
  const entry = cache.get(collection);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(collection);
    return null;
  }
  return entry.data;
}

function cacheSet(collection, data) {
  cache.set(collection, { data, ts: Date.now() });
}

function cacheInvalidate(collection) {
  cache.delete(collection);
}

// ── Read collection from disk (with cache) ──
function readCollection(collection) {
  const cached = cacheGet(collection);
  if (cached !== null) return cached;

  ensureCollectionFile(collection);
  try {
    const raw = fs.readFileSync(collectionPath(collection), 'utf8');
    const data = JSON.parse(raw);
    cacheSet(collection, data);
    return data;
  } catch {
    // Corrupted file — reset
    const data = [];
    atomicWrite(collectionPath(collection), data);
    cacheSet(collection, data);
    return data;
  }
}

// ── Write collection to disk (with lock) ──
async function writeCollection(collection, data) {
  await acquireLock(collection);
  try {
    ensureCollectionFile(collection);
    atomicWrite(collectionPath(collection), data);
    cacheSet(collection, data);
  } finally {
    releaseLock(collection);
  }
}

// ── Generate unique ID ──
export function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

// ── Validate collection name ──
function validateCollection(collection) {
  if (!VALID_COLLECTIONS.has(collection)) {
    throw new Error(`Invalid collection: ${collection}`);
  }
}

// ── CRUD Operations ──

export async function getAll(collection) {
  validateCollection(collection);
  return readCollection(collection);
}

export async function getOne(collection, predicate) {
  validateCollection(collection);
  const data = readCollection(collection);
  return data.find(predicate) || null;
}

export async function create(collection, item) {
  validateCollection(collection);
  const data = readCollection(collection);
  const record = {
    id: generateId(),
    ...item,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  data.push(record);
  await writeCollection(collection, data);
  return record;
}

export async function update(collection, predicate, updates) {
  validateCollection(collection);
  const data = readCollection(collection);
  const index = data.findIndex(predicate);
  if (index === -1) return null;
  data[index] = {
    ...data[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await writeCollection(collection, data);
  return data[index];
}

export async function deleteOne(collection, predicate) {
  validateCollection(collection);
  const data = readCollection(collection);
  const index = data.findIndex(predicate);
  if (index === -1) return false;
  data.splice(index, 1);
  await writeCollection(collection, data);
  return true;
}

export async function deleteMany(collection, predicate) {
  validateCollection(collection);
  const data = readCollection(collection);
  const filtered = data.filter((item) => !predicate(item));
  const removed = data.length - filtered.length;
  if (removed > 0) {
    await writeCollection(collection, filtered);
  }
  return removed;
}

export async function query(collection, predicate, options = {}) {
  validateCollection(collection);
  const data = readCollection(collection);
  let results = data.filter(predicate);

  // Sort
  if (options.sort) {
    const { field, order = 'asc' } = options.sort;
    results.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Pagination
  const page = options.page || 1;
  const limit = options.limit || results.length;
  const start = (page - 1) * limit;
  const paginated = results.slice(start, start + limit);

  return {
    total: results.length,
    page,
    limit,
    data: paginated,
  };
}

export async function count(collection, predicate) {
  validateCollection(collection);
  const data = readCollection(collection);
  if (predicate) {
    return data.filter(predicate).length;
  }
  return data.length;
}

// ── Initialize all collection files on startup ──
export function initStore() {
  ensureDataDir();
  for (const col of VALID_COLLECTIONS) {
    ensureCollectionFile(col);
  }
  // Seed default chat rooms if none exist
  try {
    const rooms = JSON.parse(fs.readFileSync(collectionPath('chat_rooms'), 'utf8'));
    if (rooms.length === 0) {
      const defaultRooms = [
        { id: generateId(), name: 'general', description: 'General chat — talk about anything', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: generateId(), name: 'gaming', description: 'Gaming discussion and tips', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: generateId(), name: 'help', description: 'Get help with STRATO or homework', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ];
      atomicWrite(collectionPath('chat_rooms'), defaultRooms);
      cacheSet('chat_rooms', defaultRooms);
      console.log('[STRATO] Seeded default chat rooms');
    }
  } catch (e) {
    console.warn('[STRATO] Could not seed chat rooms:', e.message);
  }
  console.log('[STRATO] Database store initialized');
}

export default {
  getAll,
  getOne,
  create,
  update,
  deleteOne,
  deleteMany,
  query,
  count,
  generateId,
  initStore,
};
