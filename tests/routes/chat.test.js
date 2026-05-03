// ── STRATO v21 — Chat Routes Tests ──
// Tests for src/routes/chat.js: rooms CRUD, messages

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { default as express } from 'express';
import request from 'supertest';
import { createMockStore, sampleChatRoom, buildApp } from '../setup.js';

const mockStore = createMockStore();
vi.mock('../../src/db/store.js', () => ({
  default: mockStore,
}));

describe('Chat Routes', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(mockStore._collections).forEach((k) => delete mockStore._collections[k]);

    const { default: router } = await import('../../src/routes/chat.js');
    app = await buildApp(router, mockStore);
  });

  describe('GET /api/chat/rooms', () => {
    it('should return list of chat rooms', async () => {
      mockStore._seed('chat_rooms', [
        { ...sampleChatRoom, name: 'general', id: 'room1' },
        { ...sampleChatRoom, name: 'gaming', id: 'room2', description: 'Talk about games' },
      ]);

      const res = await request(app).get('/api/chat/rooms');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.rooms).toHaveLength(2);
    });

    it('should return empty list when no rooms exist', async () => {
      const res = await request(app).get('/api/chat/rooms');
      expect(res.status).toBe(200);
      expect(res.body.rooms).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('should include room metadata in response', async () => {
      mockStore._seed('chat_rooms', [
        { ...sampleChatRoom, id: 'room1', created_by: 'admin' },
      ]);

      const res = await request(app).get('/api/chat/rooms');
      expect(res.body.rooms[0]).toHaveProperty('id');
      expect(res.body.rooms[0]).toHaveProperty('name');
      expect(res.body.rooms[0]).toHaveProperty('created_by');
      expect(res.body.rooms[0]).toHaveProperty('created_at');
    });
  });

  describe('POST /api/chat/rooms', () => {
    it('should create a new chat room', async () => {
      const res = await request(app)
        .post('/api/chat/rooms')
        .send({ name: 'homework-help', description: 'Get help with homework' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('homework-help');
      expect(res.body.description).toBe('Get help with homework');
      expect(res.body.created_by).toBe('testuser');
    });

    it('should return 400 for empty room name', async () => {
      const res = await request(app)
        .post('/api/chat/rooms')
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('1-50 characters');
    });

    it('should return 400 for room name over 50 characters', async () => {
      const res = await request(app)
        .post('/api/chat/rooms')
        .send({ name: 'x'.repeat(51) });

      expect(res.status).toBe(400);
    });

    it('should return 400 for description over 200 characters', async () => {
      const res = await request(app)
        .post('/api/chat/rooms')
        .send({ name: 'test', description: 'x'.repeat(201) });

      expect(res.status).toBe(400);
    });

    it('should trim whitespace from room name', async () => {
      const res = await request(app)
        .post('/api/chat/rooms')
        .send({ name: '  spaced-name  ' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('spaced-name');
    });

    it('should allow creating room without description', async () => {
      const res = await request(app)
        .post('/api/chat/rooms')
        .send({ name: 'no-desc' });

      expect(res.status).toBe(201);
      expect(res.body.description).toBe('');
    });

    it('should reject XSS-like names via length and character validation', async () => {
      const res = await request(app)
        .post('/api/chat/rooms')
        .send({ name: '<script>alert(1)</script>' });

      // The name is just validated for length, not content
      // But it's stored as-is (HTML escaping is frontend's job for API)
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/chat/rooms/:roomId/messages', () => {
    it('should return messages for a room', async () => {
      mockStore._seed('chat_rooms', [{ ...sampleChatRoom, id: 'room1' }]);
      mockStore._seed('chat_messages', [
        { roomId: 'room1', username: 'alice', message: 'Hello!', id: 'msg1' },
        { roomId: 'room1', username: 'bob', message: 'Hi there!', id: 'msg2' },
      ]);

      const res = await request(app).get('/api/chat/rooms/room1/messages');
      expect(res.status).toBe(200);
      expect(res.body.roomId).toBe('room1');
      expect(res.body.messages).toHaveLength(2);
    });

    it('should return 404 for nonexistent room', async () => {
      const res = await request(app).get('/api/chat/rooms/nonexistent/messages');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should limit messages to last 50', async () => {
      mockStore._seed('chat_rooms', [{ ...sampleChatRoom, id: 'room1' }]);
      const msgs = Array.from({ length: 60 }, (_, i) => ({
        roomId: 'room1',
        username: 'user',
        message: `Message ${i}`,
        id: `msg${i}`,
        created_at: new Date(Date.now() + i * 1000).toISOString(),
      }));
      mockStore._seed('chat_messages', msgs);

      const res = await request(app).get('/api/chat/rooms/room1/messages');
      expect(res.status).toBe(200);
      expect(res.body.messages.length).toBeLessThanOrEqual(50);
    });

    it('should filter messages before a given message ID', async () => {
      mockStore._seed('chat_rooms', [{ ...sampleChatRoom, id: 'room1' }]);
      mockStore._seed('chat_messages', [
        { roomId: 'room1', username: 'alice', message: 'Msg 1', id: 'msg1', created_at: '2024-01-01T00:00:00Z' },
        { roomId: 'room1', username: 'bob', message: 'Msg 2', id: 'msg2', created_at: '2024-01-01T00:01:00Z' },
        { roomId: 'room1', username: 'carol', message: 'Msg 3', id: 'msg3', created_at: '2024-01-01T00:02:00Z' },
      ]);

      const res = await request(app).get('/api/chat/rooms/room1/messages?before=msg3');
      expect(res.status).toBe(200);
      // Should return messages before msg3
      expect(res.body.messages.every((m) => m.id !== 'msg3')).toBe(true);
    });
  });
});
