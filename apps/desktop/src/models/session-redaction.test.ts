import { describe, expect, it } from "vitest";
import {
  createPacketAnnotations,
  createSession,
  createSessionRedactionPreview,
  createSocketLensRedactionMetadata,
  redactSessionForExport,
  type Packet,
} from "@/models";

const session = createSession({
  connectionId: "connection-a",
  endpointUrl: "wss://alice:secret@example.com/socket?token=secret-token&workspace=acme",
  id: "session-a",
  name: "Secret QA session",
  startedAt: 1000,
});

describe("session redaction", () => {
  it("redacts JSON tokens, cookies, and auth headers without mutating source packets", () => {
    const packet = createPacketFixture({
      payload: JSON.stringify({
        headers: {
          Authorization: "Bearer production-token",
          Cookie: "sid=session-cookie",
        },
        message: "hello",
        token: "abc123",
        type: "auth.accepted",
      }),
    });
    const originalPayload = packet.payload;
    const result = redactSessionForExport({
      packets: [packet],
      session,
    });

    expect(packet.payload).toBe(originalPayload);
    expect(result.summary.replacements).toBeGreaterThanOrEqual(4);
    expect(result.summary.redactedPacketCount).toBe(1);
    expect(result.session?.endpointUrl).toBe("wss://user:***@example.com/socket?...");

    const redactedPayload = JSON.parse(result.packets[0]?.payload ?? "{}") as Record<string, unknown>;
    expect(redactedPayload).toMatchObject({
      headers: {
        Authorization: "[REDACTED]",
        Cookie: "[REDACTED]",
      },
      message: "hello",
      token: "[REDACTED]",
      type: "auth.accepted",
    });
  });

  it("redacts raw auth text and custom literal rules", () => {
    const packet = createPacketFixture({
      annotations: createPacketAnnotations({
        bookmarked: true,
        note: "Customer acme-private saw this retry.",
        tags: ["acme-private", "retry"],
      }),
      payload: "Authorization: Bearer raw-token\ncustomer=acme-private\nCookie: sid=secret",
      payloadKind: "text",
    });
    const result = redactSessionForExport({
      customRules: ["acme-private"],
      packets: [packet],
      session: null,
    });

    expect(result.packets[0]?.payload).toContain("Authorization: [REDACTED]");
    expect(result.packets[0]?.payload).toContain("customer=[REDACTED]");
    expect(result.packets[0]?.payload).toContain("Cookie: [REDACTED]");
    expect(result.packets[0]?.annotations?.note).toBe("Customer [REDACTED] saw this retry.");
    expect(result.packets[0]?.annotations?.tags).toEqual(["[REDACTED]", "retry"]);
    expect(result.summary.customRuleCount).toBe(1);
    expect(result.summary.previewPacket?.packetId).toBe("packet-a");
  });

  it("reports invalid custom regex rules in preview metadata", () => {
    const preview = createSessionRedactionPreview({
      customRules: ["/valid-[0-9]+/", "/unterminated(/"],
      packets: [
        createPacketFixture({
          payload: "valid-123 stays shareable",
          payloadKind: "text",
        }),
      ],
    });
    const metadata = createSocketLensRedactionMetadata(preview, 5000);

    expect(preview.invalidCustomRules).toEqual(["/unterminated(/"]);
    expect(preview.customRuleCount).toBe(1);
    expect(preview.replacements).toBe(1);
    expect(metadata).toMatchObject({
      applied: true,
      customRuleCount: 1,
      redactedPacketCount: 1,
      sensitiveDataDetected: true,
    });
  });
});

function createPacketFixture(packet: Partial<Packet> & Pick<Packet, "payload">): Packet {
  const payload = packet.payload;

  return {
    ...packet,
    connectionId: "connection-a",
    direction: "outbound",
    id: "packet-a",
    payload,
    payloadKind: "json",
    sessionId: "session-a",
    sizeBytes: new TextEncoder().encode(payload).byteLength,
    timestamp: 2000,
  };
}
