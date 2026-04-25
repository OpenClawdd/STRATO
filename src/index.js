import { createServer } from "node:http";
import { join } from "node:path";
import { hostname } from "node:os";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import * as wispServer from "@mercuryworkshop/wisp-js/server";
import { createBareServer } from "@tomphttp/bare-server-node";

// Modules
import apiRoutes from "./routes/api.js";
import proxyRoutes from "./routes/proxy.js";
import { authMiddleware, loginHandler } from "./middleware/auth.js";

const { PORT = "8080", COOKIE_SECRET = "strato_fallback_secret_998877" } = process.env;
const ROOT = process.cwd();

const app = express();
const server = createServer();
const bareServer = createBareServer("/bare/");

// Pre-load index.html
let cachedIndexHtml = "";
function refreshCache() {
        try {
                cachedIndexHtml = fs.readFileSync(join(ROOT, "public", "index.html"), "utf8");
        } catch (e) {
                cachedIndexHtml = "<h1>STRATO — index.html not found</h1>";
        }
}
refreshCache();
setInterval(refreshCache, 120_000).unref();

// Middleware
app.set("trust proxy", 1);
app.use(helmet({
        contentSecurityPolicy: {
                directives: {
                        defaultSrc: ["'self'"],
                        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "https://cdnjs.cloudflare.com", "https://cdn.tailwindcss.com"],
                        scriptSrcAttr: ["'unsafe-inline'"],
                        frameSrc: ["'self'", "blob:", "https:", "http:"],
                        connectSrc: ["'self'", "ws:", "wss:", "https://cdn.tailwindcss.com", "https://raw.githubusercontent.com", "https:", "http:"],
                        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
                        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
                        fontSrc: ["'self'", "https://fonts.gstatic.com"],
                        workerSrc: ["'self'", "blob:"],
                },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
}));
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser(COOKIE_SECRET));

// Logging
app.use((req, res, next) => {
        const start = Date.now();
        res.on("finish", () => {
                const duration = Date.now() - start;
                const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms\n`;
                fsp.appendFile(join(ROOT, "server.log"), logLine).catch(() => {});
        });
        next();
});

// Rate Limiting
const generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1"
});
app.use("/api/", generalLimiter);

// Routes
app.post("/login", loginHandler);
app.use(authMiddleware);

app.use("/api", apiRoutes);
app.use("/", proxyRoutes);

app.get("/", (req, res) => res.send(cachedIndexHtml));
app.use(express.static(join(ROOT, "public")));

// 404
app.use((req, res) => {
        res.status(404).sendFile(join(ROOT, "public", "404.html"), (err) => {
                if (err) res.status(404).send("Not Found");
        });
});

// Server wiring with enhanced Bare/Wisp handling
server.on("request", (req, res) => {
        if (bareServer.shouldRoute(req)) {
                // Custom Bare Header Hardening
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
                res.setHeader("Access-Control-Allow-Headers", "*");
                res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
                
                bareServer.routeRequest(req, res);
                return;
        }
        app(req, res);
});

server.on("upgrade", (req, socket, head) => {
        if (bareServer.shouldRoute(req)) {
                bareServer.routeUpgrade(req, socket, head);
                return;
        }
        if (req.url.startsWith("/wisp/")) {
                wispServer.server.routeRequest(req, socket, head);
                return;
        }
        socket.end();
});

server.listen({ port: parseInt(PORT, 10), host: "0.0.0.0" }, async () => {
	console.log(`\n🚀 STRATO running on http://localhost:${PORT}\n`);

	// ── Startup Diagnostics ──────────────────────────────────
	const { uvPath } = await import("@titaniumnetwork-dev/ultraviolet");
	const criticalFiles = [
		{ label: "UV Service Worker", path: join(uvPath, "uv.sw.js") },
		{ label: "UV Bundle", path: join(uvPath, "uv.bundle.js") },
		{ label: "UV Handler", path: join(uvPath, "uv.handler.js") },
		{ label: "Epoxy Transport (bundled)", path: join(ROOT, "node_modules", "@mercuryworkshop", "epoxy-tls", "full", "epoxy-bundled.js") },
		{ label: "Bare-Mux Worker", path: join(ROOT, "node_modules", "@mercuryworkshop", "bare-mux", "dist", "worker.js") },
		{ label: "Custom UV Config (/frog/)", path: join(ROOT, "public", "frog", "uv.config.js") },
		{ label: "Custom UV SW (/frog/)", path: join(ROOT, "public", "frog", "sw.js") },
		{ label: "Epoxy Transport (custom)", path: join(ROOT, "public", "epoxy-transport.mjs") },
	];

	console.log("─── STRATO Proxy Diagnostics ───");
	let allOk = true;
	for (const { label, path } of criticalFiles) {
		if (fs.existsSync(path)) {
			console.log(`  ✅ ${label}: ${path}`);
		} else {
			console.error(`  ❌ ${label} MISSING: ${path}`);
			allOk = false;
		}
	}
	if (allOk) {
		console.log("  🟢 All critical proxy files verified.\n");
	} else {
		console.error("  🔴 Some critical files are missing! Run 'npm install' or check paths.\n");
	}
});