import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Braces,
  Check,
  Clock3,
  Copy,
  FileText,
  Inbox,
  Ruler,
  Tag,
  TextCursorInput,
  Waypoints,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AiAnalysisPanel } from "@/components/ai-analysis-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PanelContent, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getPacketEventName, getPrettyPayload, truncatePreview } from "@/lib/packet-inspection";
import type { Packet, Session } from "@/models";

type PayloadInspectorProps = {
  packet: Packet | null;
  packets: Packet[];
  session: Session | null;
};

type InspectorTab = "pretty" | "raw" | "metadata";
type CopyState = "idle" | "copied" | "failed";

const renderedPayloadLimit = 200_000;

export function PayloadInspector({ packet, packets, session }: PayloadInspectorProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InspectorTab>("pretty");
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    setActiveTab("pretty");
    setCopyState("idle");
  }, [packet?.id]);

  const prettyPayload = useMemo(() => (packet ? getPrettyPayload(packet) : null), [packet]);
  const rawPayload = useMemo(() => (packet ? getRenderedPayload(packet.payload) : null), [packet]);
  const eventName = useMemo(() => (packet ? getPacketEventName(packet) : null), [packet]);

  async function copyPayload() {
    if (!packet) {
      return;
    }

    try {
      await copyText(packet.payload);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader className="min-h-[3.5rem] flex-wrap py-2">
        <div>
          <PanelTitle>{t("inspector.title")}</PanelTitle>
          {packet ? (
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{eventName ?? "unknown.event"}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{t("inspector.empty")}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {packet ? (
            <Badge
              variant="outline"
              className={
                packet.direction === "inbound"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-amber-300/30 bg-amber-300/10 text-amber-100"
              }
            >
              {packet.direction === "inbound" ? t("packets.direction.incoming") : t("packets.direction.outgoing")}
            </Badge>
          ) : null}
          <Button variant="ghost" size="sm" disabled={!packet} onClick={() => void copyPayload()}>
            {copyState === "copied" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copyState === "copied"
              ? t("inspector.copy.copied")
              : copyState === "failed"
                ? t("inspector.copy.failed")
                : t("inspector.copy.action")}
          </Button>
        </div>
      </PanelHeader>
      <PanelContent className="min-h-0 flex-1 overflow-hidden p-0">
        {!packet ? (
          <div className="h-full min-h-0 overflow-auto p-3">
            <EmptySelection />
            <AiAnalysisPanel packet={null} packets={packets} session={session} />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <InspectorSummary eventName={eventName ?? "unknown.event"} packet={packet} />
            <div className="flex shrink-0 gap-1 border-b border-border/70 p-1.5">
              <TabButton active={activeTab === "pretty"} label={t("inspector.tabs.pretty")} onClick={() => setActiveTab("pretty")} />
              <TabButton active={activeTab === "raw"} label={t("inspector.tabs.raw")} onClick={() => setActiveTab("raw")} />
              <TabButton active={activeTab === "metadata"} label={t("inspector.tabs.metadata")} onClick={() => setActiveTab("metadata")} />
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {activeTab === "pretty" ? <PrettyTab packet={packet} prettyPayload={prettyPayload} /> : null}
              {activeTab === "raw" ? <RawTab rawPayload={rawPayload} /> : null}
              {activeTab === "metadata" ? <MetadataTab eventName={eventName ?? "unknown.event"} packet={packet} /> : null}
              <div className="mt-4">
                <AiAnalysisPanel packet={packet} packets={packets} session={session} />
              </div>
            </div>
          </div>
        )}
      </PanelContent>
    </div>
  );
}

function EmptySelection() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center px-4 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-border/80 bg-background/60">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <h2 className="text-sm font-semibold">{t("inspector.emptySelection.title")}</h2>
      <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{t("inspector.emptySelection.description")}</p>
    </div>
  );
}

type InspectorSummaryProps = {
  eventName: string;
  packet: Packet;
};

function InspectorSummary({ eventName, packet }: InspectorSummaryProps) {
  const { t } = useTranslation();
  const directionLabel = packet.direction === "inbound" ? t("packets.direction.incoming") : t("packets.direction.outgoing");

  return (
    <div className="grid shrink-0 gap-1.5 border-b border-border/70 bg-background/30 p-2 sm:grid-cols-2">
      <InspectorSummaryItem icon={Tag} label={t("inspector.metadata.eventName")} value={eventName} />
      <InspectorSummaryItem
        icon={packet.direction === "inbound" ? ArrowDownLeft : ArrowUpRight}
        label={t("inspector.metadata.direction")}
        value={directionLabel}
      />
      <InspectorSummaryItem icon={Ruler} label={t("inspector.metadata.size")} value={formatBytes(packet.sizeBytes)} />
      <InspectorSummaryItem icon={Clock3} label={t("inspector.metadata.timestamp")} value={formatDateTime(packet.timestamp)} />
    </div>
  );
}

type InspectorSummaryItemProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

function InspectorSummaryItem({ icon: Icon, label, value }: InspectorSummaryItemProps) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-panel/60 px-2 py-1.5">
      <p className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}

type TabButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function TabButton({ active, label, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      className={[
        "rounded-md px-2.5 py-1 text-xs font-medium transition",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

type PrettyTabProps = {
  packet: Packet;
  prettyPayload: ReturnType<typeof getPrettyPayload> | null;
};

function PrettyTab({ packet, prettyPayload }: PrettyTabProps) {
  const { t } = useTranslation();

  if (!prettyPayload) {
    return null;
  }

  if (prettyPayload.kind !== "formatted") {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Badge variant="secondary">{t("inspector.badges.rawFallback")}</Badge>
        </div>
        <Notice message={t(`inspector.prettyMessages.${prettyPayload.kind}`)} />
        <PayloadCode value={getRenderedPayload(packet.payload).value} />
      </div>
    );
  }

  const rendered = getRenderedPayload(prettyPayload.formatted);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Badge variant="secondary">{t("inspector.badges.formattedJson")}</Badge>
      </div>
      {rendered.truncated ? <Notice message={t("inspector.notices.prettyTruncated")} /> : null}
      <PayloadCode value={rendered.value} />
    </div>
  );
}

type RawTabProps = {
  rawPayload: RenderedPayload | null;
};

function RawTab({ rawPayload }: RawTabProps) {
  const { t } = useTranslation();

  if (!rawPayload) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Badge variant="secondary">{t("inspector.badges.rawPayload")}</Badge>
      </div>
      {rawPayload.truncated ? <Notice message={t("inspector.notices.rawTruncated")} /> : null}
      <PayloadCode value={rawPayload.value} />
    </div>
  );
}

type MetadataTabProps = {
  eventName: string;
  packet: Packet;
};

function MetadataTab({ eventName, packet }: MetadataTabProps) {
  const { t } = useTranslation();
  const metadata = [
    { icon: Tag, label: t("inspector.metadata.eventName"), value: eventName },
    { icon: packet.direction === "inbound" ? ArrowDownLeft : ArrowUpRight, label: t("inspector.metadata.direction"), value: packet.direction },
    { icon: Clock3, label: t("inspector.metadata.timestamp"), value: formatDateTime(packet.timestamp) },
    { icon: Ruler, label: t("inspector.metadata.size"), value: formatBytes(packet.sizeBytes) },
    { icon: Braces, label: t("inspector.metadata.payloadKind"), value: packet.payloadKind },
    { icon: Waypoints, label: t("inspector.metadata.connectionId"), value: packet.connectionId },
    { icon: TextCursorInput, label: t("inspector.metadata.sessionId"), value: packet.sessionId },
    { icon: FileText, label: t("inspector.metadata.packetId"), value: packet.id },
  ] satisfies Array<{ icon: LucideIcon; label: string; value: string }>;

  return (
    <div className="grid gap-2">
      {metadata.map((item) => (
        <InspectorMetric key={item.label} icon={item.icon} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

type InspectorMetricProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

function InspectorMetric({ icon: Icon, label, value }: InspectorMetricProps) {
  return (
    <div className="rounded-md border border-border/70 bg-background/45 p-2.5">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="break-all font-mono text-xs text-foreground">{value}</p>
    </div>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className="flex gap-2 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function PayloadCode({ value }: { value: string }) {
  const { t } = useTranslation();
  const lineCount = value.length === 0 ? 0 : value.split("\n").length;

  return (
    <div className="overflow-hidden rounded-md border border-border/70 bg-code shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-background/35 px-2.5 py-1.5">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
          <Braces className="h-3.5 w-3.5 text-primary" />
          {t("inspector.code.payload")}
        </span>
        <span className="font-mono text-[0.72rem] text-muted-foreground">
          {t("inspector.code.lines", { count: lineCount })}
        </span>
      </div>
      <pre className="min-h-[14rem] overflow-auto p-2.5 font-mono text-xs leading-5 text-foreground">
        {value}
      </pre>
    </div>
  );
}

type RenderedPayload = {
  truncated: boolean;
  value: string;
};

function getRenderedPayload(payload: string): RenderedPayload {
  if (payload.length <= renderedPayloadLimit) {
    return {
      truncated: false,
      value: payload,
    };
  }

  return {
    truncated: true,
    value: truncatePreview(payload, renderedPayloadLimit),
  };
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Copy command failed.");
    }
  } finally {
    textarea.remove();
  }
}
