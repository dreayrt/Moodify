"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  X,
  Sparkles,
  Check,
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Search,
  ChevronDown,
  RefreshCw,
  Crown,
  Lock,
  Palette,
  Play,
  LayoutGrid,
} from "lucide-react";
import {
  MASCOTS,
  useCurrentMascot,
  getMascotUrls,
  type MascotCategory,
  type MascotItem,
} from "@/lib/mascots";
import { type UserProfileResponse } from "@/lib/auth-client";
import { useVipTheme, VIP_BUTTON_THEMES, type VipButtonStyle } from "@/lib/theme";

// Dynamic import of page-mascot with ssr: false
const MascotComponent = dynamic(
  () => import("page-mascot").then((mod) => mod.Mascot),
  {
    ssr: false,
    loading: () => (
      <div className="w-[56px] h-[56px] rounded-full bg-white/5 animate-pulse flex items-center justify-center">
        <span className="text-xl">🐨</span>
      </div>
    ),
  }
);

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileResponse | null;
  isPremium?: boolean;
  onProfileUpdated?: (updated: UserProfileResponse) => void;
}

export default function UserSettingsModal({
  isOpen,
  onClose,
  user,
  isPremium = false,
  onProfileUpdated,
}: UserSettingsModalProps) {
  const { mascotId, mascot, setMascot } = useCurrentMascot();
  const {
    goldThemeEnabled,
    setGoldThemeEnabled,
    vipButtonsEnabled,
    setVipButtonsEnabled,
    vipShellEnabled,
    setVipShellEnabled,
    vipButtonStyle,
    setVipButtonStyle,
    currentVipTheme,
  } = useVipTheme();

  // Collapsible state for 53-mascot roster (collapsed by default!)
  const [showMascotPicker, setShowMascotPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState<MascotCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [vipWarning, setVipWarning] = useState<string | null>(null);

  // User profile form state
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  if (!isOpen) return null;

  // Filter mascots
  const filteredMascots = MASCOTS.filter((m) => {
    const matchesCategory =
      activeCategory === "all" ||
      (activeCategory === "vip" ? Boolean(m.isVip) : m.category === activeCategory);
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectMascot = (item: MascotItem) => {
    if (item.isVip && !isPremium) {
      setVipWarning(
        `Linh vật "${item.name}" chỉ dành riêng cho tài khoản Moodify VIP! Hãy nâng cấp để mở khóa nhé.`
      );
      setTimeout(() => setVipWarning(null), 3500);
      return;
    }
    setMascot(item.id);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (user && onProfileUpdated) {
        const updated = {
          ...user,
          fullName: fullName.trim() || user.fullName,
          phone: phone.trim() || user.phone,
        };
        onProfileUpdated(updated);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const currentUrls = getMascotUrls(mascotId);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/15 bg-slate-950/95 backdrop-blur-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(56,189,248,0.15)] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top glowing rim accent */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Cài Đặt
              </h2>
              <p className="text-xs text-white/50">
                Tùy biến linh vật đồng hành và thông tin tài khoản
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin">
          {/* ══════════════════════════════════════════════════════════════
              SECTION 1: LINH VẬT ĐỒNG HÀNH (GỌN GÀNG, BẤM VÀO MỚI SỔ RA)
             ══════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
                Linh vật đồng hành
              </span>
              <span className="text-[11px] text-white/40">
                53 nhân vật có sẵn
              </span>
            </div>

            {/* Compact Current Mascot Card */}
            <div className={`relative rounded-2xl border p-3.5 backdrop-blur-xl flex items-center justify-between gap-4 shadow-lg group transition-all duration-300 ${
              mascot.isVip
                ? "border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-slate-950 to-amber-950/20 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
                : "border-white/15 bg-gradient-to-r from-white/[0.06] to-white/[0.02]"
            }`}>
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Active mascot preview with real-time cursor tracking */}
                <div
                  className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer shadow-inner transition-all ${
                    mascot.isVip
                      ? "bg-gradient-to-b from-amber-500/25 via-slate-900 to-black border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                      : "bg-black/40 border border-white/15"
                  }`}
                  title="Chạm để chọc thử!"
                >
                  {mascot.isVip && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none filter drop-shadow-[0_2px_4px_rgba(245,158,11,0.9)] animate-pulse">
                      <span className="text-sm">👑</span>
                    </div>
                  )}
                  <MascotComponent
                    key={mascotId}
                    directions={currentUrls.directions}
                    reactions={currentUrls.reactions}
                    size={56}
                    label={mascot.name}
                  />
                </div>

                {/* Mascot details */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-base">{mascot.icon}</span>
                    <span className="text-sm font-bold text-white truncate">
                      {mascot.name}
                    </span>
                    {mascot.isVip && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black shadow-sm flex items-center gap-0.5">
                        <Crown className="w-2.5 h-2.5 text-slate-950" /> VIP
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/25 font-semibold">
                      Đang dùng
                    </span>
                  </div>
                  <p className="text-xs text-white/60 truncate">{mascot.tagline}</p>
                </div>
              </div>

              {/* Toggle Button: "Đổi linh vật" */}
              <button
                type="button"
                onClick={() => setShowMascotPicker(!showMascotPicker)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  showMascotPicker
                    ? "bg-cyan-400 text-black shadow-[0_0_15px_rgba(56,189,248,0.35)]"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${showMascotPicker ? "rotate-180" : ""} transition-transform duration-300`} />
                <span>{showMascotPicker ? "Thu gọn" : "Đổi linh vật"}</span>
                <ChevronDown className={`w-3.5 h-3.5 ${showMascotPicker ? "rotate-180" : ""} transition-transform duration-300`} />
              </button>
            </div>

            {/* Collapsible 53-Mascots Roster (Chỉ sổ ra khi bấm "Đổi linh vật"!) */}
            {showMascotPicker && (
              <div className="p-4 rounded-2xl border border-cyan-500/30 bg-black/60 backdrop-blur-2xl space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-300 shadow-2xl">
                {/* Category tabs & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: "all", label: "Tất cả (53)" },
                      { id: "vip", label: "👑 VIP (8)" },
                      { id: "animals", label: "🐾 Động vật (21)" },
                      { id: "people", label: "👤 Nhân vật (19)" },
                      { id: "objects", label: "🤖 Robot & Đồ vật (13)" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveCategory(tab.id as MascotCategory)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          activeCategory === tab.id
                            ? tab.id === "vip"
                              ? "bg-amber-400 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                              : "bg-cyan-400 text-black shadow-sm"
                            : tab.id === "vip"
                            ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-400/30"
                            : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative w-full sm:w-44">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                    <input
                      type="text"
                      placeholder="Tìm linh vật..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-full pl-8 pr-3 py-1 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* VIP Warning Alert */}
                {vipWarning && (
                  <div className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">{vipWarning}</span>
                    </div>
                    <Link
                      href="/dashboard/premium"
                      onClick={onClose}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-400 hover:brightness-110 text-slate-950 font-bold text-[11px] transition-all"
                    >
                      Nâng cấp VIP
                    </Link>
                  </div>
                )}

                {/* 53-Mascots Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredMascots.map((item) => {
                    const isSelected = item.id === mascotId;
                    const isVipLocked = Boolean(item.isVip) && !isPremium;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectMascot(item)}
                        className={`relative p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-2 group ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(56,189,248,0.25)] ring-1 ring-cyan-400"
                            : item.isVip
                            ? isVipLocked
                              ? "border-amber-400/20 bg-amber-500/[0.04] hover:border-amber-400/40 hover:bg-amber-500/[0.08]"
                              : "border-amber-400/40 bg-amber-500/[0.08] hover:border-amber-400 hover:bg-amber-500/15"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/15 flex items-center justify-center shrink-0">
                          <span className="text-lg group-hover:scale-110 transition-transform">
                            {item.icon}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p
                              className={`text-xs font-bold truncate ${
                                isSelected
                                  ? "text-cyan-200"
                                  : item.isVip
                                  ? "text-amber-200"
                                  : "text-white"
                              }`}
                            >
                              {item.name}
                            </p>
                            {item.isVip && (
                              <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-white/45 truncate">
                            {item.tagline}
                          </p>
                        </div>

                        {isSelected ? (
                          <div className="w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center shrink-0 shadow">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        ) : isVipLocked ? (
                          <div className="w-4 h-4 rounded-full bg-black/60 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0" title="Chỉ dành cho VIP">
                            <Lock className="w-2.5 h-2.5" />
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="h-[1px] bg-white/10" />

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2: GIAO DIỆN & CHỦ ĐỀ (THEME SWITCHER)
             ══════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
                Giao diện & Chủ đề
              </span>
              {isPremium ? (
                <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400" /> Đặc quyền VIP
                </span>
              ) : (
                <span className="text-[11px] text-white/40">Cần gói VIP</span>
              )}
            </div>

            {/* Card 1: Hào quang Hoàng Kim */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/30 via-yellow-500/20 to-amber-700/30 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Palette className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white truncate">
                      Chủ Đề Hoàng Kim (Obsidian Royal Gold)
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      VIP
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                    {isPremium
                      ? goldThemeEnabled
                        ? "Đang bật tông màu vàng kim hoàng gia sang trọng."
                        : "Đang tắt, hiển thị nền Studio Deep Obsidian mặc định."
                      : "Dành riêng cho thành viên VIP. Nâng cấp để mở khóa ánh sáng hào quang hoàng kim."}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              {isPremium ? (
                <button
                  type="button"
                  onClick={() => setGoldThemeEnabled(!goldThemeEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    goldThemeEnabled
                      ? "bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                      : "bg-white/20"
                  }`}
                  title={goldThemeEnabled ? "Tắt chủ đề Hoàng Kim" : "Bật chủ đề Hoàng Kim"}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                      goldThemeEnabled ? "translate-x-5" : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              ) : (
                <Link
                  href="/dashboard/premium"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:brightness-110 shadow-sm shrink-0"
                >
                  Nâng cấp VIP
                </Link>
              )}
            </div>

            {/* Card 2: Đặc Quyền Nút Phát Nhạc VIP */}
            <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/[0.07] via-slate-900/60 to-transparent p-4 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/25 via-yellow-500/20 to-amber-700/25 border border-amber-400/35 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                    <Play className="w-4 h-4 fill-amber-300 text-amber-300 ml-0.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white truncate">
                        Giao Diện Nút Phát Nhạc VIP (VIP Button Controls)
                      </p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-sm flex items-center gap-0.5">
                        <Crown className="w-2.5 h-2.5 text-slate-950" /> VIP
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                      {isPremium
                        ? vipButtonsEnabled
                          ? `Đang áp dụng bộ theme "${currentVipTheme.name}" cho toàn bộ nút phát nhạc & thanh điều khiển.`
                          : "Đang tắt, hiển thị nút màu Tím/Hồng mặc định."
                        : "Đặc quyền độc quyền dành cho VIP: Tùy biến nút Nghe ngay, Play/Pause thành phong cách Hoàng Kim hoặc Neon rực rỡ."}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                {isPremium ? (
                  <button
                    type="button"
                    onClick={() => setVipButtonsEnabled(!vipButtonsEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      vipButtonsEnabled
                        ? "bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                        : "bg-white/20"
                    }`}
                    title={vipButtonsEnabled ? "Tắt nút phát nhạc VIP" : "Bật nút phát nhạc VIP"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                        vipButtonsEnabled ? "translate-x-5" : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                ) : (
                  <Link
                    href="/dashboard/premium"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:brightness-110 shadow-sm shrink-0"
                  >
                    Nâng cấp VIP
                  </Link>
                )}
              </div>

              {/* Theme Palette Chooser (if enabled & isPremium) */}
              {isPremium && vipButtonsEnabled && (
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <span className="text-[11px] font-semibold text-white/70">
                    Chọn phong cách màu nút VIP:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {(Object.keys(VIP_BUTTON_THEMES) as VipButtonStyle[]).map((themeKey) => {
                      const theme = VIP_BUTTON_THEMES[themeKey];
                      const isSelected = vipButtonStyle === themeKey;
                      return (
                        <button
                          key={themeKey}
                          type="button"
                          onClick={() => setVipButtonStyle(themeKey)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col gap-1.5 ${
                            isSelected
                              ? "border-amber-400 bg-amber-500/15 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400"
                              : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                              style={{
                                backgroundColor: theme.accent,
                                boxShadow: `0 0 8px ${theme.accent}`,
                              }}
                            />
                            {isSelected && (
                              <Check className="w-3 h-3 text-amber-300 stroke-[3]" />
                            )}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-white truncate">
                              {theme.name.split(" ")[0]}
                            </p>
                            <p className="text-[9.5px] text-white/50 truncate">
                              {theme.badge}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Live Button Preview Card */}
                  <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-white/60">Bản xem trước nút VIP:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${currentVipTheme.primaryBtnClass}`}
                      >
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                        <span>Nghe ngay</span>
                      </div>
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${currentVipTheme.primaryBtnClass}`}
                      >
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Đồng Bộ Theme Cho Sidebar & Thanh Dưới */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors shadow-md"
                  style={{
                    backgroundColor: `${currentVipTheme.accent}20`,
                    borderColor: `${currentVipTheme.accent}50`,
                  }}
                >
                  <LayoutGrid
                    className="w-5 h-5 transition-colors"
                    style={{ color: currentVipTheme.accent }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white truncate">
                      Đồng Bộ Sidebar & Thanh Phát Nhạc Theo Theme VIP
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      VIP
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                    {isPremium
                      ? vipShellEnabled
                        ? `Đang đồng bộ giao diện Sidebar trái & Thanh phát nhạc dưới theo tone "${currentVipTheme.name}".`
                        : "Đang tắt, Sidebar & Thanh phát nhạc giữ giao diện chuẩn mặc định."
                      : "Dành riêng cho VIP: Tự động đổi màu nền gradient, viền ánh sáng cho Sidebar và Player bar theo theme đã chọn."}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              {isPremium ? (
                <button
                  type="button"
                  onClick={() => setVipShellEnabled(!vipShellEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    vipShellEnabled
                      ? "bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                      : "bg-white/20"
                  }`}
                  title={vipShellEnabled ? "Tắt đồng bộ Sidebar & Thanh phát nhạc" : "Bật đồng bộ Sidebar & Thanh phát nhạc"}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                      vipShellEnabled ? "translate-x-5" : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              ) : (
                <Link
                  href="/dashboard/premium"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:brightness-110 shadow-sm shrink-0"
                >
                  Nâng cấp VIP
                </Link>
              )}
            </div>
          </div>

          <div className="h-[1px] bg-white/10" />

          {/* ══════════════════════════════════════════════════════════════
              SECTION 3: THÔNG TIN TÀI KHOẢN
             ══════════════════════════════════════════════════════════════ */}
          <div className="space-y-3.5">
            <div>
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
                Thông tin tài khoản
              </span>
              <p className="text-xs text-white/50 mt-0.5">
                Cập nhật họ tên hiển thị và thông tin liên hệ của bạn
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">
                    Họ và Tên
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nhập họ và tên..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">
                    Tên Đăng Nhập
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={user?.username || "Chưa đăng nhập"}
                      readOnly
                      disabled
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-white/50 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">
                    Địa Chỉ Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="email"
                      value={user?.email || "Chưa có email"}
                      readOnly
                      disabled
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-white/50 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">
                    Số Điện Thoại
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Số điện thoại..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {savedSuccess && (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-4 h-4" />
                    Đã lưu thông tin thành công!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-lg hover:from-cyan-400 hover:to-blue-500 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Đang lưu..." : "Lưu Thay Đổi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
