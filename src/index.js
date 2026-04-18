import { join, resolve } from "node:path";
import { hostname } from "node:os";
import { createServer } from "node:http";
import { Readable } from "node:stream";
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

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const { PORT = "8080" } = process.env;

// ---------------------------------------------------------------------------
// Resolve project root (CWD)
// ---------------------------------------------------------------------------
const ROOT = process.cwd();

// Pre-load & cache index.html
let cachedIndexHtml = "";
function refreshCache() {
	try {
		cachedIndexHtml = fs.readFileSync(join(ROOT, "public", "index.html"), "utf8");
	} catch (e) {
		console.error("Failed to cache index.html:", e.message);
		cachedIndexHtml = "<h1>STRATO — index.html not found</h1>";
	}
}
refreshCache();
setInterval(refreshCache, 60_000);

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
				scriptSrc: ["'self'", "'unsafe-eval'", "blob:", "data:"],
				scriptSrcAttr: ["'none'"],
				frameSrc: ["'self'", "blob:", "https:", "http:"],
				connectSrc: ["'self'", "https:", "wss:", "ws:", "blob:", "data:"],
				imgSrc: ["'self'", "data:", "blob:", "https:"],
				styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
				fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
				workerSrc: ["'self'", "blob:"],
			},
		},
		crossOriginEmbedderPolicy: false,
	})
);

// ---------------------------------------------------------------------------
// Static Assets — Proxy Modules
// ---------------------------------------------------------------------------

// Ultraviolet
app.use("/uv/", express.static(uvPath));

// Scramjet — uses the official export path
app.use("/surf/scram/", express.static(scramjetPath));

// Bare-Mux
app.use(
	"/surf/baremux/",
	express.static(join(ROOT, "node_modules", "@mercuryworkshop", "bare-mux", "dist"))
);

// Epoxy Transport — serves full bundle (ESM) + wasm
app.use(
	"/surf/epoxy/",
	express.static(
		join(ROOT, "node_modules", "@mercuryworkshop", "epoxy-tls", "full"),
		{
			setHeaders(res, filePath) {
				if (filePath.endsWith(".js")) {
					res.setHeader("Content-Type", "application/javascript");
				}
				if (filePath.endsWith(".wasm")) {
					res.setHeader("Content-Type", "application/wasm");
				}
			},
		}
	)
);

// Game config
app.use("/config", express.static(join(ROOT, "config")));

// -- Compression ------------------------------------------------------------
app.use(
	compression({
		filter: (req, res) => {
			if (req.path === "/api/smuggle") return false;
			return compression.filter(req, res);
		},
	})
);

app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------
const smuggleLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 30,
	message: "Too many smuggle requests. Please slow down.",
	standardHeaders: true,
	legacyHeaders: false,
});

app.use(express.json({ limit: "50mb" }));
app.use("/api/smuggle", smuggleLimiter);

// ---------------------------------------------------------------------------
// NO AUTH — direct access
// ---------------------------------------------------------------------------

// /api/smuggle — Streaming pipeline
app.post("/api/smuggle", async (req, res) => {
	const { targetUrl } = req.body;
	if (!targetUrl) return res.status(400).send("No targetUrl provided");

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 30000);

	try {
		const response = await fetch(targetUrl, { signal: controller.signal });
		clearTimeout(timeout);

		if (!response.ok) {
			return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
		}

		const contentType = response.headers.get("content-type");
		if (contentType) res.setHeader("Content-Type", contentType);
		res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
		res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

		if (response.body) {
			Readable.fromWeb(response.body).pipe(res);
		} else {
			res.status(500).send("No response body to stream");
		}
	} catch (e) {
		clearTimeout(timeout);
		if (e.name === "AbortError") {
			res.status(504).send("Fetch timed out");
		} else {
			console.error("Smuggle fetch failed:", e);
			res.status(500).send("Internal Server Error");
		}
	}
});

// /api/save — Backup endpoint
app.post("/api/save", (req, res) => {
	try {
		const data = req.body.data;
		if (!data) return res.status(400).send("No data provided");

		const saveDir = join(ROOT, "backups", "users");
		if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

		const id = req.ip.replace(/[^a-zA-Z0-9]/g, "_") || Date.now().toString();
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		fs.writeFileSync(join(saveDir, `save_${id}_${timestamp}.json`), JSON.stringify({ data }));
		res.status(200).send("Save backed up.");
	} catch (e) {
		console.error("Save failed:", e);
		res.status(500).send("Internal Server Error");
	}
});

// Homepage
app.get("/", (req, res) => {
	res.send(cachedIndexHtml);
});

// Static public folder
app.use(express.static(join(ROOT, "public")));

// 404 fallback
app.use((req, res) => {
	res.status(404).send("STRATO Error: Could not find " + req.url);
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
	const address = server.address();
	console.log("STRATO listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("Shutting down...");
	server.close();
	process.exit(0);
}

server.listen({ port, host: "0.0.0.0" });
