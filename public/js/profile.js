/* ══════════════════════════════════════════════════════════
   STRATO v21 — Profile & Leaderboard Module
   Profile card, XP/level, progress bars, leaderboard,
   score submission, level-up celebration
   Works with existing HTML elements
   ══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const XP_PER_LEVEL = 100;
  const XP_MULTIPLIER = 1.5;

  const XP_REWARDS = {
    game: 5,
    browse: 2,
    ai: 3,
    chat: 1,
    snap: 10,
  };

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function getLevel(xp) {
    let level = 1;
    let required = XP_PER_LEVEL;
    let total = 0;
    while (total + required <= xp) {
      total += required;
      level++;
      required = Math.floor(XP_PER_LEVEL * Math.pow(XP_MULTIPLIER, level - 1));
    }
    return { level, currentXp: xp - total, requiredXp: required, totalXp: xp };
  }

  function getXp() {
    return parseInt(localStorage.getItem('strato-xp') || '0');
  }

  function addXP(amount) {
    const current = getXp();
    const newTotal = current + amount;
    localStorage.setItem('strato-xp', String(newTotal));

    const oldLevel = getLevel(current);
    const newLevel = getLevel(newTotal);

    if (newLevel.level > oldLevel.level) {
      // Add bonus XP
      localStorage.setItem('strato-xp', String(newTotal + 50));
      showLevelUp(newLevel.level);
      if (window.showToast) window.showToast(`Level Up! You're now Level ${newLevel.level}`, 'accent');
      if (window.STRATO_NOTIFY) window.STRATO_NOTIFY(`Level Up! Level ${newLevel.level}`, 'levelup');
    }

    updateXpUI();
    return newTotal;
  }

  function addXPAction(actionType) {
    const amount = XP_REWARDS[actionType] || 1;
    return addXP(amount);
  }

  function updateXpUI() {
    const xp = getXp();
    const info = getLevel(xp);
    const pct = (info.currentXp / info.requiredXp) * 100;

    // Status bar XP
    const xpLevel = document.querySelector('#status-xp .xp-level');
    const xpFillMini = document.querySelector('#status-xp .xp-fill-mini');
    if (xpLevel) xpLevel.textContent = `Lv.${info.level}`;
    if (xpFillMini) xpFillMini.style.width = `${pct}%`;

    // Home view XP
    const homeLevel = document.getElementById('home-level');
    const homeXpFill = document.getElementById('home-xp-fill');
    const homeXpText = document.getElementById('home-xp-text');
    if (homeLevel) homeLevel.textContent = `Lv.${info.level}`;
    if (homeXpFill) homeXpFill.style.width = `${pct}%`;
    if (homeXpText) homeXpText.textContent = `${info.currentXp} / ${info.requiredXp} XP`;

    // Profile view XP
    const profileLevel = document.getElementById('profile-level');
    const profileXpFill = document.getElementById('profile-xp-fill');
    const profileXpText = document.getElementById('profile-xp-text');
    if (profileLevel) profileLevel.textContent = `Level ${info.level}`;
    if (profileXpFill) profileXpFill.style.width = `${pct}%`;
    if (profileXpText) profileXpText.textContent = `${info.currentXp} / ${info.requiredXp} XP`;

    // Home stats
    const statGamesPlayed = document.getElementById('stat-games-played');
    const statPagesBrowsed = document.getElementById('stat-pages-browsed');
    const statAiChats = document.getElementById('stat-ai-chats');
    const statChatMsgs = document.getElementById('stat-chat-msgs');
    if (statGamesPlayed) statGamesPlayed.textContent = localStorage.getItem('strato-gamesPlayed') || '0';
    if (statPagesBrowsed) statPagesBrowsed.textContent = localStorage.getItem('strato-pagesLoaded') || '0';
    if (statAiChats) statAiChats.textContent = localStorage.getItem('strato-aiMessagesSent') || '0';
    if (statChatMsgs) statChatMsgs.textContent = localStorage.getItem('strato-chatMessages') || '0';
  }

  function showLevelUp(level) {
    const levelUpEl = document.getElementById('level-up');
    if (levelUpEl) {
      const levelNum = levelUpEl.querySelector('.level-up-level');
      if (levelNum) levelNum.textContent = `Level ${level}`;
      levelUpEl.classList.remove('hidden');
      setTimeout(() => levelUpEl.classList.add('hidden'), 4000);
    }
  }

  async function loadProfile(username) {
    try {
      const resp = await fetch(`/api/profile/${username || localStorage.getItem('strato-username') || 'anonymous'}`);
      if (!resp.ok) return null;
      const data = await resp.json();
      renderProfile(data);
      return data;
    } catch (e) {
      return null;
    }
  }

  async function updateProfile(updates) {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const csrf = csrfMeta ? csrfMeta.content : '';
    try {
      const resp = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify(updates),
      });
      if (resp.ok) {
        if (updates.username) localStorage.setItem('strato-username', updates.username);
        if (updates.bio) localStorage.setItem('strato-bio', updates.bio);
        if (window.showToast) window.showToast('Profile updated', 'accent');
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function renderProfile(data) {
    const usernameDisplay = document.getElementById('profile-username') || document.getElementById('home-username') || document.getElementById('username-display');
    if (usernameDisplay) usernameDisplay.textContent = data.username || 'Anonymous';

    const homeUsername = document.getElementById('home-username');
    if (homeUsername) homeUsername.textContent = data.username || 'Anonymous';

    const statusUsername = document.getElementById('status-username');
    if (statusUsername) statusUsername.textContent = data.username || '';

    const profileBio = document.getElementById('profile-bio');
    if (profileBio && data.bio) profileBio.value = data.bio;

    if (data.xp !== undefined) {
      localStorage.setItem('strato-xp', String(data.xp));
      updateXpUI();
    }
  }

  function getProfile() {
    return {
      username: localStorage.getItem('strato-username') || 'Anonymous',
      bio: localStorage.getItem('strato-bio') || '',
      xp: getXp(),
      level: getLevel(getXp()).level,
      gamesPlayed: parseInt(localStorage.getItem('strato-gamesPlayed') || '0'),
      pagesLoaded: parseInt(localStorage.getItem('strato-pagesLoaded') || '0'),
      aiMessages: parseInt(localStorage.getItem('strato-aiMessagesSent') || '0'),
      chatMessages: parseInt(localStorage.getItem('strato-chatMessages') || '0'),
      coins: parseInt(localStorage.getItem('strato-coins') || '0'),
    };
  }

  async function submitScore(gameId, score) {
    const localScores = JSON.parse(localStorage.getItem('strato-scores') || '{}');
    const current = localScores[gameId] || 0;
    if (score > current) {
      localScores[gameId] = score;
      localStorage.setItem('strato-scores', JSON.stringify(localScores));
      addXP(Math.floor(score / 10));
    }
    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const resp = await fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfMeta?.content || '' },
        body: JSON.stringify({ gameId, score }),
      });
      return resp.ok;
    } catch (e) {
      return false;
    }
  }

  async function loadLeaderboard(period) {
    try {
      const resp = await fetch(`/api/leaderboard${period ? `?period=${period}` : ''}`);
      if (!resp.ok) return getLocalLeaderboard();
      const data = await resp.json();
      renderLeaderboard(data.leaders || data);
      return data;
    } catch (e) {
      return getLocalLeaderboard();
    }
  }

  function getLocalLeaderboard() {
    const profile = getProfile();
    return [
      { rank: 1, name: profile.username, score: profile.xp, badge: 'gold' },
      { rank: 2, name: 'CyberNinja', score: Math.floor(profile.xp * 0.7), badge: 'silver' },
      { rank: 3, name: 'PixelMaster', score: Math.floor(profile.xp * 0.5), badge: 'bronze' },
      { rank: 4, name: 'GhostRider', score: Math.floor(profile.xp * 0.35), badge: '' },
      { rank: 5, name: 'StarCoder', score: Math.floor(profile.xp * 0.2), badge: '' },
    ];
  }

  function renderLeaderboard(leaders) {
    const list = document.getElementById('settings-leaderboard') || document.getElementById('leaderboard-list') || document.getElementById('home-leaderboard');
    if (!list) return;
    list.innerHTML = '';

    if (!leaders || leaders.length === 0) {
      list.innerHTML = '<div style="color:var(--fg-faint);text-align:center;padding:16px">No entries yet</div>';
      return;
    }

    leaders.forEach(entry => {
      const badgeEmoji = entry.badge === 'gold' ? '🥇' : entry.badge === 'silver' ? '🥈' : entry.badge === 'bronze' ? '🥉' : '';
      const item = document.createElement('div');
      item.className = 'leaderboard-item';
      item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border)';
      item.innerHTML = `
        <span style="font-weight:700;min-width:24px">${entry.rank || ''}</span>
        ${badgeEmoji ? `<span>${badgeEmoji}</span>` : ''}
        <span style="flex:1">${escapeHtml(entry.name || entry.username || 'Unknown')}</span>
        <span style="color:var(--accent)">${entry.score || entry.xp || 0} XP</span>
      `;
      list.appendChild(item);
    });
  }

  function init() {
    updateXpUI();

    // Set username display
    const profile = getProfile();
    const homeUsername = document.getElementById('home-username');
    const statusUsername = document.getElementById('status-username');
    if (homeUsername) homeUsername.textContent = profile.username;
    if (statusUsername) statusUsername.textContent = profile.username;

    // Load profile from server
    loadProfile();
    loadLeaderboard();

    // Save profile button
    const saveProfileBtn = document.getElementById('btn-save-profile');
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', () => {
        const bio = document.getElementById('profile-bio')?.value || '';
        localStorage.setItem('strato-bio', bio);
        updateProfile({ bio });
      });
    }

    // Avatar picker
    document.querySelectorAll('.avatar-option[data-avatar]').forEach(btn => {
      btn.addEventListener('click', () => {
        const avatar = btn.dataset.avatar;
        const avatarEl = document.getElementById('profile-avatar');
        if (avatarEl) avatarEl.textContent = avatar;
        localStorage.setItem('strato-avatar-emoji', avatar);
      });
    });

    // Restore avatar
    const savedAvatar = localStorage.getItem('strato-avatar-emoji');
    if (savedAvatar) {
      const avatarEl = document.getElementById('profile-avatar');
      if (avatarEl) avatarEl.textContent = savedAvatar;
    }

    // Leaderboard period filter
    document.querySelectorAll('[data-leaderboard-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-leaderboard-period]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadLeaderboard(btn.dataset.leaderboardPeriod);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose with both casings so callers using addXP or addXp both work
  window.StratoProfile = {
    getLevel,
    getXp,
    addXP,
    addXp: addXP,       // alias — app.js calls addXp (lowercase x)
    addXPAction,
    addXPActionAlias: addXPAction,
    getProfile,
    updateProfile,
    loadProfile,
    submitScore,
    loadLeaderboard,
    updateXpUI,
    XP_REWARDS,
  };
})();
