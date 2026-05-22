export type AppLanguage = "ru" | "en";
export type AppTheme = "dark" | "light" | "system";
export type AppAiProvider = "disabled" | "openai-compatible" | "ollama";
export type AppOnboardingStepId =
  | "start-demo"
  | "view-timeline"
  | "select-packet"
  | "open-inspector"
  | "start-echo-server"
  | "connect-echo-server"
  | "send-ping"
  | "observe-pong"
  | "replay-packet";

export type AppPrivacySettings = {
  persistRecentConnections: boolean;
  showPayloadPreviewInTimeline: boolean;
};

export type OpenAiCompatibleSettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type OllamaSettings = {
  baseUrl: string;
  model: string;
};

export type AppAiProviderSettings = {
  ollama: OllamaSettings;
  openAiCompatible: OpenAiCompatibleSettings;
  provider: AppAiProvider;
};

export type AppOnboardingSettings = {
  completedStepIds: AppOnboardingStepId[];
  dismissedAt: number | null;
};

export type AppSettings = {
  aiProvider: AppAiProviderSettings;
  autoSelectLatestPacket: boolean;
  autoScrollDefault: boolean;
  compactMode: boolean;
  language: AppLanguage;
  logPanelCollapsed: boolean;
  logRetentionLimit: number;
  onboarding: AppOnboardingSettings;
  packetRetentionLimit: number;
  privacy: AppPrivacySettings;
  theme: AppTheme;
};

export const onboardingStepIds = [
  "start-demo",
  "view-timeline",
  "select-packet",
  "open-inspector",
  "start-echo-server",
  "connect-echo-server",
  "send-ping",
  "observe-pong",
  "replay-packet",
] as const satisfies AppOnboardingStepId[];
export const minPacketRetentionLimit = 10_000;
export const maxPacketRetentionLimit = 100_000;
export const packetRetentionLimitStep = 1_000;

export const defaultAppSettings: AppSettings = {
  aiProvider: {
    ollama: {
      baseUrl: "http://127.0.0.1:11434",
      model: "",
    },
    openAiCompatible: {
      apiKey: "",
      baseUrl: "",
      model: "",
    },
    provider: "disabled",
  },
  autoSelectLatestPacket: true,
  autoScrollDefault: true,
  compactMode: false,
  language: "ru",
  logPanelCollapsed: true,
  logRetentionLimit: 200,
  onboarding: {
    completedStepIds: [],
    dismissedAt: null,
  },
  packetRetentionLimit: minPacketRetentionLimit,
  privacy: {
    persistRecentConnections: true,
    showPayloadPreviewInTimeline: true,
  },
  theme: "dark",
};

export function clampPacketRetentionLimit(value: number) {
  if (!Number.isFinite(value)) {
    return defaultAppSettings.packetRetentionLimit;
  }

  const steppedValue = Math.round(value / packetRetentionLimitStep) * packetRetentionLimitStep;

  return Math.min(Math.max(steppedValue, minPacketRetentionLimit), maxPacketRetentionLimit);
}

export function normalizeAppSettings(settings: Partial<AppSettings>): AppSettings {
  const privacy = {
    ...defaultAppSettings.privacy,
    ...(isRecord(settings.privacy) ? settings.privacy : {}),
  };

  const aiProvider = isRecord(settings.aiProvider) ? settings.aiProvider : {};
  const onboarding = isRecord(settings.onboarding) ? settings.onboarding : {};

  return {
    aiProvider: normalizeAiProviderSettings(aiProvider),
    autoSelectLatestPacket: getBooleanValue(settings.autoSelectLatestPacket, defaultAppSettings.autoSelectLatestPacket),
    autoScrollDefault: getBooleanValue(settings.autoScrollDefault, defaultAppSettings.autoScrollDefault),
    compactMode: getBooleanValue(settings.compactMode, defaultAppSettings.compactMode),
    language: normalizeLanguage(settings.language),
    logPanelCollapsed: getBooleanValue(settings.logPanelCollapsed, defaultAppSettings.logPanelCollapsed),
    logRetentionLimit: getPositiveIntegerValue(settings.logRetentionLimit, defaultAppSettings.logRetentionLimit),
    onboarding: normalizeOnboardingSettings(onboarding),
    packetRetentionLimit: clampPacketRetentionLimit(settings.packetRetentionLimit ?? defaultAppSettings.packetRetentionLimit),
    privacy: {
      persistRecentConnections:
        typeof privacy.persistRecentConnections === "boolean"
          ? privacy.persistRecentConnections
          : defaultAppSettings.privacy.persistRecentConnections,
      showPayloadPreviewInTimeline:
        typeof privacy.showPayloadPreviewInTimeline === "boolean"
          ? privacy.showPayloadPreviewInTimeline
          : defaultAppSettings.privacy.showPayloadPreviewInTimeline,
    },
    theme: normalizeTheme(settings.theme),
  };
}

function normalizeOnboardingSettings(settings: Record<string, unknown>): AppOnboardingSettings {
  const completedStepIds = Array.isArray(settings.completedStepIds)
    ? settings.completedStepIds.filter((stepId): stepId is AppOnboardingStepId => isOnboardingStepId(stepId))
    : [];
  const dismissedAt = typeof settings.dismissedAt === "number" && Number.isFinite(settings.dismissedAt) ? settings.dismissedAt : null;

  return {
    completedStepIds: [...new Set(completedStepIds)],
    dismissedAt,
  };
}

function isOnboardingStepId(value: unknown): value is AppOnboardingStepId {
  return typeof value === "string" && onboardingStepIds.includes(value as AppOnboardingStepId);
}

function normalizeAiProviderSettings(settings: Record<string, unknown>): AppAiProviderSettings {
  const openAiCompatible = isRecord(settings.openAiCompatible) ? settings.openAiCompatible : {};
  const ollama = isRecord(settings.ollama) ? settings.ollama : {};

  return {
    ollama: {
      baseUrl: getStringValue(ollama.baseUrl, defaultAppSettings.aiProvider.ollama.baseUrl),
      model: getStringValue(ollama.model, defaultAppSettings.aiProvider.ollama.model),
    },
    openAiCompatible: {
      apiKey: getStringValue(openAiCompatible.apiKey, defaultAppSettings.aiProvider.openAiCompatible.apiKey),
      baseUrl: getStringValue(openAiCompatible.baseUrl, defaultAppSettings.aiProvider.openAiCompatible.baseUrl),
      model: getStringValue(openAiCompatible.model, defaultAppSettings.aiProvider.openAiCompatible.model),
    },
    provider: normalizeAiProvider(settings.provider),
  };
}

function normalizeAiProvider(provider: unknown): AppAiProvider {
  return provider === "openai-compatible" || provider === "ollama" || provider === "disabled"
    ? provider
    : defaultAppSettings.aiProvider.provider;
}

function normalizeTheme(theme: unknown): AppTheme {
  return theme === "dark" || theme === "light" || theme === "system" ? theme : defaultAppSettings.theme;
}

function normalizeLanguage(language: unknown): AppLanguage {
  return language === "ru" || language === "en" ? language : defaultAppSettings.language;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function getBooleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function getPositiveIntegerValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}
