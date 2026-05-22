import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/tauri-runtime";

export type NativeErrorCode =
  | "invalid_input"
  | "proxy_already_running"
  | "proxy_bind_failed"
  | "proxy_not_running"
  | "proxy_runtime"
  | "state_unavailable"
  | "tauri_unavailable"
  | "unknown";

export type NativeCommandError = {
  code: NativeErrorCode;
  message: string;
};

export type NativeCommandResult<T> =
  | {
      data: T;
      ok: true;
    }
  | {
      error: NativeCommandError;
      ok: false;
    };

export type NativeBackendState = "checking" | "error" | "ready" | "unavailable";

export type HealthResponse = {
  status: "ok";
  version: string;
};

export type ProxyMode = "not_configured" | "proxy";

export type ProxyStatus = {
  activeConnections: number;
  isRunning: boolean;
  listenUrl: string | null;
  mode: ProxyMode;
  targetUrl: string | null;
};

export type SessionRegistrySnapshot = {
  activeSessions: number;
  totalSessions: number;
};

export type BackendStatus = {
  health: HealthResponse;
  proxy: ProxyStatus;
  sessions: SessionRegistrySnapshot;
};

export type StartProxyRequest = {
  targetUrl: string;
};

type TauriCommandPayloads = {
  get_backend_status: undefined;
  get_proxy_status: undefined;
  health_check: undefined;
  start_proxy: { request: StartProxyRequest };
  stop_proxy: undefined;
};

type TauriCommandResponses = {
  get_backend_status: BackendStatus;
  get_proxy_status: ProxyStatus;
  health_check: HealthResponse;
  start_proxy: ProxyStatus;
  stop_proxy: ProxyStatus;
};

type TauriCommandName = keyof TauriCommandPayloads;

export async function getBackendStatus() {
  return safeInvokeCommand("get_backend_status");
}

export async function getProxyStatus() {
  return safeInvokeCommand("get_proxy_status");
}

export async function healthCheck() {
  return safeInvokeCommand("health_check");
}

export async function startProxy(request: StartProxyRequest) {
  return safeInvokeCommand("start_proxy", { request });
}

export async function stopProxy() {
  return safeInvokeCommand("stop_proxy");
}

async function safeInvokeCommand<Name extends TauriCommandName>(
  command: Name,
  payload?: TauriCommandPayloads[Name],
): Promise<NativeCommandResult<TauriCommandResponses[Name]>> {
  if (!isTauriRuntime()) {
    return {
      error: {
        code: "tauri_unavailable",
        message: "Native Tauri backend is unavailable in browser development mode.",
      },
      ok: false,
    };
  }

  try {
    const data = await invoke<TauriCommandResponses[Name]>(command, payload ?? {});

    return {
      data,
      ok: true,
    };
  } catch (error) {
    return {
      error: normalizeNativeCommandError(error),
      ok: false,
    };
  }
}

function normalizeNativeCommandError(error: unknown): NativeCommandError {
  if (isNativeCommandError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return {
      code: "unknown",
      message: error.message,
    };
  }

  if (typeof error === "string") {
    return {
      code: "unknown",
      message: error,
    };
  }

  return {
    code: "unknown",
    message: "Native command failed.",
  };
}

function isNativeCommandError(value: unknown): value is NativeCommandError {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.code === "string" && typeof value.message === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
