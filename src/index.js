import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { createBareServer } from '@tomphttp/bare-server-node';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import crypto from 'crypto';
import authMiddleware from './middleware/auth.js';
import proxyRoutes from './routes/proxy.js';
import aiRoutes from './routes/ai.js';
import smuggleRoutes from './routes/smuggle.js';
import hubRoutes from './routes/hub.js';
import { resolveConfig, getConfigStatus } from './config/load-private-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;

// ── Cookie secret — fail loudly in production if not set ──
const COOKIE_SECRET = process.env.COOKIE_SECRET;
if (!COOKIE_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('[STRATO] COOKIE_SECRET environment variable is required in production');
}
const cookieSecret = COOKIE_SECRET || 'dev-secret-change-me';

const app = express();
const server = createServer();

// ── Bare server (must be created before routes) ──
const bare = createBareServer('/bare/');

// ── Pre-load login page HTML for fast serving ──
const LOGIN_HTML = fs.readFileSync(
  join(__dirname, '..', 'public', 'login.html'),
  'utf8'
);

// ── 1. Trust first proxy — correct req.ip behind reverse proxy ──
app.set('trust proxy', 1);

// ── 2. Helmet with explicit CSP + HSTS ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      imgSrc: ["'self'", "data:", "blob:", "https://www.google.com", "https://icon.horse"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      mediaSrc: ["'self'", "blob:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: false,
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
}));

// ── 3. Compression ──
app.use(compression());

// ── 4. Cookie parser with secret ──
app.use(cookieParser(cookieSecret));

// ── 5. JSON body (10mb default — 50mb only for specific upload routes) ──
app.use(express.json({ limit: '10mb' }));

// ── 6. URL-encoded body ──
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── 7. Rate limiting on /api/* routes only ──
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
});
app.use('/api/', apiLimiter);

// ── 8. Auth middleware (TOS gate) ──
//     Handles /login GET (serve login page) and POST (authenticate).
//     Redirects unauthenticated users to /login for all other routes.
//     Must come BEFORE static so unauthenticated users don't see broken SPA.
app.use(authMiddleware);

// ── 9. Override /assets/games.json to serve resolved config (private URLs injected) ──
app.get('/assets/games.json', (req, res) => {
  const result = resolveConfig('public/assets/games.json');
  res.json(result.data);
});

// ── Config status endpoint — frontend uses this to show CTA for unresolved URLs ──
app.get('/api/config/status', (req, res) => {
  res.json(getConfigStatus());
});

// ── CSRF token endpoint — populates meta tag for API calls ──
app.get('/api/csrf-token', (req, res) => {
  const token = req.cookies['XSRF-TOKEN'] || crypto.randomBytes(32).toString('hex');
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ token });
});

// ── 10. Static files (only served if authenticated) ──
app.use(express.static(join(__dirname, '..', 'public')));

// ── 11. Header-stripping middleware for proxy iframe support ──
//     Strips X-Frame-Options and modifies CSP frame-ancestors on proxied responses.
//     This allows sites loaded through the proxy to be embedded in iframes.
//     NOTE: This is an intentional security trade-off for proxy functionality.
function stripFrameHeaders(req, res, next) {
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function (name, value) {
    const lower = String(name).toLowerCase();
    if (lower === 'x-frame-options') return res; // Strip entirely
    if (lower === 'content-security-policy') {
      if (typeof value === 'string') {
        value = value.replace(/frame-ancestors[^;]*;?/gi, 'frame-ancestors *;');
      }
    }
    return originalSetHeader(name, value);
  };
  next();
}

app.use('/frog/service/', stripFrameHeaders);
app.use('/scramjet/service/', stripFrameHeaders);

// ── 12. Routes ──
app.use(proxyRoutes);
app.use(aiRoutes);
app.use(smuggleRoutes);
app.use(hubRoutes);

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    engines: { uv: true, scramjet: true },
    wisp: true,
  });
});

// ── 13. Error handler (last middleware) ──
app.use((err, req, res, _next) => {
  console.error('[STRATO] Unhandled error:', err);

  // If headers already sent (e.g. by a redirect), we can't send more
  if (res.headersSent) {
    if (!res.writableEnded) res.end();
    return;
  }

  const status = err.status || 500;
  const message = err.expose ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
});

// ── Wisp server setup ──
let wispRouteRequest = null;
try {
  const { server: wispServerMod } = await import('@mercuryworkshop/wisp-js/server');
  if (wispServerMod && typeof wispServerMod.routeRequest === 'function') {
    wispRouteRequest = wispServerMod.routeRequest;
    console.log('[STRATO] Wisp server initialized');
  } else {
    console.warn('[STRATO] Wisp server module found but no routeRequest export');
  }
} catch (err) {
  console.warn('[STRATO] Wisp server failed to initialize:', err.message);
}

// ── HTTP request routing: Bare vs Express ──
server.on('request', (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

// ── WebSocket upgrade routing: Bare vs Wisp ──
server.on('upgrade', (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else if (req.url.startsWith('/wisp/') && wispRouteRequest) {
    wispRouteRequest(req, socket, head);
  } else {
    socket.destroy();
  }
});

// ── Start server ──
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════╗
  ║          STRATO v13.0.0                       ║
  ║    NEXUS — Refined Premium Dashboard           ║
  ║                                                ║
  ║    http://localhost:${String(PORT).padEnd(5)}                  ║
  ║    Bare:  /bare/     Wisp:  /wisp/             ║
  ║    UV:    /frog/     SJ:    /scramjet/         ║
  ╚════════════════════════════════════════════════╝
  `);
});

// ── Graceful shutdown with forced timeout ──
function gracefulShutdown(signal) {
  console.log(`[STRATO] ${signal} received — shutting down gracefully`);
  const forceTimer = setTimeout(() => {
    console.warn('[STRATO] Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10_000);

  server.close(() => {
    clearTimeout(forceTimer);
    bare.close();
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, server, PORT };
