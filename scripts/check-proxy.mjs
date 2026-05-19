import fs from "node:fs";

const BASE = process.env.STRATO_BASE || "http://localhost:8080";

const existsAny = (paths) => paths.some((p) => fs.existsSync(p));

const localChecks = [
  {
    name: "Ultraviolet config",
    paths: ["public/frog/uv.config.js", "frog/uv.config.js"],
  },
  {
    name: "Ultraviolet service worker",
    paths: ["public/frog/sw.js", "frog/sw.js"],
  },
  {
    name: "Scramjet module service worker",
    paths: ["public/scramjet/sw.js", "scramjet/sw.js"],
  },
  {
    name: "Scramjet classic fallback",
    paths: ["public/scramjet/sw.classic.js", "scramjet/sw.classic.js"],
  },
  {
    name: "Epoxy transport assets",
    paths: ["public/epoxy/index.mjs", "public/epoxy/index.js", "epoxy/index.mjs", "epoxy/index.js"],
  },
  {
    name: "Games catalog",
    paths: ["public/assets/games.json", "assets/games.json"],
  },
];

let failed = 0;

console.log("🧪 STRATO local proxy/source asset check");

for (const check of localChecks) {
  if (existsAny(check.paths)) {
    console.log(`✅ ${check.name}`);
  } else {
    failed++;
    console.log(`❌ ${check.name} missing`);
    console.log(`   tried: ${check.paths.join(", ")}`);
  }
}

async function httpCheck(name, path) {
  const url = `${BASE}${path}`;
  try {
    const started = Date.now();
    const res = await fetch(url);
    const ms = Date.now() - started;

    if (!res.ok) {
      failed++;
      console.log(`❌ ${name}: HTTP ${res.status} at ${path}`);
    } else {
      console.log(`✅ ${name}: HTTP ${res.status} in ${ms}ms`);
    }
  } catch {
    console.log(`⚠️ ${name}: server not reachable at ${BASE}`);
    console.log("   Start STRATO, then run: pnpm run check:proxy");
  }
}

console.log("\n🌐 STRATO live route check");
await httpCheck("Home", "/");
await httpCheck("Games catalog route", "/assets/games.json");
await httpCheck("UV config route", "/frog/uv.config.js");
await httpCheck("UV service worker route", "/frog/sw.js");
await httpCheck("Scramjet service worker route", "/scramjet/sw.js");

if (failed > 0) {
  console.log(`\n🚨 STRATO signal weak: ${failed} issue(s).`);
  process.exit(1);
}

console.log("\n✅ STRATO signal strong.");
