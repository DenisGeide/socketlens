import { parseJsonPayload } from "@/lib/json-payload";
import { getPacketEventName, truncatePreview } from "@/lib/packet-inspection";
import { redactUrlForDisplay, type Packet, type PacketDirection, type Session } from "@/models";

export type AsyncApiDraftExport = {
  contents: string;
  eventCount: number;
  fileName: string;
  packetCount: number;
};

export type CreateAsyncApiDraftInput = {
  exportedAt?: number;
  packets: Packet[];
  redactionApplied?: boolean;
  session: Session;
  sessionName?: string;
};

type EventGroup = {
  direction: PacketDirection;
  eventName: string;
  examples: Packet[];
  packetCount: number;
  payloadKind: Packet["payloadKind"];
};

const maxEventGroups = 80;
const maxExamplesPerEvent = 1;
const maxExampleStringLength = 800;
const maxObjectProperties = 32;
const maxArrayItems = 12;
const asyncApiDraftVersion = "0.1.0-experimental";

export function createAsyncApiDraftExport({
  exportedAt = Date.now(),
  packets,
  redactionApplied = true,
  session,
  sessionName,
}: CreateAsyncApiDraftInput): AsyncApiDraftExport {
  const sortedPackets = [...packets]
    .filter((packet) => packet.sessionId === session.id)
    .sort((left, right) => left.timestamp - right.timestamp);
  const groups = createEventGroups(sortedPackets);
  const document = createAsyncApiDocument({
    exportedAt,
    groups,
    redactionApplied,
    session,
    sessionName: sessionName?.trim() || session.name,
  });

  return {
    contents: [
      "# Experimental SocketLens AsyncAPI draft",
      "# This file is inferred from captured WebSocket traffic.",
      "# Review, edit, and validate it before using it as an API contract.",
      "# Fields marked with x-socketlens-inferred are guesses, not guarantees.",
      toYaml(document),
      "",
    ].join("\n"),
    eventCount: groups.length,
    fileName: getSuggestedAsyncApiDraftFileName(sessionName?.trim() || session.name, exportedAt),
    packetCount: sortedPackets.length,
  };
}

function createAsyncApiDocument({
  exportedAt,
  groups,
  redactionApplied,
  session,
  sessionName,
}: {
  exportedAt: number;
  groups: EventGroup[];
  redactionApplied: boolean;
  session: Session;
  sessionName: string;
}) {
  const server = createServerObject(session.endpointUrl);
  const channels: Record<string, unknown> = {};
  const operations: Record<string, unknown> = {};
  const messages: Record<string, unknown> = {};

  for (const group of groups.slice(0, maxEventGroups)) {
    const channelKey = createUniqueKey(channels, `${group.eventName}-${group.direction}`);
    const messageKey = createUniqueKey(messages, group.eventName);
    const operationKey = createUniqueKey(operations, `${group.direction === "inbound" ? "receive" : "send"}-${group.eventName}`);
    const examplePacket = group.examples[0] ?? null;
    const examplePayload = examplePacket ? createPayloadExample(examplePacket) : null;

    channels[channelKey] = {
      address: group.eventName,
      description: `Inferred ${group.direction} WebSocket event from ${group.packetCount} captured packet(s).`,
      messages: {
        [messageKey]: {
          $ref: `#/components/messages/${messageKey}`,
        },
      },
      "x-socketlens-direction": group.direction,
      "x-socketlens-inferred": true,
    };

    operations[operationKey] = {
      action: group.direction === "inbound" ? "receive" : "send",
      channel: {
        $ref: `#/channels/${channelKey}`,
      },
      summary: `${group.direction === "inbound" ? "Receive" : "Send"} ${group.eventName}`,
      "x-socketlens-direction": group.direction,
      "x-socketlens-inferred": true,
      "x-socketlens-packet-count": group.packetCount,
    };

    messages[messageKey] = {
      contentType: group.payloadKind === "json" ? "application/json" : "text/plain",
      examples: examplePayload
        ? [
            {
              name: "captured_example_1",
              payload: examplePayload,
              summary: "Sanitized captured example from SocketLens.",
              "x-socketlens-inferred": true,
            },
          ]
        : [],
      name: group.eventName,
      payload: examplePayload ? inferPayloadSchema(examplePayload) : createFallbackPayloadSchema(group.payloadKind),
      summary: `Inferred from ${group.packetCount} ${group.direction} packet(s).`,
      "x-socketlens-direction": group.direction,
      "x-socketlens-inferred": true,
    };
  }

  return {
    asyncapi: "3.0.0",
    info: {
      description:
        "Experimental SocketLens draft generated from captured WebSocket traffic. It is not a confirmed API contract.",
      title: `${sessionName} realtime events`,
      version: asyncApiDraftVersion,
      "x-socketlens-experimental": true,
      "x-socketlens-inferred": true,
    },
    servers: {
      captured: server,
    },
    channels,
    operations,
    components: {
      messages,
    },
    "x-socketlens": {
      generatedAt: new Date(exportedAt).toISOString(),
      packetCount: groups.reduce((count, group) => count + group.packetCount, 0),
      privacy: {
        redactionApplied,
        note: redactionApplied
          ? "Generated from a redacted export copy. Review before sharing."
          : "Generated from a raw export copy. Review carefully before sharing.",
      },
      source: {
        endpointUrl: redactUrlForDisplay(session.endpointUrl),
        sessionId: session.id,
        sessionName,
      },
    },
  };
}

