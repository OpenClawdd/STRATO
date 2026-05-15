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
const hasPriorReview = fs.existsSync(candidatesPath);
const priorReview = hasPriorReview ? readJson(candidatesPath) : [];

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
    "1datedanger": "1 Date Danger",
    "10minutestilldawn": "10 Minutes Till Dawn",
    "2drocketleague": "2D Rocket League",
    "60sburgerrun": "60 Second Burger Run",
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
    adofai: "A Dance of Fire and Ice",
    adarkroom: "A Dark Room",
    abudathealien: "Abuda the Alien",
    aceattorneyinvestigations: "Ace Attorney Investigations",
    aceattorneyapollojustice: "Ace Attorney: Apollo Justice",
    aceattorneyjusticeforall: "Ace Attorney: Justice for All",
    aceattorneyphoenixwright: "Ace Attorney: Phoenix Wright",
    aceattorneytnt: "Ace Attorney: Trials and Tribulations",
    achieveunlocked: "Achievement Unlocked",
    "achieveunlocked-2": "Achievement Unlocked 2",
    "achievementunlocked-3": "Achievement Unlocked 3",
    advancewars: "Advance Wars",
    "advancewars-2": "Advance Wars 2",
    advancewarsdayofruin: "Advance Wars: Days of Ruin",
    adventuretime: "Adventure Time",
    agariolite: "Agar.io Lite",
    ddlcplus: "DDLC Plus",
    fridaynightfunkin: "Friday Night Funkin'",
    halflife: "Half-Life",
    gtavc: "GTA Vice City",
    hollowknight: "Hollow Knight",
    stardewvalley: "Stardew Valley",
    alteredbeast: "Altered Beast",
    "americanracing-1": "American Racing 1",
    "americanracing-2": "American Racing 2",
    amongusnew: "Among Us New",
    antimatterdimensions: "Antimatter Dimensions",
    apesvshelium: "Apes vs Helium",
    aquaparkslides: "Aquapark Slides",
    awesometanks: "Awesome Tanks",
    baconmaydie: "Bacon May Die",
    "badicecream-2": "Bad Ice Cream 2",
    "badicecream-3": "Bad Ice Cream 3",
    badparenting: "Bad Parenting",
    badpiggies: "Bad Piggies",
    badtimesimulator: "Bad Time Simulator",
    baldisbasics: "Baldi's Basics",
    ballisticchickens: "Ballistic Chickens",
    banjokazooie: "Banjo-Kazooie",
    banjopilot: "Banjo-Pilot",
    banjotooie: "Banjo-Tooie",
    basketbros: "Basket Bros",
    basketrandom: "Basket Random",
    battlebeavers: "Battle Beavers",
    battletoads: "Battletoads",
    bergentruck: "Bergen Truck",
    bigredbutton: "Big Red Button",
    bikechamp: "Bike Champ",
    "bikechamp-2": "Bike Champ 2",
    blacknavywar: "Black Navy War",
    "blacknavywar-2": "Black Navy War 2",
    blockblast: "Block Blast",
    blockzappers: "Block Zappers",
    bloodtournament: "Blood Tournament",
    bloodmoney: "Blood Money",
    "bloonspp-2": "Bloons Player Pack 2",
    "bloonspp-3": "Bloons Player Pack 3",
    castlevaniaiii: "Castlevania III",
    castlevaniadawnofsorrow: "Castlevania: Dawn of Sorrow",
    castlevaniaariaofsorrow: "Castlevania: Aria of Sorrow",
    castlevaniaorderofecclesia: "Castlevania: Order of Ecclesia",
    cavechaos: "Cave Chaos",
    changetype: "Change Type",
    cheesedreams: "Cheese Dreams",
    chooseyourweapon: "Choose Your Weapon",
    "chooseyourweapon-2": "Choose Your Weapon 2",
    "chooseyourweapon-3": "Choose Your Weapon 3",
    chronotrigger: "Chrono Trigger",
    comixzone: "Comix Zone",
    contraiii: "Contra III",
    "controlcraft-2": "Control Craft 2",
    crushthecastle: "Crush the Castle",
    "crushthecastle-2": "Crush the Castle 2",
    diddykongracing: "Diddy Kong Racing",
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

function gnMathResolvedHref(rawHref) {
  const raw = clean(rawHref);
  const match = raw.match(/openGame\((\-?\d+)\)/i);
  if (!match) return null;
  const id = Number(match[1]);
  if (!Number.isFinite(id) || id < 0) return null;
  return `https://gn-math.dev/#game-${id}`;
}

function gnMathIdFromHref(rawHref) {
  const raw = clean(rawHref);
  const match = raw.match(/openGame\((\-?\d+)\)/i);
  if (!match) return null;
  const id = Number(match[1]);
  if (!Number.isFinite(id) || id < 0) return null;
  return String(id);
}

function cleanGnMathTitle(value) {
  let title = clean(value)
    .replace(/^★\s*/u, "")
    .replace(/\s+\d+(?:\.\d+)?(?:k|m)?\s*Plays?$/iu, "")
    .replace(/\s+Plays?$/iu, "")
    .trim();
  title = title.replace(/\s{2,}/g, " ").trim();
  return title;
}

