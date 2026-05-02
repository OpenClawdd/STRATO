import { Router } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { resolveConfig, isUnresolved } from '../config/load-private-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// ── Shared port constant — matches src/index.js default ──
const DEFAULT_PORT = process.env.PORT || 8080;

// ── Load sites data (cached in memory) ──
let sitesCache = null;
let sitesCacheTime = 0;
const SITES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadSites() {
  const now = Date.now();
  if (sitesCache && (now - sitesCacheTime) < SITES_CACHE_TTL) {
    return sitesCache;
  }

  try {
    const sitesPath = join(__dirname, '..', '..', 'public', 'assets', 'sites.json');
    const data = fs.readFileSync(sitesPath, 'utf8');
    sitesCache = JSON.parse(data);
    sitesCacheTime = now;
    return sitesCache;
  } catch (err) {
    console.error('[STRATO] Failed to load sites.json:', err.message);
    return [];
  }
}

// ── GET /api/hub/sites — Return curated site directory ──
router.get('/api/hub/sites', (req, res) => {
  const sites = loadSites();
  const category = req.query.category;
  const search = req.query.search;

  let filtered = sites;

  if (category && category !== 'all') {
    filtered = filtered.filter(s => s.category === category);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q)
    );
  }

  res.json({
    total: sites.length,
    filtered: filtered.length,
    sites: filtered,
  });
});

// ── GET /api/hub/categories — Return unique categories with counts ──
router.get('/api/hub/categories', (req, res) => {
  const sites = loadSites();
  const categories = {};

  for (const site of sites) {
    const cat = site.category || 'uncategorized';
    categories[cat] = (categories[cat] || 0) + 1;
  }

  res.json(categories);
});

// ── Extended API routes (mirrors + cloak presets) ──

// ── GET /api/mirrors/status — Proxy mirror health status ──
let mirrorsCache = null;
let mirrorsCacheTime = 0;
const MIRRORS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function loadMirrors() {
  const now = Date.now();
  if (mirrorsCache && (now - mirrorsCacheTime) < MIRRORS_CACHE_TTL) {
    return mirrorsCache;
  }
  try {
    const result = resolveConfig('src/config/proxy-mirrors.json');
    mirrorsCache = result.data;
    mirrorsCacheTime = now;
    return mirrorsCache;
  } catch (err) {
    console.error('[STRATO] Failed to load proxy-mirrors.json:', err.message);
    return { mirrors: [], lastUpdated: null };
  }
}

router.get('/api/mirrors/status', (req, res) => {
  const data = loadMirrors();
  res.json({
    status: 'ok',
    count: data.mirrors?.length || 0,
    lastUpdated: data.lastUpdated,
    mirrors: (data.mirrors || []).map(m => ({
      id: m.id,
      name: m.name,
      resolved: !isUnresolved(m.primary),
      priority: m.priority,
      reliability: m.reliability,
      hasPassword: !!m.password && !isUnresolved(m.password),
      // Only send URLs if they're resolved
      ...(isUnresolved(m.primary) ? {} : { primary: m.primary }),
      ...(m.alternates?.some(a => !isUnresolved(a)) ? { alternates: m.alternates.filter(a => !isUnresolved(a)) } : {}),
    })),
  });
});

// ── GET /api/cloak/presets — Tab cloak presets ──
let cloakCache = null;
let cloakCacheTime = 0;
const CLOAK_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function loadCloakPresets() {
  const now = Date.now();
  if (cloakCache && (now - cloakCacheTime) < CLOAK_CACHE_TTL) {
    return cloakCache;
  }
  try {
    const result = resolveConfig('src/config/cloak-presets.json');
    cloakCache = result.data;
    cloakCacheTime = now;
    return cloakCache;
  } catch (err) {
    console.error('[STRATO] Failed to load cloak-presets.json:', err.message);
    return { presets: [] };
  }
}

router.get('/api/cloak/presets', (req, res) => {
  const data = loadCloakPresets();
  res.json({
    status: 'ok',
    count: data.presets?.length || 0,
    presets: (data.presets || []).map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      resolved: !isUnresolved(p.favicon),
      // Only send favicon if resolved (not a placeholder)
      ...(isUnresolved(p.favicon) ? { favicon: '/favicon.ico' } : { favicon: p.favicon }),
    })),
  });
});

// ── GET /api/proxy/health — Real proxy engine health check ──
router.get('/api/proxy/health', async (req, res) => {
  const result = { uv: false, scramjet: false, bare: false, wisp: false, lastChecked: Date.now() };

  // Check Bare server
  try {
    const bareResp = await fetch(`http://localhost:${DEFAULT_PORT}/bare/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    result.bare = bareResp.ok || bareResp.status === 200;
  } catch {
    result.bare = false;
  }

  // Check UV service worker
  try {
    const uvResp = await fetch(`http://localhost:${DEFAULT_PORT}/frog/uv.config.js`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    result.uv = uvResp.ok || uvResp.status === 200;
  } catch {
    result.uv = false;
  }

  // Check Scramjet — use the correct config path (/scramjet/config.js, NOT sj.config.js)
  try {
    const sjResp = await fetch(`http://localhost:${DEFAULT_PORT}/scramjet/config.js`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    result.scramjet = sjResp.ok || sjResp.status === 200;
  } catch {
    // Fallback: try the service worker file
    try {
      const sjResp2 = await fetch(`http://localhost:${DEFAULT_PORT}/scramjet/sw.js`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      result.scramjet = sjResp2.ok || sjResp2.status === 200;
    } catch {
      result.scramjet = false;
    }
  }

  // Check Wisp endpoint
  try {
    const wispResp = await fetch(`http://localhost:${DEFAULT_PORT}/wisp/`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    // Wisp uses WebSocket, so even a 400/404 means the route exists
    result.wisp = wispResp.status !== 502 && wispResp.status !== 503;
  } catch {
    result.wisp = false;
  }

  res.json(result);
});

export default router;
