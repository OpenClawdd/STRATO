# AGENTS.md

This file is the authoritative guide for all AI coding agents (Claude, Gemini, Codex, etc.) working on the STRATO repository.

## Common Commands

```bash
pnpm install                # Install dependencies
pnpm start                  # Start production server on :8080
pnpm dev                    # Start dev server with --watch
pnpm test                   # Run all tests (vitest)
npx vitest tests/some.test.js  # Run a single test file
pnpm lint                   # ESLint on src/, public/js/v5/, scripts/validate-games.mjs
pnpm format                 # Prettier format
node scripts/validate-games.mjs          # Audit catalog for errors
node scripts/check-sources.mjs           # Check remote catalog sources
node scripts/catalog-report.mjs          # Catalog intelligence report
pnpm source:validate        # Run Source Hydra validator
```

## Project Rules

- **Retention-first**: STRATO is the place users open first. Every feature should keep users inside STRATO, not push them to external sites. Links, CTAs, and launch surfaces should favor staying in the hideout.
- **No fake surfaces**: If a section has no data (empty favorites, no recent launches, zero search results), hide it entirely rather than showing "Nothing here yet" dead UI. Empty state is silent, not a placeholder.
- **No dead buttons**: Every visible button must work or be hidden. No "coming soon" CTAs, no disabled buttons with no explanation. If a feature isn't wired up, don't render its trigger.
- **Preserve vanilla ES architecture**: The `public/js/v5/` module structure (`core/` for logic, `ui/` for rendering) is intentional. Don't rewrite it into a framework like React/Tailwind. Small focused vanilla JS modules over large refactors.
- **School/Chromebook performance**: Assume 4GB RAM, weak CPU, and spotty network. Avoid large DOM trees, heavy animations, or memory leaks from retained event listeners. Test with Low Power mode on.
- **Prefer small, testable changes**: Each change should be verifiable in isolation. Stop for review after each squad phase. "Commit only when told".
- **Proxy/auth/security routes are off-limits during frontend polish**: Don't refactor or "clean up" route handlers in `src/routes/proxy.js`, `src/middleware/auth.js`, `src/middleware/csrf.js`, or `src/websocket.js` while doing UI work. Those files have security implications and must not regress.
- **Catalog surface hygiene**: When touching catalog data or surface rendering, verify placeholder/demo/config-required entries are filtered from launch surfaces. Run `node scripts/validate-games.mjs` after catalog changes.
- **Brand consistency**: STRATO is a polished launch universe — think "mission control for the fun internet," not a generic game site. Language should feel elevated, tactile, and cohesive. "Launch Bay" not "iframe", "Hideout" not "dashboard", "Catalog Pulse" not "stats", "Source Hydra" not "links".

## Architecture

STRATO is a single-process Node.js Express 5 server (port 8080) serving a vanilla JS SPA. No bundler, no framework, no TypeScript.

### Server (`src/index.js`)

Single `createServer` with three routing tiers dispatched on `server.on("request")`:
1. **Bare** (`/bare/*`) — proxy transport for Ultraviolet/Scramjet
2. **Wisp** (`/wisp/*`) — WebSocket transport for proxy engines
3. **Express** — everything else

Middleware stack (in order): health check route → Helmet (CSP/HSTS) → compression → cookie-parser (signed) → JSON/URL-encoded body → input sanitization → CSRF protection → tiered rate limiting (api: 60/min, chat: 30/min, saves: 10/min) → auth middleware (TOS gate) → catalog config endpoints → static files → route handlers → error handler.

### Auth (`src/middleware/auth.js`)

Cookie-based auth using signed cookies (`strato_auth`). Login page is server-rendered from pre-loaded `public/login.html` with CSRF token injected. CSRF tokens stored in-memory with 10-min TTL. Username validated as 1-24 alphanumeric+underscore. User profiles auto-created on first authenticated request.

### Database (`src/db/store.js`)

Custom JSON file store. Each collection is a separate `.json` file under `data/`. Atomic writes (temp file + rename), write locks per collection, 30-second in-memory cache TTL. Collections: users, scores, bookmarks, history, saves, themes, extensions, chat_rooms, chat_messages, sources, quarantine, trust_scores.

### Config Resolution (`src/config/load-private-config.js`)

`${ENV_VAR}` placeholders in `public/assets/games.json` and `surfaces.json` are resolved at runtime. Priority: `process.env` → `games-private.json` mirrors → keep placeholder. Unresolved URLs show "Configure" CTAs in the frontend. Config is cached for 5 minutes.

### Frontend SPA

