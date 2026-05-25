# STRATO Repo Map

Generated from the freshly cloned `OpenClawdd/STRATO` repo on 2026-05-25.

## 1. Actual Repo Structure

- Package manager: `pnpm@9.15.4` from `package.json` and `pnpm-lock.yaml`.
- Entrypoint: `src/index.js`.
- Frontend shell: `public/index.html`, `public/js/open-home-runtime.js`, legacy `public/js/app.js`, modular v5 under `public/js/v5/`.
- Catalog assets: `public/assets/games.json`, `public/assets/surfaces.json`, thumbnails under `public/assets/thumbnails/`.
- Local games: `public/games/*/index.html` includes `2048`, `tetris`, `snake`, `flappy-bird`, `pong`, `breakout`, `dino-runner`, `space-invaders`, `sudoku`, `minesweeper`, `connect-four`, `memory-match`, `typing-game`, `simon-says`, `tower-of-hanoi`, `pacman`, and `asteroids`.
- Proxy/generated transport assets are installed by `scripts/setup-proxy.cjs` into `public/frog/`, `public/scramjet/`, `public/epoxy/`, and BareMux worker paths.
- Server modules: `src/routes/*`, `src/middleware/*`, `src/config/load-private-config.js`, `src/db/store.js`, `src/websocket.js`.
- Validation/import/report scripts live in `scripts/*.mjs`.
- Tests are Vitest files under `tests/`, including routes, middleware, websocket, db, v5, source-hydra, source-radar, proxy runtime, and security audit coverage.
- Docs include `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, v5 release/QA docs, source/catalog guides, and API docs.

## 2. Runtime / Server Map

- `package.json` starts STRATO with `node src/index.js`; `pnpm dev` runs `node --watch src/index.js`.
- `src/index.js` sets `PORT = process.env.PORT || 8080`; verified server checks use `http://localhost:8080`.
- Runtime is a single Node HTTP server from `createServer()` with request dispatch:
  - `/bare/*` handled by `@tomphttp/bare-server-node` via `createBareServer('/bare/')`.
  - Everything else routes through the Express 5 app.
- WebSocket upgrade dispatch:
  - Bare upgrades go to Bare.
  - `/wisp/*` goes to `@mercuryworkshop/wisp-js/server` when available.
  - `/ws/chat` is left for `initWebSocket(server)` in `src/websocket.js`.
- First route is `GET /health`, before Helmet/auth/CSRF.
- Middleware order in `src/index.js`: Helmet, compression, signed cookie parser, JSON/urlencoded body parsing, sanitization, CSRF, API/chat/saves rate limits, auth middleware, catalog config endpoints, static `public/`, proxy asset cache middleware, route modules, error handler.
- Catalog endpoints resolve private config placeholders through `src/config/load-private-config.js`:
  - `GET /assets/games.json`
  - `GET /assets/surfaces.json`
  - `GET /api/config/status`
- Mounted route modules include proxy, AI, smuggle, hub, profile, leaderboard, bookmarks, saves, chat, themes, extensions, stealth, admin, notifications, data, and sources.

## 3. Proxy Stack Map

- Dependencies include Ultraviolet, Scramjet, Bare, Wisp, BareMux, and Epoxy:
  - `@titaniumnetwork-dev/ultraviolet`
  - `@mercuryworkshop/scramjet`
  - `@tomphttp/bare-server-node`
  - `@mercuryworkshop/wisp-js`
  - `@mercuryworkshop/bare-mux`
  - `@mercuryworkshop/epoxy-transport`
  - `@mercuryworkshop/epoxy-tls`
- `postinstall` runs `node scripts/setup-proxy.cjs`, which copies/paches transport assets.
- `src/routes/proxy.js` serves:
  - `/frog/uv.config.js` with UV prefix `/frog/` and Bare endpoint `/bare/`.
  - `/scramjet/config.js` with Scramjet prefix `/scramjet/` and Bare endpoint `/bare/`.
  - `/proxy-error` for escaped proxy error pages.
- `public/js/transport-init.js` initializes BareMux transport, registers UV/Scramjet service workers, and suppresses repeated BareMux retry noise.
- `public/js/v5/main.js` and `public/js/v5/core/launch.js` route external launches through `window.STRATO_NAVIGATE_PROXY` when available.
- Verified `pnpm run check:proxy` with `pnpm dev` running: transport assets and live routes returned HTTP 200, local green routes verified 16/16, and the script reported `STRATO signal strong`.
- Current proxy-proof queue remains non-empty by design: `remote_proxy_unverified: 134`; red quarantined count reported as `396`.

## 4. Catalog / Source Pipeline Map

- `public/assets/games.json` is the playable catalog; validation reported `Total games: 546`, `Issue count: 0`.
- `public/assets/surfaces.json` holds non-playable/config surfaces such as proxy and hub entries; these are excluded from active player launch surfaces by the catalog split.
- `src/config/load-private-config.js` resolves `${ENV_VAR}` placeholders from environment/private mirrors and exposes config status.
- Main validation/report/import scripts:
  - `scripts/validate-games.mjs`
  - `scripts/validate-sites.mjs`
  - `scripts/validate-sources.mjs`
  - `scripts/check-sources.mjs`
  - `scripts/catalog-report.mjs`
  - `scripts/catalog-atlas.mjs`
  - `scripts/strato-source-doctor.mjs`
  - `scripts/import-catalog.mjs`
  - `scripts/import-raw-sources.mjs`
  - `scripts/source-radar-lib.mjs`
