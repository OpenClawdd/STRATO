import fs from "node:fs";

const CATALOG =
  fs.existsSync("public/assets/games.json") ? "public/assets/games.json" :
  fs.existsSync("assets/games.json") ? "assets/games.json" :
  null;

if (!CATALOG) {
  console.error("❌ Could not find games.json");
  process.exit(1);
}

const TERMS = (process.env.STRATO_SOURCE_TERMS || "selenite,1key,1-key,lucide,frogiee,frogies,cherri")
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);

const LIMIT = Number(process.env.STRATO_SOURCE_LIMIT || 120);
const TIMEOUT = Number(process.env.STRATO_SOURCE_TIMEOUT || 8000);

const ASSET_EXT = /\.(png|jpg|jpeg|webp|gif|svg|ico|const ASSET_EXT = /\.(png|jpg|jpeg|webp|gif|svg|ico|const ASSET_EXT = /\.(png|jpg|jpeg|webp|gif|svg|ico|const ASSET_EXT = /\.(png|jpg|jpeg|webp|gif|svg|ico|const ASSET_EXT = /\.(png|jpg|jpeg|webp|gif|svg|ico|const ASSET_EXT = /\.(png|jpg|jpeg|webp|gif|svg|ico|const ASSET_ame)/i;

const raw = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
const games =
  Array.isArray(raw) ? raw :
  Array.isArray(raw.games) ? raw.games :
  Array.isArray(raw.items) ? raw.items :
  Array.isArray(raw.catalog) ? raw.catalog :
  [];

function titleOf(game, i) {
  return game.title || game.name || game.label || game.id || game.slug || `Game ${i + 1}`;
}

function idOf(game, i) {
  return game.id || game.slug || game.key || String(i);
}

function collectStrings(value, path = "", out = []) {
  if (typeof value === "string") {
    out.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      collectStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
  return out;
}

function isHttp(s) {
  return /^https?:\/\//i.test(s);
}

function isAssetUrl(path, url) {
  return ASSET_EXT.test(url) || ASSET_KEYS.test(path);
}

function isLaunchish(path, url) {
  if (!isHttp(url)) return false;
  if (isAssetUrl(path, url)) return false;
  return LAUNCH_KEYS.test(path) || !ASSET_EXT.test(url);
}

function matchFamilies(game) {
  const haystack = JSON.stringify(game).toLowerCase();
  return TERMS.filter((term) => haystack.includes(term));
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "STRATO-source-health-check/2.0"
      }
    });

    clearTimeout(timer);

    return {
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      finalUrl: res.url,
      type: res.headers.get("content-type") || "unknown"
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      status: "ERR",
      error: err.name === "AbortError" ? "timeout" : err.message
    };
  }
}

const matched = games
  .map((game, index) => {
    const strings = collectStrings(game);
    const urls = strings.filter((x) => isHttp(x.value));
    const launchUrls = urls.filter((x) => isLaunchish(x.path, x.value));
    const assetUrls = urls.filter((x) => isAssetUrl(x.path, x.value));
    const families = matchFamilies(game);

    return {
      game,
      index,
      id: idOf(game, index),
      title: titleOf(game, index),
      families,
      urls,
      launchUrls,
      assetUrls
    };
  })
  .filter((x) => x.families.length || x.urls.some((u) => TERMS.some((t) => u.value.toLowerCase().includes(t))))
  .slice(0, LIMIT);

console.log("🛰️ STRATO real external launch source check");
console.log(`Catalog: ${CATALOG}`);
console.log(`Total games: ${games.length}`);
console.log(`Source terms: ${TERMS.join(", ")}`);
console.log(`Matched entries checked: ${matched.length}`);
console.log("");

if (!matched.length) {
  console.log("⚠️ No matching external source families found.");
  process.exit(1);
}

let playableOk = 0;
let assetOnly = 0;
let weak = 0;
let missingLaunch = 0;

const report = [];
const deadLines = [];
const familyCounts = {};

for (const item of matched) {
  for (const family of item.families) {
    familyCounts[family] = (familyCounts[family] || 0) + 1;
  }

  if (!item.launchUrls.length) {
    missingLaunch++;
    assetOnly++;
    console.log(`🟡 ${item.title}: asset-only entry, no real launch URL found`);
    if (item.assetUrls[0]) {
      console.log(`   first asset: ${item.assetUrls[0].value}`);
    }

    report.push({
      id: item.id,
      title: item.title,
      status: "asset_only",
      families: item.families,
      assetUrls: item.assetUrls.map((x) => x.value)
    });

    deadLines.push(`${item.title} [${item.id}] — asset-only / no launch URL`);
    continue;
  }

  let passed = null;
  const attempts = [];

  for (const candidate of item.launchUrls.slice(0, 4)) {
    const result = await probe(candidate.value);
    attempts.push({
      path: candidate.path,
      url: candidate.value,
      ...result
    });

    if (result.ok) {
      passed = attempts.at(-1);
      break;
    }
  }

  if (passed) {
    playableOk++;
    console.log(`✅ ${item.title}: launch HTTP ${passed.status}`);
    console.log(`   ${passed.url}`);
    report.push({
      id: item.id,
      title: item.title,
      status: "launch_ok",
      families: item.families,
      passed,
      attempts
    });
  } else {
    weak++;
    const first = attempts[0];
    console.log(`🔴 ${item.title}: launch weak/dead`);
    if (first) {
      console.log(`   ${first.status}${first.error ? ` / ${first.error}` : ""}: ${first.url}`);
    }

    report.push({
      id: item.id,
      title: item.title,
      status: "launch_dead",
      families: item.families,
      attempts
    });

    deadLines.push(`${item.title} [${item.id}] — launch dead`);
    for (const attempt of attempts) {
      deadLines.push(`  ${attempt.status}${attempt.error ? ` / ${attempt.error}` : ""} ${attempt.url}`);
    }
  }
}

fs.writeFileSync(".strato-reports/external-source-health.json", JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(".strato-reports/dead-external-sources.txt", deadLines.join("\n") + "\n");

console.log("");
console.log("📊 Family matches:");
for (const [family, count] of Object.entries(familyCounts).sort()) {
  console.log(`- ${family}: ${count}`);
}

console.log("");
console.log(`✅ Real launch OK: ${playableOk}`);
console.log(`🟡 Asset-only / fake signal: ${assetOnly}`);
console.log(`🔴 Weak/dead launch: ${weak}`);
console.log(`❌ Missing launch URL: ${missingLaunch}`);

console.log("");
console.log("Reports written:");
console.log("- .strato-reports/external-source-health.json");
console.log("- .strato-reports/dead-external-sources.txt");

if (weak || missingLaunch) {
  console.log("");
  console.log("🚨 STRATO external launch signal weak.");
  process.exit(1);
}

console.log("");
console.log("✅ STRATO external launch signal strong.");
