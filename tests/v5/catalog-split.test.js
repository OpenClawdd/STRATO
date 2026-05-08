import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

function readAssetJson(name) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, 'public', 'assets', name), 'utf8'));
}

describe('v5.02 catalog split', () => {
  it('keeps playable games separate from review/config surfaces', () => {
    const games = readAssetJson('games.json');
    const surfaces = readAssetJson('surfaces.json');
    const blockedCategories = new Set(['proxies', 'directories', 'game-hubs']);

    expect(games.length).toBeGreaterThan(0);
    expect(surfaces.length).toBeGreaterThan(0);
    expect(games.some((game) => blockedCategories.has(String(game.category || '').toLowerCase()))).toBe(false);
    expect(games.some((game) => game.config_required || game.needsConfig)).toBe(false);
    expect(surfaces.every((surface) => surface.launchMode === 'surface')).toBe(true);
    expect(surfaces.some((surface) => blockedCategories.has(String(surface.category || '').toLowerCase()))).toBe(true);
  });
});