- `scripts/validate-games.mjs` rejects placeholder URLs, unsafe schemes, adult/gambling/directory/proxy signals, missing local assets, duplicate/invalid launch data, and active generic-only launch candidates.
- Import workflow is review-first: imported candidates go to review/quarantine files and only approved entries merge into `games.json`.

## 5. Frontend Launch Flow

- `public/js/open-home-runtime.js` boots the v5 home by dynamic-importing `/js/v5/main.js` and exposing shell helpers like `STRATO_NAVIGATE`.
- `public/js/v5/main.js` fetches `/assets/games.json` and `/assets/surfaces.json`, initializes catalog state/health, binds navigation/search/settings, and wires Launch Bay iframe telemetry.
- `public/js/v5/core/catalog.js` normalizes catalog entries, filters playable/promotable catalogs, derives mood clusters, and uses local play counts for real `trendingGames()` data only.
- `public/js/v5/core/health.js` owns launchability/blocked/config/failure status used by Home and launch flow.
- `public/js/v5/core/launch.js` launches by id:
  - Finds the game in normalized catalog.
  - Rejects non-launchable entries.
  - Preflights local routes with `HEAD`/`GET`.
  - Records recent/play count/last played in localStorage.
  - For external `http(s)` URLs, hands off to `window.STRATO_NAVIGATE_PROXY` and tracks proxy iframe timeout/load/failure telemetry.
  - For local routes, switches to Browser/Launch Bay and sets `#proxy-iframe.src` to the local game URL.
- Verified `pnpm run check:launch` with `pnpm dev` running: 12/12 sampled games matched `/play/:id` with HTTP 302.

## 6. Test Command Map

- Install: `pnpm install`.
- Full tests: `pnpm test`.
- Single test file: `npx vitest tests/some.test.js` or `pnpm exec vitest tests/some.test.js`.
- Catalog validation: `pnpm run validate:games` or `node scripts/validate-games.mjs`.
- Proxy smoke: start `pnpm dev`, then `pnpm run check:proxy`.
- Launch smoke: start `pnpm dev`, then `pnpm run check:launch`.
- Other useful checks: `pnpm lint`, `pnpm format:check`, `pnpm source:validate`, `pnpm source:check`, `pnpm source:report`.
- Verified in this clone:
  - `pnpm install`: passed; postinstall copied proxy assets.
  - `pnpm test`: 27 files passed, 368 tests passed.
  - `pnpm run validate:games`: passed, 546 games, 0 issues.
  - `pnpm run check:proxy`: fails without server; passed with `pnpm dev` running.
  - `pnpm run check:launch`: fails without server; passed with `pnpm dev` running.

## 7. Top Real Failures From Current Checks

1. `check:proxy` and `check:launch` require a live server.

   Proof: both scripts failed against `http://localhost:8080` when no server was running, then passed with `pnpm dev` running.

   Smallest safe repair: documentation or script messaging only; do not change runtime. The scripts already print the server prerequisite.

2. `check:proxy` mutates tracked report files.

   Proof: after checks, `git status --short` showed modified `.strato-reports/proxy-proof-queue.csv` and `.strato-reports/proxy-proof-queue.json`.

   Smallest safe repair: decide whether these generated reports should be committed outputs, ignored, or written only behind an explicit flag.

3. Remote proxy proof queue is still large.

   Proof: passing `check:proxy` reported `remote_proxy_unverified: 134` and wrote proxy proof queue files.

   Smallest safe repair: process proof queue with the existing Source Hydra/proxy proof workflow; do not promote unverified remote launches.

4. Red quarantine remains large.

   Proof: passing `check:proxy` reported `red_quarantined: 396`.

   Smallest safe repair: continue repair/review batches through existing catalog repair scripts; do not expose red entries to Home/Search/Picks.

5. Live network/source checks are environment-dependent.

   Proof: README labels Source Doctor as a manual release gate, not CI-hard; proxy check does live wrapper smoke.

   Smallest safe repair: keep network checks separate from deterministic unit/catalog tests.

## 8. Safest Repair Order

1. Preserve the real repo baseline; do not copy any skeleton files into this clone.
2. Decide how to handle `check:proxy` generated report diffs before committing anything.
3. If repairing next, start with the highest-impact verified issue: make proxy-proof report generation explicit/non-mutating by default, or document it as an expected artifact.
4. Then reduce `remote_proxy_unverified` through the existing proof workflow without inventing verification.
5. Then work quarantine repair batches using existing validation/import scripts.
6. Only touch frontend launch UI after catalog/proxy truth changes are proven by `pnpm test`, `validate:games`, `check:proxy`, and `check:launch`.

## Do Not Touch Yet

- Do not replace `src/index.js` with skeleton `src/server.js`.
- Do not replace this repo's `package.json` or `pnpm-lock.yaml` with npm/package-lock files.
- Do not create placeholder catalog entries or fake launch surfaces.
- Do not weaken validation to make catalog/proxy checks pass.
- Do not refactor `src/routes/proxy.js`, `src/middleware/auth.js`, `src/middleware/csrf.js`, or `src/websocket.js` while doing frontend/catalog polish.
