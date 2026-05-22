import type { EntityId } from "./ids";
import type { Packet, PacketDirection, PacketPayloadKind } from "./packet";
import { getPacketSearchText, isErrorPacketFast, isPingPongPacket } from "../lib/packet-inspection";

export type PacketDirectionFilter = "all" | PacketDirection;
export type PacketPayloadKindFilter = "all" | PacketPayloadKind;

export type FilterState = {
  direction: PacketDirectionFilter;
  errorsOnly: boolean;
  hidePingPong: boolean;
  maxSizeBytes: number | null;
  minSizeBytes: number | null;
  payloadKind: PacketPayloadKindFilter;
  searchQuery: string;
  sessionId: EntityId | null;
};

export const defaultFilterState: FilterState = {
  direction: "all",
  errorsOnly: false,
  hidePingPong: false,
  maxSizeBytes: null,
  minSizeBytes: null,
  payloadKind: "all",
  searchQuery: "",
  sessionId: null,
};

export function filterPackets(packets: Packet[], filterState: FilterState) {
  const query = filterState.searchQuery.trim().toLowerCase();
  const hasSessionScope = filterState.sessionId !== null;
  const hasSizeFilter = filterState.minSizeBytes !== null || filterState.maxSizeBytes !== null;
  const hasSemanticFilter =
    filterState.direction !== "all" ||
    filterState.errorsOnly ||
    filterState.hidePingPong ||
    filterState.payloadKind !== "all" ||
    query.length > 0 ||
    hasSizeFilter;

  if (!hasSessionScope && !hasSemanticFilter) {
    return packets;
  }

  return packets.filter((packet) => {
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

    return query.length === 0 || getPacketSearchText(packet).includes(query);
  });
}
