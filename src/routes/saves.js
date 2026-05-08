import { Router } from "express";
import store from "../db/store.js";

const router = Router();

const MAX_SAVE_SIZE = 50 * 1024; // 50KB

// ── GET /api/saves/:gameId — Get save data for a game ──
router.get("/api/saves/:gameId", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { gameId } = req.params;

    const save = await store.getOne(
      "saves",
      (s) => s.username === username && s.gameId === gameId,
    );

    if (!save) {
      return res
        .status(404)
        .json({ error: "No save data found for this game" });
    }

    res.json({
      gameId: save.gameId,
      data: save.data,
      updated_at: save.updated_at,
      created_at: save.created_at,
    });
  } catch (err) {
    console.error("[STRATO] Saves GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch save data" });
  }
});

// ── POST /api/saves/:gameId — Save game data ──
router.post("/api/saves/:gameId", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { gameId } = req.params;
    const { data } = req.body;

    if (data === undefined || data === null) {
      return res.status(400).json({ error: "Save data is required" });
    }

    // Validate size (data is a JSON string)
    const dataStr = typeof data === "string" ? data : JSON.stringify(data);
    if (dataStr.length > MAX_SAVE_SIZE) {
      return res.status(413).json({ error: "Save data exceeds 50KB limit" });
    }

    if (
      typeof gameId !== "string" ||
      gameId.length > 100 ||
      gameId.length < 1
    ) {
      return res.status(400).json({ error: "Invalid game ID" });
    }

    // Check if save already exists
    const existing = await store.getOne(
      "saves",
      (s) => s.username === username && s.gameId === gameId,
    );

    if (existing) {
      // Update existing save
      await store.update("saves", (s) => s.id === existing.id, {
        data: dataStr,
      });

      res.json({
        success: true,
        gameId,
        updated: true,
      });
    } else {
      // Create new save
      await store.create("saves", {
        username,
        gameId,
        data: dataStr,
      });

      // Update user stats
      const user = await store.getOne("users", (u) => u.username === username);
      if (user) {
        await store.update("users", (u) => u.username === username, {
          stats: {
            ...user.stats,
            saves_count: (user.stats?.saves_count || 0) + 1,
          },
        });
      }

      res.status(201).json({
        success: true,
        gameId,
        created: true,
      });
    }
  } catch (err) {
    console.error("[STRATO] Saves POST error:", err.message);
    res.status(500).json({ error: "Failed to save game data" });
  }
});

// ── DELETE /api/saves/:gameId — Delete save ──
router.delete("/api/saves/:gameId", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { gameId } = req.params;

    const deleted = await store.deleteOne(
      "saves",
      (s) => s.username === username && s.gameId === gameId,
    );

    if (!deleted) {
      return res.status(404).json({ error: "Save data not found" });
    }

    // Update user stats
    const user = await store.getOne("users", (u) => u.username === username);
    if (user) {
      await store.update("users", (u) => u.username === username, {
        stats: {
          ...user.stats,
          saves_count: Math.max(0, (user.stats?.saves_count || 0) - 1),
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[STRATO] Saves DELETE error:", err.message);
    res.status(500).json({ error: "Failed to delete save data" });
  }
});

export default router;
