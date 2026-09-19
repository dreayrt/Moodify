"use client";

import { Home, Search, Library, LogOut, Plus, Music } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  getCurrentUser,
  getValidAccessToken,
  clearAuthSession,
  getStoredAuthSession,
  logout,
  type UserProfileResponse,
} from "@/lib/auth-client";
import { fetchUserPlaylists, type Playlist } from "@/lib/api-client";
import CreatePlaylistModal from "./create-playlist-modal";

const navigation = [
  { name: "Trang chủ", href: "/dashboard", icon: Home },
  { name: "Tìm kiếm", href: "/dashboard/search", icon: Search },
  { name: "Thư viện", href: "/dashboard/library", icon: Library },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (token) {
          const profile = await getCurrentUser(token);
          setUser(profile);

          const userPlaylists = await fetchUserPlaylists().catch(() => []);
          setPlaylists(userPlaylists);
        }
      } catch (error) {
        console.error("Failed to load sidebar data:", error);
      }
    };
    loadData();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const session = getStoredAuthSession();
      if (session?.refreshToken) {
        await logout(session.refreshToken);
      }
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      clearAuthSession();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      router.push("/");
    }
  };

  const handlePlaylistCreated = (newPlaylist: Playlist) => {
    setPlaylists((prev) => [newPlaylist, ...prev]);
    router.push(`/dashboard/library?playlistId=${newPlaylist.id}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="mb-8">
        <Link href="/dashboard" className="inline-block">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Moodify
          </h1>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Playlists Section */}
      <div className="my-6 border-t border-white/5 pt-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 mb-2 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Danh sách phát
          </span>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="p-1 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors"
            title="Tạo playlist mới"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
          {playlists.length === 0 ? (
            <div className="px-3 py-4 text-[11px] text-slate-500 italic">
              Chưa có playlist nào
            </div>
          ) : (
            playlists.map((pl) => (
              <Link
                key={pl.id}
                href={`/dashboard/library?playlistId=${pl.id}`}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors group truncate"
              >
                <Music className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                <span className="truncate">{pl.name}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* User profile & logout */}
      <div className="mt-auto pt-4 border-t border-white/5 shrink-0">
        {user && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-white/5">
            <div className="text-xs font-semibold text-slate-200 truncate">
              {user.fullName || user.username}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              @{user.username}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>

      {/* Quick Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handlePlaylistCreated}
      />
    </div>
  );
}
