import type { Packet } from "@/models";
import type { DecodedPacket, PacketDecoder } from "@/extensions/types";

const socketIoDecoderId = "socketlens.decoder.socketio";
const jsonDecoderId = "socketlens.decoder.json";
const textDecoderId = "socketlens.decoder.text";
const binaryDecoderId = "socketlens.decoder.binary";

type SocketIoEnginePacketType = "close" | "message" | "noop" | "open" | "ping" | "pong" | "upgrade" | "unknown";
type SocketIoPacketType =
  | "ack"
  | "binary_ack"
  | "binary_event"
  | "connect"
  | "connect_error"
  | "disconnect"
  | "event"
  | "unknown";

type ParsedSocketIoFrame = {
  ackId: number | null;
  attachments: number | null;
  data: unknown;
  enginePacketType: SocketIoEnginePacketType;
  eventName: string;
  namespace: string;
  packetType: SocketIoPacketType | null;
  preview: string;
  rawData: string;
};

export const socketIoPacketDecoder: PacketDecoder = {
  canDecode: (packet) => packet.payloadKind === "text" && looksLikeSocketIoFrame(packet.payload),
  decode: (packet): DecodedPacket => {
    const parsed = parseSocketIoFrame(packet.payload);

    if (!parsed) {
      return {
        data: {
          frame: packet.payload,
          protocol: "socket.io",
          warning: "Socket.IO-like frame could not be decoded.",
        },
        decoderId: socketIoDecoderId,
        eventName: "socketio.unknown",
        metadata: {
          parseError: "unknown_socketio_frame",
          protocol: "socket.io",
        },
        payloadKind: "text",
        preview: truncateDecodedPreview(packet.payload),
        tags: ["socket.io", "unknown"],
      };
    }

    const tags = ["socket.io", "engine.io", parsed.enginePacketType];

    if (parsed.packetType) {
      tags.push(parsed.packetType);
    }

    if (parsed.ackId !== null) {
      tags.push("ack");
    }

    return {
      data: {
        ackId: parsed.ackId,
        attachments: parsed.attachments,
        data: parsed.data,
        enginePacketType: parsed.enginePacketType,
        eventName: parsed.eventName,
        namespace: parsed.namespace,
        packetType: parsed.packetType,
        protocol: "socket.io",
        rawData: parsed.rawData,
      },
      decoderId: socketIoDecoderId,
      eventName: parsed.eventName,
      metadata: {
        ackId: parsed.ackId,
        attachments: parsed.attachments,
        enginePacketType: parsed.enginePacketType,
        hasAck: parsed.ackId !== null,
        namespace: parsed.namespace,
        protocol: "socket.io",
        socketPacketType: parsed.packetType,
      },
      payloadKind: "text",
      preview: parsed.preview,
      tags,
    };
  },
  id: socketIoDecoderId,
  label: "Socket.IO packet decoder",
};

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
  socketIoPacketDecoder,
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

function looksLikeSocketIoFrame(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  if (trimmedValue === "2" || trimmedValue === "3") {
    return true;
  }

  if (trimmedValue.startsWith("0{")) {
    return true;
  }

  if (!trimmedValue.startsWith("4") || trimmedValue.length < 2) {
    return false;
  }

  const socketPacketType = trimmedValue[1];

  if (!socketPacketType || !/^[0-6]$/.test(socketPacketType)) {
    return false;
  }

  const rest = trimmedValue.slice(2);

  return (
    rest === "" ||
    rest.startsWith("/") ||
    rest.startsWith("[") ||
    rest.startsWith("{") ||
    /^\d/.test(rest)
  );
}

function parseSocketIoFrame(frame: string): ParsedSocketIoFrame | null {
  const value = frame.trim();
  const enginePacketType = getEnginePacketType(value[0]);

  if (!enginePacketType) {
    return null;
  }

  if (enginePacketType !== "message") {
    return parseEngineIoFrame(value, enginePacketType);
  }

  const socketTypeCode = value[1];
  const packetType = getSocketIoPacketType(socketTypeCode);

  if (!packetType) {
    return {
      ackId: null,
      attachments: null,
      data: value.slice(1),
      enginePacketType,
      eventName: "socketio.message",
      namespace: "/",
      packetType: "unknown",
      preview: truncateDecodedPreview(value),
      rawData: value.slice(1),
    };
  }

  let cursor = 2;
  let attachments: number | null = null;

  if (packetType === "binary_event" || packetType === "binary_ack") {
    const attachmentsMatch = /^(\d+)-/.exec(value.slice(cursor));

    if (attachmentsMatch?.[1]) {
      attachments = Number.parseInt(attachmentsMatch[1], 10);
      cursor += attachmentsMatch[0].length;
    }
  }

  let namespace = "/";

  if (value[cursor] === "/") {
    const namespaceEnd = value.indexOf(",", cursor);

    if (namespaceEnd === -1) {
      namespace = value.slice(cursor) || "/";
      cursor = value.length;
    } else {
      namespace = value.slice(cursor, namespaceEnd) || "/";
      cursor = namespaceEnd + 1;
    }
  }

  const ackMatch = /^(\d+)/.exec(value.slice(cursor));
  let ackId: number | null = null;

  if (ackMatch?.[1]) {
    ackId = Number.parseInt(ackMatch[1], 10);
    cursor += ackMatch[1].length;
  }

  const rawData = value.slice(cursor);
  const parsedData = rawData ? safeParseJson(rawData) : null;
  const data = parsedData?.ok ? parsedData.data : rawData || null;
  const eventName = getSocketIoEventName(packetType, data);

  return {
    ackId,
    attachments,
    data,
    enginePacketType,
    eventName,
    namespace,
    packetType,
    preview: getSocketIoPreview({ ackId, data, eventName, namespace, packetType }),
    rawData,
  };
}

