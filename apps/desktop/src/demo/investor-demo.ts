import { stopDemoStream } from "@/demo/demo-stream";
import { i18n } from "@/i18n";
import { createConnection, createEntityId, createPacket, type EntityId, type Packet, type PacketDirection } from "@/models";
import { useConnectionStore } from "@/store/connection-store";
import { usePacketStore } from "@/store/packet-store";
import { useSessionStore } from "@/store/session-store";
import { useUiStore, inactiveInvestorDemo } from "@/store/ui-store";

export const investorDemoEndpointUrl = "demo://socketlens/investor-guided-realtime";

export type InvestorDemoStep = {
  description: string;
  id: string;
  metric: string;
  packetsLabel: string;
  title: string;
};

type InvestorDemoPacketTemplate = {
  direction: PacketDirection;
  highlightLabel?: string;
  logLevel?: "info" | "success" | "warning" | "error";
  logMessage?: string;
  payload: (context: InvestorDemoContext) => Record<string, unknown>;
  replaySource?: "manual" | "replay";
  selectAfterEmit?: boolean;
  timestampOffsetMs?: number;
};

type InvestorDemoStepDefinition = InvestorDemoStep & {
  packets: InvestorDemoPacketTemplate[];
  selectPacketRole?: keyof InvestorDemoContext["selectedPacketIds"];
};

type InvestorDemoContext = {
  baseTimestamp: number;
  connectionId: EntityId;
  demoRunId: string;
  requestId: string;
  selectedPacketIds: Partial<Record<"auth" | "chat" | "error" | "replay", EntityId>>;
  sequence: number;
  sessionId: EntityId;
};

