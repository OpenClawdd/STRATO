#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const capturesDir = path.join(root, "captures");
const reviewDir = path.join(root, "data", "import-review");
const candidatesPath = path.join(reviewDir, "captured-candidates.json");
const reportPath = path.join(reviewDir, "captured-report.json");
const gamesPath = path.join(root, "public", "assets", "games.json");
const apply = process.argv.includes("--apply");

const NAV_JUNK = new Set([
  "home",
  "games",
  "apps",
  "settings",
  "discord",
  "about",
  "contact",
  "privacy",
  "terms",
  "login",
  "search",
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function isNavJunk(item) {
  const text = clean(item.text || item.title || item.alt);
  const key = text.toLowerCase();
  if (!key || NAV_JUNK.has(key)) return true;
  if (key.length <= 2) return true;
  const href = clean(item.href);
  return !href && !item.image && NAV_JUNK.has(key.replace(/[^a-z]/g, ""));
}

function normalizeCapture(raw, file) {
  const sourceUrl = clean(raw.sourceUrl || raw.url || raw.origin || "");
  const capturedAt = clean(raw.capturedAt || raw.timestamp || "");
  const items = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw)
      ? raw
      : [];

  return items
    .filter((item) => item && typeof item === "object")
    .filter((item) => !isNavJunk(item))
    .map((item, index) => {
      const title = clean(item.text || item.title || item.name || item.alt);
      const href = clean(item.href || item.url);
      const image = clean(item.image || item.thumbnail || item.img);
      const idBase = slugify(title || href || `${path.basename(file)}-${index}`);
      return {
        id: idBase,
        sourceUrl,
        sourceTitle: clean(raw.title),
        title,
        text: clean(item.text || item.title || item.name || item.alt),
        href,
        image: image || null,
        capturedAt: capturedAt || null,
        evidence: {
          sourceFile: path.relative(root, file),
          sourceUrl,
          title: clean(raw.title),
          text: clean(item.text || item.title || item.name || item.alt),
          href,
          image: image || null,
          capturedAt: capturedAt || null,
          className: clean(item.className),
          tag: clean(item.tag),
        },
      };
    })
    .filter((candidate) => candidate.title || candidate.href || candidate.image);
}

function dedupe(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.title.toLowerCase()}|${candidate.href.toLowerCase()}|${candidate.image || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueGameId(base, existing) {
  let id = base || "captured-game";
  let counter = 2;
  while (existing.has(id)) {
    id = `${base}-${counter++}`;
  }
  existing.add(id);
  return id;
}

fs.mkdirSync(reviewDir, { recursive: true });

const files = fs.existsSync(capturesDir)
  ? fs
      .readdirSync(capturesDir)
      .filter((name) => name.endsWith(".raw.json"))
      .sort()
      .map((name) => path.join(capturesDir, name))
  : [];

const candidates = dedupe(files.flatMap((file) => normalizeCapture(readJson(file), file)));

const report = {
  generatedAt: new Date().toISOString(),
  captureFiles: files.map((file) => path.relative(root, file)),
  candidates: candidates.length,
  apply,
  note: "Review candidates before marking entries approved. Cherri is screenshot-only; do not scrape or bypass bot protection.",
};

fs.writeFileSync(candidatesPath, `${JSON.stringify(candidates, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (apply) {
  const approved = candidates.filter(
    (candidate) =>
      candidate.approved === true ||
      candidate.reviewStatus === "approved" ||
      candidate.status === "approved",
  );
  const games = readJson(gamesPath);
  const existingIds = new Set(games.map((game) => game.id));
  const existingNames = new Set(games.map((game) => clean(game.name).toLowerCase()));
  const additions = approved
    .filter((candidate) => candidate.title && candidate.href)
    .filter((candidate) => !existingNames.has(candidate.title.toLowerCase()))
    .map((candidate) => ({
      id: uniqueGameId(candidate.id, existingIds),
      name: candidate.title,
      category: "import-review",
      thumbnail: candidate.image || undefined,
      url: candidate.href,
      tier: 3,
      reliability: "yellow",
      description: `Captured from ${candidate.sourceUrl || "browser export"}`,
      tags: ["captured", "reviewed"],
      evidence: candidate.evidence,
    }))
    .map((game) => {
      if (!game.thumbnail) delete game.thumbnail;
      return game;
    });
  fs.writeFileSync(gamesPath, `${JSON.stringify([...games, ...additions], null, 2)}\n`);
  report.applied = additions.length;
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(
  `[import-captures] ${candidates.length} candidates written to ${path.relative(root, candidatesPath)}${apply ? " (--apply checked approved candidates)" : ""}`,
);
