import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Cable,
  Database,
  Download,
  Eraser,
  Filter,
  History,
  Play,
  RefreshCw,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Unplug,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { CommandPalette, type CommandPaletteCommand } from "@/components/command-palette";
import { AppShell } from "@/components/layout/app-shell";
import { InvestorDemoGuide } from "@/components/investor-demo-panel";
import { LogPanel } from "@/components/log-panel";
import { OnboardingPanel } from "@/components/onboarding-panel";
import { PacketTimeline } from "@/components/packet-timeline";
import { PayloadInspector } from "@/components/payload-inspector";
import { SettingsPage } from "@/components/settings-page";
import { Sidebar } from "@/components/sidebar";
import { ToastViewport } from "@/components/toast-viewport";
import { TopBar } from "@/components/top-bar";
import { localEchoServerUrl } from "@/config/runtime-defaults";
import { getWebSocketReadyStateLabel } from "@/lib/friendly-errors";
import { createDemoPayload } from "@/dev/demo-payload";
import { demoStreamEndpointUrl, startDemoStream, stopDemoStream } from "@/demo/demo-stream";
import {
  investorDemoEndpointUrl,
  resetInvestorDemo,
  startInvestorDemo,
  stopInvestorDemo,
} from "@/demo/investor-demo";
import {
  createExportFile,
  socketLensPacketExportAdapter,
  socketLensSessionExportAdapter,
} from "@/extensions";
import {
  loadSocketLensFileFromBrowserFile,
  loadSocketLensFileFromTauriDialog,
  saveSocketLensFile,
} from "@/lib/session-file-storage";
import { registerProxyEventListeners, type ProxyPacketEvent } from "@/lib/proxy-events";
import { createTechnicalDetails, createUserFacingError, type UserFacingError } from "@/lib/user-facing-errors";
import { translateWebSocketValidationMessage } from "@/lib/validation-messages";
import {
  getBackendStatus,
  startProxy,
  stopProxy,
  type NativeCommandError,
  type NativeBackendState,
  type ProxyStatus,
} from "@/lib/tauri-commands";
import { getJsonCommand } from "@/lib/json-payload";
import { filterPackets } from "@/models";
import {
  addSocketLensRedactionMetadata,
  createImportedSessionSnapshot,
  createSocketLensRedactionMetadata,
  getActiveEnvironment,
  hasEnvironmentVariables,
  interpolateEnvironmentVariables,
  type Packet,
  redactSessionForExport,
  redactEnvironmentSecrets,
  type Session,
  type SessionRedactionOptions,
  type SessionRedactionSummary,
  getSocketLensFileLabel,
  type SocketLensImportableFile,
  validateWebSocketUrl,
} from "@/models";
import { useConnectionStore } from "@/store/connection-store";
import { useEnvironmentStore } from "@/store/environment-store";
import { usePacketStore } from "@/store/packet-store";
import { useSessionStore } from "@/store/session-store";
import { useSettingsStore } from "@/store/settings-store";
import { useUiStore } from "@/store/ui-store";

type AppView = "settings" | "workspace";
type SessionFileActionOptions = {
  redaction?: SessionRedactionOptions;
};

function addRedactionMetadataIfNeeded<File extends SocketLensImportableFile>(
  file: File,
  summary: SessionRedactionSummary,
) {
  return summary.applied
    ? addSocketLensRedactionMetadata(file, createSocketLensRedactionMetadata(summary))
    : file;
}