function createEventGroups(packets: Packet[]) {
  const groupsByKey = new Map<string, EventGroup>();

  for (const packet of packets) {
    const eventName = getPacketEventName(packet) || "unknown.event";
    const key = `${packet.direction}:${eventName}`;
    const existingGroup = groupsByKey.get(key);

    if (existingGroup) {
      existingGroup.packetCount += 1;

      if (existingGroup.examples.length < maxExamplesPerEvent) {
        existingGroup.examples.push(packet);
      }

      continue;
    }

    groupsByKey.set(key, {
      direction: packet.direction,
      eventName,
      examples: [packet],
      packetCount: 1,
      payloadKind: packet.payloadKind,
    });
  }

  return [...groupsByKey.values()].sort((left, right) => {
    if (right.packetCount !== left.packetCount) {
      return right.packetCount - left.packetCount;
    }

    return left.eventName.localeCompare(right.eventName);
  });
}

function createPayloadExample(packet: Packet): unknown {
  if (packet.payloadKind !== "json") {
    return truncatePreview(packet.payload, maxExampleStringLength);
  }

  const parsed = parseJsonPayload(packet.payload);

  if (!parsed.ok) {
    return truncatePreview(packet.payload, maxExampleStringLength);
  }

  return trimExampleValue(parsed.value);
}

function trimExampleValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > maxExampleStringLength ? `${value.slice(0, maxExampleStringLength)}... [TRUNCATED]` : value;
  }

  if (Array.isArray(value)) {
    const trimmedItems = value.slice(0, maxArrayItems).map(trimExampleValue);

    return value.length > maxArrayItems ? [...trimmedItems, "[TRUNCATED]"] : trimmedItems;
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).slice(0, maxObjectProperties);
    const trimmedRecord = Object.fromEntries(entries.map(([key, entryValue]) => [key, trimExampleValue(entryValue)]));

    return Object.keys(value).length > maxObjectProperties
      ? {
          ...trimmedRecord,
          "x-socketlens-truncated": true,
        }
      : trimmedRecord;
  }

  return value;
}

function inferPayloadSchema(value: unknown, depth = 0): unknown {
  const baseMetadata = {
    "x-socketlens-inferred": true,
  };

  if (depth > 3) {
    return {
      ...baseMetadata,
      description: "Nested shape omitted by SocketLens draft exporter.",
    };
  }

  if (Array.isArray(value)) {
    return {
      ...baseMetadata,
      items: value.length > 0 ? inferPayloadSchema(value[0], depth + 1) : { "x-socketlens-inferred": true },
      type: "array",
    };
  }

  if (isRecord(value)) {
    const properties: Record<string, unknown> = {};

    for (const [key, entryValue] of Object.entries(value).slice(0, maxObjectProperties)) {
      properties[key] = inferPayloadSchema(entryValue, depth + 1);
    }

    return {
      ...baseMetadata,
      additionalProperties: true,
      properties,
      type: "object",
    };
  }

  if (typeof value === "string") {
    return {
      ...baseMetadata,
      type: "string",
    };
  }

  if (typeof value === "number") {
    return {
      ...baseMetadata,
      type: Number.isInteger(value) ? "integer" : "number",
    };
  }

  if (typeof value === "boolean") {
    return {
      ...baseMetadata,
      type: "boolean",
    };
  }

  return {
    ...baseMetadata,
    nullable: true,
  };
}

function createFallbackPayloadSchema(payloadKind: Packet["payloadKind"]) {
  return {
    description: `Payload shape could not be inferred from ${payloadKind} content.`,
    "x-socketlens-inferred": true,
  };
}

function createServerObject(endpointUrl: string) {
  try {
    const url = new URL(endpointUrl);

    return {
      host: url.host || "unknown",
      pathname: url.pathname || "/",
      protocol: url.protocol === "wss:" ? "wss" : url.protocol === "ws:" ? "ws" : "ws",
      "x-socketlens-endpoint": redactUrlForDisplay(endpointUrl),
      "x-socketlens-inferred": true,
    };
  } catch {
    return {
      host: "unknown",
      protocol: "ws",
      "x-socketlens-endpoint": redactUrlForDisplay(endpointUrl),
      "x-socketlens-inferred": true,
    };
  }
}

function createUniqueKey(record: Record<string, unknown>, rawKey: string) {
  const baseKey = sanitizeDocumentKey(rawKey);
  let candidate = baseKey;
  let index = 2;

  while (candidate in record) {
    candidate = `${baseKey}_${index}`;
    index += 1;
  }

  return candidate;
}

function sanitizeDocumentKey(value: string) {
  const key = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return key || "unknown_event";
}

function getSuggestedAsyncApiDraftFileName(sessionName: string, exportedAt: number) {
  const name = sessionName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const timestamp = new Date(exportedAt).toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[:.]/g, "-");

  return `${name || "socketlens-session"}-${timestamp}.experimental-asyncapi.yaml`;
}

function toYaml(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    return value
      .map((item) => {
        if (isScalar(item)) {
          return `${pad}- ${formatScalar(item)}`;
        }

        return `${pad}-\n${toYaml(item, indent + 2)}`;
      })
      .join("\n");
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);

    if (entries.length === 0) {
      return "{}";
    }

    return entries
      .map(([key, entryValue]) => {
        if (isScalar(entryValue)) {
          return `${pad}${formatKey(key)}: ${formatScalar(entryValue)}`;
        }

        return `${pad}${formatKey(key)}:\n${toYaml(entryValue, indent + 2)}`;
      })
      .join("\n");
  }

  return `${pad}${formatScalar(value)}`;
}

function formatKey(key: string) {
  return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key) ? key : JSON.stringify(key);
}

function formatScalar(value: unknown) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(String(value));
}

function isScalar(value: unknown) {
  return value === null || value === undefined || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
