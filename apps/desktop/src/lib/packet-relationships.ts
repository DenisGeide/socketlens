import { getPacketSummary } from "@/lib/packet-inspection";
import { parseJsonObject } from "@/lib/json-payload";
import type { EntityId, Packet } from "@/models";

export type PacketRelationshipKind = "auth-flow" | "reconnect-flow" | "replay-source" | "request-response";
export type PacketRelationshipConfidence = "explicit" | "inferred";
export type PacketRelationshipReason =
  | "auth-sequence"
  | "correlation-id"
  | "ping-pong"
  | "reconnect-sequence"
  | "reply-to"
  | "replay-source"
  | "request-id";

export type PacketRelationship = {
  confidence: PacketRelationshipConfidence;
  field: string | null;
  id: string;
  kind: PacketRelationshipKind;
  reason: PacketRelationshipReason;
  sourcePacketId: EntityId;
  targetPacketId: EntityId;
  value: string | null;
};

export type PacketRelationshipIndex = {
  byPacketId: ReadonlyMap<EntityId, readonly PacketRelationship[]>;
  packetIdsWithRelations: ReadonlySet<EntityId>;
  relationships: readonly PacketRelationship[];
};

type FieldToken = {
  field: string;
  value: string;
};

type PacketRelationshipMetadata = {
  correlationToken: FieldToken | null;
  eventName: string;
  identityTokens: FieldToken[];
  packet: Packet;
  replyToken: FieldToken | null;
  status: string;
};

const emptyRelationshipIndex: PacketRelationshipIndex = {
  byPacketId: new Map(),
  packetIdsWithRelations: new Set(),
  relationships: [],
};
const requestIdFields = ["requestId", "request_id", "reqId", "req_id"];
const correlationIdFields = ["correlationId", "correlation_id", "operationId", "operation_id"];
const replyToFields = ["replyTo", "replyToId", "reply_to", "reply_to_id", "inReplyTo"];
const identityFields = ["messageId", "message_id", "clientMessageId", "client_message_id", "packetId", "packet_id"];
const authFlowWindowMs = 5_000;
const reconnectFlowWindowMs = 10_000;

export function buildPacketRelationshipIndex(packets: readonly Packet[]): PacketRelationshipIndex {
  if (packets.length < 2) {
    return emptyRelationshipIndex;
  }

  const metadata = [...packets]
    .sort((left, right) => left.timestamp - right.timestamp)
    .map(createRelationshipMetadata);
  const packetById = new Map(metadata.map((item) => [item.packet.id, item]));
  const relationships: PacketRelationship[] = [];
  const seenRelationshipIds = new Set<string>();

  const addRelationship = (input: Omit<PacketRelationship, "id">) => {
    if (input.sourcePacketId === input.targetPacketId) {
      return;
    }

    const source = packetById.get(input.sourcePacketId);
    const target = packetById.get(input.targetPacketId);

    if (!source || !target || source.packet.sessionId !== target.packet.sessionId) {
      return;
    }

    const relationship: PacketRelationship = {
      ...input,
      id: `${input.kind}:${input.reason}:${input.sourcePacketId}:${input.targetPacketId}:${input.field ?? "none"}:${input.value ?? "none"}`,
    };

    if (seenRelationshipIds.has(relationship.id)) {
      return;
    }

    seenRelationshipIds.add(relationship.id);
    relationships.push(relationship);
  };

  addReplayRelationships(metadata, addRelationship);
  addExplicitCorrelationRelationships(metadata, addRelationship);
  addReplyToRelationships(metadata, addRelationship);
  addSequentialFlowRelationships(metadata, isAuthFlowPacket, "auth-flow", "auth-sequence", authFlowWindowMs, addRelationship);
  addSequentialFlowRelationships(
    metadata,
    isReconnectFlowPacket,
    "reconnect-flow",
    "reconnect-sequence",
    reconnectFlowWindowMs,
    addRelationship,
  );

  if (relationships.length === 0) {
    return emptyRelationshipIndex;
  }

  const byPacketId = new Map<EntityId, PacketRelationship[]>();
  const packetIdsWithRelations = new Set<EntityId>();

  for (const relationship of relationships) {
    pushRelationship(byPacketId, relationship.sourcePacketId, relationship);
    pushRelationship(byPacketId, relationship.targetPacketId, relationship);
    packetIdsWithRelations.add(relationship.sourcePacketId);
    packetIdsWithRelations.add(relationship.targetPacketId);
  }

  for (const [packetId, packetRelationships] of byPacketId) {
    byPacketId.set(packetId, sortRelationshipsForPacket(packetRelationships, packetId, packetById));
  }

  return {
    byPacketId,
    packetIdsWithRelations,
    relationships,
  };
}

