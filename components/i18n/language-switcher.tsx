"use client";

import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n/resources";

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const currentLanguage = SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
    ? (i18n.language as SupportedLanguage)
    : "vi";
  const nextLanguage: SupportedLanguage = currentLanguage === "vi" ? "en" : "vi";

  return (
    <button
      type="button"
      onClick={() => void i18n.changeLanguage(nextLanguage)}
      title={t("common.switchLanguage")}
      aria-label={t("common.switchLanguage")}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-white backdrop-blur-md transition hover:bg-white/[0.08] ${className}`}
    >
      <Languages className="h-4 w-4" strokeWidth={1.7} />
      <span className="font-manrope text-[12px] tracking-[0.16em]">
        {currentLanguage.toUpperCase()}
      </span>
    </button>
  );
}
