# Changelog

All notable changes to STRATO are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [21.0.0] — 2025-03-04

### The Definitive Edition

STRATO v21 is the culmination of every feature, fix, and improvement built across 21 versions. This release consolidates the proxy engine, arcade, AI tutor, chat, stealth, themes, extensions, and progression systems into a single polished experience with comprehensive documentation, hardened security, and production-ready stability.

### Added

#### Documentation
- **README.md** — Complete rewrite with badges, hero section, all v21 features, quick start, configuration guide, deployment guide (Railway, Render, Fly.io, Docker), architecture overview, API quick reference, project structure, contributing link, license, and credits
- **CONTRIBUTING.md** — Full contribution guide with Code of Conduct, fork-branch-commit-PR workflow, development setup, code style guide (ESLint, Prettier), testing requirements, PR template, issue template, and release process
- **CHANGELOG.md** — Complete version history from v13 NEXUS through v21
- **docs/API.md** — Full API reference with authentication details, all endpoints with request/response examples, WebSocket protocol documentation, error codes, and rate limiting details
- **docs/ARCHITECTURE.md** — System architecture document with text-based diagrams, request flow, proxy engine flow, database design, WebSocket architecture, frontend architecture, and security model

#### Proxy
- Dual proxy engine support with Ultraviolet (UV) and Scramjet (SJ)
- Auto-fallback between engines with 15-second timeout
- XOR URL encoding for UV (`Ultraviolet.codec.xor.encode`) and SJ (`Scramjet.codec.xor.encode`)
- Proxy error pages with engine-switch buttons for ECONNREFUSED, ETIMEDOUT, ENOTFOUND, ERR_SSL_PROTOCOL, and 502 errors
- Smuggle endpoint (`/api/smuggle`) with SSRF prevention, streaming responses, and manual redirect handling
- Frame header stripping middleware for proxy iframe support (strips X-Frame-Options, modifies CSP frame-ancestors)
- Wisp server integration at `/wisp/`
- Bare server at `/bare/`

#### Arcade
- 60+ games in the catalog with 16 standalone HTML5 games (no proxy required)
- Standalone games: 2048, Tetris, Snake, Flappy Bird, Pong, Breakout, Dino Runner, Space Invaders, Sudoku, Minesweeper, Connect Four, Memory Match, Simon Says, Typing Game, Pacman, Asteroids, Tower of Hanoi
- Category-based filtering with pill navigation
- Debounced search across name, description, tags, and category
- Sorting: Popular, A-Z, Recent, Random, Tier
- Favorites system with localStorage persistence
- Recently played tracking (last 20 games)
- Featured carousel of top-tier games
- Reliability badges (Green/Yellow/Red)
- Tier badges: Gold star (good), Purple star (recommended), LOCAL (standalone)
- Password hint badges for protected sites
- Config overlay for unresolved `${ENV_VAR}` game URLs
- Favicon fallbacks for broken thumbnails
- Hover prefetch for faster game loading
- StratoVault IndexedDB game cache with clear button and size display

#### AI
- AI chat assistant powered by Z AI SDK with system prompt
- AI tutor with subject-specific prompts: Math, Science, History, English, General
- Socratic mode toggle for guided questioning
- Snap & Solve vision AI — screenshot homework questions and get step-by-step solutions
- Quick prompt buttons for common queries
- AI mode tabs: Chat, Tutor, Snap & Solve
- Online/offline status indicator across all views
- 15-second timeout for chat, 25-second timeout for vision and tutor
- Base64 image validation with 10MB size limit
- CSRF token in all AI request headers

#### Chat
- WebSocket chat server at `/ws/chat`
- Chat room CRUD: create, list, join, leave
- Message history: last 50 messages per room with before-cursor pagination
- Real-time message broadcasting to room members
- Online user tracking with join/leave notifications
- Auto-reconnect with exponential backoff (up to 10 attempts)
- Heartbeat: 30s ping/pong, 60s idle disconnect
- Rate limiting: 5 messages per 5 seconds per user
- Auth-protected WebSocket connections (cookie validation on upgrade)
- System messages for join/leave events

