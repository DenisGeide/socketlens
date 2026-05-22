import { getPacketEventName, truncatePreview } from "@/lib/packet-inspection";
import type { AiAction, AiAnalysisInput } from "@/lib/ai/types";
import { redactUrlForDisplay } from "@/models";
import type { Packet } from "@/models";

export type AiChatMessage = {
  content: string;
  role: "system" | "user";
};

const maxPacketsForSessionPrompt = 40;
const maxPayloadChars = 4_000;

export function buildAiMessages(input: AiAnalysisInput): AiChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are SocketLens, a concise WebSocket debugging assistant. Analyze only the data provided by the user. Return Markdown. Do not invent endpoints, credentials, or application behavior. Call out uncertainty and privacy-sensitive fields carefully. Avoid claiming certainty when the payload is ambiguous.",
    },
    {
      role: "user",
      content: buildUserPrompt(input),
    },
  ];
}

function buildUserPrompt(input: AiAnalysisInput) {
  const header = [
    `Action: ${getActionLabel(input.action)}`,
    input.session
      ? `Session: ${input.session.name} (${redactUrlForDisplay(input.session.endpointUrl)})`
      : "Session: none selected",
    `Packets provided: ${input.packets.length}`,
  ];

  if (input.action === "explain-packet") {
    return [...header, "", "Selected packet:", formatPacketForPrompt(input.packet), "", explainPacketInstruction()].join("\n");
  }

  const packets = input.packets.slice(0, maxPacketsForSessionPrompt);

  return [
    ...header,
    input.packets.length > packets.length
      ? `Only the newest ${packets.length} retained packets are included to keep the request bounded.`
      : "All retained packets for this context are included.",
    "",
    "Packets:",
    packets.map(formatPacketForPrompt).join("\n\n"),
    "",
    input.action === "summarize-session" ? summarizeSessionInstruction() : detectEventFlowInstruction(),
  ].join("\n");
}

function formatPacketForPrompt(packet: Packet | null | undefined) {
  if (!packet) {
    return "No packet is selected.";
  }

  const eventName = getPacketEventName(packet) ?? "unknown.event";

  return [
    `Packet ID: ${packet.id}`,
    `Direction: ${packet.direction}`,
    `Event: ${eventName}`,
    `Timestamp: ${new Date(packet.timestamp).toISOString()}`,
    `Payload kind: ${packet.payloadKind}`,
    `Size: ${packet.sizeBytes} bytes`,
    "Payload:",
    truncatePreview(packet.payload, maxPayloadChars),
  ].join("\n");
}

function getActionLabel(action: AiAction) {
  const labels = {
    "detect-event-flow": "Detect possible event flow",
    "explain-packet": "Explain selected packet",
    "summarize-session": "Summarize session",
  } satisfies Record<AiAction, string>;

  return labels[action];
}

function explainPacketInstruction() {
  return [
    "Return a concise Markdown explanation with these sections:",
    "- **Likely purpose:** explain what the packet likely does.",
    "- **Event type:** identify the apparent event type and the field(s) that support it.",
    "- **Suspicious errors:** identify suspicious error, warning, auth, retry, rate-limit, or malformed-data signals. Say none observed if none are visible.",
    "- **Payload summary:** summarize the payload fields without dumping the full payload.",
    "- **Confidence:** avoid claiming certainty when unsure; say what evidence is missing.",
    "Keep the answer compact and useful for a developer debugging realtime traffic.",
  ].join("\n");
}

function summarizeSessionInstruction() {
  return "Summarize the session behavior, notable event groups, errors, and possible next debugging steps. Keep the answer compact.";
}

function detectEventFlowInstruction() {
  return "Infer the likely event flow from the packet sequence. Group events into phases and call out missing or suspicious transitions.";
}
