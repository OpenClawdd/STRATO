<p align="center">
  <img src="public/favicon.png" alt="STRATO Logo" width="80" height="80" />
</p>

<h1 align="center">STRATO v21</h1>

<p align="center">
  <strong>The Ultimate Web Proxy & Game Hub</strong><br/>
  <em>Browse freely. Play endlessly. Learn effortlessly.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-21.0.0-00e5ff?style=for-the-badge&labelColor=0a0a12" alt="Version" />
  <img src="https://img.shields.io/badge/license-GPL--3.0-ff5252?style=for-the-badge&labelColor=0a0a12" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-69f0ae?style=for-the-badge&labelColor=0a0a12" alt="Node Version" />
  <img src="https://img.shields.io/badge/express-5-b388ff?style=for-the-badge&labelColor=0a0a12" alt="Express" />
</p>

---

## What is STRATO?

STRATO is a fully-featured web proxy and entertainment hub designed for school Chromebooks and restricted networks. It combines dual proxy engines (Ultraviolet and Scramjet), a curated arcade of 60+ games, an AI-powered tutor with Socratic mode, real-time community chat, a theme studio, cloud saves, leaderboards, stealth mode, and much more — all in a single self-hosted Node.js application with a stunning glassmorphic UI.

Built on Express 5 with WebSocket support, STRATO delivers a seamless experience that feels like a native application. The frontend is a single-page application with view switching, animated particle backgrounds, and comprehensive keyboard shortcuts. Whether you need to browse the web freely, play games during study hall, or get homework help from an AI tutor, STRATO has you covered.

---

## Features

### Web Proxy
- **Dual Engine Support** — Switch between Ultraviolet (UV) and Scramjet (SJ) proxy engines on the fly
- **Auto-Fallback** — Automatically switches to the other engine if one times out or fails (15s timeout)
- **Wisp Protocol** — Full Wisp WebSocket transport support for reliable proxying
- **Bare Server** — Integrated Bare Server Node for handling proxy requests
- **Epoxy TLS** — TLS termination via Epoxy for secure connections
- **Smart URL Bar** — Auto-detects search queries vs. URLs; searches Google for non-URL input
- **Quick Links** — One-click access to popular sites
- **Browser Navigation** — Refresh, fullscreen, and URL bar controls
- **Proxy Error Pages** — Beautiful glass-styled error pages with engine-switch buttons
- **Smuggle Endpoint** — Server-side streaming proxy with SSRF protection for direct resource fetching

### Arcade
- **60+ Games** — Curated game library with 16 standalone (no proxy needed!) and 40+ proxy-dependent titles
- **Standalone Games** — 2048, Tetris, Snake, Flappy Bird, Pong, Breakout, Dino Runner, Space Invaders, Sudoku, Minesweeper, Connect Four, Memory Match, Simon Says, Typing Game, Pacman, Asteroids, Tower of Hanoi — all run without proxy access
- **Game Search** — Debounced search across name, description, tags, and category
- **Category Filters** — Filter by All, Favorites, Recent, or any game category
- **Sorting** — Popular, A-Z, Recent, Random, and Tier sorting modes
- **Featured Carousel** — Horizontal scrollable showcase of top-tier games
- **Favorites** — Star games to add them to your favorites list
- **Recently Played** — Track your last 20 games played
- **Reliability Badges** — Green/Yellow/Red dots indicating game uptime reliability
- **Tier Badges** — Gold star (good proxy), Purple star (recommended), LOCAL (standalone)
- **Password Hints** — Auth hint badges for password-protected game sites
- **Config Overlay** — Lock overlay for games that require private URL configuration
- **Favicon Fallbacks** — Auto-fetches favicons for broken game thumbnails
- **Hover Prefetch** — Prefetch game data on hover for faster loads

### AI Tutor
- **AI Chat** — General-purpose AI assistant powered by Z AI SDK
- **AI Tutor** — Subject-specific tutoring for Math, Science, History, English, and General studies
- **Socratic Mode** — Toggle Socratic questioning to guide students to discover answers themselves
- **Snap & Solve** — Screenshot a homework question, paste it, and get step-by-step solutions using vision AI
- **Quick Prompts** — One-click prompt suggestions for common questions
- **Mode Tabs** — Switch between Chat, Tutor, and Snap & Solve modes
- **Subject Selection** — Choose your subject for tailored tutoring responses
- **Online/Offline Status** — Real-time AI service connectivity indicator
- **CSRF Protection** — All AI endpoints protected with CSRF token validation