export function App() {
  const { i18n, t } = useTranslation();
  const backendStatusCheckedRef = useRef(false);
  const [nativeBackendState, setNativeBackendState] = useState<NativeBackendState>("checking");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>("workspace");
  const [diagnosticsOpenSignal, setDiagnosticsOpenSignal] = useState(0);
  const [proxyBusy, setProxyBusy] = useState(false);
  const [proxyError, setProxyError] = useState<UserFacingError | null>(null);
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus | null>(null);
  const [proxyTargetUrl, setProxyTargetUrl] = useState(localEchoServerUrl);
  const {
    activeConnectionId,
    activeSessionId,
    connect,
    connectToConnection,
    connections,
    disconnect,
    dispose,
    endpointUrl,
    error,
    errorDetails,
    isConnected,
    lastDisconnectReason,
    lastReconnectAttemptAt,
    reconnect,
    reconnectAttempts,
    saveConnection,
    selectConnection,
    selectedConnectionId,
    sendMessage,
    socket,
    status,
  } = useConnectionStore();
  const { addPacket, addPackets, clearPackets, packets, updatePacketAnnotations } = usePacketStore();
  const { importSession, renameSession, sessions, updateSessionStatus, recordPacket } = useSessionStore();
  const activeEnvironmentId = useEnvironmentStore((state) => state.activeEnvironmentId);
  const environments = useEnvironmentStore((state) => state.environments);
  const setActiveEnvironment = useEnvironmentStore((state) => state.setActiveEnvironment);
  const settings = useSettingsStore((state) => state.settings);
  const {
    addLog,
    addToast,
    clearLogs,
    clearReplayHistory,
    composerError,
    composerDraft,
    composerMode,
    demoMode,
    filterState,
    investorDemo,
    logs,
    replayHistory,
    resetFilters,
    selectLatestPacket,
    selectPacket,
    selectSession,
    selectedPacketId,
    selectedSessionId,
    setComposerError,
    setComposerDraft,
    setComposerMode,
    dismissToast,
    toasts,
    updateFilterState,
  } = useUiStore();

  const visiblePackets = useMemo(() => filterPackets(packets, filterState), [filterState, packets]);
  const outgoingPackets = useMemo(() => packets.filter((packet) => packet.direction === "outbound"), [packets]);
  const currentSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null,
    [selectedSessionId, sessions],
  );
  const currentSessionPackets = useMemo(
    () => (currentSession ? packets.filter((packet) => packet.sessionId === currentSession.id) : []),
    [currentSession, packets],
  );
  const scopedPacketCount = useMemo(
    () => (selectedSessionId ? packets.filter((packet) => packet.sessionId === selectedSessionId).length : packets.length),
    [packets, selectedSessionId],
  );
  const selectedPacket = packets.find((packet) => packet.id === selectedPacketId) ?? null;
  const proxyPacketCount = useMemo(
    () => packets.filter((packet) => packet.sessionId.startsWith("proxy-session-")).length,
    [packets],
  );
  const investorDemoPacketCount = useMemo(
    () => (investorDemo.sessionId ? packets.filter((packet) => packet.sessionId === investorDemo.sessionId).length : 0),
    [investorDemo.sessionId, packets],
  );
  const outgoingPingPacket = useMemo(
    () => outgoingPackets.find((packet) => getJsonCommand(packet.payload) === "ping") ?? null,
    [outgoingPackets],
  );
  const activeDemoEndpointUrl = investorDemo.isActive ? investorDemoEndpointUrl : demoStreamEndpointUrl;
  const showInvestorDemoGuide =
    investorDemo.isActive || (currentSession?.endpointUrl === investorDemoEndpointUrl && investorDemoPacketCount > 0);
  const showOnboardingPanel =
    settings.onboarding.dismissedAt === null && !investorDemo.isActive && !demoMode.isActive && !isConnected && status !== "connecting";
  const canStartInvestorDemo = !demoMode.isActive && !isConnected && status !== "connecting";
  const diagnostics = useMemo(
    () => ({
      activeSessionId,
      backendState: nativeBackendState,
      endpointUrl: demoMode.isActive ? activeDemoEndpointUrl : endpointUrl,
      lastDisconnectReason,
      lastError: error ?? proxyError?.message ?? null,
      lastErrorDetails: errorDetails ?? proxyError?.technicalDetails ?? null,
      lastReconnectAttemptAt,
      mode: demoMode.isActive ? ("demo" as const) : proxyStatus?.isRunning ? ("proxy" as const) : ("direct" as const),
      proxyActiveConnections: proxyStatus?.activeConnections ?? 0,
      proxyPacketCount,
      reconnectAttempts,
      selectedSessionId,
      socketReadyState: getWebSocketReadyStateLabel(socket?.readyState),
      status: investorDemo.isActive
        ? t("status.investorDemo")
        : demoMode.isActive
          ? t("status.demo")
          : proxyStatus?.isRunning
            ? t("sidebar.proxy")
            : t(`status.${status}`, status),
    }),
    [
      activeSessionId,
      activeDemoEndpointUrl,
      demoMode.isActive,
      endpointUrl,
      error,
      errorDetails,
      lastDisconnectReason,
      lastReconnectAttemptAt,
      nativeBackendState,
      proxyError,
      proxyPacketCount,
      proxyStatus?.activeConnections,
      proxyStatus?.isRunning,
      reconnectAttempts,
      selectedSessionId,
      socket?.readyState,
      status,
      investorDemo.isActive,
      t,
    ],
  );
  const proxyRunningRef = useRef(false);
  const commandPaletteCommands = useMemo<CommandPaletteCommand[]>(() => {
    const activeReconnectConnectionId = activeConnectionId ?? selectedConnectionId;
    const demoIsRunning = demoMode.isActive || investorDemo.isActive;
    const startDemoDisabledReason =
      demoIsRunning
        ? t("commandPalette.disabled.demoRunning")
        : isConnected
          ? t("commandPalette.disabled.disconnectFirst")
          : status === "connecting"
            ? t("commandPalette.disabled.connectionBusy")
            : undefined;
    const connectDisabledReason =
      demoIsRunning
        ? t("commandPalette.disabled.stopDemoFirst")
        : isConnected
          ? t("commandPalette.disabled.alreadyConnected")
          : status === "connecting"
            ? t("commandPalette.disabled.connectionBusy")
            : undefined;
    const disconnectDisabledReason =
      isConnected || status === "connecting" ? undefined : t("commandPalette.disabled.noActiveConnection");
    const reconnectDisabledReason =
      demoIsRunning
        ? t("commandPalette.disabled.stopDemoFirst")
        : status === "connecting"
          ? t("commandPalette.disabled.connectionBusy")
          : activeReconnectConnectionId
            ? undefined
            : t("commandPalette.disabled.noSavedConnection");
    const replayDisabledReason = !selectedPacket
      ? t("commandPalette.disabled.selectPacket")
      : !isConnected
        ? t("commandPalette.disabled.connectFirst")
        : undefined;
    const sessionExportDisabledReason = currentSession ? undefined : t("commandPalette.disabled.noSession");
    const clearTimelineDisabledReason = scopedPacketCount > 0 ? undefined : t("commandPalette.disabled.noPackets");

    const commands: CommandPaletteCommand[] = [
      {
        description: t("commandPalette.actions.startDemo.description"),
        disabled: Boolean(startDemoDisabledReason),
        disabledReason: startDemoDisabledReason,
        group: t("commandPalette.groups.workspace"),
        icon: Play,
        id: "workspace:start-demo",
        keywords: ["demo", "investor", "offline"],
        run: handleStartInvestorDemo,
        title: t("commandPalette.actions.startDemo.title"),
      },
      {
        description: t("commandPalette.actions.openSettings.description"),
        group: t("commandPalette.groups.workspace"),
        icon: Settings,
        id: "workspace:open-settings",
        keywords: ["preferences", "settings"],
        run: () => setCurrentView("settings"),
        title: t("commandPalette.actions.openSettings.title"),
      },
      {
        description: t("commandPalette.actions.openDiagnostics.description"),
        group: t("commandPalette.groups.workspace"),
        icon: SlidersHorizontal,
        id: "workspace:open-diagnostics",
        keywords: ["debug", "health", "status"],
        run: () => {
          setCurrentView("workspace");
          setDiagnosticsOpenSignal((value) => value + 1);
        },
        title: t("commandPalette.actions.openDiagnostics.title"),
      },
      {
        description: t("commandPalette.actions.connect.description"),
        disabled: Boolean(connectDisabledReason),
        disabledReason: connectDisabledReason,
        group: t("commandPalette.groups.connection"),
        icon: Cable,
        id: "connection:connect",
        keywords: ["websocket", "direct", "socket"],
        run: handleConnect,
        title: t("commandPalette.actions.connect.title"),
      },
      {
        description: t("commandPalette.actions.disconnect.description"),
        disabled: Boolean(disconnectDisabledReason),
        disabledReason: disconnectDisabledReason,
        group: t("commandPalette.groups.connection"),
        icon: Unplug,
        id: "connection:disconnect",
        keywords: ["close", "stop"],
        run: disconnect,
        title: t("commandPalette.actions.disconnect.title"),
      },
      {
        description: t("commandPalette.actions.reconnect.description"),
        disabled: Boolean(reconnectDisabledReason),
        disabledReason: reconnectDisabledReason,
        group: t("commandPalette.groups.connection"),
        icon: RefreshCw,
        id: "connection:reconnect",
        keywords: ["retry", "restart"],
        run: () => {
          void reconnect(activeReconnectConnectionId);
        },
        title: t("commandPalette.actions.reconnect.title"),
      },
    ];

    commands.push(
      ...environments.map((environment) => ({
        description: t("commandPalette.actions.switchEnvironment.description", { name: environment.name }),
        disabled: environment.id === activeEnvironmentId,
        disabledReason:
          environment.id === activeEnvironmentId ? t("commandPalette.disabled.environmentActive") : undefined,
        group: t("commandPalette.groups.environments"),
        icon: Database,
        id: `environment:${environment.id}`,
        keywords: ["environment", "variables", environment.name],
        run: () => setActiveEnvironment(environment.id),
        title: t("commandPalette.actions.switchEnvironment.title", { name: environment.name }),
      })),
    );

    if (sessions.length === 0) {
      commands.push({
        description: t("commandPalette.actions.switchSession.emptyDescription"),
        disabled: true,
        disabledReason: t("commandPalette.disabled.noSessions"),
        group: t("commandPalette.groups.sessions"),
        icon: History,
        id: "session:none",
        keywords: ["session"],
        run: () => undefined,
        title: t("commandPalette.actions.switchSession.emptyTitle"),
      });
    } else {
      commands.push(
        ...sessions.map((session) => ({
          description: t("commandPalette.actions.switchSession.description", { name: session.name }),
          disabled: session.id === selectedSessionId,
          disabledReason: session.id === selectedSessionId ? t("commandPalette.disabled.sessionActive") : undefined,
          group: t("commandPalette.groups.sessions"),
          icon: History,
          id: `session:${session.id}`,
          keywords: ["session", session.name, session.endpointUrl],
          run: () => {
            setCurrentView("workspace");
            handleSelectSession(session.id);
          },
          title: t("commandPalette.actions.switchSession.title", { name: session.name }),
        })),
      );
    }

    commands.push(
      {
        description: t("commandPalette.actions.toggleBookmark.description"),
        disabled: Boolean(!selectedPacket),
        disabledReason: selectedPacket ? undefined : t("commandPalette.disabled.selectPacket"),
        group: t("commandPalette.groups.packets"),
        icon: Bookmark,
        id: "packets:toggle-bookmark",
        keywords: ["bookmark", "note", "tag", "packet"],
        run: () => {
          if (!selectedPacket) {
            return;
          }

          updatePacketAnnotations(selectedPacket.id, {
            bookmarked: !(selectedPacket.annotations?.bookmarked ?? false),
          });
        },
        title: selectedPacket?.annotations?.bookmarked
          ? t("commandPalette.actions.toggleBookmark.removeTitle")
          : t("commandPalette.actions.toggleBookmark.title"),
      },
      {
        description: t("commandPalette.actions.replaySelected.description"),
        disabled: Boolean(replayDisabledReason),
        disabledReason: replayDisabledReason,
        group: t("commandPalette.groups.packets"),
        icon: RotateCcw,
        id: "packets:replay-selected",
        keywords: ["replay", "send", "packet"],
        run: () => {
          if (!selectedPacket) {
            return;
          }

          handleSendPayload(selectedPacket.payload, {
            clearDraft: false,
            source: "replay",
            sourcePacketId: selectedPacket.id,
          });
        },
        title: t("commandPalette.actions.replaySelected.title"),
      },
      {
        description: t("commandPalette.actions.clearTimeline.description"),
        disabled: Boolean(clearTimelineDisabledReason),
        disabledReason: clearTimelineDisabledReason,
        group: t("commandPalette.groups.packets"),
        icon: Eraser,
        id: "packets:clear-timeline",
        keywords: ["clear", "timeline", "packets"],
        run: handleClearCapturedFrames,
        title: t("commandPalette.actions.clearTimeline.title"),
      },
      {
        description: t("commandPalette.actions.exportSession.description"),
        disabled: Boolean(sessionExportDisabledReason),
        disabledReason: sessionExportDisabledReason,
        group: t("commandPalette.groups.packets"),
        icon: Download,
        id: "packets:export-session",
        keywords: ["export", "save", "session", "json"],
        run: () => {
          if (currentSession) {
            void handleSaveCurrentSession(currentSession.name);
          }
        },
        title: t("commandPalette.actions.exportSession.title"),
      },
      {
        description: t("commandPalette.actions.resetFilters.description"),
        group: t("commandPalette.groups.filters"),
        icon: Filter,
        id: "filters:reset",
        keywords: ["filter", "all"],
        run: resetFilters,
        title: t("commandPalette.actions.resetFilters.title"),
      },
      {
        description: t("commandPalette.actions.incomingFilter.description"),
        group: t("commandPalette.groups.filters"),
        icon: Filter,
        id: "filters:incoming",
        keywords: ["incoming", "inbound", "filter"],
        run: () => updateFilterState({ direction: filterState.direction === "inbound" ? "all" : "inbound" }),
        title: t("commandPalette.actions.incomingFilter.title"),
      },
      {
        description: t("commandPalette.actions.outgoingFilter.description"),
        group: t("commandPalette.groups.filters"),
        icon: Filter,
        id: "filters:outgoing",
        keywords: ["outgoing", "outbound", "filter"],
        run: () => updateFilterState({ direction: filterState.direction === "outbound" ? "all" : "outbound" }),
        title: t("commandPalette.actions.outgoingFilter.title"),
      },
      {
        description: t("commandPalette.actions.jsonFilter.description"),
        group: t("commandPalette.groups.filters"),
        icon: Filter,
        id: "filters:json",
        keywords: ["json", "filter"],
        run: () => updateFilterState({ payloadKind: filterState.payloadKind === "json" ? "all" : "json" }),
        title: t("commandPalette.actions.jsonFilter.title"),
      },
      {
        description: t("commandPalette.actions.errorsFilter.description"),
        group: t("commandPalette.groups.filters"),
        icon: Filter,
        id: "filters:errors",
        keywords: ["errors", "warning", "filter"],
        run: () => updateFilterState({ errorsOnly: !filterState.errorsOnly }),
        title: t("commandPalette.actions.errorsFilter.title"),
      },
      {
        description: t("commandPalette.actions.pingPongFilter.description"),
        group: t("commandPalette.groups.filters"),
        icon: Filter,
        id: "filters:hide-ping-pong",
        keywords: ["ping", "pong", "heartbeat", "filter"],
        run: () => updateFilterState({ hidePingPong: !filterState.hidePingPong }),
        title: t("commandPalette.actions.pingPongFilter.title"),
      },
    );

    return commands;
  }, [
    activeConnectionId,
    activeEnvironmentId,
    currentSession,
    demoMode.isActive,
    disconnect,
    environments,
    filterState.direction,
    filterState.errorsOnly,
    filterState.hidePingPong,
    filterState.payloadKind,
    investorDemo.isActive,
    isConnected,
    reconnect,
    resetFilters,
    scopedPacketCount,
    selectedConnectionId,
    selectedPacket,
    selectedSessionId,
    sessions,
    setActiveEnvironment,
    status,
    t,
    updateFilterState,
    updatePacketAnnotations,
  ]);

  useEffect(() => {
    document.documentElement.lang = settings.language;

    if (i18n.language !== settings.language) {
      void i18n.changeLanguage(settings.language);
    }
  }, [i18n, settings.language]);

  useEffect(() => {
    proxyRunningRef.current = proxyStatus?.isRunning ?? false;
  }, [proxyStatus?.isRunning]);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyThemePreference() {
      const resolvedTheme = settings.theme === "system" ? (mediaQuery.matches ? "dark" : "light") : settings.theme;

      root.dataset.theme = resolvedTheme;
      root.dataset.themePreference = settings.theme;
      root.dataset.density = settings.compactMode ? "compact" : "comfortable";
    }

    applyThemePreference();
    mediaQuery.addEventListener("change", applyThemePreference);

    return () => mediaQuery.removeEventListener("change", applyThemePreference);
  }, [settings.compactMode, settings.theme]);

  useEffect(() => {
    if (backendStatusCheckedRef.current) {
      return;
    }

    backendStatusCheckedRef.current = true;

    void getBackendStatus().then((result) => {
      if (result.ok) {
        setNativeBackendState("ready");
        setProxyStatus(result.data.proxy);
        addLog({
          level: "info",
          message: t("app.logs.nativeReady", {
            mode: t(result.data.proxy.mode === "proxy" ? "sidebar.proxy" : "status.notConfigured"),
            version: result.data.health.version,
          }),
        });
        return;
      }

      const nativeIssue = getProxyCommandError(result.error, t);
      const message =
        result.error.code === "tauri_unavailable"
          ? t("app.logs.browserDevMode")
          : t("app.logs.nativeCheckFailed", { error: nativeIssue.message });
      addLog({
        level: result.error.code === "tauri_unavailable" ? "info" : "warning",
        message,
      });
      if (result.error.code !== "tauri_unavailable") {
        addToast({
          details: nativeIssue.technicalDetails,
          level: "warning",
          message: nativeIssue.suggestion,
          title: nativeIssue.title,
        });
      }
      setNativeBackendState(result.error.code === "tauri_unavailable" ? "unavailable" : "error");
    });
  }, [addLog, addToast, t]);

  useEffect(() => {
    function handlePacketBookmarkShortcut(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.key.toLowerCase() !== "b") {
        return;
      }

      if (isEditableTarget(event.target) || !selectedPacket) {
        return;
      }

      event.preventDefault();
      updatePacketAnnotations(selectedPacket.id, {
        bookmarked: !(selectedPacket.annotations?.bookmarked ?? false),
      });
    }

    window.addEventListener("keydown", handlePacketBookmarkShortcut);

    return () => window.removeEventListener("keydown", handlePacketBookmarkShortcut);
  }, [selectedPacket, updatePacketAnnotations]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    addLog({
      level: "debug",
      message: t("app.logs.registeringProxyListeners"),
    });

    void registerProxyEventListeners({
      onLog: (event) => {
        addLog({
          connectionId: event.connectionId,
          level: event.level,
          message: event.message,
          sessionId: event.sessionId,
          timestamp: event.timestamp,
        });
      },
      onPacket: (event) => {
        const packet = createPacketFromProxyEvent(event);

        addPacket(packet);
        recordPacket(packet);

        if (useSettingsStore.getState().settings.autoSelectLatestPacket) {
          selectLatestPacket(packet.id);
        }
      },
      onSessionClosed: (event) => {
        updateSessionStatus(event.sessionId, event.status, {
          closeReason: event.closeReason,
          endedAt: event.endedAt,
        });
        setProxyStatus((currentStatus) =>
          currentStatus
            ? {
                ...currentStatus,
                activeConnections: Math.max(currentStatus.activeConnections - 1, 0),
              }
            : currentStatus,
        );
      },
      onSessionStarted: (event) => {
        const session: Session = {
          bytesReceived: 0,
          bytesSent: 0,
          closeCode: null,
          closeReason: null,
          connectionId: event.connectionId,
          createdAt: event.startedAt,
          endedAt: null,
          endpointUrl: event.targetUrl,
          id: event.sessionId,
          name: `Proxy ${event.targetUrl}`,
          packetsReceived: 0,
          packetsSent: 0,
          startedAt: event.startedAt,
          status: "connected",
        };

        importSession(session);
        selectSession(event.sessionId);
        setProxyStatus((currentStatus) =>
          currentStatus
            ? {
                ...currentStatus,
                activeConnections: currentStatus.activeConnections + 1,
                listenUrl: event.localProxyUrl,
                targetUrl: event.targetUrl,
              }
            : currentStatus,
        );
      },
    })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }

        cleanup = unlisten;
        addLog({
          level: "debug",
          message: t("app.logs.proxyListenersRegistered"),
        });
      })
      .catch((error: unknown) => {
        if (disposed) {
          return;
        }

        const issue = createUserFacingError("backendUnavailable", t, {
          message: t("app.logs.nativeCheckFailed", {
            error: error instanceof Error ? error.message : String(error),
          }),
          technicalDetails: createTechnicalDetails("Proxy event listener registration failed", {
            error: error instanceof Error ? error.message : String(error),
          }),
          title: t("app.toasts.nativeUnavailable"),
        });

        setNativeBackendState("error");
        addLog({
          level: "warning",
          message: issue.message,
        });
        addToast({
          details: issue.technicalDetails,
          level: "warning",
          message: issue.suggestion,
          title: issue.title,
        });
      });

    return () => {
      disposed = true;
      cleanup?.();
      addLog({
        level: "debug",
        message: t("app.logs.proxyListenersCleaned"),
      });
    };
  }, [addLog, addPacket, importSession, recordPacket, selectLatestPacket, selectSession, t, updateSessionStatus]);

  useEffect(() => {
    function cleanupBeforeClose() {
      dispose(t("app.logs.windowClosing"));
      stopInvestorDemo();
      stopDemoStream();

      if (proxyRunningRef.current) {
        void stopProxy();
      }

      useUiStore.getState().addLog({
        level: "debug",
        message: t("app.logs.shutdownCleanup"),
      });
    }

    window.addEventListener("beforeunload", cleanupBeforeClose);
    window.addEventListener("pagehide", cleanupBeforeClose);

    return () => {
      window.removeEventListener("beforeunload", cleanupBeforeClose);
      window.removeEventListener("pagehide", cleanupBeforeClose);
    };
  }, [dispose, t]);

  useEffect(() => {
    if (visiblePackets.length === 0) {
      if (selectedPacketId !== null) {
        selectPacket(null);
      }

      return;
    }

    if (selectedPacketId && !visiblePackets.some((packet) => packet.id === selectedPacketId)) {
      selectPacket(visiblePackets[0]?.id ?? null);
    }
  }, [selectPacket, selectedPacketId, visiblePackets]);

  function handleConnect() {
    void connect();
  }

  function handleStartInvestorDemo() {
    setCurrentView("workspace");
    startInvestorDemo();
  }

  function handleConnectLocalEcho() {
    if (demoMode.isActive || investorDemo.isActive || isConnected || status === "connecting") {
      return;
    }

    const connection = saveConnection({
      endpointUrl: localEchoServerUrl,
      name: t("onboarding.echoConnectionName"),
    });

    if (connection) {
      void connectToConnection(connection.id);
    }
  }

  function handleSendPing() {
    sendMessage(JSON.stringify({ command: "ping" }), {
      clearDraft: false,
      source: "manual",
    });
  }

  function handleReplayPing() {
    if (!outgoingPingPacket) {
      return;
    }

    sendMessage(outgoingPingPacket.payload, {
      clearDraft: false,
      source: "replay",
      sourcePacketId: outgoingPingPacket.id,
    });
  }

  function handleResetInvestorDemo() {
    setCurrentView("workspace");
    resetInvestorDemo();
  }

  function handleStopDemo() {
    if (useUiStore.getState().investorDemo.isActive) {
      stopInvestorDemo();
      return;
    }

    stopDemoStream();
  }

  function handleCreateConnection({
    connectNow,
    endpointUrl: nextEndpointUrl,
    endpointTemplate,
    environmentId,
    environmentName,
    name,
  }: {
    connectNow: boolean;
    endpointUrl: string;
    endpointTemplate?: string | null;
    environmentId?: string | null;
    environmentName?: string | null;
    name: string;
  }) {
    const connection = saveConnection({
      endpointUrl: nextEndpointUrl,
      endpointTemplate,
      environmentId,
      environmentName,
      name,
    });

    if (!connection) {
      return false;
    }

    if (connectNow) {
      void connectToConnection(connection.id);
    }

    return true;
  }

  function handleSelectSession(sessionId: string) {
    selectSession(sessionId);
    selectPacket(packets.find((packet) => packet.sessionId === sessionId)?.id ?? null);
  }

  function handleClearCapturedFrames() {
    clearPackets(selectedSessionId);
    selectPacket(null);
    addLog({
      level: "info",
      message: selectedSessionId ? t("app.logs.framesClearedForSession") : t("app.logs.framesCleared"),
      sessionId: selectedSessionId,
    });
  }

  function handleLoadSamplePayload() {
    setComposerDraft(createDemoPayload());
    setComposerMode("json");
    setComposerError(null);
  }

  async function handleStartProxy() {
    const environmentState = useEnvironmentStore.getState();
    const activeEnvironment = getActiveEnvironment(environmentState.environments, environmentState.activeEnvironmentId);
    const proxyTargetTemplate = proxyTargetUrl.trim();
    const proxyInterpolation =
      activeEnvironment && hasEnvironmentVariables(proxyTargetTemplate)
        ? interpolateEnvironmentVariables(proxyTargetTemplate, activeEnvironment)
        : null;

    if (proxyInterpolation && !proxyInterpolation.ok) {
      const message = t("environments.errors.missingVariables", {
        environment: activeEnvironment?.name ?? t("common.notAvailable"),
        variables: proxyInterpolation.missingVariables.join(", "),
      });
      const issue = createUserFacingError("invalidUrl", t, {
        message,
        technicalDetails: createTechnicalDetails("Proxy target URL environment interpolation failed", {
          environmentId: activeEnvironment?.id ?? null,
          missingVariables: proxyInterpolation.missingVariables,
        }),
      });

      setProxyError(issue);
      addToast({
        details: issue.technicalDetails,
        level: "error",
        message: issue.suggestion,
        title: issue.title,
      });
      return;
    }

    const resolvedProxyTargetUrl = proxyInterpolation?.value ?? proxyTargetTemplate;
    const validation = validateWebSocketUrl(resolvedProxyTargetUrl);

    if (!validation.ok) {
      const message = translateWebSocketValidationMessage(validation.message, t);
      const issue = createUserFacingError("invalidUrl", t, {
        message,
        technicalDetails: createTechnicalDetails("Proxy target URL validation failed", {
          targetUrl: activeEnvironment ? redactEnvironmentSecrets(resolvedProxyTargetUrl, activeEnvironment) : resolvedProxyTargetUrl,
          template: proxyInterpolation ? proxyTargetTemplate : null,
          validationMessage: validation.message,
        }),
      });

      setProxyError(issue);
      addToast({
        details: issue.technicalDetails,
        level: "error",
        message: issue.suggestion,
        title: issue.title,
      });
      return;
    }

    setProxyBusy(true);
    setProxyError(null);

    const result = await startProxy({ targetUrl: validation.url });

    setProxyBusy(false);

    if (!result.ok) {
      const issue = getProxyCommandError(result.error, t);

      setNativeBackendState(result.error.code === "tauri_unavailable" ? "unavailable" : "error");
      setProxyError(issue);
      addLog({
        level: result.error.code === "tauri_unavailable" ? "warning" : "error",
        message: issue.message,
      });
      addToast({
        details: issue.technicalDetails,
        level: result.error.code === "tauri_unavailable" ? "warning" : "error",
        message: issue.suggestion,
        title: issue.title,
      });
      return;
    }

    setNativeBackendState("ready");
    setProxyStatus(result.data);
    setProxyTargetUrl(proxyInterpolation ? proxyTargetTemplate : result.data.targetUrl ?? validation.url);
    addLog({
      level: "success",
      message: t("proxy.logs.started", { url: result.data.listenUrl ?? t("proxy.localListener") }),
    });
    addToast({
      level: "success",
      message: result.data.listenUrl ?? t("proxy.localListenerRunning"),
      title: t("proxy.toasts.started"),
    });
  }

  async function handleStopProxy() {
    setProxyBusy(true);
    setProxyError(null);

    const result = await stopProxy();

    setProxyBusy(false);

    if (!result.ok) {
      const issue = getProxyCommandError(result.error, t);

      setNativeBackendState(result.error.code === "tauri_unavailable" ? "unavailable" : "error");
      setProxyError(issue);
      addLog({
        level: "error",
        message: issue.message,
      });
      addToast({
        details: issue.technicalDetails,
        level: "error",
        message: issue.suggestion,
        title: issue.title,
      });
      return;
    }

    setNativeBackendState("ready");
    setProxyStatus(result.data);
    addLog({
      level: "info",
      message: t("proxy.logs.stopped"),
    });
    addToast({
      level: "info",
      message: t("proxy.toasts.stoppedDescription"),
      title: t("proxy.toasts.stopped"),
    });
  }

  async function handleCopyProxyUrl() {
    const proxyUrl = proxyStatus?.listenUrl;

    if (!proxyUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(proxyUrl);
      addLog({
        level: "success",
        message: t("proxy.logs.urlCopied"),
      });
      addToast({
        level: "success",
        message: proxyUrl,
        title: t("proxy.toasts.urlCopied"),
      });
    } catch {
      const message = t("proxy.errors.copyFailed");

      addLog({
        level: "warning",
        message,
      });
      addToast({
        level: "warning",
        message,
        title: t("proxy.toasts.clipboardUnavailable"),
      });
    }
  }

  async function handleSaveCurrentSession(sessionName: string, options: SessionFileActionOptions = {}) {
    if (!currentSession) {
      addLog({
        level: "warning",
        message: t("sessions.logs.saveNeedsSession"),
      });
      return;
    }

    const normalizedSessionName = sessionName.trim() || currentSession.name;
    const redactionResult = redactSessionForExport({
      customRules: options.redaction?.customRules,
      enabled: options.redaction?.enabled ?? true,
      packets: currentSessionPackets,
      replacement: options.redaction?.replacement,
      session: currentSession,
    });
    const sessionForFile = {
      ...(redactionResult.session ?? currentSession),
      name: normalizedSessionName,
    };
    const file = addRedactionMetadataIfNeeded(
      createExportFile(socketLensSessionExportAdapter, {
        packets: redactionResult.packets,
        session: sessionForFile,
        sessionName: normalizedSessionName,
      }),
      redactionResult.summary,
    );
    const result = await saveSocketLensFile(file, socketLensSessionExportAdapter.getSuggestedFileName(file));

    if (result.cancelled) {
      addLog({
        level: "info",
        message: t("sessions.logs.saveCancelled"),
        sessionId: currentSession.id,
      });
      return;
    }

    addLog({
      connectionId: currentSession.connectionId,
      level: "success",
      message:
        result.mode === "tauri"
          ? t("sessions.logs.savedTo", { target: result.target })
          : t("sessions.logs.downloadedAs", { target: result.target }),
      sessionId: currentSession.id,
    });
  }

  async function handleExportPackets(sessionName: string, options: SessionFileActionOptions = {}) {
    if (!currentSession || currentSessionPackets.length === 0) {
      addLog({
        level: "warning",
        message: t("sessions.logs.exportNeedsPackets"),
        sessionId: currentSession?.id ?? null,
      });
      return;
    }

    const normalizedSessionName = sessionName.trim() || currentSession.name;
    const redactionResult = redactSessionForExport({
      customRules: options.redaction?.customRules,
      enabled: options.redaction?.enabled ?? true,
      packets: currentSessionPackets,
      replacement: options.redaction?.replacement,
      session: {
        ...currentSession,
        name: normalizedSessionName,
      },
    });
    const file = addRedactionMetadataIfNeeded(
      createExportFile(socketLensPacketExportAdapter, {
        packets: redactionResult.packets,
        session: redactionResult.session ?? currentSession,
        sessionName: normalizedSessionName,
      }),
      redactionResult.summary,
    );
    const result = await saveSocketLensFile(file, socketLensPacketExportAdapter.getSuggestedFileName(file));

    if (result.cancelled) {
      addLog({
        level: "info",
        message: t("sessions.logs.exportCancelled"),
        sessionId: currentSession.id,
      });
      return;
    }

    addLog({
      connectionId: currentSession.connectionId,
      level: "success",
      message:
        result.mode === "tauri"
          ? t("sessions.logs.packetsExportedTo", { target: result.target })
          : t("sessions.logs.packetExportDownloadedAs", { target: result.target }),
      sessionId: currentSession.id,
    });
  }

  async function handleLoadSessionFile() {
    const result = await loadSocketLensFileFromTauriDialog();

    if (result.cancelled) {
      addLog({
        level: "info",
        message: t("sessions.logs.loadCancelled"),
      });
      return;
    }

    importSocketLensFile(result.file, result.sourceName);
  }

  async function handleImportBrowserFile(file: File) {
    const result = await loadSocketLensFileFromBrowserFile(file);

    if (!result.cancelled) {
      importSocketLensFile(result.file, result.sourceName);
    }
  }

  function importSocketLensFile(file: SocketLensImportableFile, sourceName: string) {
    const imported = createImportedSessionSnapshot(file);

    importSession(imported.session);
    addPackets(imported.packets);
    selectSession(imported.session.id);
    selectPacket(imported.packets[0]?.id ?? null);
    addLog({
      connectionId: imported.session.connectionId,
      level: "success",
      message: t("sessions.logs.loaded", {
        count: imported.packets.length,
        fileType: getSocketLensFileLabel(file),
        sessionName: file.metadata.sessionName,
        sourceName,
      }),
      sessionId: imported.session.id,
    });
  }

  function handleSendPayload(
    payload: string,
    options: { clearDraft?: boolean; source?: "manual" | "replay"; sourcePacketId?: string | null } = {},
  ) {
    return sendMessage(payload, options) !== null;
  }

  return (
    <AppShell
      bottomPanelCollapsed={settings.logPanelCollapsed}
      topBar={
        <TopBar
          capturedCount={visiblePackets.length}
          currentView={currentView}
          demoEndpointUrl={activeDemoEndpointUrl}
          endpointUrl={endpointUrl}
          isDemoActive={demoMode.isActive}
          isInvestorDemoActive={investorDemo.isActive}
          isConnected={isConnected}
          status={demoMode.isActive ? "demo" : status}
          onClearCapturedFrames={handleClearCapturedFrames}
          onConnect={handleConnect}
          onDisconnect={disconnect}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenSettings={() => setCurrentView("settings")}
          onOpenWorkspace={() => setCurrentView("workspace")}
          onResetInvestorDemo={handleResetInvestorDemo}
          onStartInvestorDemo={handleStartInvestorDemo}
          onStopDemo={handleStopDemo}
        />
      }
      sidebar={
        <Sidebar
          activeConnectionId={activeConnectionId}
          composerError={composerError}
          composerMode={composerMode}
          connections={connections}
          currentSession={currentSession}
          currentSessionPackets={currentSessionPackets}
          diagnostics={diagnostics}
          diagnosticsOpenSignal={diagnosticsOpenSignal}
          endpointUrl={endpointUrl}
          error={error}
          isDemoActive={demoMode.isActive}
          isConnected={isConnected}
          investorDemo={investorDemo}
          investorDemoPacketCount={investorDemoPacketCount}
          messageDraft={composerDraft}
          nativeBackendState={nativeBackendState}
          outgoingPackets={outgoingPackets}
          packets={packets}
          replayHistory={replayHistory}
          selectedConnectionId={selectedConnectionId}
          selectedPacket={selectedPacket}
          selectedSessionId={selectedSessionId}
          sessions={sessions}
          status={status}
          onConnectConnection={(connectionId) => void connectToConnection(connectionId)}
          onCreateConnection={handleCreateConnection}
          onClearReplayHistory={clearReplayHistory}
          onDisconnect={disconnect}
          onExportPackets={handleExportPackets}
          onImportBrowserFile={handleImportBrowserFile}
          onLoadSamplePayload={handleLoadSamplePayload}
          onLoadSessionFile={handleLoadSessionFile}
          onNotifyError={addToast}
          onCopyProxyUrl={handleCopyProxyUrl}
          onQuickConnectLocalEcho={handleConnectLocalEcho}
          onReconnectConnection={(connectionId) => void reconnect(connectionId)}
          onSaveSession={handleSaveCurrentSession}
          onSelectConnection={selectConnection}
          onSelectPacket={selectPacket}
          onSelectSession={handleSelectSession}
          onSendPayload={handleSendPayload}
          onSetComposerError={setComposerError}
          onSetComposerMode={setComposerMode}
          onSetMessageDraft={setComposerDraft}
          onSetProxyTargetUrl={setProxyTargetUrl}
          onStartProxy={() => void handleStartProxy()}
          onStartDemo={startDemoStream}
          onStartInvestorDemo={handleStartInvestorDemo}
          onStopProxy={() => void handleStopProxy()}
          onStopDemo={handleStopDemo}
          onResetInvestorDemo={handleResetInvestorDemo}
          proxyBusy={proxyBusy}
          proxyError={proxyError}
          proxyPacketCount={proxyPacketCount}
          proxyStatus={proxyStatus}
          proxyTargetUrl={proxyTargetUrl}
        />
      }
      inspector={
        <PayloadInspector
          packet={selectedPacket}
          packets={currentSessionPackets}
          session={currentSession}
          onUpdatePacketAnnotations={updatePacketAnnotations}
        />
      }
      bottomPanel={<LogPanel logs={logs} status={demoMode.isActive ? "demo" : status} onClearLogs={clearLogs} />}
    >
      <CommandPalette commands={commandPaletteCommands} isOpen={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <ToastViewport toasts={toasts} onDismissToast={dismissToast} />
      {currentView === "settings" ? (
        <SettingsPage packetCount={packets.length} />
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          {showOnboardingPanel ? (
            <OnboardingPanel
              activeEndpointUrl={endpointUrl}
              canConnectEcho={!demoMode.isActive && !investorDemo.isActive && !isConnected}
              canReplayPing={isConnected && outgoingPingPacket !== null}
              canSendPing={isConnected}
              canStartDemo={canStartInvestorDemo}
              isConnected={isConnected}
              isDemoActive={demoMode.isActive}
              isInvestorDemoActive={investorDemo.isActive}
              packets={packets}
              replayHistory={replayHistory}
              selectedPacket={selectedPacket}
              onConnectEcho={handleConnectLocalEcho}
              onReplayPing={handleReplayPing}
              onSendPing={handleSendPing}
              onStartDemo={handleStartInvestorDemo}
            />
          ) : null}
          {showInvestorDemoGuide ? (
            <InvestorDemoGuide
              canStart={canStartInvestorDemo}
              investorDemo={investorDemo}
              packetCount={investorDemoPacketCount}
              onReset={handleResetInvestorDemo}
              onStart={handleStartInvestorDemo}
            />
          ) : null}
          <div className="min-h-0 flex-1">
            <PacketTimeline
              connectionStatus={status}
              filterState={filterState}
              isConnected={isConnected}
              packets={visiblePackets}
              resultCount={visiblePackets.length}
              selectedPacketId={selectedPacketId}
              totalCount={scopedPacketCount}
              onClearPackets={handleClearCapturedFrames}
              onResetFilters={resetFilters}
              onSelectPacket={selectPacket}
              onUpdateFilterState={updateFilterState}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function createPacketFromProxyEvent(event: ProxyPacketEvent): Packet {
  return {
    connectionId: event.connectionId,
    direction: event.direction,
    id: event.id,
    payload: event.payload,
    payloadKind: event.payloadKind,
    sessionId: event.sessionId,
    sizeBytes: event.sizeBytes,
    timestamp: event.timestamp,
  };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function getProxyCommandError(error: NativeCommandError, t: ReturnType<typeof useTranslation>["t"]) {
  const technicalDetails = createTechnicalDetails("Native proxy command failed", {
    code: error.code,
    message: error.message,
  });

  switch (error.code) {
    case "tauri_unavailable":
      return createUserFacingError("backendUnavailable", t, {
        message: t("proxy.errors.nativeUnavailable"),
        technicalDetails,
      });
    case "proxy_already_running":
      return createUserFacingError("proxyUnavailable", t, {
        message: t("proxy.errors.alreadyRunning"),
        technicalDetails,
      });
    case "proxy_bind_failed":
      return createUserFacingError("proxyUnavailable", t, {
        message: t("proxy.errors.bindFailed"),
        technicalDetails,
      });
    case "proxy_not_running":
      return createUserFacingError("proxyUnavailable", t, {
        message: t("proxy.errors.notRunning"),
        technicalDetails,
      });
    case "proxy_runtime":
      return createUserFacingError("proxyUnavailable", t, {
        message: t("proxy.errors.runtime"),
        technicalDetails,
      });
    case "state_unavailable":
      return createUserFacingError("backendUnavailable", t, {
        message: t("proxy.errors.stateUnavailable"),
        technicalDetails,
      });
    case "invalid_input":
    case "unknown":
      return createUserFacingError("proxyUnavailable", t, {
        message: error.message,
        technicalDetails,
      });
  }
}
