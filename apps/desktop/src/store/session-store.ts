import { create } from "zustand";
import {
  applyPacketStats,
  createEntityId,
  createSession,
  type EntityId,
  type Packet,
  type Session,
  type SessionStatus,
} from "@/models";

type StartSessionInput = {
  connectionId: EntityId;
  endpointUrl: string;
  name?: string;
  startedAt?: number;
};

type EndSessionOptions = {
  closeCode?: number | null;
  closeReason?: string | null;
  endedAt?: number;
};

type SessionStore = {
  flushPendingPacketStats: () => void;
  importSession: (session: Session) => void;
  recordPacket: (packet: Packet) => void;
  recordPackets: (packets: Packet[]) => void;
  removeSession: (sessionId: EntityId) => void;
  renameSession: (sessionId: EntityId, name: string) => void;
  sessions: Session[];
  startSession: (input: StartSessionInput) => Session;
  updateSessionStatus: (sessionId: EntityId, status: SessionStatus, options?: EndSessionOptions) => void;
};

const sessionBatchDelayMs = 16;
const maxSessionBatchSize = 500;

let pendingSessionPackets: Packet[] = [];
let sessionBatchTimer: ReturnType<typeof setTimeout> | null = null;
let sessionStoreSet: StoreSet | null = null;

type StoreSet = (
  partial:
    | SessionStore
    | Partial<SessionStore>
    | ((state: SessionStore) => SessionStore | Partial<SessionStore>),
  replace?: false,
) => void;

export const useSessionStore = create<SessionStore>((set) => {
  sessionStoreSet = set;

  return {
    flushPendingPacketStats,

    importSession: (session) => {
      flushPendingPacketStats();
      set((state) => ({
        sessions: [session, ...state.sessions.filter((item) => item.id !== session.id)].slice(0, 20),
      }));
    },

    recordPacket: (packet) => {
      pendingSessionPackets.push(packet);

      if (pendingSessionPackets.length >= maxSessionBatchSize) {
        flushPendingPacketStats();
        return;
      }

      scheduleSessionFlush();
    },

    recordPackets: (packets) => {
      if (packets.length === 0) {
        return;
      }

      pendingSessionPackets.push(...packets);

      if (pendingSessionPackets.length >= maxSessionBatchSize) {
        flushPendingPacketStats();
        return;
      }

      scheduleSessionFlush();
    },
    removeSession: (sessionId) => {
      flushPendingPacketStats();
      set((state) => ({
        sessions: state.sessions.filter((session) => session.id !== sessionId),
      }));
    },

    renameSession: (sessionId, name) => {
      flushPendingPacketStats();
      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                name: name.trim() || session.name,
              }
            : session,
        ),
      }));
    },

    sessions: [],

    startSession: ({ connectionId, endpointUrl, name, startedAt = Date.now() }) => {
      flushPendingPacketStats();
      const session = createSession({
        connectionId,
        endpointUrl,
        id: createEntityId(),
        name,
        startedAt,
      });

      set((state) => ({
        sessions: [session, ...state.sessions].slice(0, 20),
      }));

      return session;
    },

    updateSessionStatus: (sessionId, status, options = {}) => {
      flushPendingPacketStats();
      set((state) => ({
        sessions: state.sessions.map((session) => {
          if (session.id !== sessionId) {
            return session;
          }

          return {
            ...session,
            closeCode: options.closeCode ?? session.closeCode,
            closeReason: options.closeReason ?? session.closeReason,
            endedAt: status === "connected" || status === "connecting" ? null : (options.endedAt ?? Date.now()),
            status,
          };
        }),
      }));
    },
  };
});

function scheduleSessionFlush() {
  if (sessionBatchTimer !== null) {
    return;
  }

  sessionBatchTimer = setTimeout(() => {
    sessionBatchTimer = null;
    flushPendingPacketStats();
  }, sessionBatchDelayMs);
}

function flushPendingPacketStats() {
  if (sessionBatchTimer !== null) {
    clearTimeout(sessionBatchTimer);
    sessionBatchTimer = null;
  }

  if (pendingSessionPackets.length === 0 || !sessionStoreSet) {
    pendingSessionPackets = [];
    return;
  }

  const packets = pendingSessionPackets;
  pendingSessionPackets = [];

  sessionStoreSet((state) => ({
    sessions: state.sessions.map((session) => {
      let nextSession = session;

      for (const packet of packets) {
        if (packet.sessionId === session.id) {
          nextSession = applyPacketStats(nextSession, packet);
        }
      }

      return nextSession;
    }),
  }));
}
