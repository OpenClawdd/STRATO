#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const catalogPath = path.join(rootDir, "public", "assets", "games.json");

const PLACEHOLDER_URL =
  /^(#|about:blank|\$\{[^}]+\}|https?:\/\/(example\.(com|org|net)|localhost\/?))/i;
const ADULT_TERMS = /\b(porn|xxx|adult|sex|hentai|nsfw)\b/i;
const GAMBLING_TERMS = /\b(casino|slots?|poker|betting|blackjack|roulette)\b/i;
const DIRECTORY_TERMS =
  /\b(proxy|mirror|directory|index|hub|unblocked|exploit|cloak|bypass)\b/i;
const SUSPICIOUS_HOST_TERMS = /\b(proxy|mirror|unblock|bypass|cloak)\b/i;
const SAFE_SCHEMES = new Set(["http:", "https:"]);
const SOURCE_DOCTOR_BASE = "http://localhost:8080";
const SOURCE_DOCTOR_GENERIC_PATHS = new Set([
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
  "/archive",
]);
const SOURCE_DOCTOR_ASSET_EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
  "ico",
  "css",
  "js",
  "mjs",
  "json",
  "mp3",
  "ogg",
  "wav",
  "mp4",
  "webm",
  "woff",
  "woff2",
  "ttf",
  "wasm",
  "data",
  "bin",
]);
const SOURCE_DOCTOR_ASSET_KEYWORDS = [
  "icon",
  "image",
  "img",
  "cover",
  "thumb",
  "thumbnail",
  "splash",
  "logo",
  "poster",
  "banner",
  "background",
  "favicon",
  "asset",
  "assets",
  "resources",
];
const SOURCE_DOCTOR_LAUNCH_KEYWORDS = [
  "url",
  "href",
  "link",
  "source",
  "src",
  "path",
  "embed",
  "iframe",
  "launch",
  "play",
  "game",
  "gameurl",
  "game_url",
];

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function addIssue(issues, severity, type, entry, message) {
  issues.push({
    severity,
    type,
    id: entry?.id || "(no id)",
    title: entry?.name || entry?.title || "(untitled)",
    message,
  });
}

function collectStrings(value, stringPath = "", out = []) {
  if (typeof value === "string") {
    out.push({ path: stringPath, value: value.trim() });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectStrings(item, `${stringPath}[${index}]`, out),
    );
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      collectStrings(item, stringPath ? `${stringPath}.${key}` : key, out);
    }
  }
  return out;
}

function isUrlLike(value) {
  const input = String(value || "").trim();
  return input.startsWith("/") || /^https?:\/\//i.test(input);
}

function toUrl(value) {
  try {
    return new URL(String(value || ""), SOURCE_DOCTOR_BASE);
  } catch {
    return null;
  }
}

