import { describe, expect, it } from "vitest";
import { decodePacket, defaultPacketAnalyzer, defaultFilterEngine } from "@/extensions";
import { defaultFilterState, inferPayloadKind, type Packet } from "@/models";

describe("extension contracts", () => {
  it("decodes and analyzes JSON packets through the default extension path", () => {
    const packet = createPacketFixture({
      payload: JSON.stringify({ event: "chat.message", text: "Hello extension layer" }),
    });

    const decoded = decodePacket(packet);
    const summary = defaultPacketAnalyzer.analyze(packet, decoded);

    expect(decoded.decoderId).toBe("socketlens.decoder.json");
    expect(decoded.eventName).toBe("chat.message");
    expect(summary).toEqual({
      eventName: "chat.message",
      preview: "Hello extension layer",
      status: "chat",
    });
  });

  it("filters packets through the default filter engine", () => {
    const packets = [
      createPacketFixture({
        id: "auth",
        payload: JSON.stringify({ type: "auth.accepted" }),
      }),
      createPacketFixture({
        direction: "outbound",
        id: "chat",
        payload: JSON.stringify({ event: "chat.message", text: "Hello" }),
      }),
    ];

    const filteredPackets = defaultFilterEngine.apply(packets, {
      ...defaultFilterState,
      direction: "outbound",
      searchQuery: "chat.message",
    });

    expect(filteredPackets.map((packet) => packet.id)).toEqual(["chat"]);
  });

  it("decodes Socket.IO event frames with namespace and acknowledgement id", () => {
    const packet = createPacketFixture({
      payload: '42/chat,7["chat.message",{"text":"Hello Socket.IO","room":"launch"}]',
      payloadKind: "text",
    });

    const decoded = decodePacket(packet);

    expect(decoded).toMatchObject({
      decoderId: "socketlens.decoder.socketio",
      eventName: "chat.message",
      metadata: {
        ackId: 7,
        hasAck: true,
        namespace: "/chat",
        protocol: "socket.io",
        socketPacketType: "event",
      },
      tags: expect.arrayContaining(["socket.io", "engine.io", "event", "ack"]),
    });
    expect(decoded.preview).toContain("Hello Socket.IO");
  });

  it("decodes Socket.IO acknowledgements and falls back for unknown message frames", () => {
    const ack = decodePacket(
      createPacketFixture({
        payload: '43/admin,12[{"ok":true}]',
        payloadKind: "text",
      }),
    );
    const unknown = decodePacket(
      createPacketFixture({
        payload: "4xnot-a-known-socketio-packet",
        payloadKind: "text",
      }),
    );

    expect(ack).toMatchObject({
      decoderId: "socketlens.decoder.socketio",
      eventName: "socketio.ack",
      metadata: {
        ackId: 12,
        namespace: "/admin",
        socketPacketType: "ack",
      },
    });
    expect(unknown).toMatchObject({
      decoderId: "socketlens.decoder.text",
      eventName: "text.frame",
    });
  });
});

function createPacketFixture(packet: Partial<Packet> & Pick<Packet, "payload">): Packet {
  return {
    connectionId: "connection-a",
    direction: "inbound",
    id: "packet-a",
    payloadKind: inferPayloadKind(packet.payload),
    sessionId: "session-a",
    sizeBytes: new TextEncoder().encode(packet.payload).byteLength,
    timestamp: 1000,
    ...packet,
  };
}
