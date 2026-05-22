import type { Packet } from "@/models";
import {
  compileFilterState,
  type CompiledFilterState,
  type FilterState,
  type SmartFilterCondition,
} from "@/models/filter-state";
import {
  getPacketSearchText,
  getPacketSummary,
  isErrorPacketFast,
  isHeartbeatPacket,
  isPingPongControlPacket,
} from "@/lib/packet-inspection";
import type { FilterEngine } from "@/extensions/types";

const parsedPayloadCache = new WeakMap<Packet, unknown | null>();

export const defaultFilterEngine: FilterEngine = {
  apply: (packets, filterState) => {
    const hasSessionScope = filterState.sessionId !== null;
    const hasSemanticFilter = isSemanticFilterActive(filterState);

    if (!hasSessionScope && !hasSemanticFilter) {
      return packets;
    }

    const compiledFilter = compileFilterState(filterState);

    if (compiledFilter.issues.length > 0) {
      return [];
    }

    return packets.filter((packet) => matchesDefaultFilter(packet, filterState, compiledFilter));
  },
  getSearchText: getPacketSearchText,
  id: "socketlens.filter.default",
  label: "Default packet filter engine",
  matches: (packet, filterState) => {
    const compiledFilter = compileFilterState(filterState);

    return compiledFilter.issues.length === 0 && matchesDefaultFilter(packet, filterState, compiledFilter);
  },
};

function matchesDefaultFilter(packet: Packet, filterState: FilterState, compiledFilter: CompiledFilterState) {
  const query = filterState.searchQuery.trim().toLowerCase();

  if (filterState.sessionId && packet.sessionId !== filterState.sessionId) {
    return false;
  }

  if (filterState.direction !== "all" && packet.direction !== filterState.direction) {
    return false;
  }

  if (filterState.payloadKind !== "all" && packet.payloadKind !== filterState.payloadKind) {
    return false;
  }

  if (filterState.errorsOnly && !isErrorPacketFast(packet)) {
    return false;
  }

  if (filterState.hideHeartbeat && isHeartbeatPacket(packet)) {
    return false;
  }

  if (filterState.hidePingPong && isPingPongControlPacket(packet)) {
    return false;
  }

  if (filterState.minSizeBytes !== null && packet.sizeBytes < filterState.minSizeBytes) {
    return false;
  }

  if (filterState.maxSizeBytes !== null && packet.sizeBytes > filterState.maxSizeBytes) {
    return false;
  }

  if (compiledFilter.eventQuery && !getPacketSummary(packet).eventName.toLowerCase().includes(compiledFilter.eventQuery)) {
    return false;
  }

  if (!matchesSearchQuery(packet, query, compiledFilter)) {
    return false;
  }

  return matchesSmartConditions(packet, compiledFilter.smartConditions);
}

function matchesSearchQuery(packet: Packet, query: string, compiledFilter: CompiledFilterState) {
  if (!query) {
    return true;
  }

  const searchText = defaultFilterEngine.getSearchText(packet);

  return compiledFilter.searchRegex ? compiledFilter.searchRegex.test(searchText) : searchText.includes(query);
}

function matchesSmartConditions(packet: Packet, conditions: SmartFilterCondition[]) {
  if (conditions.length === 0) {
    return true;
  }

  const payload = getParsedPayload(packet);

  if (!isRecord(payload)) {
    return false;
  }

  return conditions.every((condition) => matchesSmartCondition(payload, condition));
}

function matchesSmartCondition(payload: Record<string, unknown>, condition: SmartFilterCondition) {
  const value = getPathValue(payload, condition.path);
  const normalizedValue = normalizeComparableValue(value);
  const isMatch = normalizedValue === condition.expectedValue;

  return condition.operator === "==" ? isMatch : !isMatch;
}

function getParsedPayload(packet: Packet) {
  const cachedPayload = parsedPayloadCache.get(packet);

  if (cachedPayload !== undefined) {
    return cachedPayload;
  }

  if (packet.payloadKind !== "json") {
    parsedPayloadCache.set(packet, null);
    return null;
  }

  try {
    const parsed = JSON.parse(packet.payload) as unknown;
    parsedPayloadCache.set(packet, parsed);
    return parsed;
  } catch {
    parsedPayloadCache.set(packet, null);
    return null;
  }
}

function getPathValue(payload: Record<string, unknown>, path: string[]) {
  let current: unknown = payload;

  for (const segment of path) {
    if (!isRecord(current) && !Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function normalizeComparableValue(value: unknown) {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function isSemanticFilterActive(filterState: FilterState) {
  const hasSizeFilter = filterState.minSizeBytes !== null || filterState.maxSizeBytes !== null;

  return (
    filterState.direction !== "all" ||
    filterState.errorsOnly ||
    filterState.eventQuery.trim().length > 0 ||
    filterState.hideHeartbeat ||
    filterState.hidePingPong ||
    filterState.payloadKind !== "all" ||
    filterState.searchQuery.trim().length > 0 ||
    filterState.smartQuery.trim().length > 0 ||
    hasSizeFilter
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
