import { defaultAppSettings, normalizeAppSettings, type AppSettings } from "@/models";

export const settingsStorageKey = "socketlens.settings.v1";
export const settingsStorageVersion = 1;

export type PersistedSettingsState = {
  settings: AppSettings;
};

type SettingsStorageEnvelope = {
  state: PersistedSettingsState;
  version: typeof settingsStorageVersion;
};

export function createPersistedSettingsState(settings: Partial<AppSettings>): PersistedSettingsState {
  return {
    settings: normalizeAppSettings(settings),
  };
}

export function resolvePersistedSettings(persistedState: unknown, fallbackSettings = defaultAppSettings): AppSettings {
  if (!isRecord(persistedState) || !isRecord(persistedState.settings)) {
    return normalizeAppSettings(fallbackSettings);
  }

  return normalizeAppSettings(persistedState.settings as Partial<AppSettings>);
}

export function serializeSettingsStorageEnvelope(settings: Partial<AppSettings>): string {
  const envelope: SettingsStorageEnvelope = {
    state: createPersistedSettingsState(settings),
    version: settingsStorageVersion,
  };

  return JSON.stringify(envelope);
}

export function parseSettingsStorageEnvelope(contents: string): AppSettings | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || parsed.version !== settingsStorageVersion || !isRecord(parsed.state)) {
    return null;
  }

  return resolvePersistedSettings(parsed.state);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
