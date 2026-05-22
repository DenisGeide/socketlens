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

  it("decodes graphql-transport-ws subscription start, next, and complete messages", () => {
    const start = decodePacket(
      createPacketFixture({
        payload: JSON.stringify({
          id: "sub-1",
          payload: {
            operationName: "MessageAdded",
            query: "subscription MessageAdded { messageAdded { id text } }",
            variables: {
              roomId: "launch",
            },
          },
          type: "subscribe",
        }),
      }),
    );
    const next = decodePacket(
      createPacketFixture({
        payload: JSON.stringify({
          id: "sub-1",
          payload: {
            data: {
              messageAdded: {
                id: "msg_1",
                text: "Hello GraphQL",
              },
            },
          },
          type: "next",
        }),
      }),
    );
    const complete = decodePacket(
      createPacketFixture({
        payload: JSON.stringify({
          id: "sub-1",
          type: "complete",
        }),
      }),
    );

    expect(start).toMatchObject({
      decoderId: "socketlens.decoder.graphqlws",
      eventName: "graphql.subscription.start",
      metadata: {
        graphQlMessageType: "subscribe",
        graphQlPhase: "start",
        graphQlProtocol: "graphql-transport-ws",
        operationId: "sub-1",
        operationKind: "subscription",
        operationName: "MessageAdded",
        protocol: "graphql-ws",
      },
      tags: expect.arrayContaining(["graphql", "graphql-transport-ws", "start"]),
    });
    expect(start.preview).toContain("MessageAdded");
    expect(next).toMatchObject({
      decoderId: "socketlens.decoder.graphqlws",
      eventName: "graphql.subscription.next",
      metadata: {
        operationId: "sub-1",
      },
    });
    expect(complete).toMatchObject({
      decoderId: "socketlens.decoder.graphqlws",
      eventName: "graphql.subscription.complete",
    });
  });

  it("decodes legacy subscriptions-transport-ws and preserves normal JSON fallback", () => {
    const legacyStart = decodePacket(
      createPacketFixture({
        payload: JSON.stringify({
          id: "legacy-1",
          payload: {
            operationName: "PresenceChanged",
            query: "subscription PresenceChanged { presenceChanged { userId status } }",
          },
          type: "start",
        }),
      }),
    );
    const legacyError = decodePacket(
      createPacketFixture({
        payload: JSON.stringify({
          id: "legacy-1",
          payload: [
            {
              message: "Subscription failed",
            },
          ],
          type: "error",
        }),
      }),
    );
    const normalJson = decodePacket(
      createPacketFixture({
        payload: JSON.stringify({
          payload: {
            text: "This is app JSON, not a GraphQL transport envelope",
          },
          type: "chat.message",
        }),
      }),
    );

    expect(legacyStart).toMatchObject({
      decoderId: "socketlens.decoder.graphqlws",
      eventName: "graphql.subscription.start",
      metadata: {
        graphQlProtocol: "subscriptions-transport-ws",
        operationName: "PresenceChanged",
      },
    });
    expect(legacyError).toMatchObject({
      decoderId: "socketlens.decoder.graphqlws",
      eventName: "graphql.subscription.error",
      metadata: {
        hasErrors: true,
      },
    });
    expect(normalJson).toMatchObject({
      decoderId: "socketlens.decoder.json",
      eventName: "chat.message",
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
