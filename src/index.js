import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { hostname } from "node:os";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import dns from "node:dns/promises";
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { getAuthPage } from "./auth.js";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { proxyManager } from "./proxy-manager.js";
import * as wispServer from "@mercuryworkshop/wisp-js/server";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { scramjetPath } from "@mercuryworkshop/scramjet";
import { createBareServer } from "@tomphttp/bare-server-node";
import axios from "axios";
import { decompress } from "./decompress.js";

// ---------------------------------------------------------------------------
// SSRF Guard — block requests to loopback, RFC-1918, link-local, metadata
// ---------------------------------------------------------------------------
async function isSafeUrl(rawUrl) {
	try {
		const { hostname: host, protocol } = new URL(rawUrl);
		if (!["http:", "https:"].includes(protocol)) return false;

		const BLOCKED_REGEX =
			/^(localhost|127\.|0\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1|fc[0-9a-f][0-9a-f]?|fd[0-9a-f][0-9a-f]?)/i;

		const bare = host.startsWith("[") ? host.slice(1, -1) : host;
		if (BLOCKED_REGEX.test(bare)) return false;

		// Resolve DNS to check for hidden local IPs (DNS Rebinding protection)
		try {
			const { address } = await dns.lookup(bare);
			if (BLOCKED_REGEX.test(address)) return false;
		} catch {
			// If DNS lookup fails, it's safer to block it for sensitive proxy operations
			// unless we want to allow unknown hosts. For STRATO, we'll allow it if 
			// it's not explicitly blocked by the regex above.
		}

		return true;
	} catch {
		return false;
	}
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const { PORT = "8080" } = process.env;
if (!process.env.COOKIE_SECRET) {
	process.env.COOKIE_SECRET = "strato_fallback_secret_998877";
	console.warn("[!] COOKIE_SECRET missing in .env. Using temporary fallback.");
}
const ROOT = process.cwd();

// Pre-load index.html
let cachedIndexHtml = "";
function refreshCache() {
	try {
		cachedIndexHtml = fs.readFileSync(
			join(ROOT, "public", "index.html"),
			"utf8"
		);
	} catch (e) {
		console.error("Failed to read index.html:", e.message);
		cachedIndexHtml = "<h1>STRATO — index.html not found</h1>";
	}
}
refreshCache();
setInterval(refreshCache, 120_000).unref();

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
export const app = express();

app.set("trust proxy", 1);

app.use((req, res, next) => {
	req.id = randomUUID();
	res.setHeader("X-Request-ID", req.id);
	next();
});

app.use((req, res, next) => {
	const start = Date.now();
	res.on("finish", () => {
		const duration = Date.now() - start;
		const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms ${req.ip}\n`;
		// Using fsp.appendFile for non-blocking I/O
		fsp.appendFile(join(ROOT, "server.log"), logLine).catch((err) => {
			console.error("Log error:", err);
		});
	});
	next();
});

app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: [
					"'self'",
					"'unsafe-inline'",
					"blob:",
					"https://cdnjs.cloudflare.com",
					"https://cdn.tailwindcss.com",
				],
				scriptSrcAttr: ["'unsafe-inline'"],
				frameSrc: ["'self'", "blob:", "https:", "http:"],
				connectSrc: ["'self'", "ws:", "wss:", "https://cdn.tailwindcss.com", "https://raw.githubusercontent.com"],
				imgSrc: ["'self'", "data:", "blob:", "https:"],
				styleSrc: [
					"'self'",
					"'unsafe-inline'",
					"https://fonts.googleapis.com",
					"https://cdn.tailwindcss.com",
				],
				fontSrc: ["'self'", "https://fonts.gstatic.com", "https://r2cdn.perplexity.ai"],
				upgradeInsecureRequests: null,
			},
		},
		crossOriginEmbedderPolicy: false,
		crossOriginOpenerPolicy: false,
	})
);

app.use(
	compression({
		filter: (req, res) => {
			if (req.path.startsWith('/api/smuggle')) return false;
			return compression.filter(req, res);
		},
		threshold: 1024
	})
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));

const smuggleLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	message: { error: "Smuggle rate limit exceeded", retryAfter: 60 },
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1"
});

const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	message: "API rate limit exceeded.",
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1"
});

const saveLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	message: "Save rate limit exceeded.",
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1"
});

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	message: "Too many login attempts. Please try again later.",
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1"
});

app.use("/api/smuggle", smuggleLimiter);
app.use("/api/save", saveLimiter);
app.use("/api/", apiLimiter);

app.post("/login", loginLimiter, (req, res) => {
	const expectedPassword = process.env.SITE_PASSWORD;
	const tosAccepted = req.body.tos_accepted === "true" || req.body.tos_accepted === true;

	if (!tosAccepted) {
		return res.status(400).send("You must accept the Terms of Service.");
	}

	// The password check is removed to replace password-based login with a TOS gate.
	// We still check for TOS acceptance.

	// Set the auth cookie
	res.cookie("strato_auth", "granted", {
		signed: true,
		httpOnly: true,
		secure: process.env.SECURE_COOKIES === "true",
		sameSite: "strict",
		maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
	});

	res.redirect("/");
});

app.use((req, res, next) => {
	// Skip auth for static assets and known public paths
	const publicPaths = ["/frog/", "/surf/", "/config/", "/login", "/api/proxy-status", "/scramjet/", "/js/"];
	if (
		publicPaths.some((p) => req.path.startsWith(p)) ||
		req.path.match(/\.(js|css|png|jpg|webp|ico|wasm|json)$/)
	) {
		return next();
	}

	// DEBUG: log request path and cookies
	// console.log(`[AUTH DEBUG] path: ${req.path}, auth: ${req.signedCookies ? req.signedCookies.strato_auth : 'no-cookies'}`);

	if (req.signedCookies.strato_auth === "granted") {
		return next();
	}

    if (req.path === "/" || req.path === "/index.html") {
        return res.send(getAuthPage());
    }

	return res.redirect(302, '/');
});

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Proxy module static assets with correct MIME types
// ---------------------------------------------------------------------------
const staticConfig = {
	setHeaders(res, filePath) {
		if (filePath.endsWith(".js") || filePath.endsWith(".mjs"))
			res.setHeader("Content-Type", "application/javascript");
		if (filePath.endsWith(".wasm"))
			res.setHeader("Content-Type", "application/wasm");
	},
};

app.use("/frog/baremux/", express.static(join(ROOT, "node_modules", "@mercuryworkshop", "bare-mux", "dist"), staticConfig));
app.get("/scramjet/codecs.js", (req, res) => res.sendFile(join(ROOT, "node_modules", "@mercuryworkshop", "scramjet", "dist", "scramjet.codecs.js")));
app.get("/stealth.js", (req, res) => res.sendFile(join(ROOT, "public", "js", "stealth.js")));

// ---------------------------------------------------------------------------
// Proxy module static assets
// ---------------------------------------------------------------------------
app.get("/frog/uv.config.js", (req, res) =>
	res.sendFile(join(ROOT, "public", "frog", "uv.config.js"))
);
app.get("/frog/sw.js", (req, res) =>
	res.sendFile(join(ROOT, "public", "frog", "sw.js"))
);
app.use("/frog/", express.static(uvPath, staticConfig));

const scramjetPrefix = "/surf/scram/";
app.use(scramjetPrefix, express.static(scramjetPath, staticConfig));
app.get(`${scramjetPrefix}scramjet.config.js`, (req, res) =>
	res.sendFile(join(ROOT, "public", "scramjet.config.js"))
);

app.use(
	"/surf/baremux/",
	express.static(
		join(ROOT, "node_modules", "@mercuryworkshop", "bare-mux", "dist"),
		staticConfig
	)
);
app.use(
	"/surf/epoxy/",
	express.static(
		join(ROOT, "node_modules", "@mercuryworkshop", "epoxy-tls", "full"),
		staticConfig
	)
);

app.use("/config", express.static(join(ROOT, "config")));

// ---------------------------------------------------------------------------
// API — Proxy Status
// ---------------------------------------------------------------------------
app.get("/api/proxy-status", (req, res) => {
	res.json(proxyManager.getStatus());
});

// ---------------------------------------------------------------------------
// API — Streaming proxy
// ---------------------------------------------------------------------------
app.post("/api/smuggle", async (req, res) => {
	const { targetUrl } = req.body;
	if (!targetUrl) return res.status(400).send("No targetUrl provided");
	if (!(await isSafeUrl(targetUrl)))
		return res.status(403).send("Blocked: unsafe URL target");

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 30000);

	try {
		const response = await fetch(targetUrl, { signal: controller.signal });
		clearTimeout(timeout);

		if (!response.ok) {
			return res
				.status(response.status)
				.send(`Fetch failed: ${response.statusText}`);
		}

		const contentType = response.headers.get("content-type");
		if (contentType) res.setHeader("Content-Type", contentType);
		res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
		res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

		if (response.body) {
			Readable.fromWeb(response.body).pipe(res);
		} else {
			res.status(500).send("No response body");
		}
	} catch (e) {
		clearTimeout(timeout);
		if (e.name === "AbortError") {
			res.status(504).send("Request timed out");
		} else {
			console.error("Smuggle error:", e.message);
			res.status(500).send("Internal Server Error");
		}
	}
});

// ---------------------------------------------------------------------------
// API — Backup save endpoint (server-side persistence for save files)
// ---------------------------------------------------------------------------
app.post("/api/save", async (req, res) => {
	try {
		const data = req.body.data;
		if (!data) return res.status(400).send("No data");

		const serialized = typeof data === "string" ? data : JSON.stringify(data);
		if (serialized.length > 1_000_000)
			return res.status(413).send("Data too large");

		const saveDir = join(ROOT, "backups", "users");
		
		// Use async fsp.mkdir instead of sync fs.mkdirSync
		await fsp.mkdir(saveDir, { recursive: true });

		const id = createHash("sha256")
			.update(req.ip || "unknown")
			.digest("hex")
			.slice(0, 16);
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		
		await fsp.writeFile(
			join(saveDir, `save_${id}_${timestamp}.json`),
			JSON.stringify({ data: serialized })
		);
		res.status(200).send("Saved.");
	} catch (e) {
		console.error("Save error:", e.message);
		res.status(500).send("Internal Server Error");
	}
});

// ---------------------------------------------------------------------------
// Proxy route — iframe unblocking with header stripping + <base> injection
// ---------------------------------------------------------------------------
app.get("/proxy", async (req, res) => {
	const { url: targetUrl } = req.query;
	if (!targetUrl) return res.status(400).send("No URL provided");
	if (!(await isSafeUrl(targetUrl))) return res.status(403).send("Blocked: unsafe URL");

	try {
		const response = await axios({
			method: "get",
			url: targetUrl,
			responseType: "stream",
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.9",
			},
			timeout: 10000,
			maxRedirects: 4,
			validateStatus: () => true,
		});

		const encoding = response.headers["content-encoding"];
		let contentType = (response.headers["content-type"] || "").toLowerCase();

		// Build proxy headers
		const proxyHeaders = { ...response.headers };

		// Strip security/framing headers
		delete proxyHeaders["x-frame-options"];
		delete proxyHeaders["content-security-policy"];
		delete proxyHeaders["content-security-policy-report-only"];
		delete proxyHeaders["frame-ancestors"];
		proxyHeaders["Cross-Origin-Resource-Policy"] = "cross-origin";

		// Force HTML content-type for known raw HTML hosts
		if (
			(targetUrl.includes("raw.githubusercontent.com") ||
				targetUrl.includes("cdn.jsdelivr.net")) &&
			(contentType.includes("text/plain") || !contentType)
		) {
			proxyHeaders["content-type"] = "text/html; charset=utf-8";
			contentType = "text/html";
		}

		if (contentType.includes("text/html")) {
			// Gather the stream into a buffer for modification
			let buffer = await new Promise((resolve, reject) => {
				const chunks = [];
				response.data.on("data", (chunk) => chunks.push(chunk));
				response.data.on("end", () => resolve(Buffer.concat(chunks)));
				response.data.on("error", reject);
			});

			// Decompress if needed
			if (encoding) {
				try {
					buffer = await decompress(buffer, encoding);
					delete proxyHeaders["content-encoding"];
				} catch (e) {
					console.error("[Proxy] Decompression failed:", e.message);
				}
			}

			let html = buffer.toString("utf8");
			try {
				const urlObj = new URL(targetUrl);
				const base =
					urlObj.origin +
					urlObj.pathname.substring(
						0,
						urlObj.pathname.lastIndexOf("/") + 1
					);
				const baseTag = `\n<base href="${base}">\n`;

				const headMatch = html.match(/<head[^>]*>/i);
				const htmlMatch = html.match(/<html[^>]*>/i);

				if (headMatch) {
					const at = headMatch.index + headMatch[0].length;
					html = html.slice(0, at) + baseTag + html.slice(at);
				} else if (htmlMatch) {
					const at = htmlMatch.index + htmlMatch[0].length;
					html = html.slice(0, at) + baseTag + html.slice(at);
				} else {
					html = baseTag + html;
				}

				buffer = Buffer.from(html, "utf8");
			} catch (e) {
				console.error("[Proxy] Base injection failed:", e.message);
			}

			delete proxyHeaders["content-length"];
			res.set(proxyHeaders);
			res.send(buffer);
		} else {
			// Non-HTML: pipe the stream directly with stripped headers
			delete proxyHeaders["content-encoding"];
			delete proxyHeaders["content-length"];
			res.set(proxyHeaders);
			response.data.pipe(res);
		}
	} catch (err) {
		console.error("[Proxy Error]:", err.message);
		res.status(500).send(`Proxy Error: ${err.message}`);
	}
});

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------
app.get("/health", (req, res) => {
	res.json({ status: "ok", uptime: process.uptime() });
});
app.get("/", (req, res) => res.send(cachedIndexHtml));
app.use(express.static(join(ROOT, "public")));

// 404
app.use((req, res) => {
	if (!req.url.match(/\.(js|css|png|jpg|webp|ico|wasm|json)$/)) {
		console.warn(`[404] ${req.method} ${req.url}`);
	}
		res.status(404).sendFile(join(ROOT, "public", "404.html"), (err) => {
		if (err) res.status(404).send("Not Found");
	});
});

// ---------------------------------------------------------------------------
// P2P WebRTC Signaling Placeholder
// ---------------------------------------------------------------------------
const clients = new Map();

app.post("/api/p2p/signal", (req, res) => {
	const { peerId } = req.body;
	if (peerId) {
		clients.set(peerId, { lastSeen: Date.now() });
	}
	res.status(200).json({ status: "ok", activePeers: clients.size });
});

// Periodic cleanup of stale P2P clients (older than 2 minutes)
setInterval(() => {
	const now = Date.now();
	for (const [id, data] of clients.entries()) {
		if (now - data.lastSeen > 120_000) {
			clients.delete(id);
		}
	}
}, 60_000).unref();

// ---------------------------------------------------------------------------
// HTTP + WebSocket server
// ---------------------------------------------------------------------------
const server = createServer();
const bareServer = createBareServer("/bare/");

server.on("request", (req, res) => {
	if (bareServer.shouldRoute(req)) {
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
	if (req.url.endsWith("/wisp/")) {
		wispServer.server.routeRequest(req, socket, head);
		return;
	}
	socket.end();
});

// Global Error Handler
app.use((err, req, res, next) => {
	const logLine = `[${new Date().toISOString()}] ERROR ${req.method} ${req.url}: ${err.message}\n${err.stack}\n`;
	fsp.appendFile(join(ROOT, "server.log"), logLine).catch(() => {});
	console.error("Unhandled error:", err);
	res.status(500).send("Internal Server Error");
});

let port = parseInt(PORT, 10);
if (isNaN(port)) port = 8080;

server.on("listening", () => {
	const addr = server.address();
	const mode = process.env.SITE_PASSWORD ? "AUTH MODE" : "GUEST MODE";
	
	console.log("\n==============================================");
	console.log("🚀 STRATO Initialized Successfully");
	console.log(`📡 Status: Running in ${mode}`);
	console.log(`🔗 Local:   http://localhost:${addr.port}`);
	console.log(`🔗 Network: http://${hostname()}:${addr.port}`);
	if (!process.env.SITE_PASSWORD) {
		console.log("💡 Note: No SITE_PASSWORD set. Auth required: No.");
	}
	console.log("==============================================\n");
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("\nShutting down...");
	server.close();
	process.exit(0);
}

try {
	server.listen({ port, host: "0.0.0.0" });
} catch (err) {
	console.error("Failed to start server:", err);
	process.exit(1);
}