- **Entry**: `public/js/app.js` (133K, legacy SPA with views for Home, Arcade, Browse, Hub, Chat, AI)
- **v5 modules** (`public/js/v5/`): New home/search experience
  - `main.js` — entry point, binds navigation, search, launch bay
  - `core/state.js` — global mutable state
  - `core/catalog.js` — game catalog normalization and filtering
  - `core/search.js` — Levenshtein distance + abbreviation matching
  - `core/health.js` — Signal Health checks that keep broken/missing entries out of Home
  - `core/launch.js` — launch flow with failure recovery
  - `core/picks.js` — Daily Picks selection
  - `ui/home.js` — Home controller: search results, sections, mood filters, Catalog Pulse
  - `ui/sheet.js` — game detail sheet
  - `ui/cards.js` — card rendering with fallback thumbnails
  - `ui/settings.js` — Low Power mode, reduced-motion, preferences
  - `ui/recovery.js` — launch failure recovery modal
- **Admin UI**: `public/admin.html` and `public/js/admin.js` for secure Quarantine Bay Source Hydra operations.
- **Service worker** (`public/sw.js`): stale-while-revalidate for static, network-first for API, cache-first for thumbnails
- **Local storage keys**: `strato-favorites`, `strato-recent`, `strato-playCounts`, `strato-lastPlayed`, `strato-preferences`, `strato-recentFailures`
- **Session storage keys**: `admin_secret`

### Routes (`src/routes/`)

Each route file exports an Express router mounted at a prefix. Major ones:
- `proxy.js` — Ultraviolet/Scramjet proxy page serving and transport config
- `sources.js` — Source Hydra Admin API (Quarantine Bay, Trust Engine)
- `ai.js` — AI tutor endpoints (gracefully disabled without `.z-ai-config`)
- `stealth.js` — tab cloaking presets
- `data.js` — import/export endpoints
- `extensions.js`, `themes.js` — user extension/theme gallery
- `profile.js`, `leaderboard.js`, `bookmarks.js`, `saves.js`, `chat.js` — standard CRUD

### WebSocket Chat (`src/websocket.js`)

ws-based WebSocketServer on `/ws/chat`. Auth via cookie validation on upgrade. Rate limited 5 messages per 5 seconds per user. 30s heartbeat keepalive.

### Catalog & Source Hydra System

- `public/assets/games.json` — playable game catalog entries
- `public/assets/surfaces.json` — non-playable surface entries (excluded from Home/Search/Picks)
- `public/games/` — 17 local standalone games (tetris, snake, pacman, etc.)
- `scripts/validate-games.mjs` — enforces catalog integrity rules
- `scripts/import-catalog.mjs` — review-first import pipeline (--dry-run, --review, --quarantine, --merge-approved)
- `scripts/source-radar-lib.mjs` — Source Radar health checks and candidate discovery
- `scripts/validate-sources.mjs` — enforces raw source integrity rules
- `scripts/import-raw-sources.mjs` — parses and deduplicates URLs via hashing

### Testing

Vitest with global test functions. All DB calls mocked in `tests/setup.js` via `vi.mock`. Helper factories: `createMockStore()`, `buildApp()`, `createMockRequest/Response/Next()`. Tests organized as `tests/routes/*.test.js`, `tests/websocket/*.test.js`, `tests/v5/*.test.js`, `tests/source-hydra.test.js`.

Before claiming done, run the relevant verification:

```bash
pnpm format:check && pnpm lint && pnpm test && node scripts/validate-games.mjs && pnpm source:validate
```

## Important Patterns

- **No build step**: Frontend JS files use ES modules directly in the browser. No imports from `node_modules` on the client side — only relative imports between `/public/js/` files.
- **Cookie security**: `secure: true` only set when actually behind HTTPS (`process.env.HTTPS === "true"` or `PORT === "443"`) — prevents dropped cookies on HTTP-only deployments.
- **Config-driven catalog**: URLs with `${VAR}` placeholders stay unresolved when env vars are empty, and the frontend shows "Configure" UI instead of broken links.
- **Catalog split**: Games vs Surfaces — `games.json` entries appear in Home/Search/Picks; `surfaces.json` entries are separate non-playable surfaces.
- **In-memory rate limiting**: Login attempts, CSRF tokens, and WebSocket rate limits use `Map` with `setInterval` cleanup (all timers `.unref()` so they don't block shutdown).
- **Graceful degradation**: AI features disable without `.z-ai-config`. Proxy engines log warnings if packages are missing but don't crash. Private config is optional.
- **Admin Security**: `ADMIN_SECRET` is strictly passed via `x-admin-secret` headers. The Admin secret may be kept only in `sessionStorage` for the active admin session, never `localStorage`, never URL query params, never committed, and never embedded in HTML.
