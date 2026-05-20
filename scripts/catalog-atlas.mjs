import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const catalogPath = "public/assets/games.json";
const healthPath = ".strato-reports/catalog-source-health.json";
const mirrorsPath = ".strato-reports/repair/adfree-games.json";

export function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function cleanHost(host) {
  return String(host || "").toLowerCase().replace(/^www\./, "");
}

export function toURL(value) {
  if (typeof value !== "string") return null;
  const val = value.trim();
  if (!val.startsWith("/") && !/^https?:\/\//i.test(val)) return null;
  try {
    return new URL(val, "http://localhost:8080");
  } catch {
    return null;
  }
}

const sourceFamilies = [
  ["selenite", ["selenite.cc", "selenite"]],
  ["1key", ["1key", "1-key", "onekey"]],
  ["lucide", ["lucide"]],
  ["frogiee", ["frogiee", "frogies", "frogiesarcade"]],
  ["cherri", ["cherri"]],
  ["gn-math", ["gn-math.dev", "gn-math", "gn_math"]]
];

export function familiesFor(game) {
  const text = JSON.stringify(game).toLowerCase();
  const hit = [];
  for (const [family, needles] of sourceFamilies) {
    if (needles.some((needle) => text.includes(needle))) {
      hit.push(family);
    }
  }
  return hit.length ? hit : ["unknown"];
}

export function isGenericUrl(urlStr) {
  const urlObj = toURL(urlStr);
  if (!urlObj) return true;
  const pathname = urlObj.pathname.replace(/\/+$/, "").toLowerCase();
  const genericPaths = new Set(["", "/", "/projects", "/games", "/game", "/play", "/apps", "/app"]);
  return genericPaths.has(pathname);
}

function main() {
  if (!fs.existsSync(catalogPath)) {
    console.error(`❌ Catalog not found at ${catalogPath}`);
    process.exit(1);
  }

  const games = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  console.log(`🛰️ STRATO Atlas auditing ${games.length} entries...`);

  // Load prior health reports if available
  let healthMap = new Map();
  if (fs.existsSync(healthPath)) {
    try {
      const healthData = JSON.parse(fs.readFileSync(healthPath, "utf8"));
      if (Array.isArray(healthData)) {
        for (const item of healthData) {
          healthMap.set(item.id, item);
        }
      }
    } catch (e) {
      console.warn(`⚠️ Failed to parse health report: ${e.message}`);
    }
  }

  // Load mirrors database
  let mirrorsMap = new Map();
  if (fs.existsSync(mirrorsPath)) {
    try {
      const mirrorsData = JSON.parse(fs.readFileSync(mirrorsPath, "utf8"));
      if (Array.isArray(mirrorsData)) {
        for (const item of mirrorsData) {
          if (item.name && item.url) {
            mirrorsMap.set(normalize(item.name), item.url);
          }
        }
      }
    } catch (e) {
      console.warn(`⚠️ Failed to parse mirrors file: ${e.message}`);
    }
  }

  // General counts
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;
  
  const domainCounts = new Map();
  const familyCounts = new Map();
  
  const normalizedTitleGroups = new Map();
  const missingThumbnails = [];
  const suspiciousCategories = [];
  const quarantinedGames = [];

  for (const game of games) {
    const rel = game.reliability || "red";
    if (rel === "green") greenCount++;
    else if (rel === "yellow") yellowCount++;
    else redCount++;

    // Domain tally
    const urlObj = toURL(game.url);
    if (urlObj && /^https?:$/i.test(urlObj.protocol)) {
      const domain = cleanHost(urlObj.hostname);
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    } else {
      domainCounts.set("local_or_relative", (domainCounts.get("local_or_relative") || 0) + 1);
    }

    // Family tally
    const fams = familiesFor(game);
    for (const f of fams) {
      familyCounts.set(f, (familyCounts.get(f) || 0) + 1);
    }

    // Duplicate grouping
    const titleKey = normalize(game.name || game.title);
    if (titleKey) {
      if (!normalizedTitleGroups.has(titleKey)) {
        normalizedTitleGroups.set(titleKey, []);
      }
      normalizedTitleGroups.get(titleKey).push(game);
    }

    // Missing thumbnail checks
    if (!game.thumbnail || game.thumbnail.trim() === "" || game.thumbnail.includes("placeholder")) {
      missingThumbnails.push(game);
    }

    // Suspicious category/tags checks
    const cat = String(game.category || "").trim().toLowerCase();
    if (!cat || cat === "test" || cat === "unknown" || cat === "games") {
      suspiciousCategories.push(game);
    }

    // Store red games for scoring
    if (rel === "red") {
      quarantinedGames.push(game);
    }
  }

  // Find duplicate title clusters
  const duplicateClusters = [];
  for (const [titleKey, group] of normalizedTitleGroups.entries()) {
    if (group.length > 1) {
      duplicateClusters.push({
        titleKey,
        name: group[0].name || group[0].title,
        entries: group.map(g => ({ id: g.id, url: g.url, reliability: g.reliability }))
      });
    }
  }

  // Score repair candidates
  const scoredCandidates = quarantinedGames.map(game => {
    let score = 0;
    const reasons = [];

    const titleKey = normalize(game.name || game.title);

    // 1. Duplicate exists with working source (+40)
    const cluster = normalizedTitleGroups.get(titleKey) || [];
    const workingDup = cluster.find(g => g.id !== game.id && (g.reliability === "green" || g.reliability === "yellow"));
    if (workingDup) {
      score += 40;
      reasons.push("Working duplicate exists");
    }

    // 2. Safe mirror candidate exists in adfree (+40)
    const mirrorUrl = mirrorsMap.get(titleKey);
    if (mirrorUrl) {
      score += 40;
      reasons.push("Safe mirror candidate found");
    }

    // 3. Probed failure reason
    const healthItem = healthMap.get(game.id);
    let failureStatus = "unknown";
    if (healthItem) {
      failureStatus = healthItem.status || "unknown";
      if (failureStatus === "dead_launch" || failureStatus === "missing_source") {
        score += 15;
        reasons.push("Highly repairable link failure");
      } else if (failureStatus === "generic_only") {
        score += 5;
        reasons.push("Generic page trap block");
      }
    }

    // 4. Source family trust
    const fams = familiesFor(game);
    const hasTrustedFamily = fams.some(f => f !== "unknown");
    if (hasTrustedFamily) {
      score += 5;
      reasons.push("Recognized source family");
    }

    // 5. Metadata quality
    if (game.description && game.description.length > 15) {
      score += 5;
      reasons.push("Valid description text");
    }
    if (game.tags && game.tags.length > 0) {
      score += 5;
      reasons.push("Tag categorization present");
    }

    // 6. Generic landing page/root domain penalty (-30)
    if (isGenericUrl(game.url)) {
      score -= 30;
      reasons.push("Homepage or root domain trap risk");
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return {
      id: game.id,
      title: game.name || game.title,
      currentUrl: game.url,
      mirrorUrl: mirrorUrl || "",
      score,
      failureReason: failureStatus,
      families: fams,
      reasons
    };
  }).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  // Top domains & families sorted
  const sortedDomains = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]);
  const sortedFamilies = [...familyCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Write reports
  fs.mkdirSync(".strato-reports", { recursive: true });

  // Only include high-feasibility candidates (score >= 25) in the generated queue files to keep diffs compact and readable
  const queueCandidates = scoredCandidates.filter(c => c.score >= 25);

  // 1. Write repair-queue.json
  fs.writeFileSync(".strato-reports/repair-queue.json", JSON.stringify(queueCandidates, null, 2) + "\n");

  // 2. Write repair-queue.csv
  const csvHeaders = "score,id,title,failure_reason,mirror_found,current_url,mirror_url,reasons";
  const csvLines = [
    csvHeaders,
    ...queueCandidates.map(c => {
      const escape = (val) => `"${String(val ?? "").replaceAll('"', '""')}"`;
      return [
        c.score,
        escape(c.id),
        escape(c.title),
        escape(c.failureReason),
        c.mirrorUrl ? "yes" : "no",
        escape(c.currentUrl),
        escape(c.mirrorUrl),
        escape(c.reasons.join(" | "))
      ].join(",");
    })
  ];
  fs.writeFileSync(".strato-reports/repair-queue.csv", csvLines.join("\n") + "\n");

  // 3. Write atlas-summary.md
  const md = [
    "# STRATO Catalog Atlas Summary",
    "",
    `Audit timestamp: \`${new Date().toISOString()}\``,
    `Total catalog games: **${games.length}**`,
    "",
    "## 📊 Reliability Breakdown",
    `* **Green (Local Verified)**: **${greenCount}**`,
    `* **Yellow (Active Remote)**: **${yellowCount}**`,
    `* **Red (Quarantined)**: **${redCount}**`,
    `* **Active checked playable candidates**: **${greenCount + yellowCount}**`,
    "",
    "## 📚 Top Source Families",
    "| Family | Counts |",
    "|---|---:|",
    ...sortedFamilies.slice(0, 10).map(([f, c]) => `| ${f} | ${c} |`),
    "",
    "## 🌐 Top Domains",
    "| Domain | Counts |",
    "|---|---:|",
    ...sortedDomains.slice(0, 15).map(([d, c]) => `| ${d} | ${c} |`),
    "",
    `## ⚠️ Quality Diagnostics`,
    `* **Missing or Empty Thumbnails**: **${missingThumbnails.length}** games`,
    `* **Suspicious or Missing Categories**: **${suspiciousCategories.length}** games`,
    `* **Duplicate Title Clusters**: **${duplicateClusters.length}** clusters`,
    "",
    duplicateClusters.length > 0 ? [
      "### Duplicate Clusters Highlight",
      "",
      "| Title | Matches |",
      "|---|---|",
      ...duplicateClusters.slice(0, 15).map(cluster => {
        const matches = cluster.entries.map(e => `${e.id} (${e.reliability})`).join(", ");
        return `| **${cluster.name}** | ${matches} |`;
      })
    ].join("\n") : "",
    "",
    "## 🛠️ Top Repair Candidates (High Feasibility Red Entries)",
    "These quarantined items are scored based on mirror availability, duplicate presence, and diagnostic failure categories.",
    "",
    "| Score | Title | ID | Failure Status | Candidate Mirror |",
    "|---:|---|---|---|---|",
    ...scoredCandidates.slice(0, 30).map(c => {
      const hasMirror = c.mirrorUrl ? `\`${c.mirrorUrl.slice(0, 45)}...\`` : "None";
      return `| **${c.score}** | ${c.title} | \`${c.id}\` | \`${c.failureReason}\` | ${hasMirror} |`;
    }),
    ""
  ].join("\n");

  fs.writeFileSync(".strato-reports/atlas-summary.md", md);

  console.log("✅ STRATO Atlas report generation completed.");
  console.log("- Reports written to `.strato-reports/` (atlas-summary.md, repair-queue.json, repair-queue.csv).");
}

const isMain = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith("catalog-atlas.mjs")
);

if (isMain) {
  main();
}
