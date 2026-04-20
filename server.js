import express from "express";
import axios from "axios";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { promisify } from "node:util";

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

const app = express();
const PORT = process.env.PORT || 8080;
const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Serve public directory statically
app.use(express.static(join(__dirname, "public")));

/**
 * Decompresses a buffer based on the Content-Encoding header
 */
async function decompress(buffer, encoding) {
	if (encoding === "gzip") return gunzip(buffer);
	if (encoding === "deflate") return inflate(buffer);
	if (encoding === "br") return brotliDecompress(buffer);
	return buffer;
}

/**
 * Proxy route to bypass iframe restrictions (X-Frame-Options, CSP)
 * usage: /proxy?url=https://example.com
 */
app.get("/proxy", async (req, res) => {
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
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.9",
			},
			timeout: 15000,
			maxRedirects: 5,
			validateStatus: () => true,
		});

		const encoding = response.headers["content-encoding"];
		const contentType = response.headers["content-type"] || "";
		let buffer = response.data;

		// Phase 3.3: Handle compression correctly
		if (encoding) {
			try {
				buffer = await decompress(buffer, encoding);
			} catch (err) {
				console.error("[STRATO Proxy] Decompression error:", err.message);
			}
		}

		// Inject <base> tag to fix relative asset paths (CSS, JS, Images)
		if (contentType.includes("text/html")) {
			let html = buffer.toString("utf8");
			try {
				const urlObj = new URL(targetUrl);
				const origin =
					urlObj.origin +
					urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf("/") + 1);
				const baseTag = `\n<base href="${origin}">\n`;

				const headMatch = html.match(/<head[^>]*>/i);
				const htmlMatch = html.match(/<html[^>]*>/i);

				if (headMatch) {
					const insertAt = headMatch.index + headMatch[0].length;
					html = html.slice(0, insertAt) + baseTag + html.slice(insertAt);
				} else if (htmlMatch) {
					const insertAt = htmlMatch.index + htmlMatch[0].length;
					html = html.slice(0, insertAt) + baseTag + html.slice(insertAt);
				} else {
					html = baseTag + html;
				}

				buffer = Buffer.from(html, "utf8");
				process.stdout.write(
					`[PROXY SUCCESS] Injected <base> into ${targetUrl}\n`
				);
			} catch (e) {
				console.error("[PROXY FAILURE] Injection failed:", e.message);
			}
		}

		// Copy original headers but delete restrictive ones
		const proxyHeaders = { ...response.headers };
		delete proxyHeaders["x-frame-options"];
		delete proxyHeaders["content-security-policy"];
		delete proxyHeaders["content-security-policy-report-only"];
		delete proxyHeaders["frame-ancestors"];
		delete proxyHeaders["content-encoding"]; // We send decompressed
		delete proxyHeaders["content-length"];

		proxyHeaders["Access-Control-Allow-Origin"] = "*";
		proxyHeaders["Cross-Origin-Resource-Policy"] = "cross-origin";

		res.set(proxyHeaders);
		res.send(buffer);
	} catch (err) {
		console.error("[STRATO Proxy Error]:", err.message);
		res.status(500).send(`Proxy Error: ${err.message}`);
	}
});

app.listen(PORT, () => {
	console.log(`\n🚀 STRATO Arcade Proxy (Phase 3.3)`);
	console.log(`📡 Local server: http://localhost:${PORT}`);
	console.log(`📂 Static Root: ${join(__dirname, "public")}\n`);
});
