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
import authMiddleware from './middleware/auth.js';
import proxyRoutes from './routes/proxy.js';
import aiRoutes from './routes/ai.js';
import smuggleRoutes from './routes/smuggle.js';
import hubRoutes from './routes/hub.js';
import { resolveConfig, getConfigStatus } from './config/load-private-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'dev-secret-change-me';

const app = express();
const server = createServer();

// ── Bare server (must be created before routes) ──
const bare = createBareServer('/bare/');

// ── Pre-load login page HTML for fast serving ──
const LOGIN_HTML = fs.readFileSync(
  join(__dirname, '..', 'public', 'login.html'),
  'utf8'
);

// ── 1. Helmet with explicit CSP ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "blob:", "*"],
      connectSrc: ["'self'", "ws:", "wss:", "*"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      mediaSrc: ["'self'", "blob:", "*"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
}));

// ── 2. Compression ──
app.use(compression());

// ── 3. Cookie parser with secret ──
app.use(cookieParser(COOKIE_SECRET));

// ── 4. JSON body (50mb for emulator save states) ──
app.use(express.json({ limit: '50mb' }));

// ── 5. URL-encoded body ──
app.use(express.urlencoded({ extended: true }));

// ── 6. Rate limiting on /api/* routes only ──
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
});
app.use('/api/', apiLimiter);

// ── 7. Auth middleware (TOS gate) ──
//     Handles /login GET (serve login page) and POST (authenticate).
//     Redirects unauthenticated users to /login for all other routes.
//     Must come BEFORE static so unauthenticated users don't see broken SPA.
app.use(authMiddleware);

// ── 8. Static files (only served if authenticated) ──
// Override /assets/games.json to serve resolved config (private URLs injected)
const resolvedGames = resolveConfig('public/assets/games.json');
app.get('/assets/games.json', (req, res) => {
  // Re-resolve on each request in dev (allows hot-reload of .env)
  const result = resolveConfig('public/assets/games.json');
  res.json(result.data);
});

// Config status endpoint — frontend uses this to show CTA for unresolved URLs
app.get('/api/config/status', (req, res) => {
  res.json(getConfigStatus());
});

app.use(express.static(join(__dirname, '..', 'public')));

// ── 9. Header-stripping middleware for proxy iframe support ──
//     Strips X-Frame-Options and modifies CSP frame-ancestors on proxied responses
//     This allows sites loaded through the proxy to be embedded in iframes
app.use('/frog/service/', (req, res, next) => {
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function(name, value) {
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
});

app.use('/scramjet/service/', (req, res, next) => {
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function(name, value) {
    const lower = String(name).toLowerCase();
    if (lower === 'x-frame-options') return res;
    if (lower === 'content-security-policy') {
      if (typeof value === 'string') {
        value = value.replace(/frame-ancestors[^;]*;?/gi, 'frame-ancestors *;');
      }
    }
    return originalSetHeader(name, value);
  };
  next();
});

// ── 10. Routes ──
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

// ── 10. Error handler (last middleware) ──
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
//     Bare handles /bare/* requests; everything else goes to Express.
//     Key: if bare sends a response, we must NOT also call app().
//     And if Express sends a response (e.g. redirect), bare must not interfere.
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
  ║          STRATO v12.0.0                       ║
  ║    Chromatic Storm — Ultra-Maximalist          ║
  ║                                                ║
  ║    http://localhost:${String(PORT).padEnd(5)}                  ║
  ║    Bare:  /bare/     Wisp:  /wisp/             ║
  ║    UV:    /frog/     SJ:    /scramjet/         ║
  ╚════════════════════════════════════════════════╝
  `);
});

// ── Graceful shutdown ──
process.on('SIGTERM', () => {
  console.log('[STRATO] SIGTERM received — shutting down gracefully');
  server.close(() => {
    bare.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[STRATO] SIGINT received — shutting down');
  server.close(() => {
    bare.close();
    process.exit(0);
  });
});

export { app, server };
