import { AlertCircle, Bug, CheckCircle2, ChevronDown, ChevronUp, CircleDot, Info, Trash2, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PanelContent, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { formatTime } from "@/lib/format";
import type { AppLog } from "@/models";
import { useSettingsStore } from "@/store/settings-store";

type LogPanelProps = {
  logs: AppLog[];
  onClearLogs: () => void;
  status: string;
};

export function LogPanel({ logs, onClearLogs, status }: LogPanelProps) {
  const { t } = useTranslation();
  const isCollapsed = useSettingsStore((state) => state.settings.logPanelCollapsed);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const visibleLogs = logs.filter((log) => log.level !== "debug");
  const latestLog = visibleLogs[0] ?? null;
  const errorCount = visibleLogs.filter((log) => log.level === "error").length;

  function setCollapsed(logPanelCollapsed: boolean) {
    updateSettings({ logPanelCollapsed });
  }

  if (isCollapsed) {
    return (
      <div className="flex h-full min-h-0 items-center justify-between gap-3 px-3 transition-all duration-200">
        <div className="flex min-w-0 items-center gap-2">
          <PanelTitle className="shrink-0">{t("logs.title")}</PanelTitle>
          <Badge variant="secondary" className="shrink-0 capitalize">
            <CircleDot className="h-3 w-3" />
            {t(`status.${status}`, status)}
          </Badge>
          {errorCount > 0 ? (
            <Badge variant="outline" className="shrink-0 border-destructive/40 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {t("logs.errors", { count: errorCount })}
            </Badge>
          ) : null}
          <span className="sl-caption min-w-0 truncate text-xs text-muted-foreground">
            {latestLog ? latestLog.message : t("logs.empty")}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setCollapsed(false)}>
          <ChevronUp className="h-4 w-4" />
          {t("logs.expand")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col transition-all duration-200">
      <PanelHeader>
        <div className="flex items-center gap-3">
          <PanelTitle>{t("logs.title")}</PanelTitle>
          <Badge variant="secondary" className="capitalize">
            <CircleDot className="h-3 w-3" />
            {t(`status.${status}`, status)}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {errorCount > 0 ? (
            <Badge variant="outline" className="border-destructive/40 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {t("logs.errors", { count: errorCount })}
            </Badge>
          ) : null}
          <Button variant="ghost" size="sm" disabled={visibleLogs.length === 0} onClick={onClearLogs}>
            <Trash2 className="h-4 w-4" />
            {t("logs.clear")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(true)}>
            <ChevronDown className="h-4 w-4" />
            {t("logs.collapse")}
          </Button>
        </div>
      </PanelHeader>
      <PanelContent className="min-h-0 flex-1 overflow-auto p-0">
        {visibleLogs.length === 0 ? (
          <div className="sl-caption flex h-full min-h-20 items-center justify-center text-xs text-muted-foreground">
            {t("logs.empty")}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {visibleLogs.slice(0, 20).map((log) => (
              <div key={log.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 px-3 py-1.5">
                <LogIcon level={log.level} />
                <p className="sl-caption min-w-0 truncate text-xs text-foreground/90">{log.message}</p>
                <time className="font-mono text-xs text-muted-foreground">{formatTime(log.timestamp)}</time>
              </div>
            ))}
          </div>
        )}
      </PanelContent>
    </div>
  );
}

function LogIcon({ level }: { level: AppLog["level"] }) {
  if (level === "debug") {
    return <Bug className="h-4 w-4 text-muted-foreground" />;
  }

  if (level === "success") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  }

  if (level === "warning") {
    return <TriangleAlert className="h-4 w-4 text-amber-300" />;
  }

  if (level === "error") {
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  }

  return <Info className="h-4 w-4 text-primary" />;
}