### Real-Time Chat
- **WebSocket Chat** — Real-time messaging via `/ws/chat` WebSocket endpoint
- **Chat Rooms** — Create and join named chat rooms
- **Room History** — Load last 50 messages per room with pagination
- **Online Users** — See who's online in real-time
- **System Messages** — Join/leave notifications
- **Auto-Reconnect** — Exponential backoff reconnection (up to 10 attempts)
- **Rate Limiting** — 5 messages per 5 seconds per user, 30 API requests per minute
- **Heartbeat** — 30-second ping/pong with 60s idle disconnect

### Profiles & Progression
- **User Profiles** — Username, avatar (emoji), bio, theme preference
- **XP & Leveling** — Earn XP for every action (browse, play, chat, AI, snap); level up with bonus XP
- **Coins** — Virtual currency earned alongside XP (1 coin per 10 XP)
- **Achievements** — 8 unlockable achievements (first proxy, first game, ten games, first AI, tab cloak, etc.)
- **Daily Challenges** — Track progress on daily browse, play, chat, and AI challenges
- **Stats Dashboard** — Games played, pages loaded, AI messages, chat messages, uptime
- **Activity Log** — Timestamped log of recent actions
- **Notification Center** — Real-time toast notifications with badge count
- **Level-Up Celebration** — Animated overlay on level-up with bonus XP reward

### Leaderboards
- **Game Leaderboards** — Top 10 scores per game with daily, weekly, and all-time periods
- **Global Leaderboard** — Top 25 players ranked by total XP
- **Score Submission** — Submit game scores with automatic user stat updates
- **Score Clamping** — Scores clamped to 0–10,000,000 to prevent abuse

### Bookmarks & History
- **Bookmarks** — Save favorite URLs with title and favicon; duplicate detection
- **Browsing History** — Auto-tracked with pagination (50 per page, up to 100)
- **Clear History** — One-click clear all browsing history
- **Stats Integration** — Bookmark and history counts reflected in user stats

### Cloud Saves
- **Game Saves** — Save game progress server-side (up to 50KB per save)
- **Auto-Update** — Existing saves are updated in-place
- **Per-Game** — One save slot per game per user
- **Cross-Device** — Access saves from any device by logging in

### Themes & Customization
- **7 Accent Colors** — Cyan, Purple, Pink, Green, Orange, Red, Gold
- **8 Theme Presets** — Default, Midnight, Ember, Matrix, Sakura, Solar, Crimson, Void
- **Theme Studio** — Custom glass opacity, blur amount, background animation
- **CSS Custom Properties** — All colors/effects driven by CSS variables for instant updates
- **Theme Gallery** — Browse and install community-created themes from the API
- **Share Themes** — Upload your custom theme to the gallery for others
- **Import/Export** — Base64-encoded theme codes for sharing outside the gallery
- **Live Preview** — All changes apply instantly without page reload
- **Persistence** — Theme preferences saved to localStorage

### Stealth Mode
- **Tab Cloak** — Disguise browser tab as Google Classroom, Quizlet, Canvas, Clever, IXL, and 8+ community presets
- **Panic Key** — Configurable hotkey (default: backtick) that instantly activates cloak and navigates to a safe page
- **Fake Pages** — Server-generated fake Google Classroom, Drive, Docs, Slides, and Sheets pages
- **Customizable Fake Classroom** — POST endpoint to generate fake Classroom with custom class names and teachers
- **Auto-Stealth Config** — Configure auto-hide on window blur, title change, favicon change
- **Blur Detection** — Automatically switch to safe page when window loses focus

### Extensions System
- **Extension Gallery** — Browse and install community extensions
- **Script Validation** — Dangerous patterns (eval, Function, import, require, Worker, etc.) are blocked
- **Fetch Restrictions** — Only relative URLs and `/api/` paths allowed in extension fetch calls
- **100KB Limit** — Extension scripts capped at 100KB
- **Creator Controls** — Only the creator can delete their extension
- **Download Tracking** — Install count incremented on each install

