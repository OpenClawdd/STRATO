/**
 * STRATO v21 — Data Import/Export Routes
 * Full backup, selective export, import from JSON
 */

import { Router } from 'express';
import store from '../db/store.js';
import { sanitizeQuery } from '../middleware/sanitize.js';

const router = Router();

// ── GET /api/data/export — Export all user data as JSON ──
router.get('/api/data/export', async (req, res) => {
  try {
    const username = res.locals.username;
    const user = await store.getOne('users', (u) => u.username === username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Gather all user data from all collections
    const [bookmarks, saves, scores, themes] = await Promise.all([
      store.getAll('bookmarks'),
      store.getAll('saves'),
      store.getAll('scores'),
      store.getAll('themes'),
    ]);

    const exportData = {
      version: '21.0.0',
      exportedAt: new Date().toISOString(),
      user: {
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        coins: user.coins || 0,
        xp: user.xp || 0,
        level: user.level || 1,
        stats: user.stats,
      },
      bookmarks: bookmarks.filter(b => b.userId === user.id || b.username === username),
      saves: saves.filter(s => s.userId === user.id || s.username === username),
      scores: scores.filter(s => s.username === username),
      themes: themes.filter(t => t.username === username),
    };

    res.setHeader('Content-Disposition', `attachment; filename="strato-backup-${username}-${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// ── POST /api/data/import — Import user data from JSON ──
router.post('/api/data/import', async (req, res) => {
  try {
    const username = res.locals.username;
    const importData = req.body;

    if (!importData || typeof importData !== 'object') {
      return res.status(400).json({ error: 'Invalid import data' });
    }

    // Validate the import format
    if (!importData.version || !importData.user) {
      return res.status(400).json({ error: 'Invalid backup format — missing version or user data' });
    }

    const user = await store.getOne('users', (u) => u.username === username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let imported = { bookmarks: 0, saves: 0, scores: 0, themes: 0 };

    // Import bookmarks
    if (Array.isArray(importData.bookmarks)) {
      for (const bookmark of importData.bookmarks) {
        // Skip if already exists
        const existing = await store.getOne('bookmarks', (b) =>
          b.url === bookmark.url && (b.userId === user.id || b.username === username)
        );
        if (!existing) {
          await store.create('bookmarks', {
            ...bookmark,
            userId: user.id,
            username,
            id: undefined, // Let store generate new ID
            created_at: undefined,
            updated_at: undefined,
          });
          imported.bookmarks++;
        }
      }
    }

    // Import saves
    if (Array.isArray(importData.saves)) {
      for (const save of importData.saves) {
        await store.create('saves', {
          ...save,
          userId: user.id,
          username,
          id: undefined,
          created_at: undefined,
          updated_at: undefined,
        });
        imported.saves++;
      }
    }

    // Import scores (merge — keep highest)
    if (Array.isArray(importData.scores)) {
      for (const score of importData.scores) {
        const existing = await store.getOne('scores', (s) =>
          s.username === username && s.game === score.game
        );
        if (!existing || (score.score || 0) > (existing.score || 0)) {
          if (existing) {
            await store.update('scores', (s) => s.id === existing.id, { score: score.score });
          } else {
            await store.create('scores', {
              ...score,
              username,
              id: undefined,
              created_at: undefined,
              updated_at: undefined,
            });
          }
          imported.scores++;
        }
      }
    }

    // Import themes
    if (Array.isArray(importData.themes)) {
      for (const theme of importData.themes) {
        await store.create('themes', {
          ...theme,
          username,
          id: undefined,
          created_at: undefined,
          updated_at: undefined,
        });
        imported.themes++;
      }
    }

    // Optionally restore profile data
    if (importData.user) {
      const profileUpdates = {};
      if (importData.user.bio) profileUpdates.bio = importData.user.bio;
      if (importData.user.avatar) profileUpdates.avatar = importData.user.avatar;

      if (Object.keys(profileUpdates).length > 0) {
        await store.update('users', (u) => u.username === username, profileUpdates);
      }
    }

    res.json({ success: true, imported });
  } catch (err) {
    console.error('[STRATO] Import error:', err.message);
    res.status(500).json({ error: 'Import failed' });
  }
});

// ── GET /api/data/export/bookmarks — Export bookmarks only ──
router.get('/api/data/export/bookmarks', async (req, res) => {
  try {
    const username = res.locals.username;
    const user = await store.getOne('users', (u) => u.username === username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bookmarks = await store.getAll('bookmarks');
    const userBookmarks = bookmarks.filter(b => b.userId === user.id || b.username === username);

    res.setHeader('Content-Disposition', `attachment; filename="strato-bookmarks-${username}.json"`);
    res.json(userBookmarks);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// ── POST /api/data/import/bookmarks — Import bookmarks ──
router.post('/api/data/import/bookmarks', async (req, res) => {
  try {
    const username = res.locals.username;
    const user = await store.getOne('users', (u) => u.username === username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bookmarks = Array.isArray(req.body) ? req.body : req.body.bookmarks || [];
    let imported = 0;

    for (const bookmark of bookmarks) {
      if (!bookmark.url || typeof bookmark.url !== 'string') continue;

      const existing = await store.getOne('bookmarks', (b) =>
        b.url === bookmark.url && (b.userId === user.id || b.username === username)
      );
      if (!existing) {
        await store.create('bookmarks', {
          url: bookmark.url,
          title: bookmark.title || bookmark.url,
          favicon: bookmark.favicon || null,
          userId: user.id,
          username,
        });
        imported++;
      }
    }

    res.json({ success: true, imported });
  } catch (err) {
    res.status(500).json({ error: 'Import failed' });
  }
});

// ── DELETE /api/data/purge — Delete all user data ──
router.delete('/api/data/purge', async (req, res) => {
  try {
    const username = res.locals.username;
    const { confirm } = req.body;

    if (confirm !== 'DELETE_EVERYTHING') {
      return res.status(400).json({
        error: 'Confirmation required. Send { confirm: "DELETE_EVERYTHING" } to proceed.',
      });
    }

    const user = await store.getOne('users', (u) => u.username === username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete all user data from all collections
    await store.deleteMany('bookmarks', (b) => b.userId === user.id || b.username === username);
    await store.deleteMany('saves', (s) => s.userId === user.id || s.username === username);
    await store.deleteMany('scores', (s) => s.username === username);
    await store.deleteMany('themes', (t) => t.username === username);
    await store.deleteMany('chat_messages', (m) => m.username === username);

    // Reset user stats
    await store.update('users', (u) => u.username === username, {
      coins: 0,
      xp: 0,
      level: 1,
      bio: '',
      avatar: null,
      notifications: [],
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

    res.json({ success: true, message: 'All user data has been purged' });
  } catch (err) {
    res.status(500).json({ error: 'Purge failed' });
  }
});

export default router;
