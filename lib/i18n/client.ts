"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LANGUAGE, resources, SUPPORTED_LANGUAGES, type SupportedLanguage } from "./resources";

const STORAGE_KEY = "moodify-language";

export function getUserPreferredLanguage(): SupportedLanguage {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
  if (SUPPORTED_LANGUAGES.includes(storedLanguage as SupportedLanguage)) {
    return storedLanguage as SupportedLanguage;
  }

  const browserLanguage = window.navigator.language.split("-")[0];
  if (SUPPORTED_LANGUAGES.includes(browserLanguage as SupportedLanguage)) {
    return browserLanguage as SupportedLanguage;
  }

  return DEFAULT_LANGUAGE;
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
  });
}

export function persistLanguage(language: SupportedLanguage) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, language);
  document.documentElement.lang = language;
}

export { i18n };
