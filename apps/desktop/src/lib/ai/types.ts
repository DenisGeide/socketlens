import type { AppAiProvider, AppAiProviderSettings, Packet, Session } from "@/models";

export type AiAction =
  | "detect-event-flow"
  | "explain-auth-reconnect-flow"
  | "explain-packet"
  | "explain-sequence"
  | "summarize-session";
export type AiResultProvider = Exclude<AppAiProvider, "disabled"> | "mock";

export type AiAnalysisInput = {
  action: AiAction;
  packet?: Packet | null;
  packets: Packet[];
  session: Session | null;
};

export type AiAnalysisResult = {
  action: AiAction;
  content: string;
  createdAt: number;
  model: string;
  provider: AiResultProvider;
};

export type AiProviderErrorCode =
  | "ai_disabled"
  | "invalid_configuration"
  | "network_error"
  | "provider_error"
  | "response_parse_error";

export type AiProviderError = {
  code: AiProviderErrorCode;
  message: string;
};

export type AiProviderResult<T> =
  | {
      data: T;
      ok: true;
    }
  | {
      error: AiProviderError;
      ok: false;
    };

export type AiProviderValidation = AiProviderResult<{
  message: string;
  provider: AppAiProvider;
}>;

export type AiProviderClient = {
  analyze: (settings: AppAiProviderSettings, input: AiAnalysisInput) => Promise<AiProviderResult<AiAnalysisResult>>;
  validateConfiguration: (settings: AppAiProviderSettings) => AiProviderValidation;
};