export const investorDemoSteps: InvestorDemoStepDefinition[] = [
  {
    description: "SocketLens opens with a synthetic realtime app handshake so the workspace has useful traffic immediately.",
    id: "connection-handshake",
    metric: "2 frames",
    packets: [
      {
        direction: "outbound",
        logMessage: "Investor demo requested an auth challenge.",
        highlightLabel: "Auth challenge request",
        payload: ({ demoRunId, requestId }) => ({
          type: "launchroom.auth.challenge.requested",
          requestId,
          demoRunId,
          environment: "demo",
          client: {
            app: "LaunchRoom Chat",
            build: "2026.05-demo",
            capabilities: ["json", "replay", "presence", "notifications"],
          },
          scopes: ["chat:read", "chat:write", "notifications:read"],
        }),
      },
      {
        direction: "inbound",
        logLevel: "success",
        logMessage: "Investor demo auth challenge issued.",
        highlightLabel: "Challenge issued",
        payload: ({ baseTimestamp, requestId }) => ({
          type: "launchroom.auth.challenge.issued",
          requestId,
          challengeId: "chl_socketlens_demo_01",
          expiresAt: new Date(baseTimestamp + 90_000).toISOString(),
          server: {
            region: "iad-1",
            realtimeCluster: "rt-demo-edge-01",
          },
        }),
        selectAfterEmit: true,
      },
    ],
    packetsLabel: "auth handshake",
    title: "Realtime app connects",
  },
  {
    description: "The demo follows a believable login exchange with workspace scopes and a clear accepted session.",
    id: "auth-flow",
    metric: "2 frames",
    packets: [
      {
        direction: "outbound",
        highlightLabel: "Signed challenge exchange",
        payload: ({ requestId }) => ({
          type: "launchroom.auth.challenge.exchange",
          requestId,
          challengeId: "chl_socketlens_demo_01",
          credential: {
            kind: "demo-jwt-preview",
            tokenPreview: "demo_jwt_...74b9",
            signaturePreview: "ed25519:8f2a...c91d",
          },
          device: {
            platform: "desktop",
            timezone: "Europe/Moscow",
            clientVersion: "0.1.0-alpha",
          },
        }),
      },
      {
        direction: "inbound",
        logLevel: "success",
        logMessage: "Investor demo auth session accepted.",
        highlightLabel: "Session accepted",
        payload: ({ baseTimestamp, requestId }) => ({
          type: "launchroom.auth.session.accepted",
          requestId,
          sessionId: "sess_launchroom_demo",
          connectionState: "ready",
          user: {
            id: "usr_mira",
            displayName: "Mira Chen",
            role: "developer",
          },
          workspace: {
            id: "wrk_launchroom",
            name: "LaunchRoom",
            plan: "team",
          },
          entitlements: ["packet-replay", "session-export", "ai-explain"],
          expiresAt: new Date(baseTimestamp + 3_600_000).toISOString(),
        }),
        selectAfterEmit: true,
      },
    ],
    packetsLabel: "auth accepted",
    title: "Auth flow is visible",
  },
  {
    description: "A chat room snapshot, a sent message, and server fan-out packets make the timeline feel like a real product session.",
    id: "chat-traffic",
    metric: "4 frames",
    packets: [
      {
        direction: "inbound",
        logMessage: "Investor demo chat room snapshot received.",
        highlightLabel: "Room snapshot",
        payload: () => ({
          type: "launchroom.chat.room.snapshot",
          roomId: "room_investor_demo",
          roomSlug: "launch-room/demo",
          unreadCount: 3,
          membersOnline: 18,
          syncCursor: "cur_01HXDEMOCHAT0001",
          lastMessage: {
            id: "msg_9831",
            author: "Nina Patel",
            text: "Backend latency looks clean after deploy.",
          },
        }),
      },
      {
        direction: "outbound",
        highlightLabel: "Manual chat send",
        payload: ({ requestId }) => ({
          type: "launchroom.chat.message.send",
          requestId,
          roomId: "room_investor_demo",
          clientMessageId: "msg_client_1001",
          text: "Shipping the SocketLens investor demo now. Please watch auth, chat, and replay frames.",
          metadata: {
            source: "manual",
            editor: "composer",
            optimisticRender: true,
          },
        }),
        replaySource: "manual",
      },
      {
        direction: "inbound",
        logMessage: "Investor demo chat message confirmed.",
        highlightLabel: "Server fan-out confirmation",
        payload: ({ baseTimestamp, requestId }) => ({
          type: "launchroom.chat.message.created",
          requestId,
          roomId: "room_investor_demo",
          messageId: "msg_server_5001",
          deliveredAt: new Date(baseTimestamp + 80).toISOString(),
          sender: {
            id: "usr_mira",
            displayName: "Mira Chen",
          },
          text: "Shipping the SocketLens investor demo now. Please watch auth, chat, and replay frames.",
          delivery: {
            fanoutCount: 18,
            medianLatencyMs: 42,
          },
        }),
        selectAfterEmit: true,
      },
      {
        direction: "inbound",
        highlightLabel: "Realtime reaction",
        payload: () => ({
          type: "launchroom.chat.reaction.added",
          roomId: "room_investor_demo",
          messageId: "msg_server_5001",
          actor: {
            id: "usr_nina",
            displayName: "Nina Patel",
          },
          reaction: "rocket",
          totalReactions: 7,
        }),
      },
    ],
    packetsLabel: "chat traffic",
    title: "Live chat traffic appears",
  },
  {
    description: "Heartbeat frames prove the connection is alive and help developers reason about latency and reconnect behavior.",
    id: "heartbeat",
    metric: "2 frames",
    packets: [
      {
        direction: "outbound",
        highlightLabel: "Heartbeat ping",
        payload: ({ baseTimestamp, requestId, sequence }) => ({
          type: "launchroom.connection.heartbeat.ping",
          requestId,
          sequence,
          clientTime: new Date(baseTimestamp).toISOString(),
          observedTabState: "foreground",
        }),
      },
      {
        direction: "inbound",
        logLevel: "success",
        logMessage: "Investor demo heartbeat latency captured.",
        highlightLabel: "Latency sample",
        payload: ({ baseTimestamp, requestId, sequence }) => ({
          type: "launchroom.connection.heartbeat.pong",
          requestId,
          sequence,
          serverTime: new Date(baseTimestamp + 28).toISOString(),
          latencyMs: 28,
          clockSkewMs: -3,
          health: {
            connection: "stable",
            reconnectRequired: false,
          },
        }),
        selectAfterEmit: true,
      },
    ],
    packetsLabel: "ping/pong",
    title: "Heartbeat stays clean",
  },
  {
    description: "Notifications and presence updates show how SocketLens groups different event types in the same session.",
    id: "notifications",
    metric: "2 frames",
    packets: [
      {
        direction: "inbound",
        logMessage: "Investor demo notification event received.",
        highlightLabel: "Priority notification",
        payload: ({ baseTimestamp }) => ({
          type: "launchroom.notification.created",
          notificationId: "ntf_investor_demo_41",
          title: "Beta invite flow is healthy",
          priority: "high",
          receivedAt: new Date(baseTimestamp).toISOString(),
          action: {
            label: "Open deploy notes",
            route: "/launch-room/deploys/2026-05-21",
          },
          audience: {
            workspaceId: "wrk_launchroom",
            channel: "deploy-watchers",
          },
        }),
        selectAfterEmit: true,
      },
      {
        direction: "inbound",
        highlightLabel: "Presence update",
        payload: ({ baseTimestamp }) => ({
          type: "launchroom.presence.typing.started",
          roomId: "room_investor_demo",
          user: {
            id: "usr_sam",
            displayName: "Sam Rivera",
          },
          startedAt: new Date(baseTimestamp + 120).toISOString(),
          expiresAt: new Date(baseTimestamp + 3_120).toISOString(),
        }),
      },
    ],
    packetsLabel: "notify + presence",
    title: "Notifications are inspectable",
  },
  {
    description: "The timeline includes a safe warning packet so the inspector and AI demo can explain a suspicious event without crashing.",
    id: "error-event",
    metric: "2 frames",
    packets: [
      {
        direction: "inbound",
        logLevel: "warning",
        logMessage: "Investor demo warning frame received.",
        highlightLabel: "Soft rate limit",
        payload: ({ baseTimestamp, requestId }) => ({
          type: "launchroom.error.rate_limit.soft",
          requestId,
          code: "RATE_LIMIT_SOFT",
          severity: "warning",
          safeToRetry: true,
          retryAfterMs: 1200,
          detail: "The demo client exceeded the suggested burst window. Backoff and replay are safe.",
          receivedAt: new Date(baseTimestamp).toISOString(),
        }),
        selectAfterEmit: true,
      },
      {
        direction: "outbound",
        highlightLabel: "Client backoff scheduled",
        payload: ({ baseTimestamp, requestId }) => ({
          type: "launchroom.client.backoff.scheduled",
          requestId,
          reason: "RATE_LIMIT_SOFT",
          delayMs: 1200,
          scheduledAt: new Date(baseTimestamp + 12).toISOString(),
          policy: {
            jitterMs: 86,
            maxRetries: 2,
          },
        }),
      },
    ],
    packetsLabel: "warning path",
    title: "Errors are friendly",
  },
  {
    description: "SocketLens shows the original outbound frame and a replayed version in history, clearly marked as demo traffic.",
    id: "replay-example",
    metric: "3 frames",
    packets: [
      {
        direction: "outbound",
        highlightLabel: "Original outbound frame",
        payload: ({ requestId }) => ({
          type: "launchroom.notification.acknowledge",
          requestId,
          roomId: "room_investor_demo",
          notificationId: "ntf_investor_demo_41",
          clientAckId: "ack_client_original",
          text: "Acknowledge deploy notification after reviewing the payload.",
          metadata: {
            source: "manual",
            demo: true,
          },
        }),
        replaySource: "manual",
      },
      {
        direction: "outbound",
        logLevel: "success",
        logMessage: "Investor demo replay frame added to replay history.",
        highlightLabel: "Replay after backoff",
        payload: ({ requestId }) => ({
          type: "launchroom.notification.acknowledge",
          requestId,
          roomId: "room_investor_demo",
          notificationId: "ntf_investor_demo_41",
          clientAckId: "ack_client_replay",
          text: "Replay: acknowledgement resent after the backoff window.",
          metadata: {
            source: "replay",
            replayOf: "ack_client_original",
            demo: true,
          },
        }),
        replaySource: "replay",
      },
      {
        direction: "inbound",
        logLevel: "success",
        logMessage: "Investor demo replay acknowledgement accepted.",
        highlightLabel: "Replay accepted",
        payload: ({ baseTimestamp, requestId }) => ({
          type: "launchroom.notification.acknowledged",
          requestId,
          notificationId: "ntf_investor_demo_41",
          acknowledgedAt: new Date(baseTimestamp + 280).toISOString(),
          replayAccepted: true,
          duplicateSuppressed: false,
        }),
        selectAfterEmit: true,
      },
    ],
    packetsLabel: "manual + replay",
    title: "Replay is demonstrated",
  },
  {
    description: "When AI is disabled, SocketLens shows an offline demo explanation so the privacy model stays honest.",
    id: "ai-placeholder",
    metric: "offline",
    packets: [],
    packetsLabel: "sample analysis",
    selectPacketRole: "error",
    title: "AI explain preview is offline",
  },
];

