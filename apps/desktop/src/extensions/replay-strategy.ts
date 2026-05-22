import { createReplayHistoryItem } from "@/models";
import type { ReplayStrategy } from "@/extensions/types";

const encoder = new TextEncoder();

export const defaultReplayStrategy: ReplayStrategy = {
  id: "socketlens.replay.default",
  label: "Default packet replay",
  prepare: ({ activeSession, isConnected, packet, payloadOverride }) => {
    if (!isConnected) {
      return {
        code: "connection_required",
        message: "Replay requires an active WebSocket connection.",
        ok: false,
      };
    }

    if (!packet) {
      return {
        code: "missing_packet",
        message: "Select an outgoing packet before replaying.",
        ok: false,
      };
    }

    if (!activeSession) {
      return {
        code: "connection_required",
        message: "Replay requires an active session.",
        ok: false,
      };
    }

    const payload = payloadOverride ?? packet.payload;
    const sizeBytes = encoder.encode(payload).byteLength;

    return {
      historyItem: createReplayHistoryItem({
        connectionId: activeSession.connectionId,
        payload,
        payloadKind: packet.payloadKind,
        sessionId: activeSession.id,
        sizeBytes,
        source: "replay",
        sourcePacketId: packet.id,
      }),
      ok: true,
      payload,
      sourcePacketId: packet.id,
    };
  },
};
