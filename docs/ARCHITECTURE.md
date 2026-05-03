# STRATO Architecture

Complete technical architecture documentation for STRATO v21. This document describes the system design, request flows, data models, and security architecture of the application.

---

## Table of Contents

- [System Overview](#system-overview)
- [Request Flow](#request-flow)
- [Proxy Engine Flow](#proxy-engine-flow)
- [Database Design](#database-design)
- [WebSocket Architecture](#websocket-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Security Model](#security-model)
- [Caching Architecture](#caching-architecture)
- [Configuration System](#configuration-system)
- [Service Worker Architecture](#service-worker-architecture)

---

## System Overview

STRATO is a single-process Node.js application that serves as both a web proxy and an entertainment hub. It runs on Express 5 with integrated WebSocket support, proxy transport layers, and a custom JSON database. The frontend is a single-page application (SPA) served as static files.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Client Browser                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Single-Page Application                      │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │  │
│  │  │ Home │ │Arcade│ │Browse│ │ Hub  │ │ Chat │ │  AI  │      │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │  │
│  │                                                                │  │
│  │  JavaScript Modules: app.js, chat.js, themes.js, profile.js, │  │
│  │  bookmarks.js, extensions.js, media-player.js, pwa.js,       │  │
│  │  particles.js, transport-init.js, favicon-fetcher.js          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Service Worker (sw.js)                       │  │
│  │  Stale-While-Revalidate (static) · Network-First (API)        │  │
│  │  Cache-First (thumbnails) · Offline Fallback Page             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │
│  │  UV Service Worker   │  │  SJ Service Worker                   │ │
│  │  /frog/sw.js         │  │  /scramjet/sw.js                     │ │
│  │  XOR encode/decode   │  │  XOR encode/decode                   │ │
│  │  Prefix: /frog/      │  │  Prefix: /scramjet/                  │ │
│  └──────────────────────┘  └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                    │                            │
                    │ HTTP/HTTPS                 │ WebSocket
                    ▼                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     STRATO Server (Node.js)                          │
│                     Single Process, Port 8080                        │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    HTTP Server (createServer)                   │  │
│  │  Routes requests to Bare, Wisp, or Express based on path      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────┐  ┌────────────────────────────────────┐  │
│  │   Bare Server         │  │   Express 5 Application            │  │
│  │   /bare/*             │  │                                    │  │
│  │   Proxy transport     │  │   Middleware Stack:                 │  │
│  │   for UV/SJ           │  │   1. Trust Proxy                   │  │
│  └───────────────────────┘  │   2. Helmet (CSP, HSTS)           │  │
│                              │   3. Compression                   │  │
│  ┌───────────────────────┐  │   4. Cookie Parser (signed)       │  │
│  │   Wisp Server         │  │   5. JSON/URL-encoded Body        │  │
│  │   /wisp/*             │  │   6. Rate Limiting (tiered)       │  │
│  │   WebSocket transport │  │   7. Auth Middleware (TOS gate)    │  │
│  │   for proxy           │  │   8. Static Files (public/)       │  │
│  └───────────────────────┘  │   9. Frame Header Stripping       │  │
│                              │  10. Route Handlers                │  │
│  ┌───────────────────────┐  │  11. Error Handler                │  │
│  │   WebSocket Server    │  │                                    │  │
│  │   /ws/chat            │  │   Route Modules:                   │  │
│  │   Real-time chat      │  │   proxy, ai, smuggle, hub,       │  │
│  │   Heartbeat 30s       │  │   chat, profile, leaderboard,    │  │
│  │   Rate limit 5/5s     │  │   bookmarks, saves, themes,      │  │
│  └───────────────────────┘  │   extensions, stealth             │  │
│                              └────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     JSON Database Store                         │  │
│  │  Collections: users, scores, bookmarks, history, saves,       │  │
│  │  themes, extensions, chat_rooms, chat_messages                │  │
│  │  Storage: data/*.json · Atomic writes · In-memory cache       │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     Configuration System                        │  │
│  │  Priority: .env → games-private.json → template defaults      │  │
│  │  Resolves ${ENV_VAR} placeholders in JSON config files        │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Single Process** — STRATO runs as a single Node.js process. No clustering, no worker threads for request handling. The application is designed for moderate traffic (school-level usage) where a single process with async I/O is sufficient.

2. **JSON File Database** — Instead of SQLite, MongoDB, or PostgreSQL, STRATO uses a custom JSON file store. Each collection is a separate `.json` file. This keeps the dependency count low, makes backups trivial (copy the `data/` directory), and avoids database server configuration. The trade-off is that it doesn't scale to millions of records, but that's acceptable for the intended use case.

3. **SPA with No Build Step** — The frontend is vanilla JavaScript with no bundler, transpiler, or framework. This keeps the deployment simple (just static files) and eliminates build toolchain complexity. The trade-off is that there's no type checking or module bundling on the frontend.

4. **Dual Proxy Engines** — Both Ultraviolet and Scramjet are available simultaneously. The user can switch between them, and auto-fallback ensures resilience if one engine fails for a particular site.

5. **Cookie-Based Auth** — Authentication uses signed cookies rather than JWT tokens or session stores. This is simpler to implement and works well for a single-server deployment. The cookie contains just the username, and all session data is stored server-side in the JSON database.

---

## Request Flow

### Login Flow

```
Browser                     Server
  │                           │
  │  GET /                    │
  │  ──────────────────────►  │
  │                           │  Auth middleware checks
  │                           │  req.signedCookies.strato_auth
  │                           │  → No cookie found
  │                           │
  │  302 Redirect /login      │
  │  ◄──────────────────────  │
  │                           │
  │  GET /login               │
  │  ──────────────────────►  │
  │                           │  Generate CSRF token
  │                           │  Store in csrfTokens Map
  │                           │  Inject into HTML template
  │                           │
  │  200 HTML + CSRF token    │
  │  ◄──────────────────────  │
  │                           │
  │  POST /login              │
  │  { username, tos_accepted,│
  │    csrf_token }           │
  │  ──────────────────────►  │
  │                           │  Check login rate limit (8/min)
  │                           │  Verify CSRF token in server store
  │                           │  Consume token (one-time use)
  │                           │  Validate TOS accepted
  │                           │  Validate username (1-24, alphanumeric)
  │                           │  Set signed cookie strato_auth
  │                           │  Auto-create user profile
  │                           │
  │  302 Redirect /           │
  │  Set-Cookie: strato_auth  │
  │  ◄──────────────────────  │
  │                           │
  │  GET /                    │
  │  Cookie: strato_auth=s:xx │
  │  ──────────────────────►  │
  │                           │  Auth middleware verifies
  │                           │  signed cookie → username
  │                           │  Inject res.locals.username
  │                           │  Serve static files
  │                           │
  │  200 index.html           │
  │  ◄──────────────────────  │
```

### API Request Flow

```
Browser                     Server
  │                           │
  │  GET /api/bookmarks       │
  │  Cookie: strato_auth=s:xx │
  │  ──────────────────────►  │
  │                           │
  │                           │  1. Helmet (security headers)
  │                           │  2. Compression (gzip)
  │                           │  3. Cookie Parser (unsign cookie)
  │                           │  4. Rate Limit (60/min check)
  │                           │  5. Auth Middleware:
  │                           │     - Check /api/ path prefix
  │                           │     - Verify signed cookie
  │                           │     - Set res.locals.username
  │                           │     - Auto-create profile if needed
  │                           │  6. Route Handler:
  │                           │     - Read username from res.locals
  │                           │     - Query JSON store
  │                           │     - Return JSON response
  │                           │
  │  200 { total, bookmarks } │
  │  ◄──────────────────────  │
```

### Proxy Request Flow

```
Browser                     Server                     Target Site
  │                           │                           │
  │  User types URL           │                           │
  │  "youtube.com"            │                           │
  │                           │                           │
  │  JS: getProxyUrl()        │                           │
  │  → /frog/service/         │                           │
  │    {XOR-encoded URL}      │                           │
  │                           │                           │
  │  iframe.src = proxyUrl    │                           │
  │  ──────────────────────►  │                           │
  │                           │                           │
  │                           │  UV Service Worker        │
  │                           │  intercepts /frog/*       │
  │                           │  XOR-decodes URL          │
  │                           │  → youtube.com            │
  │                           │                           │
  │                           │  Bare Server request      │
  │                           │  ──────────────────────►  │
  │                           │                           │
  │                           │  Target site responds     │
  │                           │  ◄──────────────────────  │
  │                           │                           │
  │                           │  UV SW rewrites HTML:     │
  │                           │  - URLs → /frog/service/  │
  │                           │  - Scripts → proxied      │
  │                           │  - Styles → proxied       │
  │                           │                           │
  │  Proxied page in iframe   │                           │
  │  ◄──────────────────────  │                           │
  │                           │                           │
  │  If timeout (15s):        │                           │
  │  Auto-switch to SJ        │                           │
  │  → /scramjet/service/     │                           │
  │    {XOR-encoded URL}      │                           │
```

---

## Proxy Engine Flow

STRATO supports two proxy engines that operate independently but share the same Bare server transport.

### Ultraviolet (UV)

```
┌─────────────────────────────────────────────────────┐
│                  Ultraviolet Flow                    │
│                                                      │
│  1. Client calls getProxyUrl(url, 'uv')             │
│     → /frog/service/{XOR-encoded-URL}               │
│                                                      │
│  2. UV Service Worker intercepts /frog/* requests   │
│     Config: /frog/uv.config.js                      │
│     Prefix: /frog/service/                          │
│     Bare: /bare/                                    │
│                                                      │
│  3. UV SW decodes URL using xor.decode              │
│     Creates modified request to Bare server         │
│                                                      │
│  4. Bare Server (/bare/) forwards request           │
│     to target site via HTTP                         │
│                                                      │
│  5. Response flows back through:                    │
│     Bare → UV Service Worker → Browser              │
│                                                      │
│  6. UV SW rewrites response:                        │
│     - HTML: URLs → /frog/service/{encoded}          │
│     - JavaScript: URLs → proxied paths              │
│     - CSS: URLs → proxied paths                     │
│     - Headers: stripped/modified for iframe         │
└─────────────────────────────────────────────────────┘
```

### Scramjet (SJ)

```
┌─────────────────────────────────────────────────────┐
│                  Scramjet Flow                       │
│                                                      │
│  1. Client calls getProxyUrl(url, 'scramjet')       │
│     → /scramjet/service/{XOR-encoded-URL}           │
│                                                      │
│  2. SJ Service Worker intercepts /scramjet/*        │
│     Config: /scramjet/config.js                     │
│     Prefix: /scramjet/service/                      │
│     Bare: /bare/                                    │
│                                                      │
│  3. SJ SW decodes URL using xor.decode              │
│     Creates modified request to Bare server         │
│                                                      │
│  4. Bare Server (/bare/) forwards request           │
│     to target site via HTTP                         │
│                                                      │
│  5. Response flows back through:                    │
│     Bare → SJ Service Worker → Browser              │
│                                                      │
│  6. SJ SW rewrites response similarly to UV         │
└─────────────────────────────────────────────────────┘
```

### Auto-Fallback

When auto-fallback is enabled (default), the client sets a 15-second timer when loading a proxied page. If the iframe doesn't fire a `load` event within 15 seconds, the client automatically switches to the other engine and retries:

```
navigateProxy(url, 'uv')
  → Set 15s timeout
  → If load: clear timeout, success
  → If error: switch to 'scramjet', retry
  → If timeout: switch to 'scramjet', retry
```

The failure is logged to `localStorage` as `strato-failureLog` for debugging.

### Frame Header Stripping

STRATO includes middleware that strips `X-Frame-Options` headers and modifies `Content-Security-Policy` `frame-ancestors` directives on proxied responses. This is an intentional security trade-off — without it, proxied sites cannot be embedded in iframes, which is required for STRATO's browser view.

```javascript
// Applied to /frog/service/ and /scramjet/service/ paths
function stripFrameHeaders(req, res, next) {
  // Strip X-Frame-Options entirely
  // Modify CSP frame-ancestors to allow all origins
  next();
}
```

---

## Database Design

STRATO uses a custom JSON file store located in the `data/` directory. Each collection is stored as a separate JSON file containing an array of records.

### Architecture

```
data/
├── users.json           # User profiles and stats
├── scores.json          # Game leaderboard scores
├── bookmarks.json       # User bookmarks
├── history.json         # Browsing history entries
├── saves.json           # Cloud game saves
├── themes.json          # Custom themes (gallery)
├── extensions.json      # Community extensions (gallery)
├── chat_rooms.json      # Chat room definitions
└── chat_messages.json   # Chat message history
```

### Record Structure

Every record automatically gets these fields on creation:

```json
{
  "id": "a1b2c3d4e5f6g7h8i9j0k1l2",   // 24-char hex (crypto.randomBytes(12))
  "created_at": "2024-12-15T10:00:00.000Z",  // ISO 8601
  "updated_at": "2024-12-15T10:00:00.000Z"   // ISO 8601, updated on every write
}
```

### Collection Schemas

#### users

```json
{
  "id": "...",
  "username": "Alice",          // 1-24 chars, alphanumeric + underscore
  "avatar": null,                // Emoji or string, max 500 chars
  "bio": "",                     // Max 500 chars
  "coins": 0,                    // Virtual currency
  "xp": 0,                       // Experience points
  "level": 1,                    // Calculated: floor(xp / 100) + 1
  "theme": "default",            // Active theme code
  "stats": {
    "games_played": 0,
    "total_score": 0,
    "achievements": [],          // Array of achievement IDs
    "bookmarks_count": 0,
    "history_count": 0,
    "saves_count": 0,
    "chat_messages": 0
  },
  "created_at": "...",
  "updated_at": "..."
}
```

#### scores

```json
{
  "id": "...",
  "gameId": "tetris",           // Game identifier
  "username": "Alice",          // Player username
  "score": 50000,               // Clamped to 0 - 10,000,000
  "created_at": "...",
  "updated_at": "..."
}
```

#### bookmarks

```json
{
  "id": "...",
  "username": "Alice",
  "url": "https://example.com",  // Valid URL, validated with new URL()
  "title": "Example Site",       // Max 500 chars
  "favicon": null,               // Max 500 chars
  "created_at": "...",
  "updated_at": "..."
}
```

#### history

```json
{
  "id": "...",
  "username": "Alice",
  "url": "https://example.com",
  "title": "Example Site",
  "created_at": "...",
  "updated_at": "..."
}
```

#### saves

```json
{
  "id": "...",
  "username": "Alice",
  "gameId": "tetris",           // 1-100 chars
  "data": "{\"level\":15}",     // JSON string, max 50KB
  "created_at": "...",
  "updated_at": "..."
}
```

#### themes

```json
{
  "id": "...",
  "name": "Ocean Breeze",       // 1-50 chars
  "code": "ocean-breeze",       // Lowercase alphanumeric + dashes, 1-50 chars
  "config": {                   // Valid keys: accent, bg, glass, font, text, etc.
    "accent": "#00bcd4",
    "bg": "#0a1628"
  },
  "created_by": "Alice",        // Username of creator
  "downloads": 0,               // Incremented on install
  "created_at": "...",
  "updated_at": "..."
}
```

#### extensions

```json
{
  "id": "...",
  "name": "Dark Reader",        // 1-50 chars
  "code": "dark-reader",        // Lowercase alphanumeric + dashes, 1-50 chars
  "description": "...",         // Max 500 chars
  "script": "// JS code...",    // Max 100KB, validated for dangerous patterns
  "version": "1.0.0",          // Semver format
  "created_by": "Alice",
  "downloads": 0,
  "created_at": "...",
  "updated_at": "..."
}
```

#### chat_rooms

```json
{
  "id": "...",
  "name": "general",            // 1-50 chars
  "description": "",            // Max 200 chars
  "created_by": "Alice",
  "created_at": "...",
  "updated_at": "..."
}
```

#### chat_messages

```json
{
  "id": "...",
  "roomId": "a1b2c3d4...",     // References chat_rooms.id
  "username": "Alice",
  "message": "Hello!",          // 1-500 chars
  "created_at": "...",
  "updated_at": "..."
}
```

### Write Operations

All write operations use an atomic write pattern to prevent data corruption:

1. **Acquire lock** — Each collection has a write lock (promise-based queue) to prevent concurrent writes
2. **Read current data** — Read from cache (if valid) or disk
3. **Modify in memory** — Apply the create/update/delete operation
4. **Write to temp file** — `collection.json.tmp.{random-hex}`
5. **Rename temp to final** — `fs.renameSync()` is atomic on most filesystems
6. **Update cache** — Set the in-memory cache with the new data and current timestamp
7. **Release lock** — Allow the next queued write to proceed

```javascript
async function writeCollection(collection, data) {
  await acquireLock(collection);
  try {
    ensureCollectionFile(collection);
    atomicWrite(collectionPath(collection), data);
    cacheSet(collection, data);
  } finally {
    releaseLock(collection);
  }
}

function atomicWrite(filePath, data) {
  const tmpPath = filePath + '.tmp.' + crypto.randomBytes(6).toString('hex');
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);  // Atomic on most filesystems
}
```

### Read Operations

Read operations use a 30-second in-memory cache:

```javascript
function readCollection(collection) {
  const cached = cacheGet(collection);
  if (cached !== null) return cached;  // Cache hit

  ensureCollectionFile(collection);
  try {
    const raw = fs.readFileSync(collectionPath(collection), 'utf8');
    const data = JSON.parse(raw);
    cacheSet(collection, data);
    return data;
  } catch {
    // Corrupted file — reset to empty array
    const data = [];
    atomicWrite(collectionPath(collection), data);
    cacheSet(collection, data);
    return data;
  }
}
```

### CRUD Operations

| Operation | Method | Description |
|-----------|--------|-------------|
| `getAll(collection)` | Read all records | Returns full array |
| `getOne(collection, predicate)` | Find first match | Returns record or null |
| `create(collection, item)` | Add new record | Auto-generates `id`, `created_at`, `updated_at` |
| `update(collection, predicate, updates)` | Update first match | Merges updates, refreshes `updated_at` |
| `deleteOne(collection, predicate)` | Remove first match | Returns true/false |
| `deleteMany(collection, predicate)` | Remove all matches | Returns count of removed |
| `query(collection, predicate, options)` | Filter + sort + paginate | Returns `{ total, page, limit, data }` |
| `count(collection, predicate)` | Count matches | Returns number |

### Collection Validation

Only predefined collections are allowed. Attempts to access an invalid collection throw an error:

```javascript
const VALID_COLLECTIONS = new Set([
  'users', 'scores', 'bookmarks', 'history', 'saves',
  'themes', 'extensions', 'chat_rooms', 'chat_messages'
]);
```

---

## WebSocket Architecture

STRATO uses the `ws` library for real-time chat via WebSocket at `/ws/chat`.

### Connection Lifecycle

```
┌─────────────────────────────────────────────────────┐
│              WebSocket Connection Flow               │
│                                                      │
│  1. Client initiates upgrade:                       │
│     new WebSocket('ws://host/ws/chat')              │
│                                                      │
│  2. Server receives upgrade event on HTTP server    │
│     - Checks path === '/ws/chat'                    │
│     - Parses cookie header manually                 │
│     - Validates signed cookie using cookie-signature│
│     - If invalid: 401 + socket.destroy()            │
│     - If valid: WSS.handleUpgrade()                 │
│                                                      │
│  3. WSS emits 'connection' event                    │
│     - Store client in Map: ws → {username, rooms,   │
│       alive}                                        │
│     - Send { type: 'connected', username }          │
│                                                      │
│  4. Client sends messages:                          │
│     { type: 'join', roomId: 'general' }             │
│     { type: 'chat', roomId: 'general',              │
│       message: 'Hello!' }                           │
│     { type: 'leave', roomId: 'general' }            │
│                                                      │
│  5. Server processes:                               │
│     - Validate message format                       │
│     - Rate limit (5 msg / 5 sec)                    │
│     - Verify room membership                        │
│     - Store in chat_messages collection             │
│     - Broadcast to all clients in room              │
│                                                      │
│  6. Heartbeat:                                      │
│     - Server sends ping every 30s                   │
│     - Client responds with pong                     │
│     - If no pong after 60s: terminate connection   │
│                                                      │
│  7. Disconnect:                                     │
│     - Notify all rooms: user_left                   │
│     - Remove from clients Map                       │
│     - Clean up rate limit entries                   │
└─────────────────────────────────────────────────────┘
```

### WebSocket Upgrade Routing

The HTTP server's `upgrade` event routes WebSocket connections:

```javascript
server.on('upgrade', (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);      // Bare server (proxy)
  } else if (req.url.startsWith('/wisp/')) {
    wispRouteRequest(req, socket, head);       // Wisp (proxy transport)
  } else if (req.url === '/ws/chat') {
    // Handled by initWebSocket's own upgrade listener
    return;
  } else {
    socket.destroy();                          // Reject unknown upgrades
  }
});
```

### Room Broadcasting

Messages are broadcast to all clients in a room except the sender:

```javascript
function broadcastToRoom(roomId, message, excludeWs = null) {
  const msgStr = JSON.stringify(message);
  for (const [ws, client] of clients.entries()) {
    if (ws !== excludeWs && client.rooms.has(roomId) && ws.readyState === 1) {
      ws.send(msgStr);
    }
  }
}
```

### Rate Limiting

WebSocket messages are rate-limited in-memory:

```javascript
const RATE_LIMIT_WINDOW = 5000;  // 5 seconds
const RATE_LIMIT_MAX = 5;        // 5 messages

// Checked before processing any chat message
if (!checkRateLimit(client.username)) {
  ws.send(JSON.stringify({ type: 'error', error: 'Rate limited: slow down' }));
  return;
}
```

Rate limit entries are cleaned every 30 seconds to prevent memory leaks.

---

## Frontend Architecture

The frontend is a single-page application (SPA) built with vanilla JavaScript. There is no build step, no bundler, and no framework.

### Module Structure

```
┌─────────────────────────────────────────────────────┐
│                Frontend Module Map                   │
│                                                      │
│  app.js (Main Application)                          │
│  ├── State Management (global state object)         │
│  ├── View Switching (7 views)                       │
│  ├── Tab Cloaks (14 presets)                        │
│  ├── Panic Key (configurable)                       │
│  ├── Proxy Engine (UV/SJ switching)                 │
│  ├── Games (load, filter, render, launch)           │
│  ├── AI Chat (chat, tutor, snap & solve)            │
│  ├── Achievements (8 achievements)                  │
│  ├── Notifications (toast + center)                 │
│  ├── Activity Log (timestamped actions)             │
│  ├── Coins & Daily Challenges                       │
│  ├── StratoVault (IndexedDB game cache)             │
│  ├── Command Palette (Ctrl+K)                       │
│  └── Keyboard Shortcuts (1-7, /, ?, Escape)         │
│                                                      │
│  chat.js (WebSocket Chat)                           │
│  ├── WebSocket connection + auto-reconnect          │
│  ├── Room management (join, leave, create)          │
│  ├── Message rendering (user, system, own)          │
│  └── Online user tracking                           │
│                                                      │
│  themes.js (Theme Studio)                           │
│  ├── Accent colors (7) and presets (8)              │
│  ├── CSS custom property updates                    │
│  ├── Import/export (base64)                         │
│  ├── Gallery API integration                        │
│  └── Live preview                                   │
│                                                      │
│  profile.js (Profile & Leaderboard)                 │
│  ├── XP/leveling calculations                       │
│  ├── Profile CRUD via API                           │
│  ├── Score submission                               │
│  ├── Leaderboard rendering                          │
│  └── Level-up celebration                           │
│                                                      │
│  bookmarks.js (Bookmarks)                           │
│  ├── Bookmark CRUD via API                          │
│  └── Browsing history tracking                      │
│                                                      │
│  extensions.js (Extensions)                         │
│  ├── Extension gallery browsing                     │
│  └── Extension install/load                         │
│                                                      │
│  media-player.js (Media Player)                     │
│  └── Audio/video playback                           │
│                                                      │
│  pwa.js (PWA)                                       │
│  └── Install prompt handling                        │
│                                                      │
│  particles.js (Particle System)                     │
│  └── Animated background with mouse repulsion       │
│                                                      │
│  transport-init.js (Proxy Transport)                │
│  └── UV/SJ service worker registration              │
│                                                      │
│  favicon-fetcher.js (Thumbnail Fallbacks)           │
│  └── Fetch favicons for broken game thumbnails      │
└─────────────────────────────────────────────────────┘
```

### State Management

The main `app.js` module maintains a global `state` object that holds all client-side state:

```javascript
const state = {
  currentView: 'home',           // Active view name
  currentEngine: 'uv',           // Active proxy engine
  autoFallback: true,            // Auto-switch engines on failure
  panicKey: '`',                 // Panic key binding
  activeCloak: 'none',           // Active tab cloak preset
  accentColor: 'cyan',           // Active accent color
  particlesEnabled: true,        // Particle background on/off
  animationsEnabled: true,       // Animations on/off
  games: [],                     // Full game catalog
  filteredGames: [],             // Filtered/searched games
  aiMessages: [],                // AI chat history
  aiOnline: false,               // AI service status
  proxyReady: false,             // Proxy service worker status
  recentlyPlayed: [],            // Last 20 game IDs played
  gamesPlayed: 0,                // Total games played
  pagesLoaded: 0,                // Total pages loaded
  aiMessagesSent: 0,             // Total AI messages sent
  achievements: [],              // Unlocked achievement IDs
  notifications: [],             // Active notifications
  activityLog: [],               // Recent activity entries
  coins: 0,                      // Virtual currency
  hubSites: [],                  // Hub site directory
  filteredHubSites: [],          // Filtered hub sites
  dailyChallenges: {},           // Daily challenge progress
  favorites: [],                 // Favorite game IDs
};
```

All state is persisted to `localStorage` with the `strato-` prefix. On page load, state is restored from `localStorage`, and changes are written back immediately.

### View Switching

The SPA uses a CSS-based view switching system. All views exist in the DOM simultaneously, and the active view is toggled by adding/removing the `active` CSS class:

```javascript
const VIEWS = ['home', 'arcade', 'browser', 'hub', 'chat', 'ai', 'settings'];

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById(`view-${viewName}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  state.currentView = viewName;
}
```

### Cross-Module Communication

Modules communicate via:

1. **`window` globals** — Each module exposes an API on `window` (e.g., `window.StratoChat`, `window.StratoThemes`, `window.StratoProfile`)
2. **`localStorage`** — Shared state with `strato-` prefixed keys
3. **Custom events** — `window.postMessage()` for same-origin proxy engine switching
4. **Global hooks** — `window.showToast()`, `window.STRATO_XP()`, `window.STRATO_NOTIFY()`

---

## Security Model

### Defense in Depth

STRATO uses a multi-layered security approach:

```
┌─────────────────────────────────────────────────┐
│  Layer 1: Network Security                      │
│  - HSTS (1 year, includeSubDomains)             │
│  - Trust proxy (1 hop)                          │
│  - Secure cookies in production                 │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Layer 2: HTTP Security (Helmet)                │
│  - Content-Security-Policy                      │
│  - X-Content-Type-Options: nosniff              │
│  - Referrer-Policy: strict-origin               │
│  - Cross-Origin policies                        │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Layer 3: Authentication                        │
│  - TOS gate (must accept before access)         │
│  - Signed cookies (cookie-signature)            │
│  - Cookie: httpOnly, sameSite=lax, 7-day max    │
│  - WebSocket auth on upgrade                    │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Layer 4: CSRF Protection                       │
│  - Double-submit cookie pattern                 │
│  - Server-side token store (10-min TTL)         │
│  - One-time use tokens                          │
│  - X-CSRF-Token header required                 │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Layer 5: Rate Limiting                         │
│  - General API: 60/min                          │
│  - Chat API: 30/min                             │
│  - Saves API: 10/min                            │
│  - Smuggle: 10/min per IP                       │
│  - Login: 8 attempts/min per IP                 │
│  - WebSocket: 5 messages/5 seconds              │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Layer 6: Input Validation                      │
│  - Type checking (typeof)                       │
│  - Length limits on all fields                   │
│  - Format validation (regex for usernames, etc.) │
│  - URL validation (new URL() constructor)       │
│  - Score clamping (0 - 10,000,000)              │
│  - Image size validation (10MB)                 │
│  - Script pattern validation (extensions)       │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Layer 7: Output Encoding                       │
│  - escapeHtml() on all rendered HTML            │
│  - JSON API responses (no HTML injection)       │
│  - Same-origin postMessage validation           │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Layer 8: SSRF Prevention (Smuggle)             │
│  - Private IP range blocking                    │
│  - Localhost blocking                           │
│  - Protocol restriction (HTTP/HTTPS only)       │
│  - Manual redirect validation                   │
│  - Streaming responses (no buffering)           │
└─────────────────────────────────────────────────┘
```

### Content Security Policy

The CSP is configured to allow the proxy engines to function while maintaining security:

```
default-src: 'self'
script-src: 'self' 'unsafe-inline' 'unsafe-eval' blob:
worker-src: 'self' blob:
frame-src: 'self' blob:
connect-src: 'self' ws: wss:
img-src: 'self' data: blob: https://www.google.com https://icon.horse
style-src: 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src: 'self' https://fonts.gstatic.com
media-src: 'self' blob:
```

The `'unsafe-inline'` and `'unsafe-eval'` directives are required for the proxy service workers to function. The `blob:` scheme is needed for dynamically created scripts and workers.

### Cookie Security

| Property | Value | Purpose |
|----------|-------|---------|
| `httpOnly` | `true` | Prevents JavaScript access (XSS can't steal cookies) |
| `sameSite` | `lax` | Prevents CSRF via cross-site requests |
| `secure` | `true` (production) | Only sent over HTTPS |
| `signed` | `true` | Tamper detection via `cookie-signature` |
| `maxAge` | 7 days | Session expiry |
| `path` | `/` | Available on all paths |

---

## Caching Architecture

### Server-Side Caching

The JSON database store uses a 30-second in-memory cache for reads:

```javascript
const CACHE_TTL = 30_000;  // 30 seconds

function cacheGet(collection) {
  const entry = cache.get(collection);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(collection);  // Expired
    return null;
  }
  return entry.data;
}
```

Cache is invalidated on every write operation. This ensures reads are fast while writes always reflect the latest state.

### Hub Sites Caching

The hub sites list is cached with a 5-minute TTL:

```javascript
const SITES_CACHE_TTL = 5 * 60 * 1000;  // 5 minutes
```

### Mirror/Cloak Config Caching

Proxy mirrors and cloak presets are cached with longer TTLs since they change infrequently:

```javascript
const MIRRORS_CACHE_TTL = 10 * 60 * 1000;  // 10 minutes
const CLOAK_CACHE_TTL = 30 * 60 * 1000;    // 30 minutes
```

### Private Config Caching

The `games-private.json` resolver caches its result for 5 minutes:

```javascript
const PRIVATE_CONFIG_TTL = 5 * 60 * 1000;  // 5 minutes
```

---

## Configuration System

STRATO uses a three-tier configuration system for private URLs (proxy mirrors, game hubs, cloak favicons).

### Resolution Flow

```
┌─────────────────────────────────────────────────────┐
│          Config Resolution Priority                  │
│                                                      │
│  JSON Config File (games.json, mirrors.json, etc.)   │
│  Contains: ${ENV_VAR} placeholders                  │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  resolveConfig('public/assets/games.json')  │    │
│  │                                              │    │
│  │  For each ${VAR} in the JSON:               │    │
│  │  1. Check process.env[VAR]                  │    │
│  │     → Found? Use it.                        │    │
│  │  2. Check games-private.json flat map       │    │
│  │     → Found? Use it.                        │    │
│  │  3. Keep ${VAR} as-is (unresolved)          │    │
│  │     → Frontend shows "Configure" overlay    │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  .env (highest priority)                             │
│  ├── PROXY_SPLASH=https://splash.best/              │
│  ├── PROXY_SELENITE=http://selenite.cc              │
│  └── HUB_EVEREST=https://everest.rip/               │
│                                                      │
│  games-private.json (medium priority)                │
│  {                                                   │
│    "mirrors": {                                      │
│      "splash": "https://splash.best/",               │
│      "selenite": ["http://selenite.cc", "alt-url"]   │
│    },                                                │
│    "HUB_EVEREST": "https://everest.rip/"             │
│  }                                                   │
│                                                      │
│  Unresolved (fallback)                               │
│  ${PROXY_SPLASH} remains as string literal           │
│  → Card shows lock overlay                          │
│  → Cannot be launched until configured               │
└─────────────────────────────────────────────────────┘
```

### Mirror Key Flattening

The `games-private.json` `mirrors` object is flattened into `PROXY_` prefixed environment variable names:

```javascript
// "splash" → "PROXY_SPLASH"
// "selenite" → "PROXY_SELENITE" (primary), "PROXY_SELENITE_ALT" (alternate)
const envKey = `PROXY_${key.toUpperCase().replace(/-/g, '_')}`;
```

---

## Service Worker Architecture

The service worker (`sw.js`) provides offline support and caching for the PWA.

### Caching Strategies

| Resource Type | Strategy | Rationale |
|---------------|----------|-----------|
| Static HTML/CSS/JS | Stale-While-Revalidate | Fast load from cache, update in background |
| API Responses (`/api/*`) | Network-First | Always get fresh data; fall back to cache if offline |
| Game Thumbnails | Cache-First | Large images benefit from caching; fetch only on miss |
| Proxy Routes (`/frog/*`, `/scramjet/*`) | No Cache | Dynamic proxied content must always be fresh |
| WebSocket (`ws://`, `wss://`) | Skip | WebSocket connections are not HTTP requests |

### Cache Lifecycle

```
Install → Cache STATIC_ASSETS list → skipWaiting()
Activate → Delete old caches (by name) → clients.claim()
Fetch → Route to appropriate strategy
```

### Cache-Busting

When a new version is deployed, the service worker cache name changes (`strato-v21`). On activation, all caches that don't match the current name are deleted:

```javascript
const CACHE_NAME = 'strato-v21';
const CACHE_VERSION = 21;

// Activate: delete old caches
caches.keys().then(names => {
  return Promise.all(
    names
      .filter(name => name !== CACHE_NAME && name !== THUMBNAIL_CACHE)
      .map(name => caches.delete(name))
  );
});
```

### Offline Fallback

When the network is unavailable and no cache exists for an HTML request, the service worker returns a styled offline page:

```html
<!-- Offline Page Features -->
- 🌐 Offline icon
- "You're Offline" title
- "STRATO can't connect to the internet right now" message
- "Try Again" button (reloads the page)
```

For API requests, the offline fallback returns a JSON error:

```json
{ "error": "Offline", "offline": true }
```
