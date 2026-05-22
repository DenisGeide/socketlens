import { describe, expect, it } from "vitest";
import { createAsyncApiDraftExport } from "@/lib/asyncapi-export";
import { createPacket, createSession } from "@/models";

const session = createSession({
  connectionId: "connection-a",
  endpointUrl: "wss://alice:super-secret@example.com/realtime?token=super-secret-token",
  id: "session-a",
  name: "Release QA",
  startedAt: 1779364800000,
});

describe("experimental AsyncAPI export", () => {
  it("generates an inferred YAML draft from captured packet events", () => {
    const draft = createAsyncApiDraftExport({
      exportedAt: 1779365400000,
      packets: [
        createPacket({
          connectionId: "connection-a",
          direction: "inbound",
          payload: JSON.stringify({
            type: "chat.message.created",
            text: "Hello from demo",
            user: {
              id: "usr_123",
              role: "developer",
            },
          }),
          sessionId: "session-a",
          timestamp: 1779364860000,
        }),
        createPacket({
          connectionId: "connection-a",
          direction: "outbound",
          payload: JSON.stringify({
            command: "ping",
          }),
          sessionId: "session-a",
          timestamp: 1779364920000,
        }),
      ],
      redactionApplied: true,
      session,
    });

    expect(draft.eventCount).toBe(2);
    expect(draft.packetCount).toBe(2);
    expect(draft.fileName).toContain("Release-QA");
    expect(draft.fileName).toContain(".experimental-asyncapi.yaml");
    expect(draft.contents).toContain("# Experimental SocketLens AsyncAPI draft");
    expect(draft.contents).toContain('asyncapi: "3.0.0"');
    expect(draft.contents).toContain("x-socketlens-inferred: true");
    expect(draft.contents).toContain('address: "chat.message.created"');
    expect(draft.contents).toContain('action: "receive"');
    expect(draft.contents).toContain('action: "send"');
    expect(draft.contents).toContain('type: "object"');
  });

  it("redacts endpoint secrets and labels privacy state without mutating examples", () => {
    const draft = createAsyncApiDraftExport({
      packets: [
        createPacket({
          connectionId: "connection-a",
          direction: "inbound",
          payload: JSON.stringify({
            token: "[REDACTED]",
            type: "auth.accepted",
          }),
          sessionId: "session-a",
          timestamp: 1779364860000,
        }),
      ],
      redactionApplied: true,
      session,
    });

    expect(draft.contents).toContain("Generated from a redacted export copy");
    expect(draft.contents).toContain("[REDACTED]");
    expect(draft.contents).toContain("wss://user:***@example.com/realtime?...");
    expect(draft.contents).not.toContain("super-secret");
  });

  it("falls back safely for non-JSON packets", () => {
    const draft = createAsyncApiDraftExport({
      packets: [
        createPacket({
          connectionId: "connection-a",
          direction: "inbound",
          payload: "plain text frame",
          payloadKind: "text",
          sessionId: "session-a",
          timestamp: 1779364860000,
        }),
      ],
      redactionApplied: false,
      session,
    });

    expect(draft.contents).toContain('contentType: "text/plain"');
    expect(draft.contents).toContain('payload: "plain text frame"');
    expect(draft.contents).toContain('type: "string"');
    expect(draft.contents).toContain('Generated from a raw export copy');
  });
});
