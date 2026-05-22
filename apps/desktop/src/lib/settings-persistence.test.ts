import { describe, expect, it } from "vitest";
import { defaultAppSettings, maxPacketRetentionLimit, minPacketRetentionLimit } from "@/models";
import {
  createPersistedSettingsState,
  parseSettingsStorageEnvelope,
  resolvePersistedSettings,
  serializeSettingsStorageEnvelope,
  settingsStorageKey,
  settingsStorageVersion,
} from "@/lib/settings-persistence";

describe("settings persistence helpers", () => {
  it("uses a stable local storage key and storage version", () => {
    expect(settingsStorageKey).toBe("socketlens.settings.v1");
    expect(settingsStorageVersion).toBe(1);
  });

  it("normalizes persisted settings before saving or merging", () => {
    const persisted = createPersistedSettingsState({
      packetRetentionLimit: maxPacketRetentionLimit + 1,
      privacy: {
        persistRecentConnections: false,
        showPayloadPreviewInTimeline: true,
      },
      theme: "system",
    });

    expect(persisted.settings.packetRetentionLimit).toBe(maxPacketRetentionLimit);
    expect(persisted.settings.privacy.persistRecentConnections).toBe(false);

    const resolved = resolvePersistedSettings({
      settings: {
        defaultMode: "unsupported",
        packetRetentionLimit: 1,
        privacy: {
          persistRecentConnections: "yes",
        },
        theme: "neon",
      },
    });

    expect(resolved.packetRetentionLimit).toBe(minPacketRetentionLimit);
    expect(resolved.privacy.persistRecentConnections).toBe(defaultAppSettings.privacy.persistRecentConnections);
    expect(resolved.theme).toBe(defaultAppSettings.theme);
  });

  it("round-trips the persisted storage envelope and rejects invalid contents", () => {
    const serialized = serializeSettingsStorageEnvelope({
      autoScrollDefault: false,
      packetRetentionLimit: minPacketRetentionLimit,
    });

    expect(parseSettingsStorageEnvelope(serialized)).toMatchObject({
      autoScrollDefault: false,
      packetRetentionLimit: minPacketRetentionLimit,
    });

    expect(parseSettingsStorageEnvelope("{not json")).toBeNull();
    expect(parseSettingsStorageEnvelope(JSON.stringify({ state: {}, version: 999 }))).toBeNull();
  });

  it("drops older startup mode settings that are no longer part of the alpha settings surface", () => {
    const resolved = resolvePersistedSettings({
      settings: {
        defaultMode: "proxy",
        defaultEndpointUrl: "ws://example.test",
        locale: "en-US",
        packetRetentionLimit: minPacketRetentionLimit,
      },
    });

    expect("defaultMode" in resolved).toBe(false);
    expect("defaultEndpointUrl" in resolved).toBe(false);
    expect("locale" in resolved).toBe(false);
    expect(resolved.packetRetentionLimit).toBe(minPacketRetentionLimit);
  });
});
