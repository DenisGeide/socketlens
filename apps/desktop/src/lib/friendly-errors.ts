export function getFriendlyErrorMessage(error: unknown, fallback = "SocketLens could not complete that action.") {
  if (error instanceof Error && error.message.trim()) {
    return normalizeErrorMessage(error.message, fallback);
  }

  if (typeof error === "string" && error.trim()) {
    return normalizeErrorMessage(error, fallback);
  }

  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) {
    return normalizeErrorMessage(error.message, fallback);
  }

  return fallback;
}

export function getWebSocketCloseMessage(code: number, reason: string) {
  const suffix = reason.trim() ? ` Reason: ${reason.trim()}` : "";

  if (code === 1000 || code === 1001) {
    return `Connection closed cleanly (${code}).${suffix}`;
  }

  if (code === 1006) {
    return "The server disconnected unexpectedly. Check that the endpoint is running and reachable.";
  }

  if (code === 1008) {
    return `The server rejected the connection policy (${code}).${suffix}`;
  }

  if (code === 1011) {
    return `The server reported an internal error (${code}).${suffix}`;
  }

  return `Connection closed (${code}).${suffix}`;
}

export function getWebSocketReadyStateLabel(readyState: number | null | undefined) {
  if (readyState === 0) {
    return "connecting";
  }

  if (readyState === 1) {
    return "open";
  }

  if (readyState === 2) {
    return "closing";
  }

  if (readyState === 3) {
    return "closed";
  }

  return "not created";
}

function normalizeErrorMessage(message: string, fallback: string) {
  const normalized = message.trim();

  if (!normalized) {
    return fallback;
  }

  if (looksLikeStackTrace(normalized)) {
    return fallback;
  }

  if (normalized.includes("Failed to fetch") || normalized.includes("NetworkError")) {
    return "The network request failed. Check connectivity and try again.";
  }

  if (normalized.includes("Permission denied")) {
    return "SocketLens does not have permission to complete that action.";
  }

  return normalized;
}

function looksLikeStackTrace(message: string) {
  return /\n\s+at\s+/.test(message) || message.includes("webpack-internal://") || message.includes("vite/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
