import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Bookmark,
  Braces,
  Check,
  Clock3,
  Copy,
  Flag,
  FileText,
  GitBranch,
  Inbox,
  Link2,
  Maximize2,
  Plus,
  Ruler,
  Tag,
  TextCursorInput,
  Waypoints,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AiAnalysisPanel } from "@/components/ai-analysis-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelContent, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getPacketEventName, getPrettyPayload, truncatePreview } from "@/lib/packet-inspection";
import {
  getRelatedPacketId,
  type PacketRelationship,
  type PacketRelationshipIndex,
  type PacketRelationshipReason,
} from "@/lib/packet-relationships";
import { createPacketAnnotations, type Packet, type PacketAnnotations, type Session } from "@/models";

type PayloadInspectorProps = {
  onSelectRelatedPacket: (packetId: string) => void;
  onUpdatePacketAnnotations: (packetId: string, patch: Partial<PacketAnnotations>) => void;
  packet: Packet | null;
  packets: Packet[];
  relationshipIndex: PacketRelationshipIndex | null;
  session: Session | null;
};

type InspectorTab = "pretty" | "raw" | "metadata";
type CopyState = "idle" | "copied" | "failed";

const renderedPayloadLimit = 200_000;

export function PayloadInspector({
  onSelectRelatedPacket,
  onUpdatePacketAnnotations,
  packet,
  packets,
  relationshipIndex,
  session,
}: PayloadInspectorProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InspectorTab>("pretty");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [largeViewOpen, setLargeViewOpen] = useState(false);

  useEffect(() => {
    setActiveTab("pretty");
    setCopyState("idle");
    setLargeViewOpen(false);
  }, [packet?.id]);

  const prettyPayload = useMemo(() => (packet ? getPrettyPayload(packet) : null), [packet]);
  const rawPayload = useMemo(() => (packet ? getRenderedPayload(packet.payload) : null), [packet]);
  const eventName = useMemo(() => (packet ? getPacketEventName(packet) : null), [packet]);
  const relationships = useMemo(
    () => (packet ? relationshipIndex?.byPacketId.get(packet.id) ?? [] : []),
    [packet, relationshipIndex],
  );

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
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/70 p-1.5">
              <div className="flex gap-1">
                <TabButton active={activeTab === "pretty"} label={t("inspector.tabs.pretty")} onClick={() => setActiveTab("pretty")} />
                <TabButton active={activeTab === "raw"} label={t("inspector.tabs.raw")} onClick={() => setActiveTab("raw")} />
                <TabButton active={activeTab === "metadata"} label={t("inspector.tabs.metadata")} onClick={() => setActiveTab("metadata")} />
              </div>
              <Button variant="ghost" size="sm" className="shrink-0 px-2" onClick={() => setLargeViewOpen(true)}>
                <Maximize2 className="h-4 w-4" />
                {t("inspector.largeView.open")}
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {activeTab === "pretty" ? <PrettyTab packet={packet} prettyPayload={prettyPayload} /> : null}
              {activeTab === "raw" ? <RawTab rawPayload={rawPayload} /> : null}
              {activeTab === "metadata" ? <MetadataTab eventName={eventName ?? "unknown.event"} packet={packet} /> : null}
              <div className="mt-4">
                <PacketRelationshipsPanel
                  packet={packet}
                  packets={packets}
                  relationships={relationships}
                  onSelectPacket={onSelectRelatedPacket}
                />
              </div>
              <div className="mt-4">
                <PacketAnnotationsPanel packet={packet} onUpdatePacketAnnotations={onUpdatePacketAnnotations} />
              </div>
              <div className="mt-4">
                <AiAnalysisPanel packet={packet} packets={packets} session={session} />
              </div>
            </div>
            <LargePayloadViewer
              activeTab={activeTab}
              eventName={eventName ?? "unknown.event"}
              isOpen={largeViewOpen}
              packet={packet}
              prettyPayload={prettyPayload}
              rawPayload={rawPayload}
              onClose={() => setLargeViewOpen(false)}
              onCopyPayload={() => void copyPayload()}
            />
          </div>
        )}
      </PanelContent>
    </div>
  );
}

