import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Cable,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  History,
  Layers3,
  Play,
  Plus,
  RadioTower,
  RefreshCw,
  SendHorizontal,
  Square,
  Unplug,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectionDiagnosticsPanel, type ConnectionDiagnostics } from "@/components/connection-diagnostics-panel";
import { ErrorNotice } from "@/components/error-notice";
import { Input } from "@/components/ui/input";
import { InvestorDemoSidebarCard } from "@/components/investor-demo-panel";
import { ManualSendPanel } from "@/components/manual-send-panel";
import { PanelContent, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { ProxyModePanel } from "@/components/proxy-mode-panel";
import { RetentionSettingsPanel } from "@/components/retention-settings-panel";
import { SessionPersistencePanel } from "@/components/session-persistence-panel";
import { localEchoServerCommand, localEchoServerUrl } from "@/config/runtime-defaults";
import { formatBytes, formatDuration, formatTime } from "@/lib/format";
import type { NativeBackendState, ProxyStatus } from "@/lib/tauri-commands";
import { createTechnicalDetails, createUserFacingError, type UserFacingError } from "@/lib/user-facing-errors";
import { translateWebSocketValidationMessage } from "@/lib/validation-messages";
import type { Connection, ConnectionStatus, Packet, ReplayHistoryItem, SendSource, Session } from "@/models";
import { validateWebSocketUrl } from "@/models";
import type { ComposerMode, CreateToastInput, InvestorDemoState } from "@/store/ui-store";

type ConnectionDraft = {
  connectNow: boolean;
  endpointUrl: string;
  name: string;
};

type CaptureMode = "direct" | "proxy";

type SidebarProps = {
  activeConnectionId: string | null;
  composerError: string | null;
  composerMode: ComposerMode;
  connections: Connection[];
  currentSession: Session | null;
  currentSessionPackets: Packet[];
  diagnostics: ConnectionDiagnostics;
  endpointUrl: string;
  error: string | null;
  isDemoActive: boolean;
  isConnected: boolean;
  investorDemo: InvestorDemoState;
  investorDemoPacketCount: number;
  messageDraft: string;
  nativeBackendState: NativeBackendState;
  onClearReplayHistory: () => void;
  onConnectConnection: (connectionId: string) => void;
  onCreateConnection: (draft: ConnectionDraft) => boolean;
  onDisconnect: () => void;
  onExportPackets: (sessionName: string) => Promise<void>;
  onImportBrowserFile: (file: File) => Promise<void>;
  onLoadSamplePayload: () => void;
  onLoadSessionFile: () => Promise<void>;
  onCopyProxyUrl: () => void;
  onNotifyError: (toast: CreateToastInput) => void;
  onQuickConnectLocalEcho: () => void;
  onReconnectConnection: (connectionId: string) => void;
  onSaveSession: (sessionName: string) => Promise<void>;
  onSelectConnection: (connectionId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onSendPayload: (payload: string, options?: { clearDraft?: boolean; source?: SendSource; sourcePacketId?: string | null }) => boolean;
  onSetComposerError: (composerError: string | null) => void;
  onSetComposerMode: (composerMode: ComposerMode) => void;
  onSetMessageDraft: (messageDraft: string) => void;
  onSetProxyTargetUrl: (targetUrl: string) => void;
  onStartProxy: () => void;
  onStartDemo: () => void;
  onStartInvestorDemo: () => void;
  onStopProxy: () => void;
  onStopDemo: () => void;
  onResetInvestorDemo: () => void;
  outgoingPackets: Packet[];
  packets: Packet[];
  proxyBusy: boolean;
  proxyError: UserFacingError | null;
  proxyPacketCount: number;
  proxyStatus: ProxyStatus | null;
  proxyTargetUrl: string;
  replayHistory: ReplayHistoryItem[];
  selectedConnectionId: string | null;
  selectedPacket: Packet | null;
  selectedSessionId: string | null;
  sessions: Session[];
  status: ConnectionStatus;
};

export function Sidebar({
  activeConnectionId,
  composerError,
  composerMode,
  connections,
  currentSession,
  currentSessionPackets,
  diagnostics,
  endpointUrl,
  error,
  isDemoActive,
  isConnected,
  investorDemo,
  investorDemoPacketCount,
  messageDraft,
  nativeBackendState,
  onClearReplayHistory,
  onConnectConnection,
  onCreateConnection,
  onDisconnect,
  onExportPackets,
  onImportBrowserFile,
  onLoadSamplePayload,
  onLoadSessionFile,
  onCopyProxyUrl,
  onNotifyError,
  onQuickConnectLocalEcho,
  onReconnectConnection,
  onSaveSession,
  onSelectConnection,
  onSelectSession,
  onSendPayload,
  onSetComposerError,
  onSetComposerMode,
  onSetMessageDraft,
  onSetProxyTargetUrl,
  onStartProxy,
  onStartDemo,
  onStartInvestorDemo,
  onStopProxy,
  onStopDemo,
  onResetInvestorDemo,
  outgoingPackets,
  packets,
  proxyBusy,
  proxyError,
  proxyPacketCount,
  proxyStatus,
  proxyTargetUrl,
  replayHistory,
  selectedConnectionId,
  selectedPacket,
  selectedSessionId,
  sessions,
  status,
}: SidebarProps) {
  const { t } = useTranslation();
  const [captureMode, setCaptureMode] = useState<CaptureMode>("direct");
  const [modalDefaults, setModalDefaults] = useState<Pick<ConnectionDraft, "endpointUrl" | "name"> | null>(null);
  const directConnections = useMemo(
    () => connections.filter((connection) => connection.transport === "websocket"),
    [connections],
  );
  const activeConnection = useMemo(
    () => directConnections.find((connection) => connection.id === activeConnectionId) ?? null,
    [activeConnectionId, directConnections],
  );
  const selectedConnection = useMemo(
    () => directConnections.find((connection) => connection.id === selectedConnectionId) ?? null,
    [directConnections, selectedConnectionId],
  );
  const focusedConnection = activeConnection ?? selectedConnection;
  const isBusy = status === "connecting";
  const canStartDemo = !isDemoActive && !isConnected && !isBusy;
  const canStartInvestorDemo = !isDemoActive && !isConnected && !isBusy;
  const canConnect = !isDemoActive && !isConnected && !isBusy;
  const activeDirectPacketCount = activeConnection ? currentSessionPackets.length : 0;

  useEffect(() => {
    if (proxyStatus?.isRunning) {
      setCaptureMode("proxy");
    }
  }, [proxyStatus?.isRunning]);

  useEffect(() => {
    if (activeConnection && (isConnected || isBusy)) {
      setCaptureMode("direct");
      return;
    }

    if (!proxyStatus?.isRunning) {
      setCaptureMode("direct");
    }
  }, [activeConnection, isBusy, isConnected, proxyStatus?.isRunning]);

  function openNewConnectionModal(defaults: Pick<ConnectionDraft, "endpointUrl" | "name"> = { endpointUrl, name: "" }) {
    setModalDefaults(defaults);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader>
        <PanelTitle>{t("sidebar.connectionManager")}</PanelTitle>
        <Button variant="ghost" size="sm" onClick={() => openNewConnectionModal()}>
          <Plus className="h-4 w-4" />
          {t("actions.new")}
        </Button>
      </PanelHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
        <PanelContent className="space-y-2.5">
          <InvestorDemoSidebarCard
            canStart={canStartInvestorDemo}
            investorDemo={investorDemo}
            packetCount={investorDemoPacketCount}
            onReset={onResetInvestorDemo}
            onStart={onStartInvestorDemo}
          />

          <div className="rounded-md border border-primary/25 bg-primary/10 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="sl-section-label text-xs font-semibold uppercase text-primary">{t("sidebar.demoMode.title")}</p>
                <p className="sl-caption mt-1 text-xs text-muted-foreground">{t("sidebar.demoMode.description")}</p>
              </div>
              <Badge variant={isDemoActive ? "default" : "outline"}>
                {isDemoActive ? t("sidebar.demoMode.live") : t("status.demo")}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" disabled={!canStartDemo} onClick={onStartDemo}>
                <Play className="h-4 w-4" />
                {t("actions.start")}
              </Button>
              <Button variant="ghost" size="sm" disabled={!isDemoActive} onClick={onStopDemo}>
                <Square className="h-4 w-4" />
                {t("actions.stop")}
              </Button>
            </div>
          </div>

          <CaptureModeToggle
            mode={captureMode}
            proxyRunning={proxyStatus?.isRunning ?? false}
            onModeChange={setCaptureMode}
          />

          {captureMode === "proxy" ? (
            <ProxyModePanel
              backendState={nativeBackendState}
              error={proxyError}
              isBusy={proxyBusy || status === "connecting"}
              packetCount={proxyPacketCount}
              proxyStatus={proxyStatus}
              targetUrl={proxyTargetUrl}
              onCopyProxyUrl={onCopyProxyUrl}
              onStartProxy={onStartProxy}
              onStopProxy={onStopProxy}
              onTargetUrlChange={onSetProxyTargetUrl}
            />
          ) : (
            <>
              <DirectModeQuickStart
                canQuickConnect={canConnect}
                onCreateLocalEcho={() => openNewConnectionModal({ endpointUrl: localEchoServerUrl, name: t("sidebar.localEcho") })}
                onQuickConnectLocalEcho={onQuickConnectLocalEcho}
              />

              <DirectConnectionStatusCard
                endpointUrl={focusedConnection?.endpointUrl ?? endpointUrl}
                error={focusedConnection?.error ?? error}
                isConnected={isConnected}
                packetCount={activeDirectPacketCount}
                status={status}
              />

              <div className="rounded-md border border-border/80 bg-muted/20 p-2.5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="sl-section-label text-xs font-semibold uppercase text-muted-foreground">
                      {activeConnection ? t("sidebar.activeDirectConnection") : t("sidebar.selectedDirectConnection")}
                    </p>
                    <p className="sl-caption mt-1 text-xs text-muted-foreground">
                      {focusedConnection ? t("sidebar.directConnectionHelp") : t("sidebar.directConnectionEmptyHelp")}
                    </p>
                  </div>
                  {focusedConnection ? <ConnectionStatusBadge status={focusedConnection.status} /> : null}
                </div>

                {focusedConnection ? (
                  <div className="space-y-3">
                    <div className="min-w-0">
                      <p className="sl-heading truncate text-sm font-semibold">{focusedConnection.name}</p>
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{focusedConnection.endpointUrl}</p>
                    </div>
                    {focusedConnection.error || (focusedConnection.id === selectedConnectionId ? error : null) ? (
                      <InlineError message={focusedConnection.error ?? error ?? t("errors.connection")} />
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                      {focusedConnection.id === activeConnectionId && (isConnected || isBusy) ? (
                        <Button variant="secondary" size="sm" onClick={onDisconnect}>
                          <Unplug className="h-4 w-4" />
                          {t("actions.disconnect")}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!canConnect}
                          onClick={() => onConnectConnection(focusedConnection.id)}
                        >
                          <Play className="h-4 w-4" />
                          {t("actions.connect")}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDemoActive || isBusy || (isConnected && focusedConnection.id !== activeConnectionId)}
                        onClick={() => onReconnectConnection(focusedConnection.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                        {t("actions.reconnect")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openNewConnectionModal()}
                    >
                      <Plus className="h-4 w-4" />
                      {t("actions.new")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canConnect}
                      onClick={onQuickConnectLocalEcho}
                    >
                      <Database className="h-4 w-4" />
                      {t("sidebar.quickEcho.connect")}
                    </Button>
                  </div>
                )}
              </div>

              <SidebarSection
                badge={<Badge variant="secondary">{directConnections.length}</Badge>}
                defaultOpen={directConnections.length > 0 && focusedConnection === null}
                icon={History}
                title={t("sidebar.directHistory")}
              >
                {directConnections.length === 0 ? (
                    <p className="sl-copy rounded-md border border-dashed border-border/80 px-3 py-3 text-xs text-muted-foreground">
                    {t("sidebar.directHistoryEmpty")}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {directConnections.map((connection) => (
                      <ConnectionHistoryItem
                        key={connection.id}
                        active={connection.id === activeConnectionId}
                        canConnect={canConnect}
                        connection={connection}
                        disabledByActiveConnection={isConnected && connection.id !== activeConnectionId}
                        selected={connection.id === selectedConnectionId}
                        onConnectConnection={onConnectConnection}
                        onDisconnect={onDisconnect}
                        onReconnectConnection={onReconnectConnection}
                        onSelectConnection={onSelectConnection}
                      />
                    ))}
                  </div>
                )}
              </SidebarSection>
            </>
          )}

          <SidebarSection
            defaultOpen={Boolean(error || proxyError)}
            icon={AlertCircle}
            title={t("diagnostics.title")}
          >
            <ConnectionDiagnosticsPanel diagnostics={diagnostics} showHeader={false} />
          </SidebarSection>

          <SidebarSection icon={Layers3} title={t("retention.title")}>
            <RetentionSettingsPanel packetCount={packets.length} />
          </SidebarSection>
        </PanelContent>

        {captureMode === "direct" ? (
          <PanelContent className="border-t border-border/70">
            <SidebarSection defaultOpen={isConnected} icon={SendHorizontal} title={t("manualSend.title")}>
              <ManualSendPanel
                composerError={composerError}
                composerMode={composerMode}
                isConnected={isConnected}
                messageDraft={messageDraft}
                outgoingPackets={outgoingPackets}
                replayHistory={replayHistory}
                selectedPacket={selectedPacket}
                showHeader={false}
                onClearReplayHistory={onClearReplayHistory}
                onLoadSamplePayload={onLoadSamplePayload}
                onNotifyError={onNotifyError}
                onSendPayload={onSendPayload}
                onSetComposerDraft={onSetMessageDraft}
                onSetComposerError={onSetComposerError}
                onSetComposerMode={onSetComposerMode}
              />
            </SidebarSection>
          </PanelContent>
        ) : null}

        <PanelContent className="border-t border-border/70">
          <SidebarSection defaultOpen={false} icon={Database} title={t("sessions.files.title")}>
            <SessionPersistencePanel
              currentSession={currentSession}
              currentSessionPackets={currentSessionPackets}
              onExportPackets={onExportPackets}
              onImportBrowserFile={onImportBrowserFile}
              onLoadSessionFile={onLoadSessionFile}
              onSaveSession={onSaveSession}
            />
          </SidebarSection>

          <SidebarSection
            badge={<Badge variant="secondary">{sessions.length}</Badge>}
            defaultOpen={sessions.length > 0}
            icon={Cable}
            title={t("sidebar.sessions")}
          >
            {sessions.length === 0 ? (
              <div className="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-border/80 bg-background/30 px-4 text-center">
                <Cable className="mb-2 h-6 w-6 text-muted-foreground" />
                <p className="sl-heading text-xs font-medium">{t("sidebar.noSessions.title")}</p>
                <p className="sl-caption mt-1 text-xs text-muted-foreground">{t("sidebar.noSessions.description")}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((session) => {
                  const sessionPackets = packets.filter((packet) => packet.sessionId === session.id);
                  const totalBytes = sessionPackets.reduce((sum, packet) => sum + packet.sizeBytes, 0);
                  const isSelected = session.id === selectedSessionId;

                  return (
                    <button
                      key={session.id}
                      type="button"
                      className={[
                        "w-full rounded-md border p-2.5 text-left transition",
                        isSelected
                          ? "border-primary/60 bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
                          : "border-border/70 bg-muted/20 hover:border-border hover:bg-muted/35",
                      ].join(" ")}
                      onClick={() => onSelectSession(session.id)}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="min-w-0">
                          <span className="sl-heading block truncate text-xs font-semibold text-foreground">{session.name}</span>
                          <span className="mt-1 block truncate font-mono text-[0.72rem] text-muted-foreground">
                            {session.endpointUrl}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {session.endpointUrl.startsWith("demo://") ? <Badge variant="outline">{t("status.demo")}</Badge> : null}
                          <SessionStatusDot status={session.status} />
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[0.72rem] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Layers3 className="h-3 w-3" />
                          {sessionPackets.length}
                        </span>
                        <span>{formatBytes(totalBytes)}</span>
                        <span className="flex items-center justify-end gap-1">
                          <Clock3 className="h-3 w-3" />
                          {formatDuration(session.startedAt, session.endedAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-[0.72rem] text-muted-foreground">{formatTime(session.startedAt)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </SidebarSection>
        </PanelContent>
      </div>

      {modalDefaults ? (
        <NewConnectionModal
          defaults={modalDefaults}
          onClose={() => setModalDefaults(null)}
          onCreateConnection={(draft) => {
            const created = onCreateConnection(draft);

            if (created) {
              setModalDefaults(null);
            }

            return created;
          }}
        />
      ) : null}
    </div>
  );
}

type CaptureModeToggleProps = {
  mode: CaptureMode;
  onModeChange: (mode: CaptureMode) => void;
  proxyRunning: boolean;
};

type SidebarSectionProps = {
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  icon: LucideIcon;
  title: string;
};

function SidebarSection({ badge, children, defaultOpen = false, icon: Icon, title }: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true);
    }
  }, [defaultOpen]);

  return (
    <details
      className="group rounded-md border border-border/70 bg-background/35"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="sl-section-label flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-xs font-semibold uppercase text-muted-foreground transition hover:bg-muted/25 hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="inline-flex min-w-0 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {badge}
          <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="space-y-2 border-t border-border/60 p-2">{children}</div>
    </details>
  );
}

type DirectModeQuickStartProps = {
  canQuickConnect: boolean;
  onCreateLocalEcho: () => void;
  onQuickConnectLocalEcho: () => void;
};

function DirectModeQuickStart({
  canQuickConnect,
  onCreateLocalEcho,
  onQuickConnectLocalEcho,
}: DirectModeQuickStartProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-md border border-primary/25 bg-primary/10 p-2.5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="sl-section-label inline-flex items-center gap-2 text-xs font-semibold uppercase text-primary">
            <Database className="h-3.5 w-3.5" />
            {t("sidebar.quickEcho.title")}
          </p>
          <p className="sl-copy mt-1 text-xs text-muted-foreground">{t("sidebar.quickEcho.description")}</p>
        </div>
        <Badge variant="outline">{t("sidebar.direct")}</Badge>
      </div>
      <div className="grid gap-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <code className="truncate rounded-md border border-border/70 bg-code px-2 py-1.5 text-[0.72rem] text-foreground">
            {localEchoServerCommand}
          </code>
          <code className="truncate rounded-md border border-border/70 bg-code px-2 py-1.5 text-[0.72rem] text-foreground">
            {localEchoServerUrl}
          </code>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" disabled={!canQuickConnect} onClick={onQuickConnectLocalEcho}>
            <Cable className="h-4 w-4" />
            {t("sidebar.quickEcho.connect")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onCreateLocalEcho}>
            <Plus className="h-4 w-4" />
            {t("sidebar.quickEcho.saveOnly")}
          </Button>
        </div>
      </div>
    </div>
  );
}

type DirectConnectionStatusCardProps = {
  endpointUrl: string;
  error: string | null;
  isConnected: boolean;
  packetCount: number;
  status: ConnectionStatus;
};

function DirectConnectionStatusCard({
  endpointUrl,
  error,
  isConnected,
  packetCount,
  status,
}: DirectConnectionStatusCardProps) {
  const { t } = useTranslation();

  if (isConnected) {
    return (
      <div className="rounded-md border border-emerald-400/25 bg-emerald-400/10 p-2.5">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="sl-heading text-sm font-semibold text-emerald-100">{t("sidebar.directStatus.connectedTitle")}</p>
            <p className="mt-1 truncate font-mono text-[0.72rem] text-emerald-100/75">{endpointUrl}</p>
            <p className="sl-copy mt-2 text-xs text-muted-foreground">
              {packetCount > 0
                ? t("sidebar.directStatus.receivingPackets", { count: packetCount })
                : t("sidebar.directStatus.waitingForPackets")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="sl-copy rounded-md border border-amber-300/25 bg-amber-300/10 p-2.5 text-xs text-muted-foreground">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-amber-300/30 bg-amber-300/10 text-amber-100">
            <RefreshCw className="h-4 w-4 animate-spin" />
          </span>
          <span>
            <span className="sl-heading block font-semibold text-amber-100">{t("sidebar.directStatus.connectingTitle")}</span>
            <span className="mt-1 block">{t("sidebar.directStatus.connectingDescription")}</span>
          </span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="sl-copy rounded-md border border-destructive/35 bg-destructive/10 p-2.5 text-xs text-muted-foreground">
        <p className="sl-heading font-semibold text-destructive">{t("sidebar.directStatus.errorTitle")}</p>
        <p className="mt-1">{error ?? t("connection.errors.failed")}</p>
        <p className="mt-2">{t("sidebar.directStatus.errorHint")}</p>
      </div>
    );
  }

  return (
    <div className="sl-copy rounded-md border border-border/80 bg-[linear-gradient(180deg,hsl(var(--muted)/0.24),hsl(var(--panel)/0.45))] p-2.5 text-xs text-muted-foreground">
      <p className="sl-heading inline-flex items-center gap-2 font-semibold text-foreground">
        <SendHorizontal className="h-3.5 w-3.5 text-primary" />
        {t("sidebar.directStatus.idleTitle")}
      </p>
      <p className="mt-1">{t("sidebar.directStatus.idleDescription")}</p>
    </div>
  );
}

function CaptureModeToggle({ mode, onModeChange, proxyRunning }: CaptureModeToggleProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-md border border-border/80 bg-muted/20 p-2">
      <p className="sl-section-label mb-2 px-1 text-xs font-semibold uppercase text-muted-foreground">{t("sidebar.captureMode")}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={mode === "direct"}
          disabled={proxyRunning}
          className={[
            "min-h-[4.75rem] rounded-md border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
            mode === "direct"
              ? "border-primary/60 bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]"
              : "border-border/70 bg-background/50 hover:bg-muted/40",
          ].join(" ")}
          onClick={() => onModeChange("direct")}
        >
          <span className="sl-heading flex items-center gap-2 text-xs font-semibold text-foreground">
            <Cable className="h-4 w-4 text-primary" />
            {t("sidebar.direct")}
          </span>
          <span className="sl-caption mt-1 block text-[0.72rem] text-muted-foreground">{t("sidebar.directDescription")}</span>
        </button>
        <button
          type="button"
          aria-pressed={mode === "proxy"}
          className={[
            "min-h-[4.75rem] rounded-md border px-3 py-2 text-left transition",
            mode === "proxy"
              ? "border-primary/60 bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]"
              : "border-border/70 bg-background/50 hover:bg-muted/40",
          ].join(" ")}
          onClick={() => onModeChange("proxy")}
        >
          <span className="sl-heading flex items-center gap-2 text-xs font-semibold text-foreground">
            <RadioTower className="h-4 w-4 text-primary" />
            {t("sidebar.proxy")}
            {proxyRunning ? (
              <span className="rounded-md border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[0.65rem] text-primary">
                {t("sidebar.proxyLive")}
              </span>
            ) : null}
          </span>
          <span className="sl-caption mt-1 block text-[0.72rem] text-muted-foreground">{t("sidebar.proxyDescription")}</span>
        </button>
      </div>
    </div>
  );
}

type ConnectionHistoryItemProps = {
  active: boolean;
  canConnect: boolean;
  connection: Connection;
  disabledByActiveConnection: boolean;
  onConnectConnection: (connectionId: string) => void;
  onDisconnect: () => void;
  onReconnectConnection: (connectionId: string) => void;
  onSelectConnection: (connectionId: string) => void;
  selected: boolean;
};

function ConnectionHistoryItem({
  active,
  canConnect,
  connection,
  disabledByActiveConnection,
  onConnectConnection,
  onDisconnect,
  onReconnectConnection,
  onSelectConnection,
  selected,
}: ConnectionHistoryItemProps) {
  const { t } = useTranslation();
  const canReconnect = connection.status === "disconnected" || connection.status === "error" || connection.lastConnectedAt;

  return (
    <div
      className={[
        "rounded-md border px-3 py-2 transition",
        selected ? "border-primary/60 bg-primary/10" : "border-border/70 bg-muted/20 hover:bg-muted/35",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelectConnection(connection.id)}>
          <span className="flex items-center justify-between gap-2">
            <span className="sl-heading truncate text-xs font-medium">{connection.name}</span>
            <ConnectionStatusBadge status={connection.status} />
          </span>
          <span className="mt-1 block truncate font-mono text-[0.72rem] text-muted-foreground">{connection.endpointUrl}</span>
          {connection.lastConnectedAt ? (
            <span className="sl-caption mt-1 block text-[0.72rem] text-muted-foreground">
              {t("sidebar.lastConnected", { time: formatTime(connection.lastConnectedAt) })}
            </span>
          ) : null}
          {connection.error ? <span className="mt-1 block text-[0.72rem] text-destructive">{connection.error}</span> : null}
        </button>
        <div className="flex shrink-0 flex-col gap-1">
          {active ? (
            <Button variant="ghost" size="sm" onClick={onDisconnect}>
              <Unplug className="h-4 w-4" />
            </Button>
          ) : canReconnect ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={disabledByActiveConnection}
              onClick={() => onReconnectConnection(connection.id)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" disabled={!canConnect} onClick={() => onConnectConnection(connection.id)}>
              <Play className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type NewConnectionModalProps = {
  defaults: Pick<ConnectionDraft, "endpointUrl" | "name">;
  onClose: () => void;
  onCreateConnection: (draft: ConnectionDraft) => boolean;
};

function NewConnectionModal({ defaults, onClose, onCreateConnection }: NewConnectionModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(defaults.name);
  const [endpointUrl, setEndpointUrl] = useState(defaults.endpointUrl);
  const [modalError, setModalError] = useState<UserFacingError | null>(null);

  function handleSubmit(connectNow: boolean) {
    const validation = validateWebSocketUrl(endpointUrl);

    if (!validation.ok) {
      setModalError(
        createUserFacingError("invalidUrl", t, {
          message: translateWebSocketValidationMessage(validation.message, t),
          technicalDetails: createTechnicalDetails("Connection modal URL validation failed", {
            endpointUrl,
            validationMessage: validation.message,
          }),
        }),
      );
      return;
    }

    const created = onCreateConnection({
      connectNow,
      endpointUrl: validation.url,
      name,
    });

    if (!created) {
      setModalError(
        createUserFacingError("unknown", t, {
          message: t("connectionModal.saveFailed"),
          technicalDetails: createTechnicalDetails("Connection modal save failed", {
            connectNow,
            endpointUrl: validation.url,
          }),
        }),
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div>
            <h2 className="sl-heading text-sm font-semibold">{t("connectionModal.title")}</h2>
            <p className="sl-caption mt-1 text-xs text-muted-foreground">{t("connectionModal.description")}</p>
          </div>
          <Button variant="ghost" size="sm" aria-label={t("connectionModal.closeLabel")} onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 p-4">
          <label className="sl-caption space-y-2 text-xs font-medium text-muted-foreground">
            {t("connectionModal.name")}
            <Input
              value={name}
              placeholder={t("connectionModal.namePlaceholder")}
              spellCheck={false}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="sl-caption space-y-2 text-xs font-medium text-muted-foreground">
            {t("connectionModal.url")}
            <Input
              autoFocus
              value={endpointUrl}
              placeholder={localEchoServerUrl}
              spellCheck={false}
              onChange={(event) => {
                setEndpointUrl(event.target.value);
                setModalError(null);
              }}
            />
          </label>
          {modalError ? <ErrorNotice error={modalError} /> : null}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border/70 px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => handleSubmit(false)}>
              {t("actions.save")}
            </Button>
            <Button onClick={() => handleSubmit(true)}>
              <Play className="h-4 w-4" />
              {t("actions.connect")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  const { t } = useTranslation();
  const config = {
    connected: { className: "", labelKey: "status.connected", variant: "default" },
    connecting: { className: "", labelKey: "status.connecting", variant: "secondary" },
    disconnected: { className: "", labelKey: "status.disconnected", variant: "outline" },
    error: { className: "border-destructive/40 bg-destructive/10 text-destructive", labelKey: "status.error", variant: "outline" },
    idle: { className: "", labelKey: "status.idle", variant: "outline" },
  } satisfies Record<ConnectionStatus, { className: string; labelKey: string; variant: "default" | "outline" | "secondary" }>;

  return (
    <Badge variant={config[status].variant} className={config[status].className}>
      {t(config[status].labelKey)}
    </Badge>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

function SessionStatusDot({ status }: { status: string }) {
  const { t } = useTranslation();
  const tone =
    status === "connected"
      ? "bg-emerald-400"
      : status === "connecting"
        ? "bg-amber-300"
        : status === "error"
          ? "bg-destructive"
          : "bg-muted-foreground";

  const label = t(`status.${status}`, status);

  return <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} aria-label={label} title={label} />;
}