export function getPacketRelationships(
  relationshipIndex: PacketRelationshipIndex | null | undefined,
  packetId: EntityId | null | undefined,
) {
  if (!relationshipIndex || !packetId) {
    return [];
  }

  return relationshipIndex.byPacketId.get(packetId) ?? [];
}

export function getRelatedPacketId(relationship: PacketRelationship, packetId: EntityId) {
  return relationship.sourcePacketId === packetId ? relationship.targetPacketId : relationship.sourcePacketId;
}

function createRelationshipMetadata(packet: Packet): PacketRelationshipMetadata {
  const payload = packet.payloadKind === "json" ? parseJsonObject(packet.payload) : null;
  const summary = getPacketSummary(packet);
  const requestToken = payload ? findStringField(payload, requestIdFields) : null;
  const correlationToken = payload ? findStringField(payload, correlationIdFields) : null;

  return {
    correlationToken: requestToken ?? correlationToken,
    eventName: summary.eventName.toLowerCase(),
    identityTokens: payload ? findStringFields(payload, identityFields) : [],
    packet,
    replyToken: payload ? findStringField(payload, replyToFields) : null,
    status: summary.status,
  };
}

function addReplayRelationships(
  metadata: PacketRelationshipMetadata[],
  addRelationship: (relationship: Omit<PacketRelationship, "id">) => void,
) {
  for (const item of metadata) {
    const sourcePacketId = item.packet.sourcePacketId;

    if (item.packet.sendSource !== "replay" || !sourcePacketId) {
      continue;
    }

    addRelationship({
      confidence: "explicit",
      field: "sourcePacketId",
      kind: "replay-source",
      reason: "replay-source",
      sourcePacketId,
      targetPacketId: item.packet.id,
      value: sourcePacketId,
    });
  }
}

function addExplicitCorrelationRelationships(
  metadata: PacketRelationshipMetadata[],
  addRelationship: (relationship: Omit<PacketRelationship, "id">) => void,
) {
  const groups = new Map<string, PacketRelationshipMetadata[]>();

  for (const item of metadata) {
    const token = item.correlationToken;

    if (!token) {
      continue;
    }

    const groupKey = `${item.packet.sessionId}:${token.field}:${token.value}`;
    const group = groups.get(groupKey) ?? [];
    group.push(item);
    groups.set(groupKey, group);
  }

  for (const group of groups.values()) {
    if (group.length !== 2) {
      continue;
    }

    const [first, second] = group;

    if (!first || !second || first.packet.direction === second.packet.direction) {
      continue;
    }

    const token = first.correlationToken ?? second.correlationToken;

    if (!token) {
      continue;
    }

    addRelationship({
      confidence: "explicit",
      field: token.field,
      kind: "request-response",
      reason: getCorrelationReason(first, second, token.field),
      sourcePacketId: first.packet.id,
      targetPacketId: second.packet.id,
      value: token.value,
    });
  }
}

function addReplyToRelationships(
  metadata: PacketRelationshipMetadata[],
  addRelationship: (relationship: Omit<PacketRelationship, "id">) => void,
) {
  const identityMap = new Map<string, PacketRelationshipMetadata[]>();

  for (const item of metadata) {
    for (const token of item.identityTokens) {
      const matches = identityMap.get(token.value) ?? [];
      matches.push(item);
      identityMap.set(token.value, matches);
    }
  }

  for (const item of metadata) {
    const replyToken = item.replyToken;

    if (!replyToken) {
      continue;
    }

    const matches = identityMap.get(replyToken.value) ?? [];
    const uniqueMatches = uniqueMetadata(matches).filter((candidate) => candidate.packet.timestamp <= item.packet.timestamp);

    if (uniqueMatches.length !== 1) {
      continue;
    }

    const source = uniqueMatches[0];

    if (!source) {
      continue;
    }

    addRelationship({
      confidence: "explicit",
      field: replyToken.field,
      kind: "request-response",
      reason: "reply-to",
      sourcePacketId: source.packet.id,
      targetPacketId: item.packet.id,
      value: replyToken.value,
    });
  }
}

