import type { Packet } from "@/models";
import { decodePacket } from "@/extensions/packet-decoder";
import type { DecodedPacket, PacketAnalyzer, PacketStatus } from "@/extensions/types";

export const defaultPacketAnalyzer: PacketAnalyzer = {
  analyze: (packet, decoded = decodePacket(packet)) => ({
    eventName: decoded.eventName,
    preview: decoded.preview,
    status: getPacketStatus(decoded),
  }),
  id: "socketlens.analyzer.default",
  label: "Default packet analyzer",
};

function getPacketStatus(decoded: DecodedPacket): PacketStatus {
  const normalizedEvent = decoded.eventName.toLowerCase();
  const code = getRecordString(decoded.data, "code")?.toLowerCase() ?? "";
  const severity = getRecordString(decoded.data, "severity")?.toLowerCase() ?? "";

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
