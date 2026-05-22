import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  Bot,
  Braces,
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Eraser,
  FileJson2,
  FileText,
  Flag,
  GitBranch,
  HeartPulse,
  KeyRound,
  Layers2,
  MessageSquareText,
  MousePointer2,
  Play,
  Radio,
  RefreshCw,
  Repeat2,
  Search,
  SendHorizontal,
  SlidersHorizontal,
  Star,
  Tag as TagIcon,
  Terminal,
  Trash2,
  type LucideIcon,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelContent, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { formatBytes, formatDuration, formatTime } from "@/lib/format";
import type { FlowAnalysis, PacketFlow, PacketFlowKind } from "@/lib/flow-analysis";
import { groupTimelinePackets, type PacketTimelineGroup, type PacketTimelineItem } from "@/lib/packet-grouping";
import {
  getPacketDemoMetadata,
  getPacketSummary,
  isErrorPacketFast,
  isReplayPacketFast,
  type PacketStatus,
} from "@/lib/packet-inspection";
import type { PacketRelationshipIndex } from "@/lib/packet-relationships";
import { cn } from "@/lib/utils";
import {
  createEntityId,
  getFilterValidationIssues,
  hasPacketAnnotations,
  type ConnectionStatus,
  type FilterPreset,
  type FilterState,
  type Packet,
} from "@/models";
import { useSettingsStore } from "@/store/settings-store";

const packetRowHeightRem = 5.25;
const fallbackPacketRowHeight = 84;
const overscanRows = 8;

type PacketTimelineProps = {
  filterState: FilterState;
  flowAnalysis: FlowAnalysis | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  onClearPackets: () => void;
  onResetFilters: () => void;
  onSelectPacket: (packetId: string) => void;
  onUpdateFilterState: (filterState: Partial<FilterState>) => void;
  packets: Packet[];
  relationshipIndex: PacketRelationshipIndex | null;
  resultCount: number;
  selectedPacketId: string | null;
  totalCount: number;
};

