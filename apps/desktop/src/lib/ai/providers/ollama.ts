import { buildAiMessages } from "@/lib/ai/prompts";
import { fetchWithTimeout } from "@/lib/ai/fetch-with-timeout";
import { validateAiProviderConfiguration } from "@/lib/ai/provider-validation";
import type { AiAnalysisInput, AiAnalysisResult, AiProviderClient, AiProviderResult } from "@/lib/ai/types";
import { redactUrlForDisplay, type AppAiProviderSettings } from "@/models";

type OllamaChatResponse = {
  error?: unknown;
  message?: {
    content?: unknown;
  };
  response?: unknown;
};

type OllamaTagsResponse = {
  error?: unknown;
  models?: Array<{
    model?: unknown;
    modified_at?: unknown;
    name?: unknown;
    size?: unknown;
  }>;
};

export type OllamaModel = {
  modifiedAt: string | null;
  name: string;
  sizeBytes: number | null;
};

export const ollamaProvider: AiProviderClient = {
  analyze: async (settings, input) => analyzeWithOllama(settings, input),
  validateConfiguration: validateAiProviderConfiguration,
};

export async function fetchOllamaModels(baseUrl: string): Promise<AiProviderResult<OllamaModel[]>> {
  const normalizedBaseUrl = normalizeOllamaBaseUrl(baseUrl);

  if (!normalizedBaseUrl) {
    return {
      error: {
        code: "invalid_configuration",
        message: "Enter an Ollama base URL.",
      },
      ok: false,
    };
  }

  try {
    const response = await fetchWithTimeout(`${normalizedBaseUrl}/api/tags`, {
      headers: {
        Accept: "application/json",
      },
      method: "GET",
    });
    const payload = (await response.json().catch(() => null)) as OllamaTagsResponse | null;

    if (!response.ok) {
      return {
        error: {
          code: "provider_error",
          message: getOllamaErrorMessage(payload) ?? `Ollama returned HTTP ${response.status}.`,
        },
        ok: false,
      };
    }

    const models = Array.isArray(payload?.models)
      ? payload.models
          .map((model): OllamaModel | null => {
            const name = typeof model.name === "string" ? model.name : typeof model.model === "string" ? model.model : "";

            if (!name.trim()) {
              return null;
            }

            return {
              modifiedAt: typeof model.modified_at === "string" ? model.modified_at : null,
              name: name.trim(),
              sizeBytes: typeof model.size === "number" && Number.isFinite(model.size) ? model.size : null,
            };
          })
          .filter((model): model is OllamaModel => model !== null)
          .sort((left, right) => left.name.localeCompare(right.name))
      : [];

    return {
      data: models,
      ok: true,
    };
  } catch (error) {
    return createOllamaNetworkError(normalizedBaseUrl, error);
  }
}

async function analyzeWithOllama(
  settings: AppAiProviderSettings,
  input: AiAnalysisInput,
): Promise<AiProviderResult<AiAnalysisResult>> {
  const validation = validateAiProviderConfiguration(settings);

  if (!validation.ok) {
    return validation;
  }

  const providerSettings = settings.ollama;
  const baseUrl = normalizeOllamaBaseUrl(providerSettings.baseUrl);

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/chat`, {
      body: JSON.stringify({
        messages: buildAiMessages(input),
        model: providerSettings.model.trim(),
        stream: false,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as OllamaChatResponse | null;

    if (!response.ok) {
      return {
        error: {
          code: "provider_error",
          message: getOllamaErrorMessage(payload) ?? `Ollama returned HTTP ${response.status}.`,
        },
        ok: false,
      };
    }

    const content = getOllamaContent(payload);

    if (!content) {
      return {
        error: {
          code: "response_parse_error",
          message: "Ollama returned an empty or unsupported response.",
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
        provider: "ollama",
      },
      ok: true,
    };
  } catch (error) {
    return createOllamaNetworkError(baseUrl, error);
  }
}

function normalizeOllamaBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function createOllamaNetworkError(baseUrl: string, error: unknown): AiProviderResult<never> {
  const detail = error instanceof Error && error.message !== "Failed to fetch" ? ` ${error.message}` : "";
  const redactedBaseUrl = baseUrl ? redactUrlForDisplay(baseUrl) : "the configured URL";

  return {
    error: {
      code: "network_error",
      message: `Could not reach Ollama at ${redactedBaseUrl}.${detail}`,
    },
    ok: false,
  };
}

function getOllamaContent(payload: OllamaChatResponse | null) {
  const chatContent = payload?.message?.content;

  if (typeof chatContent === "string" && chatContent.trim()) {
    return chatContent;
  }

  return typeof payload?.response === "string" && payload.response.trim() ? payload.response : null;
}

function getOllamaErrorMessage(payload: OllamaChatResponse | null) {
  return typeof payload?.error === "string" && payload.error.trim() ? payload.error : null;
}
