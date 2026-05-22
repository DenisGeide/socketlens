import { describe, expect, it, vi } from "vitest";
import { runAiAnalysis, validateAiActionAvailability } from "@/lib/ai";
import { buildAiMessages } from "@/lib/ai/prompts";
import { mockAiProvider } from "@/lib/ai/providers/mock";
import { createEntityId, createPacket, defaultAppSettings, type Packet } from "@/models";

describe("AI analysis prompts", () => {
  it("keeps explain-packet focused on the selected packet", () => {
    const selectedPacket = createTestPacket({
      payload: JSON.stringify({ requestId: "req_1", type: "auth.accepted" }),
    });
    const unrelatedPacket = createTestPacket({
      payload: JSON.stringify({ secret: "should-not-be-in-packet-prompt", type: "chat.message" }),
    });

    const messages = buildAiMessages({
      action: "explain-packet",
      packet: selectedPacket,
      packets: [selectedPacket, unrelatedPacket],
      session: null,
    });

    const userPrompt = messages[1]?.content ?? "";

    expect(userPrompt).toContain("auth.accepted");
    expect(userPrompt).not.toContain("should-not-be-in-packet-prompt");
    expect(userPrompt).toContain("AI may be wrong");
  });

  it("builds bounded sequence prompts with uncertainty guidance", () => {
    const packets = Array.from({ length: 12 }, (_, index) =>
      createTestPacket({
        payload: JSON.stringify({ sequence: index, type: `chat.event.${index}` }),
        timestamp: Date.UTC(2026, 4, 22, 10, 0, index),
      }),
    );

    const messages = buildAiMessages({
      action: "explain-sequence",
      packet: packets[6],
      packets,
      session: null,
    });

    const userPrompt = messages[1]?.content ?? "";

    expect(userPrompt).toContain("Sequence context");
    expect(userPrompt).toContain("Selected packet role");
    expect(userPrompt).toContain("AI may be wrong");
  });

  it("returns deterministic mock results for offline tests", async () => {
    const packet = createTestPacket({
      payload: JSON.stringify({ code: "RATE_LIMIT_SOFT", severity: "warning", type: "error.rate_limit.soft" }),
    });

    const result = await mockAiProvider.analyze(defaultAppSettings.aiProvider, {
      action: "explain-packet",
      packet,
      packets: [packet],
      session: null,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data.provider).toBe("mock");
      expect(result.data.content).toContain("Mock packet explanation");
      expect(result.data.content).toContain("AI may be wrong");
    }
  });

  it("keeps disabled AI as an explicit non-network state", async () => {
    const packet = createTestPacket({
      payload: JSON.stringify({ type: "auth.accepted" }),
    });

    const result = await runAiAnalysis(defaultAppSettings.aiProvider, {
      action: "explain-packet",
      packet,
      packets: [packet],
      session: null,
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe("ai_disabled");
    }
  });

  it("surfaces provider-unavailable errors when a configured provider cannot be reached", async () => {
    const packet = createTestPacket({
      payload: JSON.stringify({ type: "auth.accepted" }),
    });
    const fetchMock = vi.fn().mockRejectedValue(new Error("connection refused"));

    vi.stubGlobal("fetch", fetchMock);

    try {
      const result = await runAiAnalysis(
        {
          ...defaultAppSettings.aiProvider,
          provider: "ollama",
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            model: "llama3.2",
          },
        },
        {
          action: "explain-packet",
          packet,
          packets: [packet],
          session: null,
        },
      );

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.error.code).toBe("network_error");
        expect(result.error.message).toContain("Could not reach Ollama");
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("blocks session actions until packet context exists", () => {
    const validation = validateAiActionAvailability(
      {
        ...defaultAppSettings.aiProvider,
        provider: "ollama",
        ollama: {
          baseUrl: "http://127.0.0.1:11434",
          model: "llama3.2",
        },
      },
      {
        action: "summarize-session",
        packet: null,
        packets: [],
        session: null,
      },
    );

    expect(validation.ok).toBe(false);

    if (!validation.ok) {
      expect(validation.error.code).toBe("invalid_configuration");
    }
  });
});

function createTestPacket(input: { payload: string; timestamp?: number }): Packet {
  return createPacket({
    connectionId: createEntityId(),
    direction: "inbound",
    payload: input.payload,
    sessionId: createEntityId(),
    timestamp: input.timestamp ?? Date.UTC(2026, 4, 22, 10, 0, 0),
  });
}