const investorDemoTickMs = 950;

let investorDemoTimer: ReturnType<typeof setInterval> | null = null;
let investorDemoStepIndex = 0;
let investorDemoContext: InvestorDemoContext | null = null;

export function startInvestorDemo({ intervalMs = investorDemoTickMs }: { intervalMs?: number } = {}) {
  const uiStore = useUiStore.getState();
  const connectionStore = useConnectionStore.getState();

  if (uiStore.investorDemo.isActive) {
    uiStore.addToast({
      level: "info",
      message: i18n.t("investorDemo.toasts.alreadyOpenDescription"),
      title: i18n.t("investorDemo.toasts.running"),
    });
    return;
  }

  if (connectionStore.isConnected || connectionStore.status === "connecting") {
    const message = i18n.t("investorDemo.errors.disconnectBeforeStart");

    uiStore.addLog({ level: "warning", message });
    uiStore.addToast({
      level: "warning",
      message,
      title: i18n.t("investorDemo.toasts.notStarted"),
    });
    return;
  }

  if (uiStore.demoMode.isActive) {
    stopDemoStream();
  }

  clearInvestorDemoTimer();
  usePacketStore.getState().flushPendingPackets();
  useSessionStore.getState().flushPendingPacketStats();
  uiStore.clearReplayHistory();
  uiStore.resetFilters();
  uiStore.setComposerDraft("");
  uiStore.setComposerError(null);

  const startedAt = Date.now();
  const connectionId = createEntityId();
  const connection = createConnection({
    endpointUrl: investorDemoEndpointUrl,
    id: connectionId,
    name: i18n.t("investorDemo.connectionName"),
    now: startedAt,
    transport: "demo",
  });
  const session = useSessionStore.getState().startSession({
    connectionId,
    endpointUrl: investorDemoEndpointUrl,
    name: i18n.t("investorDemo.sessionName"),
    startedAt,
  });

  useConnectionStore.getState().registerConnection({
    ...connection,
    lastConnectedAt: startedAt,
    status: "connected",
    updatedAt: startedAt,
  });
  useUiStore.getState().setDemoMode({
    connectionId,
    isActive: true,
    sessionId: session.id,
    startedAt,
  });
  useUiStore.getState().setInvestorDemo({
    completedAt: null,
    connectionId,
    currentStepIndex: 0,
    isActive: true,
    sessionId: session.id,
    startedAt,
  });
  useUiStore.getState().selectSession(session.id);
  useSessionStore.getState().updateSessionStatus(session.id, "connected");

  investorDemoStepIndex = 0;
  investorDemoContext = {
    baseTimestamp: startedAt,
    connectionId,
    demoRunId: `demo_${startedAt.toString(36)}`,
    requestId: "req_investor_demo_0001",
    selectedPacketIds: {},
    sequence: 1,
    sessionId: session.id,
  };

  uiStore.addLog({
    connectionId,
    level: "success",
    message: i18n.t("investorDemo.logs.started"),
    sessionId: session.id,
  });
  uiStore.addToast({
    level: "success",
    message: i18n.t("investorDemo.toasts.startedDescription"),
    title: i18n.t("investorDemo.toasts.started"),
  });

  playNextInvestorDemoStep();
  investorDemoTimer = setInterval(playNextInvestorDemoStep, intervalMs);
}

