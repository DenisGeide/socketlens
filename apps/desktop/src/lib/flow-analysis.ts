import { getPacketSummary, isErrorPacketFast, isPingPongPacket } from "@/lib/packet-inspection";
import type { PacketRelationship, PacketRelationshipIndex } from "@/lib/packet-relationships";
import type { EntityId, Packet } from "@/models";

export type PacketFlowKind =
  | "auth"
  | "heartbeat"
  | "reconnect"
  | "repeated-event"
  | "replay"
  | "request-response";
export type PacketFlowConfidence = "explicit" | "inferred";
export type PacketFlowReason =
  | "auth-sequence"
  | "heartbeat-sequence"
  | "reconnect-sequence"
  | "repeated-event"
  | "replay-source"
  | "request-response";

export type PacketFlow = {
  confidence: PacketFlowConfidence;
  directionCount: {
    inbound: number;
    outbound: number;
  };
  durationMs: number;
  errorCount: number;
  eventNames: string[];
  firstTimestamp: number;
  id: string;
  kind: PacketFlowKind;
  lastTimestamp: number;
  packetCount: number;
  packetIds: EntityId[];
  reason: PacketFlowReason;
  repeated: boolean;
  title: string;
};

export type FlowAnalysis = {
  flows: readonly PacketFlow[];
  packetFlowIds: ReadonlyMap<EntityId, readonly string[]>;
  stats: {
    explicit: number;
    inferred: number;
    repeated: number;
    total: number;
  };
};

type FlowDraft = {
  confidence: PacketFlowConfidence;
  kind: PacketFlowKind;
  packetIds: EntityId[];
  reason: PacketFlowReason;
  title: string;
};

const emptyFlowAnalysis: FlowAnalysis = {
  flows: [],
  packetFlowIds: new Map(),
  stats: {
    explicit: 0,
    inferred: 0,
    repeated: 0,
    total: 0,
  },
};
const repeatedFlowMinimumPackets = 3;

export function analyzePacketFlows(
  packets: readonly Packet[],
  relationshipIndex: PacketRelationshipIndex | null | undefined,
): FlowAnalysis {
  if (packets.length === 0) {
    return emptyFlowAnalysis;
  }

  const sortedPackets = [...packets].sort((left, right) => left.timestamp - right.timestamp);
  const packetById = new Map(sortedPackets.map((packet) => [packet.id, packet]));
  const drafts: FlowDraft[] = [];

  drafts.push(...createRelationshipFlowDrafts(relationshipIndex?.relationships ?? [], packetById));
  drafts.push(...createRepeatedFlowDrafts(sortedPackets));

  const flows = dedupeFlowDrafts(drafts)
    .map((draft) => createPacketFlow(draft, packetById))
    .filter((flow): flow is PacketFlow => flow !== null)
    .sort(compareFlows);

  if (flows.length === 0) {
    return emptyFlowAnalysis;
  }

  const packetFlowIds = new Map<EntityId, string[]>();

  for (const flow of flows) {
    for (const packetId of flow.packetIds) {
      const flowIds = packetFlowIds.get(packetId) ?? [];
      flowIds.push(flow.id);
      packetFlowIds.set(packetId, flowIds);
    }
  }

  return {
    flows,
    packetFlowIds,
    stats: {
      explicit: flows.filter((flow) => flow.confidence === "explicit").length,
      inferred: flows.filter((flow) => flow.confidence === "inferred").length,
      repeated: flows.filter((flow) => flow.repeated).length,
      total: flows.length,
    },
  };
}

