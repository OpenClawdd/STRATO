/* ══════════════════════════════════════════════════════════
   STRATO v20 — Chat Module
   Connects to WebSocket at ws://host/ws/chat
   Handles room joining/leaving, message sending/receiving
   ══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  let ws = null;
  let currentRoom = 'general';
  let reconnectAttempts = 0;
  const MAX_RECONNECT = 10;
  const messages = {};
  const onlineUsers = new Set();

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    try {
      ws = new WebSocket(`${protocol}//${location.host}/ws/chat`);
    } catch (e) {
      console.warn('[Chat] WebSocket creation failed:', e);
      reconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      updateStatus(true);
      ws.send(JSON.stringify({ type: 'join', roomId: currentRoom }));
      console.log('[Chat] Connected to chat server');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (e) { console.error('[Chat] Parse error:', e); }
    };

    ws.onclose = () => {
      updateStatus(false);
      reconnect();
    };

    ws.onerror = () => updateStatus(false);
  }

  function reconnect() {
    if (reconnectAttempts >= MAX_RECONNECT) {
      // After 60 seconds of silence, allow retrying from scratch
      setTimeout(() => { reconnectAttempts = 0; connect(); }, 60000);
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    reconnectAttempts++;
    setTimeout(connect, delay);
  }

  function handleMessage(data) {
    switch (data.type) {
      case 'chat':
        if (!messages[data.roomId]) messages[data.roomId] = [];
        messages[data.roomId].push(data);
        if (data.roomId === currentRoom) renderMessage(data);
        // Notify app.js of new chat message
        if (window.STRATO_XP) window.STRATO_XP('chat');
        break;
      case 'message':
        // Alternate message type from server
        if (!messages[currentRoom]) messages[currentRoom] = [];
        const msg = { roomId: currentRoom, username: data.username, message: data.message, createdAt: data.time || Date.now() };
        messages[currentRoom].push(msg);
        renderMessage(msg);
        if (window.STRATO_XP) window.STRATO_XP('chat');
        break;
      case 'join':
      case 'user_joined':
        onlineUsers.add(data.username);
        renderOnlineUsers();
        addSystemMessage(`${data.username} joined the room`);
        break;
      case 'leave':
      case 'user_left':
        onlineUsers.delete(data.username);
        renderOnlineUsers();
        addSystemMessage(`${data.username} left the room`);
        break;
      case 'joined':
        // Room join confirmed by server
        break;
      case 'users':
        // Bulk user list from server
        if (Array.isArray(data.users)) {
          onlineUsers.clear();
          data.users.forEach(u => onlineUsers.add(u));
          renderOnlineUsers();
        }
        break;
      case 'error':
        if (window.showToast) window.showToast(data.message, 'error');
        else if (window.STRATO_TOAST) window.STRATO_TOAST(data.message, 'error');
        break;
      case 'history':
        messages[data.roomId] = data.messages || [];
        if (data.roomId === currentRoom) renderMessages();
        break;
      case 'system':
        addSystemMessage(data.message);
        break;
      case 'rateLimit':
        addSystemMessage('Rate limited — please slow down');
        break;
      case 'rooms':
        if (Array.isArray(data.rooms)) renderRoomList(data.rooms.map(r => ({ id: r, name: r })));
        break;
    }
  }

  function sendMessage(text) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!text.trim()) return;
    ws.send(JSON.stringify({
      type: 'chat',
      roomId: currentRoom,
      message: text.trim().slice(0, 500)
    }));
  }

  function joinRoom(roomId) {
    if (roomId === currentRoom) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'leave', roomId: currentRoom }));
      ws.send(JSON.stringify({ type: 'join', roomId }));
    }
    currentRoom = roomId;
    renderMessages();
    loadRoomInfo(roomId);

    // Update room title
    const titleEl = document.getElementById('chat-room-title') || document.getElementById('chat-room-name');
    if (titleEl) titleEl.textContent = `# ${roomId.charAt(0).toUpperCase() + roomId.slice(1)}`;

    // Highlight active room
    document.querySelectorAll('.chat-room-item').forEach(item => {
      item.classList.toggle('active', item.dataset.room === roomId);
    });
  }

  function addSystemMessage(text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat-message system';
    const content = document.createElement('div');
    content.className = 'chat-message-content';
    const textEl = document.createElement('div');
    textEl.className = 'chat-message-text';
    textEl.textContent = text;
    content.appendChild(textEl);
    div.appendChild(content);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function renderMessage(data) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const isOwn = data.username === (window.STRATO_USERNAME || localStorage.getItem('strato-username') || '');
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${isOwn ? 'own' : ''}`;

    const initial = data.username ? data.username.charAt(0).toUpperCase() : '?';
    const avatar = document.createElement('div');
    avatar.className = 'chat-message-avatar';
    avatar.textContent = initial;

    const content = document.createElement('div');
    content.className = 'chat-message-content';

    const header = document.createElement('div');
    header.className = 'chat-message-header';

    const usernameEl = document.createElement('span');
    usernameEl.className = 'chat-message-username';
    usernameEl.style.color = 'var(--accent)';
    usernameEl.textContent = data.username || 'Unknown';

    const timeEl = document.createElement('span');
    timeEl.className = 'chat-message-time';
    const ts = data.createdAt || data.time || Date.now();
    timeEl.textContent = typeof ts === 'number'
      ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ts;

    header.appendChild(usernameEl);
    header.appendChild(timeEl);

    const textEl = document.createElement('div');
    textEl.className = 'chat-message-text';
    textEl.textContent = data.message || '';

    content.appendChild(header);
    content.appendChild(textEl);

    msgEl.appendChild(avatar);
    msgEl.appendChild(content);

    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;

    // Update home chat count (element may not exist on all views)
    try {
      const homeCount = document.getElementById('home-chat-count');
      if (homeCount) homeCount.textContent = `${onlineUsers.size} online`;
    } catch (e) { /* element not in DOM */ }
  }

  function renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';
    const roomMsgs = messages[currentRoom] || [];
    roomMsgs.forEach(m => renderMessage(m));
  }

  function renderOnlineUsers() {
    const list = document.getElementById('chat-online-list');
    const count = document.getElementById('chat-online-count');
    if (!list) return;
    list.innerHTML = '';
    if (count) count.textContent = onlineUsers.size;
    onlineUsers.forEach(user => {
      const item = document.createElement('div');
      item.className = 'chat-user-item';
      const avatar = document.createElement('div');
      avatar.className = 'chat-user-avatar';
      avatar.textContent = user.charAt(0).toUpperCase();
      const name = document.createElement('span');
      name.className = 'chat-user-name';
      name.textContent = user;
      const online = document.createElement('span');
      online.className = 'chat-user-online';
      item.appendChild(avatar);
      item.appendChild(name);
      item.appendChild(online);
      list.appendChild(item);
    });

    // Update home widget (element may not exist on all views)
    try {
      const homeCount = document.getElementById('home-chat-count');
      if (homeCount) homeCount.textContent = `${onlineUsers.size} online`;
    } catch (e) { /* element not in DOM */ }

    // Update status bar count
    const statusCount = document.getElementById('chat-online-count');
    if (statusCount) statusCount.textContent = `${onlineUsers.size} online`;
  }

  function updateStatus(connected) {
    // Update via status-ws dot indicator and label
    const wsDot = document.querySelector('#status-ws .dot-indicator');
    const wsLabel = document.querySelector('#status-ws .status-label');

    if (wsDot) {
      wsDot.className = `dot-indicator ${connected ? 'online' : 'offline'}`;
    }
    if (wsLabel) {
      wsLabel.textContent = connected ? 'Connected' : 'Disconnected';
      wsLabel.style.color = connected ? 'var(--success)' : 'var(--error)';
    }
  }

  async function loadRooms() {
    try {
      const resp = await fetch('/api/chat/rooms');
      if (!resp.ok) return;
      const data = await resp.json();
      renderRoomList(Array.isArray(data) ? data : data.rooms || []);
    } catch (e) { console.error('[Chat] Load rooms error:', e); }
  }

  function renderRoomList(rooms) {
    const list = document.getElementById('chat-room-list');
    if (!list) return;
    list.innerHTML = '';
    rooms.forEach(room => {
      const id = room.id || room;
      const name = room.name || room;
      const div = document.createElement('div');
      div.className = `chat-room-item ${id === currentRoom ? 'active' : ''}`;
      div.dataset.room = id;
      div.innerHTML = `
        <div class="chat-room-icon">#</div>
        <div style="flex:1;overflow:hidden">
          <div class="chat-room-name">${escapeHtml(name.charAt(0).toUpperCase() + name.slice(1))}</div>
          <div class="chat-room-preview">Join this room</div>
        </div>
      `;
      div.onclick = () => joinRoom(id);
      list.appendChild(div);
    });
  }

  async function loadRoomInfo(roomId) {
    const name = document.getElementById('chat-room-name') || document.getElementById('chat-room-title');
    if (name) name.textContent = `# ${roomId.charAt(0).toUpperCase() + roomId.slice(1)}`;
    // Load history
    try {
      const resp = await fetch(`/api/chat/rooms/${roomId}/messages`);
      if (!resp.ok) return;
      const data = await resp.json();
      messages[roomId] = data.messages || data || [];
      renderMessages();
    } catch (e) { console.error('[Chat] Load messages error:', e); }
  }

  async function createRoom(name, description) {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const csrf = csrfMeta ? csrfMeta.content : '';
    try {
      const resp = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ name, description })
      });
      if (resp.ok) { loadRooms(); return true; }
      return false;
    } catch (e) { return false; }
  }

  // Setup input listeners
  function init() {
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('btn-send-message');
    const chatCreateRoomBtn = document.getElementById('chat-create-room-btn') || document.getElementById('btn-create-room');

    if (chatSendBtn) chatSendBtn.addEventListener('click', () => {
      if (chatInput) {
        sendMessage(chatInput.value);
        chatInput.value = '';
      }
    });

    if (chatInput) chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage(chatInput.value);
        chatInput.value = '';
      }
    });

    // Room item clicks
    document.querySelectorAll('.chat-room-item').forEach(item => {
      item.addEventListener('click', () => {
        const room = item.dataset.room;
        if (room) joinRoom(room);
      });
    });

    // Create room button
    if (chatCreateRoomBtn) {
      chatCreateRoomBtn.addEventListener('click', () => {
        const name = prompt('Room name (lowercase, no spaces):');
        if (!name) return;
        const clean = name.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (!clean) return;
        createRoom(clean).then(ok => {
          if (ok) {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'createRoom', room: clean }));
            }
            joinRoom(clean);
          }
        });
      });
    }

    // Connect WebSocket
    connect();
    // Load rooms from API
    loadRooms();
  }

  // Initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose to app.js
  window.StratoChat = {
    connect,
    sendMessage,
    joinRoom,
    loadRooms,
    createRoom,
    get currentRoom() { return currentRoom; },
    get onlineUsers() { return onlineUsers; },
    get connected() { return ws && ws.readyState === WebSocket.OPEN; }
  };
})();
