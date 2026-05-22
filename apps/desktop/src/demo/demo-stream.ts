import { i18n } from "@/i18n";
import { createConnection, createEntityId, createPacket, type EntityId, type PacketDirection } from "@/models";
import { useConnectionStore } from "@/store/connection-store";
import { usePacketStore } from "@/store/packet-store";
import { useSessionStore } from "@/store/session-store";
import { useSettingsStore } from "@/store/settings-store";
import { useUiStore } from "@/store/ui-store";

export const demoStreamEndpointUrl = "demo://socketlens/realtime-collaboration";
const demoTickMs = 850;

let demoTimer: number | null = null;
let demoSequence = 0;

export function startDemoStream() {
  const uiStore = useUiStore.getState();

  if (uiStore.demoMode.isActive) {
    uiStore.addLog({
      level: "warning",
      message: i18n.t("demo.logs.alreadyRunning"),
      sessionId: uiStore.demoMode.sessionId,
    });
    return;
  }

  if (useConnectionStore.getState().isConnected) {
    uiStore.addLog({
      level: "warning",
      message: i18n.t("demo.logs.stopConnectionFirst"),
    });
    return;
  }

  const startedAt = Date.now();
  const connectionId = createEntityId();
  const connection = createConnection({
    endpointUrl: demoStreamEndpointUrl,
    id: connectionId,
    name: i18n.t("demo.sessionName"),
    now: startedAt,
    transport: "demo",
  });
  const session = useSessionStore.getState().startSession({
    connectionId,
    endpointUrl: demoStreamEndpointUrl,
    name: i18n.t("demo.sessionName"),
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
  useUiStore.getState().selectSession(session.id);
  useSessionStore.getState().updateSessionStatus(session.id, "connected");
  useUiStore.getState().addLog({
    connectionId,
    level: "success",
    message: i18n.t("demo.logs.started"),
    sessionId: session.id,
  });

  demoSequence = 0;
  emitDemoPacket(connectionId, session.id);
  demoTimer = window.setInterval(() => emitDemoPacket(connectionId, session.id), demoTickMs);
}

export function stopDemoStream() {
  const { demoMode } = useUiStore.getState();

  if (!demoMode.isActive || !demoMode.connectionId || !demoMode.sessionId) {
    return;
  }

  if (demoTimer !== null) {
    window.clearInterval(demoTimer);
    demoTimer = null;
  }

  const endedAt = Date.now();

  useConnectionStore.getState().setConnectionStatus(demoMode.connectionId, "disconnected", {
    updatedAt: endedAt,
  });
  useSessionStore.getState().updateSessionStatus(demoMode.sessionId, "closed", {
    closeCode: 1000,
    closeReason: "Demo stopped",
    endedAt,
  });
  useUiStore.getState().addLog({
    connectionId: demoMode.connectionId,
    level: "info",
    message: i18n.t("demo.logs.stopped"),
    sessionId: demoMode.sessionId,
  });
  useUiStore.getState().setDemoMode({
    connectionId: null,
    isActive: false,
    sessionId: null,
    startedAt: null,
  });
}

function emitDemoPacket(connectionId: EntityId, sessionId: EntityId) {
  const demoEvent = createDemoEvent(demoSequence);
  demoSequence += 1;

  const packet = createPacket({
    connectionId,
    direction: demoEvent.direction,
    payload: JSON.stringify(demoEvent.payload, null, 2),
    payloadKind: "json",
    sessionId,
  });

  usePacketStore.getState().addPacket(packet);
  useSessionStore.getState().recordPacket(packet);

  if (useSettingsStore.getState().settings.autoSelectLatestPacket) {
    useUiStore.getState().selectLatestPacket(packet.id);
  }

  if (demoEvent.logMessage) {
    useUiStore.getState().addLog({
      connectionId,
      level: demoEvent.logLevel,
      message: demoEvent.logMessage,
      sessionId,
    });
  }
}

type DemoEvent = {
  direction: PacketDirection;
  logLevel: "info" | "success" | "warning" | "error";
  logMessage: string | null;
  payload: Record<string, unknown>;
};

function createDemoEvent(sequence: number): DemoEvent {
  const timestamp = new Date().toISOString();
  const requestId = `req_${String(sequence + 1).padStart(4, "0")}`;
  const userId = ["usr_ana", "usr_max", "usr_sam", "usr_lee"][sequence % 4] ?? "usr_demo";
  const workspaceId = "wrk_socketlens_demo";

  const events: DemoEvent[] = [
    {
      direction: "outbound",
      logLevel: "info",
      logMessage: "Demo auth token refresh requested.",
      payload: {
        requestId,
        sentAt: timestamp,
        tokenPreview: "demo_token_preview_...d91",
        type: "auth.refresh",
        workspaceId,
      },
    },
    {
      direction: "inbound",
      logLevel: "success",
      logMessage: "Demo auth refresh accepted.",
      payload: {
        expiresInSeconds: 3600,
        receivedAt: timestamp,
        requestId,
        scopes: ["chat:read", "chat:write", "notifications:read"],
        type: "auth.accepted",
        userId,
      },
    },
    {
      direction: "outbound",
      logLevel: "info",
      logMessage: null,
      payload: {
        channelId: "room_product_launch",
        clientMessageId: `msg_${sequence}`,
        sentAt: timestamp,
        text: "Can someone verify the beta invite flow?",
        type: "chat.message.send",
        userId,
      },
    },
    {
      direction: "inbound",
      logLevel: "info",
      logMessage: "Demo chat message received.",
      payload: {
        channelId: "room_product_launch",
        deliveredAt: timestamp,
        messageId: `msg_server_${sequence}`,
        reactions: [],
        sender: {
          displayName: "Nina Patel",
          id: "usr_nina",
        },
        text: "Invite flow is healthy. Median delivery is 42 ms.",
        type: "chat.message.created",
      },
    },
    {
      direction: "inbound",
      logLevel: "info",
      logMessage: "Demo notification event received.",
      payload: {
        notificationId: `ntf_${sequence}`,
        priority: sequence % 3 === 0 ? "high" : "normal",
        receivedAt: timestamp,
        targetUserId: userId,
        title: "New production alert assigned",
        type: "notification.created",
      },
    },
    {
      direction: "outbound",
      logLevel: "info",
      logMessage: null,
      payload: {
        clientTime: timestamp,
        requestId,
        sequence,
        type: "ping",
      },
    },
    {
      direction: "inbound",
      logLevel: "success",
      logMessage: "Demo pong latency sample captured.",
      payload: {
        latencyMs: 24 + (sequence % 8) * 3,
        requestId,
        serverTime: timestamp,
        type: "pong",
      },
    },
    {
      direction: "inbound",
      logLevel: "error",
      logMessage: "Demo error frame received.",
      payload: {
        code: "RATE_LIMIT_SOFT",
        detail: "The demo client exceeded the suggested burst window. Retrying is safe.",
        receivedAt: timestamp,
        retryAfterMs: 1200,
        severity: "warning",
        type: "error",
      },
    },
    {
      direction: "inbound",
      logLevel: "info",
      logMessage: null,
      payload: {
        activeUsers: 18 + (sequence % 5),
        cursor: {
          line: 42 + (sequence % 7),
          userId,
        },
        documentId: "doc_launch_notes",
        receivedAt: timestamp,
        type: "presence.cursor.updated",
      },
    },
  ];

  const event = events[sequence % events.length];

  if (!event) {
    throw new Error("Demo stream has no event templates.");
  }

  return event;
}
