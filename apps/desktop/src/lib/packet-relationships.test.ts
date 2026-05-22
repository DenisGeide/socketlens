import { describe, expect, it } from "vitest";
import { buildPacketRelationshipIndex, getPacketRelationships } from "@/lib/packet-relationships";
import { createEntityId, createPacket, type Packet } from "@/models";

function createTestPacket(patch: Partial<Packet> & Pick<Packet, "direction" | "payload" | "timestamp">) {
  return createPacket({
    connectionId: patch.connectionId ?? "connection_test",
    direction: patch.direction,
    payload: patch.payload,
    payloadKind: patch.payloadKind ?? "json",
    sendSource: patch.sendSource,
    sessionId: patch.sessionId ?? "session_test",
    sourcePacketId: patch.sourcePacketId,
    timestamp: patch.timestamp,
  });
}

describe("packet relationship tracking", () => {
  it("links a simple request/response pair by requestId", () => {
    const request = createTestPacket({
      direction: "outbound",
      payload: JSON.stringify({ requestId: "req_1", type: "chat.message.send" }),
      timestamp: 1,
    });
    const response = createTestPacket({
      direction: "inbound",
      payload: JSON.stringify({ requestId: "req_1", type: "chat.message.created" }),
      timestamp: 2,
    });

    const index = buildPacketRelationshipIndex([response, request]);
    const requestRelationships = getPacketRelationships(index, request.id);

    expect(requestRelationships).toHaveLength(1);
    expect(requestRelationships[0]).toMatchObject({
      confidence: "explicit",
      kind: "request-response",
      reason: "request-id",
      sourcePacketId: request.id,
      targetPacketId: response.id,
    });
  });

  it("skips ambiguous requestId groups instead of claiming certainty", () => {
    const firstRequest = createTestPacket({
      direction: "outbound",
      payload: JSON.stringify({ requestId: "req_ambiguous", type: "chat.message.send" }),
      timestamp: 1,
    });
    const secondRequest = createTestPacket({
      direction: "outbound",
      payload: JSON.stringify({ requestId: "req_ambiguous", type: "chat.message.retry" }),
      timestamp: 2,
    });
    const response = createTestPacket({
      direction: "inbound",
      payload: JSON.stringify({ requestId: "req_ambiguous", type: "chat.message.created" }),
      timestamp: 3,
    });

    const index = buildPacketRelationshipIndex([response, secondRequest, firstRequest]);

    expect(index.relationships.some((relationship) => relationship.reason === "request-id")).toBe(false);
  });

  it("links nearby auth flow packets as inferred", () => {
    const challenge = createTestPacket({
      direction: "inbound",
      payload: JSON.stringify({ type: "auth.challenge" }),
      timestamp: 1,
    });
    const accepted = createTestPacket({
      direction: "inbound",
      payload: JSON.stringify({ type: "auth.accepted" }),
      timestamp: 2,
    });

    const index = buildPacketRelationshipIndex([accepted, challenge]);

    expect(index.relationships).toContainEqual(
      expect.objectContaining({
        confidence: "inferred",
        kind: "auth-flow",
        reason: "auth-sequence",
        sourcePacketId: challenge.id,
        targetPacketId: accepted.id,
      }),
    );
  });

  it("links replay packets back to the explicit source packet", () => {
    const sourcePacketId = createEntityId();
    const original = {
      ...createTestPacket({
        direction: "outbound",
        payload: JSON.stringify({ command: "ping" }),
        timestamp: 1,
      }),
      id: sourcePacketId,
    };
    const replay = createTestPacket({
      direction: "outbound",
      payload: JSON.stringify({ command: "ping" }),
      sendSource: "replay",
      sourcePacketId,
      timestamp: 2,
    });

    const index = buildPacketRelationshipIndex([replay, original]);

    expect(index.relationships).toContainEqual(
      expect.objectContaining({
        confidence: "explicit",
        kind: "replay-source",
        reason: "replay-source",
        sourcePacketId,
        targetPacketId: replay.id,
      }),
    );
  });
});
