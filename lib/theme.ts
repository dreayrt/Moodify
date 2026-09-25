"use client";

import { useState, useEffect } from "react";

export const THEME_STORAGE_KEY = "moodify.theme.gold_enabled";
export const VIP_BUTTONS_KEY = "moodify.theme.vip_buttons_enabled";
export const VIP_BUTTON_STYLE_KEY = "moodify.theme.vip_button_style";
export const VIP_SHELL_ENABLED_KEY = "moodify.theme.vip_shell_enabled";

export type VipButtonStyle = "gold" | "amber" | "cyan" | "emerald" | "ruby";

export type ThemeOption = {
  id: VipButtonStyle;
  name: string;
  badge: string;
  accent: string;
  gradient: string;
  glow: string;
  textColor: string;
  primaryBtnClass: string;
  secondaryBtnClass: string;
  iconBtnClass: string;
  equalizerGradient: string;
  // Sidebar styling
  sidebarBg: string;
  sidebarBorder: string;
  sidebarIconColor: string;
  sidebarActiveItem: string;
  sidebarActiveDot: string;
  // Bottom player bar styling
  playerBg: string;
  playerBorder: string;
  playerAccent: string;
};

export const VIP_BUTTON_THEMES: Record<VipButtonStyle, ThemeOption> = {
  gold: {
    id: "gold",
    name: "Champagne Luxe (Vàng Champagne)",
    badge: "👑 CHAMPAGNE",
    accent: "#dfba63",
    gradient: "from-[#caa048] via-[#edd087] to-[#b88628]",
    glow: "rgba(202,152,57,0.3)",
    textColor: "text-[#241703]",
    primaryBtnClass:
      "bg-gradient-to-r from-[#caa048] via-[#edd087] to-[#b88628] text-[#241703] font-bold tracking-wide shadow-[0_4px_20px_rgba(202,152,57,0.3)] hover:shadow-[0_6px_26px_rgba(202,152,57,0.45)] border border-[#faeaba]/60 hover:brightness-105",
    secondaryBtnClass:
      "border border-[#caa048]/40 text-[#edd087] hover:text-[#fff2cb] hover:bg-[#caa048]/10 shadow-[0_2px_12px_rgba(202,152,57,0.15)]",
    iconBtnClass:
      "bg-[#caa048]/20 border border-[#caa048]/45 text-[#edd087] shadow-[0_0_10px_rgba(202,152,57,0.3)]",
    equalizerGradient: "from-[#b88628] to-[#edd087] shadow-[0_0_8px_rgba(237,208,135,0.6)]",
    sidebarBg: "bg-gradient-to-b from-[#241c0e]/95 via-[#161108]/90 to-[#0b0803]/95",
    sidebarBorder: "border-[#cca048]/30 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_25px_rgba(202,152,57,0.12)]",
    sidebarIconColor: "text-[#edd087]",
    sidebarActiveItem: "bg-gradient-to-r from-[#caa048]/25 via-[#edd087]/15 to-transparent text-[#faeaba] font-semibold border-l-2 border-[#caa048] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]",
    sidebarActiveDot: "bg-[#edd087] shadow-[0_0_8px_#edd087]",
    playerBg: "bg-gradient-to-r from-[#161107]/95 via-[#231a0b]/90 to-[#100c05]/95",
    playerBorder: "border-t border-[#caa048]/30 shadow-[0_-15px_40px_rgba(0,0,0,0.9),0_-2px_20px_rgba(202,152,57,0.12)]",
    playerAccent: "#edd087",
  },
  amber: {
    id: "amber",
    name: "Hổ Phách Obsidian (Smoked Gold)",
    badge: "✨ OBSIDIAN",
    accent: "#f59e0b",
    gradient: "from-amber-500/25 via-yellow-500/30 to-amber-600/20",
    glow: "rgba(245,158,11,0.25)",
    textColor: "text-amber-200",
    primaryBtnClass:
      "bg-gradient-to-r from-amber-500/25 via-yellow-500/30 to-amber-600/20 hover:from-amber-500/35 hover:to-amber-600/30 text-amber-200 font-bold tracking-wide border border-amber-400/50 hover:border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_28px_rgba(245,158,11,0.4)] backdrop-blur-xl",
    secondaryBtnClass:
      "border border-amber-400/30 text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/10 shadow-[0_2px_12px_rgba(245,158,11,0.15)]",
    iconBtnClass:
      "bg-amber-400/15 border border-amber-400/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]",
    equalizerGradient: "from-amber-500 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
    sidebarBg: "bg-gradient-to-b from-[#231503]/95 via-[#140c01]/90 to-[#090501]/95",
    sidebarBorder: "border-amber-500/30 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_25px_rgba(245,158,11,0.12)]",
    sidebarIconColor: "text-amber-400",
    sidebarActiveItem: "bg-gradient-to-r from-amber-500/25 via-amber-600/15 to-transparent text-amber-100 font-semibold border-l-2 border-amber-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]",
    sidebarActiveDot: "bg-amber-400 shadow-[0_0_8px_#f59e0b]",
    playerBg: "bg-gradient-to-r from-[#140c01]/95 via-[#221403]/90 to-[#0e0801]/95",
    playerBorder: "border-t border-amber-500/30 shadow-[0_-15px_40px_rgba(0,0,0,0.9),0_-2px_20px_rgba(245,158,11,0.12)]",
    playerAccent: "#f59e0b",
  },
  cyan: {
    id: "cyan",
    name: "Băng Lam (Cyber Ice)",
    badge: "💎 CYBER",
    accent: "#06b6d4",
    gradient: "from-cyan-500/90 via-sky-500 to-blue-600",
    glow: "rgba(6,182,212,0.35)",
    textColor: "text-white",
    primaryBtnClass:
      "bg-gradient-to-r from-cyan-500/90 via-sky-500 to-blue-600 text-white font-bold tracking-wide shadow-[0_4px_20px_rgba(6,182,212,0.35)] hover:shadow-[0_6px_26px_rgba(6,182,212,0.5)] border border-cyan-300/40 hover:brightness-105",
    secondaryBtnClass:
      "border border-cyan-400/40 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]",
    iconBtnClass:
      "bg-cyan-400/25 border border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)]",
    equalizerGradient: "from-cyan-500 to-teal-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]",
    sidebarBg: "bg-gradient-to-b from-[#071f30]/95 via-[#04121d]/90 to-[#020a10]/95",
    sidebarBorder: "border-cyan-500/30 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_25px_rgba(6,182,212,0.12)]",
    sidebarIconColor: "text-cyan-400",
    sidebarActiveItem: "bg-gradient-to-r from-cyan-500/25 via-sky-600/15 to-transparent text-cyan-100 font-semibold border-l-2 border-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]",
    sidebarActiveDot: "bg-cyan-400 shadow-[0_0_8px_#06b6d4]",
    playerBg: "bg-gradient-to-r from-[#03131e]/95 via-[#072133]/90 to-[#020d14]/95",
    playerBorder: "border-t border-cyan-500/30 shadow-[0_-15px_40px_rgba(0,0,0,0.9),0_-2px_20px_rgba(6,182,212,0.12)]",
    playerAccent: "#06b6d4",
  },
  emerald: {
    id: "emerald",
    name: "Lục Bảo (Imperial Jade)",
    badge: "🌿 JADE",
    accent: "#10b981",
    gradient: "from-emerald-500/90 via-teal-500 to-emerald-600",
    glow: "rgba(16,185,129,0.35)",
    textColor: "text-white",
    primaryBtnClass:
      "bg-gradient-to-r from-emerald-500/90 via-teal-500 to-emerald-600 text-white font-bold tracking-wide shadow-[0_4px_20px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_26px_rgba(16,185,129,0.5)] border border-emerald-300/40 hover:brightness-105",
    secondaryBtnClass:
      "border border-emerald-400/40 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
    iconBtnClass:
      "bg-emerald-400/25 border border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]",
    equalizerGradient: "from-emerald-500 to-green-300 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
    sidebarBg: "bg-gradient-to-b from-[#06241a]/95 via-[#04150f]/90 to-[#020b08]/95",
    sidebarBorder: "border-emerald-500/30 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_25px_rgba(16,185,129,0.12)]",
    sidebarIconColor: "text-emerald-400",
    sidebarActiveItem: "bg-gradient-to-r from-emerald-500/25 via-teal-600/15 to-transparent text-emerald-100 font-semibold border-l-2 border-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]",
    sidebarActiveDot: "bg-emerald-400 shadow-[0_0_8px_#10b981]",
    playerBg: "bg-gradient-to-r from-[#03150f]/95 via-[#062419]/90 to-[#020d09]/95",
    playerBorder: "border-t border-emerald-500/30 shadow-[0_-15px_40px_rgba(0,0,0,0.9),0_-2px_20px_rgba(16,185,129,0.12)]",
    playerAccent: "#10b981",
  },
  ruby: {
    id: "ruby",
    name: "Phượng Hoàng (Velvet Ruby)",
    badge: "🌹 RUBY",
    accent: "#f43f5e",
    gradient: "from-rose-500 via-rose-600 to-pink-600",
    glow: "rgba(244,63,94,0.35)",
    textColor: "text-white",
    primaryBtnClass:
      "bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 text-white font-bold tracking-wide shadow-[0_4px_20px_rgba(244,63,94,0.35)] hover:shadow-[0_6px_26px_rgba(244,63,94,0.5)] border border-rose-300/40 hover:brightness-105",
    secondaryBtnClass:
      "border border-rose-400/40 text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]",
    iconBtnClass:
      "bg-rose-400/25 border border-rose-400/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.5)]",
    equalizerGradient: "from-rose-500 to-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
    sidebarBg: "bg-gradient-to-b from-[#2b0c16]/95 via-[#19070d]/90 to-[#0c0306]/95",
    sidebarBorder: "border-rose-500/30 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_25px_rgba(244,63,94,0.12)]",
    sidebarIconColor: "text-rose-400",
    sidebarActiveItem: "bg-gradient-to-r from-rose-500/25 via-pink-600/15 to-transparent text-rose-100 font-semibold border-l-2 border-rose-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]",
    sidebarActiveDot: "bg-rose-400 shadow-[0_0_8px_#f43f5e]",
    playerBg: "bg-gradient-to-r from-[#17050b]/95 via-[#290a14]/90 to-[#0f0307]/95",
    playerBorder: "border-t border-rose-500/30 shadow-[0_-15px_40px_rgba(0,0,0,0.9),0_-2px_20px_rgba(244,63,94,0.12)]",
    playerAccent: "#f43f5e",
  },
};