#### Profiles & Progression
- User profiles with username, avatar (emoji), bio, theme
- XP and leveling system: 100 XP per level with 1.5x scaling
- XP rewards: game (5), browse (2), AI (3), chat (1), snap (10)
- Coins: 1 coin per 10 XP, earned alongside XP
- Level-up celebration with animated overlay and 50 XP bonus
- 8 achievements: first-proxy, first-game, ten-games, first-ai, tab-cloak, and more
- Daily challenges: browse, play, chat, AI
- Stats dashboard: games played, pages loaded, AI messages, chat messages, uptime
- Activity log: last 15 actions with timestamps
- Notification center: up to 20 notifications with badge count
- Auto-create user profile on first authenticated request

#### Leaderboards
- Per-game leaderboards: top 10 scores with daily, weekly, all-time periods
- Global leaderboard: top 25 players by total XP
- Score submission with automatic user stat updates
- Score clamping: 0 to 10,000,000
- Period-filtered queries with time-based filtering

#### Bookmarks & History
- Bookmarks CRUD: add, list, delete with duplicate detection
- URL validation with `new URL()` constructor
- Browsing history: auto-tracked, paginated (50/page, max 100)
- Clear all history endpoint
- Stats integration: bookmark and history counts in user profile

#### Cloud Saves
- Per-game save data: get, save, delete
- 50KB size limit per save
- Auto-update existing saves (no duplicates)
- Cross-device access via server-side storage
- Stats integration: save count in user profile

#### Themes
- 7 accent colors: Cyan, Purple, Pink, Green, Orange, Red, Gold
- 8 theme presets: Default, Midnight, Ember, Matrix, Sakura, Solar, Crimson, Void
- Theme Studio: glass opacity, blur amount, background animation
- CSS custom properties for all theme variables
- Theme gallery API: browse, install, share community themes
- Import/Export: base64-encoded theme codes for clipboard sharing
- Live preview: all changes apply instantly via CSS variables
- Persistence: theme config saved to localStorage
- Download tracking: install count on each theme install
- Creator controls: only creator can delete their theme

#### Extensions
- Extension gallery: browse, install community extensions
- Script validation: blocks eval, Function, import, require, Worker, SharedArrayBuffer, Atomics, and non-relative fetch URLs
- 100KB script size limit
- Fetch restrictions: only relative URLs and `/api/` paths allowed
- Creator controls: only creator can delete their extension
- Download tracking: install count on each extension install

#### Stealth
- 14 tab cloak presets: Google Classroom, Quizlet, Canvas, Clever, IXL, and 9 community presets
- Configurable panic key (default: backtick)
- Fake page generator: Google Classroom, Drive, Docs, Slides, Sheets
- Customizable fake Classroom with configurable class names and teachers
- Auto-stealth configuration: hide on blur, change title, change favicon
- Panic key behavior: activate cloak + navigate iframe to safe page

#### PWA
- Full Progressive Web App with manifest.json
- Service worker with three caching strategies: stale-while-revalidate (static), network-first (API), cache-first (thumbnails)
- Offline fallback page with retry button
- Cache-busting on version updates
- App shortcuts: Arcade, Browse, AI Tutor, Chat
- PWA icons: 48, 64, 192, 512px

#### Security
- TOS gate (Terms of Service acknowledgment wall)
- CSRF double-submit pattern with server-side token store (10-minute TTL, one-time use)
- Cookie signing with `cookie-signature`
- Helmet.js: CSP, HSTS (1 year, includeSubDomains), X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- Tiered rate limiting: 60/min (general API), 30/min (chat), 10/min (saves)
- Login rate limiting: 8 attempts per minute per IP
- Smuggle SSRF prevention: blocks private IP ranges (10.x, 127.x, 172.16-31.x, 192.168.x, etc.) and localhost
- XSS prevention: all user input escaped with `escapeHtml()` before rendering
- Input validation: strict type, length, and format checks on all API inputs
- Cookie security: httpOnly, sameSite=lax, secure in production, 7-day expiry
- Same-origin postMessage validation

