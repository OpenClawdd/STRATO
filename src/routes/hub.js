import { Router } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

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
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
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
    categories[site.category] = (categories[site.category] || 0) + 1;
  }

  res.json(categories);
});

export default router;

// ── Extended API routes (mirrors + cloak presets) ──
// These are added to the same router for simplicity.

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
    const mirrorsPath = join(__dirname, '..', 'config', 'proxy-mirrors.json');
    const data = fs.readFileSync(mirrorsPath, 'utf8');
    mirrorsCache = JSON.parse(data);
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
    count: data.mirrors.length,
    lastUpdated: data.lastUpdated,
    mirrors: data.mirrors.map(m => ({
      id: m.id,
      name: m.name,
      primary: m.primary,
      alternates: m.alternates,
      priority: m.priority,
      reliability: m.reliability,
      hasPassword: !!m.password,
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
    const cloakPath = join(__dirname, '..', 'config', 'cloak-presets.json');
    const data = fs.readFileSync(cloakPath, 'utf8');
    cloakCache = JSON.parse(data);
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
    count: data.presets.length,
    presets: data.presets,
  });
});

// ── GET /api/proxy/health — Real proxy engine health check ──
router.get('/api/proxy/health', async (req, res) => {
  const result = { uv: false, scramjet: false, bare: false, wisp: false, lastChecked: Date.now() };

  // Check Bare server by fetching /bare/
  try {
    const bareResp = await fetch(`http://localhost:${process.env.PORT || 3000}/bare/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    result.bare = bareResp.ok || bareResp.status === 200;
  } catch (e) {
    result.bare = false;
  }

  // Check UV service worker — look for the UV config/worker file
  try {
    const uvResp = await fetch(`http://localhost:${process.env.PORT || 3000}/frog/uv.config.js`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    result.uv = uvResp.ok || uvResp.status === 200;
  } catch (e) {
    result.uv = false;
  }

  // Check Scramjet service worker — look for the SJ config
  try {
    const sjResp = await fetch(`http://localhost:${process.env.PORT || 3000}/scramjet/sj.config.js`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    result.scramjet = sjResp.ok || sjResp.status === 200;
  } catch (e) {
    // Try alternate path
    try {
      const sjResp2 = await fetch(`http://localhost:${process.env.PORT || 3000}/scramjet/sw.js`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      result.scramjet = sjResp2.ok || sjResp2.status === 200;
    } catch (e2) {
      result.scramjet = false;
    }
  }

  // Check Wisp — look for the wisp endpoint
  try {
    const wispResp = await fetch(`http://localhost:${process.env.PORT || 3000}/wisp/`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    // Wisp uses WebSocket, so even a 400/404 means the route exists
    result.wisp = wispResp.status !== 502 && wispResp.status !== 503;
  } catch (e) {
    result.wisp = false;
  }

  res.json(result);
});
