import fs from "node:fs";

const BASE = process.env.STRATO_BASE || "http://localhost:8080";
const gamesPath = "public/assets/games.json";

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
    local_ok: 0,
    local_failed: 0,
    remote_proxy_ok: 0,
    remote_proxy_internal_error: 0,
    remote_wrapper_unverified: 0,
    remote_direct_unverified: 0,
    quarantined: 0,
  };
  const examples = [];

  for (const game of games) {
    const reliability = game.reliability || "";
    const url = String(game.url || "");
    const wrapped = wrapperKind(url);

    if (reliability === "red") {
      report.quarantined += 1;
      continue;
    }

    if (url.startsWith("/")) {
      if (await routeOk(url)) report.local_ok += 1;
      else {
        report.local_failed += 1;
        examples.push(`${game.id}: local route failed (${url})`);
      }
      continue;
    }

    if (wrapped) {
      report.remote_wrapper_unverified += 1;
      report.remote_proxy_internal_error += 1;
      examples.push(`${game.id}: active ${wrapped} (${url})`);
      continue;
    }

    // HTTP smoke cannot prove a browser service-worker proxy render.
    report.remote_direct_unverified += 1;
  }

  return { report, examples };
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
const { report: proxyReport, examples: proxyExamples } =
  await proxySmokeReport();
for (const [key, value] of Object.entries(proxyReport)) {
  console.log(`- ${key}: ${value}`);
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
if (proxyReport.remote_wrapper_unverified > 0) {
  failed += proxyReport.remote_wrapper_unverified;
  console.log(
    "❌ Active wrapper remote launch candidates are not allowed. Quarantine or repair these entries.",
  );
}

if (failed > 0) {
  console.log(`\n🚨 STRATO signal weak: ${failed} issue(s).`);
  process.exit(1);
}

console.log("\n✅ STRATO signal strong.");
