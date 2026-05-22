import {
  CheckCircle2,
  Circle,
  Eye,
  FileSearch,
  KeyRound,
  MessageSquareText,
  MousePointer2,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { investorDemoSteps } from "@/demo/investor-demo";
import { cn } from "@/lib/utils";
import type { InvestorDemoState } from "@/store/ui-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type InvestorDemoPanelProps = {
  canStart: boolean;
  investorDemo: InvestorDemoState;
  packetCount: number;
  onDismiss?: () => void;
  onReset: () => void;
  onStart: () => void;
};

export function InvestorDemoGuide({ canStart, investorDemo, packetCount, onReset, onStart }: InvestorDemoPanelProps) {
  const { t } = useTranslation();
  const currentStep = getCurrentStep(investorDemo.currentStepIndex);
  const currentStepText = getStepText(t, currentStep);
  const isComplete = investorDemo.isActive && investorDemo.completedAt !== null;
  const heroTitle = isComplete
    ? t("investorDemo.heroTitleComplete")
    : investorDemo.isActive
      ? t("investorDemo.heroTitleActive")
      : t("investorDemo.heroTitle");
  const progress = investorDemo.isActive
    ? `${Math.min(investorDemo.currentStepIndex + 1, investorDemoSteps.length)}/${investorDemoSteps.length}`
    : t("investorDemo.ready");

  return (
    <section className="border-b border-border/70 bg-panel/65 px-3 py-2">
      <div className="grid w-full gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)]">
        <div className="rounded-md border border-primary/25 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--panel))_42%,hsl(var(--accent)/0.08))] p-3 shadow-[0_10px_34px_hsl(var(--primary)/0.07)]">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="sl-section-label inline-flex items-center gap-2 text-xs font-semibold uppercase text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {t("investorDemo.modeTitle")}
              </p>
              <h2 className="sl-heading mt-1 text-base font-semibold tracking-normal text-foreground">{heroTitle}</h2>
              <p className="sl-copy mt-1 max-w-4xl text-xs text-muted-foreground">{t("investorDemo.heroDescription")}</p>
            </div>
            <Badge variant={investorDemo.isActive ? "default" : "outline"}>
              {isComplete
                ? t("investorDemo.status.complete")
                : investorDemo.isActive
                  ? t("investorDemo.status.playing")
                  : t("investorDemo.status.offline")}
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <InvestorDemoMetric icon={KeyRound} label={t("investorDemo.metrics.auth")} value={t("investorDemo.metrics.authValue")} />
            <InvestorDemoMetric icon={MessageSquareText} label={t("investorDemo.metrics.traffic")} value={t("investorDemo.metrics.trafficValue")} />
            <InvestorDemoMetric icon={FileSearch} label={t("investorDemo.metrics.aiPreview")} value={t("investorDemo.metrics.aiPreviewValue")} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button disabled={!canStart} onClick={onStart}>
              <Play className="h-4 w-4" />
              {t("actions.startInvestorDemo")}
            </Button>
            <Button variant="secondary" disabled={!investorDemo.isActive && packetCount === 0} onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
              {t("actions.resetDemo")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("investorDemo.privacyLine")}
            </span>
          </div>
        </div>

        <div className="rounded-md border border-border/70 bg-background/45 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="sl-section-label text-xs font-semibold uppercase text-muted-foreground">{t("investorDemo.guidedStory")}</p>
              <p className="sl-caption mt-1 text-xs text-muted-foreground">{t("investorDemo.stepsProgress", { progress })}</p>
            </div>
            <Badge variant="secondary">{t("topbar.frames", { count: packetCount })}</Badge>
          </div>

          <div className="rounded-md border border-primary/25 bg-primary/10 p-3">
            <p className="sl-caption mb-1 text-xs font-semibold text-primary">
              {isComplete
                ? t("investorDemo.stepState.readyToInspect")
                : investorDemo.isActive
                  ? t("investorDemo.stepState.current")
                  : t("investorDemo.stepState.first")}
            </p>
            <h3 className="sl-heading text-sm font-semibold text-foreground">{currentStepText.title}</h3>
            <p className="sl-copy mt-2 text-xs text-muted-foreground">{currentStepText.description}</p>
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <InvestorDemoWalkthroughCard
              icon={ShieldCheck}
              label={t("investorDemo.walkthrough.simulated.label")}
              title={t("investorDemo.walkthrough.simulated.title")}
              description={t("investorDemo.walkthrough.simulated.description")}
            />
            <InvestorDemoWalkthroughCard
              active={investorDemo.isActive}
              icon={MousePointer2}
              label={t("investorDemo.walkthrough.highlight.label")}
              title={t("investorDemo.walkthrough.highlight.title")}
              description={currentStepText.highlight}
            />
            <InvestorDemoWalkthroughCard
              icon={Eye}
              label={t("investorDemo.walkthrough.inspect.label")}
              title={t("investorDemo.walkthrough.inspect.title")}
              description={currentStepText.inspectHint}
            />
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {investorDemoSteps.map((step, index) => (
              <span
                key={step.id}
                className={cn(
                  "h-1.5 rounded-full transition",
                  investorDemo.isActive && index <= investorDemo.currentStepIndex
                    ? "bg-primary"
                    : "bg-muted",
                )}
                title={getStepText(t, step).title}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function InvestorDemoSidebarCard({ canStart, investorDemo, packetCount, onDismiss, onReset, onStart }: InvestorDemoPanelProps) {
  const { t } = useTranslation();
  const isComplete = investorDemo.isActive && investorDemo.completedAt !== null;

  return (
    <div className="rounded-md border border-primary/30 bg-[linear-gradient(180deg,hsl(var(--primary)/0.14),hsl(var(--panel)/0.48))] p-2.5 shadow-[0_10px_30px_hsl(var(--primary)/0.05)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
              <p className="sl-section-label inline-flex items-center gap-2 text-xs font-semibold uppercase text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t("investorDemo.sidebarTitle")}
          </p>
          <p className="sl-copy mt-1 text-xs text-muted-foreground">{t("investorDemo.sidebarDescription")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant={investorDemo.isActive ? "default" : "outline"}>
            {isComplete ? t("investorDemo.status.shortComplete") : investorDemo.isActive ? t("investorDemo.status.live") : t("status.demo")}
          </Badge>
          {onDismiss ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded text-muted-foreground/80 hover:border-primary/25 hover:bg-primary/10 hover:text-foreground"
              aria-label={t("onboarding.dismiss")}
              title={t("onboarding.dismiss")}
              onClick={onDismiss}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" disabled={!canStart} onClick={onStart}>
          <Play className="h-4 w-4" />
          {t("actions.startInvestorDemo")}
        </Button>
        <Button variant="ghost" size="sm" disabled={!investorDemo.isActive && packetCount === 0} onClick={onReset}>
          {isComplete ? <RefreshCw className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          {t("actions.reset")}
        </Button>
      </div>

      {investorDemo.isActive || packetCount > 0 ? (
        <div className="mt-2 max-h-44 space-y-1.5 overflow-auto pr-1">
          {investorDemoSteps.map((step, index) => {
            const completed = investorDemo.isActive && index < investorDemo.currentStepIndex;
            const active = investorDemo.isActive && index === investorDemo.currentStepIndex;
            const stepText = getStepText(t, step);

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-start gap-2 rounded-md border px-2 py-1.5",
                  active
                    ? "border-primary/45 bg-primary/15"
                    : "border-border/55 bg-background/35",
                )}
              >
                {completed || (isComplete && index <= investorDemo.currentStepIndex) ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                ) : active ? (
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                ) : (
                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0">
                  <span className="sl-heading block truncate text-xs font-medium text-foreground">{stepText.title}</span>
                  <span className="sl-caption mt-0.5 block text-[0.72rem] text-muted-foreground">{stepText.packetsLabel}</span>
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type InvestorDemoMetricProps = {
  icon: typeof KeyRound;
  label: string;
  value: string;
};

function InvestorDemoMetric({ icon: Icon, label, value }: InvestorDemoMetricProps) {
  return (
    <div className="rounded-md border border-border/70 bg-background/45 p-2.5">
      <p className="sl-heading flex items-center gap-2 text-xs font-semibold text-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </p>
      <p className="sl-caption mt-1 truncate text-xs text-muted-foreground">{value}</p>
    </div>
  );
}

type InvestorDemoWalkthroughCardProps = {
  active?: boolean;
  description: string;
  icon: typeof KeyRound;
  label: string;
  title: string;
};

function InvestorDemoWalkthroughCard({
  active = false,
  description,
  icon: Icon,
  label,
  title,
}: InvestorDemoWalkthroughCardProps) {
  return (
    <div
      className={cn(
        "min-h-[6rem] rounded-md border p-2.5 transition",
        active
          ? "border-primary/35 bg-primary/10 shadow-[0_10px_34px_hsl(var(--primary)/0.08)]"
          : "border-border/65 bg-background/35",
      )}
    >
      <p className="sl-section-label flex items-center gap-2 text-[0.72rem] font-semibold uppercase text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground")} />
        {label}
      </p>
      <h4 className="sl-heading mt-2 text-xs font-semibold text-foreground">{title}</h4>
      <p className="sl-copy mt-1 line-clamp-3 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function getCurrentStep(currentStepIndex: number) {
  const index = Math.min(Math.max(currentStepIndex, 0), investorDemoSteps.length - 1);
  const step = investorDemoSteps[index] ?? investorDemoSteps[0];

  if (!step) {
    throw new Error("Investor demo requires at least one step.");
  }

  return step;
}

function getStepText(t: ReturnType<typeof useTranslation>["t"], step: { id: string }) {
  return {
    description: t(`investorDemo.steps.${step.id}.description`),
    highlight: t(`investorDemo.steps.${step.id}.highlight`),
    inspectHint: t(`investorDemo.steps.${step.id}.inspectHint`),
    packetsLabel: t(`investorDemo.steps.${step.id}.packetsLabel`),
    title: t(`investorDemo.steps.${step.id}.title`),
  };
}
