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
  const provided = req.headers["x-admin-secret"] || req.query.admin_secret;
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

    res.json({
      success: true,
      pulse: {
        totalHealthy: sources.filter((s) => s.status === "healthy").length,
        totalQuarantined: quarantine.length,
        totalMirrors: sources.filter((s) => s.status === "duplicate").length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate sources pulse" });
  }
});

// ── GET /api/admin/quarantine — List all quarantined sources ──
router.get("/api/admin/quarantine", async (req, res) => {
  try {
    const items = await store.getAll("quarantine");
    res.json({ success: true, items });
  } catch (err) {
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

    // Move to sources
    const newSource = await store.create("sources", {
      title: item.title,
      rawUrl: item.rawUrl,
      normalizedUrl: item.normalizedUrl,
      sourceType: item.sourceType || "unknown",
      status: "healthy",
      comment: item.comment || "",
    });

    // Create initial trust score history
    await store.create("trust_scores", {
      sourceId: newSource.id,
      score: 100,
      events: [{ type: "approved", ts: new Date().toISOString() }],
    });

    await store.deleteOne("quarantine", (i) => i.id === req.params.id);
    res.json({ success: true, source: newSource });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve source" });
  }
});

// ── POST /api/admin/quarantine/:id/duplicate — Mark as duplicate mirror ──
router.post("/api/admin/quarantine/:id/duplicate", async (req, res) => {
  try {
    const { canonicalId } = req.body;
    if (!canonicalId)
      return res.status(400).json({ error: "Canonical ID required" });

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
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as duplicate" });
  }
});

export default router;
