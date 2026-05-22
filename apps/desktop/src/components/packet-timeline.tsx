import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CirclePause,
  CirclePlay,
  Eraser,
  FileJson2,
  HeartPulse,
  KeyRound,
  MessageSquareText,
  MousePointer2,
  Play,
  Search,
  SendHorizontal,
  SlidersHorizontal,
  Terminal,
  type LucideIcon,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelContent, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { formatBytes, formatTime } from "@/lib/format";
import {
  getPacketDemoMetadata,
  getPacketSummary,
  isErrorPacketFast,
  type PacketStatus,
} from "@/lib/packet-inspection";
import { cn } from "@/lib/utils";
import type { ConnectionStatus, FilterState, Packet } from "@/models";
import { useSettingsStore } from "@/store/settings-store";

const packetRowHeightRem = 5.25;
const fallbackPacketRowHeight = 84;
const overscanRows = 8;

type PacketTimelineProps = {
  filterState: FilterState;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  onClearPackets: () => void;
  onResetFilters: () => void;
  onSelectPacket: (packetId: string) => void;
  onUpdateFilterState: (filterState: Partial<FilterState>) => void;
  packets: Packet[];
  resultCount: number;
  selectedPacketId: string | null;
  totalCount: number;
};

export function PacketTimeline({
  connectionStatus,
  filterState,
  isConnected,
  onClearPackets,
  onResetFilters,
  onSelectPacket,
  onUpdateFilterState,
  packets,
  resultCount,
  selectedPacketId,
  totalCount,
}: PacketTimelineProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoScrollDefault = useSettingsStore((state) => state.settings.autoScrollDefault);
  const showPayloadPreview = useSettingsStore((state) => state.settings.privacy.showPayloadPreviewInTimeline);
  const newestPacketId = packets[0]?.id ?? null;
  const [autoScroll, setAutoScroll] = useState(autoScrollDefault);
  const [searchDraft, setSearchDraft] = useState(filterState.searchQuery);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(560);
  const rowHeight = usePacketRowHeight();

  useEffect(() => {
    setSearchDraft(filterState.searchQuery);
  }, [filterState.searchQuery]);

  useEffect(() => {
    setAutoScroll(autoScrollDefault);
  }, [autoScrollDefault]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (searchDraft !== filterState.searchQuery) {
        onUpdateFilterState({ searchQuery: searchDraft });
      }
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [filterState.searchQuery, onUpdateFilterState, searchDraft]);

  useLayoutEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) {
        setViewportHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(element);
    setViewportHeight(element.clientHeight);

    return () => resizeObserver.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!autoScroll || !scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [autoScroll, newestPacketId]);

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const nextScrollTop = element.scrollTop;
    setScrollTop(nextScrollTop);

    if (autoScroll && nextScrollTop > rowHeight * 2) {
      setAutoScroll(false);
    }
  }, [autoScroll]);

  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(viewportHeight / rowHeight);
    const startIndex = Math.max(Math.floor(scrollTop / rowHeight) - overscanRows, 0);
    const endIndex = Math.min(startIndex + visibleCount + overscanRows * 2, packets.length);

    return {
      endIndex,
      startIndex,
    };
  }, [packets.length, scrollTop, viewportHeight]);

  const visiblePackets = useMemo(
    () => packets.slice(visibleRange.startIndex, visibleRange.endIndex),
    [packets, visibleRange.endIndex, visibleRange.startIndex],
  );

  const stats = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    let errors = 0;

    for (const packet of packets) {
      if (packet.direction === "inbound") {
        inbound += 1;
      } else {
        outbound += 1;
      }

      if (isErrorPacketFast(packet)) {
        errors += 1;
      }
    }

    return { errors, inbound, outbound };
  }, [packets]);
  const hasActiveFilters = isFilteringActive(filterState);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader className="min-h-[5.75rem] flex-col items-stretch justify-center gap-2 py-2 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <PanelTitle>{t("packets.title")}</PanelTitle>
          <p className="mt-1 text-[0.72rem] text-muted-foreground">{t("packets.description")}</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 xl:max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[13.75rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 pl-9"
                value={searchDraft}
                placeholder={t("packets.searchPlaceholder")}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </label>
            <Button variant="ghost" size="sm" disabled={!hasActiveFilters} onClick={onResetFilters}>
              <X className="h-4 w-4" />
              {t("actions.clearFilters")}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t("packets.filters")}
            </span>
            <FilterChip
              active={
                filterState.direction === "all" &&
                filterState.payloadKind === "all" &&
                !filterState.errorsOnly &&
                !filterState.hidePingPong
              }
              label={t("packets.filter.all")}
              onClick={() =>
                onUpdateFilterState({ direction: "all", errorsOnly: false, hidePingPong: false, payloadKind: "all" })
              }
            />
            <FilterChip
              active={filterState.direction === "inbound"}
              label={t("packets.filter.incoming")}
              onClick={() => onUpdateFilterState({ direction: "inbound" })}
            />
            <FilterChip
              active={filterState.direction === "outbound"}
              label={t("packets.filter.outgoing")}
              onClick={() => onUpdateFilterState({ direction: "outbound" })}
            />
            <FilterChip
              active={filterState.payloadKind === "json"}
              label={t("packets.filter.jsonOnly")}
              onClick={() =>
                onUpdateFilterState({ payloadKind: filterState.payloadKind === "json" ? "all" : "json" })
              }
            />
            <FilterChip
              active={filterState.errorsOnly}
              label={t("packets.filter.errorsOnly")}
              onClick={() => onUpdateFilterState({ errorsOnly: !filterState.errorsOnly })}
            />
            <FilterChip
              active={filterState.hidePingPong}
              label={t("packets.filter.hidePingPong")}
              onClick={() => onUpdateFilterState({ hidePingPong: !filterState.hidePingPong })}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Badge variant="secondary">
            {t("packets.shown", { shown: resultCount, total: totalCount })}
          </Badge>
          <Badge variant="outline">{t("packets.inboundShort", { count: stats.inbound })}</Badge>
          <Badge variant="outline">{t("packets.outboundShort", { count: stats.outbound })}</Badge>
          {stats.errors > 0 ? <Badge variant="outline">{t("packets.errorsShort", { count: stats.errors })}</Badge> : null}
          <Button
            variant={autoScroll ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              const nextAutoScroll = !autoScroll;
              setAutoScroll(nextAutoScroll);

              if (nextAutoScroll && scrollRef.current) {
                scrollRef.current.scrollTop = 0;
              }
            }}
          >
            {autoScroll ? <CirclePause className="h-4 w-4" /> : <CirclePlay className="h-4 w-4" />}
            {autoScroll ? t("actions.pause") : t("actions.resume")}
          </Button>
          <Button variant="ghost" size="sm" disabled={packets.length === 0} onClick={onClearPackets}>
            <Eraser className="h-4 w-4" />
            {t("actions.clear")}
          </Button>
        </div>
      </PanelHeader>
      <PanelContent ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-2" onScroll={handleScroll}>
        {packets.length === 0 ? (
          <TimelineEmptyState
            connectionStatus={connectionStatus}
            hasFilters={hasActiveFilters}
            isConnected={isConnected}
            totalCount={totalCount}
          />
        ) : (
          <div className="relative" style={{ height: packets.length * rowHeight }}>
            <div
              className="absolute left-0 right-0 top-0"
              style={{ transform: `translateY(${visibleRange.startIndex * rowHeight}px)` }}
            >
              {visiblePackets.map((packet) => (
                <PacketTimelineRow
                  key={packet.id}
                  packet={packet}
                  selected={packet.id === selectedPacketId}
                  showPayloadPreview={showPayloadPreview}
                  onSelectPacket={onSelectPacket}
                />
              ))}
            </div>
          </div>
        )}
      </PanelContent>
    </div>
  );
}

type FilterChipProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function FilterChip({ active, label, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      className={[
        "rounded-md border px-2 py-0.5 text-xs font-medium transition",
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function TimelineEmptyState({
  connectionStatus,
  hasFilters,
  isConnected,
  totalCount,
}: {
  connectionStatus: ConnectionStatus;
  hasFilters: boolean;
  isConnected: boolean;
  totalCount: number;
}) {
  const { t } = useTranslation();
  const isErrorState = connectionStatus === "error";
  const title = hasFilters && totalCount > 0
    ? t("packets.empty.filteredTitle")
    : isConnected
      ? t("packets.empty.waitingTitle")
      : t("packets.empty.title");
  const description = hasFilters && totalCount > 0
    ? t("packets.empty.filteredDescription")
    : isConnected
      ? t("packets.empty.waitingDescription")
      : isErrorState
        ? t("packets.empty.errorDescription")
        : t("packets.empty.description");

  return (
    <div className="flex h-full min-h-[16rem] flex-col items-center justify-center rounded-md border border-dashed border-border/80 bg-[linear-gradient(180deg,hsl(var(--panel)/0.62),hsl(var(--background)/0.36))] px-6 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
        {isConnected ? <SendHorizontal className="h-5 w-5" /> : <MousePointer2 className="h-5 w-5" />}
      </div>
      {isConnected ? (
        <Badge variant="default" className="mb-3">
          {t("packets.empty.connected")}
        </Badge>
      ) : null}
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">{description}</p>
      {isConnected ? (
        <p className="mt-3 rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          {t("packets.empty.sendFirstMessage")}
        </p>
      ) : null}
      {!isConnected && !hasFilters ? (
        <div className="mt-4 grid w-full max-w-3xl gap-2 sm:grid-cols-3">
          <EmptyStateHint
            icon={Play}
            title={t("packets.empty.hints.demo.title")}
            description={t("packets.empty.hints.demo.description")}
          />
          <EmptyStateHint
            icon={Terminal}
            title={t("packets.empty.hints.echo.title")}
            description={t("packets.empty.hints.echo.description")}
          />
          <EmptyStateHint
            icon={SendHorizontal}
            title={t("packets.empty.hints.connect.title")}
            description={t("packets.empty.hints.connect.description")}
          />
        </div>
      ) : null}
    </div>
  );
}

type EmptyStateHintProps = {
  description: string;
  icon: LucideIcon;
  title: string;
};

function EmptyStateHint({ description, icon: Icon, title }: EmptyStateHintProps) {
  return (
    <div className="rounded-md border border-border/70 bg-background/45 p-2.5 text-left">
      <p className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </p>
      <p className="mt-1 text-[0.72rem] leading-4 text-muted-foreground">{description}</p>
    </div>
  );
}

type PacketTimelineRowProps = {
  onSelectPacket: (packetId: string) => void;
  packet: Packet;
  selected: boolean;
  showPayloadPreview: boolean;
};

const PacketTimelineRow = memo(function PacketTimelineRow({
  onSelectPacket,
  packet,
  selected,
  showPayloadPreview,
}: PacketTimelineRowProps) {
  const { t } = useTranslation();
  const isInbound = packet.direction === "inbound";
  const summary = getPacketSummary(packet);
  const demoMetadata = getPacketDemoMetadata(packet);
  const directionTone = isInbound
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    : "border-amber-300/30 bg-amber-300/10 text-amber-100";
  const demoBadgeLabel = demoMetadata?.highlight && demoMetadata.stepId
    ? t(`investorDemo.steps.${demoMetadata.stepId}.highlight`, { defaultValue: t("packets.demo.highlight") })
    : t("packets.demo.simulated");

  return (
    <button
      type="button"
      className={cn(
        "group relative mb-2 grid h-[4.75rem] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 overflow-hidden rounded-md border p-2.5 pl-3.5 text-left transition",
        demoMetadata?.highlight
          ? "border-primary/60 bg-primary/10 shadow-[0_14px_42px_hsl(var(--primary)/0.08)]"
          : selected
            ? "border-primary/70 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_16px_40px_hsl(var(--primary)/0.08)]"
            : "border-border/70 bg-panel/70 hover:border-border hover:bg-panel",
        selected && demoMetadata?.highlight ? "ring-1 ring-primary/45" : "",
      )}
      onClick={() => onSelectPacket(packet.id)}
    >
      <span
        className={cn(
          "absolute inset-y-2 left-0 w-1 rounded-r-full",
          demoMetadata?.highlight
            ? "bg-primary"
            : isInbound
              ? "bg-emerald-300/75"
              : "bg-amber-200/75",
        )}
      />
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border shadow-[inset_0_0_0_1px_hsl(var(--background)/0.25)]",
          directionTone,
        )}
        title={isInbound ? t("packets.direction.incomingTitle") : t("packets.direction.outgoingTitle")}
      >
        {isInbound ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </span>

      <span className="min-w-0">
        <span className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn("shrink-0", directionTone)}>
            {isInbound ? t("packets.direction.incoming") : t("packets.direction.outgoing")}
          </Badge>
          <StatusBadge status={summary.status} />
          {demoMetadata ? (
            <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
              {t("packets.demo.simulated")}
            </Badge>
          ) : null}
          {demoMetadata?.highlight ? (
            <Badge variant="default" className="max-w-[16.25rem] truncate">
              {demoBadgeLabel}
            </Badge>
          ) : null}
        </span>
        <span className="mb-0.5 block truncate font-mono text-[0.8rem] font-semibold text-foreground">
          {summary.eventName}
        </span>
        <span className="block line-clamp-1 rounded-md border border-border/55 bg-code/70 px-2 py-0.5 break-all font-mono text-[0.7rem] leading-5 text-muted-foreground">
          {showPayloadPreview ? summary.preview : t("packets.previewHidden")}
        </span>
      </span>

      <span className="flex flex-col items-end gap-1.5 whitespace-nowrap">
        <time className="font-mono text-[0.7rem] text-muted-foreground">{formatTime(packet.timestamp)}</time>
        <span className="font-mono text-[0.7rem] text-muted-foreground">{formatBytes(packet.sizeBytes)}</span>
        {packet.payloadKind === "json" ? (
          <span className="inline-flex items-center gap-1 text-xs text-accent">
            <FileJson2 className="h-3 w-3" />
            {t("packets.kind.json")}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{packet.payloadKind}</span>
        )}
      </span>
    </button>
  );
});

function StatusBadge({ status }: { status: PacketStatus }) {
  const { t } = useTranslation();
  const config = {
    auth: { icon: KeyRound, labelKey: "packets.status.auth", className: "border-sky-300/25 bg-sky-300/10 text-sky-200" },
    chat: { icon: MessageSquareText, labelKey: "packets.status.chat", className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" },
    error: { icon: AlertCircle, labelKey: "packets.status.error", className: "border-destructive/35 bg-destructive/10 text-destructive" },
    heartbeat: { icon: HeartPulse, labelKey: "packets.status.heartbeat", className: "border-amber-300/25 bg-amber-300/10 text-amber-100" },
    notification: { icon: Bell, labelKey: "packets.status.notification", className: "border-violet-300/25 bg-violet-300/10 text-violet-200" },
    ok: { icon: FileJson2, labelKey: "packets.status.ok", className: "border-border/70 bg-muted/20 text-muted-foreground" },
  } satisfies Record<PacketStatus, { className: string; icon: typeof FileJson2; labelKey: string }>;
  const item = config[status];
  const Icon = item.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", item.className)}>
      <Icon className="h-3 w-3" />
      {t(item.labelKey)}
    </span>
  );
}

function usePacketRowHeight() {
  const [rowHeight, setRowHeight] = useState(fallbackPacketRowHeight);

  useEffect(() => {
    const updateRowHeight = () => {
      const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
      setRowHeight(Number.isFinite(rootFontSize) ? rootFontSize * packetRowHeightRem : fallbackPacketRowHeight);
    };

    updateRowHeight();
    window.addEventListener("resize", updateRowHeight);

    const observer = new MutationObserver(updateRowHeight);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-density"] });

    return () => {
      window.removeEventListener("resize", updateRowHeight);
      observer.disconnect();
    };
  }, []);

  return rowHeight;
}

function isFilteringActive(filterState: FilterState) {
  return (
    filterState.direction !== "all" ||
    filterState.errorsOnly ||
    filterState.hidePingPong ||
    filterState.payloadKind !== "all" ||
    filterState.searchQuery.trim().length > 0
  );
}
