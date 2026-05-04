// ── STRATO v21 — WebSocket Chat Integration Tests ──
// Tests for src/websocket.js: connection, auth, rooms, messages, rate limiting, heartbeat

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createServer } from 'http';
import { WebSocket } from 'ws';
import cookieSignature from 'cookie-signature';
import express from 'express';

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'test-secret-key-for-vitest';

function signCookie(value, secret = COOKIE_SECRET) {
  return 's:' + cookieSignature.sign(value, secret);
}

// ── Shared server for all WebSocket tests ──
let server;
let wsPort;
const openSockets = new Set();

beforeAll(async () => {
  const { default: cookieParser } = await import('cookie-parser');
  const { initWebSocket } = await import('../../src/websocket.js');

  const app = express();
  app.use(cookieParser(COOKIE_SECRET));
  app.use(express.json());

  server = createServer(app);
  initWebSocket(server);

  await new Promise((resolve) => {
    server.listen(0, () => {
      wsPort = server.address().port;
      resolve();
    });
  });
}, 30000);

afterAll(async () => {
  for (const ws of openSockets) {
    try { ws.close(); } catch {}
  }
  await new Promise((resolve) => {
    server.close(() => resolve());
  });
}, 15000);

afterEach(async () => {
  for (const ws of [...openSockets]) {
    try { ws.close(); } catch {}
  }
  await new Promise((resolve) => setTimeout(resolve, 20));
});

