import { describe, expect, it } from "vitest";
import { inferPayloadKind, type Packet } from "@/models";
import {
  getPacketEventName,
  getPacketSearchText,
  getPacketSummary,
  getPrettyPayload,
  isErrorPacketFast,
  isPingPongPacket,
  isReplayPacketFast,
} from "@/lib/packet-inspection";

describe("packet parsing and inspection", () => {
  it("infers JSON and text payload kinds", () => {
    expect(inferPayloadKind('{"type":"chat.message"}')).toBe("json");
    expect(inferPayloadKind("plain text frame")).toBe("text");
  });

  it("extracts event names, previews, statuses, and searchable text", () => {
    const packet = createPacketFixture({
      payload: JSON.stringify({ event: "notification.created", title: "Build finished" }),
    });

    expect(getPacketEventName(packet)).toBe("notification.created");
    expect(getPacketSummary(packet)).toEqual({
      eventName: "notification.created",
      preview: "Build finished",
      status: "notification",
    });
    expect(getPacketSearchText(packet)).toContain("incoming");
    expect(getPacketSearchText(packet)).toContain("notification.created");
  });

  it("detects heartbeat and error packets without parsing crashes", () => {
    expect(
      isPingPongPacket(
        createPacketFixture({
          payload: JSON.stringify({ type: "heartbeat.pong" }),
        }),
      ),
    ).toBe(true);

    expect(
      isErrorPacketFast(
        createPacketFixture({
          payload: JSON.stringify({ type: "server.error", severity: "error", detail: "Rate limited" }),
        }),
      ),
    ).toBe(true);
  });

  it("detects richer timeline statuses and replay markers", () => {
    expect(
      getPacketSummary(
        createPacketFixture({
          payload: JSON.stringify({ type: "launchroom.presence.cursor.updated" }),
        }),
      ).status,
    ).toBe("presence");

    expect(
      getPacketSummary(
        createPacketFixture({
          payload: JSON.stringify({ type: "launchroom.connection.reconnect.completed" }),
        }),
      ).status,
    ).toBe("reconnect");

    const replayPacket = createPacketFixture({
      payload: JSON.stringify({
        replay: {
          replayOf: "ack_client_original",
          source: "replay",
        },
        type: "launchroom.chat.ack",
      }),
    });

    expect(getPacketSummary(replayPacket).status).toBe("replay");
    expect(isReplayPacketFast(replayPacket)).toBe(true);
  });

  it("formats valid JSON and safely handles invalid, text, and large JSON payloads", () => {
    expect(
      getPrettyPayload(
        createPacketFixture({
          payload: JSON.stringify({ type: "chat.message", text: "Hello" }),
        }),
      ),
    ).toEqual({
      formatted: '{\n  "type": "chat.message",\n  "text": "Hello"\n}',
      kind: "formatted",
      source: "payload",
    });

    expect(
      getPrettyPayload(
        createPacketFixture({
          payload: '42/chat,7["chat.message",{"text":"Hello Socket.IO"}]',
          payloadKind: "text",
        }),
      ),
    ).toMatchObject({
      kind: "formatted",
      source: "decoded",
    });

    expect(
      getPrettyPayload(
        createPacketFixture({
          payload: "{not valid json",
          payloadKind: "json",
        }),
      ).kind,
    ).toBe("invalid-json");

    expect(
      getPrettyPayload(
        createPacketFixture({
          payload: "raw text",
          payloadKind: "text",
        }),
      ).kind,
    ).toBe("not-json");

    expect(
      getPrettyPayload(
        createPacketFixture({
          payload: JSON.stringify({ data: "x".repeat(1_000_000) }),
          payloadKind: "json",
        }),
      ).kind,
    ).toBe("large-json");
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
