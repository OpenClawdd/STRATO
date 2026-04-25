import express from "express";
import { join } from "node:path";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { scramjetPath } from "@mercuryworkshop/scramjet";
import axios from "axios";
import { decompress } from "../decompress.js";

const router = express.Router();
const ROOT = process.cwd();

const staticConfig = {
	setHeaders(res, filePath) {
		if (filePath.endsWith(".js") || filePath.endsWith(".mjs"))
			res.setHeader("Content-Type", "application/javascript");
		if (filePath.endsWith(".wasm"))
			res.setHeader("Content-Type", "application/wasm");
	},
};

// Ultraviolet
router.use("/frog/", express.static(uvPath, staticConfig));
router.get("/frog/uv.config.js", (req, res) => res.sendFile(join(ROOT, "public", "frog", "uv.config.js")));
router.get("/frog/sw.js", (req, res) => res.sendFile(join(ROOT, "public", "frog", "sw.js")));

// Scramjet
const scramjetPrefix = "/surf/scram/";
router.use(scramjetPrefix, express.static(scramjetPath, staticConfig));
router.get(`${scramjetPrefix}scramjet.config.js`, (req, res) => res.sendFile(join(ROOT, "public", "scramjet.config.js")));
router.get("/scramjet/codecs.js", (req, res) => res.sendFile(join(ROOT, "node_modules", "@mercuryworkshop", "scramjet", "dist", "scramjet.codecs.js")));

// Bare-mux & Epoxy
router.use("/frog/baremux/", express.static(join(ROOT, "node_modules", "@mercuryworkshop", "bare-mux", "dist"), staticConfig));
router.use("/surf/baremux/", express.static(join(ROOT, "node_modules", "@mercuryworkshop", "bare-mux", "dist"), staticConfig));
router.use("/surf/epoxy/", express.static(join(ROOT, "node_modules", "@mercuryworkshop", "epoxy-tls", "full"), staticConfig));

/**
 * Iframe Unblocking Proxy — Server-Side Fallback
 *
 * This is used when the UV/Scramjet service worker proxy fails.
 * It fetches the target URL server-side and rewrites HTML to make
 * resource URLs absolute, strips blocking headers, and serves the content.
 */
router.get("/proxy", async (req, res) => {
	const { url: targetUrl } = req.query;
	if (!targetUrl) return res.status(400).send("No URL provided");

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
			},
			timeout: 15000,
			validateStatus: () => true,
			maxRedirects: 5,
		});

		// Build clean response headers
		const contentType = response.headers["content-type"] || "";
		const proxyHeaders = {};

		// Only forward safe headers
		const safeHeaders = [
			"content-type",
			"content-length",
			"content-encoding",
			"cache-control",
			"last-modified",
			"etag",
		];
		for (const h of safeHeaders) {
			if (response.headers[h]) proxyHeaders[h] = response.headers[h];
		}

		// Strip all blocking headers
		delete proxyHeaders["x-frame-options"];
		delete proxyHeaders["content-security-policy"];
		delete proxyHeaders["content-security-policy-report-only"];
		delete proxyHeaders["cross-origin-opener-policy"];
		delete proxyHeaders["cross-origin-embedder-policy"];

		// Allow iframe embedding and cross-origin resource loading
		proxyHeaders["Cross-Origin-Resource-Policy"] = "cross-origin";
		proxyHeaders["Access-Control-Allow-Origin"] = "*";
		proxyHeaders["Access-Control-Allow-Methods"] = "GET, OPTIONS";
		proxyHeaders["Access-Control-Allow-Headers"] = "*";

		res.set(proxyHeaders);

		// If HTML, rewrite relative URLs to absolute
		if (contentType.includes("text/html")) {
			let html = response.data.toString("utf-8");
			const base = new URL(targetUrl);
			const origin = base.origin;
			const dir = base.href.substring(0, base.href.lastIndexOf("/") + 1);

			// Rewrite relative URLs to absolute
			html = html.replace(/(src|href|action)=["'](?!(?:https?:|data:|blob:|javascript:|\/\/|#|mailto:))([^"']+)["']/gi,
				(match, attr, path) => {
					let absolute;
					if (path.startsWith("/")) {
						absolute = origin + path;
					} else {
						absolute = dir + path;
					}
					return `${attr}="${absolute}"`;
				}
			);

			// Add <base> tag for any URLs we missed
			if (!html.includes("<base ")) {
				html = html.replace(/<head([^>]*)>/i, `<base href="${base.href}" target="_blank"><head$1>`);
			}

			return res.send(html);
		}

		// For non-HTML content, pass through as-is
		return res.send(response.data);
	} catch (err) {
		console.error("[STRATO Proxy] Error fetching:", targetUrl, err.message);

		// Return a user-friendly error page instead of raw error
		res.status(502).set("Content-Type", "text/html").send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>STRATO — Proxy Error</title>
<style>
  body { background: #0a0a0f; color: #e0e0e0; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .error-box { text-align: center; padding: 2rem; max-width: 400px; }
  .error-box h2 { color: #ff6b6b; margin-bottom: 1rem; }
  .error-box p { color: #888; font-size: 0.9rem; line-height: 1.5; }
  .error-box button { margin-top: 1.5rem; padding: 0.5rem 1.5rem; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; }
  .error-box button:hover { background: #6366f1; }
</style></head><body>
<div class="error-box">
  <h2>Proxy Error</h2>
  <p>Could not load this game through the proxy. The site may be down or blocking requests.</p>
  <p style="font-size:0.75rem;color:#555;">${err.message}</p>
  <button onclick="window.parent?.StratoGameEngine?.close()">Close</button>
</div>
</body></html>`);
	}
});

export default router;
