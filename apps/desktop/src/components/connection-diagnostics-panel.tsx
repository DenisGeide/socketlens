import { useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Bug,
  Clipboard,
  Clock3,
  Download,
  Gauge,
  Globe2,
  HardDrive,
  Link2,
  RadioTower,
  RotateCcw,
  ServerCrash,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/error-notice";
import {
  createDiagnosticsBundle,
  createDiagnosticsFileName,
  serializeDiagnosticsBundle,
  type DiagnosticsBundleInput,
} from "@/lib/diagnostics-bundle";
import { formatTime } from "@/lib/format";
import { createUserFacingError } from "@/lib/user-facing-errors";

export type ConnectionDiagnostics = DiagnosticsBundleInput & {
  statusLabel: string;
};

type ConnectionDiagnosticsPanelProps = {
  diagnostics: ConnectionDiagnostics;
  showHeader?: boolean;
};

export function ConnectionDiagnosticsPanel({ diagnostics, showHeader = true }: ConnectionDiagnosticsPanelProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const diagnosticsBundle = useMemo(() => createDiagnosticsBundle(diagnostics), [diagnostics]);
  const diagnosticDetails = useMemo(() => serializeDiagnosticsBundle(diagnosticsBundle), [diagnosticsBundle]);
  const redactedEndpointUrl = diagnosticsBundle.connection.endpointUrl;
  const lastErrorNotice =
    diagnostics.lastError === null
      ? null
      : createUserFacingError("unknown", t, {
          message: diagnostics.lastError,
          technicalDetails: diagnostics.lastErrorDetails ?? diagnosticDetails,
        });

  async function handleCopyDiagnostics() {
    try {
      await navigator.clipboard.writeText(diagnosticDetails);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  }

  function handleExportDiagnostics() {
    const fileName = createDiagnosticsFileName();
    const blob = new Blob([diagnosticDetails], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setExported(true);
    window.setTimeout(() => setExported(false), 1_500);
  }

  return (
    <div className="rounded-md border border-border/80 bg-muted/15 p-2">
      <div className="mb-2 space-y-1.5">
        {showHeader ? (
          <p className="sl-section-label inline-flex min-w-0 items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Bug className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t("diagnostics.title")}</span>
          </p>
        ) : null}
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5">
          <Badge
            variant={diagnostics.lastError ? "outline" : "secondary"}
            className={diagnostics.lastError ? "h-7 border-destructive/40 px-2 text-destructive" : "h-7 px-2"}
          >
            {diagnostics.activeMode}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 min-w-0 justify-center px-2 text-[0.72rem]"
            title={copied ? t("diagnostics.copied") : t("diagnostics.copy")}
            onClick={handleCopyDiagnostics}
          >
            <Clipboard className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{copied ? t("diagnostics.copied") : t("diagnostics.copy")}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 min-w-0 px-2 text-[0.72rem]"
            title={exported ? t("diagnostics.exported") : t("diagnostics.export")}
            onClick={handleExportDiagnostics}
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className="hidden min-w-0 truncate min-[340px]:inline">{exported ? t("diagnostics.exported") : t("diagnostics.export")}</span>
          </Button>
        </div>
      </div>
      <div className="sl-caption grid gap-1 text-[0.72rem]">
        <DiagnosticNotice>{t("diagnostics.privacyNotice")}</DiagnosticNotice>
        <DiagnosticRow icon={Gauge} label={t("diagnostics.appVersion")} value={diagnosticsBundle.app.version} />
        <DiagnosticRow icon={Globe2} label={t("diagnostics.platform")} value={diagnosticsBundle.runtime.platform} />
        <DiagnosticRow
          icon={HardDrive}
          label={t("diagnostics.tauriBackend")}
          value={
            diagnosticsBundle.backend.version
              ? `${diagnosticsBundle.backend.state} (${diagnosticsBundle.backend.version})`
              : diagnosticsBundle.backend.state
          }
        />
        <DiagnosticRow icon={Activity} label={t("diagnostics.status")} value={diagnostics.statusLabel} />
        <DiagnosticRow
          icon={Globe2}
          label={t("diagnostics.environment")}
          value={diagnosticsBundle.environment?.name ?? t("common.none")}
        />
        <DiagnosticRow icon={HardDrive} label={t("diagnostics.socket")} value={diagnostics.socketReadyState} />
        <DiagnosticRow icon={Link2} label={t("diagnostics.endpoint")} mono value={redactedEndpointUrl} />
        <DiagnosticRow
          icon={RadioTower}
          label={t("diagnostics.proxyStatus")}
          value={
            diagnosticsBundle.proxy.isRunning
              ? t("diagnostics.proxyRunning", { count: diagnosticsBundle.proxy.activeConnections })
              : t("diagnostics.proxyStopped")
          }
        />
        <DiagnosticRow
          icon={Activity}
          label={t("diagnostics.packetCounters")}
          value={t("diagnostics.packetCountersValue", {
            inbound: diagnosticsBundle.packets.total.inbound,
            outbound: diagnosticsBundle.packets.total.outbound,
            total: diagnosticsBundle.packets.total.total,
            visible: diagnosticsBundle.packets.visible,
          })}
        />
        <DiagnosticRow
          icon={Gauge}
          label={t("diagnostics.memory")}
          value={t("diagnostics.memoryValue", {
            limit: diagnosticsBundle.retention.packetLimit.toLocaleString(),
            retained: diagnosticsBundle.retention.retainedPacketCount.toLocaleString(),
          })}
        />
        <DiagnosticRow
          icon={Bot}
          label={t("diagnostics.aiProvider")}
          value={
            diagnosticsBundle.ai.enabled
              ? diagnosticsBundle.ai.configured
                ? t("diagnostics.aiConfigured", { provider: diagnosticsBundle.ai.provider })
                : t("diagnostics.aiNeedsSetup", { provider: diagnosticsBundle.ai.provider })
              : t("diagnostics.aiDisabled")
          }
        />
        <DiagnosticRow icon={Clock3} label={t("diagnostics.session")} mono value={diagnostics.activeSessionId ?? diagnostics.selectedSessionId ?? t("common.none")} />
        <DiagnosticRow
          icon={RotateCcw}
          label={t("diagnostics.reconnect")}
          value={
            diagnostics.lastReconnectAttemptAt
              ? t("diagnostics.reconnectAttempted", {
                  count: diagnostics.reconnectAttempts,
                  time: formatTime(diagnostics.lastReconnectAttemptAt),
                })
              : t("diagnostics.reconnectNotAttempted")
          }
        />
        {diagnostics.lastDisconnectReason ? (
          <DiagnosticRow icon={ServerCrash} label={t("diagnostics.lastClose")} value={diagnostics.lastDisconnectReason} />
        ) : null}
        {lastErrorNotice ? <ErrorNotice error={lastErrorNotice} /> : null}
      </div>
    </div>
  );
}

type DiagnosticRowProps = {
  icon: LucideIcon;
  label: string;
  mono?: boolean;
  value: string;
};

function DiagnosticRow({ icon: Icon, label, mono = false, value }: DiagnosticRowProps) {
  return (
    <div className="grid min-h-6 min-w-0 grid-cols-[minmax(5.75rem,0.82fr)_minmax(0,1fr)] items-center gap-2 rounded-sm px-0.5 text-muted-foreground">
      <span className="flex min-w-0 items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <span className={["min-w-0 truncate text-right font-medium text-foreground/90", mono ? "font-mono font-normal" : ""].join(" ")} title={value}>
        {value}
      </span>
    </div>
  );
}

function DiagnosticNotice({ children }: { children: string }) {
  return (
    <p className="mb-1 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[0.72rem] leading-5 text-muted-foreground">
      {children}
    </p>
  );
}
