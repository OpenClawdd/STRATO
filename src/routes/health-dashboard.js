import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";

const router = Router();
const GAMES_PATH = path.join(process.cwd(), "public/assets/games.json");
const CSV_PATH = path.join(process.cwd(), ".strato-reports/source-domains.csv");

const BLOCKED = new Set(["proxies", "directories"]);

function isPlayable(g) {
  if (g.reliability === "red") return false;
  if (g.urlKind === "directory") return false;
  const cats = [].concat(g.blockedCategories || [], g.category || []);
  return !cats.some((c) => BLOCKED.has(String(c).toLowerCase()));
}

function parseCsv(text) {
  if (!text.trim()) return [];
  const lines = text.trim().split("\n");
  const header = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  return lines
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const cols = line
        .split(",")
        .map((c) => c.trim().replace(/^["']|["']$/g, ""));
      return {
        family: cols[idx.family] || cols[idx.domain] || "unknown",
        total: Number(cols[idx.total] || 0),
        playable: Number(cols[idx.playable] || 0),
        lastChecked: cols[idx.lastChecked] || null,
      };
    });
}

router.get("/api/health/summary", async (req, res) => {
  try {
    const games = JSON.parse(await fs.readFile(GAMES_PATH, "utf8"));
    const csv = await fs.readFile(CSV_PATH, "utf8").catch(() => "");
    const csvFamilies = parseCsv(csv);

    const byFamily = new Map(csvFamilies.map((f) => [f.family, { ...f }]));

    for (const g of games) {
      const family = g.sourceFamily || "unknown";
      if (!byFamily.has(family)) {
        byFamily.set(family, {
          family,
          total: 0,
          playable: 0,
          lastChecked: new Date().toISOString(),
        });
      }
      const f = byFamily.get(family);
      f.total++;
      if (isPlayable(g)) f.playable++;
    }

    const families = [...byFamily.values()]
      .map((f) => ({
        name: f.family,
        total: f.total,
        playable: f.playable,
        deadPct: f.total ? Math.round((1 - f.playable / f.total) * 100) : 0,
        lastChecked: f.lastChecked,
      }))
      .sort((a, b) => b.deadPct - a.deadPct || b.total - a.total);

    res.json({ generatedAt: new Date().toISOString(), families });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