### Media Player
- **Built-in Player** — Play audio/video content directly within STRATO
- **Supported Formats** — HTML5-compatible media formats

### Hub (Site Directory)
- **Curated Sites** — Browse community proxy mirrors and game hubs
- **Category Filtering** — Filter by category (Proxies, Game Hubs, Directories)
- **Search** — Full-text search across site names, descriptions, and categories
- **Proxy Mirrors** — Health status endpoint with resolved/unresolved mirror tracking
- **Cloak Presets** — API-driven tab cloak preset list with favicon resolution

### Progressive Web App
- **Installable** — Full PWA with manifest.json and service worker
- **Offline Support** — Static assets cached with stale-while-revalidate strategy
- **Cache-Busting** — Automatic old cache cleanup on version updates
- **Network-First API** — API calls use network-first strategy with offline fallback
- **Cache-First Thumbnails** — Game thumbnails cached in separate cache store
- **Offline Page** — Beautiful offline fallback page when no connection available
- **App Shortcuts** — Quick access to Arcade, Browse, AI Tutor, and Chat

### Security
- **TOS Gate** — Terms of Service acknowledgment wall before access
- **CSRF Protection** — Double-submit CSRF tokens on all state-changing requests
- **Cookie Signing** — Auth cookies signed with `cookie-signature` using secret key
- **Helmet.js** — Comprehensive HTTP security headers with CSP, HSTS, and more
- **Rate Limiting** — Tiered rate limits: 60/min for general API, 30/min for chat, 10/min for saves
- **Login Rate Limiting** — 8 attempts per minute per IP with CSRF-protected login form
- **SSRF Prevention** — Smuggle endpoint blocks private IP ranges and localhost
- **XSS Prevention** — All rendered content escaped with `escapeHtml()` utility
- **Input Validation** — Strict validation on all API inputs (length, format, type)
- **Cookie Security** — httpOnly, sameSite=lax, secure in production, 7-day expiry

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `1`–`7` | Switch views (Home, Arcade, Browser, Hub, Chat, AI, Settings) |
| `/` | Focus URL bar |
| `?` | Show shortcuts overlay |
| `` ` `` (backtick) | Panic key (customizable) |
| `Ctrl+K` / `Cmd+K` | Command palette |
| `Ctrl+Shift+S` | Snap & Solve |
| `Escape` | Close overlays |

---

## Screenshots

> **Note:** Screenshots are placeholders. Add your own by replacing the image paths below.

| Home | Arcade | Browser |
|------|--------|---------|
| ![Home](docs/screenshots/home.png) | ![Arcade](docs/screenshots/arcade.png) | ![Browser](docs/screenshots/browser.png) |

| AI Tutor | Chat | Themes |
|----------|------|--------|
| ![AI Tutor](docs/screenshots/ai.png) | ![Chat](docs/screenshots/chat.png) | ![Themes](docs/screenshots/themes.png) |

---

## Quick Start

### Prerequisites

- **Node.js** 18.0.0 or later
- **pnpm** 9.x (recommended) or npm
- A modern web browser (Chrome, Edge, Firefox, Safari)

### Installation

```bash
# Clone the repository
git clone https://github.com/OpenClawdd/STRATO.git
cd STRATO

# Install dependencies (also runs postinstall setup script)
pnpm install

# Copy the environment template
cp .env.example .env
```

### Configuration

Edit `.env` with your values:

```bash
# ── Required ──
COOKIE_SECRET=your-secure-random-string-here    # Generate with: openssl rand -hex 32

# ── Optional ──
PORT=8080                                         # Server port (default: 8080)
NODE_ENV=production                                # Enables secure cookies, HSTS
CDN_BASE_URL=                                      # CDN base URL for tier-2 game assets

# ── Proxy Mirrors (set these to enable external game/proxy sites) ──
PROXY_SPLASH=https://splash.best/
PROXY_STRAWBERRY=https://school.agreca.com.ar/
PROXY_SELENITE=http://selenite.cc
PROXY_SELENITE_ALT=https://g-65j.pages.dev/projects
PROXY_SME=https://startmyeducation.top/
PROXY_SME_ALT=http://startmyeducation.net/
PROXY_SME_PASSWORD=funni

