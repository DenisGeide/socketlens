import { createEntityId, type EntityId } from "./ids";
import {
  normalizePacketAnnotations,
  type Packet,
  type PacketDirection,
  type PacketPayloadKind,
  type PacketSendSource,
} from "./packet";
import { getSessionName, type Session, type SessionStatus } from "./session";

export const socketLensSessionFileFormat = "socketlens.session";
export const socketLensPacketExportFileFormat = "socketlens.packets";
export const socketLensSessionFileVersion = 1;

export type SocketLensFileFormat =
  | typeof socketLensPacketExportFileFormat
  | typeof socketLensSessionFileFormat;

type SocketLensFileMetadata<Format extends SocketLensFileFormat> = {
  appName: "SocketLens";
  createdAt: string;
  endpointUrl: string | null;
  exportedAt: string;
  format: Format;
  packetCount: number;
  redaction?: SocketLensRedactionMetadata;
  sessionName: string;
  sourceSessionId: EntityId | null;
  version: typeof socketLensSessionFileVersion;
};

export type SocketLensRedactionMetadata = {
  applied: boolean;
  customRuleCount: number;
  invalidCustomRules: string[];
  redactedAt: string;
  redactedPacketCount: number;
  replacement: string;
  replacements: number;
  sensitiveDataDetected: boolean;
};

export type SocketLensSessionFile = {
  metadata: SocketLensFileMetadata<typeof socketLensSessionFileFormat>;
  packets: Packet[];
  session: Session;
};

export type SocketLensPacketExportFile = {
  metadata: SocketLensFileMetadata<typeof socketLensPacketExportFileFormat>;
  packets: Packet[];
};

export type SocketLensImportableFile = SocketLensPacketExportFile | SocketLensSessionFile;

export type CreateSessionFileInput = {
  exportedAt?: number;
  packets: Packet[];
  session: Session;
  sessionName?: string;
};

export type CreatePacketExportFileInput = {
  exportedAt?: number;
  packets: Packet[];
  session?: Session | null;
  sessionName?: string;
};

