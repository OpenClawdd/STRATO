/**
 * STRATO v6 — Source Hydra 2.0 API Routes
 * Admin panel routes for Quarantine Bay, Canonical Sources, and Trust Engine
 */

import { Router } from "express";
import store from "../db/store.js";

const router = Router();

// Re-use admin auth logic
const ADMIN_SECRET = process.env.ADMIN_SECRET || null;

function requireAdmin(req, res, next) {
  const provided = req.headers["x-admin-secret"];
  if (!ADMIN_SECRET) {
    return res.status(403).json({ error: "Admin disabled" });
  }
  if (!provided || provided !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.use("/api/admin/sources", requireAdmin);
router.use("/api/admin/quarantine", requireAdmin);

// ── GET /api/admin/sources/pulse — Pulse stats ──
router.get("/api/admin/sources/pulse", async (req, res) => {
  try {
    const sources = await store.getAll("sources");
    const quarantine = await store.getAll("quarantine");
    const trustScores = await store.getAll("trust_scores");

    // Aggregate trust metrics
    let avgTrust = 0;
    const distribution = { high: 0, medium: 0, low: 0 };

    if (trustScores.length > 0) {
      let total = 0;
      trustScores.forEach((ts) => {
        total += ts.score;
        if (ts.score >= 90) distribution.high++;
        else if (ts.score >= 70) distribution.medium++;
        else distribution.low++;
      });
      avgTrust = Math.round(total / trustScores.length);
    }

    res.json({
      success: true,
      pulse: {
        totalHealthy: sources.filter((s) => s.status === "healthy").length,
        totalQuarantined: quarantine.length,
        totalMirrors: sources.filter((s) => s.status === "duplicate").length,
        averageTrustScore: avgTrust,
        trustDistribution: distribution,
      },
    });
  } catch (_err) {
    res.status(500).json({ error: "Failed to generate sources pulse" });
  }
});

// ── GET /api/admin/quarantine — List all quarantined sources ──
router.get("/api/admin/quarantine", async (req, res) => {
  try {
    const items = await store.getAll("quarantine");
    res.json({ success: true, items });
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch quarantine bay" });
  }
});

// ── POST /api/admin/quarantine/:id/approve — Approve to sources ──
router.post("/api/admin/quarantine/:id/approve", async (req, res) => {
  try {
    const item = await store.getOne(
      "quarantine",
      (i) => i.id === req.params.id,
    );
    if (!item)
      return res.status(404).json({ error: "Source not found in quarantine" });

    // Validate the source before approval
    const SAFE_URL_RE = /^https?:\/\//i;
    if (!item.title || typeof item.title !== "string" || !item.title.trim()) {
      return res
        .status(400)
        .json({ error: "Validation failed: missing or empty title" });
    }
    if (
      !item.normalizedUrl ||
      typeof item.normalizedUrl !== "string" ||
      !item.normalizedUrl.trim()
    ) {
      return res
        .status(400)
        .json({ error: "Validation failed: missing normalizedUrl" });
    }
    if (!SAFE_URL_RE.test(item.normalizedUrl)) {
      return res
        .status(400)
        .json({ error: "Validation failed: invalid normalizedUrl" });
    }

    const VALID_SOURCE_TYPES = new Set([
      "game-hub",
      "math-tool",
      "proxy",
      "tool",
      "personal",
      "unknown",
    ]);
    const sourceType = item.sourceType || "unknown";
    if (!VALID_SOURCE_TYPES.has(sourceType)) {
      return res.status(400).json({
        error: `Validation failed: invalid sourceType "${sourceType}"`,
      });
    }

    if (item.promotable === true && item.launchable !== true) {
      return res.status(400).json({
        error: `Validation failed: promotable sources must also be launchable`,
      });
    }

    // Move to sources
    const newSource = await store.create("sources", {
      title: item.title,
      rawUrl: item.rawUrl,
      normalizedUrl: item.normalizedUrl,
      sourceType: item.sourceType || "unknown",
      status: "healthy",
      comment: item.comment || "",
      launchable: item.launchable === true,
      promotable: item.promotable === true,
    });

    // Create initial trust score history
    await store.create("trust_scores", {
      sourceId: newSource.id,
      score: 100,
      events: [{ type: "approved", ts: new Date().toISOString() }],
    });

    await store.deleteOne("quarantine", (i) => i.id === req.params.id);
    res.json({ success: true, source: newSource });
  } catch (_err) {
    res.status(500).json({ error: "Failed to approve source" });
  }
});

// ── POST /api/admin/quarantine/:id/duplicate — Mark as duplicate mirror ──
router.post("/api/admin/quarantine/:id/duplicate", async (req, res) => {
  try {
    const { canonicalId } = req.body;
    if (!canonicalId)
      return res.status(400).json({ error: "Canonical ID required" });

    const canonicalSource = await store.getOne(
      "sources",
      (i) => i.id === canonicalId,
    );
    if (!canonicalSource) {
      return res
        .status(400)
        .json({ error: "Canonical source not found in catalog" });
    }

    const item = await store.getOne(
      "quarantine",
      (i) => i.id === req.params.id,
    );
    if (!item)
      return res.status(404).json({ error: "Source not found in quarantine" });

    const newSource = await store.create("sources", {
      ...item,
      status: "duplicate",
      duplicateOf: canonicalId,
    });

    await store.deleteOne("quarantine", (i) => i.id === req.params.id);
    res.json({ success: true, source: newSource });
  } catch (_err) {
    res.status(500).json({ error: "Failed to mark as duplicate" });
  }
});

export default router;
