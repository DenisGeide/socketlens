import type { TFunction } from "i18next";

const webSocketValidationMessageKeys = new Map([
  ["Enter a WebSocket URL before connecting.", "errors.websocket.empty"],
  ["Endpoint must start with ws:// or wss://.", "errors.websocket.protocol"],
  ["WebSocket URLs cannot include URL fragments.", "errors.websocket.fragment"],
  ["WebSocket URL must include a host.", "errors.websocket.host"],
  ["Enter a valid ws:// or wss:// endpoint.", "errors.websocket.invalid"],
]);

const aiProviderValidationMessageKeys = new Map([
  ["AI is disabled. SocketLens will not send packet data to an AI provider.", "errors.ai.disabled"],
  ["Enter a base URL for the OpenAI-compatible provider.", "errors.ai.openaiBaseUrlMissing"],
  ["OpenAI-compatible base URL must start with http:// or https://.", "errors.ai.openaiBaseUrlInvalid"],
  ["Enter a model name for the OpenAI-compatible provider.", "errors.ai.openaiModelMissing"],
  ["Enter an API key. SocketLens stores it only in local app storage.", "errors.ai.openaiApiKeyMissing"],
  ["OpenAI-compatible provider settings look complete.", "errors.ai.openaiComplete"],
  ["Enter an Ollama base URL.", "errors.ai.ollamaBaseUrlMissing"],
  ["Ollama base URL must start with http:// or https://.", "errors.ai.ollamaBaseUrlInvalid"],
  ["Enter an Ollama model name.", "errors.ai.ollamaModelMissing"],
  ["Ollama provider settings look complete.", "errors.ai.ollamaComplete"],
]);

export function translateWebSocketValidationMessage(message: string, t: TFunction) {
  const key = webSocketValidationMessageKeys.get(message);

  return key ? t(key) : message;
}

export function translateAiProviderValidationMessage(message: string, t: TFunction) {
  const key = aiProviderValidationMessageKeys.get(message);

  return key ? t(key) : message;
}
