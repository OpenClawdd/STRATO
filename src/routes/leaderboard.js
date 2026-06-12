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

    // Precalculate time boundary
    let minTime = 0;
    if (period === "daily") {
      minTime = Date.now() - 24 * 60 * 60 * 1000;
    } else if (period === "weekly") {
      minTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
    }

    // Single-pass bounded insertion sort to find top 10
    const top10 = [];
    for (let i = 0; i < allScores.length; i++) {
      const s = allScores[i];
      if (s.gameId !== gameId) continue;
      if (minTime > 0 && new Date(s.created_at).getTime() <= minTime) continue;

      const scoreVal = s.score || 0;
      if (
        top10.length < 10 ||
        scoreVal > (top10[top10.length - 1].score || 0)
      ) {
        let insertIdx = top10.length;
        while (insertIdx > 0 && scoreVal > (top10[insertIdx - 1].score || 0)) {
          insertIdx--;
        }

        top10.splice(insertIdx, 0, s);
        if (top10.length > 10) {
          top10.pop();
        }
      }
    }

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

    // Single-pass bounded insertion sort to find top 25 users by XP
    const top25 = [];
    for (let i = 0; i < allUsers.length; i++) {
      const u = allUsers[i];
      const xpVal = u.xp || 0;

      if (top25.length < 25 || xpVal > (top25[top25.length - 1].xp || 0)) {
        const mappedUser = {
          username: u.username,
          xp: xpVal,
          level: u.level || 1,
          coins: u.coins || 0,
          avatar: u.avatar,
        };

        let insertIdx = top25.length;
        while (insertIdx > 0 && xpVal > (top25[insertIdx - 1].xp || 0)) {
          insertIdx--;
        }

        top25.splice(insertIdx, 0, mappedUser);
        if (top25.length > 25) {
          top25.pop();
        }
      }
    }

    res.json({
      leaderboard: top25.map((u, i) => ({
        rank: i + 1,
        ...u,
      })),
    });
  } catch (err) {
    console.error("[STRATO] Global leaderboard error:", err.message);
    res.status(500).json({ error: "Failed to fetch global leaderboard" });
  }
});

export default router;
