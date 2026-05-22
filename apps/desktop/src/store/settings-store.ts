import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addDismissedOnboardingCardId, defaultAppSettings, normalizeAppSettings, type AppOnboardingCardId, type AppSettings } from "@/models";
import {
  createPersistedSettingsState,
  resolvePersistedSettings,
  settingsStorageKey,
  settingsStorageVersion,
} from "@/lib/settings-persistence";

type SettingsStore = {
  dismissOnboardingCard: (cardId: AppOnboardingCardId) => void;
  restartOnboarding: () => void;
  resetSettings: () => void;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      dismissOnboardingCard: (cardId) =>
        set((state) => ({
          settings: normalizeAppSettings({
            ...state.settings,
            onboarding: {
              ...state.settings.onboarding,
              dismissedCardIds: addDismissedOnboardingCardId(state.settings.onboarding.dismissedCardIds, cardId),
            },
          }),
        })),
      restartOnboarding: () =>
        set((state) => ({
          settings: normalizeAppSettings({
            ...state.settings,
            onboarding: {
              completedStepIds: [],
              dismissedCardIds: [],
              dismissedAt: null,
            },
          }),
        })),
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
