import type { Packet } from "@/models";
import type { DecodedPacket, PacketDecoder } from "@/extensions/types";

const jsonDecoderId = "socketlens.decoder.json";
const textDecoderId = "socketlens.decoder.text";
const binaryDecoderId = "socketlens.decoder.binary";

export const jsonPacketDecoder: PacketDecoder = {
  canDecode: (packet) => packet.payloadKind === "json",
  decode: (packet): DecodedPacket => {
    const parsed = safeParseJson(packet.payload);

    if (!parsed.ok) {
      return {
        data: null,
        decoderId: jsonDecoderId,
        eventName: "json.invalid",
        metadata: {
          parseError: parsed.message,
        },
        payloadKind: "json",
        preview: truncateDecodedPreview(packet.payload),
        tags: ["json", "invalid"],
      };
    }

    const eventName = getRecordString(parsed.data, "type") ?? getRecordString(parsed.data, "event") ?? getRecordString(parsed.data, "action") ?? "json.frame";

    return {
      data: parsed.data,
      decoderId: jsonDecoderId,
      eventName,
      metadata: {
        hasCommand: getRecordString(parsed.data, "command") !== null,
        hasRequestId: getRecordString(parsed.data, "requestId") !== null,
      },
      payloadKind: "json",
      preview: getJsonPreview(parsed.data),
      tags: ["json"],
    };
  },
  id: jsonDecoderId,
  label: "JSON packet decoder",
};

export const textPacketDecoder: PacketDecoder = {
  canDecode: (packet) => packet.payloadKind === "text",
  decode: (packet) => ({
    data: packet.payload,
    decoderId: textDecoderId,
    eventName: "text.frame",
    metadata: {},
    payloadKind: "text",
    preview: truncateDecodedPreview(packet.payload),
    tags: ["text"],
  }),
  id: textDecoderId,
  label: "Text packet decoder",
};

export const binaryPacketDecoder: PacketDecoder = {
  canDecode: (packet) => packet.payloadKind === "binary",
  decode: (packet) => ({
    data: packet.payload,
    decoderId: binaryDecoderId,
    eventName: "binary.frame",
    metadata: {},
    payloadKind: "binary",
    preview: truncateDecodedPreview(packet.payload),
    tags: ["binary"],
  }),
  id: binaryDecoderId,
  label: "Binary packet decoder",
};

export const defaultPacketDecoders: PacketDecoder[] = [
  jsonPacketDecoder,
  textPacketDecoder,
  binaryPacketDecoder,
];

export function decodePacket(packet: Packet, decoders: PacketDecoder[] = defaultPacketDecoders): DecodedPacket {
  const decoder = decoders.find((candidate) => candidate.canDecode(packet)) ?? textPacketDecoder;

  return decoder.decode(packet);
}

export function truncateDecodedPreview(value: string, maxLength = 220) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function safeParseJson(value: string):
  | {
      data: unknown;
      ok: true;
    }
  | {
      message: string;
      ok: false;
    } {
  try {
    return {
      data: JSON.parse(value),
      ok: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Invalid JSON",
      ok: false,
    };
  }
}

function getJsonPreview(value: unknown) {
  if (isRecord(value)) {
    const text = getRecordString(value, "text");
    const title = getRecordString(value, "title");
    const detail = getRecordString(value, "detail");
    const code = getRecordString(value, "code");
    const requestId = getRecordString(value, "requestId");

    if (text) {
      return truncateDecodedPreview(text);
    }

    if (title) {
      return truncateDecodedPreview(title);
    }

    if (detail) {
      return truncateDecodedPreview(detail);
    }

    if (code) {
      return truncateDecodedPreview(code);
    }

    if (requestId) {
      return `requestId: ${requestId}`;
    }
  }

  return truncateDecodedPreview(JSON.stringify(value) ?? String(value));
}

function getRecordString(value: unknown, field: string) {
  if (!isRecord(value)) {
    return null;
  }

  const fieldValue = value[field];

  return typeof fieldValue === "string" ? fieldValue : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
