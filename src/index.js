import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createBareServer } from "@tomphttp/bare-server-node";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import authMiddleware from "./middleware/auth.js";
import proxyRoutes from "./routes/proxy.js";
import aiRoutes from "./routes/ai.js";
import smuggleRoutes from "./routes/smuggle.js";
import hubRoutes from "./routes/hub.js";
import profileRoutes from "./routes/profile.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import bookmarksRoutes from "./routes/bookmarks.js";
import savesRoutes from "./routes/saves.js";
import chatRoutes from "./routes/chat.js";
import themesRoutes from "./routes/themes.js";
import extensionsRoutes from "./routes/extensions.js";
import stealthRoutes from "./routes/stealth.js";
import adminRoutes from "./routes/admin.js";
import notificationRoutes from "./routes/notifications.js";
import dataRoutes from "./routes/data.js";
import { sanitizeBody } from "./middleware/sanitize.js";
import { csrfProtection, generateCsrfToken } from "./middleware/csrf.js";
import { initWebSocket } from "./websocket.js";
import { initStore } from "./db/store.js";
import {
  resolveConfig,
  getConfigStatus,
} from "./config/load-private-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;

// ── Initialize database store ──
initStore();

// ── Cookie secret — fail loudly in production if not set ──
const COOKIE_SECRET = process.env.COOKIE_SECRET;
if (!COOKIE_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "[STRATO] COOKIE_SECRET environment variable is required in production",
  );
}
const cookieSecret = COOKIE_SECRET || "dev-secret-change-me";

const app = express();
const server = createServer();

// ── Bare server (must be created before routes) ──
const bare = createBareServer("/bare/");

// ── Pre-load login page HTML for fast serving ──
const LOGIN_HTML = fs.readFileSync(
  join(__dirname, "..", "public", "login.html"),
  "utf8",
);

// ── 1. Trust first proxy — correct req.ip behind reverse proxy ──
app.set("trust proxy", 1);

// ── 0b. Health check — VERY FIRST route, before ALL middleware ──
//     Must be before helmet/csrf/auth to guarantee it's always accessible
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    version: "5.0.1",
    uptime: process.uptime(),
    engines: { uv: true, scramjet: true },
    wisp: true,
    features: {
      profiles: true,
      leaderboards: true,
      bookmarks: true,
      saves: true,
      chat: true,
      themes: true,
      extensions: true,
      stealth: true,
      aiTutor: true,
      admin: true,
      analytics: true,
      notifications: true,
      dataImportExport: true,
      inputSanitization: true,
      csrfProtection: true,
      aiSubjects: 10,
    },
  });
});

// ── 2. Helmet with explicit CSP + HSTS ──
const isProduction = process.env.NODE_ENV === "production";
// Detect if we're behind HTTPS (reverse proxy sets X-Forwarded-Proto)
// Only enable HSTS when actual HTTPS is confirmed — prevents ERR_SSL_PROTOCOL_ERROR
const enableHsts =
  isProduction && (process.env.HTTPS === "true" || process.env.PORT === "443");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
        scriptSrcAttr: ["'unsafe-inline'"],
        workerSrc: ["'self'", "blob:"],
        frameSrc: ["'self'", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:", "https:", "blob:", "http:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "blob:",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
          "https://frontend-cdn.perplexity.ai",
        ],
        mediaSrc: ["'self'", "blob:"],
      },
    },
    // Only enable HSTS when explicitly behind HTTPS — prevents ERR_SSL_PROTOCOL_ERROR
    // on HTTP-only servers (localhost:8080, school Chromebooks without SSL, etc.)
    hsts: enableHsts
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false,
        }
      : false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
  }),
);

// ── 3. Compression ──
app.use(compression());

// ── 4. Cookie parser with secret ──
app.use(cookieParser(cookieSecret));

// ── 5. JSON body (10mb default — 50mb only for specific upload routes) ──
app.use(express.json({ limit: "10mb" }));

// ── 6. URL-encoded body ──
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── 6b. Input sanitization ──
app.use(sanitizeBody);

// ── 6c. CSRF protection on state-changing requests ──
app.use(csrfProtection);

// ── 7. Rate limiting on /api/* routes ──
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, slow down." },
});
app.use("/api/", apiLimiter);

// ── Chat rate limiter: 30/min ──
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many chat requests, slow down." },
});
app.use("/api/chat/", chatLimiter);

// ── Saves rate limiter: 10/min ──
const savesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many save requests, slow down." },
});
app.use("/api/saves/", savesLimiter);

// ── 8. Auth middleware (TOS gate) ──
//     Handles /login GET (serve login page) and POST (authenticate).
//     Redirects unauthenticated users to /login for all other routes.
//     Must come BEFORE static so unauthenticated users don't see broken SPA.
app.use(authMiddleware);

// ── 9. Catalog config endpoints (private URLs injected where needed) ──
app.get("/assets/games.json", (req, res) => {
  const result = resolveConfig("public/assets/games.json");
  res.json(result.data);
});

app.get("/assets/surfaces.json", (req, res) => {
  const result = resolveConfig("public/assets/surfaces.json");
  res.json(result.data);
});

// ── Config status endpoint — frontend uses this to show CTA for unresolved URLs ──
app.get("/api/config/status", (req, res) => {
  res.json(getConfigStatus());
});

