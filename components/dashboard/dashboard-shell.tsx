"use client";

import { useEffect, useMemo, useState, useRef, Suspense, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Home,
  Search,
  Library,
  Plus,
  Music,
  LogOut,
  ChevronDown,
  Disc,
  Settings,
  Sparkles,
  Crown,
  Bell,
  Mail,
  Shield,
  Clock,
  HelpCircle,
} from "lucide-react";
import {
  getCurrentUser,
  getValidAccessToken,
  clearAuthSession,
  getStoredAuthSession,
  logout,
  registerCurrentDevice,
  type UserProfileResponse,
} from "@/lib/auth/auth-client";
import {
  fetchUserPlaylists,
  fetchMySubscription,
  fetchMyNotifications,
  markAllNotificationsRead,
  type MoodifyNotification,
  type Playlist,
  type SubscriptionInfo,
} from "@/lib/api-client";
import CreatePlaylistModal from "./create-playlist-modal";
import MoodifyMascot from "./moodify-mascot";
import UserSettingsModal from "./user-settings-modal";
import { useCurrentMascot } from "@/lib/mascots";
import { BrandLogo } from "@/components/shared/logo-mark";
import { useVipTheme, NORMAL_THEME } from "@/lib/theme";
import MoodSearchBar from "./mood-search-bar";
import UserTourGuide, { triggerUserTour } from "./user-tour-guide";

export type Vibe = {
  id: string;
  label: string;
  caption: string;
  accent: string;
  ring: string;
  bg: string;
};

export const VIBES: Vibe[] = [
  { id: "all",    label: "TẤT CẢ",    caption: "Toàn bộ bài hát Việt Nam đặc sắc trên Moodify.", accent: "#818cf8", ring: "rgba(129,140,248,0.45)", bg: "linear-gradient(135deg,#3730a3 0%,#0f172a 100%)" },
  { id: "pop",    label: "V-POP",      caption: "Bản hit V-Pop, ballad ngọt ngào, giai điệu bắt tai.", accent: "#fb7185", ring: "rgba(251,113,133,0.45)", bg: "linear-gradient(135deg,#881337 0%,#1e1b4b 100%)" },
  { id: "hiphop", label: "HIP-HOP",    caption: "Underground flow, rap Việt đỉnh cao, beat chất lượng.", accent: "#fbbf24", ring: "rgba(251,191,36,0.45)", bg: "linear-gradient(135deg,#78350f 0%,#180d2b 100%)" },
  { id: "indie",  label: "INDIE",      caption: "Acoustic mộc mạc, chill nhẹ nhàng, sâu lắng.",        accent: "#c084fc", ring: "rgba(192,132,252,0.45)", bg: "linear-gradient(135deg,#581c87 0%,#180d2b 100%)" },
  { id: "edm",    label: "REMIX/EDM",  caption: "Bản phối sôi động, vinahouse, drop bùng nổ.",     accent: "#38bdf8", ring: "rgba(56,189,248,0.45)", bg: "linear-gradient(135deg,#0369a1 0%,#0f172a 100%)" },
];

