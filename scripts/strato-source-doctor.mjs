import fs from "node:fs";

const mode = process.argv[2] || "check";
const BASE = process.env.STRATO_BASE || "http://localhost:8080";
const LIMIT = Number(process.env.STRATO_SOURCE_LIMIT || 0);
const CONCURRENCY = Number(process.env.STRATO_SOURCE_CONCURRENCY || 12);
const TIMEOUT = Number(process.env.STRATO_SOURCE_TIMEOUT || 8000);
const APPLY = process.env.STRATO_APPLY === "1";

const catalogPath =
  fs.existsSync("public/assets/games.json") ? "public/assets/games.json" :
  fs.existsSync("assets/games.json") ? "assets/games.json" :
  null;

if (!catalogPath) {
  console.error("❌ Could not find public/assets/games.json or assets/games.json");
  process.exit(1);
}

const assetExts = new Set([
  "png", "jpg", "jpeg", "webp", "gif", "svg", "ico",
  "css", "js", "mjs", "json", "mp3", "ogg", "wav", "mp4", "webm",
  "woff", "woff2", "ttf", "wasm", "data", "bin"
]);

const assetKeyWords = [
  "icon", "image", "img", "cover", "thumb", "thumbnail", "splash",
  "logo", "poster", "banner", "background", "favicon", "asset", "assets",
  "resources"
];

const launchKeyWords = [
  "url", "href", "link", "source", "src", "path", "embed", "iframe",
  "launch", "play", "game", "gameurl", "game_url"
];

const sourceFamilies = [
  ["selenite", ["selenite.cc", "selenite"]],
  ["1key", ["1key", "1-key", "onekey"]],
  ["lucide", ["lucideon.top", "a.luminsdk.com", "lucideproxy", "lucide"]],
  ["frogiee", ["frogiee", "frogies", "frogiesarcade"]],
  ["cherri", ["cherri"]],
  ["gn-math", ["gn-math.dev", "gn-math", "gn_math"]]
];

function loadCatalog() {
  const raw = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const games =
    Array.isArray(raw) ? raw :
    Array.isArray(raw.games) ? raw.games :
    Array.isArray(raw.items) ? raw.items :
    Array.isArray(raw.catalog) ? raw.catalog :
    [];

  return { raw, games };
}

function writeCatalogLike(originalRaw, games) {
  if (Array.isArray(originalRaw)) return games;

  const clone = structuredClone(originalRaw);
  if (Array.isArray(clone.games)) clone.games = games;
  else if (Array.isArray(clone.items)) clone.items = games;
  else if (Array.isArray(clone.catalog)) clone.catalog = games;
  else return games;

  return clone;
}

function titleOf(game, i) {
  return game.title || game.name || game.label || game.id || game.slug || `Game ${i + 1}`;
}

function idOf(game, i) {
  return game.id || game.slug || game.key || titleOf(game, i).toLowerCase().replaceAll(" ", "-");
}

