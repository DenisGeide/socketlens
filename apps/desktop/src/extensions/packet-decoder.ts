import type { Packet } from "@/models";
import type { DecodedPacket, PacketDecoder } from "@/extensions/types";

const socketIoDecoderId = "socketlens.decoder.socketio";
const graphQlWsDecoderId = "socketlens.decoder.graphqlws";
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

type GraphQlWsProtocol = "graphql-transport-ws" | "subscriptions-transport-ws" | "graphql-ws";
type GraphQlWsPhase =
  | "complete"
  | "connection_ack"
  | "connection_error"
  | "connection_init"
  | "connection_terminate"
  | "keepalive"
  | "next"
  | "ping"
  | "pong"
  | "start"
  | "unknown";

type ParsedGraphQlWsMessage = {
  data: Record<string, unknown>;
  eventName: string;
  hasErrors: boolean;
  id: string | null;
  operationKind: string | null;
  operationName: string | null;
  phase: GraphQlWsPhase;
  preview: string;
  protocol: GraphQlWsProtocol;
  type: string;
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

export const graphQlWsPacketDecoder: PacketDecoder = {
  canDecode: (packet) => packet.payloadKind === "json" && looksLikeGraphQlWsMessage(packet.payload),
  decode: (packet): DecodedPacket => {
    const parsed = parseGraphQlWsMessage(packet.payload);

    if (!parsed) {
      return {
        data: {
          frame: packet.payload,
          protocol: "graphql-ws",
          warning: "GraphQL WebSocket-like message could not be decoded.",
        },
        decoderId: graphQlWsDecoderId,
        eventName: "graphql.unknown",
        metadata: {
          parseError: "unknown_graphql_ws_message",
          protocol: "graphql-ws",
        },
        payloadKind: "json",
        preview: truncateDecodedPreview(packet.payload),
        tags: ["graphql", "unknown"],
      };
    }

    return {
      data: parsed.data,
      decoderId: graphQlWsDecoderId,
      eventName: parsed.eventName,
      metadata: {
        graphQlMessageType: parsed.type,
        graphQlPhase: parsed.phase,
        graphQlProtocol: parsed.protocol,
        hasErrors: parsed.hasErrors,
        operationId: parsed.id,
        operationKind: parsed.operationKind,
        operationName: parsed.operationName,
        protocol: "graphql-ws",
      },
      payloadKind: "json",
      preview: parsed.preview,
      tags: ["graphql", parsed.protocol, parsed.phase],
    };
  },
  id: graphQlWsDecoderId,
  label: "GraphQL WebSocket packet decoder",
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
  graphQlWsPacketDecoder,
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

function looksLikeGraphQlWsMessage(value: string) {
  const parsed = safeParseJson(value);

  if (!parsed.ok || !isRecord(parsed.data)) {
    return false;
  }

  return getGraphQlWsDetection(parsed.data) !== null;
}

function parseGraphQlWsMessage(value: string): ParsedGraphQlWsMessage | null {
  const parsed = safeParseJson(value);

  if (!parsed.ok || !isRecord(parsed.data)) {
    return null;
  }

  const detection = getGraphQlWsDetection(parsed.data);

  if (!detection) {
    return null;
  }

  const type = detection.type;
  const payload = parsed.data.payload;
  const payloadRecord = isRecord(payload) ? payload : null;
  const query = getRecordString(payloadRecord, "query") ?? getRecordString(parsed.data, "query");
  const operationName =
    getRecordString(parsed.data, "operationName") ??
    getRecordString(payloadRecord, "operationName") ??
    getGraphQlOperationFromQuery(query).operationName;
  const operationKind = getGraphQlOperationFromQuery(query).operationKind ?? inferGraphQlOperationKind(type);
  const id = getGraphQlMessageId(parsed.data);
  const phase = getGraphQlPhase(type, detection.protocol);
  const eventName = getGraphQlEventName(phase, operationKind);
  const hasErrors = graphQlPayloadHasErrors(payload);

  return {
    data: {
      id,
      operationKind,
      operationName,
      payload: payload ?? null,
      phase,
      protocol: detection.protocol,
      type,
    },
    eventName,
    hasErrors,
    id,
    operationKind,
    operationName,
    phase,
    preview: getGraphQlPreview({ hasErrors, id, operationKind, operationName, phase, type }),
    protocol: detection.protocol,
    type,
  };
}

function getGraphQlWsDetection(message: Record<string, unknown>): { protocol: GraphQlWsProtocol; type: string } | null {
  const type = getRecordString(message, "type");

  if (!type) {
    return null;
  }

  const normalizedType = type.trim();
  const payload = message.payload;
  const payloadRecord = isRecord(payload) ? payload : null;
  const hasPayload = "payload" in message;
  const hasId = typeof message.id === "string" || typeof message.id === "number";
  const hasOperationSignal =
    typeof message.query === "string" ||
    getRecordString(payloadRecord, "query") !== null ||
    getRecordString(payloadRecord, "operationName") !== null ||
    isRecord(payloadRecord?.data) ||
    Array.isArray(payloadRecord?.errors) ||
    Array.isArray(payload);

  if (
    normalizedType === "connection_init" ||
    normalizedType === "connection_ack" ||
    normalizedType === "connection_error" ||
    normalizedType === "connection_terminate" ||
    normalizedType === "ka"
  ) {
    return {
      protocol: normalizedType === "ka" ? "subscriptions-transport-ws" : "graphql-ws",
      type: normalizedType,
    };
  }

  if (normalizedType === "subscribe") {
    return { protocol: "graphql-transport-ws", type: normalizedType };
  }

  if ((normalizedType === "ping" || normalizedType === "pong") && hasPayload) {
    return { protocol: "graphql-transport-ws", type: normalizedType };
  }

  if (["next", "error", "complete"].includes(normalizedType) && hasId) {
    return { protocol: "graphql-transport-ws", type: normalizedType };
  }

  if (["start", "data", "stop"].includes(normalizedType) && hasId && (hasOperationSignal || normalizedType === "stop")) {
    return { protocol: "subscriptions-transport-ws", type: normalizedType };
  }

  if (hasOperationSignal && normalizedType.startsWith("graphql.")) {
    return { protocol: "graphql-ws", type: normalizedType };
  }

  return null;
}

function getGraphQlPhase(type: string, protocol: GraphQlWsProtocol): GraphQlWsPhase {
  if (type === "connection_init") {
    return "connection_init";
  }

  if (type === "connection_ack") {
    return "connection_ack";
  }

  if (type === "connection_error") {
    return "connection_error";
  }

  if (type === "connection_terminate") {
    return "connection_terminate";
  }

  if (type === "ka") {
    return "keepalive";
  }

  if (type === "subscribe" || type === "start") {
    return "start";
  }

  if (type === "next" || type === "data") {
    return "next";
  }

  if (type === "error") {
    return "connection_error";
  }

  if (type === "complete" || type === "stop") {
    return "complete";
  }

  if (type === "ping" && protocol === "graphql-transport-ws") {
    return "ping";
  }

  if (type === "pong" && protocol === "graphql-transport-ws") {
    return "pong";
  }

  return "unknown";
}

function getGraphQlEventName(phase: GraphQlWsPhase, operationKind: string | null) {
  if (phase === "start") {
    return operationKind === "subscription" ? "graphql.subscription.start" : "graphql.operation.start";
  }

  if (phase === "next") {
    return operationKind === "subscription" || operationKind === null ? "graphql.subscription.next" : "graphql.operation.next";
  }

  if (phase === "complete") {
    return operationKind === "subscription" || operationKind === null ? "graphql.subscription.complete" : "graphql.operation.complete";
  }

  if (phase === "connection_error") {
    return "graphql.subscription.error";
  }

  if (phase === "connection_init") {
    return "graphql.connection.init";
  }

  if (phase === "connection_ack") {
    return "graphql.connection.ack";
  }

  if (phase === "connection_terminate") {
    return "graphql.connection.terminate";
  }

  if (phase === "keepalive") {
    return "graphql.keepalive";
  }

  if (phase === "ping" || phase === "pong") {
    return `graphql.${phase}`;
  }

  return "graphql.unknown";
}

function getGraphQlPreview({
  hasErrors,
  id,
  operationKind,
  operationName,
  phase,
  type,
}: {
  hasErrors: boolean;
  id: string | null;
  operationKind: string | null;
  operationName: string | null;
  phase: GraphQlWsPhase;
  type: string;
}) {
  const operationLabel = operationName ?? operationKind ?? "operation";
  const idLabel = id ? ` #${id}` : "";
  const errorLabel = hasErrors ? " with errors" : "";

  if (phase === "start") {
    return `GraphQL ${operationKind ?? "operation"} start${idLabel}: ${operationLabel}`;
  }

  if (phase === "next") {
    return `GraphQL next${idLabel}: ${operationLabel}${errorLabel}`;
  }

  if (phase === "complete") {
    return `GraphQL complete${idLabel}: ${operationLabel}`;
  }

  if (phase === "connection_error") {
    return `GraphQL error${idLabel}: ${operationLabel}`;
  }

  if (phase === "connection_init" || phase === "connection_ack" || phase === "connection_terminate") {
    return `GraphQL ${type.replaceAll("_", " ")}`;
  }

  if (phase === "keepalive") {
    return "GraphQL keepalive";
  }

  if (phase === "ping" || phase === "pong") {
    return `GraphQL ${phase}`;
  }

  return `GraphQL ${type}`;
}

function getGraphQlMessageId(message: Record<string, unknown>) {
  const id = message.id;

  if (typeof id === "string" && id.trim()) {
    return id.trim();
  }

  if (typeof id === "number" && Number.isFinite(id)) {
    return String(id);
  }

  return null;
}

function getGraphQlOperationFromQuery(query: string | null) {
  if (!query) {
    return {
      operationKind: null,
      operationName: null,
    };
  }

  const normalizedQuery = query.replace(/#[^\n\r]*/g, " ");
  const match = /\b(query|mutation|subscription)\s+([_A-Za-z][_0-9A-Za-z]*)?/m.exec(normalizedQuery);

  return {
    operationKind: match?.[1] ?? null,
    operationName: match?.[2] ?? null,
  };
}

function inferGraphQlOperationKind(type: string) {
  if (type === "subscribe" || type === "start" || type === "next" || type === "data" || type === "complete" || type === "stop") {
    return "subscription";
  }

  return null;
}

function graphQlPayloadHasErrors(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.length > 0;
  }

  if (!isRecord(payload)) {
    return false;
  }

  const errors = payload.errors;

  return Array.isArray(errors) && errors.length > 0;
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