const KEYFRAMES = `
@keyframes auraGlowPulse {
  0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.45; }
  50% { transform: scale(1.15) translate(30px, -20px); opacity: 0.75; }
}
@keyframes soundMeshShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes liveEqBar {
  0%, 100% { transform: scaleY(0.25); }
  50% { transform: scaleY(1); }
}
@keyframes rgbBorderFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
@keyframes rgbBackgroundShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
@keyframes rgbAuraGlow {
  0%, 100% {
    box-shadow: 0 0 10px -2px rgba(236, 72, 153, 0.16), 0 12px 30px rgba(0, 0, 0, 0.65);
  }
  25% {
    box-shadow: 0 0 10px -2px rgba(139, 92, 246, 0.16), 0 12px 30px rgba(0, 0, 0, 0.65);
  }
  50% {
    box-shadow: 0 0 10px -2px rgba(6, 182, 212, 0.16), 0 12px 30px rgba(0, 0, 0, 0.65);
  }
  75% {
    box-shadow: 0 0 10px -2px rgba(16, 185, 129, 0.16), 0 12px 30px rgba(0, 0, 0, 0.65);
  }
}
.rgb-sidebar-frame {
  background: linear-gradient(
    135deg,
    #ec4899 0%,
    #8b5cf6 20%,
    #3b82f6 40%,
    #06b6d4 60%,
    #10b981 80%,
    #f59e0b 90%,
    #ec4899 100%
  );
  background-size: 250% 250%;
  animation: rgbBorderFlow 6s ease infinite, rgbAuraGlow 7s ease-in-out infinite;
}
.rgb-sidebar-frame::before {
  content: "";
  position: absolute;
  inset: -1.5px;
  border-radius: inherit;
  background: inherit;
  background-size: inherit;
  animation: inherit;
  filter: blur(5px);
  opacity: 0.15;
  z-index: -1;
  pointer-events: none;
}
.rgb-sidebar-inner {
  background: linear-gradient(
    145deg,
    rgba(236, 72, 153, 0.08) 0%,
    rgba(139, 92, 246, 0.08) 25%,
    rgba(6, 182, 212, 0.08) 50%,
    rgba(16, 185, 129, 0.08) 75%,
    rgba(236, 72, 153, 0.08) 100%
  ), rgba(10, 11, 18, 0.94);
  background-size: 200% 200%;
  animation: rgbBackgroundShift 8s ease infinite;
}
.rgb-active-item {
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.18) 0%, rgba(6, 182, 212, 0.12) 60%, transparent 100%);
  border-left: 2px solid #38bdf8;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.08);
}
@keyframes goldBorderFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
@keyframes goldAuraGlow {
  0%, 100% {
    box-shadow: 0 0 10px -2px rgba(223, 186, 99, 0.18), 0 12px 30px rgba(0, 0, 0, 0.65);
  }
  50% {
    box-shadow: 0 0 12px -1px rgba(245, 158, 11, 0.22), 0 12px 30px rgba(0, 0, 0, 0.65);
  }
}
.pre-sidebar-frame-gold {
  background: linear-gradient(
    135deg,
    #caa048 0%,
    #f59e0b 20%,
    #edd087 40%,
    #fff0ba 55%,
    #fbbf24 70%,
    #dfba63 85%,
    #caa048 100%
  );
  background-size: 250% 250%;
  animation: goldBorderFlow 6s ease infinite, goldAuraGlow 7s ease-in-out infinite;
}
.pre-sidebar-frame-gold::before {
  content: "";
  position: absolute;
  inset: -1.5px;
  border-radius: inherit;
  background: inherit;
  background-size: inherit;
  animation: inherit;
  filter: blur(5px);
  opacity: 0.16;
  z-index: -1;
  pointer-events: none;
}
.pre-sidebar-frame-amber {
  background: linear-gradient(
    135deg,
    #d97706 0%,
    #f59e0b 25%,
    #fef3c7 50%,
    #fbbf24 75%,
    #d97706 100%
  );
  background-size: 250% 250%;
  animation: goldBorderFlow 6s ease infinite, goldAuraGlow 7s ease-in-out infinite;
}
.pre-sidebar-frame-amber::before {
  content: "";
  position: absolute;
  inset: -1.5px;
  border-radius: inherit;
  background: inherit;
  background-size: inherit;
  animation: inherit;
  filter: blur(5px);
  opacity: 0.16;
  z-index: -1;
  pointer-events: none;
}
.pre-sidebar-frame-cyan {
  background: linear-gradient(
    135deg,
    #0284c7 0%,
    #06b6d4 25%,
    #e0f2fe 50%,
    #38bdf8 75%,
    #0284c7 100%
  );
  background-size: 250% 250%;
  animation: goldBorderFlow 6s ease infinite;
}
.pre-sidebar-frame-cyan::before {
  content: "";
  position: absolute;
  inset: -1.5px;
  border-radius: inherit;
  background: inherit;
  background-size: inherit;
  animation: inherit;
  filter: blur(5px);
  opacity: 0.15;
  z-index: -1;
  pointer-events: none;
}
.pre-sidebar-frame-emerald {
  background: linear-gradient(
    135deg,
    #059669 0%,
    #10b981 25%,
    #d1fae5 50%,
    #34d399 75%,
    #059669 100%
  );
  background-size: 250% 250%;
  animation: goldBorderFlow 6s ease infinite;
}
.pre-sidebar-frame-emerald::before {
  content: "";
  position: absolute;
  inset: -1.5px;
  border-radius: inherit;
  background: inherit;
  background-size: inherit;
  animation: inherit;
  filter: blur(5px);
  opacity: 0.15;
  z-index: -1;
  pointer-events: none;
}
.pre-sidebar-frame-ruby {
  background: linear-gradient(
    135deg,
    #e11d48 0%,
    #f43f5e 25%,
    #ffe4e6 50%,
    #fb7185 75%,
    #e11d48 100%
  );
  background-size: 250% 250%;
  animation: goldBorderFlow 6s ease infinite;
}
.pre-sidebar-frame-ruby::before {
  content: "";
  position: absolute;
  inset: -1.5px;
  border-radius: inherit;
  background: inherit;
  background-size: inherit;
  animation: inherit;
  filter: blur(5px);
  opacity: 0.15;
  z-index: -1;
  pointer-events: none;
}
.sidebar-scroll::-webkit-scrollbar {
  width: 4px;
}
.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 9999px;
}
.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
aside::-webkit-scrollbar:horizontal,
.moodify-scroll::-webkit-scrollbar:horizontal {
  display: none !important;
  height: 0 !important;
  width: 0 !important;
}
`;