function createRelationshipFlowDrafts(
  relationships: readonly PacketRelationship[],
  packetById: ReadonlyMap<EntityId, Packet>,
) {
  const drafts: FlowDraft[] = [];
  const authPacketIds = collectConnectedPacketIds(relationships, "auth-flow");
  const reconnectPacketIds = collectConnectedPacketIds(relationships, "reconnect-flow");

  for (const packetIds of authPacketIds) {
    drafts.push({
      confidence: "inferred",
      kind: "auth",
      packetIds,
      reason: "auth-sequence",
      title: getFlowTitle(packetIds, packetById, "auth"),
    });
  }

  for (const packetIds of reconnectPacketIds) {
    drafts.push({
      confidence: "inferred",
      kind: "reconnect",
      packetIds,
      reason: "reconnect-sequence",
      title: getFlowTitle(packetIds, packetById, "reconnect"),
    });
  }

  for (const relationship of relationships) {
    if (relationship.kind === "request-response") {
      const first = packetById.get(relationship.sourcePacketId);
      const second = packetById.get(relationship.targetPacketId);

      drafts.push({
        confidence: relationship.confidence,
        kind: relationship.reason === "ping-pong" ? "heartbeat" : "request-response",
        packetIds: [relationship.sourcePacketId, relationship.targetPacketId],
        reason: relationship.reason === "ping-pong" ? "heartbeat-sequence" : "request-response",
        title: first && second ? `${getPacketSummary(first).eventName} -> ${getPacketSummary(second).eventName}` : "Request/response",
      });
    }

    if (relationship.kind === "replay-source") {
      const sourcePacket = packetById.get(relationship.sourcePacketId);

      drafts.push({
        confidence: "explicit",
        kind: "replay",
        packetIds: [relationship.sourcePacketId, relationship.targetPacketId],
        reason: "replay-source",
        title: sourcePacket ? `${getPacketSummary(sourcePacket).eventName} replay` : "Replay source",
      });
    }
  }

  return drafts;
}

function createRepeatedFlowDrafts(packets: readonly Packet[]) {
  const repeatedGroups = new Map<string, Packet[]>();

  for (const packet of packets) {
    const summary = getPacketSummary(packet);
    const key = `${packet.sessionId}:${packet.direction}:${packet.payloadKind}:${summary.status}:${summary.eventName}`;
    const group = repeatedGroups.get(key) ?? [];

    group.push(packet);
    repeatedGroups.set(key, group);
  }

  const drafts: FlowDraft[] = [];

  for (const group of repeatedGroups.values()) {
    if (group.length < repeatedFlowMinimumPackets) {
      continue;
    }

    const firstPacket = group[0];

    if (!firstPacket) {
      continue;
    }

    const summary = getPacketSummary(firstPacket);
    const kind: PacketFlowKind = summary.status === "heartbeat" || isPingPongPacket(firstPacket) ? "heartbeat" : "repeated-event";

    drafts.push({
      confidence: "inferred",
      kind,
      packetIds: group.map((packet) => packet.id),
      reason: kind === "heartbeat" ? "heartbeat-sequence" : "repeated-event",
      title: summary.eventName,
    });
  }

  return drafts;
}

function collectConnectedPacketIds(
  relationships: readonly PacketRelationship[],
  kind: Extract<PacketRelationship["kind"], "auth-flow" | "reconnect-flow">,
) {
  const adjacency = new Map<EntityId, Set<EntityId>>();

  for (const relationship of relationships) {
    if (relationship.kind !== kind) {
      continue;
    }

    connect(adjacency, relationship.sourcePacketId, relationship.targetPacketId);
    connect(adjacency, relationship.targetPacketId, relationship.sourcePacketId);
  }

  const components: EntityId[][] = [];
  const visited = new Set<EntityId>();

  for (const packetId of adjacency.keys()) {
    if (visited.has(packetId)) {
      continue;
    }

    const stack = [packetId];
    const component: EntityId[] = [];
    visited.add(packetId);

    while (stack.length > 0) {
      const currentPacketId = stack.pop();

      if (!currentPacketId) {
        continue;
      }

      component.push(currentPacketId);

      for (const nextPacketId of adjacency.get(currentPacketId) ?? []) {
        if (visited.has(nextPacketId)) {
          continue;
        }

        visited.add(nextPacketId);
        stack.push(nextPacketId);
      }
    }

    if (component.length >= 2) {
      components.push(component);
    }
  }

  return components;
}

