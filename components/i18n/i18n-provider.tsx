"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";

import { getUserPreferredLanguage, i18n, persistLanguage } from "@/lib/i18n/client";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n/resources";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const preferredLang = getUserPreferredLanguage();
    if (preferredLang !== i18n.language) {
      void i18n.changeLanguage(preferredLang);
    }
    persistLanguage(preferredLang);

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
