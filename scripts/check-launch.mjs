import fs from "node:fs";

const BASE = process.env.STRATO_BASE || "http://localhost:8080";
const LIMIT = Number(process.env.STRATO_LAUNCH_LIMIT || 12);
const TEMPLATE = process.env.STRATO_LAUNCH_TEMPLATE || "";

const catalogPaths = [
  "public/assets/games.json",
  "assets/games.json",
];

const catalogPath = catalogPaths.find((p) => fs.existsSync(p));

if (!catalogPath) {
  console.error("❌ Could not find games catalog.");
  console.error(`   Tried: ${catalogPaths.join(", ")}`);
  process.exit(1);
}

const raw = fs.readFileSync(catalogPath, "utf8");
const json = JSON.parse(raw);

const games =
  Array.isArray(json) ? json :
  Array.isArray(json.games) ? json.games :
  Array.isArray(json.items) ? json.items :
  Array.isArray(json.catalog) ? json.catalog :
  [];

if (!games.length) {
  console.error("❌ Catalog loaded, but no games were found.");
  process.exit(1);
}

const picked = games.slice(0, LIMIT);

const getId = (game, index) =>
  game.id ||
  game.slug ||
  game.key ||
  game.name?.toLowerCase?.().replaceAll(" ", "-") ||
  game.title?.toLowerCase?.().replaceAll(" ", "-") ||
  String(index);

const getTitle = (game, index) =>
  game.title ||
  game.name ||
  game.label ||
  `Game ${index + 1}`;

const getSource = (game) =>
  game.source ||
  game.url ||
  game.href ||
  game.path ||
  game.src ||
  game.embed ||
  game.iframe ||
  "";

function launchCandidates(game, index) {
  const id = encodeURIComponent(getId(game, index));
  const source = getSource(game);

  const candidates = [];

  if (TEMPLATE) {
    candidates.push(TEMPLATE.replaceAll("{id}", id).replaceAll("{source}", encodeURIComponent(source)));
  }

  candidates.push(
    `/play/${id}`,
    `/play?id=${id}`,
    `/play.html?id=${id}`,
    `/launch/${id}`,
    `/launch?id=${id}`,
    `/game/${id}`,
    `/games/${id}`,
    `/?game=${id}`
  );

  if (source && source.startsWith("/")) {
    candidates.push(source);
  }

  return [...new Set(candidates)];
}

async function checkRoute(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return {
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      path,
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: "ERR",
      path,
      error: err.name === "AbortError" ? "timeout" : err.message,
    };
  }
}

let failed = 0;
let routeHits = 0;

console.log("🚀 STRATO launch smoke test");
console.log(`Base: ${BASE}`);
console.log(`Catalog: ${catalogPath}`);
console.log(`Games checked: ${picked.length}/${games.length}`);

console.log("\n📦 Catalog launch fields");

for (const [index, game] of picked.entries()) {
  const title = getTitle(game, index);
  const id = getId(game, index);
  const source = getSource(game);

  if (!id || !title) {
    failed++;
    console.log(`❌ Game ${index + 1}: missing id/title`);
    continue;
  }

  if (!source) {
    failed++;
    console.log(`❌ ${title}: missing launch source/url/path`);
    continue;
  }

  console.log(`✅ ${title}: id=${id}`);
}

console.log("\n🌐 Local launch route check");

for (const [index, game] of picked.entries()) {
  const title = getTitle(game, index);
  const candidates = launchCandidates(game, index);

  let passed = null;
  const tried = [];

  for (const candidate of candidates) {
    const result = await checkRoute(candidate);
    tried.push(`${candidate} -> ${result.status}`);

    if (result.ok) {
      passed = result;
      break;
    }
  }

  if (passed) {
    routeHits++;
    console.log(`✅ ${title}: ${passed.path} HTTP ${passed.status}`);
  } else {
    console.log(`⚠️ ${title}: no known local launch route answered`);
    console.log(`   tried: ${tried.slice(0, 6).join(", ")}`);
  }
}

console.log("\n🧠 Result");

if (failed > 0) {
  console.log(`🚨 STRATO launch catalog weak: ${failed} catalog issue(s).`);
  process.exit(1);
}

if (routeHits === 0) {
  console.log("⚠️ Catalog looks valid, but no default launch route matched.");
  console.log("   If STRATO uses a custom launch URL, run:");
  console.log("   STRATO_LAUNCH_TEMPLATE=\"/your-route?id={id}\" pnpm run check:launch");
  process.exit(1);
}

console.log(`✅ STRATO launch signal alive: ${routeHits}/${picked.length} checked games matched a local launch route.`);