export type ParsedSocketLensFileResult =
  | {
      file: SocketLensImportableFile;
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

export type ImportedSessionSnapshot = {
  packets: Packet[];
  session: Session;
};

type PacketStats = {
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
};

const knownSessionStatuses = new Set<SessionStatus>(["closed", "connected", "connecting", "error"]);
const knownPacketDirections = new Set<PacketDirection>(["inbound", "outbound"]);
const knownPayloadKinds = new Set<PacketPayloadKind>(["binary", "json", "text"]);
const knownPacketSendSources = new Set<PacketSendSource>(["manual", "replay"]);

export function createSessionFile({
  exportedAt = Date.now(),
  packets,
  session,
  sessionName,
}: CreateSessionFileInput): SocketLensSessionFile {
  const sessionPackets = sortPacketsNewestFirst(packets.filter((packet) => packet.sessionId === session.id));
  const name = normalizeSessionName(sessionName, session);

  return {
    metadata: createFileMetadata({
      createdAt: session.createdAt,
      endpointUrl: session.endpointUrl,
      exportedAt,
      format: socketLensSessionFileFormat,
      packetCount: sessionPackets.length,
      sessionName: name,
      sourceSessionId: session.id,
    }),
    packets: sessionPackets,
    session: {
      ...session,
      name,
    },
  };
}

export function createPacketExportFile({
  exportedAt = Date.now(),
  packets,
  session = null,
  sessionName,
}: CreatePacketExportFileInput): SocketLensPacketExportFile {
  const exportedPackets = sortPacketsNewestFirst(packets);
  const name = normalizeSessionName(sessionName, session);
  const startedAt = getEarliestPacketTimestamp(exportedPackets) ?? session?.createdAt ?? exportedAt;

  return {
    metadata: createFileMetadata({
      createdAt: startedAt,
      endpointUrl: session?.endpointUrl ?? null,
      exportedAt,
      format: socketLensPacketExportFileFormat,
      packetCount: exportedPackets.length,
      sessionName: name,
      sourceSessionId: session?.id ?? null,
    }),
    packets: exportedPackets,
  };
}

export function serializeSocketLensFile(file: SocketLensImportableFile) {
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function addSocketLensRedactionMetadata<File extends SocketLensImportableFile>(
  file: File,
  redaction: SocketLensRedactionMetadata,
): File {
  return {
    ...file,
    metadata: {
      ...file.metadata,
      redaction,
    },
  };
}

export function parseSocketLensFile(contents: string): ParsedSocketLensFileResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch {
    return {
      message: "The selected file is not valid JSON.",
      ok: false,
    };
  }

  if (!isRecord(parsed)) {
    return {
      message: "The selected file does not contain a SocketLens session object.",
      ok: false,
    };
  }

  const metadataResult = parseMetadata(parsed.metadata);

  if (!metadataResult.ok) {
    return metadataResult;
  }

  const packetsResult = parsePackets(parsed.packets);

  if (!packetsResult.ok) {
    return packetsResult;
  }

  const metadata = {
    ...metadataResult.metadata,
    packetCount: packetsResult.packets.length,
  };

  if (metadata.format === socketLensPacketExportFileFormat) {
    const packetMetadata: SocketLensFileMetadata<typeof socketLensPacketExportFileFormat> = {
      ...metadata,
      format: socketLensPacketExportFileFormat,
    };

    return {
      file: {
        metadata: packetMetadata,
        packets: packetsResult.packets,
      },
      ok: true,
    };
  }

  const sessionResult = parseSession(parsed.session, metadata.sessionName);

  if (!sessionResult.ok) {
    return sessionResult;
  }

  const sessionMetadata: SocketLensFileMetadata<typeof socketLensSessionFileFormat> = {
    ...metadata,
    format: socketLensSessionFileFormat,
  };

  return {
    file: {
      metadata: sessionMetadata,
      packets: packetsResult.packets,
      session: sessionResult.session,
    },
    ok: true,
  };
}

export function createImportedSessionSnapshot(file: SocketLensImportableFile, importedAt = Date.now()): ImportedSessionSnapshot {
  const nextSessionId = createEntityId();
  const nextConnectionId = createEntityId();
  const sourceSession = "session" in file ? file.session : null;
  const sortedPackets = sortPacketsNewestFirst(file.packets);
  const status = normalizeImportedSessionStatus(sourceSession?.status ?? "closed");
  const startedAt =
    sourceSession?.startedAt ??
    getEarliestPacketTimestamp(sortedPackets) ??
    timestampFromIso(file.metadata.createdAt, importedAt);
  const endedAt =
    status === "closed" || status === "error"
      ? (sourceSession?.endedAt ?? getLatestPacketTimestamp(sortedPackets) ?? importedAt)
      : sourceSession?.endedAt ?? null;
  const endpointUrl = sourceSession?.endpointUrl ?? file.metadata.endpointUrl ?? "import://socketlens/session";
  const packetIdMap = new Map(sortedPackets.map((packet) => [packet.id, createEntityId()]));
  const importedPackets = sortedPackets.map((packet) => {
    const nextPacketId = packetIdMap.get(packet.id) ?? createEntityId();
    const nextSourcePacketId = packet.sourcePacketId
      ? (packetIdMap.get(packet.sourcePacketId) ?? packet.sourcePacketId)
      : packet.sourcePacketId;

    return {
      ...packet,
      connectionId: nextConnectionId,
      id: nextPacketId,
      sessionId: nextSessionId,
      ...(packet.sendSource ? { sourcePacketId: nextSourcePacketId } : {}),
    };
  });
  const stats = getPacketStats(importedPackets);

  return {
    packets: importedPackets,
    session: {
      bytesReceived: stats.bytesReceived,
      bytesSent: stats.bytesSent,
      closeCode: sourceSession?.closeCode ?? null,
      closeReason:
        sourceSession?.closeReason ??
        (sourceSession?.status === "connected" || sourceSession?.status === "connecting" ? "Imported session snapshot" : null),
      connectionId: nextConnectionId,
      createdAt: timestampFromIso(file.metadata.createdAt, sourceSession?.createdAt ?? startedAt),
      endedAt,
      endpointUrl,
      id: nextSessionId,
      name: file.metadata.sessionName,
      packetsReceived: stats.packetsReceived,
      packetsSent: stats.packetsSent,
      startedAt,
      status,
    },
  };
}

export function getSuggestedSessionFileName(file: SocketLensSessionFile) {
  return `${sanitizeFileName(file.metadata.sessionName)}-${formatFileTimestamp(file.metadata.exportedAt)}.socketlens-session.json`;
}

export function getSuggestedPacketExportFileName(file: SocketLensPacketExportFile) {
  return `${sanitizeFileName(file.metadata.sessionName)}-${formatFileTimestamp(file.metadata.exportedAt)}.socketlens-packets.json`;
}

export function getSocketLensFileLabel(file: SocketLensImportableFile) {
  return file.metadata.format === socketLensSessionFileFormat ? "session" : "packet export";
}

function createFileMetadata<Format extends SocketLensFileFormat>({
  createdAt,
  endpointUrl,
  exportedAt,
  format,
  packetCount,
  sessionName,
  sourceSessionId,
}: {
  createdAt: number;
  endpointUrl: string | null;
  exportedAt: number;
  format: Format;
  packetCount: number;
  sessionName: string;
  sourceSessionId: EntityId | null;
}): SocketLensFileMetadata<Format> {
  return {
    appName: "SocketLens",
    createdAt: new Date(createdAt).toISOString(),
    endpointUrl,
    exportedAt: new Date(exportedAt).toISOString(),
    format,
    packetCount,
    sessionName,
    sourceSessionId,
    version: socketLensSessionFileVersion,
  };
}

function normalizeSessionName(sessionName: string | undefined, session?: Session | null) {
  const trimmedName = sessionName?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  if (session?.name) {
    return session.name;
  }

  return session ? getSessionName(session.endpointUrl) : "SocketLens packet export";
}

function parseMetadata(value: unknown):
  | {
      metadata: SocketLensFileMetadata<SocketLensFileFormat>;
      ok: true;
    }
  | {
      message: string;
      ok: false;
    } {
  if (!isRecord(value)) {
    return {
      message: "The file is missing SocketLens metadata.",
      ok: false,
    };
  }

  const format = readString(value, "format");

  if (format !== socketLensSessionFileFormat && format !== socketLensPacketExportFileFormat) {
    return {
      message: "The file is not a supported SocketLens session or packet export.",
      ok: false,
    };
  }

  const version = readNumber(value, "version");

  if (version !== socketLensSessionFileVersion) {
    return {
      message: `Unsupported SocketLens file version: ${version ?? "unknown"}.`,
      ok: false,
    };
  }

  const sessionName = readString(value, "sessionName")?.trim();
  const createdAt = readString(value, "createdAt");
  const exportedAt = readString(value, "exportedAt");
  const packetCount = readNumber(value, "packetCount");

  if (!sessionName || !createdAt || !exportedAt || packetCount === null) {
    return {
      message: "The file metadata is incomplete.",
      ok: false,
    };
  }

  return {
    metadata: {
      appName: "SocketLens",
      createdAt,
      endpointUrl: readNullableString(value, "endpointUrl"),
      exportedAt,
      format,
      packetCount,
      redaction: parseRedactionMetadata(value.redaction),
      sessionName,
      sourceSessionId: readNullableString(value, "sourceSessionId"),
      version: socketLensSessionFileVersion,
    },
    ok: true,
  };
}

function parseRedactionMetadata(value: unknown): SocketLensRedactionMetadata | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const applied = value.applied;
  const customRuleCount = readNumber(value, "customRuleCount");
  const invalidCustomRules = Array.isArray(value.invalidCustomRules)
    ? value.invalidCustomRules.filter((item): item is string => typeof item === "string")
    : [];
  const redactedAt = readString(value, "redactedAt");
  const redactedPacketCount = readNumber(value, "redactedPacketCount");
  const replacement = readString(value, "replacement");
  const replacements = readNumber(value, "replacements");
  const sensitiveDataDetected = value.sensitiveDataDetected;

  if (
    typeof applied !== "boolean" ||
    customRuleCount === null ||
    !redactedAt ||
    redactedPacketCount === null ||
    !replacement ||
    replacements === null ||
    typeof sensitiveDataDetected !== "boolean"
  ) {
    return undefined;
  }

  return {
    applied,
    customRuleCount,
    invalidCustomRules,
    redactedAt,
    redactedPacketCount,
    replacement,
    replacements,
    sensitiveDataDetected,
  };
}

