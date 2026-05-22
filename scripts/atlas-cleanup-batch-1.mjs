#!/usr/bin/env node
/**
 * atlas-cleanup-batch-1.mjs
 *
 * Resolves 71 duplicate-url warnings and 4 gambling-content warnings.
 *
 * Decisions:
 * 1. Lucideon cluster (63 entries) — all share `https://lucideon.top/g/frame`,
 *    a generic frame endpoint, not individual game URLs. Quarantine all red.
 * 2. adfree-sz-games pair duplicates (6 entries) — mangled-name older IDs
 *    duplicating better-named entries at the same URL. Quarantine the weaker one.
 * 3. 3kh0 /undefined cluster (4 already red) — already red, no change needed.
 * 4. Gambling-content (4 entries) — roulette games inappropriate for school/
 *    Chromebook audience. Quarantine all red.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const catalogPath = path.join(rootDir, 'public', 'assets', 'games.json');

// Entries to quarantine red with reason
const QUARANTINE_RED = new Map([
  // ── Lucideon cluster: generic frame URL shared by 63 entries ─────────────
  // All have url=https://lucideon.top/g/frame — a generic iframe endpoint,
  // not individual game URLs. Mass-import artifact from import-captures.mjs.
  ['selenite-universal-paperclips', 'lucideon-generic-frame-url'],
  ['truffled-falling',              'lucideon-generic-frame-url'],
  ['truffled-touhoumother',         'lucideon-generic-frame-url'],
  ['selenite-xx142-b2-exe',         'lucideon-generic-frame-url'],
  ['selenite-snowrider3d',          'lucideon-generic-frame-url'],
  ['selenite-fireboywatergirl3',    'lucideon-generic-frame-url'],
  ['truffled-bopcity',              'lucideon-generic-frame-url'],
  ['truffled-nubby',                'lucideon-generic-frame-url'],
  ['truffled-dadish3d',             'lucideon-generic-frame-url'],
  ['truffled-slendy',               'lucideon-generic-frame-url'],
  ['selenite-king',                 'lucideon-generic-frame-url'],
  ['selenite-vex-x3m',             'lucideon-generic-frame-url'],
  ['selenite-minion',               'lucideon-generic-frame-url'],
  ['selenite-banjotooie',           'lucideon-generic-frame-url'],
  ['selenite-commodoreclicker',     'lucideon-generic-frame-url'],
  ['selenite-papashotdoggeria',     'lucideon-generic-frame-url'],
  ['selenite-racer',                'lucideon-generic-frame-url'],
  ['selenite-jake',                 'lucideon-generic-frame-url'],
  ['selenite-60sburgerrun',         'lucideon-generic-frame-url'],
  ['selenite-fish-rescue',          'lucideon-generic-frame-url'],
  ['selenite-turboracing3',         'lucideon-generic-frame-url'],
  ['selenite-dogeminer2',           'lucideon-generic-frame-url'],
  ['selenite-2d',                   'lucideon-generic-frame-url'],
  ['selenite-fort',                 'lucideon-generic-frame-url'],
  ['selenite-megamanzero',          'lucideon-generic-frame-url'],
  ['truffled-mergerot',             'lucideon-generic-frame-url'],
  ['selenite-baldi-remaster',       'lucideon-generic-frame-url'],
  ['selenite-fnf-bside',            'lucideon-generic-frame-url'],
  ['selenite-deepestsword',         'lucideon-generic-frame-url'],
  ['selenite-metroidii',            'lucideon-generic-frame-url'],
  ['selenite-speed-stars',          'lucideon-generic-frame-url'],
  ['selenite-1hobo',                'lucideon-generic-frame-url'],
  ['selenite-supermetroid',         'lucideon-generic-frame-url'],
  ['selenite-tabs',                 'lucideon-generic-frame-url'],
  ['selenite-stickrpg',             'lucideon-generic-frame-url'],
  ['selenite-pokemonmysterydungeon','lucideon-generic-frame-url'],
  ['selenite-osu',                  'lucideon-generic-frame-url'],
  ['selenite-civclicker',           'lucideon-generic-frame-url'],
  ['selenite-metroidfusion',        'lucideon-generic-frame-url'],
  ['selenite-pokemonyellow',        'lucideon-generic-frame-url'],
  ['selenite-wallsmash',            'lucideon-generic-frame-url'],
  ['selenite-minisho',              'lucideon-generic-frame-url'],
  ['selenite-supermarioland2',      'lucideon-generic-frame-url'],
  ['truffled-fred',                 'lucideon-generic-frame-url'],
  ['truffled-fnac',                 'lucideon-generic-frame-url'],
  ['truffled-domekeeper',           'lucideon-generic-frame-url'],
  ['selenite-wubz',                 'lucideon-generic-frame-url'],
  ['selenite-papalouie',            'lucideon-generic-frame-url'],
  ['selenite-supersmashflash2',     'lucideon-generic-frame-url'],
  ['selenite-bergentruck',          'lucideon-generic-frame-url'],
  ['selenite-pokemonfirered',       'lucideon-generic-frame-url'],
  ['truffled-karlson2d',            'lucideon-generic-frame-url'],
  ['selenite-sixcatsunder',         'lucideon-generic-frame-url'],
  ['truffled-scary-path',           'lucideon-generic-frame-url'],
  ['selenite-fridaynightfunkin',    'lucideon-generic-frame-url'],
  ['selenite-lofi-room',            'lucideon-generic-frame-url'],
  ['selenite-2sadv',                'lucideon-generic-frame-url'],
  ['selenite-superliquidsoccer',    'lucideon-generic-frame-url'],
  ['selenite-fld',                  'lucideon-generic-frame-url'],
  ['selenite-slope3',               'lucideon-generic-frame-url'],
  ['selenite-tattletail',           'lucideon-generic-frame-url'],
  ['selenite-4hobo',                'lucideon-generic-frame-url'],
  ['truffled-monk',                 'lucideon-generic-frame-url'],

  // ── adfree-sz-games.github.io pair duplicates ─────────────────────────────
  // Mangled-name older IDs sharing the same URL as a better-named entry.
  // Keep: 1v1-lol (adfree-resurrection, no needsCheck)
  ['1v1-lol-2',    'duplicate-url-weaker-entry'],
  // Keep: bob-the-robber-2 (frogie source, cleaner name)
  ['bobtherobber-2', 'duplicate-url-weaker-entry'],
  // Keep: burger-and-frights (frogie source, cleaner name)
  ['burgerandfrights', 'duplicate-url-weaker-entry'],
  // Keep: bad-ice-cream-2 (gn-math source, cleaner name)
  ['badicecream-2', 'duplicate-url-weaker-entry'],
  // Keep: bad-ice-cream-3 (gn-math source, cleaner name)
  ['badicecream-3', 'duplicate-url-weaker-entry'],
  // Keep: csgo-clicker (1key source, cleaner name)
  ['csgoclicker',  'duplicate-url-weaker-entry'],

  // ── Gambling-content ──────────────────────────────────────────────────────
  // Roulette-mechanic games inappropriate for school/Chromebook audience.
  ['buckshot-roulette',      'gambling-content-school-audience'],
  ['buckshot-roulette-port', 'gambling-content-school-audience'],
  ['orange-roulette-flash',  'gambling-content-school-audience'],
  ['roulette-hero',          'gambling-content-school-audience'],
]);

// 3kh0 /undefined cluster: already red, no action needed.
// IDs: cuttherope-holiday, cut-the-rope-time-travel, moto-x-3-m-spooky, n-gon
// The duplicate-url warning fires because all 4 share the same broken URL.
// They are already reliability:red and excluded from active surfaces.
// Documented here for record; no mutation needed.
const ALREADY_RED_NO_ACTION = [
  'cuttherope-holiday',
  'cut-the-rope-time-travel',
  'moto-x-3-m-spooky',
  'n-gon',
];

async function main() {
  const raw = await fs.readFile(catalogPath, 'utf8');
  const games = JSON.parse(raw);

  let changed = 0;
  let skipped = 0;
  let alreadyRed = 0;

  const changedIds = [];

  for (const game of games) {
    const reason = QUARANTINE_RED.get(game.id);
    if (!reason) continue;

    if (game.reliability === 'red') {
      alreadyRed++;
      continue;
    }

    game.reliability = 'red';
    game.quarantineReason = reason;
    game.quarantinedAt = new Date().toISOString().slice(0, 10);
    changed++;
    changedIds.push(game.id);
  }

  // Verify all targeted IDs exist in the catalog
  for (const [id] of QUARANTINE_RED) {
    const found = games.some(g => g.id === id);
    if (!found) {
      console.warn(`[WARN] ID not found in catalog: ${id}`);
      skipped++;
    }
  }

  await fs.writeFile(catalogPath, JSON.stringify(games, null, 2) + '\n', 'utf8');

  console.log('atlas-cleanup-batch-1 complete');
  console.log(`  Entries quarantined red: ${changed}`);
  console.log(`  Already red (skipped):   ${alreadyRed}`);
  console.log(`  IDs not found (skipped): ${skipped}`);
  console.log(`  No-action (already red): ${ALREADY_RED_NO_ACTION.join(', ')}`);
  console.log();
  console.log('Changed IDs:');
  for (const id of changedIds) {
    console.log(`  - ${id} (${QUARANTINE_RED.get(id)})`);
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