function extensionOf(urlObj) {
  const match = String(urlObj?.pathname || "").match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

function pathLooksAsset(rawPath) {
  const lower = String(rawPath || "").toLowerCase();
  return SOURCE_DOCTOR_ASSET_KEYWORDS.some((word) => lower.includes(word));
}

function urlLooksAsset(urlObj) {
  return SOURCE_DOCTOR_ASSET_EXTS.has(extensionOf(urlObj));
}

function isAssetCandidate(item) {
  const urlObj = toUrl(item?.value);
  if (!urlObj) return false;
  return urlLooksAsset(urlObj) || pathLooksAsset(item?.path);
}

function isGenericHub(value) {
  const urlObj = toUrl(value);
  if (!urlObj) return false;
  const normalizedPath = urlObj.pathname.replace(/\/+$/, "").toLowerCase();
  return SOURCE_DOCTOR_GENERIC_PATHS.has(normalizedPath);
}

function isLaunchCandidate(item) {
  if (!isUrlLike(item?.value)) return false;
  if (isAssetCandidate(item)) return false;
  if (isGenericHub(item.value)) return false;
  const pathText = String(item.path || "").toLowerCase();
  if (
    SOURCE_DOCTOR_LAUNCH_KEYWORDS.some((word) => pathText.includes(word))
  ) {
    return true;
  }
  const urlObj = toUrl(item.value);
  if (!urlObj) return false;
  return !urlLooksAsset(urlObj);
}

export function classifyGenericOnlyLikeSourceDoctor(game) {
  const strings = collectStrings(game);
  const urlItems = strings.filter((item) => isUrlLike(item.value));
  const genericUrls = urlItems.filter((item) => isGenericHub(item.value));
  const launchUrls = urlItems.filter((item) => isLaunchCandidate(item));
  return genericUrls.length > 0 && launchUrls.length === 0;
}

function validateUrl(url) {
  if (!url) return { ok: false, reason: "missing URL" };
  if (PLACEHOLDER_URL.test(url))
    return { ok: false, reason: "placeholder URL" };
  if (url.startsWith("/")) return { ok: true };
  try {
    const parsed = new URL(url);
    if (!SAFE_SCHEMES.has(parsed.protocol))
      return {
        ok: false,
        reason: `unsupported URL scheme: ${parsed.protocol}`,
      };
    return { ok: true };
  } catch {
    return { ok: false, reason: "invalid URL" };
  }
}

function isExternalSourceCandidate(game) {
  const tags = Array.isArray(game.tags)
    ? game.tags.map((tag) => normalize(tag))
    : [];
  return Boolean(
    game.provider ||
    game.source ||
    game.needsCheck ||
    game.needsReview ||
    tags.includes("external") ||
    tags.includes("needs-check") ||
    game.reliability === "yellow",
  );
}

async function existsPublicAsset(assetPath) {
  if (!assetPath || !assetPath.startsWith("/")) return true;
  try {
    await fs.access(path.join(rootDir, "public", assetPath));
    return true;
  } catch {
    return false;
  }
}

async function existsPublicFile(publicPath) {
  if (!publicPath || !String(publicPath).startsWith("/")) return true;
  try {
    await fs.access(path.join(rootDir, "public", publicPath));
    return true;
  } catch {
    return false;
  }
}

export async function validateGames(filePath = catalogPath) {
  const raw = await fs.readFile(filePath, "utf8");
  const games = JSON.parse(raw);
  if (!Array.isArray(games)) {
    throw new Error("games.json must contain an array");
  }

  const issues = [];
  const quarantine = [];
  const seenTitles = new Map();
  const seenIds = new Map();
  const seenUrls = new Map();
  const seenTitleUrl = new Map();

  for (const game of games) {
    const title = game.name || game.title;
    const url = game.url;
    const normalizedTitle = normalize(title);
    const normalizedUrl = normalize(url);
    const normalizedPair = `${normalizedTitle}|${normalizedUrl}`;

    if (!title || !String(title).trim())
      addIssue(issues, "error", "missing-title", game, "Missing title/name");
    if (!game.id || !String(game.id).trim()) {
      addIssue(issues, "error", "missing-id", game, "Missing id");
    } else if (seenIds.has(String(game.id))) {
      addIssue(
        issues,
        "error",
        "duplicate-id",
        game,
        `Duplicate id with ${seenIds.get(String(game.id))}`,
      );
    } else {
      seenIds.set(String(game.id), title || game.id);
    }

    if (!url || !String(url).trim()) {
      addIssue(issues, "error", "missing-url", game, "Missing url");
    } else {
      const urlStatus = validateUrl(String(url));
      if (!urlStatus.ok) {
        const severity =
          game.config_required || game.needsConfig ? "warning" : "error";
        addIssue(
          issues,
          severity,
          urlStatus.reason.replace(/\s+/g, "-"),
          game,
          urlStatus.reason,
        );
        if (severity === "error")
          quarantine.push({
            id: game.id,
            title: title || game.id,
            reason: urlStatus.reason,
          });
      } else if (
        String(url).startsWith("/games/") &&
        !(await existsPublicFile(String(url)))
      ) {
        addIssue(
          issues,
          "error",
          "broken-local-game-url",
          game,
          `Local game path does not exist: ${url}`,
        );
        quarantine.push({
          id: game.id,
          title: title || game.id,
          reason: "broken-local-game-url",
        });
      } else if (
        game.reliability === "green" &&
        !String(url).startsWith("/games/")
      ) {
        addIssue(
          issues,
          "error",
          "green-external-url",
          game,
          "Green reliability is reserved for verified local /games paths",
        );
      } else if (!String(url).startsWith("/")) {
        try {
          const parsed = new URL(String(url));
          if (SUSPICIOUS_HOST_TERMS.test(parsed.hostname)) {
            addIssue(
              issues,
              "warning",
              "suspicious-hostname",
              game,
              `Hostname looks like a bypass surface: ${parsed.hostname}`,
            );
          }
        } catch {}
      }
    }

    // Red entries are quarantined and excluded from active catalog surfaces.
    // Skip them in duplicate-url/title deduplication checks so they do not
    // generate false-positive warnings against live entries.
    const isQuarantined = game.reliability === "red";

    if (normalizedTitle && !isQuarantined) {
      if (seenTitles.has(normalizedTitle))
        addIssue(
          issues,
          "warning",
          "duplicate-title",
          game,
          `Duplicate title with ${seenTitles.get(normalizedTitle)}`,
        );
      else seenTitles.set(normalizedTitle, game.id || title);
    }

    if (normalizedUrl && !PLACEHOLDER_URL.test(String(url)) && !isQuarantined) {
      if (seenUrls.has(normalizedUrl))
        addIssue(
          issues,
          "warning",
          "duplicate-url",
          game,
          `Duplicate url with ${seenUrls.get(normalizedUrl)}`,
        );
      else seenUrls.set(normalizedUrl, game.id || title);
    }

    if (normalizedTitle && normalizedUrl && !isQuarantined) {
      if (seenTitleUrl.has(normalizedPair))
        addIssue(
          issues,
          "warning",
          "duplicate-title-url",
          game,
          `Duplicate normalized title+url with ${seenTitleUrl.get(normalizedPair)}`,
        );
      else seenTitleUrl.set(normalizedPair, game.id || title);
    }

    if (!game.category || !String(game.category).trim())
      addIssue(issues, "warning", "missing-category", game, "Missing category");
    if (
      game.tags !== undefined &&
      (!Array.isArray(game.tags) ||
        game.tags.some((tag) => typeof tag !== "string" || !tag.trim()))
    ) {
      addIssue(
        issues,
        "warning",
        "invalid-tags",
        game,
        "Tags must be non-empty strings",
      );
    }

    const thumbnail = String(game.thumbnail || "").trim();
    if (!thumbnail) {
      if (!isExternalSourceCandidate(game)) {
        addIssue(
          issues,
          "warning",
          "missing-thumbnail",
          game,
          "Missing thumbnail; STRATO fallback art will be used",
        );
      }
    } else if (
      PLACEHOLDER_URL.test(thumbnail) ||
      thumbnail.endsWith("/") ||
      /(^|\/)placeholder\.(png|jpe?g|webp|gif)$/i.test(thumbnail)
    ) {
      addIssue(
        issues,
        "warning",
        "broken-thumbnail-looking-value",
        game,
        "Thumbnail looks incomplete",
      );
    } else if (!(await existsPublicAsset(thumbnail))) {
      addIssue(
        issues,
        "warning",
        "missing-thumbnail-file",
        game,
        `Local thumbnail not found: ${thumbnail}`,
      );
    }

    if (!String(game.description || "").trim())
      addIssue(
        issues,
        "warning",
        "empty-description",
        game,
        "Description is empty",
      );

    // Skip adult/gambling/directory content checks for quarantined (red) entries
    // — they are already excluded from active surfaces and the check is noise.
    if (!isQuarantined) {
      if (classifyGenericOnlyLikeSourceDoctor(game)) {
        addIssue(
          issues,
          "error",
          "active-generic-only-launch-candidate",
          game,
          "Active generic_only launch candidates are not allowed. Quarantine or repair these entries.",
        );
        quarantine.push({
          id: game.id,
          title: title || game.id,
          reason: "active-generic-only-launch-candidate",
        });
      }

      const searchableText = `${title || ""} ${game.description || ""} ${(game.tags || []).join(" ")} ${game.category || ""}`;
      if (ADULT_TERMS.test(searchableText)) {
        addIssue(
          issues,
          game.needsReview || isExternalSourceCandidate(game)
            ? "warning"
            : "error",
          "adult-content",
          game,
          "Adult/inappropriate catalog signal",
        );
      }
      if (GAMBLING_TERMS.test(searchableText)) {
        addIssue(
          issues,
          game.needsReview || isExternalSourceCandidate(game)
            ? "warning"
            : "error",
          "gambling-content",
          game,
          "Gambling/casino catalog signal",
        );
      }
      if (
        DIRECTORY_TERMS.test(searchableText) ||
        ["proxies", "directories", "game-hubs"].includes(
          normalize(game.category),
        )
      ) {
        const severity =
          game.config_required || game.needsConfig ? "warning" : "error";
        addIssue(
          issues,
          severity,
          "not-playable-game-surface",
          game,
          "Entry looks like a directory/proxy surface rather than a playable game",
        );
        if (severity === "error")
          quarantine.push({
            id: game.id,
            title: title || game.id,
            reason: "non-playable-game-surface",
          });
      }
    }
  }

  return { games, issues, quarantine };
}

function groupIssues(issues) {
  return issues.reduce((groups, issue) => {
    groups[issue.type] ||= [];
    groups[issue.type].push(issue);
    return groups;
  }, {});
}

function buildTruthReport(games, issues) {
  const reliability = { green: 0, yellow: 0, red: 0, unknown: 0 };
  const trust = {
    verifiedLocal: 0,
    proxyVerified: 0,
    reviewOnly: 0,
    quarantined: 0,
    unknown: 0,
  };
  const duplicateUrls = new Map();
  let genericRootLinks = 0;

  for (const game of games) {
    const rel = String(game?.reliability || "").toLowerCase();
    if (rel === "green" || rel === "yellow" || rel === "red") reliability[rel]++;
    else reliability.unknown++;

    if (rel === "green") trust.verifiedLocal++;
    else if (rel === "yellow") {
      if (hasProxyProof(game)) trust.proxyVerified++;
      else trust.reviewOnly++;
    } else if (rel === "red") trust.quarantined++;
    else trust.unknown++;

    const url = String(game?.url || "").trim();
    if (/^https?:\/\//i.test(url) && isGenericHub(url)) genericRootLinks++;
    if (url && !PLACEHOLDER_URL.test(url)) {
      const bucket = duplicateUrls.get(url) || [];
      bucket.push(String(game?.id || "(no id)"));
      duplicateUrls.set(url, bucket);
    }
  }

  const duplicates = [...duplicateUrls.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([url, ids]) => ({ url, count: ids.length, ids: ids.slice(0, 8) }))
    .sort((a, b) => b.count - a.count || a.url.localeCompare(b.url));

  const issueTypeCounts = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    totalGames: games.length,
    reliability,
    trust,
    diagnostics: {
      genericRootLinks,
      duplicateUrlClusters: duplicates.length,
      topDuplicateUrlClusters: duplicates.slice(0, 25),
    },
    issuesByType: issueTypeCounts,
  };
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { games, issues, quarantine } = await validateGames(
      process.argv[2] ? path.resolve(process.argv[2]) : catalogPath,
    );
    const bad = games.filter(g => String(g.thumbnail||'').includes('/generated/'));
    if (bad.length) {
      console.error(`ERROR: ${bad.length} games still reference /generated/`);
      bad.slice(0,20).forEach(g => console.error(` - ${g.id}: ${g.thumbnail}`));
      process.exit(1);
    }
    const groups = groupIssues(issues);
    const errorCount = issues.filter(
      (issue) => issue.severity === "error",
    ).length;
    const warningCount = issues.filter(
      (issue) => issue.severity === "warning",
    ).length;

    console.log(`STRATO catalog validation`);
    console.log(`Total games: ${games.length}`);
    console.log(
      `Issue count: ${issues.length} (${errorCount} errors, ${warningCount} warnings)`,
    );
    console.log(`Quarantine candidates: ${quarantine.length}`);

    const truthReport = buildTruthReport(games, issues);
    const reportPath = path.join(
      rootDir,
      ".strato-reports",
      "catalog-truth-report.json",
    );
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, `${JSON.stringify(truthReport, null, 2)}\n`);
    console.log(`Truth report: ${path.relative(rootDir, reportPath)}`);

    for (const [type, group] of Object.entries(groups).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      console.log(`\n${type}: ${group.length}`);
      for (const issue of group.slice(0, 12)) {
        console.log(
          `  [${issue.severity}] ${issue.id} / ${issue.title}: ${issue.message}`,
        );
      }
      if (group.length > 12) console.log(`  ... ${group.length - 12} more`);
    }

    if (errorCount > 0) process.exitCode = 1;
  } catch (err) {
    console.error(`[validate-games] ${err.message}`);
    process.exitCode = 1;
  }
}
