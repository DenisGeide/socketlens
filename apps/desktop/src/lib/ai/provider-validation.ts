import type { AppAiProviderSettings } from "@/models";
import type { AiProviderValidation } from "@/lib/ai/types";

export function validateAiProviderConfiguration(settings: AppAiProviderSettings): AiProviderValidation {
  if (settings.provider === "disabled") {
    return {
      data: {
        message: "AI is disabled. SocketLens will not send packet data to an AI provider.",
        provider: "disabled",
      },
      ok: true,
    };
  }

  if (settings.provider === "openai-compatible") {
    const baseUrl = settings.openAiCompatible.baseUrl.trim();
    const model = settings.openAiCompatible.model.trim();
    const apiKey = settings.openAiCompatible.apiKey.trim();

    if (!baseUrl) {
      return configurationError("Enter a base URL for the OpenAI-compatible provider.");
    }

    if (!isHttpUrl(baseUrl)) {
      return configurationError("OpenAI-compatible base URL must start with http:// or https://.");
    }

    if (!model) {
      return configurationError("Enter a model name for the OpenAI-compatible provider.");
    }

    if (!apiKey) {
      return configurationError("Enter an API key. SocketLens stores it only in local app storage.");
    }

    return {
      data: {
        message: "OpenAI-compatible provider settings look complete.",
        provider: "openai-compatible",
      },
      ok: true,
    };
  }

  const baseUrl = settings.ollama.baseUrl.trim();
  const model = settings.ollama.model.trim();

  if (!baseUrl) {
    return configurationError("Enter an Ollama base URL.");
  }

  if (!isHttpUrl(baseUrl)) {
    return configurationError("Ollama base URL must start with http:// or https://.");
  }

  if (!model) {
    return configurationError("Enter an Ollama model name.");
  }

  return {
    data: {
      message: "Ollama provider settings look complete.",
      provider: "ollama",
    },
    ok: true,
  };
}

function configurationError(message: string): AiProviderValidation {
  return {
    error: {
      code: "invalid_configuration",
      message,
    },
    ok: false,
  };
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
