import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { AppLanguage } from "@/models";
import en from "./locales/en.json";
import ru from "./locales/ru.json";

export const supportedLanguages = [
  { label: "Русский", value: "ru" },
  { label: "English", value: "en" },
] as const;

export const defaultLanguage = "ru";
export const fallbackLanguage = "en";
export const localeByLanguage = {
  en: "en-US",
  ru: "ru-RU",
} satisfies Record<AppLanguage, string>;

void i18n.use(initReactI18next).init({
  fallbackLng: fallbackLanguage,
  interpolation: {
    escapeValue: false,
  },
  lng: getStoredLanguage(),
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
});

function getStoredLanguage() {
  try {
    const storedSettings = window.localStorage.getItem("socketlens.settings.v1");
    const parsed = storedSettings ? (JSON.parse(storedSettings) as unknown) : null;

    if (isRecord(parsed) && isRecord(parsed.state) && isRecord(parsed.state.settings)) {
      const language = parsed.state.settings.language;

      if (language === "ru" || language === "en") {
        return language;
      }
    }
  } catch {
    return defaultLanguage;
  }

  return defaultLanguage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export { i18n };

export function getCurrentAppLocale() {
  const language = i18n.resolvedLanguage ?? i18n.language;

  return language === "ru" ? localeByLanguage.ru : localeByLanguage.en;
}