type LargePayloadViewerProps = {
  activeTab: InspectorTab;
  eventName: string;
  isOpen: boolean;
  onClose: () => void;
  onCopyPayload: () => void;
  packet: Packet;
  prettyPayload: ReturnType<typeof getPrettyPayload> | null;
  rawPayload: RenderedPayload | null;
};

function LargePayloadViewer({
  activeTab,
  eventName,
  isOpen,
  onClose,
  onCopyPayload,
  packet,
  prettyPayload,
  rawPayload,
}: LargePayloadViewerProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"pretty" | "raw">("pretty");

  useEffect(() => {
    setMode(activeTab === "raw" ? "raw" : "pretty");
  }, [activeTab, packet.id]);

  if (!isOpen) {
    return null;
  }

  const pretty = getLargePrettyPayload(packet, prettyPayload);
  const raw = rawPayload ?? getRenderedPayload(packet.payload);
  const displayedPayload = mode === "pretty" ? pretty : raw;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm">
      <div className="flex h-[min(86vh,52rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border/80 bg-panel shadow-2xl shadow-black/40">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/70 p-3">
          <div className="min-w-0">
            <p className="sl-section-label text-[0.72rem] font-semibold uppercase text-muted-foreground">
              {t("inspector.largeView.title")}
            </p>
            <p className="mt-1 truncate font-mono text-xs text-foreground">{eventName}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Button variant={mode === "pretty" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("pretty")}>
              {t("inspector.tabs.pretty")}
            </Button>
            <Button variant={mode === "raw" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("raw")}>
              {t("inspector.tabs.raw")}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCopyPayload}>
              <Copy className="h-4 w-4" />
              {t("inspector.copy.action")}
            </Button>
            <Button variant="ghost" size="icon" title={t("inspector.largeView.close")} onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {displayedPayload.truncated ? (
            <Notice message={t(mode === "pretty" ? "inspector.notices.prettyTruncated" : "inspector.notices.rawTruncated")} />
          ) : null}
          <div className="mt-3 overflow-hidden rounded-md border border-border/70 bg-code">
            <pre className="max-h-[36rem] min-h-[18rem] overflow-auto p-3 font-mono text-xs leading-5 text-foreground">
              {displayedPayload.value}
            </pre>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <InspectorMetric icon={Tag} label={t("inspector.metadata.eventName")} value={eventName} />
            <InspectorMetric icon={packet.direction === "inbound" ? ArrowDownLeft : ArrowUpRight} label={t("inspector.metadata.direction")} value={packet.direction} />
            <InspectorMetric icon={Clock3} label={t("inspector.metadata.timestamp")} value={formatDateTime(packet.timestamp)} />
            <InspectorMetric icon={Ruler} label={t("inspector.metadata.size")} value={formatBytes(packet.sizeBytes)} />
            <InspectorMetric icon={Braces} label={t("inspector.metadata.payloadKind")} value={packet.payloadKind} />
            <InspectorMetric icon={Waypoints} label={t("inspector.metadata.connectionId")} value={packet.connectionId} />
            <InspectorMetric icon={TextCursorInput} label={t("inspector.metadata.sessionId")} value={packet.sessionId} />
            <InspectorMetric icon={FileText} label={t("inspector.metadata.packetId")} value={packet.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

type PacketAnnotationsPanelProps = {
  onUpdatePacketAnnotations: (packetId: string, patch: Partial<PacketAnnotations>) => void;
  packet: Packet;
};

type PacketRelationshipsPanelProps = {
  onSelectPacket: (packetId: string) => void;
  packet: Packet;
  packets: Packet[];
  relationships: readonly PacketRelationship[];
};

function PacketRelationshipsPanel({ onSelectPacket, packet, packets, relationships }: PacketRelationshipsPanelProps) {
  const { t } = useTranslation();
  const packetById = useMemo(() => new Map(packets.map((item) => [item.id, item])), [packets]);

  if (relationships.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-border/70 bg-background/45 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5" />
            {t("relationships.title")}
          </p>
          <p className="mt-1 text-[0.72rem] leading-4 text-muted-foreground">{t("relationships.description")}</p>
        </div>
        <Badge variant="outline">{t("relationships.count", { count: relationships.length })}</Badge>
      </div>

      <div className="space-y-1.5">
        {relationships.slice(0, 8).map((relationship) => {
          const relatedPacketId = getRelatedPacketId(relationship, packet.id);
          const relatedPacket = packetById.get(relatedPacketId) ?? null;
          const isSource = relationship.sourcePacketId === packet.id;
          const relatedEventName = relatedPacket ? getPacketEventName(relatedPacket) : t("relationships.missingPacket");

          return (
            <button
              key={relationship.id}
              type="button"
              className="grid w-full grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border/60 bg-panel/55 p-2 text-left transition hover:border-primary/35 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!relatedPacket}
              title={relatedPacket ? t("relationships.openRelated") : t("relationships.missingPacket")}
              onClick={() => relatedPacket && onSelectPacket(relatedPacket.id)}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                <Link2 className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="truncate font-mono text-xs font-semibold text-foreground">{relatedEventName}</span>
                  <Badge variant="outline" className="border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                    {t(getRelationshipKindKey(relationship.kind))}
                  </Badge>
                  <Badge variant={relationship.confidence === "inferred" ? "secondary" : "outline"}>
                    {t(`relationships.confidence.${relationship.confidence}`)}
                  </Badge>
                </span>
                <span className="mt-1 block text-[0.72rem] leading-4 text-muted-foreground">
                  {t(isSource ? "relationships.direction.sourceToTarget" : "relationships.direction.targetFromSource")} -{" "}
                  {getRelationshipReasonLabel(relationship, t)}
                </span>
              </span>
              <span className="whitespace-nowrap font-mono text-[0.68rem] text-muted-foreground">
                {relatedPacket ? formatDateTime(relatedPacket.timestamp) : t("common.notAvailable")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PacketAnnotationsPanel({ onUpdatePacketAnnotations, packet }: PacketAnnotationsPanelProps) {
  const { t } = useTranslation();
  const annotations = packet.annotations ?? createPacketAnnotations({ updatedAt: 0 });
  const [noteDraft, setNoteDraft] = useState(annotations.note);
  const [tagDraft, setTagDraft] = useState("");
  const hasUnsavedNote = noteDraft.trim() !== annotations.note;

  useEffect(() => {
    setNoteDraft(packet.annotations?.note ?? "");
    setTagDraft("");
  }, [packet.id, packet.annotations?.note]);

  function updateAnnotations(patch: Partial<PacketAnnotations>) {
    onUpdatePacketAnnotations(packet.id, patch);
  }

  function addTag(rawTag = tagDraft) {
    const nextTag = rawTag.trim();

    if (!nextTag) {
      setTagDraft("");
      return;
    }

    updateAnnotations({
      tags: [...annotations.tags, nextTag],
    });
    setTagDraft("");
  }

  function removeTag(tag: string) {
    updateAnnotations({
      tags: annotations.tags.filter((item) => item !== tag),
    });
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }

    event.preventDefault();
    addTag();
  }

  return (
    <div className="rounded-md border border-border/70 bg-background/45 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <Bookmark className="h-3.5 w-3.5" />
            {t("inspector.annotations.title")}
          </p>
          <p className="mt-1 text-[0.72rem] leading-4 text-muted-foreground">{t("inspector.annotations.description")}</p>
        </div>
        <Badge variant={annotations.bookmarked || annotations.suspicious ? "default" : "outline"}>
          {annotations.bookmarked
            ? t("inspector.annotations.bookmarked")
            : annotations.suspicious
              ? t("inspector.annotations.suspicious")
              : t("inspector.annotations.emptyState")}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={annotations.bookmarked ? "secondary" : "ghost"}
          size="sm"
          onClick={() => updateAnnotations({ bookmarked: !annotations.bookmarked })}
        >
          <Bookmark className={annotations.bookmarked ? "h-4 w-4 fill-current" : "h-4 w-4"} />
          {annotations.bookmarked ? t("inspector.annotations.removeBookmark") : t("inspector.annotations.bookmark")}
        </Button>
        <Button
          type="button"
          variant={annotations.suspicious ? "secondary" : "ghost"}
          size="sm"
          onClick={() => updateAnnotations({ suspicious: !annotations.suspicious })}
        >
          <Flag className={annotations.suspicious ? "h-4 w-4 fill-current" : "h-4 w-4"} />
          {annotations.suspicious ? t("inspector.annotations.clearSuspicious") : t("inspector.annotations.markSuspicious")}
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          {t("inspector.annotations.tags")}
          <div className="mt-1 flex gap-2">
            <Input
              className="h-8"
              value={tagDraft}
              placeholder={t("inspector.annotations.tagPlaceholder")}
              spellCheck={false}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={handleTagKeyDown}
            />
            <Button type="button" variant="ghost" size="sm" disabled={!tagDraft.trim()} onClick={() => addTag()}>
              <Plus className="h-4 w-4" />
              {t("inspector.annotations.addTag")}
            </Button>
          </div>
        </label>
        {annotations.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {annotations.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs text-primary"
              >
                <Tag className="h-3 w-3" />
                {tag}
                <button
                  type="button"
                  className="rounded-sm text-primary/75 hover:text-primary"
                  title={t("inspector.annotations.removeTag", { tag })}
                  onClick={() => removeTag(tag)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <label className="text-xs font-medium text-muted-foreground">
          {t("inspector.annotations.note")}
          <Textarea
            className="mt-1 min-h-20 resize-y text-xs leading-5"
            value={noteDraft}
            placeholder={t("inspector.annotations.notePlaceholder")}
            onChange={(event) => setNoteDraft(event.target.value)}
          />
        </label>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.72rem] leading-4 text-muted-foreground">{t("inspector.annotations.shortcutHint")}</p>
          <Button type="button" variant="secondary" size="sm" disabled={!hasUnsavedNote} onClick={() => updateAnnotations({ note: noteDraft })}>
            {t("inspector.annotations.saveNote")}
          </Button>
        </div>
      </div>
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
        <Badge variant="secondary">
          {t(prettyPayload.source === "decoded" ? "inspector.badges.decodedPayload" : "inspector.badges.formattedJson")}
        </Badge>
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

function getRelationshipKindKey(kind: PacketRelationship["kind"]) {
  if (kind === "auth-flow") {
    return "relationships.kind.authFlow";
  }

  if (kind === "reconnect-flow") {
    return "relationships.kind.reconnectFlow";
  }

  if (kind === "replay-source") {
    return "relationships.kind.replaySource";
  }

  return "relationships.kind.requestResponse";
}

function getRelationshipReasonLabel(
  relationship: PacketRelationship,
  t: ReturnType<typeof useTranslation>["t"],
) {
  const field = relationship.field ?? t("common.notAvailable");

  const reasonKeyByReason: Record<PacketRelationshipReason, string> = {
    "auth-sequence": "relationships.reason.authSequence",
    "correlation-id": "relationships.reason.correlationId",
    "ping-pong": "relationships.reason.pingPong",
    "reconnect-sequence": "relationships.reason.reconnectSequence",
    "reply-to": "relationships.reason.replyTo",
    "replay-source": "relationships.reason.replaySource",
    "request-id": "relationships.reason.requestId",
  };

  return t(reasonKeyByReason[relationship.reason], { field, value: relationship.value ?? "" });
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

function getLargePrettyPayload(packet: Packet, prettyPayload: ReturnType<typeof getPrettyPayload> | null): RenderedPayload {
  if (prettyPayload?.kind === "formatted") {
    return getRenderedPayload(prettyPayload.formatted);
  }

  return getRenderedPayload(packet.payload);
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