#### Frontend
- Single-page application with view switching (Home, Arcade, Browser, Hub, Chat, AI, Settings)
- Keyboard shortcuts: 1-7 for views, `/` for URL bar, `?` for shortcuts, panic key, Ctrl+K for command palette, Ctrl+Shift+S for Snap & Solve
- Live clock with seconds precision
- Uptime counter
- Toast notifications with auto-dismiss
- Glassmorphic UI with backdrop blur
- Animated particle background with mouse repulsion
- URL bar with smart detection (search vs. URL)
- Browser navigation: refresh, fullscreen
- Quick link buttons for popular sites
- Game card rendering with thumbnails, badges, and favorites
- AI message bubbles with user/assistant/error styling
- Chat room list with join/leave UI
- Online user count display
- Status bar: clock, uptime, engine, XP, username
- Command palette (Ctrl+K)
- Shortcuts overlay (?)

#### Configuration
- Private config system: `.env` → `games-private.json` → template defaults
- `${ENV_VAR}` placeholder resolution in JSON config files at runtime
- Config status endpoint: `/api/config/status`
- Resolved games.json served at `/assets/games.json` (unresolved placeholders never reach client)
- Proxy mirror health status: `/api/mirrors/status`
- Cloak preset API: `/api/cloak/presets`
- Proxy engine health check: `/api/proxy/health`

### Changed
- Upgraded from Express 4 to Express 5
- Server startup message updated to v21
- Service worker cache name updated to `strato-v21`
- Service worker cache version updated to 21

### Fixed
- Proxy engine XOR encoding now uses proper UV/SJ codecs instead of `encodeURIComponent`
- Auto-fallback timer properly clears on successful iframe load
- WebSocket upgrade routing correctly handles `/ws/chat` separately from Bare/Wisp
- Auth middleware correctly validates signed cookies for WebSocket connections
- CSRF tokens are one-time use and expire after 10 minutes
- Cookie validation for WebSocket uses the same `cookie-signature.unsign` logic as Express middleware

---

## [20.0.0] — 2024-12-15

### APEX — Ultimate Command Center

STRATO v20 APEX introduced the complete progression system, community features, and expanded the arcade and stealth capabilities.

### Added

#### Profiles & Progression
- User profiles with username, avatar, bio, coins, XP, level, theme
- XP and leveling system with 100 XP per level and 1.5x scaling
- Coins virtual currency earned alongside XP
- Achievement system with 8 unlockable achievements
- Daily challenges for browse, play, chat, and AI actions
- Stats dashboard tracking all user activities
- Activity log with timestamped entries
- Notification center with badge counts
- Level-up celebration with animated overlay

#### Leaderboards
- Per-game leaderboards with daily, weekly, all-time periods
- Global leaderboard ranked by total XP
- Score submission with automatic stat updates

#### Bookmarks & History
- Bookmarks CRUD with duplicate detection
- Browsing history with pagination
- Clear all history functionality
- Stats integration for counts

#### Cloud Saves
- Per-game save data storage
- 50KB size limit per save
- Auto-update existing saves
- Cross-device access

#### Themes
- Theme Studio with glass opacity, blur, and background animation controls
- 8 theme presets: Default, Midnight, Ember, Matrix, Sakura, Solar, Crimson, Void
- 7 accent colors: Cyan, Purple, Pink, Green, Orange, Red, Gold
- Theme gallery API for community themes
- Import/export with base64-encoded theme codes
- Live preview via CSS custom properties
- Download tracking for theme installs

#### Extensions
- Extension gallery with browse and install
- Script validation blocking dangerous patterns
- 100KB script size limit
- Fetch URL restrictions for security
- Creator-only deletion

#### Stealth
- Expanded tab cloak presets (14 total including community presets)
- Fake page generator for Google Classroom, Drive, Docs, Slides, Sheets
- Customizable fake Classroom with configurable classes
- Auto-stealth configuration endpoint
- Panic key with iframe navigation

#### Chat
- WebSocket chat server at `/ws/chat`
- Chat room CRUD and message history
- Real-time broadcasting with join/leave notifications
- Heartbeat with 30s ping/pong
- Rate limiting per user
- Auto-reconnect with exponential backoff

