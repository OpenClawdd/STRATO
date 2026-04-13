import { join } from "node:path";
import { hostname } from "node:os";
import { createServer } from "node:http";
import express from "express";
import cookieParser from "cookie-parser";
import wisp from "wisp-server-node";

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

// Load our publicPath first and prioritize it over UV.
app.use(express.static("./public"));

// Error for everything else
app.use((req, res) => {
	res.status(404);
	res.sendFile(join(process.cwd(), "public", "404.html"));
});

const server = createServer();

server.on("request", (req, res) => {
	res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
	res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
	app(req, res);
});
server.on("upgrade", (req, socket, head) => {
	if (req.url.endsWith("/wisp/")) {
		wisp.routeRequest(req, socket, head);
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