export function PacketTimeline({
  connectionStatus,
  filterState,
  flowAnalysis,
  isConnected,
  onClearPackets,
  onResetFilters,
  onSelectPacket,
  onUpdateFilterState,
  packets,
  relationshipIndex,
  resultCount,
  selectedPacketId,
  totalCount,
}: PacketTimelineProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoScrollDefault = useSettingsStore((state) => state.settings.autoScrollDefault);
  const filterPresets = useSettingsStore((state) => state.settings.filterPresets);
  const showPayloadPreview = useSettingsStore((state) => state.settings.privacy.showPayloadPreviewInTimeline);
  const timelineGroupingEnabled = useSettingsStore((state) => state.settings.timelineGroupingEnabled);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const newestPacketId = packets[0]?.id ?? null;
  const [autoScroll, setAutoScroll] = useState(autoScrollDefault);
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlySet<string>>(() => new Set());
  const [eventDraft, setEventDraft] = useState(filterState.eventQuery);
  const [searchDraft, setSearchDraft] = useState(filterState.searchQuery);
  const [showFlowGraph, setShowFlowGraph] = useState(false);
  const [smartDraft, setSmartDraft] = useState(filterState.smartQuery);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(560);
  const rowHeight = usePacketRowHeight();
  const draftFilterState = useMemo(
    () => ({
      ...filterState,
      eventQuery: eventDraft,
      searchQuery: searchDraft,
      smartQuery: smartDraft,
    }),
    [eventDraft, filterState, searchDraft, smartDraft],
  );
  const validationIssues = useMemo(() => getFilterValidationIssues(draftFilterState), [draftFilterState]);
  const sortedFilterPresets = useMemo(
    () =>
      [...filterPresets].sort((left, right) => {
        if (left.favorite !== right.favorite) {
          return left.favorite ? -1 : 1;
        }

        return right.updatedAt - left.updatedAt;
      }),
    [filterPresets],
  );
  const timelineItems = useMemo(
    () =>
      timelineGroupingEnabled
        ? groupTimelinePackets(packets, { expandedGroupIds })
        : packets.map((packet): PacketTimelineItem => ({ id: packet.id, packet, type: "packet" })),
    [expandedGroupIds, packets, timelineGroupingEnabled],
  );
  const groupingStats = useMemo(() => {
    let groupCount = 0;
    let collapsedPacketCount = 0;

    for (const item of timelineItems) {
      if (item.type === "group") {
        groupCount += 1;

        if (!expandedGroupIds.has(item.group.id)) {
          collapsedPacketCount += item.group.packetCount - 1;
        }
      }
    }

    return { collapsedPacketCount, groupCount };
  }, [expandedGroupIds, timelineItems]);

  useEffect(() => {
    setSearchDraft(filterState.searchQuery);
  }, [filterState.searchQuery]);

  useEffect(() => {
    setEventDraft(filterState.eventQuery);
  }, [filterState.eventQuery]);

  useEffect(() => {
    setSmartDraft(filterState.smartQuery);
  }, [filterState.smartQuery]);

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const patch: Partial<FilterState> = {};

      if (eventDraft !== filterState.eventQuery) {
        patch.eventQuery = eventDraft;
      }

      if (smartDraft !== filterState.smartQuery) {
        patch.smartQuery = smartDraft;
      }

      if (Object.keys(patch).length > 0) {
        onUpdateFilterState(patch);
      }
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [eventDraft, filterState.eventQuery, filterState.smartQuery, onUpdateFilterState, smartDraft]);

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
  }, [autoScroll, rowHeight]);

  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(viewportHeight / rowHeight);
    const startIndex = Math.max(Math.floor(scrollTop / rowHeight) - overscanRows, 0);
    const endIndex = Math.min(startIndex + visibleCount + overscanRows * 2, timelineItems.length);

    return {
      endIndex,
      startIndex,
    };
  }, [rowHeight, scrollTop, timelineItems.length, viewportHeight]);

  const visibleTimelineItems = useMemo(
    () => timelineItems.slice(visibleRange.startIndex, visibleRange.endIndex),
    [timelineItems, visibleRange.endIndex, visibleRange.startIndex],
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
  const hasActiveFilters = isFilteringActive(draftFilterState);

  function saveFilterPreset() {
    if (!hasActiveFilters || validationIssues.length > 0) {
      return;
    }

    const now = Date.now();
    const preset: FilterPreset = {
      createdAt: now,
      favorite: false,
      filterState: {
        ...draftFilterState,
        sessionId: null,
      },
      id: createEntityId(),
      name: createFilterPresetName(draftFilterState),
      updatedAt: now,
    };

    updateSettings({
      filterPresets: [preset, ...filterPresets].slice(0, 24),
    });
  }

  function applyFilterPreset(preset: FilterPreset) {
    setSearchDraft(preset.filterState.searchQuery);
    setEventDraft(preset.filterState.eventQuery);
    setSmartDraft(preset.filterState.smartQuery);
    onUpdateFilterState({
      ...preset.filterState,
      sessionId: filterState.sessionId,
    });
  }

  function toggleFilterPresetFavorite(presetId: string) {
    const now = Date.now();

    updateSettings({
      filterPresets: filterPresets.map((preset) =>
        preset.id === presetId
          ? {
              ...preset,
              favorite: !preset.favorite,
              updatedAt: now,
            }
          : preset,
      ),
    });
  }

  function deleteFilterPreset(presetId: string) {
    updateSettings({
      filterPresets: filterPresets.filter((preset) => preset.id !== presetId),
    });
  }

  function togglePacketGroup(groupId: string) {
    setExpandedGroupIds((currentGroupIds) => {
      const nextGroupIds = new Set(currentGroupIds);

      if (nextGroupIds.has(groupId)) {
        nextGroupIds.delete(groupId);
      } else {
        nextGroupIds.add(groupId);
      }

      return nextGroupIds;
    });
  }

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
                placeholder={
                  filterState.searchMode === "regex"
                    ? t("packets.searchRegexPlaceholder")
                    : t("packets.searchPlaceholder")
                }
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </label>
            <Button
              variant={filterState.searchMode === "regex" ? "secondary" : "ghost"}
              size="sm"
              title={t("packets.regexSearch")}
              onClick={() =>
                onUpdateFilterState({
                  searchMode: filterState.searchMode === "regex" ? "text" : "regex",
                })
              }
            >
              .*
              {t("packets.regex")}
            </Button>
            <Button variant="ghost" size="sm" disabled={!hasActiveFilters} onClick={onResetFilters}>
              <X className="h-4 w-4" />
              {t("actions.clearFilters")}
            </Button>
          </div>
          <div className="grid gap-1.5 md:grid-cols-[minmax(10rem,0.65fr)_minmax(14rem,1fr)]">
            <label className="relative min-w-0">
              <Input
                className="h-8"
                value={eventDraft}
                placeholder={t("packets.eventFilterPlaceholder")}
                onChange={(event) => setEventDraft(event.target.value)}
              />
            </label>
            <label className="relative min-w-0">
              <Input
                className="h-8 font-mono text-[0.72rem]"
                value={smartDraft}
                placeholder={t("packets.smartFilterPlaceholder")}
                spellCheck={false}
                onChange={(event) => setSmartDraft(event.target.value)}
              />
            </label>
          </div>
          {validationIssues.length > 0 ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[0.72rem] leading-4 text-destructive-foreground">
              {validationIssues.map((issue) => (
                <p key={`${issue.field}:${issue.value}`}>
                  {issue.field === "searchQuery" ? t("packets.filterErrors.regex") : t("packets.filterErrors.smart", { value: issue.value })}
                </p>
              ))}
            </div>
          ) : null}
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
                !filterState.hideHeartbeat &&
                !filterState.hidePingPong
              }
              label={t("packets.filter.all")}
              onClick={() =>
                onUpdateFilterState({
                  direction: "all",
                  errorsOnly: false,
                  hideHeartbeat: false,
                  hidePingPong: false,
                  payloadKind: "all",
                })
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
            <FilterChip
              active={filterState.hideHeartbeat}
              label={t("packets.filter.hideHeartbeat")}
              onClick={() => onUpdateFilterState({ hideHeartbeat: !filterState.hideHeartbeat })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3.5 w-3.5" />
              {t("packets.presets")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasActiveFilters || validationIssues.length > 0}
              onClick={saveFilterPreset}
            >
              <BookmarkPlus className="h-4 w-4" />
              {t("packets.presets.save")}
            </Button>
            {sortedFilterPresets.slice(0, 6).map((preset) => (
              <FilterPresetChip
                key={preset.id}
                preset={preset}
                onApply={applyFilterPreset}
                onDelete={deleteFilterPreset}
                onToggleFavorite={toggleFilterPresetFavorite}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Badge variant="secondary">
            {t("packets.shown", { shown: resultCount, total: totalCount })}
          </Badge>
          <Badge variant="outline">{t("packets.inboundShort", { count: stats.inbound })}</Badge>
          <Badge variant="outline">{t("packets.outboundShort", { count: stats.outbound })}</Badge>
          {stats.errors > 0 ? <Badge variant="outline">{t("packets.errorsShort", { count: stats.errors })}</Badge> : null}
          {timelineGroupingEnabled && groupingStats.groupCount > 0 ? (
            <Badge variant="outline">
              {t("packets.grouping.summary", {
                count: groupingStats.groupCount,
                hidden: groupingStats.collapsedPacketCount,
              })}
            </Badge>
          ) : null}
          <Button
            variant={timelineGroupingEnabled ? "secondary" : "ghost"}
            size="sm"
            onClick={() => updateSettings({ timelineGroupingEnabled: !timelineGroupingEnabled })}
          >
            <Layers2 className="h-4 w-4" />
            {timelineGroupingEnabled ? t("packets.grouping.on") : t("packets.grouping.off")}
          </Button>
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
      {flowAnalysis && flowAnalysis.flows.length > 0 ? (
        <FlowSummaryPanel
          flowAnalysis={flowAnalysis}
          showGraph={showFlowGraph}
          onSelectPacket={onSelectPacket}
          onToggleGraph={() => setShowFlowGraph((value) => !value)}
        />
      ) : null}
      <PanelContent ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-2" onScroll={handleScroll}>
        {packets.length === 0 ? (
          <TimelineEmptyState
            connectionStatus={connectionStatus}
            hasFilters={hasActiveFilters}
            isConnected={isConnected}
            totalCount={totalCount}
          />
        ) : (
          <div className="relative" style={{ height: timelineItems.length * rowHeight }}>
            <div
              className="absolute left-0 right-0 top-0"
              style={{ transform: `translateY(${visibleRange.startIndex * rowHeight}px)` }}
            >
              {visibleTimelineItems.map((item) =>
                item.type === "group" ? (
                  <PacketTimelineGroupRow
                    key={item.id}
                    expanded={expandedGroupIds.has(item.group.id)}
                    group={item.group}
                    relationshipIndex={relationshipIndex}
                    selected={item.group.packets.some((packet) => packet.id === selectedPacketId)}
                    showPayloadPreview={showPayloadPreview}
                    onToggleGroup={togglePacketGroup}
                  />
                ) : (
                  <PacketTimelineRow
                    key={item.id}
                    packet={item.packet}
                    relationshipIndex={relationshipIndex}
                    selected={item.packet.id === selectedPacketId}
                    showPayloadPreview={showPayloadPreview}
                    onSelectPacket={onSelectPacket}
                  />
                ),
              )}
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

type FilterPresetChipProps = {
  onApply: (preset: FilterPreset) => void;
  onDelete: (presetId: string) => void;
  onToggleFavorite: (presetId: string) => void;
  preset: FilterPreset;
};

function FilterPresetChip({ onApply, onDelete, onToggleFavorite, preset }: FilterPresetChipProps) {
  const { t } = useTranslation();

  return (
    <span className="inline-flex max-w-[16rem] items-center overflow-hidden rounded-md border border-border/70 bg-muted/20">
      <button
        type="button"
        className="min-w-0 truncate px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        title={preset.name}
        onClick={() => onApply(preset)}
      >
        {preset.favorite ? "★ " : ""}
        {preset.name}
      </button>
      <button
        type="button"
        className="border-l border-border/70 px-1.5 py-0.5 text-muted-foreground hover:text-primary"
        title={preset.favorite ? t("packets.presets.unfavorite") : t("packets.presets.favorite")}
        onClick={() => onToggleFavorite(preset.id)}
      >
        <Star className={cn("h-3.5 w-3.5", preset.favorite ? "fill-primary text-primary" : "")} />
      </button>
      <button
        type="button"
        className="border-l border-border/70 px-1.5 py-0.5 text-muted-foreground hover:text-destructive"
        title={t("packets.presets.delete")}
        onClick={() => onDelete(preset.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

type FlowSummaryPanelProps = {
  flowAnalysis: FlowAnalysis;
  onSelectPacket: (packetId: string) => void;
  onToggleGraph: () => void;
  showGraph: boolean;
};

function FlowSummaryPanel({ flowAnalysis, onSelectPacket, onToggleGraph, showGraph }: FlowSummaryPanelProps) {
  const { t } = useTranslation();
  const topFlows = flowAnalysis.flows.slice(0, 4);
  const graphFlows = [...flowAnalysis.flows]
    .sort((left, right) => left.firstTimestamp - right.firstTimestamp)
    .slice(0, 6);

  return (
    <section className="border-b border-border/70 bg-[linear-gradient(180deg,hsl(var(--panel)/0.74),hsl(var(--background)/0.48))] px-2 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
            {t("flows.title")}
          </p>
          <p className="mt-0.5 text-[0.72rem] leading-4 text-muted-foreground">{t("flows.description")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Badge variant="secondary">{t("flows.count", { count: flowAnalysis.stats.total })}</Badge>
          {flowAnalysis.stats.explicit > 0 ? (
            <Badge variant="outline">{t("flows.explicit", { count: flowAnalysis.stats.explicit })}</Badge>
          ) : null}
          {flowAnalysis.stats.inferred > 0 ? (
            <Badge variant="outline">{t("flows.inferred", { count: flowAnalysis.stats.inferred })}</Badge>
          ) : null}
          <Button variant={showGraph ? "secondary" : "ghost"} size="sm" onClick={onToggleGraph}>
            <GitBranch className="h-4 w-4" />
            {showGraph ? t("flows.graph.hide") : t("flows.graph.show")}
          </Button>
        </div>
      </div>
      <div className="mt-2 grid gap-2 lg:grid-cols-2 2xl:grid-cols-4">
        {topFlows.map((flow) => (
          <FlowSummaryCard key={flow.id} flow={flow} onSelectPacket={onSelectPacket} />
        ))}
      </div>
      {showGraph ? (
        <div className="mt-2 rounded-md border border-border/70 bg-background/45 p-2">
          <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            {t("flows.graph.title")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {graphFlows.map((flow, index) => (
              <span key={flow.id} className="inline-flex items-center gap-2">
                {index > 0 ? <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" /> : null}
                <button
                  type="button"
                  className="max-w-[14rem] truncate rounded-md border border-border/70 bg-muted/20 px-2 py-1 text-left text-[0.72rem] font-semibold text-foreground hover:border-primary/40 hover:bg-primary/10"
                  title={flow.title}
                  onClick={() => {
                    const packetId = flow.packetIds[0];

                    if (packetId) {
                      onSelectPacket(packetId);
                    }
                  }}
                >
                  {t(getFlowKindLabelKey(flow.kind))}: {flow.title}
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FlowSummaryCard({ flow, onSelectPacket }: { flow: PacketFlow; onSelectPacket: (packetId: string) => void }) {
  const { t } = useTranslation();
  const FlowIcon = getFlowIcon(flow.kind);
  const tone = getFlowTone(flow.kind);
  const firstPacketId = flow.packetIds[0];
  const directionSummary = t("flows.directionSummary", {
    inbound: flow.directionCount.inbound,
    outbound: flow.directionCount.outbound,
  });

  return (
    <button
      type="button"
      className={cn(
        "group min-w-0 rounded-md border p-2 text-left transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/70",
        tone.card,
      )}
      disabled={!firstPacketId}
      title={t("flows.openFlow")}
      onClick={() => {
        if (firstPacketId) {
          onSelectPacket(firstPacketId);
        }
      }}
    >
      <span className="mb-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
        <Badge variant="outline" className={cn("shrink-0", tone.badge)}>
          <FlowIcon className="h-3 w-3" />
          {t(getFlowKindLabelKey(flow.kind))}
        </Badge>
        <Badge variant="outline" className="shrink-0 border-border/70 bg-background/40 text-muted-foreground">
          {t(getFlowConfidenceLabelKey(flow.confidence))}
        </Badge>
        {flow.errorCount > 0 ? (
          <Badge variant="outline" className="shrink-0 border-destructive/35 bg-destructive/10 text-destructive">
            <AlertCircle className="h-3 w-3" />
            {t("flows.errors", { count: flow.errorCount })}
          </Badge>
        ) : null}
      </span>
      <p className="truncate font-mono text-[0.78rem] font-semibold text-foreground" title={flow.title}>
        {flow.title}
      </p>
      <p className="mt-1 line-clamp-1 text-[0.72rem] leading-4 text-muted-foreground">
        {t(getFlowReasonLabelKey(flow.reason))}
      </p>
      <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.68rem] font-medium text-muted-foreground">
        <span>{t("flows.packetCount", { count: flow.packetCount })}</span>
        <span className="text-muted-foreground/45">/</span>
        <span>{directionSummary}</span>
        <span className="text-muted-foreground/45">/</span>
        <span>{formatDuration(flow.firstTimestamp, flow.lastTimestamp)}</span>
      </span>
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
  const isConnecting = connectionStatus === "connecting";
  const title = hasFilters && totalCount > 0
    ? t("packets.empty.filteredTitle")
    : isConnecting
      ? t("packets.empty.connectingTitle")
      : isConnected
      ? t("packets.empty.waitingTitle")
      : t("packets.empty.title");
  const description = hasFilters && totalCount > 0
    ? t("packets.empty.filteredDescription")
    : isConnecting
      ? t("packets.empty.connectingDescription")
      : isConnected
      ? t("packets.empty.waitingDescription")
      : isErrorState
        ? t("packets.empty.errorDescription")
        : t("packets.empty.description");

  return (
    <div className="relative flex h-full min-h-[16rem] flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-border/80 bg-[linear-gradient(180deg,hsl(var(--panel)/0.72),hsl(var(--background)/0.38))] px-6 text-center">
      <div className="pointer-events-none absolute inset-x-8 top-8 grid grid-cols-6 gap-2 opacity-30">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            // Static shimmer bars keep the loading state visible without adding timers to the timeline.
            key={index}
            className="h-1 rounded-full bg-muted"
            style={{ opacity: 0.2 + (index % 4) * 0.12 }}
          />
        ))}
      </div>
      <div className="relative mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary shadow-[0_0_35px_hsl(var(--primary)/0.12)]">
        {isConnecting ? (
          <Radio className="h-5 w-5 animate-pulse" />
        ) : isConnected ? (
          <SendHorizontal className="h-5 w-5" />
        ) : (
          <MousePointer2 className="h-5 w-5" />
        )}
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

type PacketTimelineGroupRowProps = {
  expanded: boolean;
  group: PacketTimelineGroup;
  onToggleGroup: (groupId: string) => void;
  relationshipIndex: PacketRelationshipIndex | null;
  selected: boolean;
  showPayloadPreview: boolean;
};

const PacketTimelineGroupRow = memo(function PacketTimelineGroupRow({
  expanded,
  group,
  onToggleGroup,
  relationshipIndex,
  selected,
  showPayloadPreview,
}: PacketTimelineGroupRowProps) {
  const { t } = useTranslation();
  const summary = getPacketSummary(group.representativePacket);
  const eventParts = splitEventName(group.eventName);
  const groupTone = getGroupTone(group.kind);
  const GroupIcon = getGroupIcon(group.kind);
  const direction = group.directions.length === 1 ? group.directions[0] : null;
  const annotatedPacketCount = group.packets.filter((packet) => hasPacketAnnotations(packet.annotations)).length;
  const relationshipCount = group.packets.reduce(
    (count, packet) => count + (relationshipIndex?.byPacketId.get(packet.id)?.length ?? 0),
    0,
  );
  const timelineWindow =
    group.firstTimestamp === group.lastTimestamp
      ? formatTime(group.lastTimestamp)
      : `${formatTime(group.lastTimestamp)} - ${formatTime(group.firstTimestamp)}`;

  return (
    <button
      type="button"
      aria-expanded={expanded}
      className={cn(
        "group relative mb-2 grid h-[4.75rem] w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-2 overflow-hidden rounded-md border p-2.5 pl-3.5 text-left transition-[background,border-color,box-shadow,transform]",
        "hover:-translate-y-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/70",
        selected
          ? "border-primary/70 bg-[linear-gradient(90deg,hsl(var(--primary)/0.14),hsl(var(--panel)/0.9)_42%)] shadow-[0_0_0_1px_hsl(var(--primary)/0.24)]"
          : groupTone.row,
      )}
      title={expanded ? t("packets.group.collapse") : t("packets.group.expand")}
      onClick={() => onToggleGroup(group.id)}
    >
      <span className={cn("absolute inset-y-2 left-0 w-1 rounded-r-full shadow-[0_0_20px_currentColor]", groupTone.rail)} />
      {selected ? <span className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-primary/40" /> : null}
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border shadow-[inset_0_0_0_1px_hsl(var(--background)/0.25),0_10px_24px_hsl(var(--background)/0.18)] transition group-hover:scale-[1.03]",
          groupTone.icon,
        )}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </span>

      <span className="min-w-0">
        <span className="mb-1 flex min-w-0 items-center gap-1.5 overflow-hidden">
          <Badge variant="outline" className={cn("shrink-0 border-opacity-80", groupTone.badge)}>
            <GroupIcon className="h-3 w-3" />
            {t(getGroupLabelKey(group.kind))}
          </Badge>
          <Badge variant="outline" className="shrink-0 border-primary/25 bg-primary/10 text-primary">
            <Layers2 className="h-3 w-3" />
            {t("packets.group.packetCount", { count: group.packetCount })}
          </Badge>
          <Badge variant="outline" className={cn("shrink-0", direction ? getDirectionTone(direction) : "border-border/70 bg-muted/20 text-muted-foreground")}>
            {direction
              ? direction === "inbound"
                ? t("packets.direction.incoming")
                : t("packets.direction.outgoing")
              : t("packets.group.mixedDirection")}
          </Badge>
          <StatusBadge status={group.status} />
          {annotatedPacketCount > 0 ? (
            <Badge variant="outline" className="shrink-0 border-primary/25 bg-primary/10 text-primary">
              <Bookmark className="h-3 w-3" />
              {t("packets.annotation.count", { count: annotatedPacketCount })}
            </Badge>
          ) : null}
          {relationshipCount > 0 ? (
            <Badge variant="outline" className="shrink-0 border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
              <GitBranch className="h-3 w-3" />
              {t("packets.marker.related", { count: relationshipCount })}
            </Badge>
          ) : null}
        </span>
        <span className="mb-0.5 flex min-w-0 items-baseline gap-1.5 font-mono">
          {eventParts.namespace ? (
            <span className="truncate text-[0.68rem] font-medium text-muted-foreground/85">{eventParts.namespace}</span>
          ) : null}
          <span className="truncate text-[0.82rem] font-semibold text-foreground">{eventParts.name}</span>
        </span>
        <span className="block line-clamp-1 rounded-md border border-border/55 bg-code/80 px-2 py-0.5 break-all font-mono text-[0.7rem] leading-5 text-muted-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)]">
          {showPayloadPreview ? summary.preview : t("packets.previewHidden")}
        </span>
      </span>

      <span className="flex min-w-[7rem] flex-col items-end gap-1 whitespace-nowrap">
        <time className="rounded-sm bg-background/40 px-1.5 py-0.5 font-mono text-[0.68rem] text-muted-foreground">
          {timelineWindow}
        </time>
        <span className="font-mono text-[0.7rem] text-muted-foreground">{formatBytes(group.totalBytes)}</span>
        <span className="text-[0.68rem] font-medium text-muted-foreground">
          {expanded ? t("packets.group.expandedHint") : t("packets.group.expandHint")}
        </span>
      </span>
    </button>
  );
});

type PacketTimelineRowProps = {
  onSelectPacket: (packetId: string) => void;
  packet: Packet;
  relationshipIndex: PacketRelationshipIndex | null;
  selected: boolean;
  showPayloadPreview: boolean;
};

const PacketTimelineRow = memo(function PacketTimelineRow({
  onSelectPacket,
  packet,
  relationshipIndex,
  selected,
  showPayloadPreview,
}: PacketTimelineRowProps) {
  const { t } = useTranslation();
  const isInbound = packet.direction === "inbound";
  const summary = getPacketSummary(packet);
  const demoMetadata = getPacketDemoMetadata(packet);
  const annotations = packet.annotations;
  const isError = summary.status === "error" || isErrorPacketFast(packet);
  const isReplay = isReplayPacketFast(packet);
  const relationships = relationshipIndex?.byPacketId.get(packet.id) ?? [];
  const isReplaySource = relationships.some((relationship) => relationship.kind === "replay-source" && relationship.sourcePacketId === packet.id);
  const eventParts = splitEventName(summary.eventName);
  const directionTone = getDirectionTone(packet.direction);
  const protocolLabel = getProtocolLabel(packet, t);
  const rowTone = isError
    ? "border-destructive/45 bg-[linear-gradient(90deg,hsl(var(--destructive)/0.12),hsl(var(--panel)/0.86)_34%)]"
    : demoMetadata?.highlight
      ? "border-primary/60 bg-[linear-gradient(90deg,hsl(var(--primary)/0.14),hsl(var(--panel)/0.86)_42%)] shadow-[0_14px_42px_hsl(var(--primary)/0.08)]"
      : selected
        ? "border-primary/70 bg-[linear-gradient(90deg,hsl(var(--primary)/0.12),hsl(var(--panel)/0.9)_44%)] shadow-[0_0_0_1px_hsl(var(--primary)/0.28),0_16px_40px_hsl(var(--primary)/0.08)]"
        : "border-border/70 bg-panel/72 hover:border-border hover:bg-panel/95";
  const railTone = isError
    ? "bg-destructive"
    : demoMetadata?.highlight || selected
      ? "bg-primary"
      : isInbound
        ? "bg-emerald-300/75"
        : "bg-amber-200/75";
  const demoBadgeLabel = demoMetadata?.highlight && demoMetadata.stepId
    ? t(`investorDemo.steps.${demoMetadata.stepId}.highlight`, { defaultValue: t("packets.demo.highlight") })
    : t("packets.demo.simulated");

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "group relative mb-2 grid h-[4.75rem] w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-2 overflow-hidden rounded-md border p-2.5 pl-3.5 text-left transition-[background,border-color,box-shadow,transform]",
        "hover:-translate-y-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/70",
        rowTone,
        selected && demoMetadata?.highlight ? "ring-1 ring-primary/45" : "",
      )}
      onClick={() => onSelectPacket(packet.id)}
    >
      <span className={cn("absolute inset-y-2 left-0 w-1 rounded-r-full shadow-[0_0_20px_currentColor]", railTone)} />
      {selected ? <span className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-primary/40" /> : null}
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border shadow-[inset_0_0_0_1px_hsl(var(--background)/0.25),0_10px_24px_hsl(var(--background)/0.18)] transition group-hover:scale-[1.03]",
          directionTone,
        )}
        title={isInbound ? t("packets.direction.incomingTitle") : t("packets.direction.outgoingTitle")}
      >
        {isInbound ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </span>

      <span className="min-w-0">
        <span className="mb-1 flex min-w-0 items-center gap-1.5 overflow-hidden">
          <Badge variant="outline" className={cn("shrink-0 border-opacity-80", directionTone)}>
            {isInbound ? t("packets.direction.incoming") : t("packets.direction.outgoing")}
          </Badge>
          <StatusBadge status={summary.status} />
          <ProtocolBadge label={protocolLabel} payloadKind={packet.payloadKind} />
          {isReplay ? (
            <Badge variant="outline" className="shrink-0 border-accent/35 bg-accent/10 text-accent">
              <Repeat2 className="h-3 w-3" />
              {t("packets.marker.replay")}
            </Badge>
          ) : null}
          {isReplaySource ? (
            <Badge variant="outline" className="shrink-0 border-accent/35 bg-accent/10 text-accent">
              <GitBranch className="h-3 w-3" />
              {t("packets.marker.replaySource")}
            </Badge>
          ) : null}
          {relationships.length > 0 ? (
            <Badge variant="outline" className="shrink-0 border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
              <GitBranch className="h-3 w-3" />
              {t("packets.marker.related", { count: relationships.length })}
            </Badge>
          ) : null}
          {isError ? (
            <Badge variant="outline" className="shrink-0 border-destructive/35 bg-destructive/10 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {t("packets.marker.error")}
            </Badge>
          ) : null}
          {demoMetadata ? (
            <Badge variant="outline" className="shrink-0 border-primary/25 bg-primary/10 text-primary">
              {t("packets.demo.simulated")}
            </Badge>
          ) : null}
          {demoMetadata?.highlight ? (
            <Badge variant="default" className="min-w-0 max-w-[16.25rem] truncate">
              {demoBadgeLabel}
            </Badge>
          ) : null}
          {annotations?.bookmarked ? (
            <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/10 text-primary">
              <Bookmark className="h-3 w-3 fill-current" />
              {t("packets.annotation.bookmark")}
            </Badge>
          ) : null}
          {annotations?.suspicious ? (
            <Badge variant="outline" className="shrink-0 border-destructive/35 bg-destructive/10 text-destructive">
              <Flag className="h-3 w-3 fill-current" />
              {t("packets.annotation.suspicious")}
            </Badge>
          ) : null}
          {annotations && annotations.tags.length > 0 ? (
            <Badge variant="outline" className="shrink-0 border-primary/25 bg-primary/10 text-primary">
              <TagIcon className="h-3 w-3" />
              {t("packets.annotation.tags", { count: annotations.tags.length })}
            </Badge>
          ) : null}
        </span>
        <span className="mb-0.5 flex min-w-0 items-baseline gap-1.5 font-mono">
          {eventParts.namespace ? (
            <span className="truncate text-[0.68rem] font-medium text-muted-foreground/85">{eventParts.namespace}</span>
          ) : null}
          <span className="truncate text-[0.82rem] font-semibold text-foreground">{eventParts.name}</span>
        </span>
        <span className="block line-clamp-1 rounded-md border border-border/55 bg-code/80 px-2 py-0.5 break-all font-mono text-[0.7rem] leading-5 text-muted-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)]">
          {showPayloadPreview ? summary.preview : t("packets.previewHidden")}
        </span>
      </span>

      <span className="flex min-w-[5.5rem] flex-col items-end gap-1 whitespace-nowrap">
        <time className="rounded-sm bg-background/40 px-1.5 py-0.5 font-mono text-[0.68rem] text-muted-foreground">
          {formatTime(packet.timestamp)}
        </time>
        <span className="font-mono text-[0.7rem] text-muted-foreground">{formatBytes(packet.sizeBytes)}</span>
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isError ? "bg-destructive shadow-[0_0_14px_hsl(var(--destructive)/0.65)]" : selected ? "bg-primary" : "bg-muted-foreground/45",
          )}
        />
      </span>
    </button>
  );
});

function StatusBadge({ status }: { status: PacketStatus }) {
  const { t } = useTranslation();
  const config = {
    ai: { icon: Bot, labelKey: "packets.status.ai", className: "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-200" },
    auth: { icon: KeyRound, labelKey: "packets.status.auth", className: "border-sky-300/25 bg-sky-300/10 text-sky-200" },
    chat: { icon: MessageSquareText, labelKey: "packets.status.chat", className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" },
    error: { icon: AlertCircle, labelKey: "packets.status.error", className: "border-destructive/35 bg-destructive/10 text-destructive" },
    heartbeat: { icon: HeartPulse, labelKey: "packets.status.heartbeat", className: "border-amber-300/25 bg-amber-300/10 text-amber-100" },
    notification: { icon: Bell, labelKey: "packets.status.notification", className: "border-violet-300/25 bg-violet-300/10 text-violet-200" },
    ok: { icon: FileJson2, labelKey: "packets.status.ok", className: "border-border/70 bg-muted/20 text-muted-foreground" },
    presence: { icon: Users, labelKey: "packets.status.presence", className: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200" },
    reconnect: { icon: RefreshCw, labelKey: "packets.status.reconnect", className: "border-blue-300/25 bg-blue-300/10 text-blue-200" },
    replay: { icon: Repeat2, labelKey: "packets.status.replay", className: "border-accent/35 bg-accent/10 text-accent" },
  } satisfies Record<PacketStatus, { className: string; icon: typeof FileJson2; labelKey: string }>;
  const item = config[status];
  const Icon = item.icon;

  return (
    <span className={cn("sl-badge inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", item.className)}>
      <Icon className="h-3 w-3" />
      {t(item.labelKey)}
    </span>
  );
}

function ProtocolBadge({ label, payloadKind }: { label: string; payloadKind: Packet["payloadKind"] }) {
  const Icon = payloadKind === "json" ? Braces : payloadKind === "binary" ? Radio : FileText;

  return (
    <Badge variant="outline" className="shrink-0 border-border/60 bg-background/35 text-muted-foreground">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function getFlowIcon(kind: PacketFlowKind) {
  if (kind === "auth") {
    return KeyRound;
  }

  if (kind === "heartbeat") {
    return HeartPulse;
  }

  if (kind === "reconnect") {
    return RefreshCw;
  }

  if (kind === "replay") {
    return Repeat2;
  }

  if (kind === "request-response") {
    return GitBranch;
  }

  return Layers2;
}

function getFlowKindLabelKey(kind: PacketFlowKind) {
  if (kind === "auth") {
    return "flows.kind.auth";
  }

  if (kind === "heartbeat") {
    return "flows.kind.heartbeat";
  }

  if (kind === "reconnect") {
    return "flows.kind.reconnect";
  }

  if (kind === "replay") {
    return "flows.kind.replay";
  }

  if (kind === "request-response") {
    return "flows.kind.requestResponse";
  }

  return "flows.kind.repeatedEvent";
}

function getFlowReasonLabelKey(reason: PacketFlow["reason"]) {
  if (reason === "auth-sequence") {
    return "flows.reason.authSequence";
  }

  if (reason === "heartbeat-sequence") {
    return "flows.reason.heartbeatSequence";
  }

  if (reason === "reconnect-sequence") {
    return "flows.reason.reconnectSequence";
  }

  if (reason === "replay-source") {
    return "flows.reason.replaySource";
  }

  if (reason === "request-response") {
    return "flows.reason.requestResponse";
  }

  return "flows.reason.repeatedEvent";
}

function getFlowConfidenceLabelKey(confidence: PacketFlow["confidence"]) {
  return confidence === "explicit" ? "flows.confidence.explicit" : "flows.confidence.inferred";
}

function getFlowTone(kind: PacketFlowKind) {
  if (kind === "auth") {
    return {
      badge: "border-sky-300/25 bg-sky-300/10 text-sky-200",
      card: "border-sky-300/20 bg-[linear-gradient(90deg,hsl(198_93%_60%/0.1),hsl(var(--panel)/0.78)_46%)] hover:border-sky-300/35",
    };
  }

  if (kind === "heartbeat") {
    return {
      badge: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      card: "border-amber-300/20 bg-[linear-gradient(90deg,hsl(45_96%_58%/0.1),hsl(var(--panel)/0.78)_46%)] hover:border-amber-300/35",
    };
  }

  if (kind === "reconnect") {
    return {
      badge: "border-blue-300/25 bg-blue-300/10 text-blue-200",
      card: "border-blue-300/20 bg-[linear-gradient(90deg,hsl(215_92%_68%/0.1),hsl(var(--panel)/0.78)_46%)] hover:border-blue-300/35",
    };
  }

  if (kind === "replay") {
    return {
      badge: "border-accent/35 bg-accent/10 text-accent",
      card: "border-accent/25 bg-[linear-gradient(90deg,hsl(var(--accent)/0.1),hsl(var(--panel)/0.78)_46%)] hover:border-accent/40",
    };
  }

  if (kind === "request-response") {
    return {
      badge: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200",
      card: "border-cyan-300/20 bg-[linear-gradient(90deg,hsl(187_92%_58%/0.1),hsl(var(--panel)/0.78)_46%)] hover:border-cyan-300/35",
    };
  }

  return {
    badge: "border-primary/25 bg-primary/10 text-primary",
    card: "border-primary/20 bg-[linear-gradient(90deg,hsl(var(--primary)/0.1),hsl(var(--panel)/0.78)_46%)] hover:border-primary/35",
  };
}

function getGroupIcon(kind: PacketTimelineGroup["kind"]) {
  if (kind === "auth-flow") {
    return KeyRound;
  }

  if (kind === "heartbeat-storm") {
    return HeartPulse;
  }

  if (kind === "reconnect-flow") {
    return RefreshCw;
  }

  return Layers2;
}

function getGroupLabelKey(kind: PacketTimelineGroup["kind"]) {
  if (kind === "auth-flow") {
    return "packets.group.authFlow";
  }

  if (kind === "heartbeat-storm") {
    return "packets.group.heartbeatStorm";
  }

  if (kind === "reconnect-flow") {
    return "packets.group.reconnectFlow";
  }

  return "packets.group.repeatedEvent";
}

function getGroupTone(kind: PacketTimelineGroup["kind"]) {
  if (kind === "heartbeat-storm") {
    return {
      badge: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      icon: "border-amber-300/30 bg-amber-300/10 text-amber-100",
      rail: "bg-amber-200/75",
      row: "border-amber-300/25 bg-[linear-gradient(90deg,hsl(45_96%_58%/0.1),hsl(var(--panel)/0.86)_38%)] hover:border-amber-300/35",
    };
  }

  if (kind === "reconnect-flow") {
    return {
      badge: "border-blue-300/25 bg-blue-300/10 text-blue-200",
      icon: "border-blue-300/30 bg-blue-300/10 text-blue-200",
      rail: "bg-blue-300/75",
      row: "border-blue-300/25 bg-[linear-gradient(90deg,hsl(215_92%_68%/0.1),hsl(var(--panel)/0.86)_38%)] hover:border-blue-300/35",
    };
  }

  if (kind === "auth-flow") {
    return {
      badge: "border-sky-300/25 bg-sky-300/10 text-sky-200",
      icon: "border-sky-300/30 bg-sky-300/10 text-sky-200",
      rail: "bg-sky-300/75",
      row: "border-sky-300/25 bg-[linear-gradient(90deg,hsl(198_93%_60%/0.1),hsl(var(--panel)/0.86)_38%)] hover:border-sky-300/35",
    };
  }

  return {
    badge: "border-primary/25 bg-primary/10 text-primary",
    icon: "border-primary/30 bg-primary/10 text-primary",
    rail: "bg-primary",
    row: "border-primary/25 bg-[linear-gradient(90deg,hsl(var(--primary)/0.1),hsl(var(--panel)/0.86)_38%)] hover:border-primary/35",
  };
}

function getDirectionTone(direction: Packet["direction"]) {
  return direction === "inbound"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    : "border-amber-300/30 bg-amber-300/10 text-amber-100";
}

function getProtocolLabel(packet: Packet, t: ReturnType<typeof useTranslation>["t"]) {
  if (packet.payloadKind === "json") {
    return t("packets.protocol.json");
  }

  if (packet.payloadKind === "binary") {
    return t("packets.protocol.binary");
  }

  return t("packets.protocol.text");
}

function splitEventName(eventName: string) {
  const parts = eventName.split(".");

  if (parts.length <= 1) {
    return {
      name: eventName,
      namespace: null,
    };
  }

  return {
    name: parts[parts.length - 1] ?? eventName,
    namespace: parts.slice(0, -1).join("."),
  };
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
    filterState.eventQuery.trim().length > 0 ||
    filterState.hideHeartbeat ||
    filterState.hidePingPong ||
    filterState.payloadKind !== "all" ||
    filterState.searchQuery.trim().length > 0 ||
    filterState.smartQuery.trim().length > 0
  );
}

function createFilterPresetName(filterState: FilterState) {
  const labels: string[] = [];

  if (filterState.eventQuery.trim()) {
    labels.push(`event:${filterState.eventQuery.trim()}`);
  }

  if (filterState.smartQuery.trim()) {
    labels.push(filterState.smartQuery.trim());
  }

  if (filterState.searchQuery.trim()) {
    labels.push(`${filterState.searchMode === "regex" ? "regex" : "search"}:${filterState.searchQuery.trim()}`);
  }

  if (filterState.direction !== "all") {
    labels.push(filterState.direction);
  }

  if (filterState.payloadKind !== "all") {
    labels.push(filterState.payloadKind);
  }

  if (filterState.errorsOnly) {
    labels.push("errors");
  }

  if (filterState.hideHeartbeat) {
    labels.push("no heartbeat");
  }

  if (filterState.hidePingPong) {
    labels.push("no ping/pong");
  }

  return labels.slice(0, 2).join(" + ") || "Packet filter";
}
