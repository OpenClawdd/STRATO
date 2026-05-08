import { WebSocketServer } from "ws";
import store from "./db/store.js";
import { validateAuthCookie } from "./middleware/auth.js";

// ── Rate limiting: 5 messages per 5 seconds per user ──
const RATE_LIMIT_WINDOW = 5000; // 5 seconds
const RATE_LIMIT_MAX = 5; // 5 messages

const userRateLimits = new Map(); // username -> { count, windowStart }

function checkRateLimit(username) {
  const now = Date.now();
  let record = userRateLimits.get(username);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    record = { count: 1, windowStart: now };
    userRateLimits.set(username, record);
    return true;
  }

  record.count++;
  if (record.count > RATE_LIMIT_MAX) {
    return false;
  }

  return true;
}

// ── Clean up rate limit entries periodically ──
const __stratoInterval780 = setInterval(() => {
  const now = Date.now();
  for (const [username, record] of userRateLimits.entries()) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW * 2) {
      userRateLimits.delete(username);
    }
  }
}, 30_000);
__stratoInterval780.unref?.();

// ── Track connected clients ──
const clients = new Map(); // ws -> { username, rooms: Set, alive: boolean }

// ── Heartbeat: ping/pong every 30s, disconnect after 60s idle ──
const HEARTBEAT_INTERVAL = 30_000;

function heartbeat(ws) {
  const client = clients.get(ws);
  if (client) {
    client.alive = true;
  }
}

const __stratoInterval1332 = setInterval(() => {
  for (const [ws, client] of clients.entries()) {
    if (!client.alive) {
      ws.terminate();
    } else {
      client.alive = false;
      ws.ping();
    }
  }
}, HEARTBEAT_INTERVAL);
__stratoInterval1332.unref?.();

// ── Broadcast message to all users in a room ──
function broadcastToRoom(roomId, message, excludeWs = null) {
  const msgStr = JSON.stringify(message);
  for (const [ws, client] of clients.entries()) {
    if (ws !== excludeWs && client.rooms.has(roomId) && ws.readyState === 1) {
      ws.send(msgStr);
    }
  }
}

