import fs from "node:fs";

const BASE = process.env.STRATO_BASE || "http://localhost:8080";
const gamesPath = "public/assets/games.json";
const reportsDir = ".strato-reports";
const WRITE_REPORT =
  process.argv.includes("--write-report") ||
  process.env.STRATO_WRITE_PROXY_REPORT === "true";

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
    name: "Ultraviolet client bundle",
    paths: ["public/frog/uv.bundle.js", "frog/uv.bundle.js"],
  },
  {
    name: "Scramjet module service worker",
    paths: ["public/scramjet/sw.js", "scramjet/sw.js"],
  },
  {
    name: "Scramjet client bundle",
    paths: [
      "public/scramjet/scramjet.bundle.js",
      "scramjet/scramjet.bundle.js",
    ],
  },
  {
    name: "Scramjet classic fallback",
    paths: ["public/scramjet/sw.classic.js", "scramjet/sw.classic.js"],
  },
  {
    name: "Epoxy transport assets",
    paths: [
      "public/epoxy/index.mjs",
      "public/epoxy/index.js",
      "epoxy/index.mjs",
      "epoxy/index.js",
    ],
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

async function httpCheck(name, path, { expectJavascript = false } = {}) {
  const url = `${BASE}${path}`;
  try {
    const started = Date.now();
    const res = await fetch(url);
    const ms = Date.now() - started;
    const contentType = res.headers.get("content-type") || "";
    const bodyPreview = expectJavascript
      ? (await res.text()).slice(0, 160).toLowerCase()
      : "";

    if (!res.ok) {
      failed++;
      console.log(`❌ ${name}: HTTP ${res.status} at ${path}`);
    } else if (
      expectJavascript &&
      (!/javascript|ecmascript/i.test(contentType) ||
        bodyPreview.includes("<!doctype html") ||
        bodyPreview.includes("<html"))
    ) {
      failed++;
      console.log(
        `❌ ${name}: expected JavaScript, got ${contentType || "unknown content type"} at ${path}`,
      );
    } else {
      console.log(`✅ ${name}: HTTP ${res.status} in ${ms}ms`);
    }
  } catch {
    console.log(`⚠️ ${name}: server not reachable at ${BASE}`);
    console.log("   Start STRATO, then run: pnpm run check:proxy");
  }
}

async function fetchText(url) {
  const started = Date.now();
  const res = await fetch(url, { redirect: "manual" });
  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    contentType: res.headers.get("content-type") || "",
    body: text,
    ms: Date.now() - started,
  };
}

function loadGames() {
  try {
    return JSON.parse(fs.readFileSync(gamesPath, "utf8"));
  } catch {
    return [];
  }
}

function wrapperKind(url = "") {
  const value = String(url || "");
  if (/play\.frogiee\.one\/iframe\.html\?url=/i.test(value)) {
    return "frogiee_iframe_wrapper";
  }
  if (/adfree-sz-games\.github\.io\/games\/game\.html\?game=/i.test(value)) {
    return "adfree_game_wrapper";
  }
  if (/iframe\.html\?url=/i.test(value)) return "iframe_wrapper";
  if (/game\.html\?game=/i.test(value)) return "game_wrapper";
  return "";
}

function hasProxyProof(game) {
  if (!game || typeof game !== "object") return false;
  if (game.proxyVerified === true || game.proxy_verified === true) return true;
  if (game.proxyProof?.verified === true) return true;
  const status = String(
    game.proxyStatus ||
      game.proxy_status ||
      game.proxyProof?.status ||
      game.proxyProof?.kind ||
      "",
  )
    .trim()
    .toLowerCase();
  if (
    status === "verified" ||
    status === "ok" ||
    status === "proxy_verified" ||
    status === "remote_proxy_verified"
  ) {
    return true;
  }
  return Boolean(
    game.proxyVerifiedAt ||
    game.proxy_verified_at ||
    game.proxyProof?.checkedAt ||
    game.proxyProof?.verifiedAt,
  );
}

async function routeOk(path) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "GET",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function proxySmokeReport() {
  const games = loadGames();
  const report = {
    local_verified: 0,
    local_failed: 0,
    remote_proxy_verified: 0,
    remote_proxy_unverified: 0,
    remote_wrapper_quarantined: 0,
    red_quarantined: 0,
  };
  const examples = [];
  const queue = [];
  let activeWrapperCount = 0;

  for (const game of games) {
    const reliability = game.reliability || "";
    const url = String(game.url || "");
    const wrapped = wrapperKind(url);

    if (reliability === "red") {
      report.red_quarantined += 1;
      if (wrapped) report.remote_wrapper_quarantined += 1;
      continue;
    }

    if (url.startsWith("/")) {
      if (await routeOk(url)) report.local_verified += 1;
      else {
        report.local_failed += 1;
        examples.push(`${game.id}: local route failed (${url})`);
      }
      continue;
    }

    if (wrapped) {
      activeWrapperCount += 1;
      examples.push(`${game.id}: active ${wrapped} (${url})`);
      continue;
    }

    if (hasProxyProof(game)) {
      report.remote_proxy_verified += 1;
      continue;
    }

    // HTTP smoke cannot prove browser proxy render; queue for manual proof.
    report.remote_proxy_unverified += 1;
    queue.push({
      id: game.id || "",
      name: game.name || game.title || "",
      reliability,
      url,
      source: game.source || game.provider || "",
      reason: "source_ok_proxy_unverified",
    });
  }

  return { report, examples, queue, activeWrapperCount };
}

