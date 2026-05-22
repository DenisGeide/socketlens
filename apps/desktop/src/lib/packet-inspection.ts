import type { Packet } from "@/models";
import { parseJsonObject } from "@/lib/json-payload";

export type PacketStatus = "auth" | "chat" | "error" | "notification" | "heartbeat" | "ok";

export type PacketSummary = {
  eventName: string;
  preview: string;
  status: PacketStatus;
};

export type PacketDemoMetadata = {
  highlight: boolean;
  highlightLabel: string | null;
  scenario: string;
  simulated: boolean;
  stepId: string | null;
};

export type PrettyPayloadResult =
  | {
      formatted: string;
      kind: "formatted";
    }
  | {
      kind: "invalid-json";
      message: string;
    }
  | {
      kind: "large-json";
      message: string;
    }
  | {
      kind: "not-json";
      message: string;
    };

const prettyJsonSizeLimit = 1_000_000;
const packetSummaryCache = new WeakMap<Packet, PacketSummary>();
const packetDemoMetadataCache = new WeakMap<Packet, PacketDemoMetadata | null>();
const packetErrorCache = new WeakMap<Packet, boolean>();
const packetSearchTextCache = new WeakMap<Packet, string>();

export function getPacketSummary(packet: Packet): PacketSummary {
  const cachedSummary = packetSummaryCache.get(packet);

  if (cachedSummary) {
    return cachedSummary;
  }

  const summary = createPacketSummary(packet);
  packetSummaryCache.set(packet, summary);

  return summary;
}

function createPacketSummary(packet: Packet): PacketSummary {
  if (packet.payloadKind !== "json") {
    return {
      eventName: packet.payloadKind === "binary" ? "binary.frame" : "text.frame",
      preview: truncatePreview(packet.payload),
      status: "ok",
    };
  }

  const parsed = parseJsonObject(packet.payload);

  if (!parsed) {
    return {
      eventName: "json.invalid",
      preview: truncatePreview(packet.payload),
      status: "error",
    };
  }

  const eventName = getPacketEventName(packet) ?? "json.frame";

  return {
    eventName,
    preview: getPayloadPreview(parsed),
    status: getPacketStatus(parsed, eventName),
  };
}

export function isPingPongPacket(packet: Packet) {
  const eventName = getPacketSummary(packet).eventName.toLowerCase();

  return eventName === "ping" || eventName === "pong" || eventName.includes("heartbeat");
}

export function getPacketSearchText(packet: Packet) {
  const cachedSearchText = packetSearchTextCache.get(packet);

  if (cachedSearchText) {
    return cachedSearchText;
  }

  const summary = getPacketSummary(packet);
  const displayDirection = packet.direction === "inbound" ? "incoming" : "outgoing";
  const searchText = `${packet.direction} ${displayDirection} ${summary.eventName} ${summary.status} ${packet.payload}`.toLowerCase();

  packetSearchTextCache.set(packet, searchText);

  return searchText;
}

export function getPacketEventName(packet: Packet) {
  if (packet.payloadKind !== "json") {
    return packet.payloadKind === "binary" ? "binary.frame" : "text.frame";
  }

  const parsed = parseJsonObject(packet.payload);

  if (!parsed) {
    return "json.invalid";
  }

  return getStringField(parsed, "type") ?? getStringField(parsed, "event") ?? getStringField(parsed, "action");
}

export function getPacketDemoMetadata(packet: Packet): PacketDemoMetadata | null {
  const cachedMetadata = packetDemoMetadataCache.get(packet);

  if (cachedMetadata !== undefined) {
    return cachedMetadata;
  }

  const metadata = createPacketDemoMetadata(packet);
  packetDemoMetadataCache.set(packet, metadata);

  return metadata;
}

export function getPrettyPayload(packet: Packet): PrettyPayloadResult {
  if (packet.payloadKind !== "json") {
    return {
      kind: "not-json",
      message: "Pretty view is available for JSON payloads. Use Raw for this packet.",
    };
  }

  if (packet.payload.length > prettyJsonSizeLimit) {
    return {
      kind: "large-json",
      message: "This JSON payload is large. Raw view is shown without expensive formatting.",
    };
  }

  try {
    return {
      formatted: JSON.stringify(JSON.parse(packet.payload), null, 2),
      kind: "formatted",
    };
  } catch {
    return {
      kind: "invalid-json",
      message: "Payload is marked as JSON but could not be parsed safely.",
    };
  }
}

export function isErrorPacketFast(packet: Packet) {
  const cachedResult = packetErrorCache.get(packet);

  if (cachedResult !== undefined) {
    return cachedResult;
  }

  const payload = packet.payload.toLowerCase();
  const result =
    getPacketSummary(packet).status === "error" ||
    payload.includes('"type": "error"') ||
    payload.includes('"severity": "error"') ||
    payload.includes("rate_limit");

  packetErrorCache.set(packet, result);

  return result;
}

export function truncatePreview(value: string, maxLength = 220) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function createPacketDemoMetadata(packet: Packet): PacketDemoMetadata | null {
  if (packet.payloadKind !== "json") {
    return null;
  }

  const parsed = parseJsonObject(packet.payload);
  const demo = parsed?.demo;

  if (!demo || typeof demo !== "object" || Array.isArray(demo)) {
    return null;
  }

  const demoRecord = demo as Record<string, unknown>;

  if (demoRecord.simulated !== true || demoRecord.scenario !== "investor-demo") {
    return null;
  }

  return {
    highlight: demoRecord.highlight === true,
    highlightLabel: getStringField(demoRecord, "highlightLabel"),
    scenario: "investor-demo",
    simulated: true,
    stepId: getStringField(demoRecord, "stepId"),
  };
}


function getPacketStatus(payload: Record<string, unknown>, eventName: string | null): PacketStatus {
  const normalizedEvent = eventName?.toLowerCase() ?? "";
  const code = getStringField(payload, "code")?.toLowerCase() ?? "";
  const severity = getStringField(payload, "severity")?.toLowerCase() ?? "";

  if (normalizedEvent.includes("error") || code.includes("error") || severity === "error" || severity === "warning") {
    return "error";
  }

  if (normalizedEvent.includes("auth")) {
    return "auth";
  }

  if (normalizedEvent.includes("chat") || normalizedEvent.includes("message")) {
    return "chat";
  }

  if (normalizedEvent.includes("notification")) {
    return "notification";
  }

  if (normalizedEvent === "ping" || normalizedEvent === "pong" || normalizedEvent.includes("heartbeat")) {
    return "heartbeat";
  }

  return "ok";
}

function getPayloadPreview(payload: Record<string, unknown>) {
  const text = getStringField(payload, "text");
  const title = getStringField(payload, "title");
  const detail = getStringField(payload, "detail");
  const code = getStringField(payload, "code");
  const requestId = getStringField(payload, "requestId");

  if (text) {
    return truncatePreview(text);
  }

  if (title) {
    return truncatePreview(title);
  }

  if (detail) {
    return truncatePreview(detail);
  }

  if (code) {
    return truncatePreview(code);
  }

  if (requestId) {
    return `requestId: ${requestId}`;
  }

  return truncatePreview(JSON.stringify(payload));
}

function getStringField(payload: Record<string, unknown>, field: string) {
  const value = payload[field];

  return typeof value === "string" ? value : null;
}
