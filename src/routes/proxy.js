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

// Iframe Unblocking Proxy
router.get("/proxy", async (req, res) => {
	const { url: targetUrl } = req.query;
	if (!targetUrl) return res.status(400).send("No URL provided");

	try {
		const response = await axios({
			method: "get",
			url: targetUrl,
			responseType: "stream",
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
			},
			timeout: 10000,
			validateStatus: () => true,
		});

		const proxyHeaders = { ...response.headers };
		delete proxyHeaders["x-frame-options"];
		delete proxyHeaders["content-security-policy"];
		proxyHeaders["Cross-Origin-Resource-Policy"] = "cross-origin";

		res.set(proxyHeaders);
		response.data.pipe(res);
	} catch (err) {
		res.status(500).send(`Proxy Error: ${err.message}`);
	}
});

export default router;