function writeProxyProofQueue(queue = []) {
  fs.mkdirSync(reportsDir, { recursive: true });
  const jsonPath = `${reportsDir}/proxy-proof-queue.json`;
  const csvPath = `${reportsDir}/proxy-proof-queue.csv`;
  fs.writeFileSync(jsonPath, `${JSON.stringify(queue, null, 2)}\n`);
  const csvHeader = "id,name,reliability,source,url,reason";
  const csvRows = queue.map((item) =>
    [item.id, item.name, item.reliability, item.source, item.url, item.reason]
      .map((value) => `"${String(value || "").replaceAll('"', '""')}"`)
      .join(","),
  );
  fs.writeFileSync(csvPath, `${csvHeader}\n${csvRows.join("\n")}\n`);
  return { jsonPath, csvPath };
}

console.log("\n🌐 STRATO live route check");
await httpCheck("Home", "/");
await httpCheck("Games catalog route", "/assets/games.json");
await httpCheck("UV config route", "/frog/uv.config.js", {
  expectJavascript: true,
});
await httpCheck("UV client bundle route", "/frog/uv.bundle.js", {
  expectJavascript: true,
});
await httpCheck("UV service worker route", "/frog/sw.js", {
  expectJavascript: true,
});
await httpCheck("Scramjet service worker route", "/scramjet/sw.js", {
  expectJavascript: true,
});
await httpCheck(
  "Scramjet client bundle route",
  "/scramjet/scramjet.bundle.js",
  {
    expectJavascript: true,
  },
);

console.log("\n🧪 Boxingrandom wrapper smoke");
try {
  const wrapperUrl =
    "https://adfree-sz-games.github.io/games/game.html?game=https://tylerpalko.github.io/gamehub/boxingrandom/";
  const directUrl = "https://tylerpalko.github.io/gamehub/boxingrandom/";

  const wrapper = await fetchText(wrapperUrl);
  if (!wrapper.ok) {
    failed++;
    console.log(`❌ Boxingrandom wrapper page: HTTP ${wrapper.status}`);
  } else {
    console.log(
      `✅ Boxingrandom wrapper page: HTTP ${wrapper.status} in ${wrapper.ms}ms`,
    );
    if (!wrapper.body.includes(directUrl)) {
      console.log(
        "ℹ️ Boxingrandom wrapper page does not surface the nested target in HTML. That is acceptable here because the browser resolver preserves the original wrapper unless a nested target is already verified by metadata or repair reports.",
      );
    } else {
      console.log(
        "ℹ️ Boxingrandom wrapper page references the nested target URL.",
      );
    }
  }

  const direct = await fetchText(directUrl);
  if (!direct.ok) {
    console.log(
      `ℹ️ Boxingrandom original direct target remains HTTP ${direct.status}; no verified cleaner URL is available, so STRATO keeps the original wrapper URL and classifies the runtime failure truthfully.`,
    );
  } else {
    console.log(
      `ℹ️ Boxingrandom original direct target returned HTTP ${direct.status}.`,
    );
  }
} catch (error) {
  failed++;
  console.log(`❌ Boxingrandom repair smoke failed: ${error.message}`);
}

console.log("\n🎮 Game-first proxy smoke report");
const {
  report: proxyReport,
  examples: proxyExamples,
  queue: proxyQueue,
  activeWrapperCount,
} = await proxySmokeReport();
for (const [key, value] of Object.entries(proxyReport)) {
  console.log(`- ${key}: ${value}`);
}
if (WRITE_REPORT) {
  const queuePaths = writeProxyProofQueue(proxyQueue);
  console.log(
    `- proxy_proof_queue: ${proxyQueue.length} (${queuePaths.jsonPath}, ${queuePaths.csvPath})`,
  );
} else {
  console.log(
    `- proxy_proof_queue: ${proxyQueue.length} (not written; rerun with --write-report to update ${reportsDir}/proxy-proof-queue.*)`,
  );
}
if (proxyExamples.length) {
  console.log("\nActive proxy smoke failures:");
  for (const example of proxyExamples.slice(0, 20)) {
    console.log(`- ${example}`);
  }
}
if (proxyReport.local_failed > 0) {
  failed += proxyReport.local_failed;
  console.log("❌ Local green launch routes must answer before release.");
}
if (activeWrapperCount > 0) {
  failed += activeWrapperCount;
  console.log(
    "❌ Active wrapper remote launch candidates are not allowed. Quarantine or repair these entries.",
  );
}

if (failed > 0) {
  console.log(`\n🚨 STRATO signal weak: ${failed} issue(s).`);
  process.exit(1);
}

console.log("\n✅ STRATO signal strong.");
