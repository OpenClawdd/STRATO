/**
 * STRATO Private Config Loader
 *
 * Resolves ${ENV_VAR} placeholders in JSON config files at runtime.
 * Priority: .env → games-private.json → template defaults
 *
 * Usage:
 *   import { resolveConfig } from './config/load-private-config.js';
 *   const games = resolveConfig('./assets/games.json');
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Recursively resolve ${VAR} placeholders in an object/string.
 * Checks process.env first, then falls back to the privateConfig map.
 */
function resolveValue(value, privateConfig = {}) {
  if (typeof value === 'string') {
    return value.replace(/\$\{(\w+)\}/g, (match, varName) => {
      // Priority: env var → private config → keep placeholder
      if (process.env[varName] !== undefined) return process.env[varName];
      if (privateConfig[varName] !== undefined) return privateConfig[varName];
      return match; // Leave unresolved — frontend will show "Configure" CTA
    });
  }
  if (Array.isArray(value)) return value.map(v => resolveValue(v, privateConfig));
  if (value !== null && typeof value === 'object') {
    const resolved = {};
    for (const [k, v] of Object.entries(value)) {
      // Skip _comment keys
      if (k === '_comment') continue;
      resolved[k] = resolveValue(v, privateConfig);
    }
    return resolved;
  }
  return value;
}

/**
 * Load the private config file (games-private.json) if it exists.
 * Returns a flat key→value map. Results are cached for 5 minutes.
 */
let privateConfigCache = null;
let privateConfigCacheTime = 0;
const PRIVATE_CONFIG_TTL = 5 * 60 * 1000; // 5 minutes

function loadPrivateConfig() {
  const now = Date.now();
  if (privateConfigCache && (now - privateConfigCacheTime) < PRIVATE_CONFIG_TTL) {
    return privateConfigCache;
  }

  const privatePath = join(__dirname, '..', '..', 'games-private.json');
  try {
    if (fs.existsSync(privatePath)) {
      const raw = JSON.parse(fs.readFileSync(privatePath, 'utf8'));
      // Flatten nested mirrors object into KEY→value map
      const flat = {};
      if (raw.mirrors && typeof raw.mirrors === 'object') {
        for (const [key, val] of Object.entries(raw.mirrors)) {
          // Convert key name to ENV_VAR format: "splash" → "PROXY_SPLASH"
          const envKey = `PROXY_${key.toUpperCase().replace(/-/g, '_')}`;
          if (typeof val === 'string') {
            flat[envKey] = val;
          } else if (Array.isArray(val)) {
            // First item is primary, second is alt
            flat[envKey] = val[0];
            if (val[1]) flat[`${envKey}_ALT`] = val[1];
          }
        }
      }
      // Also load any flat keys (HUB_*, CLOAK_*, etc.)
      for (const [key, val] of Object.entries(raw)) {
        if (key === 'mirrors' || key === '_comment') continue;
        if (typeof val === 'string') flat[key] = val;
      }
      privateConfigCache = flat;
      privateConfigCacheTime = now;
      return flat;
    }
  } catch (err) {
    console.warn('[STRATO] Failed to load private config:', err.message);
  }
  privateConfigCache = {};
  privateConfigCacheTime = now;
  return {};
}

/**
 * Check if a value is still an unresolved placeholder
 */
function isUnresolved(value) {
  return typeof value === 'string' && /^\$\{/.test(value);
}

/**
 * Main: Load and resolve a JSON config file.
 * @param {string} relativePath - Path relative to project root (e.g., './assets/games.json')
 * @returns {{ data: any, unresolved: string[], resolved: number }}
 */
export function resolveConfig(relativePath) {
  // __dirname = .../src/config → go up TWO levels to reach project root
  const rootDir = join(__dirname, '..', '..');
  const fullPath = join(rootDir, relativePath);

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (err) {
    console.error(`[STRATO] Failed to load config ${relativePath}:`, err.message);
    return { data: null, unresolved: [], resolved: 0 };
  }

  const privateConfig = loadPrivateConfig();
  const resolved = resolveValue(raw, privateConfig);

  // Count unresolved placeholders
  const unresolved = [];
  function findUnresolved(obj, path = '') {
    if (typeof obj === 'string' && isUnresolved(obj)) {
      const varName = obj.match(/\$\{(\w+)\}/)?.[1];
      if (varName && !unresolved.includes(varName)) unresolved.push(varName);
    }
    if (Array.isArray(obj)) obj.forEach((v, i) => findUnresolved(v, `${path}[${i}]`));
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) findUnresolved(v, `${path}.${k}`);
    }
  }
  findUnresolved(resolved);

  const totalPlaceholders = Object.keys(privateConfig).length;
  console.log(`[STRATO] Config ${relativePath}: ${unresolved.length} unresolved, ${totalPlaceholders} from private config`);

  return { data: resolved, unresolved, resolved: totalPlaceholders - unresolved.length };
}

/**
 * Get config status for the /api/config/status endpoint
 */
export function getConfigStatus() {
  const gamesResult = resolveConfig('public/assets/games.json');
  const mirrorsResult = resolveConfig('public/assets/sites.json');

  return {
    games: {
      total: Array.isArray(gamesResult.data) ? gamesResult.data.length : 0,
      unresolved: gamesResult.unresolved,
      resolved: gamesResult.resolved,
    },
    mirrors: {
      total: mirrorsResult.data?.mirrors?.length || 0,
      unresolved: mirrorsResult.unresolved,
      resolved: mirrorsResult.resolved,
    },
    privateConfigLoaded: Object.keys(loadPrivateConfig()).length > 0,
  };
}

export { resolveValue, isUnresolved, loadPrivateConfig };
