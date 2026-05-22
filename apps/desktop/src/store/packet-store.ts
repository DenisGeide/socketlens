import { create } from "zustand";
import type { EntityId, Packet } from "@/models";
import { useSettingsStore } from "@/store/settings-store";
import { useUiStore } from "@/store/ui-store";

type PacketStore = {
  addPacket: (packet: Packet) => void;
  addPackets: (packets: Packet[]) => void;
  clearPackets: (sessionId?: EntityId | null) => void;
  flushPendingPackets: () => void;
  packets: Packet[];
  trimToRetentionLimit: () => void;
};

const packetBatchDelayMs = 16;
const maxPacketBatchSize = 500;

let pendingPacketBatch: Packet[] = [];
let packetBatchTimer: ReturnType<typeof setTimeout> | null = null;
let packetStoreSet: StoreSet | null = null;
let lastRetentionWarningAt = 0;
let retainedPacketWarningLimit: number | null = null;

type StoreSet = (
  partial:
    | PacketStore
    | Partial<PacketStore>
    | ((state: PacketStore) => PacketStore | Partial<PacketStore>),
  replace?: false,
) => void;

export const usePacketStore = create<PacketStore>((set) => {
  packetStoreSet = set;

  return {
    addPackets: (packets) => {
      flushPendingPackets();

      if (packets.length === 0) {
        return;
      }

      set((state) => {
        const nextPackets = mergePacketsByTimestamp(sortPacketsByTimestamp(packets), state.packets);

        return {
          packets: retainNewestPackets(nextPackets),
        };
      });
    },

    addPacket: (packet) => {
      pendingPacketBatch.push(packet);

      if (pendingPacketBatch.length >= maxPacketBatchSize) {
        flushPendingPackets();
        return;
      }

      schedulePacketFlush();
    },

    clearPackets: (sessionId = null) => {
      flushPendingPackets();

      set((state) => ({
        packets: sessionId ? state.packets.filter((packet) => packet.sessionId !== sessionId) : [],
      }));
    },

    flushPendingPackets,

    packets: [],

    trimToRetentionLimit: () => {
      flushPendingPackets();
      set((state) => ({
        packets: retainNewestPackets(state.packets),
      }));
    },
  };
});

function schedulePacketFlush() {
  if (packetBatchTimer !== null) {
    return;
  }

  packetBatchTimer = setTimeout(() => {
    packetBatchTimer = null;
    flushPendingPackets();
  }, packetBatchDelayMs);
}

function flushPendingPackets() {
  if (packetBatchTimer !== null) {
    clearTimeout(packetBatchTimer);
    packetBatchTimer = null;
  }

  if (pendingPacketBatch.length === 0 || !packetStoreSet) {
    pendingPacketBatch = [];
    return;
  }

  const nextBatch = sortPacketsByTimestamp(pendingPacketBatch);
  pendingPacketBatch = [];

  packetStoreSet((state) => ({
    packets: retainNewestPackets(mergePacketsByTimestamp(nextBatch, state.packets)),
  }));
}

function sortPacketsByTimestamp(packets: Packet[]) {
  return [...packets].sort((left, right) => right.timestamp - left.timestamp);
}

function mergePacketsByTimestamp(leftPackets: Packet[], rightPackets: Packet[]) {
  const mergedPackets: Packet[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftPackets.length && rightIndex < rightPackets.length) {
    const leftPacket = leftPackets[leftIndex];
    const rightPacket = rightPackets[rightIndex];

    if (!leftPacket || !rightPacket) {
      break;
    }

    if (leftPacket.timestamp >= rightPacket.timestamp) {
      mergedPackets.push(leftPacket);
      leftIndex += 1;
    } else {
      mergedPackets.push(rightPacket);
      rightIndex += 1;
    }
  }

  if (leftIndex < leftPackets.length) {
    mergedPackets.push(...leftPackets.slice(leftIndex));
  }

  if (rightIndex < rightPackets.length) {
    mergedPackets.push(...rightPackets.slice(rightIndex));
  }

  return mergedPackets;
}

function retainNewestPackets(packets: Packet[]) {
  const limit = useSettingsStore.getState().settings.packetRetentionLimit;

  if (packets.length <= limit) {
    retainedPacketWarningLimit = null;
    return packets;
  }

  const droppedCount = packets.length - limit;

  notifyRetentionLimitReached(limit, droppedCount);

  return packets.slice(0, limit);
}

function notifyRetentionLimitReached(limit: number, droppedCount: number) {
  const now = Date.now();

  if (retainedPacketWarningLimit === limit && now - lastRetentionWarningAt < 15_000) {
    return;
  }

  retainedPacketWarningLimit = limit;
  lastRetentionWarningAt = now;

  const message = `Packet retention limit reached (${limit.toLocaleString()} packets). SocketLens cleared ${droppedCount.toLocaleString()} oldest packet${
    droppedCount === 1 ? "" : "s"
  } from memory.`;

  useUiStore.getState().addLog({
    level: "warning",
    message,
  });
  useUiStore.getState().addToast({
    level: "warning",
    message,
    title: "Packet limit reached",
  });
}
