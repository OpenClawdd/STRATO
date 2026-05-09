# STRATO v5.03 — Frontend Launch Polish

This release is a frontend polish pass on top of the v5.02 catalog split.

## Goals

- Make Home feel like a premium launch desk instead of a generic grid.
- Keep Search as the primary interaction: type, arrow through results, press Enter to launch.
- Improve cards with clearer category, tags, favorite state, and local launch metadata.
- Add a real Browse the Launch Shelf section powered only by the clean `games.json` catalog.
- Improve the Launch Sheet with stronger wording and a direct launch action.
- Preserve v5.02 catalog discipline: playable games stay in `games.json`; non-game surfaces stay out of Home.

## Files touched

- `public/index.html`
- `public/css/style.css`
- `public/js/v5/main.js`
- `public/js/v5/ui/home.js`
- `public/js/v5/ui/cards.js`
- `public/js/v5/ui/sheet.js`
- `public/js/v5/core/search.js`
- `README.md`
- `tests/v5/frontend-polish.test.js`

## QA

Run:

```bash
npm run format:check
npm run lint
npm test -- --maxWorkers=1
node scripts/validate-games.mjs
```

Expected:

- 17 test files pass.
- 304 tests pass.
- Catalog validation reports 54 games and 0 warnings.
