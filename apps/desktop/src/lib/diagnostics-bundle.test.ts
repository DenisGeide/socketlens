import { describe, expect, it } from "vitest";
import { appMetadata } from "@/config/app-metadata";
import { createDiagnosticsBundle, serializeDiagnosticsBundle } from "@/lib/diagnostics-bundle";
import { createConnection, createPacket, createPresetEnvironment, createSession, defaultAppSettings } from "@/models";

describe("diagnostics bundle", () => {
  it("exports troubleshooting metadata without packet payloads or secrets", () => {
    const environment = createPresetEnvironment("local", 1);
    const connection = createConnection({
      endpointUrl: "ws://user:secret@example.com/socket?token=local-demo-token",
      id: "connection-1",
      now: 1,
    });
    const session = createSession({
      connectionId: connection.id,
      endpointUrl: connection.endpointUrl,
      id: "session-1",
      name: "Debug session",
      startedAt: 1,
    });
    const packet = createPacket({
      connectionId: connection.id,
      direction: "inbound",
      payload: '{"token":"super-secret-payload","type":"auth.accepted"}',
      sessionId: session.id,
      timestamp: 1,
    });
    const bundle = createDiagnosticsBundle({
      activeConnection: connection,
      activeEnvironment: environment,
      activeMode: "direct",
      activeSessionId: session.id,
      aiProvider: {
        ...defaultAppSettings.aiProvider,
        openAiCompatible: {
          apiKey: "fixture-provider-key",
          baseUrl: "https://api.example.com/v1?token=provider-secret",
          model: "gpt-test",
        },
        provider: "openai-compatible",
      },
      appName: appMetadata.name,
      appVersion: appMetadata.version,
      backendState: "ready",
      backendVersion: "0.1.0-alpha",
      currentSession: session,
      currentSessionPackets: [packet],
      endpointUrl: connection.endpointUrl,
      isConnected: true,
      lastDisconnectReason: null,
      lastError: null,
      lastErrorDetails: null,
      lastReconnectAttemptAt: null,
      logCount: 2,
      packetRetentionLimit: 10_000,
      packets: [packet],
      proxyPacketCount: 0,
      proxyStatus: null,
      reconnectAttempts: 0,
      runtime: {
        language: "en-US",
        online: true,
        platform: "test",
        userAgent: "vitest",
        viewport: "1200x800",
      },
      selectedConnection: connection,
      selectedSessionId: session.id,
      sessions: [session],
      socketReadyState: "open",
      status: "connected",
      visiblePacketCount: 1,
    });
    const serialized = serializeDiagnosticsBundle(bundle);

    expect(bundle.privacy.payloadsIncluded).toBe(false);
    expect(bundle.environment?.secretVariableCount).toBe(1);
    expect(bundle.packets.total.total).toBe(1);
    expect(serialized).not.toContain("super-secret-payload");
    expect(serialized).not.toContain("local-demo-token");
    expect(serialized).not.toContain("fixture-provider-key");
    expect(serialized).not.toContain("provider-secret");
    expect(serialized).toContain("ws://user:***@example.com/socket?...");
    expect(serialized).toContain("https://api.example.com/v1?...");
  });
});
