"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
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
} from "lucide-react";
import {
  getCurrentUser,
  getValidAccessToken,
  type UserProfileResponse,
} from "@/lib/auth-client";
import { fetchUserPlaylists, type Playlist } from "@/lib/api-client";
import CreatePlaylistModal from "./create-playlist-modal";
import MoodifyMascot from "./moodify-mascot";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4";

export type Vibe = {
  id: string;
  label: string;
  caption: string;
  accent: string;
  ring: string;
  bg: string;
};

export const VIBES: Vibe[] = [
  { id: "all",    label: "TẤT CẢ (147)", caption: "Toàn bộ 147 bài hát Việt Nam đặc sắc trên Moodify.", accent: "#A0B0FF", ring: "rgba(160,176,255,0.45)", bg: "linear-gradient(135deg,#1f1f3f 0%,#0d0d22 100%)" },
  { id: "pop",    label: "V-POP (58)",   caption: "Bản hit V-Pop, ballad ngọt ngào, giai điệu bắt tai.", accent: "#FFD978", ring: "rgba(255,213,120,0.45)", bg: "linear-gradient(135deg,#4a3210 0%,#1f1408 100%)" },
  { id: "hiphop", label: "HIP-HOP (47)", caption: "Underground flow, rap Việt đỉnh cao, beat chất lượng.", accent: "#FF8FBF", ring: "rgba(255,143,191,0.45)", bg: "linear-gradient(135deg,#4a1a30 0%,#1f0a17 100%)" },
  { id: "indie",  label: "INDIE (42)",   caption: "Acoustic mộc mạc, chill nhẹ nhàng, sâu lắng.",        accent: "#A8DBB2", ring: "rgba(168,219,178,0.45)", bg: "linear-gradient(135deg,#1e3a2a 0%,#0c1a13 100%)" },
  { id: "edm",    label: "REMIX/EDM (15)", caption: "Bản phối sôi động, vinahouse, drop bùng nổ.",     accent: "#AFDDFF", ring: "rgba(175,221,255,0.45)", bg: "linear-gradient(135deg,#2c2c52 0%,#16162e 100%)" },
];

const KEYFRAMES = `
@keyframes bflyGlide {
  0%   { transform: translate3d(0,0,0) rotate(-6deg) scale(0.6); opacity: 0; }
  10%  { opacity: 0.7; }
  50%  { transform: translate3d(30px,-44px,0) rotate(8deg) scale(1); }
  90%  { opacity: 0.55; }
  100% { transform: translate3d(0,0,0) rotate(-4deg) scale(0.7); opacity: 0; }
}
@keyframes bflyFlap {
  0%, 100% { transform: scaleX(1); }
  50%      { transform: scaleX(0.55); }
}
`;

