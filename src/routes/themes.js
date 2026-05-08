import { Router } from "express";
import store from "../db/store.js";

const router = Router();

// ── Valid config keys for theme ──
const VALID_CONFIG_KEYS = new Set([
  "accent",
  "bg",
  "glass",
  "font",
  "text",
  "surface",
  "border",
  "shadow",
  "radius",
  "animations",
]);

// ── GET /api/themes — List all themes (paginated) ──
router.get("/api/themes", async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const sort = req.query.sort || "newest";

    let sortField = "created_at";
    let sortOrder = "desc";

    if (sort === "downloads") {
      sortField = "downloads";
      sortOrder = "desc";
    } else if (sort === "top") {
      sortField = "downloads";
      sortOrder = "desc";
    } else if (sort === "newest") {
      sortField = "created_at";
      sortOrder = "desc";
    }

    const result = await store.query("themes", () => true, {
      sort: { field: sortField, order: sortOrder },
      page,
      limit: Math.min(limit, 50),
    });

    res.json({
      total: result.total,
      page: result.page,
      limit: result.limit,
      themes: result.data.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        config: t.config,
        created_by: t.created_by,
        downloads: t.downloads || 0,
        created_at: t.created_at,
      })),
    });
  } catch (err) {
    console.error("[STRATO] Themes GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch themes" });
  }
});

// ── GET /api/themes/:code — Get specific theme config ──
router.get("/api/themes/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const theme = await store.getOne("themes", (t) => t.code === code);
    if (!theme) {
      return res.status(404).json({ error: "Theme not found" });
    }

    res.json({
      id: theme.id,
      name: theme.name,
      code: theme.code,
      config: theme.config,
      created_by: theme.created_by,
      downloads: theme.downloads || 0,
      created_at: theme.created_at,
      updated_at: theme.updated_at,
    });
  } catch (err) {
    console.error("[STRATO] Theme GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch theme" });
  }
});

// ── POST /api/themes — Create a theme ──
router.post("/api/themes", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, code, config } = req.body;

    if (
      !name ||
      typeof name !== "string" ||
      name.trim().length < 1 ||
      name.trim().length > 50
    ) {
      return res
        .status(400)
        .json({ error: "Theme name must be 1-50 characters" });
    }

    if (
      !code ||
      typeof code !== "string" ||
      !/^[a-z0-9-]+$/.test(code) ||
      code.length > 50
    ) {
      return res.status(400).json({
        error:
          "Theme code must be lowercase alphanumeric with dashes, max 50 chars",
      });
    }

    if (!config || typeof config !== "object") {
      return res.status(400).json({ error: "Theme config object is required" });
    }

    // Validate config keys
    for (const key of Object.keys(config)) {
      if (!VALID_CONFIG_KEYS.has(key)) {
        return res.status(400).json({ error: `Invalid config key: ${key}` });
      }
    }

    // Check if code is already taken
    const existing = await store.getOne("themes", (t) => t.code === code);
    if (existing) {
      return res.status(409).json({ error: "Theme code is already taken" });
    }

    const theme = await store.create("themes", {
      name: name.trim(),
      code,
      config,
      created_by: username,
      downloads: 0,
    });

    res.status(201).json({
      id: theme.id,
      name: theme.name,
      code: theme.code,
      config: theme.config,
      created_by: theme.created_by,
      downloads: theme.downloads,
      created_at: theme.created_at,
    });
  } catch (err) {
    console.error("[STRATO] Theme POST error:", err.message);
    res.status(500).json({ error: "Failed to create theme" });
  }
});

// ── POST /api/themes/:code/install — Increment download count ──
router.post("/api/themes/:code/install", async (req, res) => {
  try {
    const { code } = req.params;

    const theme = await store.getOne("themes", (t) => t.code === code);
    if (!theme) {
      return res.status(404).json({ error: "Theme not found" });
    }

    await store.update("themes", (t) => t.code === code, {
      downloads: (theme.downloads || 0) + 1,
    });

    res.json({ success: true, downloads: (theme.downloads || 0) + 1 });
  } catch (err) {
    console.error("[STRATO] Theme install error:", err.message);
    res.status(500).json({ error: "Failed to install theme" });
  }
});

// ── DELETE /api/themes/:code — Delete theme (creator only) ──
router.delete("/api/themes/:code", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { code } = req.params;

    const theme = await store.getOne("themes", (t) => t.code === code);
    if (!theme) {
      return res.status(404).json({ error: "Theme not found" });
    }

    if (theme.created_by !== username) {
      return res
        .status(403)
        .json({ error: "Only the creator can delete this theme" });
    }

    await store.deleteOne("themes", (t) => t.code === code);

    res.json({ success: true });
  } catch (err) {
    console.error("[STRATO] Theme DELETE error:", err.message);
    res.status(500).json({ error: "Failed to delete theme" });
  }
});

export default router;
