import { describe, expect, it } from "vitest";
import {
  addSocketLensRedactionMetadata,
  createImportedSessionSnapshot,
  createPacketAnnotations,
  createPacketExportFile,
  createSession,
  createSessionFile,
  parseSocketLensFile,
  serializeSocketLensFile,
  socketLensPacketExportFileFormat,
  socketLensSessionFileFormat,
  type Packet,
} from "@/models";

const session = createSession({
  connectionId: "connection-a",
  endpointUrl: "ws://127.0.0.1:17787/chat",
  id: "session-a",
  name: "Release QA",
  startedAt: 1000,
});

const packets: Packet[] = [
  createPacketFixture({
    annotations: createPacketAnnotations({
      bookmarked: true,
      note: "Investigate auth timing",
      suspicious: true,
      tags: ["auth", "latency"],
      updatedAt: 3500,
    }),
    direction: "inbound",
    id: "packet-newest",
    payload: JSON.stringify({ type: "chat.message", text: "Newest" }),
    timestamp: 3000,
  }),
  createPacketFixture({
    direction: "outbound",
    id: "packet-oldest",
    payload: JSON.stringify({ type: "chat.send", text: "Oldest" }),
    timestamp: 2000,
  }),
  createPacketFixture({
    id: "packet-other-session",
    payload: JSON.stringify({ type: "ignored" }),
    sessionId: "session-b",
    timestamp: 4000,
  }),
];

describe("session serialization", () => {
  it("serializes and parses a full SocketLens session file", () => {
    const file = createSessionFile({
      exportedAt: 5000,
      packets,
      session,
    });

    expect(file.metadata).toMatchObject({
      format: socketLensSessionFileFormat,
      packetCount: 2,
      sessionName: "Release QA",
      sourceSessionId: "session-a",
    });
    expect(file.packets.map((packet) => packet.id)).toEqual(["packet-newest", "packet-oldest"]);

    const serialized = serializeSocketLensFile(file);
    expect(serialized.endsWith("\n")).toBe(true);

    const parsed = parseSocketLensFile(serialized);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.file.metadata.packetCount).toBe(2);
      expect(parsed.file.metadata.format).toBe(socketLensSessionFileFormat);
      expect(parsed.file.packets.map((packet) => packet.id)).toEqual(["packet-newest", "packet-oldest"]);
      expect(parsed.file.packets[0]?.annotations).toMatchObject({
        bookmarked: true,
        note: "Investigate auth timing",
        suspicious: true,
        tags: ["auth", "latency"],
      });
      expect("session" in parsed.file ? parsed.file.session.name : null).toBe("Release QA");
    }
  });

  it("serializes packet-only exports and rejects malformed imports", () => {
    const file = createPacketExportFile({
      exportedAt: 5000,
      packets,
      session,
    });

    expect(file.metadata.format).toBe(socketLensPacketExportFileFormat);
    expect(file.metadata.packetCount).toBe(3);

    const parsed = parseSocketLensFile(serializeSocketLensFile(file));
    expect(parsed.ok).toBe(true);

    expect(parseSocketLensFile("{not json").ok).toBe(false);
    expect(
      parseSocketLensFile(
        JSON.stringify({
          metadata: file.metadata,
          packets: [{ id: "missing-required-fields" }],
        }),
      ),
    ).toEqual({
      message: "A packet entry is missing required fields.",
      ok: false,
    });
  });

  it("preserves optional redaction metadata during parse", () => {
    const file = addSocketLensRedactionMetadata(
      createSessionFile({
        exportedAt: 5000,
        packets,
        session,
      }),
      {
        applied: true,
        customRuleCount: 1,
        invalidCustomRules: [],
        redactedAt: "2026-05-21T12:10:00.000Z",
        redactedPacketCount: 2,
        replacement: "[REDACTED]",
        replacements: 4,
        sensitiveDataDetected: true,
      },
    );

    const parsed = parseSocketLensFile(serializeSocketLensFile(file));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.file.metadata.redaction).toMatchObject({
        applied: true,
        customRuleCount: 1,
        redactedPacketCount: 2,
        replacements: 4,
      });
    }
  });

  it("creates imported session snapshots with remapped session and connection ids", () => {
    const parsed = parseSocketLensFile(
      serializeSocketLensFile(
        createSessionFile({
          exportedAt: 5000,
          packets,
          session,
        }),
      ),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const snapshot = createImportedSessionSnapshot(parsed.file, 6000);

    expect(snapshot.session.id).not.toBe("session-a");
    expect(snapshot.session.connectionId).not.toBe("connection-a");
    expect(snapshot.session.name).toBe("Release QA");
    expect(snapshot.session.packetsReceived).toBe(1);
    expect(snapshot.session.packetsSent).toBe(1);
    expect(new Set(snapshot.packets.map((packet) => packet.sessionId))).toEqual(new Set([snapshot.session.id]));
    expect(new Set(snapshot.packets.map((packet) => packet.connectionId))).toEqual(new Set([snapshot.session.connectionId]));
    expect(snapshot.packets.find((packet) => packet.payload.includes("Newest"))?.annotations?.bookmarked).toBe(true);
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
