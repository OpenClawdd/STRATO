# AGENTS.md

Authoritative instructions for AI coding agents in this repo. `CLAUDE.md` points here.

## Quick Commands

```bash
pnpm install
pnpm dev                     # node --watch src/index.js
pnpm start                   # node src/index.js (port 8080 default)
pnpm test                    # vitest run
pnpm exec vitest tests/routes/profile.test.js
pnpm lint
pnpm format:check
pnpm source:validate         # scripts/validate-sources.mjs
node scripts/validate-games.mjs
```

## Required Verification Order

Match CI before claiming done:

```bash
pnpm format:check
pnpm lint
pnpm test -- --maxWorkers=1
node scripts/validate-games.mjs
node scripts/catalog-atlas.mjs
```

If you changed source ingestion/trust logic, also run:

```bash
pnpm source:validate
```

## Architecture That Matters

- Node 18+ ESM app, single process, no frontend build step (`src/index.js` is entry).
- Request routing is tiered: Bare transport (`/bare/*`) first, then Express; WebSocket upgrades split across Bare, Wisp (`/wisp/*`), and chat (`/ws/chat`).
- Middleware order in `src/index.js` is security-critical: health route first, then helmet/compression/cookies/body/sanitize/csrf/rate limits/auth/static/routes/error handler.
- Frontend is vanilla JS SPA; keep `public/js/v5/core/*` (logic) and `public/js/v5/ui/*` (rendering) structure intact; do not migrate to React/Vue/Tailwind.
- Catalog split is intentional: `public/assets/games.json` is playable entries; `public/assets/surfaces.json` is non-playable surfaces excluded from Home/Search/Picks.

## Repo-Specific Guardrails

- Keep changes small and testable; do not commit unless explicitly asked.
- Do not touch proxy/auth/security internals during UI polish work: `src/routes/proxy.js`, `src/middleware/auth.js`, `src/middleware/csrf.js`, `src/websocket.js`.
- No dead UI: hide non-functional actions instead of rendering disabled/placeholder controls.
- Empty states should usually be omitted from launch surfaces (no "nothing here" filler blocks).
- Favor retention-first product language and flows; avoid steering users out of STRATO.

## Testing and Data Quirks

- Vitest uses `tests/setup.js` globally; DB calls are mocked there (`vi.mock('../src/db/store.js')`).
- For route/service tests, prefer existing helpers from `tests/setup.js` (`createMockStore`, request/response factories).
- Catalog edits require `node scripts/validate-games.mjs`; this is a practical gate for launch-surface integrity.

## Config and Security Details

- Runtime config placeholders (`${ENV_VAR}`) in catalog/surface JSON are resolved by `src/config/load-private-config.js` from `process.env` first, then `games-private.json`; unresolved placeholders are expected and surfaced as Configure CTAs.
- In production, `COOKIE_SECRET` is required or server boot fails.
- Admin secret handling is strict: use `x-admin-secret`; never store admin secrets in `localStorage`, URLs, or committed files.