function parseSession(value: unknown, fallbackName: string):
  | {
      ok: true;
      session: Session;
    }
  | {
      message: string;
      ok: false;
    } {
  if (!isRecord(value)) {
    return {
      message: "The session file is missing session details.",
      ok: false,
    };
  }

  const status = readString(value, "status");

  if (!isSessionStatus(status)) {
    return {
      message: "The session file contains an unsupported session status.",
      ok: false,
    };
  }

  const connectionId = readString(value, "connectionId");
  const endpointUrl = readString(value, "endpointUrl");
  const id = readString(value, "id");
  const startedAt = readNumber(value, "startedAt");

  if (!connectionId || !endpointUrl || !id || startedAt === null) {
    return {
      message: "The session file is missing required session fields.",
      ok: false,
    };
  }

  return {
    ok: true,
    session: {
      bytesReceived: readNumber(value, "bytesReceived") ?? 0,
      bytesSent: readNumber(value, "bytesSent") ?? 0,
      closeCode: readNullableNumber(value, "closeCode"),
      closeReason: readNullableString(value, "closeReason"),
      connectionId,
      createdAt: readNumber(value, "createdAt") ?? startedAt,
      endedAt: readNullableNumber(value, "endedAt"),
      endpointUrl,
      id,
      name: readString(value, "name")?.trim() || fallbackName,
      packetsReceived: readNumber(value, "packetsReceived") ?? 0,
      packetsSent: readNumber(value, "packetsSent") ?? 0,
      startedAt,
      status,
    },
  };
}

