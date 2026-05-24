import fs from "node:fs";
import path from "node:path";

const catalogPath = "public/assets/games.json";
const healthPath = ".strato-reports/catalog-source-health.json";
const repairBacklogPath = ".strato-reports/repair/repair-backlog.json";

const games = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const healthData = JSON.parse(fs.readFileSync(healthPath, "utf8"));
const backlog = JSON.parse(fs.readFileSync(repairBacklogPath, "utf8"));

const healthMap = new Map(healthData.map(item => [item.id, item]));

// Priority candidates (Top 25)
const candidates = backlog.slice(0, 25);

const BASE = "http://localhost:8080";

async function probe(url) {
  if (!url) return { ok: false };
  try {
    // If it's a relative URL, prepend BASE
    const fullUrl = url.startsWith("/") ? `${BASE}${url}` : url;

    // We use a real fetch but through the proxy route to see if it's embeddable
    // Actually, for simplicity, we just check if the URL itself is alive
    // and doesn't have XFO: DENY
    const resp = await fetch(fullUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return { ok: false, status: resp.status };

    const xfo = resp.headers.get("x-frame-options");
    if (xfo && (xfo.toUpperCase() === "DENY" || xfo.toUpperCase() === "SAMEORIGIN")) {
      return { ok: false, reason: "XFO", xfo };
    }

    return { ok: true, status: resp.status };
  } catch (e) {
    return { ok: false, reason: "error", error: e.message };
  }
}

async function repair() {
  let repairedCount = 0;
  const updatedGames = [...games];

  for (const candidate of candidates) {
    console.log(`🧪 Probing repair for ${candidate.id}: ${candidate.title}...`);

    const gameIndex = updatedGames.findIndex(g => g.id === candidate.id);
    if (gameIndex === -1) continue;

    const game = updatedGames[gameIndex];

    // Attempt 1: Check if current URL is actually OK (maybe it was a transient failure)
    const result1 = await probe(game.url);
    if (result1.ok) {
      console.log(`  ✅ Current URL is actually working!`);
      updatedGames[gameIndex] = { ...game, reliability: "green", needsReview: false };
      repairedCount++;
      continue;
    }

    // Attempt 2: Pattern replacement for Selenite
    if (game.url.includes("selenite.cc/projects/")) {
      const altUrl = game.url.replace("/projects/", "/games/");
      console.log(`  🔍 Trying Selenite mirror: ${altUrl}`);
      const result2 = await probe(altUrl);
      if (result2.ok) {
        console.log(`  ✅ Found working Selenite mirror!`);
        updatedGames[gameIndex] = { ...game, url: altUrl, reliability: "green", needsReview: false };
        repairedCount++;
        continue;
      }
    }

    // Attempt 3: Frogiee mirror
    const frogieeUrl = `https://play.frogiee.one/projects/${candidate.id}`;
    console.log(`  🔍 Trying Frogiee mirror: ${frogieeUrl}`);
    const result3 = await probe(frogieeUrl);
    if (result3.ok) {
      console.log(`  ✅ Found working Frogiee mirror!`);
      updatedGames[gameIndex] = { ...game, url: frogieeUrl, reliability: "green", needsReview: false, provider: "frogiee" };
      repairedCount++;
      continue;
    }

    console.log(`  ❌ No simple repair found.`);
  }

  if (repairedCount > 0) {
    fs.writeFileSync(catalogPath, JSON.stringify(updatedGames, null, 2) + "\n");
    console.log(`\n🎉 Repaired ${repairedCount} games in Batch 1!`);
  } else {
    console.log(`\n😔 No games repaired in this batch.`);
  }
}

repair();