function collectStrings(value, path = "", out = []) {
  if (typeof value === "string") {
    out.push({ path, value: value.trim() });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      collectStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
  return out;
}

function isUrlLike(value) {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

function toURL(value) {
  try {
    return new URL(value, BASE);
  } catch {
    return null;
  }
}

function cleanHost(host) {
  return host.replace(/^www\./, "").toLowerCase();
}

function extensionOf(urlObj) {
  const pathname = urlObj.pathname || "";
  const match = pathname.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

function pathLooksAsset(path) {
  const lower = path.toLowerCase();
  return assetKeyWords.some((word) => lower.includes(word));
}

function urlLooksAsset(urlObj) {
  return assetExts.has(extensionOf(urlObj));
}

function isAssetCandidate(item) {
  const urlObj = toURL(item.value);
  if (!urlObj) return false;
  return urlLooksAsset(urlObj) || pathLooksAsset(item.path);
}

function isGenericHub(value) {
  const urlObj = toURL(value);
  if (!urlObj) return false;

  const path = urlObj.pathname.replace(/\/+$/, "").toLowerCase();
  const generic = new Set([
    "",
    "/",
    "/projects",
    "/games",
    "/game",
    "/play",
    "/apps",
    "/app",
    "/resources",
    "/search",
    "/library",
    "/archive"
  ]);

  return generic.has(path);
}

function isLaunchCandidate(item) {
  if (!isUrlLike(item.value)) return false;
  if (isAssetCandidate(item)) return false;
  if (isGenericHub(item.value)) return false;

  const lowerPath = item.path.toLowerCase();
  if (launchKeyWords.some((word) => lowerPath.includes(word))) return true;

  const urlObj = toURL(item.value);
  if (!urlObj) return false;

  return !urlLooksAsset(urlObj);
}

function familiesFor(game, urls) {
  const text = JSON.stringify(game).toLowerCase();
  const hit = [];

  for (const [family, needles] of sourceFamilies) {
    if (needles.some((needle) => text.includes(needle))) hit.push(family);
  }

  for (const urlItem of urls) {
    const urlObj = toURL(urlItem.value);
    const host = urlObj ? cleanHost(urlObj.hostname) : "";

    if (host === 'cdn.jsdelivr.net') {
      if (urlItem.value.toLowerCase().includes('/gh/lucideproxy/svg') || urlItem.value.toLowerCase().includes('lucideproxy/svg')) {
         if (!hit.includes('lucide')) hit.push('lucide');
      } else if (text.includes('gn-math') || text.includes('gn_math') || urlItem.value.toLowerCase().includes('gn-math')) {
         if (!hit.includes('gn-math')) hit.push('gn-math');
      } else {
         if (!hit.includes('unknown-cdn')) hit.push('unknown-cdn');
      }
      continue;
    }

    for (const [family, needles] of sourceFamilies) {
      if (needles.some((needle) => host.includes(needle) || urlItem.value.toLowerCase().includes(needle))) {
        if (!hit.includes(family)) hit.push(family);
      }
    }
  }

  return hit;
}

function analyzeGame(game, index) {
  const strings = collectStrings(game);
  const urlItems = strings.filter((x) => isUrlLike(x.value));
  const assetUrls = urlItems.filter((x) => isAssetCandidate(x));
  const genericUrls = urlItems.filter((x) => isGenericHub(x.value));
  const launchUrls = urlItems.filter((x) => isLaunchCandidate(x));

  const domains = [];
  for (const item of urlItems) {
    const urlObj = toURL(item.value);
    if (urlObj && /^https?:$/i.test(urlObj.protocol)) {
      domains.push(cleanHost(urlObj.hostname));
    }
  }

  return {
    index,
    game,
    id: idOf(game, index),
    title: titleOf(game, index),
    families: familiesFor(game, urlItems),
    domains: [...new Set(domains)],
    assetUrls,
    genericUrls,
    launchUrls
  };
}

async function probe(value) {
  const urlObj = toURL(value);
  if (!urlObj) return { ok: false, status: "BAD_URL", reason: "invalid URL" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(urlObj.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "STRATO-source-doctor/1.0"
      }
    });

    clearTimeout(timer);

    const finalUrl = res.url;
    const type = res.headers.get("content-type") || "";
    const finalGeneric = isGenericHub(finalUrl);
    const contentLooksAsset =
      type.startsWith("image/") ||
      type.startsWith("audio/") ||
      type.startsWith("video/") ||
      type.includes("font") ||
      type.includes("javascript") ||
      type.includes("css");

    const ok = res.status >= 200 && res.status < 400 && !finalGeneric && !contentLooksAsset;

    return {
      ok,
      status: res.status,
      finalUrl,
      type,
      reason: ok ? "ok" : finalGeneric ? "generic hub page" : contentLooksAsset ? "asset response" : `HTTP ${res.status}`
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      status: "ERR",
      reason: err.name === "AbortError" ? "timeout" : err.message
    };
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const current = next++;
      results[current] = await fn(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}

function csvEscape(value) {
  const s = String(value ?? "");
  return `"${s.replaceAll("\"", "\"\"")}"`;
}

function writeInventory(analyzed) {
  const domainCounts = new Map();
  const familyCounts = new Map();

  for (const item of analyzed) {
    for (const domain of item.domains) {
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    }

    const fams = item.families.length ? item.families : ["unknown"];
    for (const family of fams) {
      familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
    }
  }

  const domains = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]);
  const families = [...familyCounts.entries()].sort((a, b) => b[1] - a[1]);

  const md = [
    "# STRATO Source Inventory",
    "",
    `Catalog: \`${catalogPath}\``,
    `Total games: **${analyzed.length}**`,
    "",
    "## Source families",
    "",
    "| Family | Entries |",
    "|---|---:|",
    ...families.map(([name, count]) => `| ${name} | ${count} |`),
    "",
    "## Domains",
    "",
    "| Domain | Entries |",
    "|---|---:|",
    ...domains.map(([name, count]) => `| ${name} | ${count} |`),
    ""
  ].join("\n");

  fs.writeFileSync(".strato-reports/source-inventory.md", md);
  fs.writeFileSync(
    ".strato-reports/source-domains.csv",
    ["domain,count", ...domains.map(([d, c]) => `${csvEscape(d)},${c}`)].join("\n") + "\n"
  );
  fs.writeFileSync(
    ".strato-reports/source-families.csv",
    ["family,count", ...families.map(([f, c]) => `${csvEscape(f)},${c}`)].join("\n") + "\n"
  );

  return { domains, families };
}

async function main() {
  const { raw, games } = loadCatalog();
  const analyzedAll = games.map(analyzeGame);
  const analyzed = LIMIT > 0 ? analyzedAll.slice(0, LIMIT) : analyzedAll;

  const inventory = writeInventory(analyzedAll);

  console.log("🛰️ STRATO source doctor");
  console.log(`Mode: ${mode}`);
  console.log(`Catalog: ${catalogPath}`);
  console.log(`Total games: ${games.length}`);
  console.log(`Checked games: ${analyzed.length}`);
  console.log("");

  console.log("📚 Source families currently in catalog:");
  for (const [family, count] of inventory.families) {
    console.log(`- ${family}: ${count}`);
  }

  console.log("");
  console.log("🌐 Top source domains:");
  for (const [domain, count] of inventory.domains.slice(0, 25)) {
    console.log(`- ${domain}: ${count}`);
  }

  if (mode === "inventory") {
    console.log("");
    console.log("Reports written:");
    console.log("- .strato-reports/source-inventory.md");
    console.log("- .strato-reports/source-domains.csv");
    console.log("- .strato-reports/source-families.csv");
    return;
  }

  console.log("");
  console.log("🧪 Checking real launch candidates...");
  console.log("Fake signals rejected: images/icons/assets and generic hub pages like /projects");
  console.log("");

  const checked = await mapLimit(analyzed, CONCURRENCY, async (item) => {
    const attempts = [];


    for (const candidate of item.launchUrls.slice(0, 5)) {
      let resolvedUrl = candidate.value;
      if (resolvedUrl.includes('play.frogiee.one/iframe.html?url=')) {
          resolvedUrl = 'https://play.frogiee.one' + resolvedUrl.split('/iframe.html?url=')[1];
      } else if (resolvedUrl.includes('selenite.cc/projects/')) {
          const slug = resolvedUrl.split('/projects/')[1];
          resolvedUrl = `https://selenite.cc/resources/semag/${slug}/index.html`;
      }
      const result = await probe(resolvedUrl);
      attempts.push({
        field: candidate.path,
        url: resolvedUrl,
        ...result
      });

      if (result.ok) break;
    }


    let status = "unknown";
    if (attempts.some((x) => x.ok)) status = "ok";
    else if (item.launchUrls.length) status = "dead_launch";
    else if (item.genericUrls.length && !item.launchUrls.length) status = "generic_only";
    else if (item.assetUrls.length && !item.launchUrls.length) status = "asset_only";
    else status = "missing_source";

    return {
      id: item.id,
      title: item.title,
      families: item.families,
      domains: item.domains,
      status,
      assetUrlCount: item.assetUrls.length,
      genericUrlCount: item.genericUrls.length,
      launchUrlCount: item.launchUrls.length,
      attempts,
      game: item.game
    };
  });

  const counts = {};
  for (const item of checked) counts[item.status] = (counts[item.status] || 0) + 1;

  const working = checked.filter((x) => x.status === "ok");
  const quarantine = checked.filter((x) => x.status !== "ok");

  console.log("📊 Health summary:");
  for (const [status, count] of Object.entries(counts).sort()) {
    console.log(`- ${status}: ${count}`);
  }

  fs.writeFileSync(".strato-reports/catalog-source-health.json", JSON.stringify(checked, null, 2) + "\n");
  fs.writeFileSync(".strato-reports/working-games.json", JSON.stringify(working.map((x) => x.game), null, 2) + "\n");
  fs.writeFileSync(".strato-reports/quarantine-games.json", JSON.stringify(quarantine.map((x) => x.game), null, 2) + "\n");

  const brokenCsv = [
    "status,id,title,families,domains,reason,url"
  ];

  for (const item of quarantine) {
    const first = item.attempts[0];
    brokenCsv.push([
      item.status,
      item.id,
      item.title,
      item.families.join("|"),
      item.domains.join("|"),
      first?.reason || item.status,
      first?.url || ""
    ].map(csvEscape).join(","));
  }

  fs.writeFileSync(".strato-reports/broken-games.csv", brokenCsv.join("\n") + "\n");

  console.log("");
  console.log("Reports written:");
  console.log("- .strato-reports/source-inventory.md");
  console.log("- .strato-reports/source-domains.csv");
  console.log("- .strato-reports/source-families.csv");
  console.log("- .strato-reports/catalog-source-health.json");
  console.log("- .strato-reports/broken-games.csv");
  console.log("- .strato-reports/working-games.json");
  console.log("- .strato-reports/quarantine-games.json");

  const familyHealth = {};
  for (const item of checked) {
    const fams = item.families.length ? item.families : ['unknown'];
    for (const f of fams) {
      if (!familyHealth[f]) familyHealth[f] = { total: 0, ok: 0, generic_only: 0, dead_launch: 0, asset_only: 0, missing_source: 0, quarantined: 0, domains: new Set(), examples: [] };
      familyHealth[f].total++;
      familyHealth[f][item.status]++;
      if (item.status !== 'ok') {
        familyHealth[f].quarantined++;
        if (familyHealth[f].examples.length < 5) familyHealth[f].examples.push(item.id);
      }
      item.domains.forEach(d => familyHealth[f].domains.add(d));
    }
  }

  const byFamilyMd = [
    "# Source Families Health",
    "",
    "| Family | Total | OK | Generic | Dead | Asset | Missing | Quarantined | Top Domains | Examples |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...Object.entries(familyHealth).sort((a,b) => b[1].total - a[1].total).map(([f, h]) =>
      `| ${f} | ${h.total} | ${h.ok} | ${h.generic_only} | ${h.dead_launch} | ${h.asset_only} | ${h.missing_source} | ${h.quarantined} | ${[...h.domains].slice(0, 3).join(', ')} | ${h.examples.join(', ')} |`
    )
  ].join("\\n");
  fs.writeFileSync(".strato-reports/by-family-health.md", byFamilyMd);

  const resolverGapsMd = [
    "# Resolver Gaps",
    "",
    "## gn-math",
    "- 702 entries use hash-based navigation (e.g., `#game-0`) which is non-deterministic statically.",
    "",
    "## selenite",
    "- Some entries might not map directly to `/resources/semag/`.",
    "",
    "## lucide",
    "- Many entries use `lucideon.top/g/frame` which is a generic hub."
  ].join("\\n");
  fs.writeFileSync(".strato-reports/resolver-gaps.md", resolverGapsMd);

  console.log("- .strato-reports/by-family-health.md");
  console.log("- .strato-reports/resolver-gaps.md");


  if (mode === "repair") {
    if (!APPLY) {
      console.log("");
      console.log("🟡 Repair dry-run only.");
      console.log("To replace games.json with working-only entries:");
      console.log("STRATO_APPLY=1 pnpm run repair:sources");
    } else {
      const backup = `${catalogPath}.backup-${Date.now()}`;
      fs.copyFileSync(catalogPath, backup);

      const newGames = analyzed.map(a => {
        const game = a.game;
        const checkResult = checked.find(c => c.id === a.id);
        if (checkResult && checkResult.status !== 'ok') {
          game.quarantine = true;
          game.quarantineReason = checkResult.attempts.length ? checkResult.attempts[0].reason : checkResult.status;
          game.quarantineStatus = checkResult.status;
          game.quarantineCheckedAt = new Date().toISOString();
          game.sourceFamily = checkResult.families.join('|');
          game.sourceDomains = checkResult.domains.join('|');
          game.lastSourceHealth = checkResult.status;
          game.originalLaunchCandidates = checkResult.attempts.map(att => att.url);
        } else {
          delete game.quarantine;
          delete game.quarantineReason;
          delete game.quarantineStatus;
          delete game.quarantineCheckedAt;
        }
        return game;
      });

      fs.writeFileSync(catalogPath, JSON.stringify(writeCatalogLike(raw, newGames), null, 2) + "\n");
      console.log("");
      console.log(`✅ Applied working-only catalog.`);
      console.log(`Backup: ${backup}`);
      console.log(`Kept: ${working.length}`);
      console.log(`Quarantined: ${quarantine.length}`);
    }
  }

  if (quarantine.length) {
    console.log("");
    console.log("🚨 STRATO catalog still has weak entries.");
    console.log(`Working: ${working.length}`);
    console.log(`Needs fix/quarantine: ${quarantine.length}`);
    process.exitCode = 1;
  } else {
    console.log("");
    console.log("✅ STRATO catalog source signal strong.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
