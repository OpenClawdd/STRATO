import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import cookieSignature from "cookie-signature";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Pre-load login page HTML template ──
const LOGIN_TEMPLATE = fs.readFileSync(
  join(__dirname, "..", "..", "public", "login.html"),
  "utf8",
);

// ── HTML escape utility — prevents XSS in rendered error pages ──
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ── CSRF Token Generation ──
function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ── Login rate limiter (in-memory Map, cleaned every 60s) ──
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 60_000;

const __stratoInterval949 = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (now - record.lastAttempt > LOGIN_WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
}, 60_000);
__stratoInterval949.unref?.();

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now - record.lastAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  record.count++;
  record.lastAttempt = now;
  return true;
}

// ── In-memory CSRF token store ──
// Tokens expire after 10 minutes
const csrfTokens = new Map();
const CSRF_TTL = 10 * 60 * 1000;

const __stratoInterval1671 = setInterval(() => {
  const now = Date.now();
  for (const [token, record] of csrfTokens.entries()) {
    if (now - record.created > CSRF_TTL) {
      csrfTokens.delete(token);
    }
  }
}, 60_000);
__stratoInterval1671.unref?.();

// ── Exported cookie validation function for WebSocket and other modules ──
export function validateAuthCookie(cookieHeader) {
  if (!cookieHeader) return null;

  // Use cookie-parser synchronously to parse and unsign the cookie
  // This ensures we use the exact same unsigning logic as the Express middleware
  const secret = process.env.COOKIE_SECRET || "dev-secret-change-me";

  // cookie-parser's internal unsigning expects the raw cookie header value
  // Parse cookies manually using the same split logic as cookie-parser
  const cookies = {};
  const pairs = cookieHeader.split(";");
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].trim();
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    const val = pair.slice(eqIdx + 1).trim();
    // Try to decode
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }

  const rawVal = cookies["strato_auth"];
  if (!rawVal || !rawVal.startsWith("s:")) return null;

  // cookie-signature.unsign expects the value WITHOUT the 's:' prefix
  // The 's:' prefix is added by Express's res.cookie() when signing
  const unsignedVal = rawVal.slice(2);

  // Unsign using cookie-signature
  try {
    const unsigned = cookieSignature.unsign(unsignedVal, secret);
    if (unsigned !== false) {
      return unsigned;
    }
  } catch (err) {
    console.error("[STRATO] Cookie validation error:", err.message);
  }

  return null;
}