export const NORMAL_THEME = {
  primaryBtnClass:
    "bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-[0_8px_25px_rgba(168,85,247,0.45)] hover:scale-105 active:scale-95",
  secondaryBtnClass:
    "bg-white/[0.06] hover:bg-white/10 border border-white/15 text-white/90 hover:text-white",
  iconBtnClass:
    "bg-purple-500/30 border border-purple-400/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]",
  equalizerGradient:
    "from-pink-500 to-purple-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
  sidebarBg: "bg-gradient-to-b from-[#1a1336]/90 via-[#100e24]/85 to-[#080712]/95",
  sidebarBorder: "border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]",
  sidebarIconColor: "text-purple-400",
  sidebarActiveItem: "bg-gradient-to-r from-purple-500/25 via-indigo-500/15 to-transparent text-white font-semibold border-l-2 border-purple-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]",
  sidebarActiveDot: "bg-purple-400 shadow-[0_0_8px_#c084fc]",
  playerBg: "bg-gradient-to-r from-[#0d0d1a]/95 via-[#141226]/90 to-[#0b0a14]/95",
  playerBorder: "border-t border-white/10 shadow-[0_-15px_40px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]",
  playerAccent: "#c084fc",
};

export function getIsGoldThemeEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(THEME_STORAGE_KEY);
  return val === null ? true : val === "true";
}

