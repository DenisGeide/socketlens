import { useMemo, useState } from "react";
import { Activity, Bug, Clipboard, Clock3, HardDrive, Link2, RadioTower, RotateCcw, ServerCrash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/error-notice";
import { formatTime } from "@/lib/format";
import { createUserFacingError } from "@/lib/user-facing-errors";
import { redactUrlForDisplay } from "@/models";

export type ConnectionDiagnostics = {
  activeSessionId: string | null;
  backendState: string;
  endpointUrl: string;
  lastDisconnectReason: string | null;
  lastError: string | null;
  lastErrorDetails: string | null;
  lastReconnectAttemptAt: number | null;
  mode: "demo" | "direct" | "proxy";
  proxyActiveConnections: number;
  proxyPacketCount: number;
  reconnectAttempts: number;
  selectedSessionId: string | null;
  socketReadyState: string;
  status: string;
};

type ConnectionDiagnosticsPanelProps = {
  diagnostics: ConnectionDiagnostics;
  showHeader?: boolean;
};

export function ConnectionDiagnosticsPanel({ diagnostics, showHeader = true }: ConnectionDiagnosticsPanelProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const redactedEndpointUrl = redactUrlForDisplay(diagnostics.endpointUrl);
  const diagnosticDetails = useMemo(() => createDiagnosticsReport(diagnostics), [diagnostics]);
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

  return (
    <div className="rounded-md border border-border/80 bg-muted/15 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        {showHeader ? (
          <p className="sl-section-label inline-flex min-w-0 items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Bug className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t("diagnostics.title")}</span>
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Badge variant={diagnostics.lastError ? "outline" : "secondary"} className={diagnostics.lastError ? "border-destructive/40 text-destructive" : ""}>
            {diagnostics.mode}
          </Badge>
          <Button variant="ghost" size="sm" className="min-w-0 px-2" title={copied ? t("diagnostics.copied") : t("diagnostics.copy")} onClick={handleCopyDiagnostics}>
            <Clipboard className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{copied ? t("diagnostics.copied") : t("diagnostics.copy")}</span>
          </Button>
        </div>
      </div>
      <div className="sl-caption grid gap-1.5 text-[0.72rem]">
        <DiagnosticRow icon={Activity} label={t("diagnostics.status")} value={diagnostics.status} />
        <DiagnosticRow icon={HardDrive} label={t("diagnostics.socket")} value={diagnostics.socketReadyState} />
        <DiagnosticRow icon={Link2} label={t("diagnostics.endpoint")} mono value={redactedEndpointUrl} />
        <DiagnosticRow icon={RadioTower} label={t("diagnostics.proxyClients")} value={`${diagnostics.proxyActiveConnections}`} />
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

function createDiagnosticsReport(diagnostics: ConnectionDiagnostics) {
  return JSON.stringify(
    {
      activeSessionId: diagnostics.activeSessionId,
      backendState: diagnostics.backendState,
      endpointUrl: redactUrlForDisplay(diagnostics.endpointUrl),
      lastDisconnectReason: diagnostics.lastDisconnectReason,
      lastError: diagnostics.lastError,
      lastErrorDetails: diagnostics.lastErrorDetails,
      lastReconnectAttemptAt: diagnostics.lastReconnectAttemptAt,
      mode: diagnostics.mode,
      proxyActiveConnections: diagnostics.proxyActiveConnections,
      proxyPacketCount: diagnostics.proxyPacketCount,
      reconnectAttempts: diagnostics.reconnectAttempts,
      selectedSessionId: diagnostics.selectedSessionId,
      socketReadyState: diagnostics.socketReadyState,
      status: diagnostics.status,
    },
    null,
    2,
  );
}

type DiagnosticRowProps = {
  icon: typeof Activity;
  label: string;
  mono?: boolean;
  value: string;
};

function DiagnosticRow({ icon: Icon, label, mono = false, value }: DiagnosticRowProps) {
  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(4.75rem,6.25rem)_minmax(0,1fr)] items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      <span className={["min-w-0 truncate text-right text-foreground/90", mono ? "font-mono" : ""].join(" ")} title={value}>
        {value}
      </span>
    </div>
  );
}