// ── Helper: connect a WebSocket client and wait for the welcome message ──
function connectWS(username = 'testuser') {
  return new Promise((resolve, reject) => {
    const signedValue = signCookie(username);
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws/chat`, {
      headers: {
        Cookie: `strato_auth=${signedValue}`,
      },
    });

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket connection timeout'));
    }, 10000);

    // Collect initial messages
    const initialMessages = [];
    let resolved = false;

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (!resolved && msg.type === 'connected') {
          resolved = true;
          clearTimeout(timeout);
          openSockets.add(ws);
          ws.on('close', () => openSockets.delete(ws));
          resolve({ ws, welcomeMsg: msg });
        }
      } catch {}
    });

    ws.on('unexpected-response', (req, res) => {
      clearTimeout(timeout);
      reject(new Error(`WebSocket rejected with status ${res.statusCode}`));
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ── Helper: receive a message from WebSocket ──
function waitForMessage(ws, type = null, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error(`Message timeout (waiting for type: ${type})`));
    }, timeoutMs);

    function handler(data) {
      try {
        const msg = JSON.parse(data.toString());
        if (!type || msg.type === type) {
          clearTimeout(timer);
          ws.off('message', handler);
          resolve(msg);
        }
      } catch (err) {
        clearTimeout(timer);
        ws.off('message', handler);
        reject(err);
      }
    }

    ws.on('message', handler);
  });
}

// ── Helper: collect all messages for a duration ──
function collectMessages(ws, durationMs = 500) {
  return new Promise((resolve) => {
    const messages = [];
    function handler(data) {
      try { messages.push(JSON.parse(data.toString())); } catch {}
    }
    ws.on('message', handler);
    setTimeout(() => {
      ws.off('message', handler);
      resolve(messages);
    }, durationMs);
  });
}

describe('WebSocket Chat', () => {
  describe('Connection', () => {
    it('should connect with valid auth cookie', async () => {
      const { ws, welcomeMsg } = await connectWS('ws_connect_user');

      expect(welcomeMsg.type).toBe('connected');
      expect(welcomeMsg.username).toBe('ws_connect_user');

      ws.close();
    });

    it('should reject connection without auth cookie', async () => {
      await expect(
        new Promise((resolve, reject) => {
          const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws/chat`);
          ws.on('error', (err) => reject(err));
          ws.on('unexpected-response', (req, res) => {
            reject(new Error(`Status ${res.statusCode}`));
          });
          ws.on('open', () => resolve(ws));
        })
      ).rejects.toThrow();
    });

    it('should reject connection with invalid auth cookie', async () => {
      await expect(
        new Promise((resolve, reject) => {
          const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws/chat`, {
            headers: { Cookie: 'strato_auth=tampered_value' },
          });
          ws.on('error', (err) => reject(err));
          ws.on('unexpected-response', (req, res) => {
            reject(new Error(`Status ${res.statusCode}`));
          });
          ws.on('open', () => resolve(ws));
        })
      ).rejects.toThrow();
    });
  });

  describe('Room joining', () => {
    it('should join a room and receive confirmation', async () => {
      const { default: store } = await import('../../src/db/store.js');
      const room = await store.create('chat_rooms', { name: 'ws-join-' + Date.now(), description: 'Test', created_by: 'system' });

      const { ws } = await connectWS('ws_join_' + Date.now());

      ws.send(JSON.stringify({ type: 'join', roomId: room.id }));
      const msg = await waitForMessage(ws, 'joined');

      expect(msg.type).toBe('joined');
      expect(msg.roomId).toBe(room.id);

      ws.close();
    });

    it('should create and join an ad-hoc room when missing', async () => {
      const { ws } = await connectWS('ws_noroom_' + Date.now());

      ws.send(JSON.stringify({ type: 'join', roomId: 'nonexistent_room_id_xyz' }));
      const msg = await waitForMessage(ws, 'joined');

      expect(msg.roomName).toBe('nonexistent_room_id_xyz');

      ws.close();
    });

    it('should receive error when joining without roomId', async () => {
      const { ws } = await connectWS('ws_noid_' + Date.now());

      ws.send(JSON.stringify({ type: 'join' }));
      const msg = await waitForMessage(ws, 'error');

      expect(msg.error).toContain('roomId');

      ws.close();
    });
  });

  describe('Chat messages', () => {
    it('should send a message to a room', async () => {
      const { default: store } = await import('../../src/db/store.js');
      const room = await store.create('chat_rooms', { name: 'ws-msg-' + Date.now(), description: 'Test', created_by: 'system' });

      const { ws } = await connectWS('ws_msg_' + Date.now());

      ws.send(JSON.stringify({ type: 'join', roomId: room.id }));
      await waitForMessage(ws, 'joined');

      ws.send(JSON.stringify({ type: 'chat', roomId: room.id, message: 'Hello, world!' }));
      const msg = await waitForMessage(ws, 'chat');

      expect(msg.type).toBe('chat');
      expect(msg.message).toBe('Hello, world!');
      expect(msg).toHaveProperty('id');
      expect(msg).toHaveProperty('created_at');

      ws.close();
    });

    it('should reject empty messages', async () => {
      const { default: store } = await import('../../src/db/store.js');
      const room = await store.create('chat_rooms', { name: 'ws-empty-' + Date.now(), description: 'Test', created_by: 'system' });

      const { ws } = await connectWS('ws_empty_' + Date.now());
      ws.send(JSON.stringify({ type: 'join', roomId: room.id }));
      await waitForMessage(ws, 'joined');

      ws.send(JSON.stringify({ type: 'chat', roomId: room.id, message: '' }));
      const msg = await waitForMessage(ws, 'error');

      expect(msg.error).toContain('1-500 characters');

      ws.close();
    });

    it('should reject messages over 500 characters', async () => {
      const { default: store } = await import('../../src/db/store.js');
      const room = await store.create('chat_rooms', { name: 'ws-long-' + Date.now(), description: 'Test', created_by: 'system' });

      const { ws } = await connectWS('ws_long_' + Date.now());
      ws.send(JSON.stringify({ type: 'join', roomId: room.id }));
      await waitForMessage(ws, 'joined');

      ws.send(JSON.stringify({ type: 'chat', roomId: room.id, message: 'x'.repeat(501) }));
      const msg = await waitForMessage(ws, 'error');

      expect(msg.error).toContain('1-500 characters');

      ws.close();
    });

    it('should reject message without roomId', async () => {
      const { ws } = await connectWS('ws_no_room_' + Date.now());

      ws.send(JSON.stringify({ type: 'chat', message: 'hello' }));
      const msg = await waitForMessage(ws, 'error');

      expect(msg.error).toContain('roomId');

      ws.close();
    });

    it('should reject message from user not in the room', async () => {
      const { default: store } = await import('../../src/db/store.js');
      const room = await store.create('chat_rooms', { name: 'ws-nojoin-' + Date.now(), description: 'Test', created_by: 'system' });

      const { ws } = await connectWS('ws_noshow_' + Date.now());

      ws.send(JSON.stringify({ type: 'chat', roomId: room.id, message: 'sneaky' }));
      const msg = await waitForMessage(ws, 'error');

      expect(msg.error).toContain('not in this room');

      ws.close();
    });

    it('should trim whitespace from messages', async () => {
      const { default: store } = await import('../../src/db/store.js');
      const room = await store.create('chat_rooms', { name: 'ws-trim-' + Date.now(), description: 'Test', created_by: 'system' });

      const { ws } = await connectWS('ws_trim_' + Date.now());
      ws.send(JSON.stringify({ type: 'join', roomId: room.id }));
      await waitForMessage(ws, 'joined');

      ws.send(JSON.stringify({ type: 'chat', roomId: room.id, message: '  hello  ' }));
      const msg = await waitForMessage(ws, 'chat');

      expect(msg.message).toBe('hello');

      ws.close();
    });
  });

  describe('Room leaving', () => {
    it('should leave a room and receive confirmation', async () => {
      const { default: store } = await import('../../src/db/store.js');
      const room = await store.create('chat_rooms', { name: 'ws-leave-' + Date.now(), description: 'Test', created_by: 'system' });

      const { ws } = await connectWS('ws_leave_' + Date.now());
      ws.send(JSON.stringify({ type: 'join', roomId: room.id }));
      await waitForMessage(ws, 'joined');

      ws.send(JSON.stringify({ type: 'leave', roomId: room.id }));
      const msg = await waitForMessage(ws, 'left');

      expect(msg.type).toBe('left');
      expect(msg.roomId).toBe(room.id);

      ws.close();
    });
  });

  describe('Rate limiting', () => {
    it('should rate limit after 5 messages in 5 seconds', async () => {
      const { default: store } = await import('../../src/db/store.js');
      const room = await store.create('chat_rooms', { name: 'ws-rate-' + Date.now(), description: 'Test', created_by: 'system' });

      const { ws } = await connectWS('ws_rate_' + Date.now());
      ws.send(JSON.stringify({ type: 'join', roomId: room.id }));
      await waitForMessage(ws, 'joined');

      for (let i = 0; i < 5; i++) {
        ws.send(JSON.stringify({ type: 'chat', roomId: room.id, message: `msg ${i}` }));
        await waitForMessage(ws, 'chat', 3000);
      }

      // 6th message should be rate limited
      ws.send(JSON.stringify({ type: 'chat', roomId: room.id, message: 'one more' }));

      const msgs = await collectMessages(ws, 2000);
      const rateLimitMsg = msgs.find((m) => m.type === 'error' && m.error.includes('Rate'));
      expect(rateLimitMsg).toBeDefined();

      ws.close();
    });
  });

  describe('Invalid messages', () => {
    it('should return error for invalid JSON', async () => {
      const { ws } = await connectWS('ws_badjson_' + Date.now());

      ws.send('not json at all');
      const msg = await waitForMessage(ws, 'error');

      expect(msg.error).toContain('Invalid JSON');

      ws.close();
    });

    it('should return error for unknown message type', async () => {
      const { ws } = await connectWS('ws_badtype_' + Date.now());

      ws.send(JSON.stringify({ type: 'hack_the_planet' }));
      const msg = await waitForMessage(ws, 'error');

      expect(msg.error).toContain('Unknown message type');

      ws.close();
    });
  });

  describe('Broadcast', () => {
    it('should broadcast messages to other users in the room', async () => {
      const { default: store } = await import('../../src/db/store.js');
      const room = await store.create('chat_rooms', { name: 'ws-bcast-' + Date.now(), description: 'Test', created_by: 'system' });

      const { ws: ws1 } = await connectWS('ws_sender_' + Date.now());
      ws1.send(JSON.stringify({ type: 'join', roomId: room.id }));
      await waitForMessage(ws1, 'joined');

      const { ws: ws2 } = await connectWS('ws_receiver_' + Date.now());
      ws2.send(JSON.stringify({ type: 'join', roomId: room.id }));
      await waitForMessage(ws2, 'joined');

      // User 1 sends message
      ws1.send(JSON.stringify({ type: 'chat', roomId: room.id, message: 'Broadcast test!' }));

      // User 2 should receive it
      const msg = await waitForMessage(ws2, 'chat');
      expect(msg.message).toBe('Broadcast test!');

      ws1.close();
      ws2.close();
    });

    it('should broadcast user_joined when another user joins', async () => {
      const { default: store } = await import('../../src/db/store.js');
      const room = await store.create('chat_rooms', { name: 'ws-ujoin-' + Date.now(), description: 'Test', created_by: 'system' });

      const { ws: ws1 } = await connectWS('ws_stayer_' + Date.now());
      ws1.send(JSON.stringify({ type: 'join', roomId: room.id }));
      await waitForMessage(ws1, 'joined');

      const { ws: ws2 } = await connectWS('ws_joiner_' + Date.now());
      ws2.send(JSON.stringify({ type: 'join', roomId: room.id }));

      // User 1 should get a user_joined notification
      const msg = await waitForMessage(ws1, 'user_joined');
      expect(msg.type).toBe('user_joined');

      ws1.close();
      ws2.close();
    });
  });
});