# ── Game Hubs ──
HUB_DAYDREAM=https://daydreamx.global.ssl.fastly.net/
HUB_EVEREST=https://everest.rip/
```

Generate a secure cookie secret:

```bash
openssl rand -hex 32
```

**Alternative:** Instead of `.env`, create `src/config/games-private.json` for private URLs (see [Self-Hosting Guide](docs/SELF_HOSTING.md)).

### Running

```bash
# Production
pnpm start

# Development (auto-restart on file changes)
pnpm dev
```

The server starts at `http://localhost:8080` by default. On first visit, you'll see the TOS gate — accept the terms and choose a username to enter.

---

## Configuration Guide

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server listening port | No | `8080` |
| `COOKIE_SECRET` | Secret for signing auth cookies | **Yes** (production) | `dev-secret-change-me` |
| `NODE_ENV` | Environment mode (`production` enables secure cookies) | No | — |
| `CDN_BASE_URL` | CDN base URL for tier-2 game assets | No | — |
| `PROXY_*` | Proxy mirror URLs (resolved in games.json) | No | — |
| `HUB_*` | Game hub URLs (resolved in sites.json) | No | — |
| `CLOAK_*_FAVICON` | Favicon URLs for community cloak presets | No | — |

### Private Config

STRATO uses a two-tier configuration system to keep community URLs out of the public repository:

1. **`.env` file** (highest priority) — Set via `PROXY_*` and `HUB_*` environment variables
2. **`src/config/games-private.json`** (medium priority) — JSON file with mirror definitions
3. **Template defaults** (fallback) — `${ENV_VAR}` placeholders remain unresolved; cards show "Configure in .env" overlay

For detailed instructions, see [Self-Hosting Guide](docs/SELF_HOSTING.md).

### Verifying Config

```bash
curl http://localhost:8080/api/config/status
```

Returns the resolution status of all private config variables.

---

## Deployment

### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. Fork the repository
2. Create a new Railway project from your fork
3. Set `COOKIE_SECRET` in Railway environment variables
4. Railway auto-detects Node.js and runs `pnpm start`

### Render

1. Fork the repository
2. Create a new **Web Service** on Render
3. Connect your fork
4. Set **Build Command**: `pnpm install`
5. Set **Start Command**: `pnpm start`
6. Add `COOKIE_SECRET` to environment variables
7. Deploy

### Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Set secrets
fly secrets set COOKIE_SECRET=$(openssl rand -hex 32)

# Deploy
fly deploy
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "src/index.js"]
```

```bash
docker build -t strato .
docker run -p 8080:8080 -e COOKIE_SECRET=$(openssl rand -hex 32) strato
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / PWA                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  │ Home │ │Arcade│ │Browse│ │ Hub  │ │ Chat │ │  AI  ││
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘│
│     └────────┴────────┴────────┴────────┴────────┘    │
│              SPA (index.html + JS modules)              │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Service Worker (sw.js)                 │   │
│  │   Cache-first static, Network-first API         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP / WebSocket
┌─────────────────────┴───────────────────────────────────┐
│                   Express 5 Server                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Middleware Stack                                   │ │
│  │  Helmet → Compression → Cookie Parser → Rate Limit │ │
│  │  → Auth (TOS Gate) → Static Files → Routes         │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Proxy   │ │   AI     │ │  Chat    │ │ Stealth  │  │
│  │  Routes  │ │  Routes  │ │  Routes  │ │  Routes  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Profile  │ │ Leader-  │ │ Bookmarks│ │  Saves   │  │
│  │  Routes  │ │  board   │ │  & Hist  │ │  Routes  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ Themes   │ │Extension │ │  Hub     │               │
│  │  Routes  │ │  Routes  │ │  Routes  │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │            JSON Database Store (data/)              │ │
│  │  Atomic writes • In-memory cache • Write locks     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────┐  ┌────────────┐  ┌─────────────────┐  │
│  │ Bare Server  │  │ Wisp Server │  │ WebSocket Chat  │  │
│  │   /bare/     │  │   /wisp/    │  │   /ws/chat      │  │
│  └─────────────┘  └────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                │                │
    UV Service       SJ Service       Proxy Transport
    Worker /frog/    Worker /scramjet/  (Epoxy TLS)
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Server | Express 5 | HTTP routing, middleware, static serving |
| Proxy Engines | Ultraviolet, Scramjet | Web proxy with service workers |
| Transport | Bare Server Node, Wisp, Epoxy TLS | Proxy transport layer |
| AI | Z AI SDK (z-ai-web-dev-sdk) | Chat, vision, and tutor completions |
| Real-time | ws (WebSocket) | Chat messaging, heartbeat |
| Database | Custom JSON Store | User profiles, scores, saves, themes, etc. |
| Security | Helmet, cookie-signature, CSRF | HTTP security, cookie signing, CSRF protection |
| Rate Limiting | express-rate-limit | API abuse prevention |
| Frontend | Vanilla JS SPA | Single-page application with view switching |
| PWA | Service Worker, manifest.json | Offline support, installability |

