import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { localEchoServerUrl } from "@/config/runtime-defaults";
import { i18n } from "@/i18n";
import { getFriendlyErrorMessage, getWebSocketCloseMessage } from "@/lib/friendly-errors";
import { createTechnicalDetails, createUserFacingError, type UserFacingError } from "@/lib/user-facing-errors";
import { translateWebSocketValidationMessage } from "@/lib/validation-messages";
import {
  createConnection,
  createEntityId,
  createPacket,
  getConnectionName,
  getActiveEnvironment,
  hasEnvironmentVariables,
  inferPayloadKind,
  interpolateEnvironmentVariables,
  redactUrlForDisplay,
  type AppEnvironment,
  type Connection,
  type ConnectionStatus,
  type EntityId,
  type Packet,
  type PacketPayloadKind,
  type SendSource,
  validateWebSocketUrl,
} from "@/models";
import { useEnvironmentStore } from "@/store/environment-store";
import { usePacketStore } from "@/store/packet-store";
import { useSessionStore } from "@/store/session-store";
import { useSettingsStore } from "@/store/settings-store";
import { useUiStore } from "@/store/ui-store";

export type SaveConnectionInput = {
  endpointUrl: string;
  endpointTemplate?: string | null;
  environmentId?: EntityId | null;
  environmentName?: string | null;
  name?: string;
};

type ConnectInput = {
  connectionId?: EntityId;
  endpointUrl?: string;
  endpointTemplate?: string | null;
  environmentId?: EntityId | null;
  environmentName?: string | null;
  name?: string;
};

export type SendMessageOptions = {
  clearDraft?: boolean;
  source?: SendSource;
  sourcePacketId?: EntityId | null;
};

type ConnectionStore = {
  activeConnectionId: EntityId | null;
  activeSessionId: EntityId | null;
  clearConnectionHistory: () => void;
  connect: (input?: ConnectInput) => Promise<void>;
  connectToConnection: (connectionId: EntityId) => Promise<void>;
  connections: Connection[];
  disconnect: () => void;
  dispose: (reason?: string) => void;
  endpointUrl: string;
  error: string | null;
  errorDetails: string | null;
  isConnected: boolean;
  lastDisconnectReason: string | null;
  lastReconnectAttemptAt: number | null;
  reconnect: (connectionId?: EntityId | null) => Promise<void>;
  reconnectAttempts: number;
  registerConnection: (connection: Connection) => void;
  removeConnection: (connectionId: EntityId) => void;
  saveConnection: (input: SaveConnectionInput) => Connection | null;
  selectedConnectionId: EntityId | null;
  selectConnection: (connectionId: EntityId) => void;
  sendMessage: (payload: string, options?: SendMessageOptions) => Packet | null;
  setConnectionStatus: (connectionId: EntityId, status: ConnectionStatus, patch?: Partial<Connection>) => void;
  setEndpointUrl: (endpointUrl: string) => void;
  socket: WebSocket | null;
  status: ConnectionStatus;
};

type NormalizedSocketMessage = {
  payload: string;
  payloadKind: PacketPayloadKind;
};

type PersistedConnectionState = Pick<ConnectionStore, "connections" | "endpointUrl" | "selectedConnectionId">;

const reconnectCooldownMs = 900;
const socketConnecting = 0;
const socketOpen = 1;
const socketClosing = 2;
const socketClosed = 3;