export function setIsGoldThemeEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent("moodify-theme-changed", { detail: enabled }));
}

export function getIsVipButtonsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(VIP_BUTTONS_KEY);
  return val === null ? true : val === "true";
}

export function setIsVipButtonsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VIP_BUTTONS_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent("moodify-vip-buttons-changed", { detail: enabled }));
}

export function getIsVipShellEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(VIP_SHELL_ENABLED_KEY);
  return val === null ? true : val === "true";
}

export function setIsVipShellEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VIP_SHELL_ENABLED_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent("moodify-vip-shell-changed", { detail: enabled }));
}

export function getVipButtonStyle(): VipButtonStyle {
  if (typeof window === "undefined") return "gold";
  const val = localStorage.getItem(VIP_BUTTON_STYLE_KEY) as VipButtonStyle;
  return val && VIP_BUTTON_THEMES[val] ? val : "gold";
}

export function setVipButtonStyle(style: VipButtonStyle) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VIP_BUTTON_STYLE_KEY, style);
  window.dispatchEvent(new CustomEvent("moodify-vip-button-style-changed", { detail: style }));
}

export function useGoldThemeSetting() {
  const [goldThemeEnabled, setGoldThemeEnabledState] = useState<boolean>(true);

  useEffect(() => {
    setGoldThemeEnabledState(getIsGoldThemeEnabled());

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (customEvent.detail !== undefined) {
        setGoldThemeEnabledState(customEvent.detail);
      } else {
        setGoldThemeEnabledState(getIsGoldThemeEnabled());
      }
    };

    window.addEventListener("moodify-theme-changed", handleThemeChange);
    return () => {
      window.removeEventListener("moodify-theme-changed", handleThemeChange);
    };
  }, []);

  return {
    goldThemeEnabled,
    setGoldThemeEnabled: (enabled: boolean) => {
      setGoldThemeEnabledState(enabled);
      setIsGoldThemeEnabled(enabled);
    },
  };
}

