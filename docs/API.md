# STRATO API Reference

Complete API documentation for STRATO v21. All endpoints require authentication (cookie-based) unless otherwise noted. API routes are rate-limited to 60 requests per minute by default, with stricter limits on specific endpoints.

---

## Table of Contents

- [Authentication](#authentication)
- [System Endpoints](#system-endpoints)
- [AI Endpoints](#ai-endpoints)
- [Chat Endpoints](#chat-endpoints)
- [Profile Endpoints](#profile-endpoints)
- [Leaderboard Endpoints](#leaderboard-endpoints)
- [Bookmark Endpoints](#bookmark-endpoints)
- [History Endpoints](#history-endpoints)
- [Saves Endpoints](#saves-endpoints)
- [Theme Endpoints](#theme-endpoints)
- [Extension Endpoints](#extension-endpoints)
- [Stealth Endpoints](#stealth-endpoints)
- [Hub Endpoints](#hub-endpoints)
- [Proxy Endpoints](#proxy-endpoints)
- [WebSocket Protocol](#websocket-protocol)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)

---

## Authentication

STRATO uses cookie-based authentication with CSRF protection for all state-changing requests.

### Login Flow

1. **GET `/login`** — Serves the login page with a server-generated CSRF token injected into the HTML
2. **POST `/login`** — Submits username, TOS acceptance, and CSRF token
3. On success, a signed cookie `strato_auth` is set and the user is redirected to `/`

### Auth Cookie

- **Name:** `strato_auth`
- **Properties:** `httpOnly`, `sameSite=lax`, `secure` (production only), `signed`, `maxAge=7 days`
- **Value:** The username string (alphanumeric + underscore, 1-24 chars)
- The cookie is signed using `cookie-signature` with the `COOKIE_SECRET` environment variable

### CSRF Protection

STRATO uses the double-submit cookie pattern:

1. **GET `/api/csrf-token`** — Returns a CSRF token and sets it as an `XSRF-TOKEN` cookie
2. The frontend reads the token from the cookie or a `<meta>` tag and includes it in the `X-CSRF-Token` header on all state-changing requests
3. The login form uses a server-side token store with 10-minute TTL and one-time use

```bash
# Get CSRF token
curl -b cookies.txt http://localhost:8080/api/csrf-token

# Use CSRF token in a request
curl -b cookies.txt \
  -H "X-CSRF-Token: your-token-here" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8080/api/bookmarks \
  -d '{"url":"https://example.com","title":"Example"}'
```

### Unauthenticated Access

The following routes are accessible without authentication:

- `GET /login` — Login page
- `POST /login` — Login submission
- `GET /health` — Health check
- `GET /bare/*` — Bare server (proxy transport)
- `GET /wisp/*` — Wisp server (proxy transport)
- `GET /frog/*` — Ultraviolet proxy assets
- `GET /scramjet/*` — Scramjet proxy assets

All other routes redirect to `/login` for HTML requests or return `401` for API requests.

---

## System Endpoints

### GET /health

Server health check. No authentication required.

**Response:**

```json
{
  "status": "ok",
  "uptime": 3600.5,
  "engines": { "uv": true, "scramjet": true },
  "wisp": true,
  "features": {
    "profiles": true,
    "leaderboards": true,
    "bookmarks": true,
    "saves": true,
    "chat": true,
    "themes": true,
    "extensions": true,
    "stealth": true,
    "aiTutor": true
  }
}
```

### GET /api/csrf-token

Get a CSRF token for state-changing requests. The token is also set as an `XSRF-TOKEN` cookie.

**Response:**

```json
{
  "token": "a1b2c3d4e5f6..."
}
```

### GET /api/config/status

Check the resolution status of private configuration variables.

**Response:**

```json
{
  "games": {
    "total": 70,
    "unresolved": ["PROXY_SPLASH"],
    "resolved": 5
  },
  "mirrors": {
    "total": 12,
    "unresolved": [],
    "resolved": 12
  },
  "privateConfigLoaded": true
}
```

### GET /assets/games.json

Returns the resolved game catalog. `${ENV_VAR}` placeholders are replaced with actual values from `.env` or `games-private.json`. Unresolved placeholders are kept as-is (the frontend shows a "Configure" overlay for these games).

**Response:** Array of game objects.

---

## AI Endpoints

### GET /api/ai/status

Check if the AI service is online.

**Response:**

```json
{
  "online": true
}
```

### POST /api/ai/chat

Send a message to the AI chat assistant. The AI uses a system prompt defining it as STRATO AI, limited to 500-word responses with a 15-second timeout.

**Request:**

```json
{
  "messages": [
    { "role": "user", "content": "What is the quadratic formula?" }
  ]
}
```

**Response (200):**

```json
{
  "message": {
    "role": "assistant",
    "content": "The quadratic formula is x = (-b ± √(b² - 4ac)) / 2a..."
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Missing or invalid `messages` array |
| 400 | Message missing `role` or `content` |
| 400 | Invalid `role` (must be `user`, `assistant`, or `system`) |
| 503 | AI service is offline |
| 500 | AI returned an empty response |
| 504 | AI request timed out (15s) |

**Example:**

```bash
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your-token" \
  -X POST http://localhost:8080/api/ai/chat \
  -d '{"messages":[{"role":"user","content":"What is 2+2?"}]}'
```

### POST /api/ai/vision

Snap & Solve — analyze an image and provide a step-by-step solution. Accepts base64 data URLs or raw base64 strings. 25-second timeout.

**Request:**

```json
{
  "image": "data:image/png;base64,iVBOR...",
  "prompt": "Solve this math problem step by step"
}
```

- `image` (required): Base64 data URL (`data:image/...`) or raw base64 string
- `prompt` (optional): Custom prompt (default: "Solve this question. Show your work step by step...")
- Max image size: 10MB decoded

**Response (200):**

```json
{
  "message": {
    "role": "assistant",
    "content": "Step 1: Identify the equation...\nStep 2: ...\nAnswer: x = 5"
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Missing `image` field |
| 400 | Invalid image format (not base64 or data URL) |
| 413 | Image exceeds 10MB |
| 503 | AI service is offline |
| 504 | AI vision timed out (25s) |

### POST /api/ai/tutor

AI tutor with subject-specific system prompts and optional Socratic mode.

**Request:**

```json
{
  "messages": [
    { "role": "user", "content": "How do I solve quadratic equations?" }
  ],
  "subject": "math",
  "socratic": true
}
```

- `messages` (required): Array of `{ role, content }` objects
- `subject` (optional): `math`, `science`, `history`, `english`, or `general` (default: `general`)
- `socratic` (optional): Boolean — when `true`, the tutor uses the Socratic method (asks probing questions instead of giving direct answers)

**Response (200):**

```json
{
  "message": {
    "role": "assistant",
    "content": "What do you already know about quadratic equations? Have you seen the formula before?"
  },
  "subject": "math",
  "socratic": true
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid `messages` array |
| 400 | Invalid `subject` |
| 503 | AI service is offline |
| 504 | AI tutor timed out (25s) |

**Subject System Prompts:**

| Subject | Focus |
|---------|-------|
| `math` | Step-by-step problem solving, mathematical notation, "why" behind each step |
| `science` | Biology, chemistry, physics, earth science, real-world examples |
| `history` | World history, US history, government, multiple perspectives, primary sources |
| `english` | Writing, grammar, literary analysis, vocabulary, reading comprehension |
| `general` | All academic subjects, study skills, adaptable approach |

---

## Chat Endpoints

Rate limit: **30 requests per minute** on `/api/chat/*`.

### GET /api/chat/rooms

List all chat rooms.

**Response (200):**

```json
{
  "total": 3,
  "rooms": [
    {
      "id": "a1b2c3d4e5f6",
      "name": "general",
      "description": "General chat",
      "created_by": "Alice",
      "created_at": "2024-12-15T10:30:00.000Z"
    }
  ]
}
```

### POST /api/chat/rooms

Create a new chat room.

**Request:**

```json
{
  "name": "homework-help",
  "description": "Get help with homework"
}
```

- `name` (required): 1-50 characters
- `description` (optional): Max 200 characters

**Response (201):**

```json
{
  "id": "f1e2d3c4b5a6",
  "name": "homework-help",
  "description": "Get help with homework",
  "created_by": "Alice",
  "created_at": "2024-12-15T11:00:00.000Z"
}
```

### GET /api/chat/rooms/:roomId/messages

Get the last 50 messages for a room, with optional cursor-based pagination.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `before` | string | Message ID — returns messages before this ID |

**Response (200):**

```json
{
  "roomId": "a1b2c3d4e5f6",
  "messages": [
    {
      "id": "m1m2m3m4m5",
      "username": "Alice",
      "message": "Hey everyone!",
      "created_at": "2024-12-15T11:05:00.000Z"
    }
  ]
}
```

---

## Profile Endpoints

### GET /api/profile/:username

Get a user's public profile.

**Response (200):**

```json
{
  "username": "Alice",
  "avatar": null,
  "bio": "Hello, I'm Alice!",
  "coins": 42,
  "xp": 350,
  "level": 3,
  "theme": "default",
  "created_at": "2024-12-15T10:00:00.000Z",
  "stats": {
    "games_played": 15,
    "total_score": 12500,
    "achievements": ["first-proxy", "first-game"],
    "bookmarks_count": 5,
    "history_count": 30,
    "saves_count": 3,
    "chat_messages": 120
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 404 | User not found |

### PATCH /api/profile/:username

Update a user's profile. Users can only update their own profile.

**Request:**

```json
{
  "bio": "Updated bio text",
  "avatar": "🎮",
  "theme": "midnight"
}
```

- `bio` (optional): Max 500 characters
- `avatar` (optional): Max 500 characters
- `theme` (optional): Max 50 characters

**Response (200):**

```json
{
  "username": "Alice",
  "avatar": "🎮",
  "bio": "Updated bio text",
  "coins": 42,
  "xp": 350,
  "level": 3,
  "theme": "midnight",
  "created_at": "2024-12-15T10:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 403 | Trying to update another user's profile |
| 404 | User not found |

### GET /api/profile/:username/stats

Get a user's stats.

**Response (200):**

```json
{
  "username": "Alice",
  "xp": 350,
  "level": 3,
  "coins": 42,
  "stats": {
    "games_played": 15,
    "total_score": 12500,
    "achievements": ["first-proxy", "first-game"],
    "bookmarks_count": 5,
    "history_count": 30,
    "saves_count": 3,
    "chat_messages": 120
  }
}
```

### POST /api/profile/:username/xp

Add XP to a user's profile. Users can only add XP to their own profile.

**Request:**

```json
{
  "amount": 50,
  "reason": "Completed daily challenge"
}
```

- `amount` (required): Positive number, max 1000
- `reason` (optional): Description, max 200 characters

**Response (200):**

```json
{
  "xp_added": 50,
  "reason": "Completed daily challenge",
  "total_xp": 400,
  "level": 4,
  "coins_earned": 5,
  "total_coins": 47,
  "leveled_up": true
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid XP amount |
| 403 | Trying to add XP to another user's profile |
| 404 | User not found |

---

## Leaderboard Endpoints

### GET /api/leaderboard

Global leaderboard — top 25 players ranked by total XP.

**Response (200):**

```json
{
  "leaderboard": [
    { "rank": 1, "username": "Alice", "xp": 5000, "level": 8, "coins": 200, "avatar": null },
    { "rank": 2, "username": "Bob", "xp": 3200, "level": 6, "coins": 120, "avatar": null }
  ]
}
```

### GET /api/leaderboard/:gameId

Get the top 10 scores for a specific game.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `alltime` | `daily`, `weekly`, or `alltime` |

**Response (200):**

```json
{
  "gameId": "tetris",
  "period": "weekly",
  "leaderboard": [
    { "rank": 1, "username": "Alice", "score": 50000, "date": "2024-12-15T10:00:00.000Z" },
    { "rank": 2, "username": "Bob", "score": 35000, "date": "2024-12-14T15:30:00.000Z" }
  ]
}
```

### POST /api/leaderboard/:gameId

Submit a score for a game.

**Request:**

```json
{
  "score": 50000
}
```

- `score` (required): Number, clamped to 0–10,000,000

**Response (200):**

```json
{
  "success": true,
  "gameId": "tetris",
  "score": 50000,
  "id": "s1s2s3s4s5"
}
```

---

## Bookmark Endpoints

### GET /api/bookmarks

Get the authenticated user's bookmarks, sorted by newest first.

**Response (200):**

```json
{
  "total": 5,
  "bookmarks": [
    {
      "id": "b1b2b3b4b5",
      "username": "Alice",
      "url": "https://example.com",
      "title": "Example Site",
      "favicon": "https://example.com/favicon.ico",
      "created_at": "2024-12-15T10:00:00.000Z"
    }
  ]
}
```

### POST /api/bookmarks

Add a bookmark.

**Request:**

```json
{
  "url": "https://example.com",
  "title": "Example Site",
  "favicon": "https://example.com/favicon.ico"
}
```

- `url` (required): Valid URL string
- `title` (optional): Max 500 characters (defaults to the URL)
- `favicon` (optional): Max 500 characters

**Response (201):**

```json
{
  "id": "b6b7b8b9b0",
  "username": "Alice",
  "url": "https://example.com",
  "title": "Example Site",
  "favicon": "https://example.com/favicon.ico",
  "created_at": "2024-12-15T11:00:00.000Z",
  "updated_at": "2024-12-15T11:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Missing or invalid URL |
| 409 | Bookmark already exists (includes `id` of existing) |

### DELETE /api/bookmarks/:id

Delete a bookmark. Users can only delete their own bookmarks.

**Response (200):**

```json
{
  "success": true
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 404 | Bookmark not found or doesn't belong to user |

---

## History Endpoints

### GET /api/history

Get the authenticated user's browsing history.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |

**Response (200):**

```json
{
  "total": 30,
  "page": 1,
  "limit": 50,
  "history": [
    {
      "id": "h1h2h3h4h5",
      "username": "Alice",
      "url": "https://example.com",
      "title": "Example Site",
      "created_at": "2024-12-15T10:00:00.000Z"
    }
  ]
}
```

### POST /api/history

Add a browsing history entry.

**Request:**

```json
{
  "url": "https://example.com",
  "title": "Example Site"
}
```

- `url` (required): Valid URL string
- `title` (optional): Max 500 characters (defaults to the URL)

**Response (201):** The created history entry object.

### DELETE /api/history

Clear all browsing history for the authenticated user.

**Response (200):**

```json
{
  "success": true,
  "removed": 30
}
```

---

## Saves Endpoints

Rate limit: **10 requests per minute** on `/api/saves/*`.

### GET /api/saves/:gameId

Get save data for a specific game.

**Response (200):**

```json
{
  "gameId": "tetris",
  "data": "{\"level\":15,\"score\":50000,\"lines\":120}",
  "updated_at": "2024-12-15T10:00:00.000Z",
  "created_at": "2024-12-14T08:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 404 | No save data found for this game |

### POST /api/saves/:gameId

Save game data. If a save already exists for this user and game, it is updated.

**Request:**

```json
{
  "data": "{\"level\":15,\"score\":50000,\"lines\":120}"
}
```

- `data` (required): Any JSON value (string, object, etc.). Max 50KB when serialized.
- `gameId` (path): 1-100 characters

**Response (201)** (new save):

```json
{
  "success": true,
  "gameId": "tetris",
  "created": true
}
```

**Response (200)** (updated save):

```json
{
  "success": true,
  "gameId": "tetris",
  "updated": true
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Missing `data` field |
| 400 | Invalid `gameId` |
| 413 | Save data exceeds 50KB |

### DELETE /api/saves/:gameId

Delete save data for a specific game.

**Response (200):**

```json
{
  "success": true
}
```

---

## Theme Endpoints

### GET /api/themes

List all themes (paginated).

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 50) |
| `sort` | string | `newest` | `newest`, `downloads`, or `top` |

**Response (200):**

```json
{
  "total": 15,
  "page": 1,
  "limit": 20,
  "themes": [
    {
      "id": "t1t2t3t4t5",
      "name": "Ocean Breeze",
      "code": "ocean-breeze",
      "config": { "accent": "#00bcd4", "bg": "#0a1628" },
      "created_by": "Alice",
      "downloads": 42,
      "created_at": "2024-12-15T10:00:00.000Z"
    }
  ]
}
```

### GET /api/themes/:code

Get a specific theme by code.

**Response (200):**

```json
{
  "id": "t1t2t3t4t5",
  "name": "Ocean Breeze",
  "code": "ocean-breeze",
  "config": {
    "accent": "#00bcd4",
    "bg": "#0a1628",
    "glass": 6,
    "blur": 24
  },
  "created_by": "Alice",
  "downloads": 42,
  "created_at": "2024-12-15T10:00:00.000Z",
  "updated_at": "2024-12-15T10:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 404 | Theme not found |

### POST /api/themes

Create a new theme.

**Request:**

```json
{
  "name": "Ocean Breeze",
  "code": "ocean-breeze",
  "config": {
    "accent": "#00bcd4",
    "bg": "#0a1628",
    "glass": 6,
    "blur": 24,
    "animations": true
  }
}
```

- `name` (required): 1-50 characters
- `code` (required): Lowercase alphanumeric with dashes, max 50 chars
- `config` (required): Object with valid keys: `accent`, `bg`, `glass`, `font`, `text`, `surface`, `border`, `shadow`, `radius`, `animations`

**Response (201):**

```json
{
  "id": "t1t2t3t4t5",
  "name": "Ocean Breeze",
  "code": "ocean-breeze",
  "config": { "accent": "#00bcd4", "bg": "#0a1628", "glass": 6, "blur": 24, "animations": true },
  "created_by": "Alice",
  "downloads": 0,
  "created_at": "2024-12-15T10:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid name, code, or config |
| 409 | Theme code already taken |

### POST /api/themes/:code/install

Increment the download count for a theme.

**Response (200):**

```json
{
  "success": true,
  "downloads": 43
}
```

### DELETE /api/themes/:code

Delete a theme. Only the creator can delete their theme.

**Response (200):**

```json
{
  "success": true
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 403 | Not the theme creator |
| 404 | Theme not found |

---

## Extension Endpoints

### GET /api/extensions

List all extensions (paginated). Does not include script content in list view.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 50) |

**Response (200):**

```json
{
  "total": 8,
  "page": 1,
  "limit": 20,
  "extensions": [
    {
      "id": "e1e2e3e4e5",
      "name": "Dark Reader",
      "code": "dark-reader",
      "description": "Apply dark mode to all proxied pages",
      "version": "1.0.0",
      "created_by": "Bob",
      "downloads": 150,
      "created_at": "2024-12-15T10:00:00.000Z"
    }
  ]
}
```

### GET /api/extensions/:code

Get extension details including the script content.

**Response (200):**

```json
{
  "id": "e1e2e3e4e5",
  "name": "Dark Reader",
  "code": "dark-reader",
  "description": "Apply dark mode to all proxied pages",
  "version": "1.0.0",
  "script": "// User script content here\nconsole.log('Extension loaded');",
  "created_by": "Bob",
  "downloads": 150,
  "created_at": "2024-12-15T10:00:00.000Z",
  "updated_at": "2024-12-15T10:00:00.000Z"
}
```

### POST /api/extensions

Submit a new extension.

**Request:**

```json
{
  "name": "Dark Reader",
  "code": "dark-reader",
  "description": "Apply dark mode to all proxied pages",
  "script": "console.log('Extension loaded');",
  "version": "1.0.0"
}
```

- `name` (required): 1-50 characters
- `code` (required): Lowercase alphanumeric with dashes, max 50 chars
- `description` (required): Max 500 characters
- `script` (required): String, max 100KB. Validated against dangerous patterns.
- `version` (optional): Semver format (e.g., `1.0.0`), defaults to `1.0.0`

**Blocked Script Patterns:**

The extension validator blocks scripts containing any of the following:

- `eval(`
- `Function(`
- `import ` (ES module import)
- `require(`
- `fetch()` to absolute URLs (only relative URLs allowed)
- `XMLHttpRequest`
- `.import()`
- `importModule()`
- `Worker(`
- `SharedArrayBuffer`
- `Atomics.`

**Response (201):** The created extension object (without script).

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid name, code, description, or script |
| 400 | Script contains blocked pattern |
| 409 | Extension code already taken |

### POST /api/extensions/:code/install

Increment the download count for an extension.

**Response (200):**

```json
{
  "success": true,
  "downloads": 151
}
```

### DELETE /api/extensions/:code

Delete an extension. Only the creator can delete their extension.

**Response (200):**

```json
{
  "success": true
}
```

---

## Stealth Endpoints

### POST /api/stealth/classroom

Generate a fake Google Classroom page with customizable class data.

**Request:**

```json
{
  "classes": [
    { "name": "Mathematics", "section": "Period 2", "teacher": "Mr. Johnson", "color": "#1a73e8" },
    { "name": "English", "section": "Period 3", "teacher": "Ms. Williams", "color": "#34a853" }
  ]
}
```

If no `classes` are provided, default classes are generated.

**Response (200):** HTML content (`Content-Type: text/html`)

### GET /api/stealth/fake/:type

Get a pre-built fake page. Valid types: `classroom`, `drive`, `docs`, `slides`, `sheets`.

**Response (200):** HTML content mimicking the respective Google app.

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid stealth type |

### POST /api/stealth/auto

Get auto-stealth configuration.

**Request:**

```json
{
  "enabled": true,
  "fakePage": "classroom",
  "keyBinding": "Escape",
  "hideOnBlur": true,
  "panicKey": "`"
}
```

**Response (200):**

```json
{
  "enabled": true,
  "fakePage": "classroom",
  "keyBinding": "Escape",
  "hideOnBlur": true,
  "panicKey": "`",
  "availablePages": ["classroom", "drive", "docs", "slides", "sheets"],
  "behavior": {
    "hideOnBlur": true,
    "blurReplaceDelay": 50,
    "restoreOnFocus": true,
    "changeTitleOnBlur": true,
    "changeFaviconOnBlur": true,
    "blurTitle": "Google Classroom",
    "blurFavicon": "https://www.google.com/favicon.ico"
  }
}
```

---

## Hub Endpoints

### GET /api/hub/sites

Get the curated site directory.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `search` | string | Search across name, description, category |

**Response (200):**

```json
{
  "total": 25,
  "filtered": 10,
  "sites": [
    {
      "id": "splash",
      "name": "Splash",
      "category": "proxies",
      "description": "Fast web proxy",
      "url": "https://splash.best/"
    }
  ]
}
```

### GET /api/hub/categories

Get unique categories with site counts.

**Response (200):**

```json
{
  "proxies": 8,
  "game-hubs": 12,
  "directories": 5
}
```

### GET /api/mirrors/status

Get proxy mirror health status with resolved URLs.

**Response (200):**

```json
{
  "status": "ok",
  "count": 5,
  "lastUpdated": "2024-12-15T10:00:00.000Z",
  "mirrors": [
    {
      "id": "splash",
      "name": "Splash",
      "resolved": true,
      "priority": 1,
      "reliability": "green",
      "hasPassword": false,
      "primary": "https://splash.best/"
    }
  ]
}
```

### GET /api/cloak/presets

Get tab cloak presets.

**Response (200):**

```json
{
  "status": "ok",
  "count": 14,
  "presets": [
    {
      "id": "classroom",
      "title": "Google Classroom",
      "description": "Disguise as Google Classroom",
      "resolved": true,
      "favicon": "https://www.google.com/favicon.ico"
    }
  ]
}
```

### GET /api/proxy/health

Real proxy engine health check. Tests UV, Scramjet, Bare, and Wisp endpoints.

**Response (200):**

```json
{
  "uv": true,
  "scramjet": true,
  "bare": true,
  "wisp": true,
  "lastChecked": 1702656000000
}
```

---

## Proxy Endpoints

### GET /frog/uv.config.js

Ultraviolet proxy configuration. Served as JavaScript.

**Response:** JavaScript defining `self.__uv$config` with prefix `/frog/service/`, bare path `/bare/`, and XOR encode/decode functions.

### GET /scramjet/config.js

Scramjet proxy configuration. Served as JavaScript.

**Response:** JavaScript defining `self.__scramjet$config` with prefix `/scramjet/service/`, bare path `/bare/`, and XOR encode/decode functions.

### GET /proxy-error

Proxy error page generator.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Error code (ECONNREFUSED, ETIMEDOUT, ENOTFOUND, ERR_SSL_PROTOCOL, 502) |

**Response (502):** HTML error page with retry and engine-switch buttons.

### GET /api/smuggle

Server-side streaming proxy with SSRF protection. Rate limit: 10 requests per minute per IP.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string | The URL to fetch (required) |

**Features:**
- SSRF prevention: blocks private IP ranges and localhost
- Only HTTP/HTTPS URLs allowed
- Manual redirect handling with SSRF validation on redirect targets
- Streaming response (never buffered)
- 30-second timeout
- Content-Type and Content-Length forwarded from upstream

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Missing URL or invalid format |
| 403 | Private IP address or localhost |
| 429 | Rate limited (10/min) |
| 502 | Upstream error |
| 504 | Upstream timeout |

---

## WebSocket Protocol

### Connection

Connect to `ws://host/ws/chat` (or `wss://` for HTTPS). The WebSocket upgrade request must include a valid `strato_auth` cookie. Connections without authentication are rejected with HTTP 401.

```javascript
const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/chat`);
```

### Message Format

All messages are JSON-encoded. Every message has a `type` field.

### Client → Server Messages

#### Join a Room

```json
{
  "type": "join",
  "roomId": "general"
}
```

The `roomId` can be either the room ID or the room name.

#### Send a Chat Message

```json
{
  "type": "chat",
  "roomId": "general",
  "message": "Hello everyone!"
}
```

- `message`: 1-500 characters
- `roomId`: Must be a room the user has joined

#### Leave a Room

```json
{
  "type": "leave",
  "roomId": "general"
}
```

### Server → Client Messages

#### Connection Confirmed

```json
{
  "type": "connected",
  "username": "Alice"
}
```

#### Room Joined

```json
{
  "type": "joined",
  "roomId": "a1b2c3d4e5f6",
  "roomName": "general"
}
```

#### Chat Message

```json
{
  "type": "chat",
  "id": "m1m2m3m4m5",
  "roomId": "a1b2c3d4e5f6",
  "username": "Alice",
  "message": "Hello everyone!",
  "created_at": "2024-12-15T11:05:00.000Z"
}
```

#### User Joined

```json
{
  "type": "user_joined",
  "roomId": "a1b2c3d4e5f6",
  "username": "Bob"
}
```

#### User Left

```json
{
  "type": "user_left",
  "roomId": "a1b2c3d4e5f6",
  "username": "Bob"
}
```

#### Room Left

```json
{
  "type": "left",
  "roomId": "a1b2c3d4e5f6"
}
```

#### Error

```json
{
  "type": "error",
  "error": "Rate limited: slow down"
}
```

### Heartbeat

The server sends ping frames every 30 seconds. Clients must respond with pong frames. If no pong is received within 60 seconds, the connection is terminated. The `ws` library handles this automatically when `ws.on('pong', ...)` is used.

### Rate Limiting

WebSocket messages are rate-limited to 5 messages per 5 seconds per user. Exceeding this limit results in an error message:

```json
{
  "type": "error",
  "error": "Rate limited: slow down"
}
```

### Reconnection

The client should implement exponential backoff reconnection:

```javascript
function reconnect() {
  if (reconnectAttempts >= 10) return;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;
  setTimeout(connect, delay);
}
```

---

## Error Codes

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request — invalid input, missing fields |
| 401 | Not Authenticated — no valid auth cookie |
| 403 | Forbidden — not authorized (e.g., updating another user's profile) |
| 404 | Not Found — resource doesn't exist |
| 409 | Conflict — duplicate resource (e.g., bookmark already exists) |
| 413 | Payload Too Large — exceeds size limit |
| 429 | Too Many Requests — rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable — AI service offline |
| 504 | Gateway Timeout — AI request timed out |

### Error Response Format

All errors return JSON:

```json
{
  "error": "Description of what went wrong"
}
```

Error messages are intentionally generic in production to avoid information leakage. Detailed error information is logged server-side.

### Proxy Error Codes

| Code | Description |
|------|-------------|
| `ECONNREFUSED` | Site is currently unreachable |
| `ETIMEDOUT` | Connection timed out |
| `ENOTFOUND` | Could not find the website |
| `ERR_SSL_PROTOCOL` | Security issue with the site |
| `502` | Bad Gateway — proxy error |

---

## Rate Limiting

### Rate Limit Headers

All API responses include standard rate limit headers:

```
RateLimit-Limit: 60
RateLimit-Remaining: 45
RateLimit-Reset: 1702656060
```

### Rate Limit Tiers

| Endpoint Pattern | Limit | Window |
|------------------|-------|--------|
| `/api/*` (general) | 60 requests | 1 minute |
| `/api/chat/*` | 30 requests | 1 minute |
| `/api/saves/*` | 10 requests | 1 minute |
| `/api/smuggle` | 10 requests | 1 minute |
| Login (`POST /login`) | 8 attempts | 1 minute |
| WebSocket messages | 5 messages | 5 seconds |

### Rate Limit Exceeded

When a rate limit is exceeded, the response is:

```json
{
  "error": "Too many requests, slow down."
}
```

With HTTP status 429 and the same rate limit headers showing the reset time.

### Smuggle Rate Limiting

The smuggle endpoint uses a separate in-memory rate limiter that tracks by IP address. The rate limit map is cleaned every 60 seconds to prevent memory leaks.

### Login Rate Limiting

Login attempts are tracked per IP address with an in-memory map cleaned every 60 seconds. After 8 failed attempts within a minute, further attempts are rejected with a 429 status code and an HTML error page.
