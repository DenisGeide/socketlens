import { describe, expect, it } from "vitest";
import { groupTimelinePackets } from "@/lib/packet-grouping";
import type { Packet } from "@/models";

describe("groupTimelinePackets", () => {
  it("groups repeated adjacent events without mutating packet order", () => {
    const packets = [
      createPacketFixture("server-3", { sequence: 3, type: "server.message" }, 3000),
      createPacketFixture("server-2", { sequence: 2, type: "server.message" }, 2000),
      createPacketFixture("server-1", { sequence: 1, type: "server.message" }, 1000),
      createPacketFixture("chat-1", { text: "hello", type: "chat.message" }, 500),
    ];

    const groupedItems = groupTimelinePackets(packets);
    expect(groupedItems.map((item) => item.type)).toEqual(["group", "packet"]);
    expect(groupedItems[0]?.type).toBe("group");

    if (groupedItems[0]?.type !== "group") {
      throw new Error("Expected repeated server messages to be grouped.");
    }

    expect(groupedItems[0].group.kind).toBe("repeated-event");
    expect(groupedItems[0].group.packetCount).toBe(3);

    const expandedItems = groupTimelinePackets(packets, {
      expandedGroupIds: new Set([groupedItems[0].group.id]),
    });

    expect(expandedItems.map((item) => item.id)).toEqual([
      groupedItems[0].group.id,
      "server-3",
      "server-2",
      "server-1",
      "chat-1",
    ]);
  });

  it("collapses heartbeat storms across ping and pong frames", () => {
    const packets = [
      createPacketFixture("pong-2", { type: "pong" }, 4000),
      createPacketFixture("ping-2", { type: "ping" }, 3000, "outbound"),
      createPacketFixture("pong-1", { type: "pong" }, 2000),
      createPacketFixture("ping-1", { type: "ping" }, 1000, "outbound"),
    ];

    const groupedItems = groupTimelinePackets(packets);
    expect(groupedItems).toHaveLength(1);
    expect(groupedItems[0]?.type).toBe("group");

    if (groupedItems[0]?.type === "group") {
      expect(groupedItems[0].group.kind).toBe("heartbeat-storm");
      expect(groupedItems[0].group.directions).toEqual(["inbound", "outbound"]);
      expect(groupedItems[0].group.packetCount).toBe(4);
    }
  });

  it("groups auth and reconnect flows even when event names differ", () => {
    const packets = [
      createPacketFixture("reconnect-ok", { type: "reconnect.restored" }, 5000),
      createPacketFixture("reconnect-start", { type: "reconnect.requested" }, 4000, "outbound"),
      createPacketFixture("auth-ok", { type: "auth.accepted" }, 3000),
      createPacketFixture("auth-start", { type: "auth.challenge" }, 2000, "outbound"),
    ];

    const groupedItems = groupTimelinePackets(packets);
    expect(groupedItems.map((item) => (item.type === "group" ? item.group.kind : "packet"))).toEqual([
      "reconnect-flow",
      "auth-flow",
    ]);
  });
});

function createPacketFixture(
  id: string,
  payload: Record<string, unknown>,
  timestamp: number,
  direction: Packet["direction"] = "inbound",
): Packet {
  const payloadText = JSON.stringify(payload);

  return {
    connectionId: "connection-a",
    direction,
    id,
    payload: payloadText,
    payloadKind: "json",
    sessionId: "session-a",
    sizeBytes: new TextEncoder().encode(payloadText).byteLength,
    timestamp,
  };
}
