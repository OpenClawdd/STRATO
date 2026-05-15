#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const gamesPath = path.join(root, "public", "assets", "games.json");
const reviewDir = path.join(root, "data", "import-review");
const reportPath = path.join(reviewDir, "playability-report.json");

function publicExists(publicPath) {
  if (!publicPath || !String(publicPath).startsWith("/")) return true;
  return fs.existsSync(path.join(root, "public", publicPath));
}

function isPlaceholder(value) {
  const raw = String(value || "").trim();
  return !raw || raw === "#" || raw === "about:blank" || /^\$\{[^}]+\}$/.test(raw);
}

function hiddenReason(game) {
  const url = String(game.url || "").trim();
  if (!url || isPlaceholder(url) || game.config_required || game.needsConfig)
    return "missing-or-config-required";
  if (url.startsWith("/games/") && !publicExists(url)) return "missing-local-file";
  if (game.reliability === "red") return "red-reliability";
  return null;
}

const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
const localValid = [];
const localMissing = [];
const external = [];
const thumbnailsMissing = [];
const hiddenFromPlayableLists = [];
const reliability = { green: 0, yellow: 0, red: 0, unspecified: 0 };

for (const game of games) {
  const url = String(game.url || "").trim();
  const rel = game.reliability || "unspecified";
  reliability[rel] = (reliability[rel] || 0) + 1;

  if (url.startsWith("/games/")) {
    if (publicExists(url)) localValid.push({ id: game.id, name: game.name, url });
    else localMissing.push({ id: game.id, name: game.name, url });
  } else {
    external.push({
      id: game.id,
      name: game.name,
      url,
      reliability: game.reliability || null,
    });
  }

  if (game.thumbnail && String(game.thumbnail).startsWith("/") && !publicExists(game.thumbnail)) {
    thumbnailsMissing.push({ id: game.id, name: game.name, thumbnail: game.thumbnail });
  }

  const reason = hiddenReason(game);
  if (reason) {
    hiddenFromPlayableLists.push({
      id: game.id,
      name: game.name,
      url,
      reliability: game.reliability || null,
      reason,
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    games: games.length,
    localValid: localValid.length,
    localMissing: localMissing.length,
    external: external.length,
    thumbnailsMissing: thumbnailsMissing.length,
    hiddenFromPlayableLists: hiddenFromPlayableLists.length,
  },
  reliability,
  localValid,
  localMissing,
  external,
  thumbnailsMissing,
  hiddenFromPlayableLists,
  notes: [
    "Local playable means /games/... target file exists.",
    "External games depend on the existing proxy launch path and should remain badged until verified.",
    "Adding Hub/source sites does not import their games; captures/*.raw.json review is required.",
  ],
};

fs.mkdirSync(reviewDir, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log("[audit-playability] STRATO playability report");
console.log(`Total games: ${report.totals.games}`);
console.log(`Local valid: ${report.totals.localValid}`);
console.log(`Local missing: ${report.totals.localMissing}`);
console.log(`External: ${report.totals.external}`);
console.log(
  `Reliability: green=${reliability.green || 0}, yellow=${reliability.yellow || 0}, red=${reliability.red || 0}, unspecified=${reliability.unspecified || 0}`,
);
console.log(`Missing thumbnails: ${report.totals.thumbnailsMissing}`);
console.log(`Hidden from playable lists: ${report.totals.hiddenFromPlayableLists}`);
console.log(`Wrote ${path.relative(root, reportPath)}`);
