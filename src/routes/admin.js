/**
 * STRATO v21 — Admin Panel Routes
 * Dashboard, user management, analytics, system monitoring
 */

import { Router } from 'express';
import store from '../db/store.js';
import { getCsrfStats } from '../middleware/csrf.js';

const router = Router();

// ── Admin authentication middleware ──
// Admin access is granted via the ADMIN_SECRET env var
// Set ADMIN_SECRET in .env to enable admin features
const ADMIN_SECRET = process.env.ADMIN_SECRET || null;

function requireAdmin(req, res, next) {
  // Check for admin secret in header or query
  const provided = req.headers['x-admin-secret'] || req.query.admin_secret;

  if (!ADMIN_SECRET) {
    return res.status(403).json({
      error: 'Admin panel is disabled. Set ADMIN_SECRET env var to enable.',
    });
  }

  if (!provided || provided !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  next();
}

// ── Apply admin auth to all admin routes ──
router.use(requireAdmin);

// ── GET /api/admin/dashboard — System overview ──
router.get('/api/admin/dashboard', async (req, res) => {
  try {
    const [users, scores, bookmarks, saves, chatRooms, chatMessages, themes, extensions] = await Promise.all([
      store.count('users'),
      store.count('scores'),
      store.count('bookmarks'),
      store.count('saves'),
      store.count('chat_rooms'),
      store.count('chat_messages'),
      store.count('themes'),
      store.count('extensions'),
    ]);

    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    res.json({
      status: 'ok',
      version: '21.0.0',
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime),
      },
      memory: {
        rss: formatBytes(memUsage.rss),
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        external: formatBytes(memUsage.external),
      },
      database: {
        users,
        scores,
        bookmarks,
        saves,
        chatRooms,
        chatMessages,
        themes,
        extensions,
      },
      csrf: getCsrfStats(),
      node: process.version,
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// ── GET /api/admin/users — List all users ──
router.get('/api/admin/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const users = await store.getAll('users');

    let filtered = users;
    if (search) {
      const q = search.toLowerCase();
      filtered = users.filter(u =>
        (u.username || '').toLowerCase().includes(q)
      );
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + Number(limit));

    res.json({
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
      users: paginated.map(u => ({
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        bio: u.bio,
        coins: u.coins || 0,
        xp: u.xp || 0,
        level: u.level || 1,
        created_at: u.created_at,
        last_active: u.updated_at,
        stats: u.stats,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// ── DELETE /api/admin/users/:id — Delete a user ──
router.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await store.deleteOne('users', (u) => u.id === id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Also delete associated data — match by both userId and username
    const user = await store.getOne('users', (u) => u.id === id);
    const username = user?.username;
    await store.deleteMany('scores', (s) => s.id === id || s.userId === id || s.username === username);
    await store.deleteMany('bookmarks', (b) => b.userId === id || b.username === username);
    await store.deleteMany('saves', (s) => s.userId === id || s.username === username);
    await store.deleteMany('chat_messages', (m) => m.username === username);

    res.json({ success: true, message: 'User and associated data deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ── GET /api/admin/analytics — Usage analytics ──
router.get('/api/admin/analytics', async (req, res) => {
  try {
    const users = await store.getAll('users');
    const scores = await store.getAll('scores');
    const chatMessages = await store.getAll('chat_messages');

    // Calculate aggregate stats
    const totalGamesPlayed = users.reduce((sum, u) => sum + (u.stats?.games_played || 0), 0);
    const totalChatMessages = chatMessages.length;
    const totalXp = users.reduce((sum, u) => sum + (u.xp || 0), 0);
    const avgLevel = users.length > 0
      ? (users.reduce((sum, u) => sum + (u.level || 1), 0) / users.length).toFixed(1)
      : 0;

    // Recent signups (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentSignups = users.filter(u => u.created_at > sevenDaysAgo).length;

    // Active users (updated in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const activeUsers = users.filter(u => u.updated_at > oneDayAgo).length;

    // Top users by XP
    const topUsers = [...users]
      .sort((a, b) => (b.xp || 0) - (a.xp || 0))
      .slice(0, 10)
      .map(u => ({
        username: u.username,
        xp: u.xp || 0,
        level: u.level || 1,
        gamesPlayed: u.stats?.games_played || 0,
      }));

    // Chat activity by day (last 7 days)
    const chatActivity = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      chatActivity[dateStr] = chatMessages.filter(m =>
        m.created_at && m.created_at.startsWith(dateStr)
      ).length;
    }

    res.json({
      overview: {
        totalUsers: users.length,
        activeUsers,
        recentSignups,
        totalGamesPlayed,
        totalChatMessages,
        totalXp,
        avgLevel,
      },
      topUsers,
      chatActivity,
      gamesLeaderboard: scores
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 10)
        .map(s => ({
          username: s.username,
          game: s.game,
          score: s.score,
        })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// ── POST /api/admin/broadcast — Send system broadcast notification ──
router.post('/api/admin/broadcast', async (req, res) => {
  try {
    const { message, type = 'info' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Message must be under 500 characters' });
    }

    // Store broadcast in chat_messages as a system message
    const broadcast = await store.create('chat_messages', {
      roomId: 'system',
      username: 'SYSTEM',
      message: message.trim(),
      type: 'broadcast',
      broadcastType: type,
    });

    res.json({ success: true, broadcast });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// ── GET /api/admin/health — Detailed health check ──
router.get('/api/admin/health', async (req, res) => {
  const checks = {
    server: true,
    database: false,
    memory: true,
    uptime: process.uptime(),
  };

  try {
    await store.count('users');
    checks.database = true;
  } catch {
    checks.database = false;
  }

  // Memory warning if heap > 512MB
  const mem = process.memoryUsage();
  if (mem.heapUsed > 512 * 1024 * 1024) {
    checks.memory = false;
  }

  const healthy = checks.server && checks.database && checks.memory;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    memory: {
      rss: formatBytes(mem.rss),
      heapUsed: formatBytes(mem.heapUsed),
      heapTotal: formatBytes(mem.heapTotal),
    },
    version: '21.0.0',
  });
});

// ── POST /api/admin/cleanup — Clean up old data ──
router.post('/api/admin/cleanup', async (req, res) => {
  try {
    const { olderThanDays = 30 } = req.body;
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

    const chatDeleted = await store.deleteMany('chat_messages', (m) =>
      m.created_at < cutoff
    );

    res.json({
      success: true,
      cleaned: {
        chatMessages: chatDeleted,
        olderThanDays,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// ── Helpers ──
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return parts.join(' ');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default router;