function AudioAuraBackdrop({ isPremium = false }: { isPremium?: boolean }) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 transition-colors duration-1000 ${
        isPremium ? "bg-[#040406]" : "bg-[#06070a]"
      }`}
    >
      {/* Studio Deep Obsidian Gradient Base */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: isPremium
            ? "radial-gradient(ellipse 85% 55% at 50% -20%, rgba(245,158,11,0.22), transparent 70%), radial-gradient(ellipse 65% 45% at 10% 80%, rgba(217,119,6,0.16), transparent 60%), radial-gradient(ellipse 55% 55% at 90% 60%, rgba(251,191,36,0.14), transparent 60%), #040406"
            : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.18), transparent 70%), radial-gradient(ellipse 60% 40% at 10% 80%, rgba(168,85,247,0.12), transparent 60%), radial-gradient(ellipse 50% 50% at 90% 60%, rgba(244,63,94,0.10), transparent 60%), #06070a",
        }}
      />

      {/* Floating Audio Aura Orbs */}
      <div
        className="absolute -top-[15%] left-[15%] w-[650px] h-[650px] rounded-full blur-[140px] pointer-events-none opacity-40 mix-blend-screen transition-all duration-1000"
        style={{
          background: isPremium
            ? "radial-gradient(circle, #f59e0b 0%, #d97706 45%, transparent 70%)"
            : "radial-gradient(circle, #6366f1 0%, #a855f7 45%, transparent 70%)",
          animation: "auraGlowPulse 16s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-[35%] -right-[10%] w-[580px] h-[580px] rounded-full blur-[150px] pointer-events-none opacity-30 mix-blend-screen transition-all duration-1000"
        style={{
          background: isPremium
            ? "radial-gradient(circle, #fbbf24 0%, #b45309 50%, transparent 70%)"
            : "radial-gradient(circle, #ec4899 0%, #3b82f6 50%, transparent 70%)",
          animation: "auraGlowPulse 20s ease-in-out 3s infinite reverse",
        }}
      />
      <div
        className="absolute -bottom-[10%] left-[30%] w-[500px] h-[500px] rounded-full blur-[130px] pointer-events-none opacity-25 mix-blend-screen transition-all duration-1000"
        style={{
          background: isPremium
            ? "radial-gradient(circle, #f43f5e 0%, #ea580c 50%, transparent 70%)"
            : "radial-gradient(circle, #8b5cf6 0%, #06b6d4 50%, transparent 70%)",
          animation: "auraGlowPulse 18s ease-in-out 6s infinite",
        }}
      />

      {/* Modern Studio Acoustic Grid Texture (Subtle sound-studio feel) */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isPremium
            ? "radial-gradient(circle at center, transparent 40%, rgba(4,4,6,0.88) 100%)"
            : "radial-gradient(circle at center, transparent 40%, rgba(6,7,10,0.85) 100%)",
        }}
      />
    </div>
  );
}

function MascotAccountTrigger({
  user,
  loading,
  subInfo,
  onOpenSettings,
}: {
  user: UserProfileResponse | null;
  loading: boolean;
  subInfo: SubscriptionInfo | null;
  onOpenSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const { mascot } = useCurrentMascot();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const session = getStoredAuthSession();
      if (session?.refreshToken) {
        await logout(session.refreshToken);
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      clearAuthSession();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      router.push("/");
    }
  };

  const displayName = user?.fullName || user?.username || "Người dùng Moodify";

  return (
    <div className="relative" ref={menuRef}>
      {/* Interactive Mascot as the sole Account Trigger */}
      <MoodifyMascot
        size={54}
        isVip={Boolean(subInfo?.isPremium) || Boolean(mascot.isVip)}
        onClick={() => setOpen(!open)}
        className="cursor-pointer hover:scale-105 transition-transform"
      />

      {/* Account Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* User profile & mascot card */}
          <div className="p-3 border-b border-white/10 mb-1 rounded-xl bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl shrink-0">{mascot.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {loading ? "Đang tải..." : displayName}
                </p>
                <p className="text-[11px] text-white/50 truncate">
                  {user?.email || "Chưa có email"}
                </p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10.5px]">
              <span className="text-white/40">Linh vật:</span>
              <span className="font-semibold text-cyan-300">{mascot.name}</span>
            </div>
            {subInfo?.isPremium && (
              <div className="mt-1.5 pt-1.5 border-t border-amber-400/20 flex items-center justify-between text-[10.5px]">
                <span className="text-amber-300/80 flex items-center gap-1 font-semibold">
                  <Crown className="w-3 h-3 text-amber-400" /> VIP
                </span>
                <span className="font-bold text-amber-300 truncate max-w-[130px]">{subInfo.packageName}</span>
              </div>
            )}
          </div>

          {/* Option: Settings */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer group"
          >
            <Settings className="w-4 h-4 text-purple-400 group-hover:rotate-45 transition-transform duration-300" />
            <span>Cài đặt</span>
          </button>

          {/* Option: Tour Guide */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              triggerUserTour();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer group"
          >
            <HelpCircle className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform duration-200" />
            <span>Hướng dẫn sử dụng</span>
          </button>

          {/* Library & Playlists */}
          <Link
            href="/dashboard/library"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors group"
          >
            <Disc className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span>Thư viện & Playlist</span>
          </Link>

          {/* VIP Premium Center */}
          <Link
            href="/dashboard/premium"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors group"
          >
            <Crown className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span>{subInfo?.isPremium ? "Quản lý gói VIP" : "Gói Moodify VIP"}</span>
          </Link>

          {/* Admin Console Quick Link */}
          {user?.role === "ADMIN" && (
            <Link
              href="/dashboard/admin"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Bảng Quản Trị Hệ Thống</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/25 text-amber-200">
                ADMIN
              </span>
            </Link>
          )}

          {/* Content Lead Studio Quick Link */}
          {(user?.role === "CONTENT_LEAD" || user?.role === "ARTIST") && (
            <Link
              href="/dashboard/content-lead"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Music className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Content Lead Studio</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/25 text-emerald-200">
                STUDIO
              </span>
            </Link>
          )}

          {/* Moderator Console Quick Link */}
          {user?.role === "MODERATOR" && (
            <Link
              href="/dashboard/moderator"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <span>Kênh Kiểm Duyệt</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-400/25 text-sky-200">
                MOD
              </span>
            </Link>
          )}

          {/* Logout */}
          <div className="pt-1 border-t border-white/10 mt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/90 hover:text-red-300 hover:bg-red-500/15 transition-colors cursor-pointer group"
            >
              <LogOut className="w-4 h-4 text-purple-400 group-hover:text-red-400 transition-colors" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderNotifications({ isPremium = false }: { isPremium?: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MoodifyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchMyNotifications();
    setItems(data.items);
    setUnreadCount(data.unreadCount);
    setIsLoading(false);
  }, []);

  // Tải thông báo khi mount + lắng nghe sự kiện cập nhật (admin gửi mới, đổi gói...)
  useEffect(() => {
    void loadNotifications();
    const onUpdated = () => void loadNotifications();
    window.addEventListener("moodify-notifications-updated", onUpdated);
    return () => window.removeEventListener("moodify-notifications-updated", onUpdated);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenBell = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      // Đánh dấu đã đọc toàn bộ khi mở chuông
      setUnreadCount(0);
      void markAllNotificationsRead().then(() => {
        window.dispatchEvent(new Event("moodify-notifications-updated"));
      });
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    return d.toLocaleDateString("vi-VN");
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "PROMO": return "Khuyến mãi";
      case "BILLING": return "Thanh toán";
      case "MODERATION": return "Kiểm duyệt";
      case "ANNOUNCEMENT": return "Thông báo";
      default: return "Hệ thống";
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpenBell}
        className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] transition-all relative cursor-pointer active:scale-95"
        title="Thông báo"
        aria-label="Thông báo"
      >
        <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <>
            <span
              className={`absolute top-2 right-2 w-2 h-2 rounded-full transition-all duration-300 animate-pulse ${
                isPremium
                  ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.95)]"
                  : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]"
              }`}
            />
            {unreadCount > 1 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#ff5500] text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <Bell className={`w-3.5 h-3.5 ${isPremium ? "text-amber-400" : "text-emerald-400"}`} /> Thông báo
            </span>
            <span className="text-[10px] text-white/40">
              {isLoading ? "Đang tải..." : unreadCount > 0 ? `${unreadCount} thông báo mới` : "Không có thông báo mới"}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="w-6 h-6 mx-auto text-white/20 mb-2" />
              <p className="text-[11px] text-white/40">Chưa có thông báo nào.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto moodify-scroll pr-1">
              {items.map((n) => {
                const content = (
                  <div
                    className={`p-2.5 rounded-xl transition-colors cursor-pointer group ${
                      n.readAt ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-purple-500/[0.08] hover:bg-purple-500/[0.14]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-semibold text-white group-hover:text-purple-300 transition-colors truncate ${n.readAt ? "" : ""}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] font-mono text-white/40 shrink-0">{formatTime(n.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-white/60 mt-1 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <span className="inline-block mt-1.5 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40">
                      {typeLabel(n.type)}
                    </span>
                  </div>
                );
                return n.linkUrl ? (
                  <Link key={n.id} href={n.linkUrl} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HeaderMessages({ isPremium = false }: { isPremium?: boolean }) {
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const messages = [
    {
      id: 1,
      sender: "Ban Quản Trị Moodify",
      desc: "Cảm ơn bạn đã trải nghiệm Moodify. Chúc bạn có những phút giây thư giãn tuyệt vời!",
      time: "Hôm nay",
    },
    {
      id: 2,
      sender: "Hệ thống hỗ trợ",
      desc: "Trang cá nhân và linh vật đã được kích hoạt. Hãy ghé Cài đặt để tùy biến linh vật của bạn.",
      time: "Hôm qua",
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) setHasUnread(false);
        }}
        className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] transition-all relative cursor-pointer active:scale-95"
        title="Hộp thư & Tin nhắn"
        aria-label="Hộp thư"
      >
        <Mail className="w-[18px] h-[18px]" strokeWidth={1.8} />
        {hasUnread && (
          <span
            className={`absolute top-2 right-2 w-2 h-2 rounded-full transition-all duration-300 animate-pulse ${
              isPremium
                ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.95)]"
                : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]"
            }`}
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" /> Hộp thư Moodify
            </span>
            <span className="text-[10px] text-white/40">Hộp thư đến</span>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto moodify-scroll pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {m.sender}
                  </p>
                  <span className="text-[10px] font-mono text-white/40 shrink-0">{m.time}</span>
                </div>
                <p className="text-[11px] text-white/60 mt-1 leading-relaxed line-clamp-2">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentVibe = searchParams.get("vibe") || "all";
  const activeVibeObj = VIBES.find((v) => v.id === currentVibe) ?? VIBES[0];

  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenresOpen, setIsGenresOpen] = useState(true);

  const refreshPlaylists = async () => {
    try {
      const pl = await fetchUserPlaylists().catch(() => []);
      setUserPlaylists(pl);
    } catch (_) {}
  };

  const refreshSubscription = async () => {
    try {
      const sub = await fetchMySubscription().catch(() => null);
      setSubInfo(sub);
    } catch (_) {}
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getValidAccessToken();
        if (token) {
          const profile = await getCurrentUser(token);
          if (!cancelled) {
            setUser(profile);
            setUserLoading(false);
          }
          const pl = await fetchUserPlaylists().catch(() => []);
          if (!cancelled) {
            setUserPlaylists(pl);
          }
          const sub = await fetchMySubscription().catch(() => null);
          if (!cancelled) {
            setSubInfo(sub);
          }
          // Tự động đồng bộ và liên kết thiết bị hiện tại vào hệ thống quản lý thiết bị
          void registerCurrentDevice();
        } else {
          if (!cancelled) setUserLoading(false);
        }
      } catch {
        if (!cancelled) setUserLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Listen for global playlist changes and subscription changes
  useEffect(() => {
    const handlePlaylistChange = () => {
      refreshPlaylists();
    };
    const handleSubChange = () => {
      refreshSubscription();
    };

    window.addEventListener("moodify-playlist-updated", handlePlaylistChange);
    window.addEventListener("moodify-subscription-updated", handleSubChange);

    return () => {
      window.removeEventListener("moodify-playlist-updated", handlePlaylistChange);
      window.removeEventListener("moodify-subscription-updated", handleSubChange);
    };
  }, []);

  const handlePlaylistCreated = (newPlaylist: Playlist) => {
    setUserPlaylists((prev) => [newPlaylist, ...prev]);
    window.dispatchEvent(
      new CustomEvent("moodify-playlist-updated", {
        detail: { playlistId: newPlaylist.id },
      })
    );
    router.push(`/dashboard/library?playlistId=${newPlaylist.id}`);
  };

  const [activeVibeId, setActiveVibeId] = useState<string>(() => searchParams?.get("vibe") || "all");

  useEffect(() => {
    const param = searchParams?.get("vibe");
    if (param) {
      setActiveVibeId(param);
    } else if (param === null && (pathname === "/dashboard" || pathname === "/dashboard/user")) {
      setActiveVibeId("all");
    }
  }, [searchParams, pathname]);

  useEffect(() => {
    const handleVibeEvent = (e: Event) => {
      const ce = e as CustomEvent<{ vibeId: string }>;
      if (ce.detail?.vibeId) {
        setActiveVibeId(ce.detail.vibeId);
      }
    };
    window.addEventListener("moodify-vibe-changed", handleVibeEvent);
    return () => window.removeEventListener("moodify-vibe-changed", handleVibeEvent);
  }, []);

  const handleVibeClick = (vibeId: string) => {
    setActiveVibeId(vibeId);
    const target = pathname.startsWith("/dashboard/user") ? "/dashboard/user" : "/dashboard";
    router.push(`${target}?vibe=${vibeId}`);
    window.dispatchEvent(new CustomEvent("moodify-vibe-changed", { detail: { vibeId } }));
  };

  const isHome = pathname === "/dashboard" || pathname === "/dashboard/user";
  const isSearch = pathname === "/dashboard/search" || pathname.startsWith("/dashboard/search");
  const isLibrary = pathname.startsWith("/dashboard/library");
  const isHistory = pathname.startsWith("/dashboard/history");

  const { goldThemeEnabled, vipShellEnabled, currentVipTheme, normalTheme } = useVipTheme();
  const isVipShellActive = Boolean(subInfo?.isPremium) && vipShellEnabled;
  const currentShellTheme = isVipShellActive ? currentVipTheme : normalTheme;
  const isGoldActive = Boolean(subInfo?.isPremium) && goldThemeEnabled;
  const isPre = Boolean(subInfo?.isPremium);

  // Tone-matched dynamic LED frame for sidebar:
  // For Pre: Flowing Royal Gold / Champagne or chosen VIP theme
  // For Normal: Clean solid glass border (gradient disabled)
  let sidebarFrameClass = "";
  if (isPre) {
    if (isVipShellActive && currentVipTheme?.id === "amber") {
      sidebarFrameClass = "pre-sidebar-frame-amber";
    } else if (isVipShellActive && currentVipTheme?.id === "cyan") {
      sidebarFrameClass = "pre-sidebar-frame-cyan";
    } else if (isVipShellActive && currentVipTheme?.id === "emerald") {
      sidebarFrameClass = "pre-sidebar-frame-emerald";
    } else if (isVipShellActive && currentVipTheme?.id === "ruby") {
      sidebarFrameClass = "pre-sidebar-frame-ruby";
    } else {
      sidebarFrameClass = "pre-sidebar-frame-gold";
    }
  } else {
    sidebarFrameClass = "border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]";
  }

  const sidebarBgClass = isVipShellActive
    ? currentShellTheme.sidebarBg
    : isPre
    ? "bg-gradient-to-b from-[#120e06]/98 via-[#0c0903]/96 to-[#050402]/98"
    : "bg-[#0b0c14]/90";

  const navActiveItemClass = isVipShellActive
    ? currentShellTheme.sidebarActiveItem
    : isPre
    ? "bg-amber-400/[0.14] text-[#fff3d4] font-semibold shadow-[inset_0_1px_0_rgba(251,191,36,0.15)]"
    : "bg-white/10 text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

  const navActiveDotClass = isVipShellActive
    ? currentShellTheme.sidebarActiveDot
    : isPre
    ? "bg-[#edd087] shadow-[0_0_8px_#edd087]"
    : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]";

  const navIconClass = isVipShellActive
    ? currentShellTheme.sidebarIconColor
    : isPre
    ? "text-[#edd087]"
    : "text-white/70 group-hover:text-white";

  return (
    <div className="relative w-full min-h-screen overflow-x-clip bg-black text-white">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Ambient Audio Aura Backdrop (Switches to Obsidian Royal Gold if Premium & Theme Enabled) */}
      <AudioAuraBackdrop isPremium={isGoldActive} />

      {/* Main Shell Container */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {/* Top Header Bar - Fixed/Sticky SoundCloud Style */}
        <header className={`sticky top-0 z-40 w-full flex items-center justify-between gap-4 px-5 md:px-[35px] py-2.5 md:py-3 backdrop-blur-3xl transition-colors duration-300 shadow-xl shadow-black/40 ${currentShellTheme.playerBg} ${currentShellTheme.playerBorder.replace(/border-t/g, 'border-b').replace(/0_-/g, '0_')}`}>
          <div className="flex items-center gap-5 md:gap-7 shrink-0 min-w-0 md:min-w-[200px]">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group py-1 shrink-0"
            >
              <BrandLogo variant="horizontal-dark" className="h-8 md:h-9 w-auto transition-transform group-hover:scale-105" />
            </Link>

            {/* Mobile / Tablet nav pills (visible when sidebar is hidden on <lg) */}
            <nav className="flex lg:hidden items-center gap-1.5">
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isHome
                    ? "bg-purple-500/20 text-purple-200 border border-purple-400/40 shadow-[0_0_16px_rgba(168,85,247,0.25)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Trang chủ
              </Link>
              <Link
                href="/dashboard/search"
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isSearch
                    ? "bg-purple-500/20 text-purple-200 border border-purple-400/40 shadow-[0_0_16px_rgba(168,85,247,0.25)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Tìm kiếm
              </Link>
              <Link
                href="/dashboard/library"
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isLibrary
                    ? "bg-purple-500/20 text-purple-200 border border-purple-400/40 shadow-[0_0_16px_rgba(168,85,247,0.25)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Thư viện
              </Link>
              <Link
                href="/dashboard/history"
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isHistory
                    ? "bg-purple-500/20 text-purple-200 border border-purple-400/40 shadow-[0_0_16px_rgba(168,85,247,0.25)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Lịch sử
              </Link>
            </nav>
          </div>

          {/* Quick Search Bar with Mood Finder (Centered) - Hidden on Search Page */}
          {!isSearch ? (
            <div id="tour-search-bar" className="hidden md:flex items-center justify-center flex-1 max-w-xl mx-auto px-4">
              <MoodSearchBar isPremium={Boolean(subInfo?.isPremium)} />
            </div>
          ) : (
            <div className="hidden md:flex flex-1" />
          )}

          <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0 min-w-0 md:min-w-[200px]">
            <button
              type="button"
              onClick={() => triggerUserTour()}
              className="p-2 rounded-xl text-white/60 hover:text-purple-300 hover:bg-white/5 transition-all cursor-pointer relative group"
              title="Xem hướng dẫn sử dụng"
            >
              <HelpCircle className="w-[18px] h-[18px] transition-transform group-hover:scale-110" />
            </button>

            <HeaderNotifications isPremium={Boolean(subInfo?.isPremium)} />
            <HeaderMessages isPremium={Boolean(subInfo?.isPremium)} />

            <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" />

            <div id="tour-mascot-profile">
              <MascotAccountTrigger
                user={user}
                loading={userLoading}
                subInfo={subInfo}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </div>
          </div>
        </header>

        {/* Unified 2-Column Grid: Left Rail + Main Right Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6 lg:gap-10 mt-5 md:mt-6 px-5 md:px-[35px] pb-[140px]">
          {/* Left Rail (Visible on lg+) - Fixed & Vertically Centered with Dynamic LED Chroma Aura */}
          <div className="hidden lg:block w-[240px] shrink-0">
            <div className={`!fixed left-1.5 sm:left-2 md:left-2.5 top-[calc(50vh-8px)] -translate-y-1/2 z-30 w-[240px] max-h-[calc(100vh-170px)] flex flex-col ${isPre ? "p-[1.2px]" : "p-0"} rounded-[20px] ${sidebarFrameClass}`}>
              <aside className={`flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden moodify-scroll w-full ${isPre ? "rounded-[18.8px]" : "rounded-[20px]"} backdrop-blur-2xl p-2.5 space-y-3 relative transition-colors duration-300 ${sidebarBgClass}`}>

            {/* Primary Navigation: Trang chủ -> Tìm kiếm -> Thư viện -> Lịch sử -> Thể loại */}
            <div id="tour-sidebar-nav" className="space-y-1">
              {/* 1. Trang chủ */}
              <Link
                href="/dashboard"
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
                  isHome
                    ? navActiveItemClass
                    : "text-white/70 hover:text-white hover:bg-white/[0.05] hover:translate-x-0.5 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Home
                    className={`w-[18px] h-[18px] transition-transform group-hover:scale-110 ${navIconClass}`}
                    strokeWidth={isHome ? 2.2 : 1.7}
                  />
                  <span>Trang chủ</span>
                </div>
              </Link>

              {/* 2. Tìm kiếm */}
              <Link
                href="/dashboard/search"
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
                  isSearch
                    ? navActiveItemClass
                    : "text-white/70 hover:text-white hover:bg-white/[0.05] hover:translate-x-0.5 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Search
                    className={`w-[18px] h-[18px] transition-transform group-hover:scale-110 ${navIconClass}`}
                    strokeWidth={isSearch ? 2.2 : 1.7}
                  />
                  <span>Tìm kiếm</span>
                </div>
              </Link>

              {/* 3. Thư viện */}
              <Link
                href="/dashboard/library"
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
                  isLibrary
                    ? navActiveItemClass
                    : "text-white/70 hover:text-white hover:bg-white/[0.05] hover:translate-x-0.5 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Library
                    className={`w-[18px] h-[18px] transition-transform group-hover:scale-110 ${navIconClass}`}
                    strokeWidth={isLibrary ? 2.2 : 1.7}
                  />
                  <span>Thư viện</span>
                </div>
              </Link>

              {/* 3.1. Lịch sử nghe & Truy vết */}
              <Link
                href="/dashboard/history"
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
                  isHistory
                    ? navActiveItemClass
                    : "text-white/70 hover:text-white hover:bg-white/[0.05] hover:translate-x-0.5 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock
                    className={`w-[18px] h-[18px] transition-transform group-hover:scale-110 ${navIconClass}`}
                    strokeWidth={isHistory ? 2.2 : 1.7}
                  />
                  <span>Lịch sử nghe</span>
                </div>
              </Link>

              {/* 4. Thể loại (Dropdown) */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsGenresOpen(!isGenresOpen)}
                  className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 cursor-pointer ${
                    isGenresOpen
                      ? "text-white bg-white/[0.04]"
                      : "text-white/70 hover:text-white hover:bg-white/[0.05] hover:translate-x-0.5"
                  } font-medium`}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className={`w-[18px] h-[18px] group-hover:scale-110 transition-transform ${navIconClass}`} />
                    <span>Thể loại</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${navIconClass} ${isGenresOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Genres List */}
                {isGenresOpen && (
                  <div className="mt-1 ml-3 pl-2.5 border-l border-white/10 space-y-0.5 transition-all">
                    {VIBES.map((v) => {
                      const isVibeActive = isHome && activeVibeId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleVibeClick(v.id)}
                          className={`w-full flex items-center px-3 py-1.5 rounded-lg text-left text-[12px] transition-all duration-150 cursor-pointer ${
                            isVibeActive
                              ? isPre
                                ? "bg-amber-400/[0.12] text-[#fff3d4] font-semibold"
                                : "bg-white/[0.08] text-white font-semibold"
                              : "text-white/60 hover:text-white hover:bg-white/[0.04] font-medium"
                          }`}
                        >
                          <span className="truncate">{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Management Consoles (for ADMIN / CONTENT_LEAD / MODERATOR) */}
            {user?.role === "ADMIN" && (
              <div className="pt-2 border-t border-white/[0.08]">
                <Link
                  href="/dashboard/admin"
                  className="w-full group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/35 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Quản Trị Admin</span>
                  </div>
                  <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200">
                    CONSOLE
                  </span>
                </Link>
              </div>
            )}

            {(user?.role === "CONTENT_LEAD" || user?.role === "ARTIST") && (
              <div className="pt-2 border-t border-white/[0.08]">
                <Link
                  href="/dashboard/content-lead"
                  className="w-full group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/35 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Music className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>Content Lead Studio</span>
                  </div>
                  <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-200">
                    STUDIO
                  </span>
                </Link>
              </div>
            )}

            {user?.role === "MODERATOR" && (
              <div className="pt-2 border-t border-white/[0.08]">
                <Link
                  href="/dashboard/moderator"
                  className="w-full group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-sky-300 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 hover:border-sky-500/35 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                    <span>Kênh Kiểm Duyệt</span>
                  </div>
                  <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-400/20 text-sky-200">
                    MOD
                  </span>
                </Link>
              </div>
            )}

            {/* Danh sách phát (Playlists) Section */}
            <div id="tour-playlist-section" className="pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between px-1 mb-2">
                <p className="text-[10px] tracking-[0.08em] text-white/45 uppercase font-bold">
                  DANH SÁCH PHÁT
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                  title="Tạo playlist mới"
                >
                  <Plus className={`w-3 h-3 ${navIconClass}`} />
                  <span>Mới</span>
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto sidebar-scroll space-y-0.5 pr-1">
                {userPlaylists.length === 0 ? (
                  <div className="px-2 py-2 text-[11px] text-white/40 italic">
                    Chưa có playlist nào
                  </div>
                ) : (
                  userPlaylists.map((pl) => (
                    <Link
                      key={pl.id}
                      href={`/dashboard/library?playlistId=${pl.id}`}
                      className="w-full group flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-white/65 hover:text-white hover:bg-white/[0.05] transition-all"
                    >
                      <div className="w-5 h-5 rounded-md bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                        <Music className={`w-3 h-3 ${navIconClass} transition-colors`} />
                      </div>
                      <span className="text-[12px] truncate group-hover:translate-x-0.5 transition-transform">
                        {pl.name}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </aside>
          </div>
          </div>

          {/* Right Column: Page Content */}
          <div className="min-w-0 flex-1">
            {children}
          </div>
        </div>
      </div>

      {/* Global Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handlePlaylistCreated}
      />

      {/* User Settings & Mascot Switcher Modal */}
      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        isPremium={Boolean(subInfo?.isPremium)}
        onProfileUpdated={(updated) => setUser(updated)}
      />

      {/* Onboarding Tutorial Tour for Role = USER */}
      <UserTourGuide user={user} userLoading={userLoading} />
    </div>
  );
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white/60">
          Loading...
        </div>
      }
    >
      <ShellContent>{children}</ShellContent>
    </Suspense>
  );
}
