import { useMemo, useState } from "react";
import { Bot, FileSearch, GitBranch, Loader2, Route, ScrollText, Settings, ShieldAlert, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/error-notice";
import { MarkdownResponse } from "@/components/markdown-response";
import { investorDemoEndpointUrl } from "@/demo/investor-demo";
import {
  runAiAnalysis,
  validateAiActionAvailability,
  validateAiProviderConfiguration,
  type AiAction,
  type AiAnalysisResult,
  type AiProviderError,
  type AiProviderValidation,
} from "@/lib/ai";
import { parseJsonPayload } from "@/lib/json-payload";
import { getPacketEventName, isErrorPacketFast } from "@/lib/packet-inspection";
import { createTechnicalDetails, createUserFacingError, type UserFacingError } from "@/lib/user-facing-errors";
import { translateAiProviderValidationMessage } from "@/lib/validation-messages";
import { redactUrlForDisplay, type AppAiProviderSettings, type Packet, type Session } from "@/models";
import { useSettingsStore } from "@/store/settings-store";
import { useUiStore } from "@/store/ui-store";

type AiAnalysisPanelProps = {
  packet: Packet | null;
  packets: Packet[];
  session: Session | null;
};

type AiPanelState =
  | {
      error: UserFacingError;
      kind: "error";
    }
  | {
      kind: "idle";
    }
  | {
      action: AiAction;
      kind: "loading";
    }
  | {
      kind: "result";
      result: AiAnalysisResult;
    };

type AiPanelAction = {
  action: AiAction;
  disabledReason: string | null;
  icon: LucideIcon;
  label: string;
};

export function AiAnalysisPanel({ packet, packets, session }: AiAnalysisPanelProps) {
  const { t } = useTranslation();
  const aiProvider = useSettingsStore((state) => state.settings.aiProvider);
  const addLog = useUiStore((state) => state.addLog);
  const addToast = useUiStore((state) => state.addToast);
  const [panelState, setPanelState] = useState<AiPanelState>({ kind: "idle" });
  const providerValidation = useMemo(() => validateAiProviderConfiguration(aiProvider), [aiProvider]);
  const providerLabel = useMemo(() => formatProviderLabel(aiProvider.provider, t), [aiProvider.provider, t]);
  const providerConfigured = aiProvider.provider !== "disabled" && providerValidation.ok;
  const demoExplanation = useMemo(
    () =>
      aiProvider.provider === "disabled" && packet && session?.endpointUrl === investorDemoEndpointUrl
        ? createInvestorDemoExplanation(packet, t)
        : null,
    [aiProvider.provider, packet, session?.endpointUrl, t],
  );
  const authReconnectPackets = useMemo(() => getAuthReconnectPackets(packets), [packets]);
  const aiActions = useMemo(
    () => createAiPanelActions({ authReconnectPackets, isLoading: panelState.kind === "loading", packet, packets, providerConfigured, t }),
    [authReconnectPackets, packet, packets, panelState.kind, providerConfigured, t],
  );

  async function handleRunAction(action: AiAction) {
    const input = createAiActionInput(action, { authReconnectPackets, packet, packets, session });

    if ((action === "explain-packet" || action === "explain-sequence") && !packet) {
      const issue = createUserFacingError("unknown", t, {
        message: t("ai.errors.noPacket"),
        suggestion: t("ai.errors.noPacketSuggestion"),
        technicalDetails: createTechnicalDetails("AI explain blocked", {
          reason: "no_packet_selected",
        }),
        title: t("ai.toasts.noPacket"),
      });

      setPanelState({ error: issue, kind: "error" });
      addToast({
        details: issue.technicalDetails,
        level: "warning",
        message: issue.suggestion,
        title: issue.title,
      });
      return;
    }

    if (input.packets.length === 0) {
      const issue = createUserFacingError("unknown", t, {
        message: t("ai.errors.noPackets"),
        suggestion: t("ai.errors.noPacketsSuggestion"),
        technicalDetails: createTechnicalDetails("AI analysis blocked", {
          action,
          reason: "no_packets_available",
        }),
        title: t("ai.toasts.noPackets"),
      });

      setPanelState({ error: issue, kind: "error" });
      addToast({
        details: issue.technicalDetails,
        level: "warning",
        message: issue.suggestion,
        title: issue.title,
      });
      return;
    }

    if (aiProvider.provider === "disabled") {
      const issue = createUserFacingError("aiProviderUnavailable", t, {
        message: t("ai.errors.disabled"),
        suggestion: t("ai.errors.disabledSuggestion"),
        technicalDetails: createTechnicalDetails("AI explain blocked", {
          provider: aiProvider.provider,
          reason: "provider_disabled",
        }),
        title: t("ai.toasts.disabled"),
      });

      setPanelState({ error: issue, kind: "error" });
      addToast({
        details: issue.technicalDetails,
        level: "warning",
        message: issue.suggestion,
        title: issue.title,
      });
      return;
    }

    const actionValidation = validateAiActionAvailability(aiProvider, input);

    if (!actionValidation.ok) {
      const issue = createUserFacingError("aiProviderUnavailable", t, {
        message: translateAiProviderValidationMessage(actionValidation.error.message, t),
        technicalDetails: createTechnicalDetails("AI action validation failed", {
          action,
          provider: aiProvider.provider,
          validationMessage: actionValidation.error.message,
        }),
        title: t("ai.toasts.notConfigured"),
      });

      setPanelState({ error: issue, kind: "error" });
      addToast({
        details: issue.technicalDetails,
        level: "warning",
        message: issue.suggestion,
        title: issue.title,
      });
      return;
    }

    if (!providerValidation.ok) {
      const issue = createUserFacingError("aiProviderUnavailable", t, {
        message: translateAiProviderValidationMessage(providerValidation.error.message, t),
        technicalDetails: createTechnicalDetails("AI provider validation failed", {
          provider: aiProvider.provider,
          validationMessage: providerValidation.error.message,
        }),
        title: t("ai.toasts.notConfigured"),
      });

      setPanelState({ error: issue, kind: "error" });
      addToast({
        details: issue.technicalDetails,
        level: "warning",
        message: issue.suggestion,
        title: issue.title,
      });
      return;
    }

    setPanelState({ action, kind: "loading" });

    const result = await runAiAnalysis(aiProvider, input);

    if (!result.ok) {
      const issue = formatAiRuntimeError(result.error, aiProvider, t);

      setPanelState({ error: issue, kind: "error" });
      addLog({
        level: "warning",
        message: issue.message,
        sessionId: session?.id ?? null,
      });
      addToast({
        details: issue.technicalDetails,
        level: "warning",
        message: issue.suggestion,
        title: issue.title,
      });
      return;
    }

    setPanelState({ kind: "result", result: result.data });
    addLog({
      connectionId: packet?.connectionId ?? session?.connectionId ?? null,
      level: "success",
      message: t("ai.logs.completed", { action: getAiActionLabel(action, t), provider: providerLabel }),
      sessionId: packet?.sessionId ?? session?.id ?? null,
    });
  }

  return (
    <section className="rounded-md border border-border/70 bg-background/45 p-2.5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            {t("ai.title")}
          </p>
          <p className="mt-1 text-[0.72rem] leading-4 text-muted-foreground">{t("ai.description")}</p>
        </div>
        <Badge variant={providerConfigured ? "secondary" : "outline"}>{providerLabel}</Badge>
      </div>

      <div className="mb-2 rounded-md border border-amber-300/25 bg-amber-300/10 px-2.5 py-1.5">
        <p className="flex items-start gap-2 text-[0.72rem] leading-5 text-amber-50/85">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-100" />
          {t("ai.privacyCopy")}
        </p>
      </div>

      <div className="mb-2 rounded-md border border-border/70 bg-muted/15 px-2.5 py-1.5">
        <p className="flex items-start gap-2 text-[0.72rem] leading-5 text-muted-foreground">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t("ai.uncertaintyNote")}
        </p>
      </div>

      <ProviderStateNotice validation={providerValidation} provider={aiProvider.provider} />

      {demoExplanation ? (
        <div className="mb-2 rounded-md border border-primary/25 bg-primary/10 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-primary">{t("ai.demo.resultTitle")}</p>
            <Badge variant="outline">{t("ai.demo.noProviderCalled")}</Badge>
          </div>
          <MarkdownResponse content={demoExplanation} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-1.5">
        {aiActions.map((item) => {
          const Icon = item.icon;
          const isLoading = panelState.kind === "loading" && panelState.action === item.action;

          return (
            <Button
              key={item.action}
              className="h-auto min-h-8 justify-start px-2 py-1.5 text-left text-[0.72rem] leading-4"
              variant="secondary"
              size="sm"
              disabled={Boolean(item.disabledReason)}
              title={item.disabledReason ?? item.label}
              onClick={() => void handleRunAction(item.action)}
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
              <span className="truncate">{isLoading ? t("ai.actions.running") : item.label}</span>
            </Button>
          );
        })}
      </div>

      {!packet ? (
        <p className="mt-3 rounded-md border border-border/70 bg-muted/15 px-3 py-2 text-xs leading-5 text-muted-foreground">
          {t("ai.empty")}
        </p>
      ) : null}

      {panelState.kind === "error" ? (
        <ErrorNotice className="mt-3" error={panelState.error} />
      ) : null}

      {panelState.kind === "loading" ? (
        <div className="mt-3 rounded-md border border-border/70 bg-muted/15 px-3 py-3 text-xs leading-5 text-muted-foreground">
          {t("ai.loading", { action: getAiActionLabel(panelState.action, t), provider: providerLabel })}
        </div>
      ) : null}

      {panelState.kind === "result" ? (
        <div className="mt-3 rounded-md border border-border/70 bg-code p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {t(getAiResultTitleKey(panelState.result.action))}
            </p>
            <Badge variant="outline">{panelState.result.model}</Badge>
          </div>
          <MarkdownResponse content={panelState.result.content} />
        </div>
      ) : null}
    </section>
  );
}

function createAiPanelActions({
  authReconnectPackets,
  isLoading,
  packet,
  packets,
  providerConfigured,
  t,
}: {
  authReconnectPackets: Packet[];
  isLoading: boolean;
  packet: Packet | null;
  packets: Packet[];
  providerConfigured: boolean;
  t: ReturnType<typeof useTranslation>["t"];
}): AiPanelAction[] {
  const disabledByProvider = providerConfigured ? null : t("ai.actionUnavailable.provider");

  return [
    {
      action: "explain-packet",
      disabledReason: getActionDisabledReason({
        baseReason: disabledByProvider,
        isLoading,
        packet,
        packets: packet ? [packet] : [],
        t,
      }),
      icon: FileSearch,
      label: t("ai.actions.explainPacket"),
    },
    {
      action: "explain-sequence",
      disabledReason: getActionDisabledReason({
        baseReason: disabledByProvider,
        isLoading,
        packet,
        packets: packet ? getSequencePackets(packet, packets) : [],
        t,
      }),
      icon: GitBranch,
      label: t("ai.actions.explainSequence"),
    },
    {
      action: "summarize-session",
      disabledReason: getActionDisabledReason({
        baseReason: disabledByProvider,
        isLoading,
        packet: null,
        packets,
        requiresPacket: false,
        t,
      }),
      icon: ScrollText,
      label: t("ai.actions.summarizeSession"),
    },
    {
      action: "explain-auth-reconnect-flow",
      disabledReason: getActionDisabledReason({
        baseReason: disabledByProvider,
        emptyReason: t("ai.actionUnavailable.noFlow"),
        isLoading,
        packet: null,
        packets: authReconnectPackets,
        requiresPacket: false,
        t,
      }),
      icon: Route,
      label: t("ai.actions.explainFlow"),
    },
  ];
}

function getActionDisabledReason({
  baseReason,
  emptyReason,
  isLoading,
  packet,
  packets,
  requiresPacket = true,
  t,
}: {
  baseReason: string | null;
  emptyReason?: string;
  isLoading: boolean;
  packet: Packet | null;
  packets: Packet[];
  requiresPacket?: boolean;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (isLoading) {
    return t("ai.actionUnavailable.loading");
  }

  if (baseReason) {
    return baseReason;
  }

  if (requiresPacket && !packet) {
    return t("ai.actionUnavailable.noPacket");
  }

  if (packets.length === 0) {
    return emptyReason ?? t("ai.actionUnavailable.noPackets");
  }

  return null;
}

function createAiActionInput(
  action: AiAction,
  {
    authReconnectPackets,
    packet,
    packets,
    session,
  }: {
    authReconnectPackets: Packet[];
    packet: Packet | null;
    packets: Packet[];
    session: Session | null;
  },
) {
  if (action === "explain-packet") {
    return {
      action,
      packet,
      packets: packet ? [packet] : [],
      session,
    };
  }

  if (action === "explain-sequence") {
    return {
      action,
      packet,
      packets: packet ? getSequencePackets(packet, packets) : [],
      session,
    };
  }

  if (action === "explain-auth-reconnect-flow") {
    return {
      action,
      packet: null,
      packets: authReconnectPackets,
      session,
    };
  }

  return {
    action,
    packet: null,
    packets,
    session,
  };
}

function getSequencePackets(packet: Packet, packets: Packet[]) {
  const sortedPackets = sortPacketsForSession(packets, packet.sessionId);
  const selectedIndex = sortedPackets.findIndex((candidate) => candidate.id === packet.id);

  if (selectedIndex < 0) {
    return [packet];
  }

  const start = Math.max(selectedIndex - 4, 0);
  const end = Math.min(selectedIndex + 5, sortedPackets.length);

  return sortedPackets.slice(start, end);
}

function getAuthReconnectPackets(packets: Packet[]) {
  return [...packets]
    .filter(isAuthReconnectPacket)
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(-40);
}

function sortPacketsForSession(packets: Packet[], sessionId: string) {
  return packets
    .filter((candidate) => candidate.sessionId === sessionId)
    .sort((left, right) => left.timestamp - right.timestamp);
}

function isAuthReconnectPacket(packet: Packet) {
  const eventName = (getPacketEventName(packet) ?? "").toLowerCase();

  return (
    eventName.includes("auth") ||
    eventName.includes("challenge") ||
    eventName.includes("session") ||
    eventName.includes("login") ||
    eventName.includes("token") ||
    eventName.includes("reconnect") ||
    eventName.includes("resume") ||
    eventName.includes("connection.")
  );
}

function formatAiRuntimeError(
  error: AiProviderError,
  settings: AppAiProviderSettings,
  t: ReturnType<typeof useTranslation>["t"],
) : UserFacingError {
  const technicalDetails = createTechnicalDetails("AI provider request failed", {
    code: error.code,
    message: error.message,
    provider: settings.provider,
  });

  if (error.code !== "network_error") {
    return createUserFacingError("aiProviderUnavailable", t, {
      message: error.message,
      technicalDetails,
      title: t("ai.toasts.failed"),
    });
  }

  if (settings.provider === "ollama") {
    return createUserFacingError("aiProviderUnavailable", t, {
      message: t("ai.errors.ollamaNetwork", {
        baseUrl: redactProviderUrl(settings.ollama.baseUrl, t("common.notAvailable")),
      }),
      technicalDetails,
      title: t("ai.toasts.failed"),
    });
  }

  if (settings.provider === "openai-compatible") {
    return createUserFacingError("aiProviderUnavailable", t, {
      message: t("ai.errors.openAiNetwork", {
        baseUrl: redactProviderUrl(settings.openAiCompatible.baseUrl, t("common.notAvailable")),
      }),
      technicalDetails,
      title: t("ai.toasts.failed"),
    });
  }

  return createUserFacingError("aiProviderUnavailable", t, {
    message: error.message,
    technicalDetails,
    title: t("ai.toasts.failed"),
  });
}

function redactProviderUrl(value: string, fallback: string) {
  const trimmedValue = value.trim();

  return trimmedValue ? redactUrlForDisplay(trimmedValue) : fallback;
}

function ProviderStateNotice({ provider, validation }: { provider: string; validation: AiProviderValidation }) {
  const { t } = useTranslation();

  if (provider === "disabled") {
    return (
      <p className="mb-3 flex items-start gap-2 rounded-md border border-border/70 bg-muted/15 px-3 py-2 text-xs leading-5 text-muted-foreground">
        <Settings className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t("ai.providerState.disabled")}
      </p>
    );
  }

  if (!validation.ok) {
    return (
      <p className="mb-3 flex items-start gap-2 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-50/85">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-100" />
        {translateAiProviderValidationMessage(validation.error.message, t)}
      </p>
    );
  }

  return null;
}

function formatProviderLabel(provider: string, t: ReturnType<typeof useTranslation>["t"]) {
  if (provider === "openai-compatible") {
    return t("settings.ai.provider.openai");
  }

  return provider === "ollama" ? t("settings.ai.provider.ollama") : t("settings.ai.provider.disabled");
}

function getAiActionLabel(action: AiAction, t: ReturnType<typeof useTranslation>["t"]) {
  const labelKeys = {
    "detect-event-flow": "ai.actions.detectFlow",
    "explain-auth-reconnect-flow": "ai.actions.explainFlow",
    "explain-packet": "ai.actions.explainPacket",
    "explain-sequence": "ai.actions.explainSequence",
    "summarize-session": "ai.actions.summarizeSession",
  } satisfies Record<AiAction, string>;

  return t(labelKeys[action]);
}

function getAiResultTitleKey(action: AiAction) {
  const titleKeys = {
    "detect-event-flow": "ai.resultTitles.flow",
    "explain-auth-reconnect-flow": "ai.resultTitles.authReconnect",
    "explain-packet": "ai.resultTitles.packet",
    "explain-sequence": "ai.resultTitles.sequence",
    "summarize-session": "ai.resultTitles.session",
  } satisfies Record<AiAction, string>;

  return titleKeys[action];
}

function createInvestorDemoExplanation(packet: Packet, t: ReturnType<typeof useTranslation>["t"]) {
  const eventName = getPacketEventName(packet) ?? "unknown.event";
  const payloadSummary = summarizeDemoPayload(packet.payload, t);
  const suspiciousSignals = isErrorPacketFast(packet)
    ? t("ai.demo.suspiciousSignal")
    : t("ai.demo.noSuspiciousSignal");

  return [
    `### ${t("ai.demo.markdown.title")}`,
    `**${t("ai.demo.markdown.likelyPurposeLabel")}:** ${t("ai.demo.markdown.likelyPurpose")}`,
    `**${t("ai.demo.markdown.eventTypeLabel")}:** \`${eventName}\` ${t("ai.demo.markdown.directionPhrase", { direction: packet.direction })}`,
    `**${t("ai.demo.markdown.suspiciousErrorsLabel")}:** ${suspiciousSignals}`,
    `**${t("ai.demo.markdown.payloadSummaryLabel")}:** ${payloadSummary}`,
    `**${t("ai.demo.markdown.confidenceLabel")}:** ${t("ai.demo.markdown.confidence")}`,
  ].join("\n\n");
}

function summarizeDemoPayload(payload: string, t: ReturnType<typeof useTranslation>["t"]) {
  const parsed = parseJsonPayload(payload);

  if (!parsed.ok) {
    return t("ai.demo.payload.notJson");
  }

  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return t("ai.demo.payload.validJsonNotObject");
  }

  const objectPayload = parsed.value as Record<string, unknown>;

  const type = typeof objectPayload.type === "string" ? objectPayload.type : "JSON event";
  const keys = Object.keys(objectPayload).slice(0, 6).join(", ");

  return t("ai.demo.payload.objectSummary", { keys: keys || t("common.none"), type });
}
