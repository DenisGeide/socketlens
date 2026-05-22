import type { EntityId } from "./ids";
import type { Packet } from "./packet";

export type SessionStatus = "connecting" | "connected" | "closed" | "error";

export type Session = {
  bytesReceived: number;
  bytesSent: number;
  closeCode: number | null;
  closeReason: string | null;
  connectionId: EntityId;
  createdAt: number;
  endedAt: number | null;
  endpointUrl: string;
  id: EntityId;
  name: string;
  packetsReceived: number;
  packetsSent: number;
  startedAt: number;
  status: SessionStatus;
};

export type CreateSessionInput = {
  connectionId: EntityId;
  endpointUrl: string;
  id: EntityId;
  name?: string;
  startedAt: number;
};

export function createSession({ connectionId, endpointUrl, id, name, startedAt }: CreateSessionInput): Session {
  return {
    bytesReceived: 0,
    bytesSent: 0,
    closeCode: null,
    closeReason: null,
    connectionId,
    createdAt: startedAt,
    endedAt: null,
    endpointUrl,
    id,
    name: getSessionName(endpointUrl, name),
    packetsReceived: 0,
    packetsSent: 0,
    startedAt,
    status: "connecting",
  };
}

export function applyPacketStats(session: Session, packet: Packet): Session {
  if (packet.direction === "inbound") {
    return {
      ...session,
      bytesReceived: session.bytesReceived + packet.sizeBytes,
      packetsReceived: session.packetsReceived + 1,
    };
  }

  return {
    ...session,
    bytesSent: session.bytesSent + packet.sizeBytes,
    packetsSent: session.packetsSent + 1,
  };
}

export function getSessionName(endpointUrl: string, name?: string) {
  const trimmedName = name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  if (endpointUrl.startsWith("demo://")) {
    return "Demo session";
  }

  try {
    const url = new URL(endpointUrl);
    return url.host ? `${url.host} session` : "WebSocket session";
  } catch {
    return endpointUrl.trim() || "WebSocket session";
  }
}
