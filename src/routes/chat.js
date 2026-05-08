import { Router } from "express";
import store from "../db/store.js";

const router = Router();

// ── GET /api/chat/rooms — List all chat rooms ──
router.get("/api/chat/rooms", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const rooms = await store.getAll("chat_rooms");

    res.json({
      total: rooms.length,
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        created_by: r.created_by,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    console.error("[STRATO] Chat rooms GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch chat rooms" });
  }
});

// ── POST /api/chat/rooms — Create a chat room ──
router.post("/api/chat/rooms", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, description } = req.body;

    if (
      !name ||
      typeof name !== "string" ||
      name.trim().length < 1 ||
      name.trim().length > 50
    ) {
      return res
        .status(400)
        .json({ error: "Room name must be 1-50 characters" });
    }

    if (
      description &&
      (typeof description !== "string" || description.length > 200)
    ) {
      return res
        .status(400)
        .json({ error: "Description must be under 200 characters" });
    }

    const room = await store.create("chat_rooms", {
      name: name.trim(),
      description: description ? description.trim() : "",
      created_by: username,
    });

    res.status(201).json({
      id: room.id,
      name: room.name,
      description: room.description,
      created_by: room.created_by,
      created_at: room.created_at,
    });
  } catch (err) {
    console.error("[STRATO] Chat rooms POST error:", err.message);
    res.status(500).json({ error: "Failed to create chat room" });
  }
});

// ── GET /api/chat/rooms/:roomId/messages — Get last 50 messages ──
router.get("/api/chat/rooms/:roomId/messages", async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { roomId } = req.params;
    const before = req.query.before;

    // Verify room exists
    const room = await store.getOne("chat_rooms", (r) => r.id === roomId);
    if (!room) {
      return res.status(404).json({ error: "Chat room not found" });
    }

    let allMessages = await store.getAll("chat_messages");
    let messages = allMessages.filter((m) => m.roomId === roomId);

    // If 'before' parameter is provided, get messages before that message ID
    if (before) {
      const beforeIdx = messages.findIndex((m) => m.id === before);
      if (beforeIdx > -1) {
        messages = messages.slice(0, beforeIdx);
      }
    }

    // Sort by creation time, take last 50
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    messages = messages.slice(-50);

    res.json({
      roomId,
      messages: messages.map((m) => ({
        id: m.id,
        username: m.username,
        message: m.message,
        created_at: m.created_at,
      })),
    });
  } catch (err) {
    console.error("[STRATO] Chat messages GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

export default router;
