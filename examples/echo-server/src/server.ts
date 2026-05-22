import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer, type RawData } from "ws";

const host = process.env.HOST ?? "127.0.0.1";
const port = parsePort(process.env.PORT ?? "17787");
const serverMessageIntervalMs = parseInterval(process.env.SERVER_MESSAGE_INTERVAL_MS ?? "5000");

const server = new WebSocketServer({ host, port });
const clients = new Map<WebSocket, ClientState>();

type ClientState = {
  id: string;
  remoteAddress: string;
  serverMessageSequence: number;
  timer: NodeJS.Timeout;
};

type JsonObject = Record<string, unknown>;

type ClientCommand =
  | {
      command: "broadcast";
      message?: unknown;
    }
  | {
      command: "clients" | "help" | "ping" | "time";
    };

server.on("connection", (socket, request) => {
  const remoteAddress = request.socket.remoteAddress ?? "unknown";
  const state: ClientState = {
    id: `client_${randomUUID()}`,
    remoteAddress,
    serverMessageSequence: 0,
    timer: setInterval(() => sendPeriodicServerMessage(socket), serverMessageIntervalMs),
  };

  clients.set(socket, state);
  console.log(`client connected: ${state.id} from ${remoteAddress}`);

  sendJson(socket, {
    activeClients: clients.size,
    commands: ["ping", "time", "clients", "broadcast", "help"],
    message: "Connected to SocketLens echo server",
    serverMessageIntervalMs,
    timestamp: new Date().toISOString(),
    type: "server.welcome",
  });

  socket.on("message", (data, isBinary) => {
    socket.send(data, { binary: isBinary });

    if (!isBinary) {
      handleTextMessage(socket, data);
    }
  });

  socket.on("close", (code, reason) => {
    clearInterval(state.timer);
    clients.delete(socket);
    console.log(`client disconnected: ${state.id} code=${code} reason=${reason.toString() || "none"}`);
  });

  socket.on("error", (error) => {
    console.error(`client error: ${state.id}`, error);
  });
});

server.on("listening", () => {
  console.log(`SocketLens echo server listening on ws://${host}:${port}`);
  console.log(`Periodic server messages every ${serverMessageIntervalMs}ms`);
});

server.on("error", (error) => {
  console.error("echo server error", error);
  process.exitCode = 1;
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

function handleTextMessage(socket: WebSocket, data: RawData) {
  const payload = rawDataToString(data);
  const parsed = parseJsonObject(payload);

  if (!parsed || !("command" in parsed)) {
    return;
  }

  const command = normalizeCommand(parsed);

  if (!command) {
    sendJson(socket, {
      message: "Unknown command. Send {\"command\":\"help\"} for supported commands.",
      received: parsed,
      type: "command.error",
    });
    return;
  }

  switch (command.command) {
    case "broadcast":
      broadcastCommand(socket, command.message);
      return;
    case "clients":
      sendJson(socket, {
        clients: [...clients.values()].map(({ id, remoteAddress }) => ({ id, remoteAddress })),
        count: clients.size,
        type: "command.clients",
      });
      return;
    case "help":
      sendJson(socket, {
        commands: {
          broadcast: { example: { command: "broadcast", message: "Hello all clients" } },
          clients: { example: { command: "clients" } },
          help: { example: { command: "help" } },
          ping: { example: { command: "ping" } },
          time: { example: { command: "time" } },
        },
        type: "command.help",
      });
      return;
    case "ping":
      sendJson(socket, {
        receivedAt: new Date().toISOString(),
        type: "command.pong",
      });
      return;
    case "time":
      sendJson(socket, {
        timestamp: new Date().toISOString(),
        type: "command.time",
      });
      return;
  }
}

function sendPeriodicServerMessage(socket: WebSocket) {
  const state = clients.get(socket);

  if (!state || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  state.serverMessageSequence += 1;

  sendJson(socket, {
    activeClients: clients.size,
    clientId: state.id,
    message: "Periodic message from SocketLens echo server",
    sequence: state.serverMessageSequence,
    timestamp: new Date().toISOString(),
    type: "server.message",
  });
}

function broadcastCommand(sender: WebSocket, message: unknown) {
  const senderState = clients.get(sender);
  const text = typeof message === "string" && message.trim().length > 0 ? message : "Broadcast from echo server";

  for (const client of clients.keys()) {
    if (client.readyState === WebSocket.OPEN) {
      sendJson(client, {
        from: senderState?.id ?? "unknown",
        message: text,
        timestamp: new Date().toISOString(),
        type: "server.broadcast",
      });
    }
  }
}

function normalizeCommand(payload: JsonObject): ClientCommand | null {
  const command = payload.command;

  if (typeof command !== "string") {
    return null;
  }

  const normalizedCommand = command.toLowerCase();

  switch (normalizedCommand) {
    case "broadcast":
      return {
        command: "broadcast",
        message: payload.message,
      };
    case "clients":
    case "help":
    case "ping":
    case "time":
      return { command: normalizedCommand };
    default:
      return null;
  }
}

function sendJson(socket: WebSocket, payload: JsonObject) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload, null, 2));
  }
}

function parseJsonObject(payload: string): JsonObject | null {
  try {
    const parsed = JSON.parse(payload) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonObject) : null;
  } catch {
    return null;
  }
}

function rawDataToString(data: RawData) {
  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf8");
  }

  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }

  return Buffer.from(new Uint8Array(data)).toString("utf8");
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
    throw new Error(`Invalid SERVER_MESSAGE_INTERVAL_MS value: ${value}. Use 500 or greater.`);
  }

  return nextInterval;
}

function shutdown(signal: NodeJS.Signals) {
  console.log(`received ${signal}, shutting down echo server`);

  for (const [socket, state] of clients.entries()) {
    clearInterval(state.timer);
    socket.close(1001, "Server shutting down");
  }

  server.close(() => {
    process.exit(0);
  });
}