---

## API Reference

See [**docs/API.md**](docs/API.md) for the complete API documentation with request/response examples for all endpoints.

### Quick Reference

| Category | Endpoints |
|----------|-----------|
| **Auth** | `POST /login`, `GET /logout`, `GET /api/csrf-token` |
| **AI** | `GET /api/ai/status`, `POST /api/ai/chat`, `POST /api/ai/vision`, `POST /api/ai/tutor` |
| **Chat** | `GET /api/chat/rooms`, `POST /api/chat/rooms`, `GET /api/chat/rooms/:roomId/messages`, `WS /ws/chat` |
| **Profile** | `GET /api/profile/:username`, `PATCH /api/profile/:username`, `GET /api/profile/:username/stats`, `POST /api/profile/:username/xp` |
| **Leaderboard** | `GET /api/leaderboard`, `GET /api/leaderboard/:gameId`, `POST /api/leaderboard/:gameId` |
| **Bookmarks** | `GET /api/bookmarks`, `POST /api/bookmarks`, `DELETE /api/bookmarks/:id` |
| **History** | `GET /api/history`, `POST /api/history`, `DELETE /api/history` |
| **Saves** | `GET /api/saves/:gameId`, `POST /api/saves/:gameId`, `DELETE /api/saves/:gameId` |
| **Themes** | `GET /api/themes`, `GET /api/themes/:code`, `POST /api/themes`, `POST /api/themes/:code/install`, `DELETE /api/themes/:code` |
| **Extensions** | `GET /api/extensions`, `GET /api/extensions/:code`, `POST /api/extensions`, `POST /api/extensions/:code/install`, `DELETE /api/extensions/:code` |
| **Stealth** | `POST /api/stealth/classroom`, `GET /api/stealth/fake/:type`, `POST /api/stealth/auto` |
| **Hub** | `GET /api/hub/sites`, `GET /api/hub/categories`, `GET /api/mirrors/status`, `GET /api/cloak/presets`, `GET /api/proxy/health` |
| **Proxy** | `GET /frog/uv.config.js`, `GET /scramjet/config.js`, `GET /proxy-error`, `GET /api/smuggle` |
| **System** | `GET /health`, `GET /api/config/status` |

---

## Project Structure

