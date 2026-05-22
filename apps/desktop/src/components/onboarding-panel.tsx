import { useEffect, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Filter,
  Network,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { localEchoServerCommand, localEchoServerUrl } from "@/config/runtime-defaults";
import type { AppOnboardingStepId, FilterState, Packet, ReplayHistoryItem } from "@/models";
import { addDismissedOnboardingCardId, isOnboardingCardDismissed, onboardingStepIds } from "@/models";
import { useSettingsStore } from "@/store/settings-store";

const quickStartStepIds = [
  "view-timeline",
  "open-inspector",
  "replay-packet",
  "filter-events",
] as const satisfies AppOnboardingStepId[];

type QuickStartOnboardingPanelProps = {
  canConnectEcho: boolean;
  canStartDemo: boolean;
  filterState: FilterState;
  isDemoActive: boolean;
  isInvestorDemoActive: boolean;
  onConnectEcho: () => void;
  onOpenDocs: () => void;
  onStartDemo: () => void;
  packets: Packet[];
  replayHistory: ReplayHistoryItem[];
  selectedPacket: Packet | null;
};

export function QuickStartOnboardingPanel({
  canConnectEcho,
  canStartDemo,
  filterState,
  isDemoActive,
  isInvestorDemoActive,
  onConnectEcho,
  onOpenDocs,
  onStartDemo,
  packets,
  replayHistory,
  selectedPacket,
}: QuickStartOnboardingPanelProps) {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const automaticCompletedStepIds = useMemo(
    () =>
      getAutomaticCompletedStepIds({
        filterState,
        isDemoActive,
        isInvestorDemoActive,
        packets,
        replayHistory,
        selectedPacket,
      }),
    [filterState, isDemoActive, isInvestorDemoActive, packets, replayHistory, selectedPacket],
  );
  const completedStepIds = useMemo(
    () => orderStepIds([...settings.onboarding.completedStepIds, ...automaticCompletedStepIds]),
    [automaticCompletedStepIds, settings.onboarding.completedStepIds],
  );
  const completedStepKey = completedStepIds.join("|");
  const persistedStepKey = settings.onboarding.completedStepIds.join("|");
  const completedStepSet = useMemo(() => new Set(completedStepIds), [completedStepIds]);
  const completedQuickSteps = quickStartStepIds.filter((stepId) => completedStepSet.has(stepId)).length;
  const isComplete = completedQuickSteps === quickStartStepIds.length;
  const progress = Math.round((completedQuickSteps / quickStartStepIds.length) * 100);

  useEffect(() => {
    if (completedStepKey === persistedStepKey) {
      return;
    }

    updateSettings({
      onboarding: {
        ...settings.onboarding,
        completedStepIds,
      },
    });
  }, [completedStepIds, completedStepKey, persistedStepKey, settings.onboarding, updateSettings]);

  useEffect(() => {
    if (!isComplete || settings.onboarding.dismissedAt !== null) {
      return;
    }

    updateSettings({
      onboarding: {
        completedStepIds,
        dismissedCardIds: settings.onboarding.dismissedCardIds,
        dismissedAt: Date.now(),
      },
    });
  }, [completedStepIds, isComplete, settings.onboarding.dismissedAt, settings.onboarding.dismissedCardIds, updateSettings]);

  if (settings.onboarding.dismissedAt !== null || isOnboardingCardDismissed(settings.onboarding, "quick-start") || isComplete) {
    return null;
  }

  function dismissOnboarding() {
    updateSettings({
      onboarding: {
        completedStepIds,
        dismissedCardIds: addDismissedOnboardingCardId(settings.onboarding.dismissedCardIds, "quick-start"),
        dismissedAt: Date.now(),
      },
    });
  }

  return (
    <section className="rounded-md border border-primary/30 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_42%),hsl(var(--background)/0.72)] p-2.5 shadow-[0_18px_48px_hsl(var(--background)/0.32)] transition">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="sl-section-label inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t("onboarding.quickStart.eyebrow")}
          </p>
          <h2 className="sl-heading mt-1 text-sm font-semibold text-foreground">{t("onboarding.quickStart.title")}</h2>
          <p className="sl-copy mt-1 text-xs leading-5 text-muted-foreground">{t("onboarding.quickStart.description")}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label={t("onboarding.dismiss")} title={t("onboarding.dismiss")} onClick={dismissOnboarding}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-2 rounded-md border border-primary/20 bg-primary/[0.06] p-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="sl-section-label text-[0.68rem] font-semibold uppercase text-primary">
            {t("onboarding.quickStart.progressLabel")}
          </span>
          <Badge variant="outline">{t("onboarding.quickStart.progress", { completed: completedQuickSteps, total: quickStartStepIds.length })}</Badge>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mb-2 space-y-1.5">
        <ChecklistItem
          completed={completedStepSet.has("view-timeline")}
          icon={Network}
          title={t("onboarding.quickStart.checklist.viewPackets.title")}
          description={t("onboarding.quickStart.checklist.viewPackets.description")}
        />
        <ChecklistItem
          completed={completedStepSet.has("open-inspector")}
          icon={FileSearch}
          title={t("onboarding.quickStart.checklist.inspectPayloads.title")}
          description={t("onboarding.quickStart.checklist.inspectPayloads.description")}
        />
        <ChecklistItem
          completed={completedStepSet.has("replay-packet")}
          icon={RotateCcw}
          title={t("onboarding.quickStart.checklist.replayMessages.title")}
          description={t("onboarding.quickStart.checklist.replayMessages.description")}
        />
        <ChecklistItem
          completed={completedStepSet.has("filter-events")}
          icon={Filter}
          title={t("onboarding.quickStart.checklist.filterEvents.title")}
          description={t("onboarding.quickStart.checklist.filterEvents.description")}
        />
      </div>

      <div className="grid gap-1.5">
        <Button size="sm" disabled={!canStartDemo} onClick={onStartDemo}>
          <Play className="h-4 w-4" />
          {t("onboarding.quickStart.actions.startDemo")}
        </Button>
        <Button variant="secondary" size="sm" disabled={!canConnectEcho} onClick={onConnectEcho}>
          <Network className="h-4 w-4" />
          {t("onboarding.quickStart.actions.connectEcho")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenDocs}>
          <ExternalLink className="h-4 w-4" />
          {t("onboarding.quickStart.actions.openDocs")}
        </Button>
      </div>

      <div className="mt-2 grid gap-1.5">
        <code className="truncate rounded-md bg-background/80 px-2 py-1.5 text-[0.68rem] text-foreground">{localEchoServerCommand}</code>
        <code className="truncate rounded-md bg-background/80 px-2 py-1.5 text-[0.68rem] text-foreground">{localEchoServerUrl}</code>
      </div>
    </section>
  );
}

type ChecklistItemProps = {
  completed: boolean;
  description: string;
  icon: LucideIcon;
  title: string;
};

function ChecklistItem({ completed, description, icon: Icon, title }: ChecklistItemProps) {
  return (
    <div
      className={[
        "grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-md border px-2 py-1.5 transition",
        completed
          ? "border-primary/35 bg-primary/10"
          : "border-border/70 bg-background/45 hover:border-primary/25 hover:bg-primary/[0.05]",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border",
          completed ? "border-primary/40 bg-primary/20 text-primary" : "border-border text-muted-foreground",
        ].join(" ")}
      >
        {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="sl-heading block text-xs font-semibold text-foreground">{title}</span>
        <span className="sl-caption mt-0.5 block text-[0.7rem] leading-4 text-muted-foreground">{description}</span>
      </span>
    </div>
  );
}

function getAutomaticCompletedStepIds({
  filterState,
  isDemoActive,
  isInvestorDemoActive,
  packets,
  replayHistory,
  selectedPacket,
}: {
  filterState: FilterState;
  isDemoActive: boolean;
  isInvestorDemoActive: boolean;
  packets: Packet[];
  replayHistory: ReplayHistoryItem[];
  selectedPacket: Packet | null;
}) {
  const completed = new Set<AppOnboardingStepId>();

  if (isDemoActive || isInvestorDemoActive || packets.length > 0) {
    completed.add("view-timeline");
  }

  if (selectedPacket) {
    completed.add("select-packet");
    completed.add("open-inspector");
  }

  if (replayHistory.some((item) => item.source === "replay")) {
    completed.add("replay-packet");
  }

  if (isFilterStateActive(filterState)) {
    completed.add("filter-events");
  }

  return [...completed];
}

function isFilterStateActive(filterState: FilterState) {
  return (
    filterState.direction !== "all" ||
    filterState.errorsOnly ||
    filterState.eventQuery.trim().length > 0 ||
    filterState.hideHeartbeat ||
    filterState.hidePingPong ||
    filterState.payloadKind !== "all" ||
    filterState.searchQuery.trim().length > 0 ||
    filterState.smartQuery.trim().length > 0
  );
}

function orderStepIds(stepIds: AppOnboardingStepId[]) {
  const stepSet = new Set(stepIds);

  return onboardingStepIds.filter((stepId) => stepSet.has(stepId));
}