// ── Handle incoming WebSocket messages ──
async function handleMessage(ws, data) {
  const client = clients.get(ws);
  if (!client) return;

  let msg;
  try {
    msg = JSON.parse(data);
  } catch {
    ws.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
    return;
  }

  switch (msg.type) {
    case "chat": {
      const { roomId, message } = msg;

      if (!roomId) {
        ws.send(JSON.stringify({ type: "error", error: "roomId is required" }));
        return;
      }

      if (message === undefined || message === null) {
        ws.send(
          JSON.stringify({ type: "error", error: "message is required" }),
        );
        return;
      }

      if (
        typeof message !== "string" ||
        message.trim().length === 0 ||
        message.length > 500
      ) {
        ws.send(
          JSON.stringify({
            type: "error",
            error: "Message must be 1-500 characters",
          }),
        );
        return;
      }

      // Rate limit
      if (!checkRateLimit(client.username)) {
        ws.send(
          JSON.stringify({ type: "error", error: "Rate limited: slow down" }),
        );
        return;
      }

      // Resolve room ID (client may send name or ID)
      let actualRoomId = roomId;
      if (!client.rooms.has(roomId)) {
        // Check if they're in the room by name — find the actual ID
        for (const rid of client.rooms) {
          const room = await store.getOne("chat_rooms", (r) => r.id === rid);
          if (room && (room.name === roomId || room.id === roomId)) {
            actualRoomId = rid;
            break;
          }
        }
      }

      // Verify user is in the room
      if (!client.rooms.has(actualRoomId)) {
        ws.send(
          JSON.stringify({ type: "error", error: "You are not in this room" }),
        );
        return;
      }

      // Store message in DB (use actual room ID)
      const stored = await store.create("chat_messages", {
        roomId: actualRoomId,
        username: client.username,
        message: message.trim(),
      });

      // Broadcast to room (use actual room ID for matching)
      broadcastToRoom(actualRoomId, {
        type: "chat",
        id: stored.id,
        roomId: actualRoomId,
        username: client.username,
        message: message.trim(),
        created_at: stored.created_at,
      });

      // Update user stats
      const user = await store.getOne(
        "users",
        (u) => u.username === client.username,
      );
      if (user) {
        await store.update("users", (u) => u.username === client.username, {
          stats: {
            ...user.stats,
            chat_messages: (user.stats?.chat_messages || 0) + 1,
          },
        });
      }
      break;
    }

    case "join": {
      const { roomId } = msg;
      if (!roomId) {
        ws.send(JSON.stringify({ type: "error", error: "roomId is required" }));
        return;
      }

      // Verify room exists — search by ID or by name
      let room = await store.getOne(
        "chat_rooms",
        (r) => r.id === roomId || r.name === roomId,
      );
      if (!room) {
        // Auto-create the room if it doesn't exist (supports ad-hoc room joining)
        try {
          room = await store.create("chat_rooms", {
            name: roomId,
            description: `${roomId} room`,
          });
        } catch (e) {
          ws.send(
            JSON.stringify({ type: "error", error: "Could not create room" }),
          );
          return;
        }
      }

      // Use the actual room ID for internal tracking
      const actualRoomId = room.id;
      client.rooms.add(actualRoomId);
      ws.send(
        JSON.stringify({
          type: "joined",
          roomId: actualRoomId,
          roomName: room.name,
        }),
      );

      // Notify room
      broadcastToRoom(
        actualRoomId,
        {
          type: "user_joined",
          roomId: actualRoomId,
          username: client.username,
        },
        ws,
      );
      break;
    }

    case "leave": {
      const { roomId } = msg;
      if (!roomId) return;

      client.rooms.delete(roomId);
      ws.send(JSON.stringify({ type: "left", roomId }));

      // Notify room
      broadcastToRoom(roomId, {
        type: "user_left",
        roomId,
        username: client.username,
      });
      break;
    }

    default:
      ws.send(
        JSON.stringify({
          type: "error",
          error: `Unknown message type: ${msg.type}`,
        }),
      );
  }
}

// ── Initialize WebSocket server ──
export function initWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests for /ws/chat
  server.on("upgrade", (req, socket, head) => {
    // Only handle /ws/chat upgrades — others are handled by the main server
    if (req.url === "/ws/chat") {
      // Validate auth cookie using the shared function from auth.js
      const cookieHeader = req.headers.cookie;
      const username = validateAuthCookie(cookieHeader);

      if (!username) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        ws._username = username;
        wss.emit("connection", ws, req);
      });
    }
  });

  wss.on("connection", (ws, req) => {
    const username = ws._username;
    clients.set(ws, {
      username,
      rooms: new Set(),
      alive: true,
    });

    console.log(`[STRATO] WebSocket connected: ${username}`);

    // Send welcome
    ws.send(
      JSON.stringify({
        type: "connected",
        username,
      }),
    );

    // Handle messages
    ws.on("message", (data) => {
      handleMessage(ws, data.toString());
    });

    // Handle pong (heartbeat response)
    ws.on("pong", () => {
      heartbeat(ws);
    });

    // Handle disconnect
    ws.on("close", () => {
      const client = clients.get(ws);
      if (client) {
        // Notify all rooms that user left
        for (const roomId of client.rooms) {
          broadcastToRoom(roomId, {
            type: "user_left",
            roomId,
            username: client.username,
          });
        }
        clients.delete(ws);
        console.log(`[STRATO] WebSocket disconnected: ${client.username}`);
      }
    });

    // Handle errors
    ws.on("error", (err) => {
      console.error("[STRATO] WebSocket error:", err.message);
    });
  });

  console.log("[STRATO] WebSocket chat server initialized at /ws/chat");
}

export default { initWebSocket };