// ── CSRF token endpoint — populates meta tag for API calls ──
app.get("/api/csrf-token", (req, res) => {
  // Use generateCsrfToken() from csrf.js so the token is actually stored in the server-side store
  // Previously used crypto.randomBytes() directly which created tokens that were never validated
  const token = generateCsrfToken({
    ip: req.ip,
    username: res.locals.username,
  });
  // Only set secure:true when actually behind HTTPS — matches auth cookie behavior
  const isHttps = process.env.HTTPS === "true" || process.env.PORT === "443";
  res.cookie("XSRF-TOKEN", token, {
    httpOnly: false,
    sameSite: "strict",
    secure: isHttps,
  });
  res.json({ token });
});

// ── 10. Static files (only served if authenticated) ──
app.use(express.static(join(__dirname, "..", "public")));

// ── 11. Header-stripping middleware for proxy iframe support ──
//     Strips X-Frame-Options and modifies CSP frame-ancestors on proxied responses.
//     This allows sites loaded through the proxy to be embedded in iframes.
//     NOTE: This is an intentional security trade-off for proxy functionality.
function stripFrameHeaders(req, res, next) {
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function (name, value) {
    const lower = String(name).toLowerCase();
    if (lower === "x-frame-options") return res; // Strip entirely
    if (lower === "content-security-policy") {
      if (typeof value === "string") {
        value = value.replace(/frame-ancestors[^;]*;?/gi, "frame-ancestors *;");
      }
    }
    return originalSetHeader(name, value);
  };
  next();
}

app.use("/frog/service/", stripFrameHeaders);
app.use("/scramjet/service/", stripFrameHeaders);

// ── 12. Routes ──
// ── Original routes ──
app.use(proxyRoutes);
app.use(aiRoutes);
app.use(smuggleRoutes);
app.use(hubRoutes);

// ── v20 routes ──
app.use(profileRoutes);
app.use(leaderboardRoutes);
app.use(bookmarksRoutes);
app.use(savesRoutes);
app.use(chatRoutes);
app.use(themesRoutes);
app.use(extensionsRoutes);
app.use(stealthRoutes);

// ── STRATO routes ──
app.use(adminRoutes);
app.use(notificationRoutes);
app.use(dataRoutes);

// ── 13. Error handler (last middleware) ──
app.use((err, req, res, _next) => {
  console.error("[STRATO] Unhandled error:", err);

  // If headers already sent (e.g. by a redirect), we can't send more
  if (res.headersSent) {
    if (!res.writableEnded) res.end();
    return;
  }

  const status = err.status || 500;
  const message = err.expose ? err.message : "Internal server error";
  res.status(status).json({ error: message });
});

// ── Wisp server setup ──
let wispRouteRequest = null;
try {
  const { server: wispServerMod } =
    await import("@mercuryworkshop/wisp-js/server");
  if (wispServerMod && typeof wispServerMod.routeRequest === "function") {
    wispRouteRequest = wispServerMod.routeRequest;
    console.log("[STRATO] Wisp server initialized");
  } else {
    console.warn(
      "[STRATO] Wisp server module found but no routeRequest export",
    );
  }
} catch (err) {
  console.warn("[STRATO] Wisp server failed to initialize:", err.message);
}

// ── HTTP request routing: Bare vs Express ──
server.on("request", (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

// ── WebSocket upgrade routing: Bare vs Wisp vs Chat ──
// The WS chat module (websocket.js) registers its own upgrade listener
// via initWebSocket(), so we only handle Bare and Wisp here.
server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else if (req.url.startsWith("/wisp/") && wispRouteRequest) {
    wispRouteRequest(req, socket, head);
  } else if (req.url === "/ws/chat") {
    // Handled by initWebSocket's own upgrade listener — skip here
    return;
  } else {
    socket.destroy();
  }
});

// ── Initialize WebSocket chat server ──
initWebSocket(server);

// ── Ensure data/ directory is gitignored ──
const gitignorePath = join(__dirname, "..", ".gitignore");
try {
  let gitignore = "";
  if (fs.existsSync(gitignorePath)) {
    gitignore = fs.readFileSync(gitignorePath, "utf8");
  }
  if (!gitignore.includes("data/")) {
    gitignore += "\n# STRATO data directory (JSON database)\ndata/\n";
    fs.writeFileSync(gitignorePath, gitignore, "utf8");
  }
} catch (err) {
  console.warn("[STRATO] Could not update .gitignore:", err.message);
}

// ── Start server ──
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════╗
  ║          STRATO v5.0.1                         ║
  ║        The Living Hideout                     ║
  ║                                                ║
  ║    http://localhost:${String(PORT).padEnd(5)}                  ║
  ║    Bare:  /bare/     Wisp:  /wisp/             ║
  ║    UV:    /frog/     SJ:    /scramjet/         ║
  ║    Chat:  /ws/chat                             ║
  ║                                                ║
  ║    Open here first. Enter the hideout.          ║
  ║    Search / Picks / Shelf / Launch Bay         ║
  ║    Local personalization + safer imports       ║
  ║    Tests + catalog validation included         ║
  ╚════════════════════════════════════════════════╝
  `);
});

// ── Graceful shutdown with forced timeout ──
function gracefulShutdown(signal) {
  console.log(`[STRATO] ${signal} received — shutting down gracefully`);
  const forceTimer = setTimeout(() => {
    console.warn("[STRATO] Forced shutdown after 10s timeout");
    process.exit(1);
  }, 10_000);

  server.close(() => {
    clearTimeout(forceTimer);
    bare.close();
    process.exit(0);
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { app, server, PORT };
