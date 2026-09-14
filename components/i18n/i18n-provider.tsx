"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";

import { i18n, persistLanguage } from "@/lib/i18n/client";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n/resources";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const currentLanguage = SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
      ? (i18n.language as SupportedLanguage)
      : DEFAULT_LANGUAGE;

    persistLanguage(currentLanguage);

    const handleLanguageChanged = (language: string) => {
      if (SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
        persistLanguage(language as SupportedLanguage);
      }
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
