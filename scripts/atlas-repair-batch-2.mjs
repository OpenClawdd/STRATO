#!/usr/bin/env node
/**
 * atlas-repair-batch-2.mjs
 *
 * Promotes 9 red entries to yellow (active remote candidate) where:
 * 1. The entry URL is confirmed live (HTTP 200) as of 2026-05-20.
 * 2. The URL has no XFO / CSP frame-ancestors blocking the top-level page.
 * 3. The game is a well-known browser-playable title appropriate for STRATO.
 * 4. reliability stays yellow (not green) — external URLs are never green.
 * 5. needsCheck: true is preserved so launch verification is required before
 *    any further promotion.
 *
 * NOT promoted (reasons documented):
 * - fnf / paper-io-2:      3kh0-assets paths return 404. Dead.
 * - parkour-race:          fetch failed / unreachable.
 * - osu:                   osu.ppy.sh/home is a native app launcher, not
 *                          a browser game.
 * - burritobison/cheeserolling/cookingmama/cookingmama-2/deltatraveler:
 *                          selenite.cc/projects/* returns 404 for all five.
 * - truffled-karlson2d / truffled-slendy / selenite-supersmashflash2:
 *                          Still pointing at lucideon.top/g/frame (generic
 *                          frame URL). No real playable URL found.
 * - score-25 gn-math entries (coreball/poly-track/shredsauce):
 *                          gn-math.dev/#game-N hash URLs are homepage traps.
 * - score-95 adfree pairs: Already handled in Batch 1. Canonical entries
 *                          (1v1-lol, bad-ice-cream-2, etc.) are yellow/active.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const catalogPath = path.join(rootDir, 'public', 'assets', 'games.json');

// Confirmed live (HTTP 200, no XFO/CSP frame block) as of 2026-05-20.
// External IDs confirmed to launch in a standard browser tab.
// All promoted to yellow with needsCheck:true for human launch verification.
const PROMOTE_TO_YELLOW = new Map([
  ['krunker',      { note: 'HTTP 200 krunker.io — fast FPS, well-known school classic' }],
  ['slither-io',   { note: 'HTTP 200 slither.io — classic .io snake game' }],
  ['hole-io',      { note: 'HTTP 200 hole-io.com — physics .io game' }],
  ['geometry-dash',{ note: 'HTTP 200 geometrydash.io — rhythm platformer (browser port)' }],
  ['bonk-io',      { note: 'HTTP 200 bonk.io — physics multiplayer brawler' }],
  ['skribbl-io',   { note: 'HTTP 200 skribbl.io — draw-and-guess, school-safe social' }],
  ['zombs-royale', { note: 'HTTP 200 zombsroyale.io — 2D battle royale' }],
  ['helix-jump',   { note: 'HTTP 200 helixjump.io — casual ball-drop arcade' }],
  ['dead-zed',     { note: 'HTTP 200 deadzed.com — zombie shooter (mild violence, no gore flag)' }],
]);

async function main() {
  const raw = await fs.readFile(catalogPath, 'utf8');
  const games = JSON.parse(raw);

  let promoted = 0;
  let skipped = 0;
  const promotedIds = [];
  const notFound = [];

  for (const [id, meta] of PROMOTE_TO_YELLOW) {
    const game = games.find(g => g.id === id);
    if (!game) {
      notFound.push(id);
      console.warn(`[WARN] ID not found in catalog: ${id}`);
      continue;
    }

    if (game.reliability !== 'red') {
      console.log(`[SKIP] ${id} — already ${game.reliability}, no change needed`);
      skipped++;
      continue;
    }

    // Promote to yellow
    game.reliability = 'yellow';
    game.needsCheck = true;

    // Clear any stale quarantine metadata
    delete game.quarantineReason;
    delete game.quarantinedAt;

    // Record repair audit trail
    game.repairedAt = new Date().toISOString().slice(0, 10);
    game.repairNote = meta.note;

    promoted++;
    promotedIds.push(id);
  }

  // Verify no new entries were added
  if (games.length !== JSON.parse(raw).length) {
    console.error('[ERROR] Entry count changed — aborting');
    process.exitCode = 1;
    return;
  }

  await fs.writeFile(catalogPath, JSON.stringify(games, null, 2) + '\n', 'utf8');

  console.log('atlas-repair-batch-2 complete');
  console.log(`  Promoted red → yellow: ${promoted}`);
  console.log(`  Already active (skipped): ${skipped}`);
  console.log(`  IDs not found: ${notFound.length}`);
  console.log();
  console.log('Promoted IDs:');
  for (const id of promotedIds) {
    const note = PROMOTE_TO_YELLOW.get(id).note;
    console.log(`  + ${id} — ${note}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
