import { describe, expect, it } from "vitest";
import { defaultFilterState, filterPackets, getFilterValidationIssues, type Packet } from "@/models";

const packets: Packet[] = [
  createPacketFixture({
    id: "packet-auth",
    payload: JSON.stringify({ type: "auth.login", user: { id: "123" }, userId: "user_123" }),
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
      hideHeartbeat: true,
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

  it("supports regex search, event filters, and JSON-path-like payload expressions", () => {
    expect(
      filterPackets(packets, {
        ...defaultFilterState,
        searchMode: "regex",
        searchQuery: "hello.*socketlens",
      }).map((packet) => packet.id),
    ).toEqual(["packet-chat"]);

    expect(
      filterPackets(packets, {
        ...defaultFilterState,
        eventQuery: "chat.message",
      }).map((packet) => packet.id),
    ).toEqual(["packet-chat"]);

    expect(
      filterPackets(packets, {
        ...defaultFilterState,
        smartQuery: 'payload.user.id == "123"',
      }).map((packet) => packet.id),
    ).toEqual(["packet-auth"]);

    expect(
      filterPackets(packets, {
        ...defaultFilterState,
        smartQuery: 'payload.type != "heartbeat.ping"',
      }).map((packet) => packet.id),
    ).toEqual(["packet-auth", "packet-chat", "packet-error"]);
  });

  it("returns clear validation issues for invalid regex and smart filters", () => {
    const filterState = {
      ...defaultFilterState,
      searchMode: "regex" as const,
      searchQuery: "[unterminated",
      smartQuery: "payload.type = heartbeat",
    };

    expect(getFilterValidationIssues(filterState)).toHaveLength(2);
    expect(filterPackets(packets, filterState)).toEqual([]);
  });

  it("filters large sessions without reparsing invalid JSON or crashing", () => {
    const largePackets = Array.from({ length: 20_000 }, (_, index) =>
      createPacketFixture({
        id: `packet-${index}`,
        payload: index % 2 === 0 ? JSON.stringify({ event: "chat.message", user: { id: String(index) } }) : "{bad json",
        timestamp: index,
      }),
    );
    const startedAt = performance.now();
    const filteredPackets = filterPackets(largePackets, {
      ...defaultFilterState,
      smartQuery: 'payload.event == "chat.message"',
    });
    const duration = performance.now() - startedAt;

    expect(filteredPackets).toHaveLength(10_000);
    expect(duration).toBeLessThan(1_000);
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
