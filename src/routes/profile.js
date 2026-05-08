import { Router } from "express";
import store from "../db/store.js";

const router = Router();

// ── Helper: ensure user profile exists, auto-create if not ──
async function ensureUserProfile(username) {
  let user = await store.getOne("users", (u) => u.username === username);
  if (!user) {
    user = await store.create("users", {
      username,
      avatar: null,
      bio: "",
      coins: 0,
      xp: 0,
      level: 1,
      theme: "default",
      stats: {
        games_played: 0,
        total_score: 0,
        achievements: [],
        bookmarks_count: 0,
        history_count: 0,
        saves_count: 0,
        chat_messages: 0,
      },
    });
  }
  return user;
}

// ── Helper: recalculate level from XP ──
function calculateLevel(totalXP) {
  return Math.floor(totalXP / 100) + 1;
}

// ── GET /api/profile/:username — Get user profile ──
router.get("/api/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await store.getOne("users", (u) => u.username === username);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return safe profile data (no internal fields)
    res.json({
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      coins: user.coins,
      xp: user.xp,
      level: user.level,
      theme: user.theme,
      created_at: user.created_at,
      stats: user.stats,
    });
  } catch (err) {
    console.error("[STRATO] Profile GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ── PATCH /api/profile/:username — Update profile (own profile only) ──
router.patch("/api/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const currentUser = res.locals.username;

    if (!currentUser || currentUser !== username) {
      return res
        .status(403)
        .json({ error: "You can only update your own profile" });
    }

    const { bio, avatar, theme } = req.body;
    const updates = {};

    if (bio !== undefined) {
      if (typeof bio !== "string" || bio.length > 500) {
        return res
          .status(400)
          .json({ error: "Bio must be a string under 500 characters" });
      }
      updates.bio = bio;
    }

    if (avatar !== undefined) {
      if (typeof avatar !== "string" || avatar.length > 500) {
        return res
          .status(400)
          .json({
            error: "Avatar must be a valid string under 500 characters",
          });
      }
      updates.avatar = avatar;
    }

    if (theme !== undefined) {
      if (typeof theme !== "string" || theme.length > 50) {
        return res
          .status(400)
          .json({ error: "Theme must be a valid string under 50 characters" });
      }
      updates.theme = theme;
    }

    const updated = await store.update(
      "users",
      (u) => u.username === username,
      updates,
    );

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      username: updated.username,
      avatar: updated.avatar,
      bio: updated.bio,
      coins: updated.coins,
      xp: updated.xp,
      level: updated.level,
      theme: updated.theme,
      created_at: updated.created_at,
    });
  } catch (err) {
    console.error("[STRATO] Profile PATCH error:", err.message);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ── GET /api/profile/:username/stats — Get user stats ──
router.get("/api/profile/:username/stats", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await store.getOne("users", (u) => u.username === username);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      username: user.username,
      xp: user.xp,
      level: user.level,
      coins: user.coins,
      stats: user.stats,
    });
  } catch (err) {
    console.error("[STRATO] Profile stats error:", err.message);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ── POST /api/profile/:username/xp — Add XP to user ──
router.post("/api/profile/:username/xp", async (req, res) => {
  try {
    const { username } = req.params;
    const currentUser = res.locals.username;

    if (!currentUser || currentUser !== username) {
      return res
        .status(403)
        .json({ error: "You can only add XP to your own profile" });
    }

    const { amount, reason } = req.body;

    if (typeof amount !== "number" || amount <= 0 || amount > 1000) {
      return res
        .status(400)
        .json({ error: "XP amount must be a positive number up to 1000" });
    }

    if (reason && (typeof reason !== "string" || reason.length > 200)) {
      return res
        .status(400)
        .json({ error: "Reason must be a string under 200 characters" });
    }

    const user = await store.getOne("users", (u) => u.username === username);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newXP = (user.xp || 0) + amount;
    const newLevel = calculateLevel(newXP);
    const coinsEarned = Math.floor(amount / 10); // 1 coin per 10 XP

    await store.update("users", (u) => u.username === username, {
      xp: newXP,
      level: newLevel,
      coins: (user.coins || 0) + coinsEarned,
    });

    res.json({
      xp_added: amount,
      reason: reason || null,
      total_xp: newXP,
      level: newLevel,
      coins_earned: coinsEarned,
      total_coins: (user.coins || 0) + coinsEarned,
      leveled_up: newLevel > user.level,
    });
  } catch (err) {
    console.error("[STRATO] Profile XP error:", err.message);
    res.status(500).json({ error: "Failed to add XP" });
  }
});

// ── Export ensureUserProfile for use in auth middleware ──
export { ensureUserProfile };
export default router;
