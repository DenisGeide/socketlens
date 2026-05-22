import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultAppSettings, normalizeAppSettings, type AppSettings } from "@/models";
import {
  createPersistedSettingsState,
  resolvePersistedSettings,
  settingsStorageKey,
  settingsStorageVersion,
} from "@/lib/settings-persistence";

type SettingsStore = {
  resetSettings: () => void;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      resetSettings: () => set({ settings: defaultAppSettings }),
      settings: defaultAppSettings,
      updateSettings: (settings) =>
        set((state) => ({
          settings: normalizeAppSettings({
            ...state.settings,
            ...settings,
          }),
        })),
    }),
    {
      merge: (persistedState, currentState) => {
        return {
          ...currentState,
          settings: resolvePersistedSettings(persistedState, currentState.settings),
        };
      },
      name: settingsStorageKey,
      partialize: (state) => createPersistedSettingsState(state.settings),
      storage: createJSONStorage(() => localStorage),
      version: settingsStorageVersion,
    },
  ),
);
