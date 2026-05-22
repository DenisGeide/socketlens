import type { EntityId } from "./ids";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";
export type ConnectionTransport = "demo" | "websocket";

export type Connection = {
  createdAt: number;
  endpointUrl: string;
  error: string | null;
  id: EntityId;
  lastConnectedAt: number | null;
  name: string;
  protocols: string[];
  status: ConnectionStatus;
  transport: ConnectionTransport;
  updatedAt: number;
};

export type CreateConnectionInput = {
  endpointUrl: string;
  id: EntityId;
  name?: string;
  now: number;
  transport?: ConnectionTransport;
};

export function createConnection({ endpointUrl, id, name, now, transport = "websocket" }: CreateConnectionInput): Connection {
  return {
    createdAt: now,
    endpointUrl,
    error: null,
    id,
    lastConnectedAt: null,
    name: name ?? getConnectionName(endpointUrl),
    protocols: [],
    status: "idle",
    transport,
    updatedAt: now,
  };
}

export function getConnectionName(endpointUrl: string) {
  try {
    const url = new URL(endpointUrl);
    return url.host || endpointUrl;
  } catch {
    return endpointUrl;
  }
}

export function isWebSocketUrl(value: string) {
  return validateWebSocketUrl(value).ok;
}

export function redactUrlForDisplay(value: string) {
  try {
    const url = new URL(value);
    const username = url.username ? "user" : "";
    const password = url.password ? ":***" : "";
    const auth = username || password ? `${username}${password}@` : "";
    const pathname = url.pathname === "/" ? "" : url.pathname;
    const search = url.search ? "?..." : "";

    return `${url.protocol}//${auth}${url.host}${pathname}${search}`;
  } catch {
    return value;
  }
}

export type WebSocketUrlValidationResult =
  | {
      ok: true;
      url: string;
    }
  | {
      message: string;
      ok: false;
    };

export function validateWebSocketUrl(value: string): WebSocketUrlValidationResult {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      message: "Enter a WebSocket URL before connecting.",
      ok: false,
    };
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol !== "ws:" && url.protocol !== "wss:") {
      return {
        message: "Endpoint must start with ws:// or wss://.",
        ok: false,
      };
    }

    if (url.hash) {
      return {
        message: "WebSocket URLs cannot include URL fragments.",
        ok: false,
      };
    }

    if (!url.host) {
      return {
        message: "WebSocket URL must include a host.",
        ok: false,
      };
    }

    return {
      ok: true,
      url: trimmedValue,
    };
  } catch {
    return {
      message: "Enter a valid ws:// or wss:// endpoint.",
      ok: false,
    };
  }
}