type ResolvedConnectionEndpoint =
  | {
      endpointUrl: string;
      ok: true;
    }
  | {
      message: string;
      ok: false;
      technicalMessage: string;
    };

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      activeConnectionId: null,
      activeSessionId: null,
      clearConnectionHistory: () => {
        const { activeConnectionId } = get();

        set((state) => ({
          connections: activeConnectionId
            ? state.connections.filter((connection) => connection.id === activeConnectionId)
            : [],
          selectedConnectionId: activeConnectionId,
        }));
        useUiStore.getState().addLog({
          level: "info",
          message: i18n.t("connection.logs.historyCleared"),
        });
      },
      connect: async (input = {}) => {
        const uiStore = useUiStore.getState();
        const currentState = get();
        const targetConnection = input.connectionId
          ? currentState.connections.find((connection) => connection.id === input.connectionId)
          : null;
        const rawEndpointCandidate = input.endpointUrl ?? targetConnection?.endpointUrl ?? currentState.endpointUrl;
        const endpointTemplateCandidate =
          input.endpointTemplate ??
          targetConnection?.endpointTemplate ??
          (hasEnvironmentVariables(rawEndpointCandidate) ? rawEndpointCandidate : null);
        const environment = getConnectionEnvironment(input.environmentId ?? targetConnection?.environmentId ?? null);
        const environmentIdCandidate =
          input.environmentId ?? targetConnection?.environmentId ?? (endpointTemplateCandidate ? environment?.id ?? null : null);
        const environmentNameCandidate =
          input.environmentName ?? targetConnection?.environmentName ?? (endpointTemplateCandidate ? environment?.name ?? null : null);
        const nameCandidate = input.name ?? targetConnection?.name;

        if (uiStore.demoMode.isActive) {
          const message = i18n.t("connection.errors.stopDemoBeforeDirect");
          uiStore.addLog({
            level: "warning",
            message,
            sessionId: uiStore.demoMode.sessionId,
          });
          uiStore.addToast({
            level: "warning",
            message,
            title: i18n.t("connection.toasts.demoActive"),
          });
          return;
        }

        if (isLiveSocket(currentState.socket)) {
          const message = i18n.t("connection.errors.disconnectBeforeAnother");
          uiStore.addLog({
            connectionId: currentState.activeConnectionId,
            level: "warning",
            message,
            sessionId: currentState.activeSessionId,
          });
          uiStore.addToast({
            level: "warning",
            message,
            title: i18n.t("connection.toasts.alreadyActive"),
          });
          return;
        }

        if (currentState.socket) {
          cleanupSocket(currentState.socket);
          set({ socket: null });
        }

        const resolvedEndpoint = resolveConnectionEndpoint({
          endpointTemplate: endpointTemplateCandidate,
          endpointUrl: rawEndpointCandidate,
          environment,
        });

        if (!resolvedEndpoint.ok) {
          const issue = createInvalidUrlError(resolvedEndpoint.message, resolvedEndpoint.technicalMessage);
          const message = issue.message;

          set((state) => ({
            connections: targetConnection
              ? patchConnection(state.connections, targetConnection.id, {
                  error: message,
                  status: "error",
                  updatedAt: Date.now(),
                })
              : state.connections,
            error: message,
            errorDetails: issue.technicalDetails,
            isConnected: false,
            lastDisconnectReason: message,
            selectedConnectionId: targetConnection?.id ?? state.selectedConnectionId,
            status: "error",
          }));
          uiStore.addLog({ level: "error", message });
          uiStore.addToast({
            details: issue.technicalDetails,
            level: "error",
            message: issue.suggestion,
            title: issue.title,
          });
          return;
        }

        const validation = validateWebSocketUrl(resolvedEndpoint.endpointUrl);

        if (!validation.ok) {
          const issue = createInvalidUrlError(translateWebSocketValidationMessage(validation.message, i18n.t), validation.message);
          const message = issue.message;

          set((state) => ({
            connections: targetConnection
              ? patchConnection(state.connections, targetConnection.id, {
                  error: message,
                  status: "error",
                  updatedAt: Date.now(),
                })
              : state.connections,
            error: message,
            errorDetails: issue.technicalDetails,
            isConnected: false,
            lastDisconnectReason: message,
            selectedConnectionId: targetConnection?.id ?? state.selectedConnectionId,
            status: "error",
          }));
          uiStore.addLog({ level: "error", message });
          uiStore.addToast({
            details: issue.technicalDetails,
            level: "error",
            message: issue.suggestion,
            title: issue.title,
          });
          return;
        }

        const validatedEndpoint = validation.url;
        let nextSocket: WebSocket;

        try {
          nextSocket = new WebSocket(validatedEndpoint);
        } catch (error) {
          const issue = createUserFacingError("invalidUrl", i18n.t, {
            message: getFriendlyErrorMessage(error, i18n.t("connection.errors.invalidEndpoint")),
            technicalDetails: createTechnicalDetails("WebSocket constructor failed", {
              endpointUrl: redactUrlForDisplay(validatedEndpoint),
              error: error instanceof Error ? error.message : String(error),
            }),
          });
          const message = issue.message;

          set((state) => ({
            connections: targetConnection
              ? patchConnection(state.connections, targetConnection.id, {
                  error: message,
                  status: "error",
                  updatedAt: Date.now(),
                })
              : state.connections,
            error: message,
            errorDetails: issue.technicalDetails,
            isConnected: false,
            lastDisconnectReason: message,
            selectedConnectionId: targetConnection?.id ?? state.selectedConnectionId,
            status: "error",
          }));
          uiStore.addLog({ level: "error", message });
          uiStore.addToast({
            details: issue.technicalDetails,
            level: "error",
            message: issue.suggestion,
            title: issue.title,
          });
          return;
        }

        const now = Date.now();
        const connection = getOrCreateConnection(get().connections, {
          endpointUrl: validatedEndpoint,
          endpointTemplate: endpointTemplateCandidate,
          environmentId: environmentIdCandidate,
          environmentName: environmentNameCandidate,
          id: input.connectionId,
          name: nameCandidate,
          now,
        });
        const session = useSessionStore.getState().startSession({
          connectionId: connection.id,
          endpointUrl: validatedEndpoint,
          name: connection.name,
          startedAt: now,
        });

        set((state) => ({
          activeConnectionId: connection.id,
          activeSessionId: session.id,
          connections: upsertConnection(state.connections, {
            ...connection,
            endpointUrl: validatedEndpoint,
            endpointTemplate: endpointTemplateCandidate,
            environmentId: environmentIdCandidate,
            environmentName: environmentNameCandidate,
            error: null,
            name: getStableConnectionName(nameCandidate, validatedEndpoint),
            status: "connecting",
            updatedAt: now,
          }),
          endpointUrl: validatedEndpoint,
          error: null,
          errorDetails: null,
          isConnected: false,
          lastDisconnectReason: null,
          selectedConnectionId: connection.id,
          socket: nextSocket,
          status: "connecting",
        }));
        uiStore.selectSession(session.id);
        uiStore.addLog({
          connectionId: connection.id,
          level: "info",
          message: i18n.t("connection.logs.connectingTo", { url: redactUrlForDisplay(validatedEndpoint) }),
          sessionId: session.id,
        });

        nextSocket.onopen = () => {
          if (!isCurrentSocket(get(), nextSocket, session.id)) {
            cleanupSocket(nextSocket, 1000, "Connection replaced");
            return;
          }

          const openedAt = Date.now();

          set((state) => ({
            activeConnectionId: connection.id,
            activeSessionId: session.id,
            connections: patchConnection(state.connections, connection.id, {
              error: null,
              lastConnectedAt: openedAt,
              status: "connected",
              updatedAt: openedAt,
            }),
            error: null,
            errorDetails: null,
            isConnected: true,
            lastDisconnectReason: null,
            reconnectAttempts: 0,
            selectedConnectionId: connection.id,
            status: "connected",
          }));
          useSessionStore.getState().updateSessionStatus(session.id, "connected");
          useUiStore.getState().addLog({
            connectionId: connection.id,
            level: "success",
            message: i18n.t("connection.logs.established"),
            sessionId: session.id,
          });
          useUiStore.getState().addToast({
            level: "success",
            message: redactUrlForDisplay(validatedEndpoint),
            title: i18n.t("connection.toasts.connected"),
          });
        };

        nextSocket.onmessage = (event: MessageEvent<string | Blob | ArrayBuffer>) => {
          if (!isCurrentSocket(get(), nextSocket, session.id)) {
            return;
          }

          void normalizeMessage(event.data)
            .then(({ payload, payloadKind }) => {
              if (!isCurrentSocket(get(), nextSocket, session.id)) {
                return;
              }

              const packet = createPacket({
                connectionId: connection.id,
                direction: "inbound",
                payload,
                payloadKind,
                sessionId: session.id,
              });

              usePacketStore.getState().addPacket(packet);
              useSessionStore.getState().recordPacket(packet);

              if (useSettingsStore.getState().settings.autoSelectLatestPacket) {
                useUiStore.getState().selectLatestPacket(packet.id);
              }

              useUiStore.getState().addLog({
                connectionId: connection.id,
                level: "info",
                message: i18n.t("connection.logs.receivedFrame", { bytes: packet.sizeBytes }),
                sessionId: session.id,
              });
            })
            .catch((error: unknown) => {
              const issue = createUserFacingError("connectionFailure", i18n.t, {
                message: getFriendlyErrorMessage(error, i18n.t("connection.errors.inboundFrameFailed")),
                technicalDetails: createTechnicalDetails("Inbound WebSocket frame normalization failed", {
                  endpointUrl: redactUrlForDisplay(validatedEndpoint),
                  error: error instanceof Error ? error.message : String(error),
                }),
              });
              const message = issue.message;

              useUiStore.getState().addLog({
                connectionId: connection.id,
                level: "error",
                message,
                sessionId: session.id,
              });
              useUiStore.getState().addToast({
                details: issue.technicalDetails,
                level: "error",
                message: issue.suggestion,
                title: issue.title,
              });
            });
        };

        nextSocket.onclose = (event) => {
          if (!isCurrentSocket(get(), nextSocket, session.id)) {
            detachSocketHandlers(nextSocket);
            return;
          }

          detachSocketHandlers(nextSocket);

          const currentStatus = get().status;
          const closeMessage = getWebSocketCloseMessage(event.code, event.reason);
          const nextStatus: ConnectionStatus = currentStatus === "error" || event.code === 1006 ? "error" : "disconnected";
          const endedAt = Date.now();
          const closeIssue =
            nextStatus === "error"
              ? createUserFacingError("connectionFailure", i18n.t, {
                  message: closeMessage,
                  technicalDetails: createTechnicalDetails("WebSocket closed with an error", {
                    closeCode: event.code,
                    closeReason: event.reason || null,
                    endpointUrl: redactUrlForDisplay(validatedEndpoint),
                    wasClean: event.wasClean,
                  }),
                })
              : null;

          set((state) => ({
            activeConnectionId: null,
            activeSessionId: null,
            connections: patchConnection(state.connections, connection.id, {
              error: nextStatus === "error" ? closeMessage : null,
              status: nextStatus,
              updatedAt: endedAt,
            }),
            error: nextStatus === "error" ? closeMessage : null,
            errorDetails: closeIssue?.technicalDetails ?? null,
            isConnected: false,
            lastDisconnectReason: closeMessage,
            socket: state.socket === nextSocket ? null : state.socket,
            status: nextStatus,
          }));
          useSessionStore.getState().updateSessionStatus(session.id, nextStatus === "error" ? "error" : "closed", {
            closeCode: event.code,
            closeReason: event.reason || null,
            endedAt,
          });
          useUiStore.getState().addLog({
            connectionId: connection.id,
            level: nextStatus === "error" ? "error" : "info",
            message: closeMessage,
            sessionId: session.id,
          });

          if (nextStatus === "error" || event.code !== 1000) {
            useUiStore.getState().addToast({
              details: closeIssue?.technicalDetails ?? createTechnicalDetails("WebSocket closed", {
                closeCode: event.code,
                closeReason: event.reason || null,
                endpointUrl: redactUrlForDisplay(validatedEndpoint),
                wasClean: event.wasClean,
              }),
              level: nextStatus === "error" ? "error" : "warning",
              message: closeIssue?.suggestion ?? closeMessage,
              title: closeIssue?.title ?? i18n.t("connection.toasts.closed"),
            });
          }

          useUiStore.getState().setComposerError(null);
        };

        nextSocket.onerror = () => {
          if (!isCurrentSocket(get(), nextSocket, session.id)) {
            detachSocketHandlers(nextSocket);
            return;
          }

          const issue = createUserFacingError("connectionFailure", i18n.t, {
            message: i18n.t("connection.errors.failed"),
            technicalDetails: createTechnicalDetails("WebSocket error event", {
              endpointUrl: redactUrlForDisplay(validatedEndpoint),
              readyState: nextSocket.readyState,
            }),
          });
          const message = issue.message;
          const failedAt = Date.now();

          cleanupSocket(nextSocket, 1011, "SocketLens connection error");

          set((state) => ({
            activeConnectionId: null,
            activeSessionId: null,
            connections: patchConnection(state.connections, connection.id, {
              error: message,
              status: "error",
              updatedAt: failedAt,
            }),
            error: message,
            errorDetails: issue.technicalDetails,
            isConnected: false,
            lastDisconnectReason: message,
            socket: state.socket === nextSocket ? null : state.socket,
            status: "error",
          }));
          useSessionStore.getState().updateSessionStatus(session.id, "error", { endedAt: failedAt });
          useUiStore.getState().addLog({
            connectionId: connection.id,
            level: "error",
            message,
            sessionId: session.id,
          });
          useUiStore.getState().addToast({
            details: issue.technicalDetails,
            level: "error",
            message: issue.suggestion,
            title: issue.title,
          });
        };
      },
      connectToConnection: async (connectionId) => {
        await get().connect({ connectionId });
      },
      connections: [],
      disconnect: () => {
        const { activeConnectionId, activeSessionId, socket } = get();
        const disconnectedAt = Date.now();

        if (socket) {
          cleanupSocket(socket, 1000, "Client disconnected");
        }

        if (activeSessionId) {
          useSessionStore.getState().updateSessionStatus(activeSessionId, "closed", {
            closeCode: 1000,
            closeReason: i18n.t("connection.close.clientDisconnected"),
            endedAt: disconnectedAt,
          });
        }

        set((state) => ({
          activeConnectionId: null,
          activeSessionId: null,
          connections: activeConnectionId
            ? patchConnection(state.connections, activeConnectionId, {
                error: null,
                status: "disconnected",
                updatedAt: disconnectedAt,
              })
            : state.connections,
          error: null,
          errorDetails: null,
          isConnected: false,
          lastDisconnectReason: socket ? i18n.t("connection.close.clientDisconnected") : state.lastDisconnectReason,
          socket: null,
          status: "disconnected",
        }));
        useUiStore.getState().addLog({
          connectionId: activeConnectionId,
          level: socket ? "info" : "debug",
          message: socket ? i18n.t("connection.logs.disconnectRequested") : i18n.t("connection.logs.disconnectNoSocket"),
          sessionId: activeSessionId,
        });
        useUiStore.getState().setComposerError(null);
      },
      dispose: (reason = i18n.t("app.logs.windowClosing")) => {
        const { activeConnectionId, activeSessionId, socket } = get();
        const disposedAt = Date.now();

        if (socket) {
          cleanupSocket(socket, 1001, "SocketLens closed");
        }

        if (activeSessionId) {
          useSessionStore.getState().updateSessionStatus(activeSessionId, "closed", {
            closeCode: 1001,
            closeReason: reason,
            endedAt: disposedAt,
          });
        }

        set((state) => ({
          activeConnectionId: null,
          activeSessionId: null,
          connections: activeConnectionId
            ? patchConnection(state.connections, activeConnectionId, {
                error: null,
                status: "disconnected",
                updatedAt: disposedAt,
              })
            : state.connections,
          error: null,
          errorDetails: null,
          isConnected: false,
          lastDisconnectReason: socket ? reason : state.lastDisconnectReason,
          socket: null,
          status: state.status === "idle" ? "idle" : "disconnected",
        }));

        if (socket || activeSessionId) {
          useUiStore.getState().addLog({
            connectionId: activeConnectionId,
            level: "debug",
            message: i18n.t("connection.logs.cleanupCompleted", { reason }),
            sessionId: activeSessionId,
          });
        }

        useUiStore.getState().setComposerError(null);
      },
      endpointUrl: localEchoServerUrl,
      error: null,
      errorDetails: null,
      isConnected: false,
      lastDisconnectReason: null,
      lastReconnectAttemptAt: null,
      reconnect: async (connectionId = null) => {
        const state = get();
        const nextConnectionId = connectionId ?? state.selectedConnectionId ?? state.activeConnectionId;
        const now = Date.now();

        if (!nextConnectionId) {
          const message = i18n.t("connection.errors.selectBeforeReconnect");
          useUiStore.getState().addLog({
            level: "warning",
            message,
          });
          useUiStore.getState().addToast({
            level: "warning",
            message,
            title: i18n.t("connection.toasts.reconnectUnavailable"),
          });
          return;
        }

        if (state.status === "connecting") {
          const message = i18n.t("connection.errors.connectAttemptInProgress");
          useUiStore.getState().addLog({
            connectionId: state.activeConnectionId,
            level: "warning",
            message,
            sessionId: state.activeSessionId,
          });
          useUiStore.getState().addToast({
            level: "warning",
            message,
            title: i18n.t("connection.toasts.reconnectRunning"),
          });
          return;
        }

        if (state.lastReconnectAttemptAt && now - state.lastReconnectAttemptAt < reconnectCooldownMs) {
          const message = i18n.t("connection.errors.reconnectCooldown");
          useUiStore.getState().addLog({
            connectionId: nextConnectionId,
            level: "debug",
            message,
          });
          useUiStore.getState().addToast({
            level: "warning",
            message,
            title: i18n.t("connection.toasts.reconnectDelayed"),
          });
          return;
        }

        set((current) => ({
          lastReconnectAttemptAt: now,
          reconnectAttempts: current.reconnectAttempts + 1,
        }));
        useUiStore.getState().addLog({
          connectionId: nextConnectionId,
          level: "debug",
          message: i18n.t("connection.logs.reconnectRequested"),
        });

        if (state.activeConnectionId === nextConnectionId && state.socket) {
          get().disconnect();
          await delay(120);
        }

        await get().connect({ connectionId: nextConnectionId });
      },
      reconnectAttempts: 0,
      registerConnection: (connection) =>
        set((state) => ({
          connections: upsertConnection(state.connections, connection),
          selectedConnectionId: connection.id,
        })),
      removeConnection: (connectionId) =>
        set((state) => ({
          activeConnectionId: state.activeConnectionId === connectionId ? null : state.activeConnectionId,
          connections: state.connections.filter((connection) => connection.id !== connectionId),
          selectedConnectionId: state.selectedConnectionId === connectionId ? null : state.selectedConnectionId,
        })),
      saveConnection: ({ endpointTemplate, endpointUrl, environmentId, environmentName, name }) => {
        const endpointTemplateCandidate = endpointTemplate ?? (hasEnvironmentVariables(endpointUrl) ? endpointUrl : null);
        const environment = getConnectionEnvironment(environmentId ?? null);
        const resolvedEndpoint = resolveConnectionEndpoint({
          endpointTemplate: endpointTemplateCandidate,
          endpointUrl,
          environment,
        });

        if (!resolvedEndpoint.ok) {
          const issue = createInvalidUrlError(resolvedEndpoint.message, resolvedEndpoint.technicalMessage);
          const message = issue.message;
          set({ error: message, errorDetails: issue.technicalDetails, lastDisconnectReason: message, status: "error" });
          useUiStore.getState().addLog({ level: "error", message });
          useUiStore.getState().addToast({
            details: issue.technicalDetails,
            level: "error",
            message: issue.suggestion,
            title: issue.title,
          });
          return null;
        }

        const validation = validateWebSocketUrl(resolvedEndpoint.endpointUrl);

        if (!validation.ok) {
          const issue = createInvalidUrlError(translateWebSocketValidationMessage(validation.message, i18n.t), validation.message);
          const message = issue.message;
          set({ error: message, errorDetails: issue.technicalDetails, lastDisconnectReason: message, status: "error" });
          useUiStore.getState().addLog({ level: "error", message });
          useUiStore.getState().addToast({
            details: issue.technicalDetails,
            level: "error",
            message: issue.suggestion,
            title: issue.title,
          });
          return null;
        }

        const now = Date.now();
        const environmentIdCandidate = environmentId ?? (endpointTemplateCandidate ? environment?.id ?? null : null);
        const environmentNameCandidate = environmentName ?? (endpointTemplateCandidate ? environment?.name ?? null : null);
        const existingConnection =
          get().connections.find(
            (connection) =>
              endpointTemplateCandidate &&
              connection.endpointTemplate === endpointTemplateCandidate &&
              connection.environmentId === environmentIdCandidate,
          ) ?? get().connections.find((connection) => connection.endpointUrl === validation.url);
        const connection: Connection = {
          ...(existingConnection ??
            createConnection({
              endpointUrl: validation.url,
              endpointTemplate: endpointTemplateCandidate,
              environmentId: environmentIdCandidate,
              environmentName: environmentNameCandidate,
              id: createEntityId(),
              now,
            })),
          endpointUrl: validation.url,
          endpointTemplate: endpointTemplateCandidate,
          environmentId: environmentIdCandidate,
          environmentName: environmentNameCandidate,
          error: null,
          name: getStableConnectionName(name, validation.url),
          status: existingConnection?.status ?? "idle",
          updatedAt: now,
        };

        set((state) => ({
          connections: upsertConnection(state.connections, connection),
          endpointUrl: validation.url,
          error: null,
          errorDetails: null,
          selectedConnectionId: connection.id,
          status: state.activeConnectionId ? state.status : "idle",
        }));
        useUiStore.getState().addLog({
          connectionId: connection.id,
          level: "success",
          message: i18n.t("connection.logs.saved", { name: connection.name }),
        });

        return connection;
      },
      selectedConnectionId: null,
      selectConnection: (connectionId) => {
        const connection = get().connections.find((item) => item.id === connectionId);

        if (!connection) {
          return;
        }

        set({
          endpointUrl: connection.transport === "demo" ? get().endpointUrl : connection.endpointUrl,
          error: connection.error,
          errorDetails: connection.error,
          selectedConnectionId: connection.id,
        });
      },
      sendMessage: (payload, options = {}) => {
        const { activeConnectionId, activeSessionId, socket } = get();
        const source = options.source ?? "manual";

        if (payload.trim().length === 0 || socket?.readyState !== socketOpen || !activeConnectionId || !activeSessionId) {
          const message = i18n.t("connection.errors.cannotSendUntilConnected");
          useUiStore.getState().addLog({
            connectionId: activeConnectionId,
            level: "warning",
            message,
            sessionId: activeSessionId,
          });
          useUiStore.getState().addToast({
            level: "warning",
            message,
            title: i18n.t("connection.toasts.frameNotSent"),
          });
          return null;
        }

        try {
          socket.send(payload);
        } catch (error) {
          const issue = createUserFacingError("connectionFailure", i18n.t, {
            message: getFriendlyErrorMessage(error, i18n.t("connection.errors.sendFrameFailed")),
            technicalDetails: createTechnicalDetails("WebSocket send failed", {
              endpointUrl: redactUrlForDisplay(getConnectionEndpoint(get().connections, activeConnectionId)),
              error: error instanceof Error ? error.message : String(error),
              source,
            }),
          });
          const message = issue.message;
          const failedAt = Date.now();

          cleanupSocket(socket, 1011, "SocketLens send error");

          set((state) => ({
            activeConnectionId: null,
            activeSessionId: null,
            connections: patchConnection(state.connections, activeConnectionId, {
              error: message,
              status: "error",
              updatedAt: failedAt,
            }),
            error: message,
            errorDetails: issue.technicalDetails,
            isConnected: false,
            lastDisconnectReason: message,
            socket: null,
            status: "error",
          }));
          useSessionStore.getState().updateSessionStatus(activeSessionId, "error", { endedAt: failedAt });
          useUiStore.getState().addLog({
            connectionId: activeConnectionId,
            level: "error",
            message,
            sessionId: activeSessionId,
          });
          useUiStore.getState().addToast({
            details: issue.technicalDetails,
            level: "error",
            message: issue.suggestion,
            title: issue.title,
          });
          return null;
        }

        const packet = createPacket({
          connectionId: activeConnectionId,
          direction: "outbound",
          payload,
          sendSource: source,
          sessionId: activeSessionId,
          sourcePacketId: source === "replay" ? (options.sourcePacketId ?? null) : null,
        });

        usePacketStore.getState().addPacket(packet);
        useSessionStore.getState().recordPacket(packet);
        useUiStore.getState().selectPacket(packet.id);
        useUiStore.getState().addReplayHistoryItem({
          connectionId: activeConnectionId,
          payload,
          payloadKind: packet.payloadKind,
          sessionId: activeSessionId,
          sizeBytes: packet.sizeBytes,
          source,
          sourcePacketId: options.sourcePacketId ?? null,
        });
        useUiStore.getState().setComposerError(null);

        if (options.clearDraft ?? true) {
          useUiStore.getState().setComposerDraft("");
        }

        useUiStore.getState().addLog({
          connectionId: activeConnectionId,
          level: source === "replay" ? "info" : "success",
          message:
            source === "replay"
              ? i18n.t("connection.logs.replayedFrame", { bytes: packet.sizeBytes })
              : i18n.t("connection.logs.sentFrame", { bytes: packet.sizeBytes }),
          sessionId: activeSessionId,
        });

        return packet;
      },
      setConnectionStatus: (connectionId, status, patch = {}) =>
        set((state) => ({
          connections: patchConnection(state.connections, connectionId, {
            ...patch,
            status,
            updatedAt: patch.updatedAt ?? Date.now(),
          }),
        })),
      setEndpointUrl: (endpointUrl) => {
        const connection = get().connections.find((item) => item.endpointUrl === endpointUrl.trim());

        set({
          endpointUrl,
          error: connection?.error ?? null,
          selectedConnectionId: connection?.id ?? null,
        });
      },
      socket: null,
      status: "idle",
    }),
    {
      name: "socketlens.connections.v1",
      partialize: (state): PersistedConnectionState => ({
        connections: useSettingsStore.getState().settings.privacy.persistRecentConnections
          ? state.connections.filter((connection) => connection.transport === "websocket").map(sanitizeConnection)
          : [],
        endpointUrl: state.endpointUrl,
        selectedConnectionId: useSettingsStore.getState().settings.privacy.persistRecentConnections
          ? state.selectedConnectionId
          : null,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PersistedConnectionState>;

        return {
          ...currentState,
          connections: (persisted.connections ?? []).map(sanitizeConnection),
          endpointUrl: persisted.endpointUrl ?? currentState.endpointUrl,
          selectedConnectionId: persisted.selectedConnectionId ?? null,
        };
      },
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

function getConnectionEnvironment(environmentId: EntityId | null): AppEnvironment | null {
  const environmentState = useEnvironmentStore.getState();

  if (environmentId) {
    const environment = environmentState.environments.find((item) => item.id === environmentId);

    if (environment) {
      return environment;
    }
  }

  return getActiveEnvironment(environmentState.environments, environmentState.activeEnvironmentId);
}

function resolveConnectionEndpoint({
  endpointTemplate,
  endpointUrl,
  environment,
}: {
  endpointTemplate?: string | null;
  endpointUrl: string;
  environment: AppEnvironment | null;
}): ResolvedConnectionEndpoint {
  const template = endpointTemplate?.trim() || endpointUrl.trim();

  if (!hasEnvironmentVariables(template)) {
    return {
      endpointUrl: template,
      ok: true,
    };
  }

  const interpolation = interpolateEnvironmentVariables(template, environment);

  if (!interpolation.ok) {
    const variables = interpolation.missingVariables.join(", ");
    const environmentName = environment?.name ?? i18n.t("common.notAvailable");

    return {
      message: i18n.t("environments.errors.missingVariables", { environment: environmentName, variables }),
      ok: false,
      technicalMessage: `Missing environment variables: ${variables}`,
    };
  }

  return {
    endpointUrl: interpolation.value,
    ok: true,
  };
}

function getOrCreateConnection(
  connections: Connection[],
  {
    endpointTemplate,
    endpointUrl,
    environmentId,
    environmentName,
    id,
    name,
    now,
  }: {
    endpointTemplate?: string | null;
    endpointUrl: string;
    environmentId?: EntityId | null;
    environmentName?: string | null;
    id?: EntityId;
    name?: string;
    now: number;
  },
) {
  const existingConnection =
    (id ? connections.find((connection) => connection.id === id) : null) ??
    (endpointTemplate
      ? connections.find(
          (connection) => connection.endpointTemplate === endpointTemplate && connection.environmentId === environmentId,
        )
      : null) ??
    connections.find((connection) => connection.endpointUrl === endpointUrl);

  if (existingConnection) {
    return {
      ...existingConnection,
      endpointUrl,
      endpointTemplate,
      environmentId,
      environmentName,
      name: getStableConnectionName(name ?? existingConnection.name, endpointUrl),
    };
  }

  return createConnection({
    endpointUrl,
    endpointTemplate,
    environmentId,
    environmentName,
    id: id ?? createEntityId(),
    name: getStableConnectionName(name, endpointUrl),
    now,
  });
}

function getStableConnectionName(name: string | undefined, endpointUrl: string) {
  const trimmedName = name?.trim();

  return trimmedName && trimmedName.length > 0 ? trimmedName : getConnectionName(endpointUrl);
}

function createInvalidUrlError(message: string, technicalMessage: string): UserFacingError {
  return createUserFacingError("invalidUrl", i18n.t, {
    message,
    technicalDetails: createTechnicalDetails("WebSocket URL validation failed", {
      validationMessage: technicalMessage,
    }),
  });
}

function getConnectionEndpoint(connections: Connection[], connectionId: EntityId) {
  return connections.find((connection) => connection.id === connectionId)?.endpointUrl ?? "unknown";
}

function upsertConnection(connections: Connection[], connection: Connection) {
  return [connection, ...connections.filter((item) => item.id !== connection.id)].slice(0, 20);
}

function patchConnection(connections: Connection[], connectionId: EntityId, patch: Partial<Connection>) {
  return connections.map((connection) =>
    connection.id === connectionId
      ? {
          ...connection,
          ...patch,
        }
      : connection,
  );
}

function sanitizeConnection(connection: Connection): Connection {
  const nextStatus: ConnectionStatus =
    connection.status === "connected" || connection.status === "connecting" ? "disconnected" : connection.status;

  return {
    ...connection,
    endpointTemplate: connection.endpointTemplate ?? null,
    environmentId: connection.environmentId ?? null,
    environmentName: connection.environmentName ?? null,
    error: nextStatus === "error" ? connection.error : null,
    status: nextStatus,
    transport: connection.transport === "demo" ? "demo" : "websocket",
  };
}

async function normalizeMessage(data: string | Blob | ArrayBuffer): Promise<NormalizedSocketMessage> {
  if (typeof data === "string") {
    return {
      payload: data,
      payloadKind: inferPayloadKind(data),
    };
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return {
      payload: await data.text(),
      payloadKind: "binary",
    };
  }

  if (data instanceof ArrayBuffer) {
    return {
      payload: new TextDecoder().decode(data),
      payloadKind: "binary",
    };
  }

  const payload = String(data);

  return {
    payload,
    payloadKind: inferPayloadKind(payload),
  };
}

function isLiveSocket(socket: WebSocket | null) {
  return socket?.readyState === socketOpen || socket?.readyState === socketConnecting;
}

function isCurrentSocket(state: ConnectionStore, socket: WebSocket, sessionId: EntityId) {
  return state.socket === socket && state.activeSessionId === sessionId;
}

function cleanupSocket(socket: WebSocket, code = 1000, reason = "SocketLens cleanup") {
  detachSocketHandlers(socket);
  closeSocket(socket, code, reason);
}

function detachSocketHandlers(socket: WebSocket) {
  socket.onopen = null;
  socket.onmessage = null;
  socket.onclose = null;
  socket.onerror = null;
}

function closeSocket(socket: WebSocket, code: number, reason: string) {
  if (socket.readyState === socketClosed || socket.readyState === socketClosing) {
    return;
  }

  try {
    if (socket.readyState === socketConnecting) {
      socket.close();
      return;
    }

    socket.close(code, reason);
  } catch (error) {
    useUiStore.getState().addLog({
      level: "debug",
      message: getFriendlyErrorMessage(error, "Socket cleanup close call failed."),
    });
  }
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
