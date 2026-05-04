# STRATO

STRATO is a self-hosted arcade and app hub built around one job: open here first, search the catalog, and launch something without dead ends.

The current app is an Express 5 server with a single-page frontend, a local game catalog, WebSocket chat support, optional AI features, PWA assets, and local personalization powered by `localStorage`.

## What Is Implemented

- STRATO 3.0 Home with catalog search, one-click launch, Daily Picks, Favorites, Recently Played, and Surprise Me.
- Real personalization using `strato-favorites`, `strato-recent`, `strato-playCounts`, `strato-lastPlayed`, and `strato-preferences`.
- Signal Health checks that keep missing URLs, config-required entries, local failures, and non-game surfaces out of featured home sections.
- Launch recovery modal with Retry, Try Surprise Me, Back to STRATO, and similar game suggestions when metadata allows it.
- Fallback thumbnail art for missing or broken images.
- Low Power mode and reduced-motion support.
- Local standalone games in `public/games/*`.
- Catalog validation with `scripts/validate-games.mjs`.
- Review-first catalog imports with `scripts/import-catalog.mjs`.
- Express routes for auth, profile, bookmarks, saves, themes, extensions, chat, hub data, and AI endpoints.
- WebSocket chat tests and backend route tests.

## Experimental Or Config-Dependent

- Ultraviolet, Scramjet, Bare, BareMux, Wisp, and related transport behavior depends on installed packages, browser support, and deployment configuration.
- AI features require a working `.z-ai-config` and are disabled gracefully when not configured.
- Some catalog entries are placeholders for private or deployment-specific URLs. They are not promoted on Home unless configured and launchable.
- Extension, theme gallery, media, and profile systems exist, but production readiness depends on deployment policy and review.

## Responsible Use

STRATO should be treated as a self-hosted arcade/app hub. Do not use the project description, README, catalog, or UI to frame STRATO as a restriction-circumvention tool. Only import catalog metadata from public/allowed sources, respect licensing and terms, and do not hotlink assets unless allowed.

## Requirements

- Node.js 18 or newer
- pnpm 9.x recommended
- npm also works for tests/start

## Setup

```bash
pnpm install
cp .env.example .env
pnpm start
```

The default server listens on `http://localhost:8080`.

For local development:

```bash
pnpm dev
```

## Environment

Important variables:

- `PORT`: defaults to `8080`.
- `NODE_ENV`: use `development` locally and `production` in deployment.
- `COOKIE_SECRET`: required in production.
- Optional catalog URL placeholders in `.env.example`: leave empty unless you own the target and want those entries configured.

AI uses `.z-ai-config` when present. Missing AI config should not stop the app from starting.

## Commands

```bash
npm test
pnpm test
node scripts/validate-games.mjs
node scripts/import-catalog.mjs --source manual --file scripts/manual-games.txt --dry-run
node scripts/import-catalog.mjs --source all --dry-run
node scripts/import-catalog.mjs --source all --review
node scripts/import-catalog.mjs --merge-approved
```

## Catalog Validation

`scripts/validate-games.mjs` checks:

- missing title or URL
- duplicate title or URL
- invalid or unsupported URL schemes
- placeholder URLs
- missing categories, tags, descriptions, and thumbnails
- local thumbnail file existence
- adult, gambling, and non-playable directory/proxy signals

Warnings are allowed for optional metadata and config-required placeholders. Serious catalog errors exit nonzero.

Current expected audit shape: the catalog has playable local/external games plus config-required entries that are intentionally hidden from STRATO Home until configured.

## Catalog Imports

Import docs live at `docs/STRATO_CATALOG_IMPORTS.md`.

The importer writes candidates to `public/assets/games.imported.review.json`. Nothing is merged into `games.json` until an entry is manually marked `approved: true` and `node scripts/import-catalog.mjs --merge-approved` is run.

`--merge-approved` creates a timestamped `.bak` backup of `games.json`, de-dupes aggressively, prefers existing STRATO entries, and prints added/skipped/rejected counts.

## Troubleshooting

- App does not start in production: set `COOKIE_SECRET`.
- Home has no Daily Picks: `games.json` has no launchable, non-config-required games.
- A game fails to launch: use the failure modal. STRATO records recent local failures and stops promoting that entry temporarily.
- Missing thumbnails: fallback art should render instead of a broken image icon.
- AI offline: add a valid `.z-ai-config` or use the rest of STRATO without AI.
- Transport warnings in console: proxy transports are experimental/config-dependent; local games and catalog UI should still work.

## Project Layout

```text
public/index.html             STRATO single-page UI
public/js/app.js              Home, arcade, launch, personalization logic
public/css/style.css          Main visual system
public/assets/games.json      Catalog
public/games/                 Local standalone games
scripts/validate-games.mjs    Catalog validator
scripts/import-catalog.mjs    Review-first import engine
tests/                        Vitest test suite
```

## License

GPL-3.0.