function parsePackets(value: unknown):
  | {
      ok: true;
      packets: Packet[];
    }
  | {
      message: string;
      ok: false;
    } {
  if (!Array.isArray(value)) {
    return {
      message: "The file is missing its packet list.",
      ok: false,
    };
  }

  const packets: Packet[] = [];

  for (const item of value) {
    const parsedPacket = parsePacket(item);

    if (!parsedPacket.ok) {
      return parsedPacket;
    }

    packets.push(parsedPacket.packet);
  }

  return {
    ok: true,
    packets: sortPacketsNewestFirst(packets),
  };
}

function parsePacket(value: unknown):
  | {
      ok: true;
      packet: Packet;
    }
  | {
      message: string;
      ok: false;
    } {
  if (!isRecord(value)) {
    return {
      message: "A packet entry is not a valid object.",
      ok: false,
    };
  }

  const connectionId = readString(value, "connectionId");
  const direction = readString(value, "direction");
  const id = readString(value, "id");
  const payload = readString(value, "payload");
  const payloadKind = readString(value, "payloadKind");
  const sendSource = readString(value, "sendSource");
  const sessionId = readString(value, "sessionId");
  const sizeBytes = readNumber(value, "sizeBytes");
  const sourcePacketId = readNullableString(value, "sourcePacketId");
  const timestamp = readNumber(value, "timestamp");

  if (
    !connectionId ||
    !isPacketDirection(direction) ||
    !id ||
    payload === null ||
    !isPacketPayloadKind(payloadKind) ||
    !sessionId ||
    sizeBytes === null ||
    timestamp === null
  ) {
    return {
      message: "A packet entry is missing required fields.",
      ok: false,
    };
  }

  const annotations = normalizePacketAnnotations(value.annotations);

  return {
    ok: true,
    packet: {
      ...(annotations ? { annotations } : {}),
      connectionId,
      direction,
      id,
      payload,
      payloadKind,
      ...(isPacketSendSource(sendSource) ? { sendSource, sourcePacketId } : {}),
      sessionId,
      sizeBytes,
      timestamp,
    },
  };
}

function getPacketStats(packets: Packet[]): PacketStats {
  return packets.reduce<PacketStats>(
    (stats, packet) => {
      if (packet.direction === "inbound") {
        return {
          ...stats,
          bytesReceived: stats.bytesReceived + packet.sizeBytes,
          packetsReceived: stats.packetsReceived + 1,
        };
      }

      return {
        ...stats,
        bytesSent: stats.bytesSent + packet.sizeBytes,
        packetsSent: stats.packetsSent + 1,
      };
    },
    {
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
    },
  );
}

function sortPacketsNewestFirst(packets: Packet[]) {
  return [...packets].sort((left, right) => right.timestamp - left.timestamp);
}

function getEarliestPacketTimestamp(packets: Packet[]) {
  if (packets.length === 0) {
    return null;
  }

  return Math.min(...packets.map((packet) => packet.timestamp));
}

function getLatestPacketTimestamp(packets: Packet[]) {
  if (packets.length === 0) {
    return null;
  }

  return Math.max(...packets.map((packet) => packet.timestamp));
}

function normalizeImportedSessionStatus(status: SessionStatus): SessionStatus {
  return status === "connected" || status === "connecting" ? "closed" : status;
}

function sanitizeFileName(value: string) {
  const cleanedValue = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleanedValue || "socketlens-session";
}

function formatFileTimestamp(value: string) {
  return value.replace(/\.\d{3}Z$/, "Z").replace(/[:.]/g, "-");
}

function timestampFromIso(value: string, fallback: number) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "string" ? value : null;
}

function readNullableString(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "string" ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNullableNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isSessionStatus(value: string | null): value is SessionStatus {
  return value !== null && knownSessionStatuses.has(value as SessionStatus);
}

function isPacketDirection(value: string | null): value is PacketDirection {
  return value !== null && knownPacketDirections.has(value as PacketDirection);
}

function isPacketPayloadKind(value: string | null): value is PacketPayloadKind {
  return value !== null && knownPayloadKinds.has(value as PacketPayloadKind);
}

function isPacketSendSource(value: string | null): value is PacketSendSource {
  return value !== null && knownPacketSendSources.has(value as PacketSendSource);
}
