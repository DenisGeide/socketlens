import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  createImportedSessionSnapshot,
  type Packet,
  type Session,
  getSocketLensFileLabel,
  type SocketLensImportableFile,
  validateWebSocketUrl,
} from "@/models";
import { useConnectionStore } from "@/store/connection-store";
import { usePacketStore } from "@/store/packet-store";
import { useSessionStore } from "@/store/session-store";
import { useSettingsStore } from "@/store/settings-store";
import { useUiStore } from "@/store/ui-store";

type AppView = "settings" | "workspace";

export function App() {
  const { i18n, t } = useTranslation();
  const backendStatusCheckedRef = useRef(false);
  const [nativeBackendState, setNativeBackendState] = useState<NativeBackendState>("checking");
  const [currentView, setCurrentView] = useState<AppView>("workspace");
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
  const { addPacket, addPackets, clearPackets, packets } = usePacketStore();
  const { importSession, renameSession, sessions, updateSessionStatus, recordPacket } = useSessionStore();
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
    name,
  }: {
    connectNow: boolean;
    endpointUrl: string;
    name: string;
  }) {
    const connection = saveConnection({
      endpointUrl: nextEndpointUrl,
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
    const validation = validateWebSocketUrl(proxyTargetUrl);

    if (!validation.ok) {
      const message = translateWebSocketValidationMessage(validation.message, t);
      const issue = createUserFacingError("invalidUrl", t, {
        message,
        technicalDetails: createTechnicalDetails("Proxy target URL validation failed", {
          targetUrl: proxyTargetUrl,
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
    setProxyTargetUrl(result.data.targetUrl ?? validation.url);
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

  async function handleSaveCurrentSession(sessionName: string) {
    if (!currentSession) {
      addLog({
        level: "warning",
        message: t("sessions.logs.saveNeedsSession"),
      });
      return;
    }

    const normalizedSessionName = sessionName.trim() || currentSession.name;
    const sessionForFile = {
      ...currentSession,
      name: normalizedSessionName,
    };
    const file = createExportFile(socketLensSessionExportAdapter, {
      packets: currentSessionPackets,
      session: sessionForFile,
      sessionName: normalizedSessionName,
    });
    const result = await saveSocketLensFile(file, socketLensSessionExportAdapter.getSuggestedFileName(file));

    if (result.cancelled) {
      addLog({
        level: "info",
        message: t("sessions.logs.saveCancelled"),
        sessionId: currentSession.id,
      });
      return;
    }

    renameSession(currentSession.id, normalizedSessionName);
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

  async function handleExportPackets(sessionName: string) {
    if (!currentSession || currentSessionPackets.length === 0) {
      addLog({
        level: "warning",
        message: t("sessions.logs.exportNeedsPackets"),
        sessionId: currentSession?.id ?? null,
      });
      return;
    }

    const normalizedSessionName = sessionName.trim() || currentSession.name;
    const file = createExportFile(socketLensPacketExportAdapter, {
      packets: currentSessionPackets,
      session: {
        ...currentSession,
        name: normalizedSessionName,
      },
      sessionName: normalizedSessionName,
    });
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
      inspector={<PayloadInspector packet={selectedPacket} packets={currentSessionPackets} session={currentSession} />}
      bottomPanel={<LogPanel logs={logs} status={demoMode.isActive ? "demo" : status} onClearLogs={clearLogs} />}
    >
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
