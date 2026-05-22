import { createEntityId, type EntityId } from "./ids";

export type AppLogLevel = "debug" | "info" | "success" | "warning" | "error";

export type AppLog = {
  connectionId: EntityId | null;
  id: EntityId;
  level: AppLogLevel;
  message: string;
  sessionId: EntityId | null;
  timestamp: number;
};

export type CreateAppLogInput = {
  connectionId?: EntityId | null;
  level: AppLogLevel;
  message: string;
  sessionId?: EntityId | null;
  timestamp?: number;
};

export function createAppLog({
  connectionId = null,
  level,
  message,
  sessionId = null,
  timestamp = Date.now(),
}: CreateAppLogInput): AppLog {
  return {
    connectionId,
    id: createEntityId(),
    level,
    message,
    sessionId,
    timestamp,
  };
}
