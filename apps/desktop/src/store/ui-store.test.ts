import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/store/ui-store";

describe("packet selection follow mode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUiStore.setState({
      packetSelectionMode: "follow",
      selectedPacketId: null,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("keeps a manually selected packet when newer packets arrive", () => {
    useUiStore.getState().selectPacket("packet-old");
    useUiStore.getState().selectLatestPacket("packet-new");

    vi.advanceTimersByTime(20);

    expect(useUiStore.getState().selectedPacketId).toBe("packet-old");
    expect(useUiStore.getState().packetSelectionMode).toBe("manual");
  });

  it("can explicitly follow and select the newest packet", () => {
    useUiStore.getState().selectPacket("packet-old");
    useUiStore.getState().followLatestPacket("packet-new");

    expect(useUiStore.getState().selectedPacketId).toBe("packet-new");
    expect(useUiStore.getState().packetSelectionMode).toBe("follow");
  });
});
