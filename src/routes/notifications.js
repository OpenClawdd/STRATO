/**
 * STRATO v21 — Notifications & Analytics API
 * User-facing notification system and activity tracking
 */

import { Router } from 'express';
import store from '../db/store.js';
import { sanitizeString } from '../middleware/sanitize.js';

const router = Router();

// ── GET /api/notifications — Get user's notifications ──
router.get('/api/notifications', async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) return res.status(401).json({ error: 'Not authenticated' });
    const user = await store.getOne('users', (u) => u.username === username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notifications = user.notifications || [];
    res.json({ notifications, unread: notifications.filter(n => !n.read).length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// ── POST /api/notifications/read — Mark notifications as read ──
router.post('/api/notifications/read', async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) return res.status(401).json({ error: 'Not authenticated' });
    const { ids } = req.body; // Array of notification IDs, or 'all'

    const user = await store.getOne('users', (u) => u.username === username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let notifications = user.notifications || [];

    if (ids === 'all') {
      notifications = notifications.map(n => ({ ...n, read: true }));
    } else if (Array.isArray(ids)) {
      const idSet = new Set(ids);
      notifications = notifications.map(n =>
        idSet.has(n.id) ? { ...n, read: true } : n
      );
    }

    await store.update('users', (u) => u.username === username, { notifications });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// ── DELETE /api/notifications/:id — Delete a notification ──
router.delete('/api/notifications/:id', async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = req.params;

    const user = await store.getOne('users', (u) => u.username === username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notifications = (user.notifications || []).filter(n => n.id !== id);
    await store.update('users', (u) => u.username === username, { notifications });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// ── GET /api/analytics/personal — Personal usage stats ──
router.get('/api/analytics/personal', async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) return res.status(401).json({ error: 'Not authenticated' });
    const user = await store.getOne('users', (u) => u.username === username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bookmarks = await store.getAll('bookmarks');
    const saves = await store.getAll('saves');
    const scores = await store.getAll('scores');

    const userBookmarks = bookmarks.filter(b => b.userId === user.id || b.username === username);
    const userSaves = saves.filter(s => s.userId === user.id || s.username === username);
    const userScores = scores.filter(s => s.username === username);

    // Calculate XP progress
    const currentLevel = user.level || 1;
    const currentXp = user.xp || 0;
    const xpForNextLevel = currentLevel * 100;
    const xpProgress = currentXp / xpForNextLevel;

    res.json({
      user: {
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        coins: user.coins || 0,
        xp: currentXp,
        level: currentLevel,
        xpForNextLevel,
        xpProgress: Math.min(xpProgress, 1),
        memberSince: user.created_at,
      },
      stats: {
        gamesPlayed: user.stats?.games_played || 0,
        totalScore: user.stats?.total_score || 0,
        chatMessages: user.stats?.chat_messages || 0,
        bookmarksCount: userBookmarks.length,
        savesCount: userSaves.length,
        achievementsUnlocked: (user.stats?.achievements || []).length,
      },
      recentScores: userScores
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// ── GET /api/analytics/global — Global stats for leaderboard ──
router.get('/api/analytics/global', async (req, res) => {
  try {
    const users = await store.getAll('users');
    const scores = await store.getAll('scores');
    const chatMessages = await store.getAll('chat_messages');

    // Top players by XP
    const topByXp = [...users]
      .sort((a, b) => (b.xp || 0) - (a.xp || 0))
      .slice(0, 20)
      .map(u => ({
        username: u.username,
        avatar: u.avatar,
        xp: u.xp || 0,
        level: u.level || 1,
      }));

    // Most active chatters
    const chatCount = {};
    for (const msg of chatMessages) {
      chatCount[msg.username] = (chatCount[msg.username] || 0) + 1;
    }
    const topChatters = Object.entries(chatCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([username, count]) => ({ username, messages: count }));

    // Game popularity
    const gameCount = {};
    for (const score of scores) {
      if (score.game) {
        gameCount[score.game] = (gameCount[score.game] || 0) + 1;
      }
    }
    const popularGames = Object.entries(gameCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([game, count]) => ({ game, plays: count }));

    res.json({
      totalUsers: users.length,
      totalScores: scores.length,
      totalMessages: chatMessages.length,
      topByXp,
      topChatters,
      popularGames,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load global analytics' });
  }
});

// ── POST /api/activity — Log user activity for tracking ──
router.post('/api/activity', async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) return res.status(401).json({ error: 'Not authenticated' });
    const { action, category, metadata } = req.body;

    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'Action is required' });
    }

    const sanitizedAction = sanitizeString(action, { maxLength: 100 });
    const sanitizedCategory = category ? sanitizeString(category, { maxLength: 50 }) : 'general';

    // Update user stats based on activity
    const user = await store.getOne('users', (u) => u.username === username);
    if (user) {
      const updates = { stats: { ...user.stats } };

      switch (sanitizedCategory) {
        case 'game':
          updates.stats.games_played = (updates.stats.games_played || 0) + 1;
          updates.xp = (user.xp || 0) + 10;
          break;
        case 'proxy':
          updates.xp = (user.xp || 0) + 2;
          break;
        case 'chat':
          updates.stats.chat_messages = (updates.stats.chat_messages || 0) + 1;
          updates.xp = (user.xp || 0) + 3;
          break;
        case 'ai':
          updates.xp = (user.xp || 0) + 5;
          break;
        case 'bookmark':
          updates.stats.bookmarks_count = (updates.stats.bookmarks_count || 0) + 1;
          updates.xp = (user.xp || 0) + 2;
          break;
      }

      // Level up check
      const newLevel = Math.floor(updates.xp / 100) + 1;
      if (newLevel > (user.level || 1)) {
        updates.level = newLevel;
        updates.coins = (user.coins || 0) + (newLevel * 5);
      }

      await store.update('users', (u) => u.username === username, updates);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

export default router;
