import { describe, expect, it } from "vitest";
import { analyzePacketFlows } from "@/lib/flow-analysis";
import { buildPacketRelationshipIndex } from "@/lib/packet-relationships";
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

describe("flow analysis", () => {
  it("summarizes inferred auth sequences", () => {
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
    const packets = [accepted, challenge];
    const relationships = buildPacketRelationshipIndex(packets);

    const analysis = analyzePacketFlows(packets, relationships);

    expect(analysis.flows).toContainEqual(
      expect.objectContaining({
        confidence: "inferred",
        kind: "auth",
        packetCount: 2,
        reason: "auth-sequence",
      }),
    );
  });

  it("summarizes explicit request response pairs", () => {
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
    const packets = [response, request];
    const relationships = buildPacketRelationshipIndex(packets);

    const analysis = analyzePacketFlows(packets, relationships);
    const requestResponseFlow = analysis.flows.find((flow) => flow.kind === "request-response");

    expect(requestResponseFlow).toMatchObject({
      confidence: "explicit",
      directionCount: {
        inbound: 1,
        outbound: 1,
      },
      packetCount: 2,
      reason: "request-response",
    });
    expect(analysis.packetFlowIds.get(request.id)).toContain(requestResponseFlow?.id);
  });

  it("treats ping pong request response pairs as heartbeat flows", () => {
    const ping = createTestPacket({
      direction: "outbound",
      payload: JSON.stringify({ requestId: "hb_1", type: "ping" }),
      timestamp: 1,
    });
    const pong = createTestPacket({
      direction: "inbound",
      payload: JSON.stringify({ requestId: "hb_1", type: "pong" }),
      timestamp: 2,
    });
    const packets = [pong, ping];

    const analysis = analyzePacketFlows(packets, buildPacketRelationshipIndex(packets));

    expect(analysis.flows).toContainEqual(
      expect.objectContaining({
        confidence: "explicit",
        kind: "heartbeat",
        reason: "heartbeat-sequence",
      }),
    );
  });

  it("detects repeated direct echo messages without relationships", () => {
    const packets = [1, 2, 3].map((sequence) =>
      createTestPacket({
        direction: "inbound",
        payload: JSON.stringify({ sequence, type: "server.message" }),
        timestamp: sequence,
      }),
    );

    const analysis = analyzePacketFlows(packets, buildPacketRelationshipIndex(packets));

    expect(analysis.flows).toContainEqual(
      expect.objectContaining({
        confidence: "inferred",
        kind: "repeated-event",
        packetCount: 3,
        reason: "repeated-event",
        title: "server.message",
      }),
    );
  });

  it("summarizes replay source relationships explicitly", () => {
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
    const packets = [replay, original];

    const analysis = analyzePacketFlows(packets, buildPacketRelationshipIndex(packets));

    expect(analysis.flows).toContainEqual(
      expect.objectContaining({
        confidence: "explicit",
        kind: "replay",
        packetCount: 2,
        reason: "replay-source",
      }),
    );
  });
});