#### Security
- CSRF double-submit pattern with server-side token store
- Login rate limiting (8 attempts per minute per IP)
- Smuggle endpoint SSRF prevention
- Cookie signing with `cookie-signature`

#### Frontend
- Modular JavaScript architecture (chat.js, themes.js, profile.js, bookmarks.js, extensions.js, media-player.js, pwa.js)
- Command palette (Ctrl+K)
- Keyboard shortcuts overlay (?)
- Status bar with clock, uptime, engine, XP, username
- Glassmorphic UI with backdrop blur
- Animated particle background with mouse repulsion

#### PWA
- Service worker with three caching strategies
- Offline fallback page
- App shortcuts for quick access
- PWA icons at multiple sizes

---

## [13.0.0] — 2024-08-01

### NEXUS — The Foundation

STRATO v13 NEXUS was the foundational release that established the core proxy engine, arcade, AI assistant, and stealth features that all subsequent versions built upon.

### Added

#### Proxy
- Ultraviolet proxy engine integration
- Scramjet proxy engine integration
- Bare server for proxy transport
- Wisp protocol support
- Epoxy TLS for secure connections
- Smart URL bar with search detection
- Quick links for popular sites
- Proxy error pages with engine-switch buttons
- Auto-fallback between engines

#### Arcade
- 40+ games in the catalog with tier system
- 12 standalone HTML5 games (no proxy needed): 2048, Tetris, Snake, Flappy Bird, Pong, Breakout, Dino Runner, Space Invaders, Sudoku, Minesweeper, Doom, Quake
- Game search with debounced input
- Category filtering
- Favorites system
- Recently played tracking
- Reliability and tier badges
- Featured game carousel

#### AI
- AI chat assistant powered by Z AI SDK
- System prompt for STRATO AI persona
- Online/offline status indicator
- Quick prompt buttons

#### Stealth
- Tab cloak with 5 core presets: Google Classroom, Quizlet, Canvas, Clever, IXL
- Panic key (default: backtick)
- TOS gate (Terms of Service acknowledgment)

#### Security
- Helmet.js for HTTP security headers
- Cookie-based authentication
- Rate limiting on API routes
- XSS prevention with `escapeHtml()`

#### Frontend
- Single-page application with view switching
- Animated particle background
- Glassmorphic dark theme
- Keyboard shortcuts for navigation
- Toast notifications

#### Configuration
- `.env` based configuration
- Private config system with `${ENV_VAR}` placeholder resolution
- `games-private.json` alternative configuration
- Config status endpoint

---

## [12.0.0] — 2024-06-15

### Chromatic Storm — Ultra-Maximalist

STRATO v12 introduced the Chromatic Storm UI with animated particle backgrounds, neon gradient borders, and rainbow accent colors for maximum visual impact.

### Added
- Chromatic Storm UI theme with animated particle background
- Rainbow gradient borders and neon glow effects
- Category circle navigation
- 40+ game catalog with 12 standalone games
- AI chat assistant
- Snap & Solve feature using vision AI for homework help
- Tab cloak with 5 educational site presets
- Panic key for instant safe page
- TOS gate authentication wall
- Rate limiting on API routes

---

## [11.0.0] — 2024-05-01

### Initial Public Release

The first public release of STRATO with basic proxy and game functionality.

### Added
- Ultraviolet proxy integration
- Basic game arcade with search
- Simple dark theme UI
- Cookie-based authentication
- Express server with static file serving
- Bare server for proxy transport

---

[21.0.0]: https://github.com/OpenClawdd/STRATO/compare/v20.0.0...v21.0.0
[20.0.0]: https://github.com/OpenClawdd/STRATO/compare/v13.0.0...v20.0.0
[13.0.0]: https://github.com/OpenClawdd/STRATO/compare/v12.0.0...v13.0.0
[12.0.0]: https://github.com/OpenClawdd/STRATO/compare/v11.0.0...v12.0.0
[11.0.0]: https://github.com/OpenClawdd/STRATO/releases/tag/v11.0.0
