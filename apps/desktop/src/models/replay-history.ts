import { createEntityId, type EntityId } from "./ids";
import type { PacketPayloadKind } from "./packet";

export type SendSource = "manual" | "replay";

export type ReplayHistoryItem = {
  connectionId: EntityId;
  id: EntityId;
  payload: string;
  payloadKind: PacketPayloadKind;
  sentAt: number;
  sessionId: EntityId;
  sizeBytes: number;
  source: SendSource;
  sourcePacketId: EntityId | null;
};

export type CreateReplayHistoryItemInput = {
  connectionId: EntityId;
  payload: string;
  payloadKind: PacketPayloadKind;
  sentAt?: number;
  sessionId: EntityId;
  sizeBytes: number;
  source: SendSource;
  sourcePacketId?: EntityId | null;
};

export function createReplayHistoryItem({
  connectionId,
  payload,
  payloadKind,
  sentAt = Date.now(),
  sessionId,
  sizeBytes,
  source,
  sourcePacketId = null,
}: CreateReplayHistoryItemInput): ReplayHistoryItem {
  return {
    connectionId,
    id: createEntityId(),
    payload,
    payloadKind,
    sentAt,
    sessionId,
    sizeBytes,
    source,
    sourcePacketId,
  };
}
