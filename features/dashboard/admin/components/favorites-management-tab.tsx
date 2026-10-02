"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Heart,
  Search,
  RotateCcw,
  Play,
  Pause,
  Trash2,
  Music,
  Users,
  Disc,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Flame,
} from "lucide-react";
import {
  CatalogTrack,
  FavoriteLeaderboardItem,
  FavoriteRecord,
} from "../types";
import {
  fetchAdminFavorites,
  fetchAdminFavoritesLeaderboard,
  deleteAdminFavorite,
} from "@/lib/api/admin-client";

type FavoritesManagementTabProps = {
  previewTrack: CatalogTrack | null;
  isPlayingPreview: boolean;
  onTogglePreview: (track: CatalogTrack) => void;
  onToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
};

export function FavoritesManagementTab({
  previewTrack,
  isPlayingPreview,
  onTogglePreview,
  onToast,
}: FavoritesManagementTabProps) {
  // State
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<FavoriteLeaderboardItem[]>([]);
  const [activeType, setActiveType] = useState<"SONG" | "ARTIST" | "ALBUM">("SONG");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 12;

  // Confirm delete modal
  const [deletingFavorite, setDeletingFavorite] = useState<FavoriteRecord | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(0);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Leaderboard
  useEffect(() => {
    fetchAdminFavoritesLeaderboard()
      .then(setLeaderboard)
      .catch((err) => {
        console.error("Fetch leaderboard error:", err);
      });
  }, []);

  // Load Favorites Data
  const loadFavoritesData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminFavorites({
        type: activeType,
        query: debouncedQuery,
        page: currentPage,
        size: pageSize,
      });
      setFavorites(res.items);
      setTotalItems(res.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải danh sách yêu thích.";
      onToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [activeType, debouncedQuery, currentPage, onToast]);

  useEffect(() => {
    loadFavoritesData();
  }, [loadFavoritesData]);

  // Handler for delete
  const handleConfirmDelete = async () => {
    if (!deletingFavorite) return;
    setDeletingId(deletingFavorite.id);
    try {
      await deleteAdminFavorite(deletingFavorite.id);
      setFavorites((prev) => prev.filter((f) => f.id !== deletingFavorite.id));
      setTotalItems((prev) => Math.max(0, prev - 1));
      onToast(`Đã xóa lượt yêu thích của ${deletingFavorite.userName}`, "success");
      setDeletingFavorite(null);
      // refresh leaderboard
      fetchAdminFavoritesLeaderboard().then(setLeaderboard).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thao tác xóa thất bại.";
      onToast(msg, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setCurrentPage(0);
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <div className="space-y-6 anim-fade-up">
      {/* 1. Header Leaderboard: Most Liked Tracks (SoundCloud Top Charts style) */}
      <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#ff5500]/10 text-[#ff5500]">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Bảng Xếp Hạng Bài Hát Được Yêu Thích Nhất
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Các tác phẩm âm nhạc được cộng đồng thính giả Moodify tương tác và thả tim nhiều nhất
              </p>
            </div>
          </div>
        </div>

        {/* Horizontal Scroll Leaderboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {leaderboard.slice(0, 5).map((item, idx) => {
            const isPlayingThis =
              isPlayingPreview && previewTrack?.id === item.targetId;

            return (
              <div
                key={item.targetId}
                className="group relative rounded-xl border border-[#222432] bg-[#171822] hover:border-[#ff5500]/50 p-3 transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-black/40 mb-3">
                  <img
                    src={item.targetCoverUrl}
                    alt={item.targetTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/70 backdrop-blur-sm px-1.5 py-0.5 text-[11px] font-mono font-bold text-white">
                    #{idx + 1}
                  </div>

                  {/* Play Button Overlay */}
                  <button
                    type="button"
                    onClick={() =>
                      onTogglePreview({
                        id: item.targetId,
                        spotifyId: item.targetId,
                        title: item.targetTitle,
                        artist: item.targetSubtitle || "Moodify Artist",
                        album: "Single",
                        genre: "V-Pop",
                        duration: "3:30",
                        coverUrl: item.targetCoverUrl,
                        audioUrl: item.audioUrl,
                        plays: 5000,
                        likes: Number(item.favoriteCount),
                        status: "published",
                        moderationScore: 90,
                        bpm: 120,
                        energy: 0.7,
                        danceability: 0.6,
                        valence: 0.5,
                        acousticness: 0.2,
                        keySignature: "C Major",
                        vibeCategory: "Chill",
                        createdAt: "2026-09-01",
                      })
                    }
                    className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 group-hover:opacity-100 transition"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ff5500] text-white shadow-lg shadow-[#ff5500]/40 transform group-hover:scale-110 transition">
                      {isPlayingThis ? (
                        <Pause className="h-5 w-5 fill-white" />
                      ) : (
                        <Play className="h-5 w-5 fill-white ml-0.5" />
                      )}
                    </div>
                  </button>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-white truncate" title={item.targetTitle}>
                    {item.targetTitle}
                  </h4>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {item.targetSubtitle}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-rose-400 font-mono font-bold">
                    <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                    {item.favoriteCount}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">lượt thích</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Type Selector Tabs (SONG / ARTIST / ALBUM) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222432] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveType("SONG");
              setCurrentPage(0);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition ${
              activeType === "SONG"
                ? "bg-[#ff5500] text-white shadow-md shadow-[#ff5500]/20"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Music className="h-3.5 w-3.5" /> Bài Hát Yêu Thích
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveType("ARTIST");
              setCurrentPage(0);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition ${
              activeType === "ARTIST"
                ? "bg-[#ff5500] text-white shadow-md shadow-[#ff5500]/20"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Nghệ Sĩ Yêu Thích
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveType("ALBUM");
              setCurrentPage(0);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition ${
              activeType === "ALBUM"
                ? "bg-[#ff5500] text-white shadow-md shadow-[#ff5500]/20"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Disc className="h-3.5 w-3.5" /> Album Yêu Thích
          </button>
        </div>

        <div className="text-xs font-mono text-zinc-400">
          Tổng cộng: <strong className="text-white">{totalItems}</strong> lượt yêu thích
        </div>
      </div>

      {/* 3. SoundCloud Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#222432] bg-[#12131a] p-3.5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Tìm theo tên người dùng, email thính giả...`}
            className="w-full rounded-lg border border-[#222432] bg-[#171822] pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-[#ff5500] focus:outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {searchQuery && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-mono text-zinc-300 hover:bg-white/10 hover:text-white transition"
          >
            <RotateCcw className="h-3 w-3" /> Đặt lại tìm kiếm
          </button>
        )}
      </div>

      {/* 4. Favorites Table / List */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-16 rounded-xl border border-[#222432] bg-[#12131a] animate-pulse"
            />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="rounded-xl border border-[#222432] bg-[#12131a] p-12 text-center">
          <Heart className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-white">Chưa có lượt yêu thích nào</h3>
          <p className="mt-1 text-xs text-zinc-400 max-w-sm mx-auto">
            Không tìm thấy bản ghi yêu thích nào tương ứng với tìm kiếm hiện tại.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#222432] bg-[#12131a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Người Dùng Thả Tim</th>
                  <th className="py-3.5 px-4 font-semibold">Nội Dung Được Thích</th>
                  <th className="py-3.5 px-4 font-semibold">Phân Loại</th>
                  <th className="py-3.5 px-4 font-semibold">Thời Điểm</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {favorites.map((fav) => {
                  const isPlayingThis =
                    isPlayingPreview && previewTrack?.id === fav.targetId;

                  return (
                    <tr
                      key={fav.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* User */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {fav.userAvatar ? (
                            <img
                              src={fav.userAvatar}
                              alt={fav.userName}
                              className="h-8 w-8 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono font-bold text-xs">
                              {fav.userName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{fav.userName}</p>
                            <p className="text-[11px] font-mono text-zinc-400 truncate">
                              {fav.userEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Content Target */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="relative group/play shrink-0">
                            <img
                              src={fav.targetCoverUrl}
                              alt={fav.targetTitle}
                              className="h-9 w-9 rounded object-cover border border-white/10"
                            />
                            {fav.type === "SONG" && (
                              <button
                                type="button"
                                onClick={() =>
                                  onTogglePreview({
                                    id: fav.targetId,
                                    spotifyId: fav.targetId,
                                    title: fav.targetTitle,
                                    artist: fav.targetSubtitle || "Moodify Artist",
                                    album: "Single",
                                    genre: "V-Pop",
                                    duration: "3:30",
                                    coverUrl: fav.targetCoverUrl,
                                    audioUrl: fav.audioUrl,
                                    plays: 5000,
                                    likes: 500,
                                    status: "published",
                                    moderationScore: 90,
                                    bpm: 120,
                                    energy: 0.7,
                                    danceability: 0.6,
                                    valence: 0.5,
                                    acousticness: 0.2,
                                    keySignature: "C Major",
                                    vibeCategory: "Chill",
                                    createdAt: "2026-09-01",
                                  })
                                }
                                className="absolute inset-0 grid place-items-center bg-black/60 rounded text-[#ff5500] opacity-0 group-hover/play:opacity-100 transition"
                                title="Nghe thử bài hát này"
                              >
                                {isPlayingThis ? (
                                  <Pause className="h-4 w-4 fill-[#ff5500]" />
                                ) : (
                                  <Play className="h-4 w-4 fill-[#ff5500]" />
                                )}
                              </button>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-200 truncate">{fav.targetTitle}</p>
                            {fav.targetSubtitle && (
                              <p className="text-[11px] text-zinc-400 truncate">
                                {fav.targetSubtitle}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4">
                        {fav.type === "SONG" && (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            <Music className="h-2.5 w-2.5" /> BÀI HÁT
                          </span>
                        )}
                        {fav.type === "ARTIST" && (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <Users className="h-2.5 w-2.5" /> NGHỆ SĨ
                          </span>
                        )}
                        {fav.type === "ALBUM" && (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Disc className="h-2.5 w-2.5" /> ALBUM
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-zinc-400 font-mono text-xs">
                        {fav.createdAt}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={deletingId === fav.id}
                          onClick={() => setDeletingFavorite(fav)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Xóa lượt thích"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs font-mono text-zinc-400">
          <div>
            Hiển thị {favorites.length} trên tổng số {totalItems} lượt thích (Trang {currentPage + 1}/{totalPages})
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[#1e2330] bg-[#141822] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1e2330] transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Trang trước
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#1e2330] bg-[#141822] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1e2330] transition"
            >
              Trang sau <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deletingFavorite && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4 anim-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0e131d] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Xóa lượt yêu thích</h3>
                <p className="text-xs text-zinc-400">Xóa bản ghi này khỏi cơ sở dữ liệu MySQL.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/5 bg-black/40 p-3 text-xs text-zinc-300">
              <p className="font-semibold text-white">Người dùng: {deletingFavorite.userName}</p>
              <p className="text-zinc-400 mt-1">Đã thích: {deletingFavorite.targetTitle}</p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingFavorite(null)}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
