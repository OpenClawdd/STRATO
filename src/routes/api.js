import express from "express";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { promises as fsp } from "node:fs";
import axios from "axios";
import { proxyManager } from "../proxy-manager.js";
import { decompress } from "../decompress.js";

const router = express.Router();
const ROOT = process.cwd();

// SSRF Guard
async function isSafeUrl(rawUrl) {
	try {
		const { hostname: host, protocol } = new URL(rawUrl);
		if (!["http:", "https:"].includes(protocol)) return false;

		const BLOCKED_REGEX =
			/^(localhost|127\.|0\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1|fc[0-9a-f][0-9a-f]?|fd[0-9a-f][0-9a-f]?)/i;

		const bare = host.startsWith("[") ? host.slice(1, -1) : host;
		if (BLOCKED_REGEX.test(bare)) return false;
		return true;
	} catch {
		return false;
	}
}

// API — Proxy Status
router.get("/proxy-status", (req, res) => {
	res.json(proxyManager.getStatus());
});

// API — Streaming proxy (smuggle)
router.post("/smuggle", async (req, res) => {
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
		res.status(500).send("Internal Server Error");
	}
});

// API — Save endpoint
router.post("/save", async (req, res) => {
	try {
		const data = req.body.data;
		if (!data) return res.status(400).send("No data");

		const serialized = typeof data === "string" ? data : JSON.stringify(data);
		if (serialized.length > 1_000_000)
			return res.status(413).send("Data too large");

		const saveDir = join(ROOT, "backups", "users");
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
		res.status(500).send("Internal Server Error");
	}
});

// P2P Signaling
const clients = new Map();
router.post("/p2p/signal", (req, res) => {
	const { peerId } = req.body;
	if (peerId) {
		clients.set(peerId, { lastSeen: Date.now() });
	}
	res.status(200).json({ status: "ok", activePeers: clients.size });
});

// Cleanup stale peers
setInterval(() => {
	const now = Date.now();
	for (const [id, data] of clients.entries()) {
		if (now - data.lastSeen > 120_000) clients.delete(id);
	}
}, 60_000).unref();

export default router;