export function useVipTheme() {
  const [goldThemeEnabled, setGoldThemeEnabledState] = useState<boolean>(true);
  const [vipButtonsEnabled, setVipButtonsEnabledState] = useState<boolean>(true);
  const [vipShellEnabled, setVipShellEnabledState] = useState<boolean>(true);
  const [vipButtonStyle, setVipButtonStyleState] = useState<VipButtonStyle>("gold");

  useEffect(() => {
    setGoldThemeEnabledState(getIsGoldThemeEnabled());
    setVipButtonsEnabledState(getIsVipButtonsEnabled());
    setVipShellEnabledState(getIsVipShellEnabled());
    setVipButtonStyleState(getVipButtonStyle());

    const handleTheme = () => setGoldThemeEnabledState(getIsGoldThemeEnabled());
    const handleButtons = () => setVipButtonsEnabledState(getIsVipButtonsEnabled());
    const handleShell = () => setVipShellEnabledState(getIsVipShellEnabled());
    const handleStyle = () => setVipButtonStyleState(getVipButtonStyle());

    window.addEventListener("moodify-theme-changed", handleTheme);
    window.addEventListener("moodify-vip-buttons-changed", handleButtons);
    window.addEventListener("moodify-vip-shell-changed", handleShell);
    window.addEventListener("moodify-vip-button-style-changed", handleStyle);

    return () => {
      window.removeEventListener("moodify-theme-changed", handleTheme);
      window.removeEventListener("moodify-vip-buttons-changed", handleButtons);
      window.removeEventListener("moodify-vip-shell-changed", handleShell);
      window.removeEventListener("moodify-vip-button-style-changed", handleStyle);
    };
  }, []);

  return {
    goldThemeEnabled,
    setGoldThemeEnabled: (val: boolean) => {
      setGoldThemeEnabledState(val);
      setIsGoldThemeEnabled(val);
    },
    vipButtonsEnabled,
    setVipButtonsEnabled: (val: boolean) => {
      setVipButtonsEnabledState(val);
      setIsVipButtonsEnabled(val);
    },
    vipShellEnabled,
    setVipShellEnabled: (val: boolean) => {
      setVipShellEnabledState(val);
      setIsVipShellEnabled(val);
    },
    vipButtonStyle,
    setVipButtonStyle: (style: VipButtonStyle) => {
      setVipButtonStyleState(style);
      setVipButtonStyle(style);
    },
    currentVipTheme: VIP_BUTTON_THEMES[vipButtonStyle] || VIP_BUTTON_THEMES.gold,
    normalTheme: NORMAL_THEME,
  };
}
