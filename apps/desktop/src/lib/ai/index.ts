import { validateAiProviderConfiguration } from "@/lib/ai/provider-validation";
import { defaultAIProviders } from "@/extensions/ai-provider";
import type { AiAnalysisInput, AiAnalysisResult, AiProviderResult, AiProviderValidation } from "@/lib/ai/types";
import type { AppAiProviderSettings } from "@/models";

export type {
  AiAction,
  AiAnalysisInput,
  AiAnalysisResult,
  AiProviderError,
  AiProviderErrorCode,
  AiProviderResult,
  AiProviderValidation,
} from "@/lib/ai/types";

export { validateAiProviderConfiguration } from "@/lib/ai/provider-validation";
export { fetchOllamaModels, type OllamaModel } from "@/lib/ai/providers/ollama";

export async function runAiAnalysis(
  settings: AppAiProviderSettings,
  input: AiAnalysisInput,
): Promise<AiProviderResult<AiAnalysisResult>> {
  const validation = validateAiProviderConfiguration(settings);

  if (!validation.ok) {
    return validation;
  }

  if (settings.provider === "disabled") {
    return {
      error: {
        code: "ai_disabled",
        message: "AI analysis is disabled. Enable a provider in Settings to run this action.",
      },
      ok: false,
    };
  }

  const provider = defaultAIProviders.find((candidate) => candidate.id === settings.provider);

  if (!provider) {
    return {
      error: {
        code: "invalid_configuration",
        message: `Unsupported AI provider: ${settings.provider}.`,
      },
      ok: false,
    };
  }

  return provider.analyze(settings, input);
}

export function validateAiActionAvailability(
  settings: AppAiProviderSettings,
  input: AiAnalysisInput,
): AiProviderValidation {
  const validation = validateAiProviderConfiguration(settings);

  if (!validation.ok || settings.provider === "disabled") {
    return validation;
  }

  if (input.action === "explain-packet" && !input.packet) {
    return {
      error: {
        code: "invalid_configuration",
        message: "Select a packet before asking AI to explain it.",
      },
      ok: false,
    };
  }

  if ((input.action === "summarize-session" || input.action === "detect-event-flow") && input.packets.length === 0) {
    return {
      error: {
        code: "invalid_configuration",
        message: "Capture or import packets before running a session AI action.",
      },
      ok: false,
    };
  }

  return validation;
}
