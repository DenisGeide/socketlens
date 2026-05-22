import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownUp,
  Check,
  CheckCircle2,
  Copy,
  FileSearch,
  ListChecks,
  Network,
  Play,
  RadioTower,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { localEchoServerCommand, localEchoServerUrl } from "@/config/runtime-defaults";
import { getJsonCommand, getJsonType } from "@/lib/json-payload";
import type { AppOnboardingStepId, Packet, ReplayHistoryItem } from "@/models";
import { onboardingStepIds } from "@/models";
import { useSettingsStore } from "@/store/settings-store";

type OnboardingPanelProps = {
  activeEndpointUrl: string;
  canConnectEcho: boolean;
  canReplayPing: boolean;
  canSendPing: boolean;
  canStartDemo: boolean;
  isConnected: boolean;
  isDemoActive: boolean;
  isInvestorDemoActive: boolean;
  onConnectEcho: () => void;
  onReplayPing: () => void;
  onSendPing: () => void;
  onStartDemo: () => void;
  packets: Packet[];
  replayHistory: ReplayHistoryItem[];
  selectedPacket: Packet | null;
};

export function OnboardingPanel({
  activeEndpointUrl,
  canConnectEcho,
  canReplayPing,
  canSendPing,
  canStartDemo,
  isConnected,
  isDemoActive,
  isInvestorDemoActive,
  onConnectEcho,
  onReplayPing,
  onSendPing,
  onStartDemo,
  packets,
  replayHistory,
  selectedPacket,
}: OnboardingPanelProps) {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const automaticCompletedStepIds = useMemo(
    () =>
      getAutomaticCompletedStepIds({
        activeEndpointUrl,
        isConnected,
        isDemoActive,
        isInvestorDemoActive,
        packets,
        replayHistory,
        selectedPacket,
      }),
    [activeEndpointUrl, isConnected, isDemoActive, isInvestorDemoActive, packets, replayHistory, selectedPacket],
  );
  const completedStepIds = useMemo(
    () => orderStepIds([...settings.onboarding.completedStepIds, ...automaticCompletedStepIds]),
    [automaticCompletedStepIds, settings.onboarding.completedStepIds],
  );
  const completedStepKey = completedStepIds.join("|");
  const persistedStepKey = settings.onboarding.completedStepIds.join("|");
  const completedStepSet = useMemo(() => new Set(completedStepIds), [completedStepIds]);
  const progress = Math.round((completedStepIds.length / onboardingStepIds.length) * 100);
  const nextStepId = onboardingStepIds.find((stepId) => !completedStepSet.has(stepId)) ?? null;

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

  if (settings.onboarding.dismissedAt !== null) {
    return null;
  }

  function completeManualStep(stepId: AppOnboardingStepId) {
    updateSettings({
      onboarding: {
        ...settings.onboarding,
        completedStepIds: orderStepIds([...completedStepIds, stepId]),
      },
    });
  }

  function dismissOnboarding() {
    updateSettings({
      onboarding: {
        completedStepIds,
        dismissedAt: Date.now(),
      },
    });
  }

  async function copyEchoServerCommand() {
    try {
      await navigator.clipboard.writeText(localEchoServerCommand);
      setCopiedCommand(true);
      window.setTimeout(() => setCopiedCommand(false), 1_600);
    } catch {
      setCopiedCommand(false);
    }
  }

  return (
    <section className="border-b border-border/70 bg-panel/70 px-3 py-2">
      <div className="w-full rounded-md border border-border/80 bg-background/55 p-3 shadow-[0_10px_36px_hsl(var(--background)/0.24)] transition">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="sl-section-label inline-flex items-center gap-2 text-xs font-semibold uppercase text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("onboarding.eyebrow")}
            </p>
            <h2 className="sl-heading mt-1 text-base font-semibold text-foreground">{t("onboarding.title")}</h2>
            <p className="sl-copy mt-1 max-w-5xl text-xs text-muted-foreground">{t("onboarding.description")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{t("onboarding.progress", { completed: completedStepIds.length, total: onboardingStepIds.length })}</Badge>
            <Button variant="ghost" size="sm" onClick={dismissOnboarding}>
              <X className="h-4 w-4" />
              {t("onboarding.dismiss")}
            </Button>
          </div>
        </div>

        <div className="mb-2 grid gap-2 md:grid-cols-3 xl:grid-cols-5">
          <ConceptCard
            icon={Zap}
            label={t("onboarding.modes.demo.title")}
            text={t("onboarding.modes.demo.description")}
          />
          <ConceptCard
            icon={ArrowDownUp}
            label={t("onboarding.modes.direct.title")}
            text={t("onboarding.modes.direct.description")}
          />
          <ConceptCard
            icon={RadioTower}
            label={t("onboarding.modes.proxy.title")}
            text={t("onboarding.modes.proxy.description")}
          />
          <ConceptCard
            icon={FileSearch}
            label={t("onboarding.concepts.inspector.title")}
            text={t("onboarding.concepts.inspector.description")}
          />
          <ConceptCard
            icon={RotateCcw}
            label={t("onboarding.concepts.replay.title")}
            text={t("onboarding.concepts.replay.description")}
          />
        </div>

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-md border border-primary/25 bg-primary/10 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="sl-section-label inline-flex items-center gap-2 text-xs font-semibold uppercase text-primary">
                  <ListChecks className="h-3.5 w-3.5" />
                  {t("onboarding.twoMinutes.title")}
                </p>
                <p className="sl-copy mt-1 text-xs text-muted-foreground">{t("onboarding.twoMinutes.description")}</p>
              </div>
              <Badge variant="outline">{progress}%</Badge>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 grid gap-1.5 md:grid-cols-2 2xl:grid-cols-3">
              {onboardingStepIds.map((stepId, index) => (
                <StepCard
                  key={stepId}
                  active={nextStepId === stepId}
                  completed={completedStepSet.has(stepId)}
                  index={index + 1}
                  subtitle={t(`onboarding.steps.${stepIdToTranslationPart(stepId)}.subtitle`)}
                  title={t(`onboarding.steps.${stepIdToTranslationPart(stepId)}.title`)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border/70 bg-panel/55 p-2.5">
            <p className="sl-section-label mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              {t("onboarding.actions.title")}
            </p>
            <div className="mb-2 grid gap-1.5">
              <code className="truncate rounded-md bg-background px-2 py-1.5 text-[0.72rem] text-foreground">{localEchoServerCommand}</code>
              <code className="truncate rounded-md bg-background px-2 py-1.5 text-[0.72rem] text-foreground">{localEchoServerUrl}</code>
            </div>
            <div className="grid gap-1.5">
              <Button size="sm" disabled={!canStartDemo || completedStepSet.has("start-demo")} onClick={onStartDemo}>
                <Play className="h-4 w-4" />
                {t("onboarding.actions.startDemo")}
              </Button>
              <div className="grid grid-cols-2 gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => void copyEchoServerCommand()}>
                  {copiedCommand ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedCommand ? t("onboarding.actions.copied") : t("onboarding.actions.copyCommand")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={completedStepSet.has("start-echo-server")}
                  onClick={() => completeManualStep("start-echo-server")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t("onboarding.actions.markStarted")}
                </Button>
              </div>
              <Button variant="secondary" size="sm" disabled={!canConnectEcho || completedStepSet.has("connect-echo-server")} onClick={onConnectEcho}>
                <Network className="h-4 w-4" />
                {t("onboarding.actions.connectEcho")}
              </Button>
              <div className="grid grid-cols-2 gap-1.5">
                <Button variant="ghost" size="sm" disabled={!canSendPing || completedStepSet.has("send-ping")} onClick={onSendPing}>
                  <SendHorizontal className="h-4 w-4" />
                  {t("onboarding.actions.sendPing")}
                </Button>
                <Button variant="ghost" size="sm" disabled={!canReplayPing || completedStepSet.has("replay-packet")} onClick={onReplayPing}>
                  <RotateCcw className="h-4 w-4" />
                  {t("onboarding.actions.replayPing")}
                </Button>
              </div>
              <p className="sl-caption text-[0.72rem] text-muted-foreground">{t("onboarding.actions.description")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type ConceptCardProps = {
  icon: LucideIcon;
  label: string;
  text: string;
};

function ConceptCard({ icon: Icon, label, text }: ConceptCardProps) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/15 p-2.5 transition hover:border-primary/25 hover:bg-primary/[0.06]">
      <p className="sl-heading inline-flex items-center gap-2 text-xs font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </p>
      <p className="sl-caption mt-1 line-clamp-2 text-[0.72rem] text-muted-foreground">{text}</p>
    </div>
  );
}

type StepCardProps = {
  active: boolean;
  completed: boolean;
  index: number;
  subtitle: string;
  title: string;
};

function StepCard({ active, completed, index, subtitle, title }: StepCardProps) {
  return (
    <div
      className={[
        "grid min-h-12 grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-md border px-2 py-1.5 transition",
        completed
          ? "border-primary/35 bg-primary/10 text-primary"
          : active
            ? "border-primary/50 bg-background/80 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]"
            : "border-border/70 bg-background/45 text-muted-foreground",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[0.65rem] font-semibold",
          completed
            ? "border-primary/40 bg-primary/20 text-primary"
            : active
              ? "animate-pulse border-primary/50 text-primary"
              : "border-border text-muted-foreground",
        ].join(" ")}
      >
        {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : index}
      </span>
      <span className="min-w-0">
        <span className="sl-heading block truncate text-[0.78rem] font-semibold text-foreground">{title}</span>
        <span className="sl-caption mt-0.5 block line-clamp-2 text-[0.7rem] leading-4 text-muted-foreground">{subtitle}</span>
      </span>
    </div>
  );
}

function getAutomaticCompletedStepIds({
  activeEndpointUrl,
  isConnected,
  isDemoActive,
  isInvestorDemoActive,
  packets,
  replayHistory,
  selectedPacket,
}: {
  activeEndpointUrl: string;
  isConnected: boolean;
  isDemoActive: boolean;
  isInvestorDemoActive: boolean;
  packets: Packet[];
  replayHistory: ReplayHistoryItem[];
  selectedPacket: Packet | null;
}) {
  const completed = new Set<AppOnboardingStepId>();

  if (isDemoActive || isInvestorDemoActive) {
    completed.add("start-demo");
  }

  if (packets.length > 0) {
    completed.add("view-timeline");
  }

  if (selectedPacket) {
    completed.add("select-packet");
    completed.add("open-inspector");
  }

  if (isConnected && activeEndpointUrl.trim() === localEchoServerUrl) {
    completed.add("connect-echo-server");
  }

  if (packets.some((packet) => packet.direction === "outbound" && getJsonCommand(packet.payload) === "ping")) {
    completed.add("send-ping");
  }

  if (packets.some((packet) => packet.direction === "inbound" && getJsonType(packet.payload) === "command.pong")) {
    completed.add("observe-pong");
  }

  if (replayHistory.some((item) => item.source === "replay")) {
    completed.add("replay-packet");
  }

  return [...completed];
}

function orderStepIds(stepIds: AppOnboardingStepId[]) {
  const stepSet = new Set(stepIds);

  return onboardingStepIds.filter((stepId) => stepSet.has(stepId));
}

function stepIdToTranslationPart(stepId: AppOnboardingStepId) {
  const parts = {
    "connect-echo-server": "connectEcho",
    "observe-pong": "observePong",
    "open-inspector": "openInspector",
    "replay-packet": "replay",
    "select-packet": "selectPacket",
    "send-ping": "sendPing",
    "start-demo": "startDemo",
    "start-echo-server": "startEcho",
    "view-timeline": "viewTimeline",
  } satisfies Record<AppOnboardingStepId, string>;

  return parts[stepId];
}
