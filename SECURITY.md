# STRATO v21 — Security Documentation

This document describes the security measures implemented in STRATO and how to responsibly report vulnerabilities.

---

## Table of Contents

1. [Reporting Vulnerabilities](#reporting-vulnerabilities)
2. [CSRF Protection](#csrf-protection)
3. [Cookie Security](#cookie-security)
4. [Content Security Policy (CSP)](#content-security-policy-csp)
5. [Rate Limiting](#rate-limiting)
6. [Input Validation](#input-validation)
7. [Authentication & Authorization](#authentication--authorization)
8. [HTTP Security Headers](#http-security-headers)
9. [Proxy Security Considerations](#proxy-security-considerations)
10. [Deployment Security](#deployment-security)

---

## Reporting Vulnerabilities

**Do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in STRATO, please report it responsibly:

1. **Email**: Send a detailed description to the project maintainers (see README for contact info).
2. **Include**:
   - Type of vulnerability (XSS, CSRF, injection, etc.)
   - Full steps to reproduce
   - Affected versions
   - Potential impact
3. **Response time**: We aim to acknowledge reports within 48 hours and provide a fix within 7 days for critical issues.
4. **Disclosure**: Please allow us to patch the issue before public disclosure. We practice coordinated disclosure.

We credit responsible reporters in our release notes (unless you request anonymity).

---

## CSRF Protection

STRATO implements **double-submit cookie** CSRF protection for all state-changing requests:

### How It Works

1. **Token generation**: When a user visits `/login`, the server generates a cryptographically random CSRF token (32 bytes via `crypto.randomBytes(32)`) and stores it server-side in an in-memory `Map` with a TTL of 10 minutes.

2. **Token injection**: The CSRF token is injected directly into the login HTML template, replacing the `__CSRF_TOKEN__` placeholder. This avoids the need for a separate fetch request and ensures the token is available at page load.

3. **Token submission**: The login form includes the CSRF token as a hidden field (`csrf_token`), submitted with the POST request.

4. **Token validation**: The server checks that the submitted token exists in the server-side store. If the token is missing, expired, or invalid, the request is rejected with HTTP 403.

5. **Token consumption**: Each CSRF token is **single-use** — it is deleted from the store immediately after validation, preventing replay attacks.

### API Endpoints

For API endpoints that modify data (bookmarks, saves, profile updates, etc.), authentication is verified via signed cookies. The `/api/csrf-token` endpoint provides a token that can be used for AJAX requests if additional CSRF protection is needed.

### Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `CSRF_TTL` | 10 minutes | Time before a token expires |
| Token cleanup | Every 60s | Expired tokens are pruned automatically |

---

## Cookie Security

STRATO uses signed cookies for authentication with the following security properties:

### Auth Cookie (`strato_auth`)

| Property | Value | Rationale |
|----------|-------|-----------|
| `httpOnly` | `true` | Prevents JavaScript access — mitigates XSS cookie theft |
| `sameSite` | `lax` | Blocks CSRF via cross-site POST while allowing top-level navigations |
| `secure` | `true` in production | Only transmitted over HTTPS — prevents network sniffing |
| `signed` | `true` | Tamper-proof via `cookie-signature` with HMAC-SHA256 |
| `maxAge` | 7 days | Limits exposure window if a cookie is compromised |
| `path` | `/` | Available on all routes (required for auth middleware) |

### Cookie Signing

- Cookies are signed using `cookie-signature` with the `COOKIE_SECRET` environment variable.
- The signing process prepends `s:` to the cookie value, which is verified on every request by `cookie-parser`.
- **Production requirement**: `COOKIE_SECRET` must be set or the server refuses to start. This prevents use of the default development secret (`dev-secret-change-me`).

### XSRF-TOKEN Cookie

The `/api/csrf-token` endpoint sets an `XSRF-TOKEN` cookie with:
- `httpOnly: false` — intentionally readable by JavaScript for AJAX headers
- `sameSite: strict` — never sent cross-site
- `secure: true` in production — HTTPS only

---

## Content Security Policy (CSP)

STRATO uses Helmet.js to enforce a strict Content Security Policy:

```apache
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;
worker-src 'self' blob:;
frame-src 'self' blob:;
connect-src 'self' ws: wss:;
img-src 'self' data: blob: https://www.google.com https://icon.horse;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
media-src 'self' blob:;
```

### Design Decisions

| Directive | Why | Trade-off |
|-----------|-----|-----------|
| `'unsafe-inline'` scripts | Required for inline event handlers and dynamic proxy configurations | Accepted risk — all inline code is server-generated, not user-controlled |
| `'unsafe-eval'` scripts | Required by Ultraviolet and Scramjet proxy engines for service worker initialization | Necessary for proxy functionality |
| `blob:` in script/worker/frame | Required for proxy service workers and blob URLs | Standard for proxy applications |
| `ws:/wss:` in connect-src | Required for WebSocket chat (`/ws/chat`) and Wisp protocol (`/wisp/`) | Needed for real-time features |
| `https://www.google.com` in img-src | Google Classroom favicon for stealth mode disguise | Minimal external dependency |
| `https://icon.horse` in img-src | Favicon fetching service for bookmark icons | Public service, no auth data sent |
| `https://fonts.googleapis.com` | Custom font loading | Cosmetic only, no sensitive data |

### Disabled Policies

- `crossOriginEmbedderPolicy: false` — Would break proxy iframe embedding
- `crossOriginOpenerPolicy: false` — Would break proxy window references

These are intentional trade-offs required for the proxy functionality to work correctly.

---

## Rate Limiting

STRATO implements multi-tier rate limiting using `express-rate-limit`:

### API Rate Limits

| Endpoint | Window | Max Requests | Rationale |
|----------|--------|-------------|-----------|
| `/api/*` | 60 seconds | 60 requests | General API protection |
| `/api/chat/*` | 60 seconds | 30 requests | Chat spam prevention |
| `/api/saves/*` | 60 seconds | 10 requests | Prevent save data flooding |
| `/login` (POST) | 60 seconds | 8 attempts | Brute-force login protection |

### Rate Limit Headers

All rate-limited responses include standard headers:
- `RateLimit-Limit`: Maximum requests allowed in the window
- `RateLimit-Remaining`: Requests remaining in the current window
- `RateLimit-Reset`: Time (in seconds) until the window resets

Legacy `X-RateLimit-*` headers are **not** sent.

### Login Rate Limiting

Login attempts use a dedicated in-memory rate limiter that:
- Tracks attempts per IP address
- Locks out after 8 failed attempts within 60 seconds
- Returns HTTP 429 with a clear error message
- Automatically resets after the cooldown window

### Configuration

Rate limits can be tuned via environment variables (see `.env.example`):
- `RATE_LIMIT_API` — General API limit (default: 60)
- `RATE_LIMIT_CHAT` — Chat message limit (default: 30)
- `RATE_LIMIT_SAVES` — Save operation limit (default: 10)
- `LOGIN_MAX_ATTEMPTS` — Login attempts before lockout (default: 8)

### Behind Reverse Proxies

STRATO sets `trust proxy: 1` to correctly identify client IPs when deployed behind load balancers or CDNs. This means it trusts the first proxy in the chain (e.g., Cloudflare, Railway, Fly.io) to provide the correct `X-Forwarded-For` header.

---

## Input Validation

STRATO validates all user input at multiple layers:

### Username Validation (Login)

- **Length**: 1–24 characters
- **Charset**: Alphanumeric and underscores only (`/^[a-zA-Z0-9_]+$/`)
- **Trimmed**: Leading/trailing whitespace is removed before validation
- **Required**: Cannot be empty or null

```javascript
const cleanUsername = username.trim();
if (cleanUsername.length < 1 || cleanUsername.length > 24) return 400;
if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) return 400;
```

### AI Chat Input Validation

- **Messages array**: Must be non-empty array
- **Message format**: Each message must have `role` (string) and `content` (string)
- **Role validation**: Only `user`, `assistant`, `system` are accepted
- **Subject validation** (Tutor): Must be one of `math`, `science`, `history`, `english`, `general`

### AI Vision Input Validation

- **Image format**: Must be a valid data URL (`data:image/...`) or pure base64 string
- **Base64 validation**: Full string validated against `/^[A-Za-z0-9+/=]+$/` (not just first N characters)
- **Size limit**: 10MB estimated decoded size
- **Buffer-level check**: Size is verified on the raw buffer before JSON parse via Express `verify` callback

### General Principles

1. **Reject, don't sanitize**: Invalid input is rejected with a clear error, not silently modified
2. **No reflection**: Error messages never echo back user input, preventing XSS in error responses
3. **HTML escaping**: All dynamic content rendered in HTML pages is escaped via `escapeHtml()`
4. **Type checking**: All API inputs are type-checked before processing
5. **Body size limits**: JSON body limited to 10MB by default, with specific routes having tighter limits

---

## Authentication & Authorization

### Login Flow

1. User visits any page → redirect to `/login` if not authenticated
2. Server renders login page with an embedded CSRF token
3. User enters a display name and accepts the Terms of Service
4. Server validates input, sets a signed cookie, and redirects to `/`
5. All subsequent requests are authenticated via the signed cookie

### Authentication Middleware

- **Excluded paths**: `/health`, `/bare/*`, `/wisp/*`, `/frog/*`, `/scramjet/*` — these bypass auth
- **API routes**: Return HTTP 401 JSON for unauthenticated requests
- **Page routes**: Redirect to `/login` for unauthenticated requests (HTML) or return 401 (JSON)
- **WebSocket**: Chat WebSocket validates the auth cookie during the upgrade handshake

### Session Management

- Sessions are cookie-based (no server-side session store)
- Cookie contains the username (signed, tamper-proof)
- No session fixation risk — cookies are set only after successful login
- Logout clears the cookie and redirects to `/login`

---

## HTTP Security Headers

STRATO uses Helmet.js to set security headers on every response:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | See CSP section above | Prevent XSS and data injection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS for 1 year |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | Not set (overridden by CSP `frame-src`) | Proxy iframes need embedding |
| `X-DNS-Prefetch-Control` | `off` | Prevent DNS prefetching |
| `X-Download-Options` | `noopen` | Prevent IE from auto-opening downloads |
| `X-Permitted-Cross-Domain-Policies` | `none` | Restrict Flash/PDF cross-domain access |
| `Referrer-Policy` | `no-referrer` | Don't leak referrer information |
| `X-XSS-Protection` | `0` | Disabled — modern browsers use CSP instead |

### HSTS Configuration

- `maxAge`: 31536000 (1 year)
- `includeSubDomains`: true — applies to all subdomains
- `preload`: false — not submitted to the HSTS preload list (operators can opt in)

---

## Proxy Security Considerations

### Frame Header Stripping

STRATO intentionally strips `X-Frame-Options` and modifies `Content-Security-Policy` `frame-ancestors` directives on proxied responses (`/frog/service/`, `/scramjet/service/`). This is a **necessary security trade-off** — without it, sites loaded through the proxy cannot be embedded in iframes, which would break the core proxy functionality.

```javascript
// Intentional: strips X-Frame-Options on proxied content
if (lower === 'x-frame-options') return res;
// Intentional: modifies CSP frame-ancestors to allow embedding
if (lower === 'content-security-policy') {
  value = value.replace(/frame-ancestors[^;]*;?/gi, 'frame-ancestors *;');
}
```

### Bare Server

The Bare server (`/bare/`) handles proxy transport and is excluded from authentication. This is required because proxy service workers make requests before the page has a chance to set cookies. The Bare server does not serve user content — it only handles proxy protocol messages.

### Wisp Protocol

The Wisp server (`/wisp/`) handles WebSocket-based proxy transport. Like the Bare server, it is excluded from authentication for the same reason — proxy transport connections are established at a low level before authentication cookies are available.

---

## Deployment Security

### Docker

- **Non-root user**: The container runs as the `strato` user, not root
- **Signal handling**: Uses `dumb-init` as PID 1 for proper signal forwarding
- **Minimal image**: Based on `node:20-slim` — no unnecessary packages
- **No secrets in image**: Environment variables are injected at runtime, not baked into the image
- **Health checks**: Built-in health check on `/health` endpoint

### Environment Variables

- `COOKIE_SECRET` — **Required** in production. The server will refuse to start without it.
- `.env` file — Must be in `.gitignore` (enforced automatically by the server)
- `games-private.json` — Must be in `.gitignore` (enforced automatically by the server)
- Docker secrets / platform secrets — Use your platform's secret management (Railway, Render, Fly.io)

### Data Persistence

- User data (profiles, bookmarks, saves, chat) is stored in the `data/` directory as JSON files
- This directory should be mounted as a persistent volume in production
- The directory is automatically added to `.gitignore` by the server on startup

### Network Security

- The server sets `trust proxy: 1` — ensure your reverse proxy sets `X-Forwarded-For` correctly
- HTTPS should be enforced at the platform level (Railway, Render, Fly.io all provide automatic HTTPS)
- The `secure` flag on cookies is only set when `NODE_ENV=production`, which assumes HTTPS is active

### Graceful Shutdown

The server handles `SIGTERM` and `SIGINT` gracefully:
- Stops accepting new connections
- Closes existing connections
- Shuts down the Bare server
- Force-exits after 10 seconds if connections don't close cleanly

---

## Security Checklist for Operators

Before deploying STRATO in production, verify:

- [ ] `COOKIE_SECRET` is set to a strong random string (≥32 characters)
- [ ] `NODE_ENV=production` is set
- [ ] HTTPS is enabled (via your platform or reverse proxy)
- [ ] `.env` file is not committed to Git
- [ ] `games-private.json` is not committed to Git
- [ ] The `data/` directory is mounted as a persistent volume
- [ ] Rate limiting is appropriate for your user base
- [ ] Your reverse proxy correctly sets `X-Forwarded-For`
- [ ] You have reviewed the CSP policy and understand the trade-offs
