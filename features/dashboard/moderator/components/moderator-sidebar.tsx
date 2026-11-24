"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Music2,
  History,
  User,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ModeratorProfile } from "../types";

export type TabKey = "overview" | "queue" | "history" | "account";

type ModeratorSidebarProps = {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  pendingCount: number;
  profile: ModeratorProfile;
  onLogout: () => void;
};

export function ModeratorSidebar({
  activeTab,
  onSelectTab,
  pendingCount,
  profile,
  onLogout,
}: ModeratorSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      key: "overview" as TabKey,
      label: "Tổng quan",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      key: "queue" as TabKey,
      label: "Hàng chờ duyệt",
      icon: Music2,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      key: "history" as TabKey,
      label: "Lịch sử duyệt",
      icon: History,
      badge: null,
    },
    {
      key: "account" as TabKey,
      label: "Tài khoản",
      icon: User,
      badge: null,
    },
  ];

  const handleTabClick = (key: TabKey) => {
    onSelectTab(key);
    setMobileOpen(false);
  };

  const initials = (profile.fullName || "K")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-5">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff5500] text-white shadow-[0_6px_20px_rgba(255,85,0,0.28)]">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <span className="font-display text-base font-bold tracking-tight text-white">
                Moodify
              </span>
              <p className="text-[11px] font-medium text-white/45">
                Kiểm duyệt bài hát
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Staff Account Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-3.5">
          <div className="flex items-center gap-3">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="h-10 w-10 shrink-0 rounded-xl object-cover border border-white/10"
              />
            ) : (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-xs font-semibold text-white">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {profile.fullName}
              </p>
              <p className="truncate text-[11px] text-white/45">
                {profile.username ? `@${profile.username}` : profile.roleTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-medium text-white/40">
            Danh mục
          </p>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleTabClick(item.key)}
                  className={`group relative flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition active:scale-[0.99] cursor-pointer ${
                    isActive
                      ? "bg-[#ff5500] text-white font-semibold shadow-[0_6px_20px_rgba(255,85,0,0.25)]"
                      : "text-white/65 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 transition ${
                        isActive
                          ? "text-white"
                          : "text-white/45 group-hover:text-white"
                      }`}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== null && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                        isActive
                          ? "bg-black/25 text-white"
                          : "bg-[#ff5500]/15 text-[#ff8b4d]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom section: Language & Actions */}
      <div className="border-t border-white/8 pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="scale-95 origin-left">
            <LanguageSwitcher />
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2 text-[12px] font-medium text-white/60 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
            title="Đăng xuất khỏi hệ thống kiểm duyệt"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Thoát</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top App Bar with Drawer Toggle */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/8 bg-[#090a10]/80 px-4 py-3.5 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10"
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#ff7a2c] text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-white">Moodify</p>
              <p className="text-[11px] text-white/50">Kiểm duyệt bài hát</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-[#090a10] shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Sticky Sidebar (280px) */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-white/8 bg-[#08090d]/70 shadow-[20px_0_40px_rgba(0,0,0,0.25)] backdrop-blur-2xl lg:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
