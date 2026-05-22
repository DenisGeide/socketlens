import { getPacketEventName, isErrorPacketFast } from "@/lib/packet-inspection";
import type { AiAnalysisInput, AiAnalysisResult, AiProviderClient, AiProviderResult, AiProviderValidation } from "@/lib/ai/types";
import type { AppAiProviderSettings, Packet } from "@/models";

const mockModelName = "socketlens-mock-analysis";

export const mockAiProvider: AiProviderClient = {
  analyze: async (_settings, input) => ({
    data: createMockAiAnalysisResult(input),
    ok: true,
  }),
  validateConfiguration: validateMockConfiguration,
};

export function createMockAiAnalysisResult(input: AiAnalysisInput): AiAnalysisResult {
  return {
    action: input.action,
    content: createMockMarkdown(input),
    createdAt: Date.now(),
    model: mockModelName,
    provider: "mock",
  };
}

function validateMockConfiguration(_settings: AppAiProviderSettings): AiProviderValidation {
  return {
    data: {
      message: "Mock AI provider is available for tests and offline demos.",
      provider: "disabled",
    },
    ok: true,
  };
}

function createMockMarkdown(input: AiAnalysisInput) {
  const packet = input.packet ?? input.packets[0] ?? null;
  const eventName = packet ? getPacketEventName(packet) : "unknown.event";
  const packetCount = input.packets.length;
  const errorCount = input.packets.filter(isErrorPacketFast).length;

  if (input.action === "summarize-session") {
    return [
      "### Mock session summary",
      `**Scope:** ${packetCount} packet(s) were included in this offline test response.`,
      `**Notable signals:** ${errorCount > 0 ? `${errorCount} error-like packet(s) are visible.` : "No obvious error packets are visible."}`,
      "**Next check:** Inspect the raw payloads and timestamps before making a decision.",
      "**Uncertainty:** This is a deterministic mock response for tests and demos. AI may be wrong in real provider mode.",
    ].join("\n\n");
  }

  if (input.action === "explain-auth-reconnect-flow" || input.action === "detect-event-flow") {
    return [
      "### Mock flow explanation",
      `**Likely flow:** The provided context contains ${packetCount} packet(s). Event names should be verified in the timeline.`,
      `**Focus event:** \`${eventName}\``,
      `**Suspicious signals:** ${errorCount > 0 ? "Error-like packets are present." : "No obvious auth or reconnect failure is visible in the mock context."}`,
      "**Uncertainty:** Relationships are inferred from packet names and payload shape. AI may be wrong; raw packets are the source of truth.",
    ].join("\n\n");
  }

  if (input.action === "explain-sequence") {
    return [
      "### Mock sequence explanation",
      `**Selected packet role:** \`${eventName}\` appears in a ${packetCount}-packet local context.`,
      "**Likely sequence:** Review the previous and next packets to confirm request/response or event-chain behavior.",
      `**Suspicious transitions:** ${errorCount > 0 ? "One or more nearby packets look error-like." : "No obvious suspicious transition is visible in this mock response."}`,
      "**Uncertainty:** This is an offline mock response and does not replace manual inspection.",
    ].join("\n\n");
  }

  return [
    "### Mock packet explanation",
    `**Likely purpose:** The selected packet appears to be \`${eventName}\`.`,
    `**Event type:** \`${eventName}\` based on the decoded packet summary.`,
    `**Suspicious errors:** ${packet && isErrorPacketFast(packet) ? "This packet looks error-like." : "No obvious error signal is visible."}`,
    `**Payload summary:** ${summarizePacketPayload(packet)}`,
    "**Uncertainty:** This is a deterministic mock response. AI may be wrong in real provider mode; verify with the raw payload.",
  ].join("\n\n");
}

function summarizePacketPayload(packet: Packet | null) {
  if (!packet) {
    return "No selected packet was provided.";
  }

  return `${packet.payloadKind} payload, ${packet.sizeBytes} bytes, ${packet.direction} direction.`;
}
