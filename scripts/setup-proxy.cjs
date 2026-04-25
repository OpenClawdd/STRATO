/**
 * STRATO Proxy Setup — Postinstall script
 * Copies engine files from node_modules/ to public/ so they're served statically.
 * Must use .cjs because package.json has "type": "module"
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const COPIES = [
	// UV (Ultraviolet)
	["node_modules/@titaniumnetwork-dev/ultraviolet/dist/uv.bundle.js", "public/frog/uv.bundle.js"],
	["node_modules/@titaniumnetwork-dev/ultraviolet/dist/uv.handler.js", "public/frog/uv.handler.js"],
	["node_modules/@titaniumnetwork-dev/ultraviolet/dist/uv.sw.js", "public/frog/uv.sw.js"],

	// bare-mux
	["node_modules/@mercuryworkshop/bare-mux/dist/index.js", "public/frog/baremux/index.js"],
	["node_modules/@mercuryworkshop/bare-mux/dist/index.mjs", "public/frog/baremux/index.mjs"],
	["node_modules/@mercuryworkshop/bare-mux/dist/worker.js", "public/frog/baremux/worker.js"],

	// Epoxy-TLS (full = includes WASM)
	["node_modules/@mercuryworkshop/epoxy-tls/full/epoxy-bundled.js", "public/surf/epoxy/epoxy-bundled.js"],
	["node_modules/@mercuryworkshop/epoxy-tls/full/epoxy.wasm", "public/surf/epoxy/epoxy.wasm"],
	["node_modules/@mercuryworkshop/epoxy-tls/full/epoxy.js", "public/surf/epoxy/epoxy.js"],

	// Scramjet
	["node_modules/@mercuryworkshop/scramjet/dist/scramjet.bundle.js", "public/surf/scram/scramjet.bundle.js"],
	["node_modules/@mercuryworkshop/scramjet/dist/scramjet.codecs.js", "public/surf/scram/scramjet.codecs.js"],
	["node_modules/@mercuryworkshop/scramjet/dist/scramjet.worker.js", "public/surf/scram/scramjet.worker.js"],
	["node_modules/@mercuryworkshop/scramjet/dist/scramjet.client.js", "public/surf/scram/scramjet.client.js"],
];

console.log("\n🚀 STRATO Proxy Setup — Copying engine files from node_modules/ to public/\n");

let copied = 0;
let skipped = 0;
let errors = 0;

for (const [src, dest] of COPIES) {
	const srcPath = path.join(ROOT, src);
	const destPath = path.join(ROOT, dest);

	try {
		if (!fs.existsSync(srcPath)) {
			console.log(`  ⏭  ${dest} (source not found: ${src})`);
			skipped++;
			continue;
		}

		fs.mkdirSync(path.dirname(destPath), { recursive: true });
		fs.copyFileSync(srcPath, destPath);
		console.log(`  ✅ ${dest}`);
		copied++;
	} catch (err) {
		console.log(`  ❌ ${dest} — ${err.message}`);
		errors++;
	}
}

console.log(`\n📊 Results: ${copied} copied, ${skipped} skipped, ${errors} errors\n`);