```
STRATO/
├── public/                        # Static frontend files
│   ├── index.html                 # Main SPA entry point
│   ├── login.html                 # TOS gate / login page
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker (caching, offline)
│   ├── css/
│   │   └── style.css              # Glassmorphic theme styles
│   ├── js/
│   │   ├── app.js                 # Main application logic
│   │   ├── app-v20-patch.js       # v20 compatibility patch
│   │   ├── particles.js           # Animated particle background
│   │   ├── transport-init.js      # UV/SJ transport initialization
│   │   ├── chat.js                # WebSocket chat module
│   │   ├── themes.js              # Theme studio module
│   │   ├── profile.js             # Profile & leaderboard module
│   │   ├── bookmarks.js           # Bookmarks module
│   │   ├── extensions.js          # Extensions module
│   │   ├── media-player.js        # Media player module
│   │   ├── favicon-fetcher.js     # Game thumbnail fallback
│   │   └── pwa.js                 # PWA install prompt
│   ├── assets/
│   │   ├── games.json             # Game catalog (with ${ENV} placeholders)
│   │   ├── sites.json             # Hub site directory
│   │   ├── thumbnails/            # Game thumbnail images (.webp)
│   │   └── icons/                 # PWA icons (48, 64, 192, 512)
│   └── games/                     # Standalone HTML5 games (tier 1)
│       ├── 2048/
│       ├── asteroids/
│       ├── breakout/
│       ├── connect-four/
│       ├── dino-runner/
│       ├── flappy-bird/
│       ├── memory-match/
│       ├── minesweeper/
│       ├── pacman/
│       ├── pong/
│       ├── simon-says/
│       ├── snake/
│       ├── space-invaders/
│       ├── sudoku/
│       ├── tetris/
│       ├── tower-of-hanoi/
│       └── typing-game/
├── src/                           # Backend source
│   ├── index.js                   # Server entry point (Express 5)
│   ├── websocket.js               # WebSocket chat server
│   ├── middleware/
│   │   └── auth.js                # TOS gate, login, CSRF, cookie auth
│   ├── routes/
│   │   ├── proxy.js               # UV/SJ config, proxy error pages
│   │   ├── ai.js                  # AI chat, vision, tutor endpoints
│   │   ├── smuggle.js             # Server-side streaming proxy
│   │   ├── hub.js                 # Hub sites, mirrors, cloak presets
│   │   ├── chat.js                # Chat rooms REST API
│   │   ├── profile.js             # User profiles, XP
│   │   ├── leaderboard.js         # Scores, global & per-game
│   │   ├── bookmarks.js           # Bookmarks & browsing history
│   │   ├── saves.js               # Cloud game saves
│   │   ├── themes.js              # Theme gallery CRUD
│   │   ├── extensions.js          # Extension gallery CRUD
│   │   └── stealth.js             # Fake pages, auto-stealth config
│   ├── db/
│   │   └── store.js               # JSON database (CRUD, atomic writes)
│   └── config/
│       ├── load-private-config.js # ${ENV_VAR} resolver
│       ├── cloak-presets.json     # Tab cloak preset definitions
│       └── proxy-mirrors.json     # Proxy mirror definitions
├── scripts/
│   └── setup-proxy.cjs            # Post-install UV/SJ asset setup
├── docs/                          # Documentation
│   ├── API.md                     # API reference
│   ├── ARCHITECTURE.md            # Architecture document
│   ├── SELF_HOSTING.md            # Self-hosting guide
│   └── COMMUNITY_PATTERNS.md      # Community proxy patterns
├── data/                          # JSON database files (gitignored)
├── .env.example                   # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## Contributing

We welcome contributions! Please see [**CONTRIBUTING.md**](CONTRIBUTING.md) for the full guide including:

- Code of Conduct
- Development setup
- Code style (ESLint + Prettier)
- PR and issue templates
- Release process

---

## License

STRATO is licensed under the **GNU General Public License v3.0**. See [LICENSE](LICENSE) for the full text.

```
STRATO — The Ultimate Web Proxy & Game Hub
Copyright (C) 2024 OpenClawdd

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
```

---

## Credits

- **Ultraviolet** — [TitaniumNetwork](https://github.com/titaniumnetwork-dev/ultraviolet)
- **Scramjet** — [Mercury Workshop](https://github.com/nicksyan0/scramjet)
- **Bare Server Node** — [TomPHTTP](https://github.com/nicksyan0/scramjet)
- **Wisp Protocol** — [Mercury Workshop](https://github.com/mercuryworkshop/wisp-js)
- **Epoxy TLS** — [Mercury Workshop](https://github.com/nicksyan0/scramjet)
- **Express** — [Express.js](https://expressjs.com/)
- **ws** — [websockets/ws](https://github.com/websockets/ws)
- **Helmet** — [helmetjs](https://helmetjs.github.io/)
- **Z AI SDK** — [z-ai-web-dev-sdk](https://www.npmjs.com/package/z-ai-web-dev-sdk)
- **Community Mirrors** — All the proxy operators and game hub maintainers who keep their services running

---

<p align="center">
  <strong>STRATO v21</strong> — Browse freely. Play endlessly. Learn effortlessly.
</p>
