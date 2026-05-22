import { createEntityId, type EntityId } from "./ids";

export type PacketDirection = "inbound" | "outbound";
export type PacketPayloadKind = "json" | "text" | "binary";

export type Packet = {
  connectionId: EntityId;
  direction: PacketDirection;
  id: EntityId;
  payload: string;
  payloadKind: PacketPayloadKind;
  sessionId: EntityId;
  sizeBytes: number;
  timestamp: number;
};

export type CreatePacketInput = {
  connectionId: EntityId;
  direction: PacketDirection;
  payload: string;
  payloadKind?: PacketPayloadKind;
  sessionId: EntityId;
  timestamp?: number;
};

const encoder = new TextEncoder();

export function createPacket({
  connectionId,
  direction,
  payload,
  payloadKind,
  sessionId,
  timestamp = Date.now(),
}: CreatePacketInput): Packet {
  return {
    connectionId,
    direction,
    id: createEntityId(),
    payload,
    payloadKind: payloadKind ?? inferPayloadKind(payload),
    sessionId,
    sizeBytes: encoder.encode(payload).byteLength,
    timestamp,
  };
}

export function inferPayloadKind(payload: string): PacketPayloadKind {
  try {
    JSON.parse(payload);
    return "json";
  } catch {
    return "text";
  }
}
