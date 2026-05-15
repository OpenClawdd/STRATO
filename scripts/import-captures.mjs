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
  "menu",
  "play",
  "more",
  "back",
  "next",
  "previous",
]);

const TITLE_OVERRIDES = new Map(
  Object.entries({
    "1v1lol": "1v1 LOL",
    "10minutestilldawn": "10 Minutes Till Dawn",
    "basketball-stars": "Basketball Stars",
    basketballstars: "Basketball Stars",
    bitlife: "BitLife",
    cookieclicker: "Cookie Clicker",
    cuttherope: "Cut the Rope",
    crossyroad: "Crossy Road",
    ageofwar: "Age of War",
    badicecream: "Bad Ice Cream",
    bloonspp1: "Bloons Player Pack 1",
    btd5: "Bloons TD 5",
    webdash: "Geometry Dash",
    amongus: "Among Us",
    subway: "Subway Surfers",
    "subway-surfers": "Subway Surfers",
    flappybird: "Flappy Bird",
    run3: "Run 3",
    papaspizzeria: "Papa's Pizzeria",
    papasburgeria: "Papa's Burgeria",
    papasfreezeria: "Papa's Freezeria",
    slope: "Slope",
    tunnelrush: "Tunnel Rush",
  }),
);

const QUESTIONABLE_TERMS = [
  "horror",
  "blood",
  "dead",
  "death",
  "zombie",
  "murder",
  "kill",
  "gun",
  "shoot",
  "sniper",
  "war",
  "doom",
  "fnaf",
  "casino",
  "poker",
  "blackjack",
  "slot",
  "dating",
  "date",
  "strip",
  "sex",
  "hentai",
];

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

function normalizeText(value) {
  return clean(value).toLowerCase();
}

function normalizeHref(value, sourceUrl = "") {
  const href = clean(value);
  if (!href) return "";
  try {
    return new URL(href, sourceUrl || undefined).toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return href.toLowerCase();
  }
}

function providerFromSource(sourceUrl) {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("selenite.cc")) return "selenite";
    if (host.includes("gn-math.dev")) return "gn-math";
    if (host.includes("1key.lol")) return "1key";
    if (host.includes("frogie")) return "frogie";
    if (host.includes("lucide")) return "lucide";
    if (host.includes("vapor")) return "vapor";
    return host;
  } catch {
    return "unknown";
  }
}

function safeUrl(value, sourceUrl = "") {
  const href = clean(value);
  if (!href) return "";
  try {
    return new URL(href, sourceUrl || undefined).toString();
  } catch {
    return href;
  }
}

function slugFromHref(value, sourceUrl = "") {
  const href = clean(value);
  if (!href) return "";
  try {
    const url = new URL(href, sourceUrl || undefined);
    return slugify(url.pathname.split("/").filter(Boolean).pop() || "");
  } catch {
    return slugify(href.split("/").filter(Boolean).pop() || href);
  }
}

