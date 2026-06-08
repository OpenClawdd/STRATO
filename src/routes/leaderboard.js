import { Router } from "express";
import store from "../db/store.js";

const router = Router();

// ── GET /api/leaderboard/:gameId — Get top 10 scores for a game ──
router.get("/api/leaderboard/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;
    const period = req.query.period || "alltime";

    if (!["daily", "weekly", "alltime"].includes(period)) {
      return res
        .status(400)
        .json({ error: "Period must be daily, weekly, or alltime" });
    }

    const allScores = await store.getAll("scores");

    // Filter by game and time period in a single pass
    let cutoff = 0;
    if (period === "daily") {
      cutoff = Date.now() - 24 * 60 * 60 * 1000;
    } else if (period === "weekly") {
      cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    }

    const filteredScores = [];
    for (let i = 0; i < allScores.length; i++) {
      const s = allScores[i];
      if (s.gameId === gameId) {
        if (cutoff === 0 || new Date(s.created_at).getTime() > cutoff) {
          filteredScores.push(s);
        }
      }
    }

    // Sort by score descending, take top 10
    filteredScores.sort((a, b) => b.score - a.score);
    const top10 = filteredScores.slice(0, 10);

    res.json({
      gameId,
      period,
      leaderboard: top10.map((s, i) => ({
        rank: i + 1,
        username: s.username,
        score: s.score,
        date: s.created_at,
      })),
    });
  } catch (err) {
    console.error("[STRATO] Leaderboard GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ── POST /api/leaderboard/:gameId — Submit a score ──
router.post("/api/leaderboard/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;
    const username = res.locals.username;

    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { score } = req.body;

    if (typeof score !== "number" || isNaN(score)) {
      return res.status(400).json({ error: "Score must be a number" });
    }

    // Clamp score to reasonable range
    const clampedScore = Math.max(0, Math.min(score, 10_000_000));

    const record = await store.create("scores", {
      gameId,
      username,
      score: clampedScore,
    });

    // Update user stats
    const user = await store.getOne("users", (u) => u.username === username);
    if (user) {
      await store.update("users", (u) => u.username === username, {
        stats: {
          ...user.stats,
          games_played: (user.stats?.games_played || 0) + 1,
          total_score: (user.stats?.total_score || 0) + clampedScore,
        },
      });
    }

    res.json({
      success: true,
      gameId,
      score: clampedScore,
      id: record.id,
    });
  } catch (err) {
    console.error("[STRATO] Leaderboard POST error:", err.message);
    res.status(500).json({ error: "Failed to submit score" });
  }
});

// ── GET /api/leaderboard — Global leaderboard (top players by total XP) ──
router.get("/api/leaderboard", async (req, res) => {
  try {
    const allUsers = await store.getAll("users");

    // Maintain top 25 users by XP
    const top25 = [];
    for (let i = 0; i < allUsers.length; i++) {
      const u = allUsers[i];
      const xp = u.xp || 0;

      if (top25.length < 25) {
        top25.push(u);
        if (top25.length === 25) {
          top25.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        }
      } else if (xp > (top25[24].xp || 0)) {
        let k = 23;
        while (k >= 0 && xp > (top25[k].xp || 0)) {
          k--;
        }
        top25.splice(k + 1, 0, u);
        top25.pop();
      }
    }
    if (top25.length < 25) {
      top25.sort((a, b) => (b.xp || 0) - (a.xp || 0));
    }

    res.json({
      leaderboard: top25.map((u, i) => ({
        rank: i + 1,
        username: u.username,
        xp: u.xp || 0,
        level: u.level || 1,
        coins: u.coins || 0,
        avatar: u.avatar,
      })),
    });
  } catch (err) {
    console.error("[STRATO] Global leaderboard error:", err.message);
    res.status(500).json({ error: "Failed to fetch global leaderboard" });
  }
});

export default router;
