import { join } from "node:path";
import { hostname } from "node:os";
import { createServer } from "node:http";
import express from "express";
import cookieParser from "cookie-parser";
import wisp from "wisp-server-node";

import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";


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
    if (req.method === 'POST' && req.body.password) {
        if (req.body.password === PASSWORD) {
            res.cookie('auth', PASSWORD, { maxAge: 1000 * 60 * 60 * 24 * 365, httpOnly: true });
            return res.redirect('/');
        } else {
            return res.send(authPage("Incorrect password."));
        }
    }

    // Otherwise show the auth page
    return res.send(authPage(""));
});

function authPage(errorMsg) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Restricted</title>
        <style>
            body { background: #121212; color: #fff; font-family: 'Nunito', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .login-box { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.2); text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            input { padding: 10px; margin: 10px 0; border-radius: 8px; border: 1px solid #444; background: #222; color: #fff; width: 100%; box-sizing: border-box;}
            button { padding: 10px 20px; border-radius: 8px; border: none; background: #00a8ff; color: #fff; font-weight: bold; cursor: pointer; width: 100%; margin-top: 10px;}
            button:hover { background: #0088cc; }
            .error { color: #ff4a4a; font-size: 14px; margin-bottom: 10px;}
            p { font-size: 14px; color: #aaa; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2>Who created this site?</h2>
            <p>(hint: first name, all lowercase)</p>
            ${errorMsg ? `<div class="error">${errorMsg}</div>` : ''}
            <form method="POST">
                <input type="password" name="password" required autofocus autocomplete="off">
                <button type="submit">Unlock</button>
            </form>
        </div>
    </body>
    </html>
    `;
}

// Load our publicPath first and prioritize it over UV.
app.use(express.static("./public"));
// Load vendor files last.
// The vendor's uv.config.js won't conflict with our uv.config.js inside the publicPath directory.
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));

// Error for everything else
app.use((req, res) => {
	res.status(404);
	res.sendFile("./public/404.html");
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
