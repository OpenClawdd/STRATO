import { Router } from "express";
import store from "../db/store.js";

const router = Router();

// ── GET /api/bookmarks — Get user's bookmarks ──
router.get("/api/bookmarks", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const result = await store.query(
      "bookmarks",
      (b) => b.username === username,
      { sort: { field: "created_at", order: "desc" } },
    );

    res.json({
      total: result.total,
      bookmarks: result.data,
    });
  } catch (err) {
    console.error("[STRATO] Bookmarks GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

// ── POST /api/bookmarks — Add a bookmark ──
router.post("/api/bookmarks", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { url, title, favicon } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL format. Local games are same-origin relative paths.
    if (!url.startsWith("/")) {
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }
    }

    if (title && (typeof title !== "string" || title.length > 500)) {
      return res
        .status(400)
        .json({ error: "Title must be under 500 characters" });
    }

    if (favicon && (typeof favicon !== "string" || favicon.length > 500)) {
      return res
        .status(400)
        .json({ error: "Favicon must be under 500 characters" });
    }

    // Check for duplicate bookmark
    const existing = await store.getOne(
      "bookmarks",
      (b) => b.username === username && b.url === url,
    );
    if (existing) {
      return res
        .status(409)
        .json({ error: "Bookmark already exists", id: existing.id });
    }

    const bookmark = await store.create("bookmarks", {
      username,
      url,
      title: title || url,
      favicon: favicon || null,
    });

    // Update user stats
    const user = await store.getOne("users", (u) => u.username === username);
    if (user) {
      await store.update("users", (u) => u.username === username, {
        stats: {
          ...user.stats,
          bookmarks_count: (user.stats?.bookmarks_count || 0) + 1,
        },
      });
    }

    res.status(201).json(bookmark);
  } catch (err) {
    console.error("[STRATO] Bookmarks POST error:", err.message);
    res.status(500).json({ error: "Failed to add bookmark" });
  }
});

// ── DELETE /api/bookmarks/:id — Remove a bookmark by ID ──
router.delete("/api/bookmarks/:id", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    // Verify the bookmark belongs to this user
    const bookmark = await store.getOne(
      "bookmarks",
      (b) => b.id === id && b.username === username,
    );
    if (!bookmark) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    await store.deleteOne("bookmarks", (b) => b.id === id);

    // Update user stats
    const user = await store.getOne("users", (u) => u.username === username);
    if (user) {
      await store.update("users", (u) => u.username === username, {
        stats: {
          ...user.stats,
          bookmarks_count: Math.max(0, (user.stats?.bookmarks_count || 0) - 1),
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[STRATO] Bookmarks DELETE error:", err.message);
    res.status(500).json({ error: "Failed to delete bookmark" });
  }
});

// ── DELETE /api/bookmarks — Remove a bookmark by URL (client compatibility) ──
//     The client sends { url } in the body since it tracks bookmarks by URL, not ID
router.delete("/api/bookmarks", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Find and delete the bookmark by URL and username
    const bookmark = await store.getOne(
      "bookmarks",
      (b) => b.url === url && b.username === username,
    );
    if (!bookmark) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    await store.deleteOne("bookmarks", (b) => b.id === bookmark.id);

    // Update user stats
    const user = await store.getOne("users", (u) => u.username === username);
    if (user) {
      await store.update("users", (u) => u.username === username, {
        stats: {
          ...user.stats,
          bookmarks_count: Math.max(0, (user.stats?.bookmarks_count || 0) - 1),
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[STRATO] Bookmarks DELETE by URL error:", err.message);
    res.status(500).json({ error: "Failed to delete bookmark" });
  }
});

// ── GET /api/history — Get user's browsing history (last 100, paginated) ──
router.get("/api/history", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;

    const result = await store.query(
      "history",
      (h) => h.username === username,
      {
        sort: { field: "created_at", order: "desc" },
        page,
        limit: Math.min(limit, 100),
      },
    );

    res.json({
      total: result.total,
      page: result.page,
      limit: result.limit,
      history: result.data,
    });
  } catch (err) {
    console.error("[STRATO] History GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ── POST /api/history — Add a history entry ──
router.post("/api/history", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { url, title } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    if (title && (typeof title !== "string" || title.length > 500)) {
      return res
        .status(400)
        .json({ error: "Title must be under 500 characters" });
    }

    const entry = await store.create("history", {
      username,
      url,
      title: title || url,
    });

    // Update user stats
    const user = await store.getOne("users", (u) => u.username === username);
    if (user) {
      await store.update("users", (u) => u.username === username, {
        stats: {
          ...user.stats,
          history_count: (user.stats?.history_count || 0) + 1,
        },
      });
    }

    res.status(201).json(entry);
  } catch (err) {
    console.error("[STRATO] History POST error:", err.message);
    res.status(500).json({ error: "Failed to add history entry" });
  }
});

// ── DELETE /api/history — Clear all history for user ──
router.delete("/api/history", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const removed = await store.deleteMany(
      "history",
      (h) => h.username === username,
    );

    // Update user stats
    const user = await store.getOne("users", (u) => u.username === username);
    if (user) {
      await store.update("users", (u) => u.username === username, {
        stats: {
          ...user.stats,
          history_count: 0,
        },
      });
    }

    res.json({ success: true, removed });
  } catch (err) {
    console.error("[STRATO] History DELETE error:", err.message);
    res.status(500).json({ error: "Failed to clear history" });
  }
});

export default router;
