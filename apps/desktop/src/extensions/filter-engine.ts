import type { Packet } from "@/models";
import type { FilterState } from "@/models/filter-state";
import { getPacketSearchText, isErrorPacketFast, isPingPongPacket } from "@/lib/packet-inspection";
import type { FilterEngine } from "@/extensions/types";

export const defaultFilterEngine: FilterEngine = {
  apply: (packets, filterState) => {
    const hasSessionScope = filterState.sessionId !== null;
    const hasSemanticFilter = isSemanticFilterActive(filterState);

    if (!hasSessionScope && !hasSemanticFilter) {
      return packets;
    }

    return packets.filter((packet) => defaultFilterEngine.matches(packet, filterState));
  },
  getSearchText: getPacketSearchText,
  id: "socketlens.filter.default",
  label: "Default packet filter engine",
  matches: (packet, filterState) => matchesDefaultFilter(packet, filterState),
};

function matchesDefaultFilter(packet: Packet, filterState: FilterState) {
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

  if (filterState.hidePingPong && isPingPongPacket(packet)) {
    return false;
  }

  if (filterState.minSizeBytes !== null && packet.sizeBytes < filterState.minSizeBytes) {
    return false;
  }

  if (filterState.maxSizeBytes !== null && packet.sizeBytes > filterState.maxSizeBytes) {
    return false;
  }

  return query.length === 0 || defaultFilterEngine.getSearchText(packet).includes(query);
}

function isSemanticFilterActive(filterState: FilterState) {
  const hasSizeFilter = filterState.minSizeBytes !== null || filterState.maxSizeBytes !== null;

  return (
    filterState.direction !== "all" ||
    filterState.errorsOnly ||
    filterState.hidePingPong ||
    filterState.payloadKind !== "all" ||
    filterState.searchQuery.trim().length > 0 ||
    hasSizeFilter
  );
}