function parseEngineIoFrame(value: string, enginePacketType: SocketIoEnginePacketType): ParsedSocketIoFrame {
  const rawData = value.slice(1);
  const parsedData = rawData ? safeParseJson(rawData) : null;
  const data = parsedData?.ok ? parsedData.data : rawData || null;
  const eventName = `socketio.engine.${enginePacketType}`;

  return {
    ackId: null,
    attachments: null,
    data,
    enginePacketType,
    eventName,
    namespace: "/",
    packetType: null,
    preview: getEngineIoPreview(enginePacketType, data),
    rawData,
  };
}

function getEnginePacketType(code: string | undefined): SocketIoEnginePacketType | null {
  if (code === "0") {
    return "open";
  }

  if (code === "1") {
    return "close";
  }

  if (code === "2") {
    return "ping";
  }

  if (code === "3") {
    return "pong";
  }

  if (code === "4") {
    return "message";
  }

  if (code === "5") {
    return "upgrade";
  }

  if (code === "6") {
    return "noop";
  }

  return null;
}

function getSocketIoPacketType(code: string | undefined): SocketIoPacketType | null {
  if (code === "0") {
    return "connect";
  }

  if (code === "1") {
    return "disconnect";
  }

  if (code === "2") {
    return "event";
  }

  if (code === "3") {
    return "ack";
  }

  if (code === "4") {
    return "connect_error";
  }

  if (code === "5") {
    return "binary_event";
  }

  if (code === "6") {
    return "binary_ack";
  }

  return null;
}

function getSocketIoEventName(packetType: SocketIoPacketType, data: unknown) {
  if ((packetType === "event" || packetType === "binary_event") && Array.isArray(data)) {
    const [eventName] = data;

    if (typeof eventName === "string" && eventName.trim()) {
      return eventName.trim();
    }
  }

  if (packetType === "ack" || packetType === "binary_ack") {
    return "socketio.ack";
  }

  if (packetType === "connect_error") {
    return "socketio.connect_error";
  }

  return `socketio.${packetType}`;
}

function getSocketIoPreview({
  ackId,
  data,
  eventName,
  namespace,
  packetType,
}: {
  ackId: number | null;
  data: unknown;
  eventName: string;
  namespace: string;
  packetType: SocketIoPacketType;
}) {
  if (packetType === "connect") {
    return namespace === "/" ? "Socket.IO namespace connected" : `Socket.IO namespace connected: ${namespace}`;
  }

  if (packetType === "disconnect") {
    return namespace === "/" ? "Socket.IO namespace disconnected" : `Socket.IO namespace disconnected: ${namespace}`;
  }

  if (packetType === "ack" || packetType === "binary_ack") {
    const ackLabel = ackId === null ? "ack" : `ack #${ackId}`;

    return truncateDecodedPreview(`${ackLabel}: ${JSON.stringify(data)}`);
  }

  if (Array.isArray(data)) {
    const payload = data.length > 1 ? data.slice(1) : [];
    const suffix = payload.length > 0 ? ` ${JSON.stringify(payload.length === 1 ? payload[0] : payload)}` : "";

    return truncateDecodedPreview(`${namespace} ${eventName}${suffix}`);
  }

  return truncateDecodedPreview(`${namespace} ${eventName}: ${JSON.stringify(data)}`);
}

function getEngineIoPreview(enginePacketType: SocketIoEnginePacketType, data: unknown) {
  if (enginePacketType === "open") {
    return `Engine.IO open ${JSON.stringify(data)}`;
  }

  if (enginePacketType === "ping" || enginePacketType === "pong") {
    return `Engine.IO ${enginePacketType}`;
  }

  return truncateDecodedPreview(`Engine.IO ${enginePacketType}: ${JSON.stringify(data)}`);
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