// ── Auth Middleware ──
export default function authMiddleware(req, res, next) {
  const path = req.path;

  // Allow health check through
  if (path === "/health") {
    return next();
  }

  // Allow bare and wisp through (handled by server-level routing anyway)
  if (path.startsWith("/bare/") || path.startsWith("/wisp/")) {
    return next();
  }

  // Allow bare-mux and epoxy transport scripts through without auth
  // These are needed by the proxy transport layer before user authenticates
  if (path.startsWith("/bare-mux/") || path.startsWith("/epoxy/")) {
    return next();
  }

  // Allow proxy engine static assets through without auth
  if (path.startsWith("/frog/") || path.startsWith("/scramjet/")) {
    return next();
  }

  // Allow PWA/catalog visual assets through without auth so manifests and cached cards
  // never receive login HTML in place of images.
  if (
    path === "/manifest.json" ||
    path === "/sw.js" ||
    path === "/favicon.ico" ||
    path === "/favicon.png" ||
    path.startsWith("/assets/icons/") ||
    path.startsWith("/assets/thumbnails/")
  ) {
    return next();
  }

  // ── Login page access ──
  if (path === "/login") {
    if (req.method === "GET") {
      // If already authenticated, redirect to home
      const authCookie = req.signedCookies?.strato_auth;
      if (authCookie) {
        return res.redirect(302, "/");
      }

      // Generate CSRF token and store it server-side
      const csrfToken = generateCsrfToken();
      csrfTokens.set(csrfToken, { created: Date.now(), ip: req.ip });

      // Inject the CSRF token directly into the HTML
      const html = LOGIN_TEMPLATE.replace("__CSRF_TOKEN__", csrfToken);

      return res.type("html").send(html);
    }

    if (req.method === "POST") {
      // Rate limit login attempts
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!checkLoginRateLimit(clientIp)) {
        return res
          .status(429)
          .send(
            renderErrorPage("Too many login attempts. Wait 60 seconds.", 429),
          );
      }

      const { username, tos_accepted, csrf_token } = req.body;

      // Verify CSRF token exists in our server-side store
      if (!csrf_token || !csrfTokens.has(csrf_token)) {
        return res
          .status(403)
          .send(
            renderErrorPage(
              "Invalid or expired security token. Go back to /login and try again.",
              403,
            ),
          );
      }

      // Consume the token (one-time use)
      csrfTokens.delete(csrf_token);

      // Verify TOS accepted
      if (tos_accepted !== "true" && tos_accepted !== true) {
        return res
          .status(400)
          .send(renderErrorPage("You must accept the Terms of Service.", 400));
      }

      // Validate username (display-only, 1-24 chars, alphanumeric + underscore)
      if (!username || typeof username !== "string") {
        return res
          .status(400)
          .send(renderErrorPage("Username is required.", 400));
      }
      const cleanUsername = username.trim();
      if (cleanUsername.length < 1 || cleanUsername.length > 24) {
        return res
          .status(400)
          .send(renderErrorPage("Username must be 1-24 characters.", 400));
      }
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return res
          .status(400)
          .send(
            renderErrorPage(
              "Username: letters, numbers, underscores only.",
              400,
            ),
          );
      }

      // Set auth cookie and redirect
      // Only set secure:true when actually behind HTTPS — prevents the browser
      // from silently dropping the cookie on HTTP (localhost, school Chromebooks, etc.)
      const isHttps =
        process.env.HTTPS === "true" || process.env.PORT === "443";
      res.cookie("strato_auth", cleanUsername, {
        signed: true,
        httpOnly: true,
        sameSite: "lax",
        secure: isHttps,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

      return res.redirect(302, "/");
    }

    return next();
  }

  // ── Logout ──
  if (path === "/logout") {
    res.clearCookie("strato_auth");
    return res.redirect(302, "/login");
  }

  // ── API routes: check auth cookie ──
  if (path.startsWith("/api/")) {
    const authCookie = req.signedCookies?.strato_auth;
    if (!authCookie) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    // Inject username for downstream route handlers
    res.locals.username = authCookie;

    // Auto-create user profile on first API request after login
    autoCreateUserProfile(authCookie).catch((err) => {
      console.error("[STRATO] Auto-create profile error:", err.message);
    });

    return next();
  }

  // ── All other routes: check auth ──
  const authCookie = req.signedCookies?.strato_auth;
  if (!authCookie) {
    // Redirect to login page
    if (req.accepts("html")) {
      return res.redirect(302, "/login");
    }
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Authenticated — inject username for downstream
  res.locals.username = authCookie;

  // Auto-create user profile on first authenticated request
  autoCreateUserProfile(authCookie).catch((err) => {
    console.error("[STRATO] Auto-create profile error:", err.message);
  });

  next();
}

// ── Auto-create user profile if it doesn't exist ──
const profileCreated = new Set(); // Cache to avoid repeated DB lookups

// Clean up the profileCreated cache periodically (prevent unbounded memory growth)
const __stratoInterval8676 = setInterval(
  () => {
    profileCreated.clear();
  },
  60 * 60 * 1000,
);
__stratoInterval8676.unref?.(); // Clear every hour

async function autoCreateUserProfile(username) {
  if (profileCreated.has(username)) return;

  try {
    const { default: store } = await import("../db/store.js");
    const existing = await store.getOne(
      "users",
      (u) => u.username === username,
    );
    if (!existing) {
      await store.create("users", {
        username,
        avatar: null,
        bio: "",
        coins: 0,
        xp: 0,
        level: 1,
        theme: "default",
        stats: {
          games_played: 0,
          total_score: 0,
          achievements: [],
          bookmarks_count: 0,
          history_count: 0,
          saves_count: 0,
          chat_messages: 0,
        },
      });
      console.log(`[STRATO] Auto-created profile for user: ${username}`);
    }
    profileCreated.add(username);
  } catch (err) {
    // Store might not be initialized yet — that's OK, will retry on next request
    console.warn("[STRATO] Could not auto-create profile:", err.message);
  }
}

// ── Inline error page (glass aesthetic, no external CSS dependency) ──
function renderErrorPage(message, status) {
  // Escape dynamic content to prevent XSS
  const safeMessage = escapeHtml(message);
  const safeStatus = escapeHtml(String(status));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STRATO — Error</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a12;
      color: #e2e8f0;
      font-family: 'Manrope', -apple-system, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(20px) saturate(1.3);
      -webkit-backdrop-filter: blur(20px) saturate(1.3);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 32px;
      max-width: 420px;
      width: 90%;
      text-align: center;
    }
    h1 { color: #f87171; font-size: 18px; margin-bottom: 12px; }
    p { color: rgba(255,255,255,0.5); font-size: 14px; margin-bottom: 20px; line-height: 1.6; }
    a {
      display: inline-block;
      background: rgba(0,229,255,0.12);
      border: 1px solid rgba(0,229,255,0.25);
      color: #00e5ff;
      padding: 8px 24px;
      border-radius: 12px;
      text-decoration: none;
      font-size: 14px;
      transition: background 0.15s ease;
    }
    a:hover { background: rgba(0,229,255,0.2); }
  </style>
</head>
<body>
  <div class="card">
    <h1>Error ${safeStatus}</h1>
    <p>${safeMessage}</p>
    <a href="/login">Back to Login</a>
  </div>
</body>
</html>`;
}
