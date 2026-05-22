import { useMemo, useState } from "react";
import {
  Braces,
  FileText,
  History,
  KeyRound,
  ListRestart,
  MessageSquareText,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/error-notice";
import { PanelContent, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { formatBytes, formatTime } from "@/lib/format";
import { getPacketSummary, truncatePreview } from "@/lib/packet-inspection";
import { createTechnicalDetails, createUserFacingError, type UserFacingError } from "@/lib/user-facing-errors";
import type { Packet, ReplayHistoryItem, SendSource } from "@/models";
import type { ComposerMode, CreateToastInput } from "@/store/ui-store";

type SendPayloadOptions = {
  clearDraft?: boolean;
  source?: SendSource;
  sourcePacketId?: string | null;
};

type ExamplePayloadId = "auth" | "chat" | "ping";

const examplePayloads = [
  {
    icon: SendHorizontal,
    id: "ping",
    labelKey: "manualSend.examples.ping",
  },
  {
    icon: KeyRound,
    id: "auth",
    labelKey: "manualSend.examples.auth",
  },
  {
    icon: MessageSquareText,
    id: "chat",
    labelKey: "manualSend.examples.chat",
  },
] as const satisfies Array<{ icon: typeof SendHorizontal; id: ExamplePayloadId; labelKey: string }>;

type ManualSendPanelProps = {
  composerError: string | null;
  composerMode: ComposerMode;
  isConnected: boolean;
  messageDraft: string;
  onClearReplayHistory: () => void;
  onLoadSamplePayload: () => void;
  onNotifyError: (toast: CreateToastInput) => void;
  onSendPayload: (payload: string, options?: SendPayloadOptions) => boolean;
  onSetComposerDraft: (messageDraft: string) => void;
  onSetComposerError: (composerError: string | null) => void;
  onSetComposerMode: (composerMode: ComposerMode) => void;
  outgoingPackets: Packet[];
  replayHistory: ReplayHistoryItem[];
  showHeader?: boolean;
};

export function ManualSendPanel({
  composerError,
  composerMode,
  isConnected,
  messageDraft,
  onClearReplayHistory,
  onLoadSamplePayload,
  onNotifyError,
  onSendPayload,
  onSetComposerDraft,
  onSetComposerError,
  onSetComposerMode,
  outgoingPackets,
  replayHistory,
  showHeader = true,
}: ManualSendPanelProps) {
  const { t } = useTranslation();
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);
  const [composerErrorNotice, setComposerErrorNotice] = useState<UserFacingError | null>(null);
  const selectedPacket = useMemo(
    () => outgoingPackets.find((packet) => packet.id === selectedPacketId) ?? null,
    [outgoingPackets, selectedPacketId],
  );
  const recentOutgoingPackets = outgoingPackets.slice(0, 6);
  const visibleReplayHistory = replayHistory.slice(0, 5);

  function handleModeChange(mode: ComposerMode) {
    onSetComposerMode(mode);
    onSetComposerError(null);
    setComposerErrorNotice(null);
  }

  function handleDraftChange(nextDraft: string) {
    onSetComposerDraft(nextDraft);
    onSetComposerError(null);
    setComposerErrorNotice(null);
  }

  function handleLoadSamplePayload() {
    onLoadSamplePayload();
    onSetComposerMode("json");
    onSetComposerError(null);
    setComposerErrorNotice(null);
    setSelectedPacketId(null);
  }

  function handleLoadExamplePayload(exampleId: ExamplePayloadId) {
    onSetComposerDraft(createExamplePayload(exampleId));
    onSetComposerMode("json");
    onSetComposerError(null);
    setComposerErrorNotice(null);
    setSelectedPacketId(null);
  }

  function handleFormatJson() {
    const formatted = formatJson(messageDraft, t("manualSend.errors.invalidJson"));

    if (!formatted.ok) {
      showComposerError(formatted);
      return;
    }

    onSetComposerDraft(formatted.payload);
    onSetComposerMode("json");
    onSetComposerError(null);
    setComposerErrorNotice(null);
  }

  function handleLoadPacket(packet: Packet) {
    setSelectedPacketId(packet.id);
    onSetComposerMode(packet.payloadKind === "json" ? "json" : "raw");
    onSetComposerDraft(formatPayloadForEditor(packet.payload, packet.payloadKind === "json"));
    onSetComposerError(null);
    setComposerErrorNotice(null);
  }

  function handleSendDraft(source: SendSource = "manual") {
    const preparedPayload = preparePayload(messageDraft, composerMode, {
      empty: t("manualSend.errors.emptyPayload"),
      invalidJson: t("manualSend.errors.invalidJson"),
    });

    if (!preparedPayload.ok) {
      showComposerError(preparedPayload);
      return;
    }

    const sent = onSendPayload(preparedPayload.payload, {
      clearDraft: true,
      source,
      sourcePacketId: source === "replay" ? selectedPacketId : null,
    });

    if (sent) {
      setSelectedPacketId(null);
      onSetComposerError(null);
      setComposerErrorNotice(null);
    }
  }

  function handleReplayPacket(packet: Packet) {
    if (!isConnected) {
      showComposerError({
        kind: "connectionFailure",
        message: t("manualSend.errors.connectBeforeReplayPackets"),
        ok: false,
      });
      return;
    }

    const sent = onSendPayload(packet.payload, {
      clearDraft: false,
      source: "replay",
      sourcePacketId: packet.id,
    });

    if (sent) {
      setSelectedPacketId(packet.id);
      onSetComposerError(null);
      setComposerErrorNotice(null);
    }
  }

  function handleReplayHistoryItem(item: ReplayHistoryItem) {
    if (!isConnected) {
      showComposerError({
        kind: "connectionFailure",
        message: t("manualSend.errors.connectBeforeReplayHistory"),
        ok: false,
      });
      return;
    }

    const sent = onSendPayload(item.payload, {
      clearDraft: false,
      source: "replay",
      sourcePacketId: item.sourcePacketId,
    });

    if (sent) {
      onSetComposerError(null);
      setComposerErrorNotice(null);
    }
  }

  function showComposerError(error: Extract<PayloadPreparationResult, { ok: false }>) {
    const issue = createUserFacingError(error.kind, t, {
      message: error.message,
      technicalDetails: createTechnicalDetails("Manual send validation failed", {
        draftLength: messageDraft.length,
        mode: composerMode,
        reason: error.kind,
      }),
    });

    setComposerErrorNotice(issue);
    onSetComposerError(issue.message);

    if (error.kind === "malformedJson") {
      onNotifyError({
        details: issue.technicalDetails,
        level: "warning",
        message: issue.suggestion,
        title: issue.title,
      });
    }
  }

  return (
    <div className={showHeader ? "border-y border-border/70 bg-panel/60" : ""}>
      {showHeader ? (
        <PanelHeader>
          <PanelTitle>{t("manualSend.title")}</PanelTitle>
          <Button variant="ghost" size="sm" onClick={handleLoadSamplePayload}>
            <Sparkles className="h-4 w-4" />
            {t("manualSend.sample")}
          </Button>
        </PanelHeader>
      ) : null}
      <PanelContent className="space-y-2.5 px-2.5">
        <div className="rounded-md border border-primary/20 bg-primary/10 p-2">
          <div className="mb-2">
            <p className="sl-section-label text-xs font-semibold uppercase text-primary">{t("manualSend.examples.title")}</p>
            <p className="sl-caption mt-1 line-clamp-2 text-[0.72rem] text-muted-foreground">{t("manualSend.examples.description")}</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {examplePayloads.map((example) => {
              const Icon = example.icon;

              return (
                <Button
                  key={example.id}
                  variant="ghost"
                  size="sm"
                  className="min-w-0 justify-center px-1.5"
                  onClick={() => handleLoadExamplePayload(example.id)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">{t(example.labelKey)}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <ModeButton active={composerMode === "json"} icon={Braces} label={t("manualSend.mode.json")} onClick={() => handleModeChange("json")} />
          <ModeButton active={composerMode === "raw"} icon={FileText} label={t("manualSend.mode.raw")} onClick={() => handleModeChange("raw")} />
          <Button
            variant="ghost"
            size="sm"
            className="col-span-2 justify-start"
            disabled={messageDraft.trim().length === 0}
            onClick={handleFormatJson}
          >
            <Wand2 className="h-4 w-4" />
            {t("manualSend.formatJson")}
          </Button>
        </div>

        <Textarea
          className="min-h-20 resize-none font-mono text-xs leading-5"
          value={messageDraft}
          placeholder={composerMode === "json" ? t("manualSend.placeholder.json") : t("manualSend.placeholder.raw")}
          spellCheck={false}
          onChange={(event) => handleDraftChange(event.target.value)}
        />

        {composerErrorNotice ? (
          <ErrorNotice error={composerErrorNotice} />
        ) : composerError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{composerError}</p>
        ) : null}

        <div className="grid grid-cols-1 gap-1.5 2xl:grid-cols-2">
          <Button className="min-w-0 whitespace-normal px-2 leading-4" disabled={!isConnected || !messageDraft.trim()} onClick={() => handleSendDraft("manual")}>
            <SendHorizontal className="h-4 w-4 shrink-0" />
            <span className="min-w-0 text-balance">{t("manualSend.sendFrame")}</span>
          </Button>
          <Button
            variant="secondary"
            className="min-w-0 whitespace-normal px-2 leading-4"
            disabled={!isConnected || !selectedPacket || !messageDraft.trim()}
            onClick={() => handleSendDraft("replay")}
          >
            <RotateCcw className="h-4 w-4 shrink-0" />
            <span className="min-w-0 text-balance">{t("manualSend.replayEdited")}</span>
          </Button>
        </div>

        <div className="space-y-2 rounded-md border border-border/70 bg-muted/15 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="sl-section-label inline-flex min-w-0 items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <ListRestart className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">{t("manualSend.previousOutgoing")}</span>
            </p>
            <Badge variant="secondary">{outgoingPackets.length}</Badge>
          </div>
          {recentOutgoingPackets.length === 0 ? (
            <p className="sl-copy rounded-md border border-dashed border-border/70 px-3 py-3 text-xs text-muted-foreground">
              {t("manualSend.previousOutgoingEmpty")}
            </p>
          ) : (
            <div className="max-h-36 space-y-1.5 overflow-auto pr-1">
              {recentOutgoingPackets.map((packet) => (
                <OutgoingPacketReplayRow
                  key={packet.id}
                  disabled={!isConnected}
                  packet={packet}
                  selected={packet.id === selectedPacketId}
                  onLoadPacket={handleLoadPacket}
                  onReplayPacket={handleReplayPacket}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-md border border-border/70 bg-muted/15 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="sl-section-label inline-flex min-w-0 items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <History className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">{t("manualSend.replayHistory")}</span>
            </p>
            <Button variant="ghost" size="sm" className="shrink-0 px-2" disabled={replayHistory.length === 0} onClick={onClearReplayHistory}>
              <Trash2 className="h-4 w-4" />
              {t("actions.clear")}
            </Button>
          </div>
          {visibleReplayHistory.length === 0 ? (
            <p className="sl-copy rounded-md border border-dashed border-border/70 px-3 py-3 text-xs text-muted-foreground">
              {t("manualSend.replayHistoryEmpty")}
            </p>
          ) : (
            <div className="max-h-32 space-y-1.5 overflow-auto pr-1">
              {visibleReplayHistory.map((item) => (
                <ReplayHistoryRow
                  key={item.id}
                  disabled={!isConnected}
                  item={item}
                  onReplayHistoryItem={handleReplayHistoryItem}
                  onUseHistoryItem={(historyItem) => {
                    onSetComposerDraft(formatPayloadForEditor(historyItem.payload, historyItem.payloadKind === "json"));
                    onSetComposerMode(historyItem.payloadKind === "json" ? "json" : "raw");
                    onSetComposerError(null);
                    setSelectedPacketId(historyItem.sourcePacketId);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </PanelContent>
    </div>
  );
}

type ModeButtonProps = {
  active: boolean;
  icon: typeof Braces;
  label: string;
  onClick: () => void;
};

function ModeButton({ active, icon: Icon, label, onClick }: ModeButtonProps) {
  return (
    <Button variant={active ? "secondary" : "ghost"} size="sm" className="min-w-0 px-2" onClick={onClick}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </Button>
  );
}

type OutgoingPacketReplayRowProps = {
  disabled: boolean;
  onLoadPacket: (packet: Packet) => void;
  onReplayPacket: (packet: Packet) => void;
  packet: Packet;
  selected: boolean;
};

function OutgoingPacketReplayRow({
  disabled,
  onLoadPacket,
  onReplayPacket,
  packet,
  selected,
}: OutgoingPacketReplayRowProps) {
  const { t } = useTranslation();
  const summary = getPacketSummary(packet);

  return (
    <div className={["rounded-md border p-2", selected ? "border-primary/60 bg-primary/10" : "border-border/70 bg-panel/50"].join(" ")}>
      <button type="button" className="block w-full text-left" onClick={() => onLoadPacket(packet)}>
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-xs text-foreground">{summary.eventName}</span>
          <span className="shrink-0 text-[0.72rem] text-muted-foreground">{formatTime(packet.timestamp)}</span>
        </span>
        <span className="mt-1 block truncate font-mono text-[0.72rem] text-muted-foreground">{summary.preview}</span>
        <span className="mt-1 block text-[0.72rem] text-muted-foreground">{formatBytes(packet.sizeBytes)}</span>
      </button>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Button variant="ghost" size="sm" className="min-w-0 px-2" onClick={() => onLoadPacket(packet)}>
          <span className="truncate">{t("manualSend.edit")}</span>
        </Button>
        <Button variant="secondary" size="sm" className="min-w-0 px-2" disabled={disabled} onClick={() => onReplayPacket(packet)}>
          <RotateCcw className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("manualSend.replay")}</span>
        </Button>
      </div>
    </div>
  );
}

type ReplayHistoryRowProps = {
  disabled: boolean;
  item: ReplayHistoryItem;
  onReplayHistoryItem: (item: ReplayHistoryItem) => void;
  onUseHistoryItem: (item: ReplayHistoryItem) => void;
};

function ReplayHistoryRow({ disabled, item, onReplayHistoryItem, onUseHistoryItem }: ReplayHistoryRowProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-md border border-border/70 bg-panel/50 p-2">
      <button type="button" className="block w-full text-left" onClick={() => onUseHistoryItem(item)}>
        <span className="flex items-center justify-between gap-2">
          <span className="sl-heading text-xs font-medium">{t(`manualSend.source.${item.source}`)}</span>
          <span className="shrink-0 text-[0.72rem] text-muted-foreground">{formatTime(item.sentAt)}</span>
        </span>
        <span className="mt-1 block truncate font-mono text-[0.72rem] text-muted-foreground">
          {truncatePreview(item.payload.replace(/\s+/g, " "), 90)}
        </span>
        <span className="mt-1 block text-[0.72rem] text-muted-foreground">{formatBytes(item.sizeBytes)}</span>
      </button>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Button variant="ghost" size="sm" className="min-w-0 px-2" onClick={() => onUseHistoryItem(item)}>
          <span className="truncate">{t("manualSend.use")}</span>
        </Button>
        <Button variant="secondary" size="sm" className="min-w-0 px-2" disabled={disabled} onClick={() => onReplayHistoryItem(item)}>
          <RotateCcw className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("manualSend.replay")}</span>
        </Button>
      </div>
    </div>
  );
}

type PayloadPreparationResult =
  | {
      ok: true;
      payload: string;
    }
  | {
      kind: "connectionFailure" | "malformedJson" | "unknown";
      message: string;
      ok: false;
    };

function preparePayload(payload: string, mode: ComposerMode, messages: { empty: string; invalidJson: string }): PayloadPreparationResult {
  if (payload.trim().length === 0) {
    return {
      kind: "unknown",
      message: messages.empty,
      ok: false,
    };
  }

  return mode === "json" ? formatJson(payload, messages.invalidJson) : { ok: true, payload };
}

function formatJson(payload: string, invalidJsonMessage: string): PayloadPreparationResult {
  try {
    return {
      ok: true,
      payload: JSON.stringify(JSON.parse(payload), null, 2),
    };
  } catch {
    return {
      kind: "malformedJson",
      message: invalidJsonMessage,
      ok: false,
    };
  }
}

function formatPayloadForEditor(payload: string, shouldFormatJson: boolean) {
  if (!shouldFormatJson) {
    return payload;
  }

  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

function createExamplePayload(exampleId: ExamplePayloadId) {
  const payloads = {
    auth: {
      client: "socketlens",
      token: "demo-token-not-secret",
      type: "auth.login",
      userId: "developer_123",
    },
    chat: {
      message: "Hello from SocketLens",
      roomId: "local-demo",
      sentAt: new Date().toISOString(),
      type: "chat.message",
    },
    ping: {
      command: "ping",
    },
  } satisfies Record<ExamplePayloadId, Record<string, string>>;

  return JSON.stringify(payloads[exampleId], null, 2);
}
