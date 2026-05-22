import { createEntityId, type EntityId } from "./ids";

export type PacketDirection = "inbound" | "outbound";
export type PacketPayloadKind = "json" | "text" | "binary";

export type PacketAnnotations = {
  bookmarked: boolean;
  note: string;
  suspicious: boolean;
  tags: string[];
  updatedAt: number;
};

export type Packet = {
  annotations?: PacketAnnotations;
  connectionId: EntityId;
  direction: PacketDirection;
  id: EntityId;
  payload: string;
  payloadKind: PacketPayloadKind;
  sessionId: EntityId;
  sizeBytes: number;
  timestamp: number;
};

export type CreatePacketInput = {
  connectionId: EntityId;
  direction: PacketDirection;
  payload: string;
  payloadKind?: PacketPayloadKind;
  sessionId: EntityId;
  timestamp?: number;
};

const encoder = new TextEncoder();

export function createPacket({
  connectionId,
  direction,
  payload,
  payloadKind,
  sessionId,
  timestamp = Date.now(),
}: CreatePacketInput): Packet {
  return {
    connectionId,
    direction,
    id: createEntityId(),
    payload,
    payloadKind: payloadKind ?? inferPayloadKind(payload),
    sessionId,
    sizeBytes: encoder.encode(payload).byteLength,
    timestamp,
  };
}

export function createPacketAnnotations(input: Partial<PacketAnnotations> = {}): PacketAnnotations {
  return {
    bookmarked: input.bookmarked ?? false,
    note: normalizeAnnotationNote(input.note),
    suspicious: input.suspicious ?? false,
    tags: normalizeAnnotationTags(input.tags),
    updatedAt: input.updatedAt ?? Date.now(),
  };
}

export function normalizePacketAnnotations(value: unknown): PacketAnnotations | null {
  if (!isRecord(value)) {
    return null;
  }

  const annotations = createPacketAnnotations({
    bookmarked: typeof value.bookmarked === "boolean" ? value.bookmarked : false,
    note: typeof value.note === "string" ? value.note : "",
    suspicious: typeof value.suspicious === "boolean" ? value.suspicious : false,
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === "string") : [],
    updatedAt: typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt) ? value.updatedAt : 0,
  });

  return hasPacketAnnotations(annotations) ? annotations : null;
}

export function hasPacketAnnotations(annotations: PacketAnnotations | null | undefined) {
  return Boolean(
    annotations &&
      (annotations.bookmarked ||
        annotations.suspicious ||
        annotations.note.trim().length > 0 ||
        annotations.tags.length > 0),
  );
}

export function inferPayloadKind(payload: string): PacketPayloadKind {
  try {
    JSON.parse(payload);
    return "json";
  } catch {
    return "text";
  }
}

function normalizeAnnotationNote(value: string | undefined) {
  return (value ?? "").trim().slice(0, 2_000);
}

function normalizeAnnotationTags(value: string[] | undefined) {
  const seenTags = new Set<string>();

  for (const tag of value ?? []) {
    const normalizedTag = tag.trim().replace(/\s+/g, "-").slice(0, 32);

    if (normalizedTag) {
      seenTags.add(normalizedTag);
    }
  }

  return [...seenTags].slice(0, 12);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
