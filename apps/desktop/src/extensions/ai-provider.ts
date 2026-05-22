import { ollamaProvider } from "@/lib/ai/providers/ollama";
import { openAiCompatibleProvider } from "@/lib/ai/providers/openai-compatible";
import type { AIProvider } from "@/extensions/types";

export const openAiCompatibleAIProvider: AIProvider = {
  ...openAiCompatibleProvider,
  id: "openai-compatible",
  label: "OpenAI-compatible",
  privacyBoundary: "external",
};

export const ollamaAIProvider: AIProvider = {
  ...ollamaProvider,
  id: "ollama",
  label: "Ollama",
  privacyBoundary: "local",
};

export const defaultAIProviders = [
  openAiCompatibleAIProvider,
  ollamaAIProvider,
] as const satisfies AIProvider[];
