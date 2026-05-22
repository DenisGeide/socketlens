import { isErrorPacketFast } from "@/lib/packet-inspection";
import type { AppAiProviderSettings, AppEnvironment, Connection, ConnectionStatus, Packet, Session } from "@/models";
import { redactUrlForDisplay } from "@/models";
import type { NativeBackendState, ProxyStatus } from "@/lib/tauri-commands";

export type RuntimeDiagnostics = {
  language: string;
  online: boolean;
  platform: string;
  userAgent: string;
  viewport: string;
};

export type DiagnosticsBundleInput = {
  activeConnection: Connection | null;
  activeEnvironment: AppEnvironment | null;
  activeMode: "demo" | "direct" | "proxy";
  activeSessionId: string | null;
  aiProvider: AppAiProviderSettings;
  appName: string;
  appVersion: string;
  backendState: NativeBackendState;
  backendVersion: string | null;
  currentSession: Session | null;
  currentSessionPackets: Packet[];
  endpointUrl: string;
  isConnected: boolean;
  lastDisconnectReason: string | null;
  lastError: string | null;
  lastErrorDetails: string | null;
  lastReconnectAttemptAt: number | null;
  logCount: number;
  packetRetentionLimit: number;
  packets: Packet[];
  proxyPacketCount: number;
  proxyStatus: ProxyStatus | null;
  reconnectAttempts: number;
  runtime: RuntimeDiagnostics;
  selectedConnection: Connection | null;
  selectedSessionId: string | null;
  sessions: Session[];
  socketReadyState: string;
  status: ConnectionStatus;
  visiblePacketCount: number;
};

export type DiagnosticsBundle = ReturnType<typeof createDiagnosticsBundle>;

export function createDiagnosticsBundle(input: DiagnosticsBundleInput) {
  const packetCounters = countPackets(input.packets);
  const currentSessionCounters = countPackets(input.currentSessionPackets);
  const aiStatus = getAiProviderStatus(input.aiProvider);

  return {
    activeMode: input.activeMode,
    ai: aiStatus,
    app: {
      name: input.appName,
      version: input.appVersion,
    },
    backend: {
      state: input.backendState,
      version: input.backendVersion,
    },
    connection: {
      activeConnectionId: input.activeConnection?.id ?? null,
      activeConnectionName: input.activeConnection?.name ?? null,
      endpointUrl: redactUrlForDisplay(input.endpointUrl),
      isConnected: input.isConnected,
      lastDisconnectReason: input.lastDisconnectReason,
      lastError: input.lastError,
      lastErrorDetails: input.lastErrorDetails,
      lastReconnectAttemptAt: input.lastReconnectAttemptAt,
      reconnectAttempts: input.reconnectAttempts,
      selectedConnectionId: input.selectedConnection?.id ?? null,
      selectedConnectionName: input.selectedConnection?.name ?? null,
      socketReadyState: input.socketReadyState,
      status: input.status,
    },
    environment: input.activeEnvironment
      ? {
          connectionProfileCount: input.activeEnvironment.connectionProfiles.length,
          id: input.activeEnvironment.id,
          name: input.activeEnvironment.name,
          preset: input.activeEnvironment.preset ?? null,
          secretVariableCount: input.activeEnvironment.variables.filter((variable) => variable.isSecret).length,
          variableCount: input.activeEnvironment.variables.length,
        }
      : null,
    generatedAt: new Date().toISOString(),
    logs: {
      count: input.logCount,
    },
    packets: {
      currentSession: currentSessionCounters,
      total: packetCounters,
      visible: input.visiblePacketCount,
    },
    privacy: {
      environmentVariableValuesIncluded: false,
      payloadsIncluded: false,
      providerSecretsIncluded: false,
      recentLogMessagesIncluded: false,
    },
    proxy: {
      activeConnections: input.proxyStatus?.activeConnections ?? 0,
      isRunning: input.proxyStatus?.isRunning ?? false,
      listenUrl: input.proxyStatus?.listenUrl ? redactUrlForDisplay(input.proxyStatus.listenUrl) : null,
      mode: input.proxyStatus?.mode ?? "not_configured",
      packetCount: input.proxyPacketCount,
      targetUrl: input.proxyStatus?.targetUrl ? redactUrlForDisplay(input.proxyStatus.targetUrl) : null,
    },
    retention: {
      atPacketLimit: input.packets.length >= input.packetRetentionLimit,
      packetLimit: input.packetRetentionLimit,
      retainedPacketCount: input.packets.length,
    },
    runtime: input.runtime,
    sessions: {
      activeSessionId: input.activeSessionId,
      currentSessionId: input.currentSession?.id ?? null,
      currentSessionName: input.currentSession?.name ?? null,
      currentSessionStatus: input.currentSession?.status ?? null,
      selectedSessionId: input.selectedSessionId,
      totalSessions: input.sessions.length,
    },
    version: 1,
  };
}

export function serializeDiagnosticsBundle(bundle: DiagnosticsBundle) {
  return JSON.stringify(bundle, null, 2);
}

export function createDiagnosticsFileName(now = new Date()) {
  return `socketlens-diagnostics-${now.toISOString().replace(/[:.]/g, "-")}.json`;
}

function countPackets(packets: Packet[]) {
  return {
    binary: packets.filter((packet) => packet.payloadKind === "binary").length,
    errors: packets.filter(isErrorPacketFast).length,
    inbound: packets.filter((packet) => packet.direction === "inbound").length,
    json: packets.filter((packet) => packet.payloadKind === "json").length,
    outbound: packets.filter((packet) => packet.direction === "outbound").length,
    text: packets.filter((packet) => packet.payloadKind === "text").length,
    total: packets.length,
  };
}

function getAiProviderStatus(settings: AppAiProviderSettings) {
  switch (settings.provider) {
    case "ollama":
      return {
        baseUrl: redactUrlForDisplay(settings.ollama.baseUrl),
        configured: Boolean(settings.ollama.baseUrl.trim() && settings.ollama.model.trim()),
        enabled: true,
        model: settings.ollama.model.trim() || null,
        provider: settings.provider,
      };
    case "openai-compatible":
      return {
        apiKeyConfigured: Boolean(settings.openAiCompatible.apiKey.trim()),
        baseUrl: redactUrlForDisplay(settings.openAiCompatible.baseUrl),
        configured: Boolean(
          settings.openAiCompatible.baseUrl.trim() &&
            settings.openAiCompatible.model.trim() &&
            settings.openAiCompatible.apiKey.trim(),
        ),
        enabled: true,
        model: settings.openAiCompatible.model.trim() || null,
        provider: settings.provider,
      };
    case "disabled":
      return {
        configured: false,
        enabled: false,
        provider: settings.provider,
      };
  }
}
