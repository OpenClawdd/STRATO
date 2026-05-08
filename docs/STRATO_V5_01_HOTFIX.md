# STRATO v5.01 Hotfix

Goal: stabilize v5 without starting a new era or adding shiny features.

## Fixed

- v5 Home is the source of truth for Home/search/picks/favorites/recents/recovery.
- Legacy `app.js` no longer rewrites v5 Home surfaces after v5 is active.
- Legacy refresh calls now bridge into v5 instead of risking stale Home UI.
- Removed the recursive `refreshOpenHome()` fallback that could stack overflow if v5 was unavailable.
- Legacy and v5 launch failure storage now share `strato-recentFailures`.
- Service worker cache names and visible version strings now say v5.01.
- v5 modules are listed in the static service worker cache.
- Backend cleanup intervals are unref'd so Vitest can exit cleanly.
- ESLint 9 has a flat config.
- CI now fails on format/lint/test/catalog problems instead of hiding them.

## Not included

- No new features.
- No stealth/evasion improvements.
- No catalog expansion.
- No redesign.

## Manual QA

1. Start locally with `npm start`.
2. Open Home and confirm Catalog Pulse shows launchable count.
3. Search for `2048`, use arrows, press Enter, and confirm Launch Bay opens.
4. Favorite a game and confirm Hideout Shelf updates without reload.
5. Launch two games and confirm Recent Launches updates.
6. Use Surprise Me twice and confirm it avoids the most recent picks when possible.
7. Reload page and confirm v5.01 appears in splash/about.
8. Open DevTools and confirm no repeated refresh errors.
9. Run `node scripts/validate-games.mjs`; warnings are allowed, errors are not.
10. Run `npm test -- --maxWorkers=1`.
