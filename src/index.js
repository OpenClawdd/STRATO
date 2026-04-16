import { join, resolve } from "node:path";
import { hostname } from "node:os";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import fs from "node:fs";
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import * as wispServer from "@mercuryworkshop/wisp-js/server";

// ---------------------------------------------------------------------------
// Configuration (loaded from .env via dotenv)
// ---------------------------------------------------------------------------
const {
        SITE_PASSWORD = "changeme",
        COOKIE_SECRET = "change_this_to_a_long_random_string",
        PORT = "8080",
        SECURE_COOKIES = "false",
} = process.env;

const isSecure = SECURE_COOKIES === "true";

// ---------------------------------------------------------------------------
// Pre-load & cache index.html and games.json (no readFileSync per request)
// ---------------------------------------------------------------------------
const __dirname = resolve(".");
let cachedIndexHtml = "";
let cachedGamesJson = "[]";

function refreshCache() {
        try {
                cachedIndexHtml = fs.readFileSync(join(__dirname, "public", "index.html"), "utf8");
        } catch (e) {
                console.error("Failed to cache index.html:", e.message);
                cachedIndexHtml = "<h1>STRATO — index.html not found</h1>";
        }

        try {
                cachedGamesJson = fs.readFileSync(join(__dirname, "config", "games.json"), "utf8");
        } catch (e) {
                console.warn("Could not read config/games.json — returning empty games list.");
                cachedGamesJson = "[]";
        }
}

// Cache immediately on boot, then refresh every 60 seconds
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
                                connectSrc: ["'self'", "blob:", "data:", "https:", "wss:"],
                                frameSrc: ["'self'", "blob:", "https:"],
                                scriptSrc: ["'self'", "blob:", "'unsafe-inline'", "'unsafe-eval'"],
                                styleSrc: ["'self'", "'unsafe-inline'", "https:"],
                                imgSrc: ["'self'", "data:", "blob:", "https:"],
                                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                                workerSrc: ["'self'", "blob:"],
                        },
                },
        })
);

// -- Compression (gzip / brotli) --------------------------------------------
app.use(
        compression({
                filter: (req, res) => {
                        if (req.path === "/api/smuggle") return false;
                        return compression.filter(req, res);
                },
        })
);

app.use(cookieParser(COOKIE_SECRET));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------
const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: "Too many requests. Please slow down.",
        standardHeaders: true,
        legacyHeaders: false,
});

// ---------------------------------------------------------------------------
// Body parser
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "50mb" }));

app.use("/api/save", apiLimiter);

// ---------------------------------------------------------------------------
// /api/smuggle — Streaming pipeline for bypassing firewalls
// ---------------------------------------------------------------------------
app.post("/api/smuggle", async (req, res) => {
        const { targetUrl } = req.body;
        if (!targetUrl) {
                return res.status(400).send("No targetUrl provided");
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

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
                        console.error("Smuggle fetch timed out:", targetUrl);
                        res.status(504).send("Fetch timed out");
                } else {
                        console.error("Smuggle fetch failed:", e);
                        res.status(500).send("Internal Server Error");
                }
        }
});

// ---------------------------------------------------------------------------
// /api/save — Backup endpoint
// ---------------------------------------------------------------------------
app.post("/api/save", (req, res) => {
        try {
                const data = req.body.data;
                if (!data) return res.status(400).send("No data provided");

                const saveDir = join(process.cwd(), "backups", "users");
                if (!fs.existsSync(saveDir)) {
                        fs.mkdirSync(saveDir, { recursive: true });
                }

                const id = req.ip.replace(/[^a-zA-Z0-9]/g, "_") || Date.now().toString();
                const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
                const filename = `save_${id}_${timestamp}.json`;

                fs.writeFileSync(join(saveDir, filename), JSON.stringify({ data }));
                res.status(200).send("Save backed up successfully.");
        } catch (e) {
                console.error("Failed to backup save", e);
                res.status(500).send("Internal Server Error");
        }
});

// ---------------------------------------------------------------------------
// Homepage — inject games config from cache
// ---------------------------------------------------------------------------
app.get("/", (req, res) => {
        const indexHtml = cachedIndexHtml.replace(
                "const GAMES = window.__GAMES__ || [];",
                `const GAMES = ${cachedGamesJson};`
        );
        res.send(indexHtml);
});

// Force the server to look in the exact absolute path for the public folder
app.use(express.static(process.cwd() + '/public'));

// Bulletproof 404 fallback so the server never crashes
app.use((req, res) => {
        res.status(404).send("STRATO Error: Could not find " + req.url);
});

// ---------------------------------------------------------------------------
// HTTP + WebSocket server
// ---------------------------------------------------------------------------
const server = createServer();

server.on("request", (req, res) => {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
        app(req, res);
});

server.on("upgrade", (req, socket, head) => {
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
        console.log("Listening on:");
        console.log(`\thttp://localhost:${address.port}`);
        console.log(`\thttp://${hostname()}:${address.port}`);
        console.log(
                `\thttp://${address.family === "IPv6" ? `[${address.address}]` : address.address
                }:${address.port}`
        );
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
        console.log("SIGTERM signal received: closing HTTP server");
        server.close();
        process.exit(0);
}

server.listen({
        port,
        host: "0.0.0.0",
});