export function stopInvestorDemo() {
  const investorDemo = useUiStore.getState().investorDemo;

  if (!investorDemo.isActive) {
    return;
  }

  clearInvestorDemoTimer();
  closeInvestorDemoSession(i18n.t("investorDemo.logs.stopped"));
  useUiStore.getState().setInvestorDemo(inactiveInvestorDemo);
  useUiStore.getState().setDemoMode({
    connectionId: null,
    isActive: false,
    sessionId: null,
    startedAt: null,
  });
  investorDemoContext = null;
}

export function resetInvestorDemo() {
  const investorDemo = useUiStore.getState().investorDemo;
  const sessionId = investorDemo.sessionId;
  const connectionId = investorDemo.connectionId;

  if (investorDemo.isActive) {
    stopInvestorDemo();
  } else {
    clearInvestorDemoTimer();
    investorDemoContext = null;
  }

  if (sessionId) {
    usePacketStore.getState().clearPackets(sessionId);
    useSessionStore.getState().removeSession(sessionId);
  }

  if (connectionId) {
    useConnectionStore.getState().removeConnection(connectionId);
  }

  useUiStore.getState().clearReplayHistory();
  useUiStore.getState().selectPacket(null);
  useUiStore.getState().selectSession(null);
  useUiStore.getState().resetFilters();
  useUiStore.getState().addLog({
    level: "info",
    message: i18n.t("investorDemo.logs.reset"),
    sessionId,
  });
  useUiStore.getState().addToast({
    level: "info",
    message: i18n.t("investorDemo.toasts.resetDescription"),
    title: i18n.t("investorDemo.toasts.reset"),
  });
}

