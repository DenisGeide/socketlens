import { Activity, Cable, CircleDot, Eraser, RotateCcw, Settings, Sparkles, Square, Unplug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TopBarProps = {
  capturedCount: number;
  currentView: "settings" | "workspace";
  demoEndpointUrl: string;
  endpointUrl: string;
  isDemoActive: boolean;
  isInvestorDemoActive: boolean;
  isConnected: boolean;
  onClearCapturedFrames: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpenSettings: () => void;
  onOpenWorkspace: () => void;
  onResetInvestorDemo: () => void;
  onStartInvestorDemo: () => void;
  onStopDemo: () => void;
  status: string;
};

export function TopBar({
  capturedCount,
  currentView,
  demoEndpointUrl,
  endpointUrl,
  isDemoActive,
  isInvestorDemoActive,
  isConnected,
  onClearCapturedFrames,
  onConnect,
  onDisconnect,
  onOpenSettings,
  onOpenWorkspace,
  onResetInvestorDemo,
  onStartInvestorDemo,
  onStopDemo,
  status,
}: TopBarProps) {
  const { t } = useTranslation();
  const isBusy = status === "connecting";
  const canStartInvestorDemo = !isDemoActive && !isConnected && !isBusy;
  const statusLabel = isInvestorDemoActive ? t("status.investorDemo") : isDemoActive ? t("status.demo") : t(`status.${status}`, status);

  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-[0.68rem] font-bold text-primary">
          {t("app.logo")}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="sl-heading truncate text-xs font-semibold">{t("app.title")}</h1>
            <Badge variant={isConnected || isDemoActive ? "default" : "secondary"} className="capitalize">
              <CircleDot className="h-3 w-3" />
              {statusLabel}
            </Badge>
          </div>
          <p className="truncate font-mono text-[0.68rem] text-muted-foreground">
            {isDemoActive ? demoEndpointUrl : endpointUrl}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="sl-caption hidden items-center gap-1.5 rounded-md border border-border/70 bg-panel px-2 py-1 text-xs text-muted-foreground md:flex">
          <Activity className="h-3.5 w-3.5 text-accent" />
          {t("topbar.frames", { count: capturedCount })}
        </div>
        <Button variant="ghost" size="sm" disabled={capturedCount === 0} onClick={onClearCapturedFrames}>
          <Eraser className="h-4 w-4" />
          {t("actions.clear")}
        </Button>
        <Button
          variant={currentView === "settings" ? "secondary" : "ghost"}
          size="sm"
          onClick={currentView === "settings" ? onOpenWorkspace : onOpenSettings}
        >
          <Settings className="h-4 w-4" />
          {currentView === "settings" ? t("navigation.workspace") : t("navigation.settings")}
        </Button>
        {isInvestorDemoActive ? (
          <Button variant="ghost" size="sm" onClick={onResetInvestorDemo}>
            <RotateCcw className="h-4 w-4" />
            {t("actions.resetDemo")}
          </Button>
        ) : null}
        {isDemoActive ? (
          <Button variant="secondary" size="sm" onClick={onStopDemo}>
            <Square className="h-4 w-4" />
            {t("actions.stopDemo")}
          </Button>
        ) : (
          <Button size="sm" disabled={!canStartInvestorDemo} onClick={onStartInvestorDemo}>
            <Sparkles className="h-4 w-4" />
            {t("actions.startInvestorDemo")}
          </Button>
        )}
        {isConnected ? (
          <Button variant="secondary" size="sm" onClick={onDisconnect}>
            <Unplug className="h-4 w-4" />
            {t("actions.disconnect")}
          </Button>
        ) : (
          <Button size="sm" disabled={isBusy || isDemoActive} onClick={onConnect}>
            <Cable className="h-4 w-4" />
            {isBusy ? t("actions.connecting") : t("actions.connect")}
          </Button>
        )}
      </div>
    </div>
  );
}
