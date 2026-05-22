import { describe, expect, it } from "vitest";
import { defaultFilterState, filterPackets, type Packet } from "@/models";

const packets: Packet[] = [
  createPacketFixture({
    id: "packet-auth",
    payload: JSON.stringify({ type: "auth.login", userId: "user_123" }),
    timestamp: 5000,
  }),
  createPacketFixture({
    direction: "outbound",
    id: "packet-chat",
    payload: JSON.stringify({ event: "chat.message", text: "Hello from SocketLens" }),
    timestamp: 4000,
  }),
  createPacketFixture({
    id: "packet-heartbeat",
    payload: JSON.stringify({ type: "heartbeat.ping" }),
    timestamp: 3000,
  }),
  createPacketFixture({
    id: "packet-error",
    payload: JSON.stringify({ type: "server.error", severity: "error", code: "rate_limit" }),
    timestamp: 2000,
  }),
  createPacketFixture({
    direction: "outbound",
    id: "packet-text",
    payload: "plain text payload",
    payloadKind: "text",
    sessionId: "session-b",
    timestamp: 1000,
  }),
];

describe("filterPackets", () => {
  it("returns the original packet array when no filters are active", () => {
    expect(filterPackets(packets, defaultFilterState)).toBe(packets);
  });

  it("filters by direction, payload kind, errors, and ping/pong visibility", () => {
    const inboundJsonWithoutHeartbeat = filterPackets(packets, {
      ...defaultFilterState,
      direction: "inbound",
      hidePingPong: true,
      payloadKind: "json",
    });

    expect(inboundJsonWithoutHeartbeat.map((packet) => packet.id)).toEqual(["packet-auth", "packet-error"]);

    const errorsOnly = filterPackets(packets, {
      ...defaultFilterState,
      errorsOnly: true,
    });

    expect(errorsOnly.map((packet) => packet.id)).toEqual(["packet-error"]);
  });

  it("searches event names, payload text, and normalized directions", () => {
    expect(
      filterPackets(packets, {
        ...defaultFilterState,
        searchQuery: "chat.message",
      }).map((packet) => packet.id),
    ).toEqual(["packet-chat"]);

    expect(
      filterPackets(packets, {
        ...defaultFilterState,
        searchQuery: "socketlens",
      }).map((packet) => packet.id),
    ).toEqual(["packet-chat"]);

    expect(
      filterPackets(packets, {
        ...defaultFilterState,
        searchQuery: "incoming",
      }).map((packet) => packet.id),
    ).toEqual(["packet-auth", "packet-heartbeat", "packet-error"]);
  });

  it("filters by session and packet size range", () => {
    const filteredPackets = filterPackets(packets, {
      ...defaultFilterState,
      maxSizeBytes: 40,
      minSizeBytes: 18,
      sessionId: "session-b",
    });

    expect(filteredPackets.map((packet) => packet.id)).toEqual(["packet-text"]);
  });
});

function createPacketFixture(packet: Partial<Packet> & Pick<Packet, "id" | "payload" | "timestamp">): Packet {
  return {
    connectionId: "connection-a",
    direction: "inbound",
    payloadKind: "json",
    sessionId: "session-a",
    sizeBytes: new TextEncoder().encode(packet.payload).byteLength,
    ...packet,
  };
}
