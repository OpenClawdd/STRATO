const fs = require('fs');
const path = require('path');

const INDEX_JS = `import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { hostname } from "node:os";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import fs from "node:fs";
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { authPage } from "./auth.js";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import * as wispServer from "@mercuryworkshop/wisp-js/server";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { scramjetPath } from "@mercuryworkshop/scramjet";
import { createBareServer } from "@tomphttp/bare-server-node";
import axios from "axios";
import { decompress } from "./decompress.js";
import { WebSocketServer } from "ws";

const { PORT = "8080" } = process.env;
const ROOT = process.cwd();
const syncSessions = new Map();

const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET || "strato-secret"));

app.post("/login", (req, res) => {
    res.cookie("auth", "true", { signed: true, httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.redirect("/");
});

app.use((req, res, next) => {
    if (req.signedCookies.auth === "true" || req.path === "/login" || req.path.startsWith("/uv/") || req.path.startsWith("/surf/")) return next();
    res.send(authPage);
});

app.use("/uv/", express.static(uvPath));
app.use("/surf/scram/", express.static(scramjetPath));
app.use(express.static(join(ROOT, "public")));

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
    if (req.url === "/sync") {
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    } else if (req.url.endsWith("/wisp/")) {
        wispServer.server.routeRequest(req, socket, head);
    }
});

wss.on("connection", (ws) => {
    ws.on("message", (data) => {
        try {
            const msg = JSON.parse(data);
            if (msg.type === "host") {
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                syncSessions.set(code, { host: ws, offer: msg.sdp });
                ws.send(JSON.stringify({ type: "registered", code }));
            } else if (msg.type === "join") {
                const s = syncSessions.get(msg.code);
                if (s) { s.joiner = ws; ws.send(JSON.stringify({ type: "offer", sdp: s.offer })); }
            }
        } catch (e) {}
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("\n◆ STRATO APEX ONLINE");
    console.log("◆ Local: http://localhost:" + PORT);
});
`;

const SYNC_JS = `const StratoSync=(()=>{
    const $=s=>document.querySelector(s);
    let ws, pc, code;
    async function host(){
        ws = new WebSocket((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/sync');
        pc = new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
        const ch = pc.createDataChannel('strato-sync');
        ch.onopen = () => ch.send(JSON.stringify({vault: localStorage.getItem('strato-notes')}));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.onopen = () => ws.send(JSON.stringify({type:'host', sdp:offer}));
        ws.onmessage = e => {
            const m = JSON.parse(e.data);
            if(m.type==='registered') {
                $('#sync-code-display').textContent = m.code;
                $('#sync-code-display').classList.add('sync-code-visible');
            }
        };
    }
    return { init(){ $('#sync-generate-btn')?.addEventListener('click', host); } };
})();
StratoSync.init();`;

fs.writeFileSync('src/index.js', INDEX_JS);
fs.writeFileSync('public/strato-sync.js', SYNC_JS);
console.log('✅ STRATO files reconstructed and deduplicated.');
