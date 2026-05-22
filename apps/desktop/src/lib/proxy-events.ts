import { listen } from "@tauri-apps/api/event";
import { isTauriRuntime } from "@/lib/tauri-runtime";
import type { AppLogLevel, PacketDirection, PacketPayloadKind, SessionStatus } from "@/models";

export const proxyLogEventName = "socketlens://proxy-log";
export const proxyPacketEventName = "socketlens://proxy-packet";
export const proxySessionClosedEventName = "socketlens://proxy-session-closed";
export const proxySessionStartedEventName = "socketlens://proxy-session-started";

export type ProxySessionStartedEvent = {
  connectionId: string;
  localProxyUrl: string;
  peerAddress: string;
  sessionId: string;
  startedAt: number;
  targetUrl: string;
};

export type ProxyPacketEvent = {
  connectionId: string;
  direction: PacketDirection;
  id: string;
  payload: string;
  payloadKind: PacketPayloadKind;
  sessionId: string;
  sizeBytes: number;
  timestamp: number;
};

export type ProxySessionClosedEvent = {
  closeReason: string | null;
  connectionId: string;
  endedAt: number;
  sessionId: string;
  status: Extract<SessionStatus, "closed" | "error">;
};

export type ProxyLogEvent = {
  connectionId: string | null;
  level: AppLogLevel;
  message: string;
  sessionId: string | null;
  timestamp: number;
};

type ProxyEventHandlers = {
  onLog: (event: ProxyLogEvent) => void;
  onPacket: (event: ProxyPacketEvent) => void;
  onSessionClosed: (event: ProxySessionClosedEvent) => void;
  onSessionStarted: (event: ProxySessionStartedEvent) => void;
};

let activeProxyListenerGeneration = 0;
let activeProxyListenerCleanup: (() => void) | null = null;

export async function registerProxyEventListeners(handlers: ProxyEventHandlers) {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  activeProxyListenerGeneration += 1;
  const generation = activeProxyListenerGeneration;
  activeProxyListenerCleanup?.();
  activeProxyListenerCleanup = null;

  const unlisteners = await Promise.all([
    listen<ProxyLogEvent>(proxyLogEventName, (event) => handlers.onLog(event.payload)),
    listen<ProxyPacketEvent>(proxyPacketEventName, (event) => handlers.onPacket(event.payload)),
    listen<ProxySessionClosedEvent>(proxySessionClosedEventName, (event) => handlers.onSessionClosed(event.payload)),
    listen<ProxySessionStartedEvent>(proxySessionStartedEventName, (event) => handlers.onSessionStarted(event.payload)),
  ]);

  const cleanup = () => {
    for (const unlisten of unlisteners) {
      unlisten();
    }
  };

  if (generation !== activeProxyListenerGeneration) {
    cleanup();
    return () => undefined;
  }

  activeProxyListenerCleanup = cleanup;

  return () => {
    if (generation !== activeProxyListenerGeneration) {
      return;
    }

    activeProxyListenerCleanup?.();
    activeProxyListenerCleanup = null;
  };
}