function playNextInvestorDemoStep() {
  const context = investorDemoContext;

  if (!context) {
    clearInvestorDemoTimer();
    return;
  }

  const step = investorDemoSteps[investorDemoStepIndex];

  if (!step) {
    completeInvestorDemo(context.connectionId, context.sessionId);
    return;
  }

  useUiStore.getState().setInvestorDemo({
    ...useUiStore.getState().investorDemo,
    currentStepIndex: investorDemoStepIndex,
  });

  emitInvestorDemoStep(step, context);
  investorDemoStepIndex += 1;
  context.sequence += 1;
  context.requestId = `req_investor_demo_${String(context.sequence).padStart(4, "0")}`;
  context.baseTimestamp = Date.now();

  if (investorDemoStepIndex >= investorDemoSteps.length) {
    completeInvestorDemo(context.connectionId, context.sessionId);
  }
}

function emitInvestorDemoStep(step: InvestorDemoStepDefinition, context: InvestorDemoContext) {
  const packets = step.packets.map((template, index) => createInvestorPacket(template, step, context, index));

  if (packets.length > 0) {
    usePacketStore.getState().addPackets(packets);
    useSessionStore.getState().recordPackets(packets);
    recordReplayHistory(step.packets, packets);
  }

  const selectedPacket =
    packets.find((packet, index) => step.packets[index]?.selectAfterEmit) ??
    (step.selectPacketRole ? getStoredPacket(step.selectPacketRole, context) : null) ??
    packets[packets.length - 1] ??
    null;

  if (selectedPacket) {
    useUiStore.getState().selectPacket(selectedPacket.id);
  }

  rememberSelectedPackets(step.id, selectedPacket, context);

  useUiStore.getState().addLog({
    connectionId: context.connectionId,
    level: "info",
    message: i18n.t("investorDemo.logs.step", { title: i18n.t(`investorDemo.steps.${step.id}.title`) }),
    sessionId: context.sessionId,
  });
}

function createInvestorPacket(
  template: InvestorDemoPacketTemplate,
  step: InvestorDemoStepDefinition,
  context: InvestorDemoContext,
  index: number,
) {
  const timestamp = context.baseTimestamp + (template.timestampOffsetMs ?? index * 180);
  const payload = decorateInvestorPayload(template.payload(context), {
    context,
    highlightLabel: template.highlightLabel,
    step,
    timestamp,
  });
  const packet = createPacket({
    connectionId: context.connectionId,
    direction: template.direction,
    payload: JSON.stringify(payload, null, 2),
    payloadKind: "json",
    sessionId: context.sessionId,
    timestamp,
  });

  if (template.logMessage) {
    useUiStore.getState().addLog({
      connectionId: context.connectionId,
      level: template.logLevel ?? "info",
      message: template.logMessage,
      sessionId: context.sessionId,
    });
  }

  return packet;
}

