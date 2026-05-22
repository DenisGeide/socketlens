import { getPacketSummary, isPingPongPacket, type PacketStatus } from "@/lib/packet-inspection";
import type { Packet } from "@/models";

export type PacketTimelineGroupKind = "auth-flow" | "heartbeat-storm" | "reconnect-flow" | "repeated-event";

export type PacketTimelineGroup = {
  directions: Packet["direction"][];
  eventName: string;
  firstTimestamp: number;
  id: string;
  kind: PacketTimelineGroupKind;
  lastTimestamp: number;
  packetCount: number;
  packets: Packet[];
  representativePacket: Packet;
  status: PacketStatus;
  totalBytes: number;
};

export type PacketTimelineItem =
  | {
      id: string;
      packet: Packet;
      type: "packet";
    }
  | {
      group: PacketTimelineGroup;
      id: string;
      type: "group";
    };

type PacketGroupCandidate = {
  eventName: string;
  key: string;
  kind: PacketTimelineGroupKind;
  status: PacketStatus;
};

type PacketGroupingOptions = {
  expandedGroupIds?: ReadonlySet<string>;
  minAuthFlowSize?: number;
  minHeartbeatStormSize?: number;
  minReconnectFlowSize?: number;
  minRepeatedEventSize?: number;
};

const defaultGroupingOptions = {
  minAuthFlowSize: 2,
  minHeartbeatStormSize: 2,
  minReconnectFlowSize: 2,
  minRepeatedEventSize: 3,
} satisfies Required<Omit<PacketGroupingOptions, "expandedGroupIds">>;

export function groupTimelinePackets(packets: Packet[], options: PacketGroupingOptions = {}): PacketTimelineItem[] {
  if (packets.length === 0) {
    return [];
  }

  const resolvedOptions = {
    ...defaultGroupingOptions,
    ...options,
  };
  const items: PacketTimelineItem[] = [];
  let index = 0;

  while (index < packets.length) {
    const firstPacket = packets[index];

    if (!firstPacket) {
      break;
    }

    const candidate = getPacketGroupCandidate(firstPacket);
    const run = [firstPacket];
    let cursor = index + 1;

    while (cursor < packets.length) {
      const nextPacket = packets[cursor];

      if (!nextPacket) {
        break;
      }

      const nextCandidate = getPacketGroupCandidate(nextPacket);

      if (nextCandidate.key !== candidate.key) {
        break;
      }

      run.push(nextPacket);
      cursor += 1;
    }

    if (shouldCreateGroup(candidate.kind, run.length, resolvedOptions)) {
      const group = createPacketTimelineGroup(candidate, run);
      items.push({
        group,
        id: group.id,
        type: "group",
      });

      if (resolvedOptions.expandedGroupIds?.has(group.id)) {
        for (const packet of run) {
          items.push(createPacketItem(packet));
        }
      }
    } else {
      for (const packet of run) {
        items.push(createPacketItem(packet));
      }
    }

    index = cursor;
  }

  return items;
}

function createPacketItem(packet: Packet): PacketTimelineItem {
  return {
    id: packet.id,
    packet,
    type: "packet",
  };
}

function getPacketGroupCandidate(packet: Packet): PacketGroupCandidate {
  const summary = getPacketSummary(packet);
  const normalizedEvent = summary.eventName.toLowerCase();

  if (summary.status === "heartbeat" || isPingPongPacket(packet)) {
    return {
      eventName: summary.eventName,
      key: "flow:heartbeat",
      kind: "heartbeat-storm",
      status: "heartbeat",
    };
  }

  if (summary.status === "reconnect" || normalizedEvent.includes("reconnect")) {
    return {
      eventName: summary.eventName,
      key: "flow:reconnect",
      kind: "reconnect-flow",
      status: "reconnect",
    };
  }

  if (
    summary.status === "auth" ||
    normalizedEvent.startsWith("auth.") ||
    normalizedEvent.includes(".auth.") ||
    normalizedEvent.includes("token") ||
    normalizedEvent.includes("session")
  ) {
    return {
      eventName: summary.eventName,
      key: "flow:auth",
      kind: "auth-flow",
      status: "auth",
    };
  }

  return {
    eventName: summary.eventName,
    key: `repeat:${packet.direction}:${packet.payloadKind}:${summary.status}:${summary.eventName}`,
    kind: "repeated-event",
    status: summary.status,
  };
}

function shouldCreateGroup(
  kind: PacketTimelineGroupKind,
  packetCount: number,
  options: Required<Omit<PacketGroupingOptions, "expandedGroupIds">> & Pick<PacketGroupingOptions, "expandedGroupIds">,
) {
  if (kind === "auth-flow") {
    return packetCount >= options.minAuthFlowSize;
  }

  if (kind === "heartbeat-storm") {
    return packetCount >= options.minHeartbeatStormSize;
  }

  if (kind === "reconnect-flow") {
    return packetCount >= options.minReconnectFlowSize;
  }

  return packetCount >= options.minRepeatedEventSize;
}

function createPacketTimelineGroup(candidate: PacketGroupCandidate, packets: Packet[]): PacketTimelineGroup {
  const representativePacket = packets[0];

  if (!representativePacket) {
    throw new Error("Cannot create a packet timeline group without packets.");
  }

  const stableAnchorPacket = packets[packets.length - 1] ?? representativePacket;
  const timestamps = packets.map((packet) => packet.timestamp);

  return {
    directions: [...new Set(packets.map((packet) => packet.direction))],
    eventName: candidate.eventName,
    firstTimestamp: Math.min(...timestamps),
    id: `group:${candidate.kind}:${candidate.key}:${stableAnchorPacket.id}`,
    kind: candidate.kind,
    lastTimestamp: Math.max(...timestamps),
    packetCount: packets.length,
    packets,
    representativePacket,
    status: candidate.status,
    totalBytes: packets.reduce((sum, packet) => sum + packet.sizeBytes, 0),
  };
}
