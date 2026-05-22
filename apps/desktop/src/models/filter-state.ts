import type { EntityId } from "./ids";
import type { Packet, PacketDirection, PacketPayloadKind } from "./packet";
import { defaultFilterEngine } from "@/extensions/filter-engine";

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
  return defaultFilterEngine.apply(packets, filterState);
}