function decorateInvestorPayload(
  payload: Record<string, unknown>,
  {
    context,
    highlightLabel,
    step,
    timestamp,
  }: {
    context: InvestorDemoContext;
    highlightLabel?: string;
    step: InvestorDemoStepDefinition;
    timestamp: number;
  },
) {
  return {
    ...payload,
    demo: {
      generatedAt: new Date(timestamp).toISOString(),
      highlight: Boolean(highlightLabel),
      highlightLabel: highlightLabel ?? null,
      product: "SocketLens",
      runId: context.demoRunId,
      scenario: "investor-demo",
      simulated: true,
      stepId: step.id,
      stepTitle: i18n.t(`investorDemo.steps.${step.id}.title`),
    },
  };
}

function recordReplayHistory(templates: InvestorDemoPacketTemplate[], packets: Packet[]) {
  let originalReplayPacketId: EntityId | null = null;

  templates.forEach((template, index) => {
    if (!template.replaySource) {
      return;
    }

    const packet = packets[index];

    if (!packet) {
      return;
    }

    useUiStore.getState().addReplayHistoryItem({
      connectionId: packet.connectionId,
      payload: packet.payload,
      payloadKind: packet.payloadKind,
      sessionId: packet.sessionId,
      sizeBytes: packet.sizeBytes,
      source: template.replaySource,
      sourcePacketId: template.replaySource === "replay" ? originalReplayPacketId : null,
    });

    if (template.replaySource === "manual") {
      originalReplayPacketId = packet.id;
    }
  });
}

function rememberSelectedPackets(stepId: string, selectedPacket: Packet | null, context: InvestorDemoContext) {
  if (!selectedPacket) {
    return;
  }

  if (stepId === "auth-flow") {
    context.selectedPacketIds.auth = selectedPacket.id;
  }

  if (stepId === "chat-traffic") {
    context.selectedPacketIds.chat = selectedPacket.id;
  }

  if (stepId === "error-event") {
    context.selectedPacketIds.error = selectedPacket.id;
  }

  if (stepId === "replay-example") {
    context.selectedPacketIds.replay = selectedPacket.id;
  }
}

function getStoredPacket(role: keyof InvestorDemoContext["selectedPacketIds"], context: InvestorDemoContext) {
  const packetId = context.selectedPacketIds[role];

  if (!packetId) {
    return null;
  }

  return usePacketStore.getState().packets.find((packet) => packet.id === packetId) ?? null;
}

function completeInvestorDemo(connectionId: EntityId, sessionId: EntityId) {
  clearInvestorDemoTimer();
  const completedAt = Date.now();

  useUiStore.getState().setInvestorDemo({
    ...useUiStore.getState().investorDemo,
    completedAt,
    connectionId,
    isActive: true,
    sessionId,
  });
  useUiStore.getState().addLog({
    connectionId,
    level: "success",
    message: i18n.t("investorDemo.logs.completed"),
    sessionId,
  });
  useUiStore.getState().addToast({
    level: "success",
    message: i18n.t("investorDemo.toasts.completedDescription"),
    title: i18n.t("investorDemo.toasts.completed"),
  });
}

function closeInvestorDemoSession(reason: string) {
  const { investorDemo } = useUiStore.getState();
  const endedAt = Date.now();

  if (investorDemo.connectionId) {
    useConnectionStore.getState().setConnectionStatus(investorDemo.connectionId, "disconnected", {
      updatedAt: endedAt,
    });
  }

  if (investorDemo.sessionId) {
    useSessionStore.getState().updateSessionStatus(investorDemo.sessionId, "closed", {
      closeCode: 1000,
      closeReason: reason,
      endedAt,
    });
    useUiStore.getState().addLog({
      connectionId: investorDemo.connectionId,
      level: "info",
      message: reason,
      sessionId: investorDemo.sessionId,
    });
  }
}

function clearInvestorDemoTimer() {
  if (investorDemoTimer !== null) {
    clearInterval(investorDemoTimer);
    investorDemoTimer = null;
  }
}
