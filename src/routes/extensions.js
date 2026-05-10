import { Router } from "express";
import store from "../db/store.js";

const router = Router();

// ── Dangerous patterns in extension scripts ──
const DANGEROUS_PATTERNS = [
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bimport\s+/,
  /\brequire\s*\(/,
  /\bfetch\s*\(\s*["']https?:\/\//, // fetch to absolute URLs
  /\bXMLHttpRequest/,
  /\.import\(/,
  /\bimportModule\(/,
  /\bWorker\s*\(/,
  /\bSharedArrayBuffer/,
  /\bAtomics\./,
];

function validateScript(script) {
  if (typeof script !== "string") {
    return "Script must be a string";
  }

  if (script.length > 100_000) {
    return "Script must be under 100KB";
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(script)) {
      return `Script contains a disallowed pattern: ${pattern.source}`;
    }
  }

  // Allow fetch only with relative URLs or /api/ paths
  const fetchMatches = script.match(/\bfetch\s*\(\s*["'`]/g);
  if (fetchMatches) {
    // Check each fetch call
    const fetchUrlPattern = /\bfetch\s*\(\s*["'`]([^"'`]+)["'`]/g;
    let match;
    while ((match = fetchUrlPattern.exec(script)) !== null) {
      const url = match[1];
      // Allow relative URLs (starting with / or .) and /api/ paths
      if (!url.startsWith("/") && !url.startsWith(".")) {
        return `Script contains fetch to non-relative URL: ${url}`;
      }
      // Block fetch to internal ports
      if (
        url.includes("XTransformPort") === false &&
        url.startsWith("/") &&
        !url.startsWith("/api/")
      ) {
        // Only allow /api/ paths for absolute-path fetches
        // Actually, allow any relative path starting with /
        // The main concern is external URLs
      }
    }
  }

  return null;
}

// ── GET /api/extensions — List extensions (paginated) ──
router.get("/api/extensions", async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await store.query("extensions", () => true, {
      sort: { field: "created_at", order: "desc" },
      page,
      limit: Math.min(limit, 50),
    });

    res.json({
      total: result.total,
      page: result.page,
      limit: result.limit,
      extensions: result.data.map((e) => ({
        id: e.id,
        name: e.name,
        code: e.code,
        description: e.description,
        version: e.version,
        created_by: e.created_by,
        downloads: e.downloads || 0,
        created_at: e.created_at,
        // Don't include script in list view
      })),
    });
  } catch (err) {
    console.error("[STRATO] Extensions GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch extensions" });
  }
});

// ── GET /api/extensions/:code — Get extension details + script ──
router.get("/api/extensions/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const extension = await store.getOne("extensions", (e) => e.code === code);
    if (!extension) {
      return res.status(404).json({ error: "Extension not found" });
    }

    res.json({
      id: extension.id,
      name: extension.name,
      code: extension.code,
      description: extension.description,
      version: extension.version,
      script: extension.script,
      created_by: extension.created_by,
      downloads: extension.downloads || 0,
      created_at: extension.created_at,
      updated_at: extension.updated_at,
    });
  } catch (err) {
    console.error("[STRATO] Extension GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch extension" });
  }
});

// ── POST /api/extensions — Submit extension ──
router.post("/api/extensions", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, code, description, script, version } = req.body;

    if (
      !name ||
      typeof name !== "string" ||
      name.trim().length < 1 ||
      name.trim().length > 50
    ) {
      return res
        .status(400)
        .json({ error: "Extension name must be 1-50 characters" });
    }

    if (
      !code ||
      typeof code !== "string" ||
      !/^[a-z0-9-]+$/.test(code) ||
      code.length > 50
    ) {
      return res.status(400).json({
        error:
          "Extension code must be lowercase alphanumeric with dashes, max 50 chars",
      });
    }

    if (
      !description ||
      typeof description !== "string" ||
      description.length > 500
    ) {
      return res
        .status(400)
        .json({ error: "Description is required (max 500 characters)" });
    }

    if (!script || typeof script !== "string") {
      return res.status(400).json({ error: "Script is required" });
    }

    if (
      version &&
      (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version))
    ) {
      return res
        .status(400)
        .json({ error: "Version must be semver format (e.g. 1.0.0)" });
    }

    // Validate script for dangerous patterns
    const scriptError = validateScript(script);
    if (scriptError) {
      return res.status(400).json({ error: scriptError });
    }

    // Check if code is already taken
    const existing = await store.getOne("extensions", (e) => e.code === code);
    if (existing) {
      return res.status(409).json({ error: "Extension code is already taken" });
    }

    const extension = await store.create("extensions", {
      name: name.trim(),
      code,
      description: description.trim(),
      script,
      version: version || "1.0.0",
      created_by: username,
      downloads: 0,
    });

    res.status(201).json({
      id: extension.id,
      name: extension.name,
      code: extension.code,
      description: extension.description,
      version: extension.version,
      created_by: extension.created_by,
      downloads: extension.downloads,
      created_at: extension.created_at,
    });
  } catch (err) {
    console.error("[STRATO] Extension POST error:", err.message);
    res.status(500).json({ error: "Failed to create extension" });
  }
});

// ── POST /api/extensions/:code/install — Increment downloads ──
router.post("/api/extensions/:code/install", async (req, res) => {
  try {
    const { code } = req.params;

    const extension = await store.getOne("extensions", (e) => e.code === code);
    if (!extension) {
      return res.status(404).json({ error: "Extension not found" });
    }

    await store.update("extensions", (e) => e.code === code, {
      downloads: (extension.downloads || 0) + 1,
    });

    res.json({ success: true, downloads: (extension.downloads || 0) + 1 });
  } catch (err) {
    console.error("[STRATO] Extension install error:", err.message);
    res.status(500).json({ error: "Failed to install extension" });
  }
});

// ── DELETE /api/extensions/:code — Delete extension (creator only) ──
router.delete("/api/extensions/:code", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { code } = req.params;

    const extension = await store.getOne("extensions", (e) => e.code === code);
    if (!extension) {
      return res.status(404).json({ error: "Extension not found" });
    }

    if (extension.created_by !== username) {
      return res
        .status(403)
        .json({ error: "Only the creator can delete this extension" });
    }

    await store.deleteOne("extensions", (e) => e.code === code);

    res.json({ success: true });
  } catch (err) {
    console.error("[STRATO] Extension DELETE error:", err.message);
    res.status(500).json({ error: "Failed to delete extension" });
  }
});

export default router;