function frogieResolvedHref(rawHref, sourceUrl) {
  const raw = clean(rawHref).replace(/;$/, "");
  if (!raw || /^loadthething\(\)$/i.test(raw)) return null;

  const match =
    raw.match(
      /^(?:window\.location\.href|window\.open|launch)\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?$/i,
    ) ||
    raw.match(
      /^window\.location\.href\s*=\s*['"]([^'"]+)['"]\s*;?$/i,
    );

  if (!match) return null;

  let pathValue = clean(match[1]);
  if (!pathValue) return null;
  if (/^https?:\/\//i.test(pathValue)) return pathValue;
  if (!pathValue.startsWith("/")) pathValue = `/${pathValue}`;
  if ([
    "/",
    "/math/",
    "/reading/",
    "/partners.html",
    "/extras.html",
  ].includes(pathValue)) {
    return null;
  }

  try {
    return new URL(pathValue, new URL(sourceUrl).origin).toString();
  } catch {
    return null;
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
  if (provider === "gn-math") {
    return gnMathResolvedHref(rawHref);
  }
  if (provider === "frogie") {
    return frogieResolvedHref(rawHref, sourceUrl);
  }
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

function isGnMathGameCard(item) {
  const className = clean(item.className);
  const href = clean(item.href);
  if (!className.includes("game-card")) return false;
  const id = gnMathIdFromHref(href);
  if (id == null) return false;
  return href.includes("openGame(") && id !== "-1";
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
      if (provider === "gn-math" && !isGnMathGameCard(item)) {
        stats.navJunkSkipped += 1;
        return false;
      }
      const keep = !isNavJunk(item);
      if (!keep) stats.navJunkSkipped += 1;
      return keep;
    })
    .map((item, index) => {
      const rawHref = clean(item.href || item.url);
      const href = normalizeCandidateHref(item, sourceUrl, provider);
      if (provider === "gn-math" && !href) {
        return null;
      }
      if (provider === "frogie" && !href) {
        return null;
      }
      const gnMathId = provider === "gn-math" ? gnMathIdFromHref(rawHref) : null;
      const slug = slugify(item.slug || slugFromHref(rawHref || href, sourceUrl) || gnMathId);
      const titleSource =
        provider === "gn-math"
          ? cleanGnMathTitle(item.text || item.title || item.name || item.alt)
          : item.text || item.title || item.name || item.alt;
      const title = provider === "gn-math"
        ? prettifyTitle(titleSource, slug)
        : prettifyTitle(titleSource, slug);
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
          rawHref,
          gnMathId,
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
    .filter((candidate) => candidate && (candidate.title || candidate.href || candidate.image));
}

function dedupe(candidates, stats) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key =
      candidate.provider === "gn-math" && candidate.evidence?.gnMathId != null
        ? `gn-math|${candidate.evidence.gnMathId}`
        : `${normalizeText(candidate.title)}|${normalizeHref(candidate.href, candidate.sourceUrl)}`;
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

function reviewKey(candidate) {
  return [
    normalizeText(candidate.provider || candidate.source || ""),
    normalizeHref(candidate.href, candidate.sourceUrl),
    normalizeText(candidate.title),
  ].join("|");
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

const priorReviewMap = new Map(
  priorReview
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => [reviewKey(entry), entry]),
);

const mergedCandidates = candidates.map((candidate) => {
  const prior = priorReviewMap.get(reviewKey(candidate));
  if (!prior) return candidate;
  return {
    ...candidate,
    approved: prior.approved ?? candidate.approved,
    reviewStatus: prior.reviewStatus ?? candidate.reviewStatus,
    status: prior.status ?? candidate.status,
    needsReview: prior.needsReview ?? candidate.needsReview,
    notes: prior.notes ?? candidate.notes,
  };
});

const providerCounts = mergedCandidates.reduce((counts, candidate) => {
  counts[candidate.provider] = (counts[candidate.provider] || 0) + 1;
  return counts;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  captureFiles: files.map((file) => path.relative(root, file)),
  rawItems: stats.rawItems,
  candidatesFound: mergedCandidates.length,
  candidates: mergedCandidates.length,
  duplicatesSkipped: stats.duplicatesSkipped,
  navJunkSkipped: stats.navJunkSkipped,
  nullThumbnails: stats.nullThumbnails,
  needsReview: stats.needsReview,
  providerCounts,
  applyRequired: !apply,
  apply,
  note: "Review-first capture output. Selenite candidates are source-backed yellow/external entries; Cherri is screenshot-only.",
};

fs.writeFileSync(candidatesPath, `${JSON.stringify(mergedCandidates, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (apply) {
  const approved = mergedCandidates.filter(
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
  `[import-captures] ${mergedCandidates.length} candidates written to ${path.relative(root, candidatesPath)}${apply ? " (--apply checked approved candidates)" : ""}`,
);
