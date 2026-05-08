# STRATO v5.02 — Catalog Purge + Surface Split

## What changed

STRATO v5.02 separates playable games from non-playable surfaces.

- `public/assets/games.json` contains launchable games only.
- `public/assets/surfaces.json` contains directories, hubs, configured external surfaces, and review-only entries.
- Home, Search, Daily Picks, Surprise Me, Favorites, Recently Played, and Most Played should only use `games.json`.
- Config resolution still supports `surfaces.json` through `/assets/surfaces.json`.

## Why

Before v5.02, `games.json` included real games plus configured directory/resource surfaces. The validator correctly hid those from Home, but the catalog still advertised inflated totals and produced warnings for entries that were not supposed to be games.

v5.02 makes the data model honest: games are games, surfaces are surfaces.

## QA commands

```bash
npm run format:check
npm run lint
npm test -- --maxWorkers=1
node scripts/validate-games.mjs
npm start
```

Expected catalog validation after the split:

```txt
STRATO catalog validation
Total games: 54
Issue count: 0 (0 errors, 0 warnings)
Quarantine candidates: 0
```

## Next follow-up

A later release can add a dedicated review-only Sources/Surfaces screen, but v5.02 intentionally keeps those entries out of game discovery surfaces.
