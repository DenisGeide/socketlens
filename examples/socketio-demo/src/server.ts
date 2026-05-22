import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";

const host = process.env.HOST ?? "127.0.0.1";
const port = parsePort(process.env.PORT ?? "17810");
const heartbeatIntervalMs = parseInterval(process.env.HEARTBEAT_INTERVAL_MS ?? "4000");
const notificationIntervalMs = parseInterval(process.env.NOTIFICATION_INTERVAL_MS ?? "9000");
const presenceIntervalMs = parseInterval(process.env.PRESENCE_INTERVAL_MS ?? "6000");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
  transports: ["websocket"],
});
const chatNamespace = io.of("/chat");

type AckCallback = (response: JsonObject) => void;
type JsonObject = Record<string, unknown>;
type SocketState = {
  authRequestId: string;
  heartbeatTimer: NodeJS.Timeout;
  notificationTimer: NodeJS.Timeout;
  presenceTimer: NodeJS.Timeout;
  roomId: string;
  sessionId: string;
};

const socketState = new Map<string, SocketState>();

chatNamespace.on("connection", (socket) => {
  const state: SocketState = {
    authRequestId: `req_${randomUUID()}`,
    heartbeatTimer: setInterval(() => emitHeartbeat(socket), heartbeatIntervalMs),
    notificationTimer: setInterval(() => emitNotification(socket), notificationIntervalMs),
    presenceTimer: setInterval(() => emitPresence(socket), presenceIntervalMs),
    roomId: "room_product_launch",
    sessionId: `sess_${randomUUID()}`,
  };

  socketState.set(socket.id, state);

  console.log(`Socket.IO client connected: ${socket.id} namespace=/chat`);

  socket.emit("auth.challenge", {
    issuedAt: new Date().toISOString(),
    namespace: "/chat",
    requestId: state.authRequestId,
    scopes: ["chat:read", "chat:write", "notifications:read"],
    sessionId: state.sessionId,
  });

  setTimeout(() => {
    if (socket.connected) {
      socket.emit("auth.accepted", {
        expiresInSeconds: 3600,
        receivedAt: new Date().toISOString(),
        requestId: state.authRequestId,
        scopes: ["chat:read", "chat:write", "notifications:read"],
        userId: "usr_demo_developer",
      });
    }
  }, 350);

  socket.on("chat.message", (payload: unknown, acknowledge?: AckCallback) => {
    const message = normalizeObject(payload);
    const text = typeof message.text === "string" && message.text.trim() ? message.text.trim() : "Hello from SocketLens";
    const outgoingMessage = {
      channelId: state.roomId,
      createdAt: new Date().toISOString(),
      id: `msg_${randomUUID()}`,
      sender: {
        displayName: "SocketLens Demo",
        id: "usr_demo_developer",
      },
      text,
    };

    acknowledge?.({
      deliveredAt: new Date().toISOString(),
      messageId: outgoingMessage.id,
      ok: true,
    });

    socket.emit("chat.message.created", outgoingMessage);
  });

  socket.on("presence.update", (payload: unknown, acknowledge?: AckCallback) => {
    const presence = normalizeObject(payload);
    const status = typeof presence.status === "string" ? presence.status : "online";

    acknowledge?.({
      ok: true,
      receivedAt: new Date().toISOString(),
      status,
    });

    socket.emit("presence.updated", {
      activeUsers: 4,
      receivedAt: new Date().toISOString(),
      status,
      userId: "usr_demo_developer",
    });
  });

  socket.on("cause.error", (_payload: unknown, acknowledge?: AckCallback) => {
    acknowledge?.({
      code: "RATE_LIMIT_SIMULATED",
      ok: false,
      retryAfterMs: 1200,
    });

    socket.emit("server.error", {
      code: "RATE_LIMIT_SIMULATED",
      detail: "Simulated Socket.IO error for debugger testing.",
      requestId: `req_${randomUUID()}`,
      severity: "warning",
    });
  });

  socket.on("disconnect", (reason) => {
    clearSocketState(socket.id);
    console.log(`Socket.IO client disconnected: ${socket.id} reason=${reason}`);
  });
});

httpServer.listen(port, host, () => {
  console.log(`SocketLens Socket.IO demo listening on http://${host}:${port}`);
  console.log(`Direct Mode transport URL: ws://${host}:${port}/socket.io/?EIO=4&transport=websocket`);
  console.log("Manual frames for SocketLens Direct Mode:");
  console.log("  40/chat,");
  console.log('  42/chat,1["chat.message",{"text":"Hello from SocketLens","room":"launch"}]');
  console.log('  42/chat,2["presence.update",{"status":"typing"}]');
  console.log('  42/chat,3["cause.error",{}]');
});

httpServer.on("error", (error) => {
  console.error("Socket.IO demo server error", error);
  process.exitCode = 1;
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

function emitHeartbeat(socket: Socket) {
  if (!socket.connected) {
    return;
  }

  socket.emit("heartbeat.pong", {
    latencyMs: 42,
    receivedAt: new Date().toISOString(),
    transport: "websocket",
  });
}

function emitNotification(socket: Socket) {
  if (!socket.connected) {
    return;
  }

  socket.emit("notification.created", {
    createdAt: new Date().toISOString(),
    id: `not_${randomUUID()}`,
    priority: "normal",
    title: "New launch-room mention",
  });
}

function emitPresence(socket: Socket) {
  if (!socket.connected) {
    return;
  }

  socket.emit("presence.updated", {
    activeUsers: 4,
    cursor: {
      line: 42,
      userId: "usr_nina",
    },
    receivedAt: new Date().toISOString(),
  });
}

function clearSocketState(socketId: string) {
  const state = socketState.get(socketId);

  if (!state) {
    return;
  }

  clearInterval(state.heartbeatTimer);
  clearInterval(state.notificationTimer);
  clearInterval(state.presenceTimer);
  socketState.delete(socketId);
}

function normalizeObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function parsePort(value: string) {
  const nextPort = Number.parseInt(value, 10);

  if (!Number.isInteger(nextPort) || nextPort < 1 || nextPort > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return nextPort;
}

function parseInterval(value: string) {
  const nextInterval = Number.parseInt(value, 10);

  if (!Number.isInteger(nextInterval) || nextInterval < 500) {
    throw new Error(`Invalid interval value: ${value}. Use 500 or greater.`);
  }

  return nextInterval;
}

function shutdown(signal: NodeJS.Signals) {
  console.log(`received ${signal}, shutting down Socket.IO demo server`);

  for (const socketId of socketState.keys()) {
    clearSocketState(socketId);
  }

  io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
}
