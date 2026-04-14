import { join } from "node:path";
import { hostname } from "node:os";
import { createServer } from "node:http";
import fs from "node:fs";
import express from "express";
import cookieParser from "cookie-parser";
import * as wispServer from "@mercuryworkshop/wisp-js/server";

import { authPage } from "./auth.js";

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const PASSWORD = "noah";

app.use((req, res, next) => {
	// If they have the cookie, let them through
	if (req.cookies.auth === PASSWORD) {
		return next();
	}

	// If they are submitting the form
	if (req.method === "POST" && req.body.password) {
		if (req.body.password === PASSWORD) {
			res.cookie("auth", PASSWORD, {
				maxAge: 1000 * 60 * 60 * 24 * 365,
				httpOnly: true,
				secure: true,
				sameSite: "strict",
			});
			return res.redirect("/");
		} else {
			return res.send(authPage("Incorrect password."));
		}
	}

	// Otherwise show the auth page
	return res.send(authPage(""));
});

app.use(express.json({ limit: "50mb" }));

import { Readable } from "node:stream";

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

		// Forward headers but strip CORS and set COEP/COOP
		const contentType = response.headers.get("content-type");
		if (contentType) res.setHeader("Content-Type", contentType);

		res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
		res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

		// Stream the response directly to avoid buffering in RAM
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

app.post("/api/save", (req, res) => {
	try {
		const data = req.body.data;
		if (!data) return res.status(400).send("No data provided");

		const saveDir = join(process.cwd(), "backups", "users");
		if (!fs.existsSync(saveDir)) {
			fs.mkdirSync(saveDir, { recursive: true });
		}

		// Use IP or simple random ID for the save file name
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

app.get("/", (req, res) => {
	let indexHtml = fs.readFileSync("./public/index.html", "utf8");
	let gamesData = "[]";
	try {
		gamesData = fs.readFileSync("./config/games.json", "utf8");
	} catch (e) {
		console.warn("Could not read games config, returning empty array");
	}
	indexHtml = indexHtml.replace(
		"const GAMES = window.__GAMES__ || [];",
		`const GAMES = ${gamesData};`
	);
	res.send(indexHtml);
});

// Load our publicPath first
app.use(express.static("./public"));

// Error for everything else
app.use((req, res) => {
	res.status(404);
	res.sendFile("./public/404.html");
});

const server = createServer();

server.on("request", (req, res) => {
	res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
	// Use credentialless to allow the smuggler to work, as directed
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

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8080;

server.on("listening", () => {
	const address = server.address();

	// by default we are listening on 0.0.0.0 (every interface)
	// we just need to list a few
	console.log("Listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
	console.log(
		`\thttp://${
			address.family === "IPv6" ? `[${address.address}]` : address.address
		}:${address.port}`
	);
});

// https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html
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