function ButterflySwarm({ count = 7, className = "" }: { count?: number; className?: string }) {
  const butterflies = useMemo(() => {
    const seeded = (i: number, salt: number) => {
      const x = Math.sin(i * 9301 + salt * 49297) * 233280;
      return x - Math.floor(x);
    };
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      startX: 42 + seeded(i, 1) * 24,
      startY: 16 + seeded(i, 2) * 56,
      size: 8 + seeded(i, 3) * 6,
      hue: 195 + seeded(i, 4) * 35,
      duration: 9000 + seeded(i, 5) * 5000,
      delay: seeded(i, 6) * 3500,
    }));
  }, [count]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden z-[4] ${className}`}>
      {butterflies.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{
            left: `${b.startX}%`,
            top: `${b.startY}%`,
            animation: `bflyGlide ${b.duration}ms ease-in-out infinite`,
            animationDelay: `${b.delay}ms`,
          }}
        >
          <svg
            width={b.size}
            height={b.size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: `drop-shadow(0 0 3px hsla(${b.hue}, 92%, 78%, 0.35))`,
              transformOrigin: "center",
              animation: "bflyFlap 280ms ease-in-out infinite",
            }}
          >
            <path
              d="M12 12c-1.4-3-4.2-5-6.8-4.7 0 2.9 2.2 5.6 5.1 6.4-2.9 0.8-5.1 3.5-5.1 6.4 2.6 0.3 5.4-1.7 6.8-4.7 1.4 3 4.2 5 6.8 4.7 0-2.9-2.2-5.6-5.1-6.4 2.9-0.8 5.1-3.5 5.1-6.4-2.6-0.3-5.4 1.7-6.8 4.7z"
              fill={`hsla(${b.hue}, 88%, 80%, 0.35)`}
              stroke={`hsla(${b.hue}, 96%, 90%, 0.7)`}
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

function AccountPill({
  user,
  loading,
}: {
  user: UserProfileResponse | null;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    router.push("/");
  };

  const displayName = user?.fullName || user?.username || "Guest";
  const initials = useMemo(() => {
    const source = (user?.fullName || user?.username || "G").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "G";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user]);

  const firstName = useMemo(() => {
    const source = (user?.fullName || user?.username || "friend").trim();
    return source.split(/\s+/)[0] || "friend";
  }, [user]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="anim-slide-right flex items-center gap-[10px] px-[12px] py-[6px] rounded-full border border-white/12 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="w-[26px] h-[26px] rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="w-[26px] h-[26px] rounded-full grid place-items-center text-[11px] font-semibold text-black"
            style={{ background: "linear-gradient(135deg,#AFDDFF,#dbeeff)" }}
          >
            {loading ? "…" : initials}
          </div>
        )}
        <span className="font-manrope text-white text-[12px] tracking-wide">
          {loading ? "Hi, …" : `Hi, ${firstName}`}
        </span>
        <ChevronDown
          className={`w-[12px] h-[12px] text-white/50 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/12 bg-slate-950/95 backdrop-blur-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          {user && (
            <div className="p-3 border-b border-white/10 mb-1">
              <p className="text-xs font-bold text-white truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-white/50 truncate">
                {user.email}
              </p>
            </div>
          )}

          <Link
            href="/dashboard/library"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Disc className="w-4 h-4 text-cyan-400" />
            <span>Thư viện & Playlist</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const refreshPlaylists = async () => {
    try {
      const pl = await fetchUserPlaylists().catch(() => []);
      setUserPlaylists(pl);
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

  // Listen for global playlist changes
  useEffect(() => {
    const handlePlaylistChange = () => {
      refreshPlaylists();
    };
    window.addEventListener("moodify-playlist-updated", handlePlaylistChange);
    return () => {
      window.removeEventListener("moodify-playlist-updated", handlePlaylistChange);
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

  const handleVibeClick = (vibeId: string) => {
    if (pathname === "/dashboard") {
      router.push(`/dashboard?vibe=${vibeId}`);
    } else {
      router.push(`/dashboard?vibe=${vibeId}`);
    }
  };

  const isHome = pathname === "/dashboard";
  const isSearch = pathname === "/dashboard/search";
  const isLibrary = pathname.startsWith("/dashboard/library");

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-black text-white">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Background ambient video + dark overlay */}
      <video
        className="fixed inset-0 w-full h-full object-cover pointer-events-none opacity-40 z-0"
        src={VIDEO_SRC}
        autoPlay
        muted
        loop
        playsInline
      />
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,9,13,0.7) 0%, rgba(8,9,13,0.5) 40%, rgba(8,9,13,0.92) 100%)",
        }}
      />

      {/* Butterflies */}
      <ButterflySwarm count={7} className="hidden lg:block fixed" />

      {/* Main Shell Container */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between gap-4 px-5 md:px-[35px] pt-5 md:pt-[24px]">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="font-graphik text-[20px] md:text-[24px] font-bold leading-[21px] whitespace-nowrap tracking-[-0.02em] bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent hover:opacity-90 transition-opacity"
            >
              Moodify
            </Link>

            {/* Mobile / Tablet nav pills (visible when sidebar is hidden on <lg) */}
            <nav className="flex lg:hidden items-center gap-1.5">
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isHome
                    ? "bg-white/10 text-cyan-300 border border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Trang chủ
              </Link>
              <Link
                href="/dashboard/search"
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isSearch
                    ? "bg-white/10 text-cyan-300 border border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Tìm kiếm
              </Link>
              <Link
                href="/dashboard/library"
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isLibrary
                    ? "bg-white/10 text-cyan-300 border border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Thư viện
              </Link>
            </nav>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <MoodifyMascot size={68} />
            <AccountPill user={user} loading={userLoading} />
          </div>
        </header>

        {/* Unified 2-Column Grid: Left Rail + Main Right Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6 lg:gap-10 mt-6 md:mt-8 px-5 md:px-[35px] pb-[140px]">
          {/* Left Rail (Visible on lg+) */}
          <nav className="hidden lg:flex flex-col gap-5 shrink-0 self-start sticky top-8 z-20">
            {/* Primary Navigation Box */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-2 shadow-2xl space-y-1">
              <Link
                href="/dashboard"
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] transition-all ${
                  isHome
                    ? "bg-white/[0.12] text-white border border-white/10 shadow-[0_0_20px_rgba(175,221,255,0.15)] font-semibold"
                    : "text-white/70 hover:text-white hover:bg-white/5 font-medium"
                }`}
              >
                <Home
                  className={`w-[18px] h-[18px] ${
                    isHome ? "text-cyan-300" : "text-white/70"
                  }`}
                  strokeWidth={isHome ? 2 : 1.7}
                />
                <span>Trang chủ</span>
              </Link>

              <Link
                href="/dashboard/search"
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] transition-all ${
                  isSearch
                    ? "bg-white/[0.12] text-white border border-white/10 shadow-[0_0_20px_rgba(175,221,255,0.15)] font-semibold"
                    : "text-white/70 hover:text-white hover:bg-white/5 font-medium"
                }`}
              >
                <Search
                  className={`w-[18px] h-[18px] ${
                    isSearch ? "text-cyan-300" : "text-white/70"
                  }`}
                  strokeWidth={isSearch ? 2 : 1.7}
                />
                <span>Tìm kiếm</span>
              </Link>

              <Link
                href="/dashboard/library"
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] transition-all ${
                  isLibrary
                    ? "bg-white/[0.12] text-white border border-white/10 shadow-[0_0_20px_rgba(175,221,255,0.15)] font-semibold"
                    : "text-white/70 hover:text-white hover:bg-white/5 font-medium"
                }`}
              >
                <Library
                  className={`w-[18px] h-[18px] ${
                    isLibrary ? "text-cyan-300" : "text-white/70"
                  }`}
                  strokeWidth={isLibrary ? 2 : 1.7}
                />
                <span>Thư viện</span>
              </Link>
            </div>

            {/* Playlists & Moods Box */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-3.5 shadow-2xl space-y-4">
              <div>
                <p className="font-manrope text-[10px] tracking-[0.25em] text-white/40 uppercase font-bold px-1 mb-2">
                  TÂM TRẠNG & THỂ LOẠI
                </p>
                <div className="space-y-1">
                  {VIBES.map((v) => {
                    const isVibeActive = isHome && currentVibe === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleVibeClick(v.id)}
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all hover:bg-white/5 cursor-pointer"
                        style={{
                          background: isVibeActive
                            ? "rgba(255,255,255,0.08)"
                            : "transparent",
                          border: isVibeActive
                            ? "1px solid rgba(255,255,255,0.12)"
                            : "1px solid transparent",
                        }}
                      >
                        <span
                          className="w-[20px] h-[20px] rounded-[6px] shrink-0"
                          style={{
                            background: v.bg,
                            boxShadow: `inset 0 0 0 1px ${v.ring}`,
                          }}
                        />
                        <span
                          className="font-manrope text-[12px] font-medium truncate"
                          style={{
                            color: isVibeActive
                              ? v.accent
                              : "rgba(255,255,255,0.7)",
                          }}
                        >
                          {v.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* User Custom Playlists Section */}
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between px-1 mb-2">
                  <p className="font-manrope text-[10px] tracking-[0.25em] text-white/40 uppercase font-bold">
                    DANH SÁCH PHÁT
                  </p>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="p-1 rounded-md text-white/50 hover:text-cyan-400 hover:bg-white/10 transition-colors"
                    title="Tạo playlist mới"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                  {userPlaylists.length === 0 ? (
                    <div className="px-2 py-2 text-[11px] text-white/40 italic">
                      Chưa có playlist nào
                    </div>
                  ) : (
                    userPlaylists.map((pl) => (
                      <Link
                        key={pl.id}
                        href={`/dashboard/library?playlistId=${pl.id}`}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-white/65 hover:text-white hover:bg-white/5 transition-colors group"
                      >
                        <Music className="w-3.5 h-3.5 shrink-0 text-white/40 group-hover:text-cyan-400 transition-colors" />
                        <span className="font-manrope text-[12px] truncate">
                          {pl.name}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </nav>

          {/* Right Column: Page Content */}
          <div className="min-w-0 flex-1">
            {children}
          </div>
        </div>
      </div>

      {/* Global Create Playlist Modal (accessible from sidebar + button anywhere) */}
      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handlePlaylistCreated}
      />
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
