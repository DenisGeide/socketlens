import { defaultFilterEngine } from "@/extensions/filter-engine";
import type { Packet } from "./packet";
import type { FilterState } from "./filter-state";

export function filterPackets(packets: Packet[], filterState: FilterState) {
  return defaultFilterEngine.apply(packets, filterState);
}
