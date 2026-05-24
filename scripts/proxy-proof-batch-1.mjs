import fs from "node:fs";
import { createRequire } from "node:module";

const BASE = process.env.STRATO_BASE || "http://localhost:8081";
const LIMIT = Number(process.env.STRATO_BATCH_LIMIT || 25);
const APPLY = process.env.STRATO_APPLY !== "0";

const queuePath = ".strato-reports/proxy-proof-queue.json";
const gamesPath = "public/assets/games.json";
const reportPath = ".strato-reports/proxy-proof-batch-1.json";

function nowIso() {
  return new Date().toISOString();
}

function loadJson(path, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJson(path, data) {
  fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function normalizeFailureReason(reason = "", detail = "") {
  const text = `${reason}\n${detail}`.toLowerCase();
  if (text.includes("headers is not iterable")) return "proxy_internal_error";
  if (text.includes("internal server error")) return "proxy_internal_error";
  if (text.includes("blocked") || text.includes("x-frame")) {
    return "blocked_embed_failure";
  }
  if (
    text.includes("not found") ||
    text.includes("404") ||
    text.includes("dead launch")
  ) {
    return "dead_launch";
  }
  if (text.includes("generic homepage")) return "generic_homepage";
  if (text.includes("timeout")) return "proxy_timeout";
  return "proxy_unknown_failure";
}

function applyCatalogDecisions(games, decisions) {
  const byId = new Map(decisions.map((entry) => [entry.id, entry]));
  return games.map((game) => {
    const decision = byId.get(game.id);
    if (!decision) return game;

    if (decision.decision === "promote_proxy_verified") {
      return {
        ...game,
        reliability: game.reliability === "red" ? "yellow" : game.reliability,
        proxyVerified: true,
        proxyStatus: "remote_proxy_verified",
        proxyVerifiedAt: nowIso(),
        proxyProof: {
          verified: true,
          status: "remote_proxy_verified",
          checkedAt: nowIso(),
          engine: decision.engine || "",
          method: "playwright_proxy_path",
          batch: "remote-proof-batch-1",
          evidence: {
            title: decision.title || "",
            finalUrl: decision.finalUrl || "",
          },
        },
      };
    }

    if (decision.decision === "quarantine_failed") {
      const failure = normalizeFailureReason(decision.reason, decision.detail);
      return {
        ...game,
        reliability: "red",
        needsReview: true,
        quarantineReason: `remote_proof_batch_1:${failure}`,
      };
    }

    return game;
  });
}

async function runBrowserProofBatch(candidates) {
  const require = createRequire(import.meta.url);
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (error) {
    try {
      ({ chromium } = require("playwright"));
    } catch (requireError) {
      throw new Error(
        `Playwright import failed. Run with: npx -y -p playwright node scripts/proxy-proof-batch-1.mjs (${error.message}; ${requireError.message})`,
      );
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  const onLogin = page.url().includes("/login");
  if (onLogin) {
    await page.fill("#username", "strato_batch_proof");
    await page.check("#tos-accepted");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 25000,
    });
  }

  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);

  const decisions = [];
  for (const candidate of candidates) {
    const result = await page.evaluate(
      async ({ url, id, name }) => {
        const iframe = document.getElementById("proxy-iframe");
        const browserBody = document.querySelector(".browser-body");
        if (!iframe) {
          return {
            id,
            decision: "still_unverified",
            reason: "proxy_iframe_missing",
          };
        }
        if (typeof window.STRATO_NAVIGATE_PROXY !== "function") {
          return {
            id,
            decision: "still_unverified",
            reason: "proxy_navigation_unavailable",
          };
        }

        await new Promise((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });

        return await new Promise((resolve) => {
          let done = false;
          const timeoutMs = 18000;
          const started = Date.now();
          const finish = (payload) => {
            if (done) return;
            done = true;
            cleanup();
            resolve({
              id,
              name,
              elapsedMs: Date.now() - started,
              ...payload,
            });
          };

          const inspectIframe = () => {
            try {
              const doc = iframe.contentDocument;
              const title = String(doc?.title || "").trim();
              const bodyText = String(doc?.body?.innerText || "").slice(
                0,
                5000,
              );
              const haystack = `${title}\n${bodyText}`.toLowerCase();
              const linkCount = doc?.querySelectorAll?.("a")?.length || 0;
              const src = String(iframe.getAttribute("src") || iframe.src || "");
              const isUv = src.includes("/frog/");
              const isScramjet = src.includes("/scramjet/");

              if (
                haystack.includes("headers is not iterable") ||
                haystack.includes("internal server error")
              ) {
                return finish({
                  decision: "quarantine_failed",
                  reason: "proxy_internal_error",
                  detail: bodyText.slice(0, 300),
                  title,
                  finalUrl: src,
                  engine: isUv ? "uv" : isScramjet ? "scramjet" : "",
                });
              }

              if (
                haystack.includes("404") ||
                haystack.includes("not found") ||
                haystack.includes("this site can’t be reached") ||
                haystack.includes("this site can't be reached")
              ) {
                return finish({
                  decision: "quarantine_failed",
                  reason: "dead_launch",
                  detail: bodyText.slice(0, 300),
                  title,
                  finalUrl: src,
                  engine: isUv ? "uv" : isScramjet ? "scramjet" : "",
                });
              }

              const looksGenericHomepage =
                linkCount >= 20 &&
                (haystack.includes("projects") || haystack.includes("games")) &&
                (haystack.includes("home") || haystack.includes("welcome"));
              if (looksGenericHomepage) {
                return finish({
                  decision: "quarantine_failed",
                  reason: "generic_homepage",
                  detail: bodyText.slice(0, 300),
                  title,
                  finalUrl: src,
                  engine: isUv ? "uv" : isScramjet ? "scramjet" : "",
                });
              }

              if (!doc || !doc.body || !doc.body.innerText.trim()) {
                return finish({
                  decision: "still_unverified",
                  reason: "empty_proxy_surface",
                  title,
                  finalUrl: src,
                  engine: isUv ? "uv" : isScramjet ? "scramjet" : "",
                });
              }

              return finish({
                decision: "promote_proxy_verified",
                reason: "proxy_surface_loaded",
                title,
                finalUrl: src,
                engine: isUv ? "uv" : isScramjet ? "scramjet" : "",
              });
            } catch (error) {
              return finish({
                decision: "still_unverified",
                reason: "iframe_inspection_failed",
                detail: String(error?.message || error),
              });
            }
          };

          const onInternalError = (event) => {
            const detail = event?.detail || {};
            if (detail.gameId && detail.gameId !== id) return;
            finish({
              decision: "quarantine_failed",
              reason: detail.kind || "proxy_internal_error",
              detail:
                detail.reason || detail.detail || "Proxy internal error event",
              engine: detail.engine || "",
              title: "",
              finalUrl: detail.effectiveUrl || iframe.src || "",
            });
          };

          const onLoad = () => {
            const loading = browserBody?.classList?.contains("is-loading");
            if (loading) return;
            inspectIframe();
          };

          const onError = () => {
            finish({
              decision: "quarantine_failed",
              reason: "blocked_embed_failure",
              detail: "iframe error event",
            });
          };

          const timer = setTimeout(() => {
            finish({
              decision: "still_unverified",
              reason: "proxy_timeout",
              detail: "No stable proxy iframe signal within timeout",
            });
          }, timeoutMs);

          const cleanup = () => {
            clearTimeout(timer);
            window.removeEventListener(
              "strato-proxy-internal-error",
              onInternalError,
            );
            iframe.removeEventListener("load", onLoad);
            iframe.removeEventListener("error", onError);
          };

          window.addEventListener("strato-proxy-internal-error", onInternalError);
          iframe.addEventListener("load", onLoad);
          iframe.addEventListener("error", onError);

          window.STRATO_NAVIGATE_PROXY(url, "uv", {
            title: name || id || "Remote candidate",
            url,
            external: true,
            provider: "batch-proof",
            reliability: "yellow",
            game: { id, name, url, reliability: "yellow", proxyVerified: true },
          });
        });
      },
      candidate,
    );

    decisions.push({
      id: candidate.id,
      name: candidate.name,
      url: candidate.url,
      source: candidate.source,
      ...result,
    });
  }

  await context.close();
  await browser.close();
  return decisions;
}

function summarizeReport({
  testedCount,
  promotedCount,
  quarantinedCount,
  stillUnverifiedCount,
  visibleAfter,
}) {
  return {
    tested_count: testedCount,
    promoted_proxy_verified: promotedCount,
    quarantined_failed: quarantinedCount,
    still_unverified: stillUnverifiedCount,
    visible_game_count_after: visibleAfter,
  };
}

const queue = loadJson(queuePath, []);
if (!Array.isArray(queue) || queue.length === 0) {
  throw new Error(
    `Queue missing or empty at ${queuePath}. Run STRATO_BASE=http://localhost:8081 node scripts/check-proxy.mjs first.`,
  );
}

const candidates = queue.slice(0, LIMIT).map((item) => ({
  id: item.id,
  name: item.name,
  url: item.url,
  source: item.source,
}));

const decisions = await runBrowserProofBatch(candidates);
const testedCount = decisions.length;
const promoted = decisions.filter(
  (decision) => decision.decision === "promote_proxy_verified",
);
const quarantined = decisions.filter(
  (decision) => decision.decision === "quarantine_failed",
);
const stillUnverified = decisions.filter(
  (decision) => decision.decision === "still_unverified",
);

const games = loadJson(gamesPath, []);
const nextGames = APPLY ? applyCatalogDecisions(games, decisions) : games;
if (APPLY) saveJson(gamesPath, nextGames);

const counts = nextGames.reduce(
  (acc, game) => {
    if (game.reliability === "red") acc.red += 1;
    else acc.active += 1;

    const isLocal = String(game.url || "").startsWith("/");
    const hasProof =
      game.proxyVerified === true ||
      game.proxy_verified === true ||
      game.proxyProof?.verified === true;
    if (game.reliability !== "red" && isLocal) acc.localVisible += 1;
    if (game.reliability !== "red" && !isLocal && hasProof)
      acc.remoteVisible += 1;
    if (game.reliability !== "red" && !isLocal && !hasProof)
      acc.remoteUnverified += 1;
    return acc;
  },
  {
    active: 0,
    red: 0,
    localVisible: 0,
    remoteVisible: 0,
    remoteUnverified: 0,
  },
);

const summary = summarizeReport({
  testedCount,
  promotedCount: promoted.length,
  quarantinedCount: quarantined.length,
  stillUnverifiedCount: stillUnverified.length,
  visibleAfter: counts.localVisible + counts.remoteVisible,
});

const report = {
  timestamp: nowIso(),
  base: BASE,
  limit: LIMIT,
  apply: APPLY,
  summary,
  catalog: counts,
  decisions,
};

fs.mkdirSync(".strato-reports", { recursive: true });
saveJson(reportPath, report);

console.log("STRATO remote proof batch 1 complete");
console.log(`- tested_count: ${summary.tested_count}`);
console.log(`- promoted_proxy_verified: ${summary.promoted_proxy_verified}`);
console.log(`- quarantined_failed: ${summary.quarantined_failed}`);
console.log(`- still_unverified: ${summary.still_unverified}`);
console.log(`- visible_game_count_after: ${summary.visible_game_count_after}`);
console.log(`- report: ${reportPath}`);