function connect(adjacency: Map<EntityId, Set<EntityId>>, sourcePacketId: EntityId, targetPacketId: EntityId) {
  const relatedIds = adjacency.get(sourcePacketId) ?? new Set<EntityId>();
  relatedIds.add(targetPacketId);
  adjacency.set(sourcePacketId, relatedIds);
}

function createPacketFlow(draft: FlowDraft, packetById: ReadonlyMap<EntityId, Packet>): PacketFlow | null {
  const packets = draft.packetIds
    .map((packetId) => packetById.get(packetId))
    .filter((packet): packet is Packet => Boolean(packet))
    .sort((left, right) => left.timestamp - right.timestamp);

  if (packets.length < 2) {
    return null;
  }

  const packetIds = packets.map((packet) => packet.id);
  const timestamps = packets.map((packet) => packet.timestamp);
  const firstTimestamp = Math.min(...timestamps);
  const lastTimestamp = Math.max(...timestamps);
  const directionCount = {
    inbound: packets.filter((packet) => packet.direction === "inbound").length,
    outbound: packets.filter((packet) => packet.direction === "outbound").length,
  };
  const eventNames = [...new Set(packets.map((packet) => getPacketSummary(packet).eventName))].slice(0, 6);

  return {
    confidence: draft.confidence,
    directionCount,
    durationMs: Math.max(lastTimestamp - firstTimestamp, 0),
    errorCount: packets.filter(isErrorPacketFast).length,
    eventNames,
    firstTimestamp,
    id: `${draft.kind}:${draft.reason}:${packetIds[0]}:${packetIds[packetIds.length - 1]}:${packets.length}`,
    kind: draft.kind,
    lastTimestamp,
    packetCount: packets.length,
    packetIds,
    reason: draft.reason,
    repeated: draft.reason === "repeated-event" || draft.reason === "heartbeat-sequence",
    title: draft.title,
  };
}

function getFlowTitle(packetIds: EntityId[], packetById: ReadonlyMap<EntityId, Packet>, fallback: string) {
  const packets = packetIds
    .map((packetId) => packetById.get(packetId))
    .filter((packet): packet is Packet => Boolean(packet))
    .sort((left, right) => left.timestamp - right.timestamp);
  const firstPacket = packets[0];
  const lastPacket = packets[packets.length - 1];

  if (!firstPacket || !lastPacket) {
    return fallback;
  }

  return `${getPacketSummary(firstPacket).eventName} -> ${getPacketSummary(lastPacket).eventName}`;
}

function dedupeFlowDrafts(drafts: FlowDraft[]) {
  const seenFlowKeys = new Set<string>();
  const uniqueDrafts: FlowDraft[] = [];

  for (const draft of drafts) {
    const packetIds = [...new Set(draft.packetIds)].sort();
    const key = `${draft.kind}:${draft.reason}:${packetIds.join(",")}`;

    if (seenFlowKeys.has(key)) {
      continue;
    }

    seenFlowKeys.add(key);
    uniqueDrafts.push({
      ...draft,
      packetIds,
    });
  }

  return uniqueDrafts;
}

function compareFlows(left: PacketFlow, right: PacketFlow) {
  const kindWeight = getFlowKindWeight(right.kind) - getFlowKindWeight(left.kind);

  if (kindWeight !== 0) {
    return kindWeight;
  }

  if (right.packetCount !== left.packetCount) {
    return right.packetCount - left.packetCount;
  }

  return right.lastTimestamp - left.lastTimestamp;
}

function getFlowKindWeight(kind: PacketFlowKind) {
  if (kind === "auth") {
    return 6;
  }

  if (kind === "request-response") {
    return 5;
  }

  if (kind === "replay") {
    return 4;
  }

  if (kind === "reconnect") {
    return 3;
  }

  if (kind === "heartbeat") {
    return 2;
  }

  return 1;
}