function prettifyTitle(value, fallbackSlug = "") {
  const raw = clean(value);
  const key = slugify(raw || fallbackSlug);
  const compactKey = key.replace(/-/g, "");
  if (TITLE_OVERRIDES.has(key)) return TITLE_OVERRIDES.get(key);
  if (TITLE_OVERRIDES.has(compactKey)) return TITLE_OVERRIDES.get(compactKey);

  const source = raw || fallbackSlug;
  const spaced = clean(
    source
      .replace(/[_-]+/g, " ")
      .replace(/([a-z])([0-9])/gi, "$1 $2")
      .replace(/([0-9])([a-z])/gi, "$1 $2"),
  );

  return spaced
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (["io", "lol", "td", "btd", "html5"].includes(lower)) return lower.toUpperCase();
      if (/^[0-9]+$/.test(part)) return part;
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

function normalizeImage(value) {
  const image = clean(value);
  if (!image) return null;
  const lower = image.toLowerCase();
  if (
    lower.includes("/placeholder") ||
    lower.endsWith("placeholder.png") ||
    lower.endsWith("placeholder.jpg") ||
    lower.endsWith("placeholder.jpeg") ||
    lower.endsWith("placeholder.webp")
  ) {
    return null;
  }
  return image;
}

function normalizeCandidateHref(item, sourceUrl, provider) {
  const rawHref = clean(item.href || item.url);
  const slug = slugify(item.slug || slugFromHref(rawHref, sourceUrl) || item.text || item.title);
  if (provider === "selenite" && slug) {
    return `https://selenite.cc/projects/${slug}`;
  }
  return safeUrl(rawHref, sourceUrl);
}

function needsHumanReview(title, slug) {
  const haystack = `${normalizeText(title)} ${normalizeText(slug)}`;
  return QUESTIONABLE_TERMS.some((term) => haystack.includes(term));
}

function isNavJunk(item) {
  const text = clean(item.text || item.title || item.alt);
  const key = text.toLowerCase();
  if (!key || NAV_JUNK.has(key)) return true;
  if (key.length <= 2) return true;
  const href = clean(item.href);
  return !href && !item.image && NAV_JUNK.has(key.replace(/[^a-z]/g, ""));
}

function normalizeCapture(raw, file, stats) {
  const sourceUrl = clean(raw.sourceUrl || raw.url || raw.origin || "");
  const capturedAt = clean(raw.capturedAt || raw.timestamp || "");
  const provider = providerFromSource(sourceUrl);
  const items = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw)
      ? raw
      : [];

  stats.rawItems += items.length;

  return items
    .filter((item) => item && typeof item === "object")
    .filter((item) => {
      const keep = !isNavJunk(item);
      if (!keep) stats.navJunkSkipped += 1;
      return keep;
    })
    .map((item, index) => {
      const rawHref = clean(item.href || item.url);
      const href = normalizeCandidateHref(item, sourceUrl, provider);
      const slug = slugify(item.slug || slugFromHref(rawHref || href, sourceUrl));
      const title = prettifyTitle(item.text || item.title || item.name || item.alt, slug);
      const image = normalizeImage(item.image || item.thumbnail || item.img);
      const idBase = slugify(title || slug || href || `${path.basename(file)}-${index}`);
      const reviewRequired = needsHumanReview(title, slug);
      if (!image) stats.nullThumbnails += 1;
      if (reviewRequired) stats.needsReview += 1;
      return {
        id: idBase,
        provider,
        source: provider,
        type: "game",
        category: "games",
        sourceUrl,
        sourceTitle: clean(raw.title),
        title,
        text: clean(item.text || item.title || item.name || item.alt),
        href,
        image,
        capturedAt: capturedAt || null,
        slug,
        reliability: "yellow",
        tier: 3,
        needsCheck: true,
        needsReview: reviewRequired,
        tags: ["captured", provider, "external", "needs-check"].filter(Boolean),
        approved: provider === "selenite",
        reviewStatus: provider === "selenite" ? "approved" : "pending",
        evidence: {
          sourceFile: path.relative(root, file),
          provider,
          sourceUrl,
          sourceEvidence: clean(item.sourceEvidence || item.evidence),
          title: clean(raw.title),
          text: clean(item.text || item.title || item.name || item.alt),
          href,
          image,
          capturedAt: capturedAt || null,
          className: clean(item.className),
          tag: clean(item.tag),
        },
      };
    })
    .filter((candidate) => candidate.title || candidate.href || candidate.image);
}

function dedupe(candidates, stats) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${normalizeText(candidate.title)}|${normalizeHref(candidate.href, candidate.sourceUrl)}`;
    if (seen.has(key)) {
      stats.duplicatesSkipped += 1;
      return false;
    }
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

const stats = {
  rawItems: 0,
  navJunkSkipped: 0,
  duplicatesSkipped: 0,
  nullThumbnails: 0,
  needsReview: 0,
};

const candidates = dedupe(
  files.flatMap((file) => {
    try {
      return normalizeCapture(readJson(file), file, stats);
    } catch (error) {
      return [
        {
          id: slugify(path.basename(file)),
          provider: "unknown",
          sourceUrl: "",
          sourceTitle: "",
          title: "",
          text: "",
          href: "",
          image: null,
          capturedAt: null,
          importError: error.message,
          evidence: { sourceFile: path.relative(root, file), error: error.message },
        },
      ];
    }
  }).filter((candidate) => !candidate.importError),
  stats,
);

const providerCounts = candidates.reduce((counts, candidate) => {
  counts[candidate.provider] = (counts[candidate.provider] || 0) + 1;
  return counts;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  captureFiles: files.map((file) => path.relative(root, file)),
  rawItems: stats.rawItems,
  candidatesFound: candidates.length,
  candidates: candidates.length,
  duplicatesSkipped: stats.duplicatesSkipped,
  navJunkSkipped: stats.navJunkSkipped,
  nullThumbnails: stats.nullThumbnails,
  needsReview: stats.needsReview,
  providerCounts,
  applyRequired: !apply,
  apply,
  note: "Review-first capture output. Selenite candidates are source-backed yellow/external entries; Cherri is screenshot-only.",
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
      category: candidate.category || "games",
      thumbnail: candidate.image,
      url: candidate.href,
      type: candidate.type || "game",
      tier: candidate.tier || 3,
      reliability: candidate.reliability || "yellow",
      description: `Source-backed candidate from ${candidate.sourceUrl || "browser export"}. Needs check before promotion.`,
      tags: ["captured", "reviewed", "external", "needs-check", candidate.provider].filter(Boolean),
      source: candidate.provider,
      provider: candidate.provider,
      needsCheck: true,
      needsReview: Boolean(candidate.needsReview),
      sourceUrl: candidate.sourceUrl,
      sourceEvidence: candidate.evidence?.sourceEvidence || null,
      evidence: candidate.evidence,
    }))
    .map((game) => game);
  fs.writeFileSync(gamesPath, `${JSON.stringify([...games, ...additions], null, 2)}\n`);
  report.applied = additions.length;
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(
  `[import-captures] ${candidates.length} candidates written to ${path.relative(root, candidatesPath)}${apply ? " (--apply checked approved candidates)" : ""}`,
);