function addSequentialFlowRelationships(
  metadata: PacketRelationshipMetadata[],
  predicate: (metadata: PacketRelationshipMetadata) => boolean,
  kind: Exclude<PacketRelationshipKind, "replay-source" | "request-response">,
  reason: Extract<PacketRelationshipReason, "auth-sequence" | "reconnect-sequence">,
  windowMs: number,
  addRelationship: (relationship: Omit<PacketRelationship, "id">) => void,
) {
  const bySession = new Map<EntityId, PacketRelationshipMetadata[]>();

  for (const item of metadata) {
    if (!predicate(item)) {
      continue;
    }

    const sessionItems = bySession.get(item.packet.sessionId) ?? [];
    sessionItems.push(item);
    bySession.set(item.packet.sessionId, sessionItems);
  }

  for (const sessionItems of bySession.values()) {
    for (let index = 1; index < sessionItems.length; index += 1) {
      const previous = sessionItems[index - 1];
      const current = sessionItems[index];

      if (!previous || !current || current.packet.timestamp - previous.packet.timestamp > windowMs) {
        continue;
      }

      addRelationship({
        confidence: "inferred",
        field: null,
        kind,
        reason,
        sourcePacketId: previous.packet.id,
        targetPacketId: current.packet.id,
        value: null,
      });
    }
  }
}

function isAuthFlowPacket(metadata: PacketRelationshipMetadata) {
  return metadata.status === "auth" || metadata.eventName.includes(".auth.") || metadata.eventName.startsWith("auth.");
}

function isReconnectFlowPacket(metadata: PacketRelationshipMetadata) {
  return (
    metadata.status === "reconnect" ||
    metadata.eventName.includes("reconnect") ||
    metadata.eventName.includes("resume")
  );
}

function getCorrelationReason(first: PacketRelationshipMetadata, second: PacketRelationshipMetadata, field: string): PacketRelationshipReason {
  if (first.eventName.includes("ping") && second.eventName.includes("pong")) {
    return "ping-pong";
  }

  return requestIdFields.includes(field) ? "request-id" : "correlation-id";
}

function findStringField(value: unknown, fields: readonly string[], depth = 0): FieldToken | null {
  if (depth > 3 || !isSearchableContainer(value)) {
    return null;
  }

  if (isRecord(value)) {
    for (const field of fields) {
      const fieldValue = value[field];

      if (typeof fieldValue === "string" && fieldValue.trim()) {
        return {
          field,
          value: fieldValue.trim(),
        };
      }
    }
  }

  for (const child of getSearchChildren(value)) {
    const match = findStringField(child, fields, depth + 1);

    if (match) {
      return match;
    }
  }

  return null;
}

function findStringFields(value: unknown, fields: readonly string[], depth = 0, matches: FieldToken[] = []): FieldToken[] {
  if (depth > 3 || !isSearchableContainer(value)) {
    return matches;
  }

  if (isRecord(value)) {
    for (const field of fields) {
      const fieldValue = value[field];

      if (typeof fieldValue === "string" && fieldValue.trim()) {
        matches.push({
          field,
          value: fieldValue.trim(),
        });
      }
    }
  }

  for (const child of getSearchChildren(value)) {
    findStringFields(child, fields, depth + 1, matches);
  }

  return matches;
}

function getSearchChildren(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (isRecord(value)) {
    return Object.values(value);
  }

  return [];
}

function isSearchableContainer(value: unknown) {
  return isRecord(value) || Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushRelationship(
  byPacketId: Map<EntityId, PacketRelationship[]>,
  packetId: EntityId,
  relationship: PacketRelationship,
) {
  const packetRelationships = byPacketId.get(packetId) ?? [];
  packetRelationships.push(relationship);
  byPacketId.set(packetId, packetRelationships);
}

function sortRelationshipsForPacket(
  relationships: PacketRelationship[],
  packetId: EntityId,
  packetById: ReadonlyMap<EntityId, PacketRelationshipMetadata>,
) {
  return relationships.sort((left, right) => {
    const leftRelatedPacket = packetById.get(getRelatedPacketId(left, packetId))?.packet;
    const rightRelatedPacket = packetById.get(getRelatedPacketId(right, packetId))?.packet;

    return (rightRelatedPacket?.timestamp ?? 0) - (leftRelatedPacket?.timestamp ?? 0);
  });
}

function uniqueMetadata(metadata: PacketRelationshipMetadata[]) {
  const seenPacketIds = new Set<EntityId>();
  const unique: PacketRelationshipMetadata[] = [];

  for (const item of metadata) {
    if (seenPacketIds.has(item.packet.id)) {
      continue;
    }

    seenPacketIds.add(item.packet.id);
    unique.push(item);
  }

  return unique;
}
