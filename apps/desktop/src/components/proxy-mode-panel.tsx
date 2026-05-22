import { AlertCircle, CheckCircle2, Copy, Info, Loader2, Network, Play, RadioTower, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/error-notice";
import { Input } from "@/components/ui/input";
import { localEchoServerUrl } from "@/config/runtime-defaults";
import type { NativeBackendState, ProxyStatus } from "@/lib/tauri-commands";
import type { UserFacingError } from "@/lib/user-facing-errors";

type ProxyModePanelProps = {
  backendState: NativeBackendState;
  error: UserFacingError | null;
  isBusy: boolean;
  onCopyProxyUrl: () => void;
  onStartProxy: () => void;
  onStopProxy: () => void;
  onTargetUrlChange: (targetUrl: string) => void;
  packetCount: number;
  proxyStatus: ProxyStatus | null;
  targetUrl: string;
};

export function ProxyModePanel({
  backendState,
  error,
  isBusy,
  onCopyProxyUrl,
  onStartProxy,
  onStopProxy,
  onTargetUrlChange,
  packetCount,
  proxyStatus,
  targetUrl,
}: ProxyModePanelProps) {
  const { t } = useTranslation();
  const isRunning = proxyStatus?.isRunning ?? false;
  const localProxyUrl = proxyStatus?.listenUrl ?? "";
  const canStart = backendState === "ready" && !isRunning && !isBusy;
  const canStop = backendState === "ready" && isRunning && !isBusy;
  const statusLabel = getProxyStatusLabel({ backendState, isBusy, isRunning });
  const StatusIcon = statusLabel.icon;

  return (
    <div className="rounded-md border border-border/80 bg-muted/20 p-2.5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="sl-section-label inline-flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
            <Network className="h-3.5 w-3.5" />
            {t("proxy.title")}
          </p>
          <p className="sl-copy mt-1 text-xs text-muted-foreground">{t("proxy.description")}</p>
        </div>
        <Badge variant={isRunning ? "default" : "outline"} className="shrink-0">
          <StatusIcon className="h-3 w-3" />
          {t(statusLabel.textKey)}
        </Badge>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1.5">
        <MetricTile label={t("proxy.metrics.status")} value={t(statusLabel.shortTextKey)} />
        <MetricTile label={t("proxy.metrics.clients")} value={String(proxyStatus?.activeConnections ?? 0)} />
        <MetricTile label={t("proxy.metrics.packets")} value={String(packetCount)} />
      </div>

      <label className="sl-caption space-y-2 text-xs font-medium text-muted-foreground">
        {t("proxy.targetUrl")}
        <Input
          disabled={isRunning || isBusy}
          value={targetUrl}
          placeholder={localEchoServerUrl}
          spellCheck={false}
          onChange={(event) => onTargetUrlChange(event.target.value)}
        />
      </label>

      {isRunning && proxyStatus?.targetUrl ? (
        <div className="mt-2 rounded-md border border-border/70 bg-background/60 px-2.5 py-1.5">
          <p className="sl-section-label text-[0.65rem] font-medium uppercase text-muted-foreground">{t("proxy.forwardingTo")}</p>
          <p className="mt-1 truncate font-mono text-xs text-foreground">{proxyStatus.targetUrl}</p>
        </div>
      ) : null}

      <div className="mt-2 rounded-md border border-border/70 bg-background/70 p-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="sl-section-label inline-flex items-center gap-1 text-[0.72rem] font-medium uppercase text-muted-foreground">
            <RadioTower className="h-3 w-3" />
            {t("proxy.localProxyUrl")}
          </span>
          <Button variant="ghost" size="sm" disabled={!localProxyUrl} onClick={onCopyProxyUrl}>
            <Copy className="h-4 w-4" />
            {t("proxy.copyLocalUrl")}
          </Button>
        </div>
        <p className="truncate font-mono text-xs text-foreground">{localProxyUrl || t("proxy.localProxyUrlEmpty")}</p>
      </div>

      {backendState === "unavailable" ? (
        <InlineNotice title={t("proxy.nativeRequiredTitle")} message={t("proxy.nativeRequired")} />
      ) : null}

      {error ? <ErrorNotice className="mt-3" error={error} /> : null}

      <div className="mt-2 rounded-md border border-border/70 bg-muted/20 p-2.5">
        <p className="sl-section-label inline-flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          {t("proxy.limitations.title")}
        </p>
        <ul className="sl-copy mt-2 space-y-1.5 text-xs text-muted-foreground">
          <li>{t("proxy.limitations.desktop")}</li>
          <li>{t("proxy.limitations.localhost")}</li>
          <li>{t("proxy.limitations.frames")}</li>
        </ul>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" disabled={!canStart} onClick={onStartProxy}>
          {isBusy && !isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {t("proxy.start")}
        </Button>
        <Button variant="ghost" size="sm" disabled={!canStop} onClick={onStopProxy}>
          {isBusy && isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
          {t("proxy.stop")}
        </Button>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/60 px-2 py-2">
      <p className="sl-section-label text-[0.65rem] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-xs text-foreground">{value}</p>
    </div>
  );
}

function InlineNotice({ message, title }: { message: string; title: string }) {
  return (
    <div className="sl-copy mt-3 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-muted-foreground">
      <p className="sl-heading font-semibold text-amber-100">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function getProxyStatusLabel({
  backendState,
  isBusy,
  isRunning,
}: {
  backendState: NativeBackendState;
  isBusy: boolean;
  isRunning: boolean;
}) {
  if (backendState === "checking") {
    return { icon: Loader2, shortTextKey: "proxy.status.checkingShort", textKey: "proxy.status.checking" };
  }

  if (backendState === "unavailable") {
    return { icon: AlertCircle, shortTextKey: "proxy.status.desktopShort", textKey: "proxy.status.desktopRequired" };
  }

  if (backendState === "error") {
    return { icon: AlertCircle, shortTextKey: "proxy.status.errorShort", textKey: "proxy.status.backendError" };
  }

  if (isBusy) {
    return { icon: Loader2, shortTextKey: "proxy.status.workingShort", textKey: "proxy.status.working" };
  }

  if (isRunning) {
    return { icon: CheckCircle2, shortTextKey: "proxy.status.liveShort", textKey: "proxy.status.live" };
  }

  return { icon: RadioTower, shortTextKey: "proxy.status.readyShort", textKey: "proxy.status.ready" };
}
