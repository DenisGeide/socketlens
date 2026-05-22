import { buildAiMessages } from "@/lib/ai/prompts";
import { fetchWithTimeout } from "@/lib/ai/fetch-with-timeout";
import { validateAiProviderConfiguration } from "@/lib/ai/provider-validation";
import type { AiAnalysisInput, AiAnalysisResult, AiProviderClient, AiProviderResult } from "@/lib/ai/types";
import { redactUrlForDisplay, type AppAiProviderSettings } from "@/models";

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: {
    message?: unknown;
  };
};

export const openAiCompatibleProvider: AiProviderClient = {
  analyze: async (settings, input) => analyzeWithOpenAiCompatible(settings, input),
  validateConfiguration: validateAiProviderConfiguration,
};

async function analyzeWithOpenAiCompatible(
  settings: AppAiProviderSettings,
  input: AiAnalysisInput,
): Promise<AiProviderResult<AiAnalysisResult>> {
  const validation = validateAiProviderConfiguration(settings);

  if (!validation.ok) {
    return validation;
  }

  const providerSettings = settings.openAiCompatible;
  const baseUrl = providerSettings.baseUrl.trim().replace(/\/+$/, "");

  try {
    const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
      body: JSON.stringify({
        messages: buildAiMessages(input),
        model: providerSettings.model.trim(),
        temperature: 0.2,
      }),
      headers: {
        Authorization: `Bearer ${providerSettings.apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as OpenAiChatResponse | null;

    if (!response.ok) {
      return {
        error: {
          code: "provider_error",
          message: getProviderErrorMessage(payload) ?? `OpenAI-compatible provider returned HTTP ${response.status}.`,
        },
        ok: false,
      };
    }

    const content = payload?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      return {
        error: {
          code: "response_parse_error",
          message: "OpenAI-compatible provider returned an empty or unsupported response.",
        },
        ok: false,
      };
    }

    return {
      data: {
        action: input.action,
        content,
        createdAt: Date.now(),
        model: providerSettings.model.trim(),
        provider: "openai-compatible",
      },
      ok: true,
    };
  } catch (error) {
    const redactedBaseUrl = baseUrl ? redactUrlForDisplay(baseUrl) : "the configured URL";

    return {
      error: {
        code: "network_error",
        message: `Could not reach the OpenAI-compatible endpoint at ${redactedBaseUrl}.`,
      },
      ok: false,
    };
  }
}

function getProviderErrorMessage(payload: OpenAiChatResponse | null) {
  const message = payload?.error?.message;

  return typeof message === "string" && message.trim() ? message : null;
}
