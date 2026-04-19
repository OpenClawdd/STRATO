import { join } from "node:path";
import { hostname } from "node:os";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import fs from "node:fs";
import "dotenv/config";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import * as wispServer from "@mercuryworkshop/wisp-js/server";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { scramjetPath } from "@mercuryworkshop/scramjet";
import { createBareServer } from "@tomphttp/bare-server-node";
import axios from "axios";
import zlib from "node:zlib";
import { promisify } from "node:util";

// ---------------------------------------------------------------------------
// Shared decompression utilities
// ---------------------------------------------------------------------------
const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

async function decompress(buffer, encoding) {
	if (encoding === "gzip") return gunzip(buffer);
	if (encoding === "deflate") return inflate(buffer);
	if (encoding === "br") return brotliDecompress(buffer);
	return buffer;
}

// ---------------------------------------------------------------------------
// SSRF Guard — block requests to loopback, RFC-1918, link-local, metadata
// ---------------------------------------------------------------------------
function isSafeUrl(rawUrl) {
	try {
		const { hostname: host, protocol } = new URL(rawUrl);
		if (!["http:", "https:"].includes(protocol)) return false;

		// Block all private / reserved address ranges
		const BLOCKED = /^(
			localhost |
			127\. |
			0\. |
			10\. |
			172\.(1[6-9]|2\d|3[01])\. |
			192\.168\. |
			169\.254\. |      # link-local / AWS metadata
			::1 |
			fc[0-9a-f][0-9a-f]? |  # ULA IPv6
			fd[0-9a-f][0-9a-f]?    # ULA IPv6
		)/ix;

		// Strip IPv6 brackets
		const bare = host.startsWith("[") ? host.slice(1, -1) : host;
		return !BLOCKED.test(bare);
	} catch {
		return false;
	}
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const { PORT = "8080" } = process.env;
const ROOT = process.cwd();

// Pre-load index.html
let cachedIndexHtml = "";
function refreshCache() {
	try {
		cachedIndexHtml = fs.readFileSync(join(ROOT, "public", "index.html"), "utf8");
	} catch (e) {
		console.error("Failed to read index.html:", e.message);
		cachedIndexHtml = "<h1>STRATO — index.html not found</h1>";
	}
}
refreshCache();
// Refresh every 2 minutes in case of hot-deploy
setInterval(refreshCache, 120_000);

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

// -- Security headers -------------------------------------------------------
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				// 'unsafe-eval' + 'unsafe-inline' needed: UV/Scramjet inject runtime scripts
				scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", "blob:", "data:"],
				scriptSrcAttr: ["'self'", "'unsafe-inline'"],
				frameSrc: ["'self'", "blob:", "https:", "http:"],
				connectSrc: ["'self'", "https:", "wss:", "ws:", "blob:", "data:"],
				imgSrc: ["'self'", "data:", "blob:", "https:", "http:", "cdn.jsdelivr.net"],
				mediaSrc: ["'self'", "data:", "blob:", "https:", "http:"],
				styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "cdn.jsdelivr.net"],
				fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
				workerSrc: ["'self'", "blob:", "data:"],
			},
		},
		crossOriginEmbedderPolicy: false,
	})
);

// ---------------------------------------------------------------------------
// Proxy module static assets
// ---------------------------------------------------------------------------
app.get("/uv/uv.config.js", (req, res) => res.sendFile(join(ROOT, "public", "uv", "uv.config.js")));
app.get("/uv/sw.js",         (req, res) => res.sendFile(join(ROOT, "public", "uv", "sw.js")));
app.use("/uv/", express.static(uvPath));

const scramjetPrefix = "/surf/scram/";
app.use(scramjetPrefix, express.static(scramjetPath));
app.get(`${scramjetPrefix}scramjet.config.js`, (req, res) =>
	res.sendFile(join(ROOT, "public", "scramjet.config.js"))
);

app.use("/surf/baremux/", express.static(join(ROOT, "node_modules", "@mercuryworkshop", "bare-mux", "dist")));
app.use(
	"/surf/epoxy/",
	express.static(join(ROOT, "node_modules", "@mercuryworkshop", "epoxy-tls", "full"), {
		setHeaders(res, filePath) {
			if (filePath.endsWith(".js"))   res.setHeader("Content-Type", "application/javascript");
			if (filePath.endsWith(".wasm")) res.setHeader("Content-Type", "application/wasm");
		},
	})
);

app.use("/config", express.static(join(ROOT, "config")));

// -- Compression ------------------------------------------------------------
app.use(
	compression({
		filter: (req, res) => req.path === "/api/smuggle" ? false : compression.filter(req, res),
	})
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" })); // reduced from 50mb — no legit save needs 50MB

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------
const smuggleLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 30,
	message: "Too many requests. Please slow down.",
	standardHeaders: true,
	legacyHeaders: false,
});

const saveLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	message: "Save rate limit exceeded.",
	standardHeaders: true,
	legacyHeaders: false,
});

app.use("/api/smuggle", smuggleLimiter);
app.use("/api/save", saveLimiter);

// ---------------------------------------------------------------------------
// API — Streaming proxy
// ---------------------------------------------------------------------------
app.post("/api/smuggle", async (req, res) => {
	const { targetUrl } = req.body;
	if (!targetUrl) return res.status(400).send("No targetUrl provided");
	if (!isSafeUrl(targetUrl)) return res.status(403).send("Blocked: unsafe URL target");

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 30000);

	try {
		const response = await fetch(targetUrl, { signal: controller.signal });
		clearTimeout(timeout);

		if (!response.ok) {
			return res.status(response.status).send(`Fetch failed: ${response.statusText}`);
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
app.post("/api/save", (req, res) => {
	try {
		const data = req.body.data;
		if (!data) return res.status(400).send("No data");

		// Basic sanity: data must be string or object, max 1MB
		const serialized = typeof data === "string" ? data : JSON.stringify(data);
		if (serialized.length > 1_000_000) return res.status(413).send("Data too large");

		const saveDir = join(ROOT, "backups", "users");
		if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

		// Hash the IP so filenames aren't guessable and IPv6 is handled cleanly
		const id = createHash("sha256").update(req.ip || "unknown").digest("hex").slice(0, 16);
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		fs.writeFileSync(join(saveDir, `save_${id}_${timestamp}.json`), JSON.stringify({ data: serialized }));
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
	if (!isSafeUrl(targetUrl)) return res.status(403).send("Blocked: unsafe URL");

	try {
		const response = await axios({
			method: "get",
			url: targetUrl,
			responseType: "arraybuffer",
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

		// Declare all variables before use
		const encoding    = response.headers["content-encoding"];
		let   contentType = (response.headers["content-type"] || "").toLowerCase();
		let   buffer      = response.data;

		// Build proxy headers early so we can mutate content-type if needed
		const proxyHeaders = { ...response.headers };

		// Force HTML content-type for known raw HTML hosts
		if (
			(targetUrl.includes("raw.githubusercontent.com") || targetUrl.includes("cdn.jsdelivr.net")) &&
			(contentType.includes("text/plain") || !contentType)
		) {
			proxyHeaders["content-type"] = "text/html; charset=utf-8";
			contentType = "text/html";
		}

		// Decompress if needed
		if (encoding) {
			try {
				buffer = await decompress(buffer, encoding);
			} catch (e) {
				console.error("[Proxy] Decompression failed:", e.message);
			}
		}

		// Inject <base href> so relative assets resolve correctly
		if (contentType.includes("text/html")) {
			let html = buffer.toString("utf8");
			try {
				const urlObj = new URL(targetUrl);
				const base =
					urlObj.origin + urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf("/") + 1);
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
		}

		// Strip security/framing headers
		delete proxyHeaders["x-frame-options"];
		delete proxyHeaders["content-security-policy"];
		delete proxyHeaders["content-security-policy-report-only"];
		delete proxyHeaders["frame-ancestors"];
		delete proxyHeaders["content-encoding"];  // we decoded it
		delete proxyHeaders["content-length"];     // length changed

		proxyHeaders["Access-Control-Allow-Origin"] = "*";
		proxyHeaders["Cross-Origin-Resource-Policy"] = "cross-origin";

		res.set(proxyHeaders);
		res.send(buffer);
	} catch (err) {
		console.error("[Proxy Error]:", err.message);
		res.status(500).send(`Proxy Error: ${err.message}`);
	}
});

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------
app.get("/", (req, res) => res.send(cachedIndexHtml));
app.use(express.static(join(ROOT, "public")));

// 404
app.use((req, res) => {
	// Only 404 non-file requests to avoid spamming logs with asset misses
	if (!req.url.match(/\.(js|css|png|jpg|webp|ico|wasm|json)$/)) {
		console.warn(`[404] ${req.method} ${req.url}`);
	}
	res.status(404).sendFile(join(ROOT, "public", "404.html")).catch(() => {
		res.status(404).send("Not Found");
	});
});

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
	res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
	res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
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

let port = parseInt(PORT, 10);
if (isNaN(port)) port = 8080;

server.on("listening", () => {
	const addr = server.address();
	console.log("\n◆ STRATO Server Online");
	console.log(`  http://localhost:${addr.port}`);
	console.log(`  http://${hostname()}:${addr.port}\n`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("\nShutting down...");
	server.close();
	process.exit(0);
}

server.listen({ port, host: "0.0.0.0" });
