"use client";

import React from "react";
import {
  ArrowUpRight,
  Headphones,
  Heart,
  Play,
  Pause,
  Clock,
  Music2,
  Users,
  Flame,
  CreditCard,
  Radio,
} from "lucide-react";
import {
  AdminTab,
  AdminUser,
  CatalogTrack,
  PaymentTransaction,
  SystemAuditLog,
} from "../types";
import { AdminOverviewResponse } from "@/lib/api/admin-client";

type OverviewTabProps = {
  users: AdminUser[];
  tracks: CatalogTrack[];
  transactions: PaymentTransaction[];
  auditLogs: SystemAuditLog[];
  overviewData?: AdminOverviewResponse | null;
  previewTrack?: CatalogTrack | null;
  isPlayingPreview?: boolean;
  onTogglePreview?: (track: CatalogTrack) => void;
  onNavigateTab: (tab: AdminTab) => void;
};

export function OverviewTab({
  users,
  tracks,
  transactions,
  overviewData,
  previewTrack,
  isPlayingPreview = false,
  onTogglePreview,
  onNavigateTab,
}: OverviewTabProps) {
  // Real numbers from DB overview or fallback to props
  const totalUsersCount = overviewData?.totalUsers ?? users.length;
  const contentLeadsCount = overviewData?.artistUsers ?? users.filter((u) => u.role === "CONTENT_LEAD" || u.role === "ARTIST").length;
  const totalTracksCount = overviewData?.totalTracks ?? tracks.length;
  const publishedTracksCount = overviewData?.publishedTracks ?? tracks.filter((t) => t.status === "published").length;
  const totalStreamsCount = overviewData?.totalStreams ?? 0;
  const totalFavoritesCount = overviewData?.totalFavorites ?? 0;

  const totalRevenue = overviewData?.totalRevenue ?? transactions
    .filter((t) => t.status === "SUCCESS")
    .reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  // Top tracks & Activities
  const topListened = overviewData?.topListenedTracks || [];
  const topFavorited = overviewData?.topFavoritedTracks || [];
  const listeningTrend = overviewData?.listeningTrend || [];
  const recentActivities = overviewData?.recentActivities || [];

  // Max streams for relative bar heights
  const maxTrendStreams = Math.max(...listeningTrend.map((t) => t.streams), 1);

  return (
    <div className="space-y-6 anim-fade-up select-none">
      {/* ================= 1. SOUNDCLOUD MASTER METRIC RIBBON ================= */}
      <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-1.5 shadow-xl">
        <div className="rounded-xl bg-[#171822] p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
          {/* Metric 1: Tracks */}
          <div className="flex flex-col justify-between pt-3 lg:pt-0 lg:px-4 first:pt-0 first:px-0">
            <div className="flex items-center gap-2 text-zinc-400">
              <Music2 className="h-4 w-4 text-[#ff5500]" />
              <span className="font-mono text-[11px] tracking-wider uppercase font-semibold">Kho Bài Hát</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-graphik text-3xl font-bold text-white tracking-tight">{totalTracksCount}</span>
              <span className="text-xs text-zinc-500 font-mono">tác phẩm</span>
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 font-mono">
              Đã phát hành: <strong className="text-zinc-200">{publishedTracksCount}</strong>
            </div>
          </div>

          {/* Metric 2: Users */}
          <div className="flex flex-col justify-between pt-3 lg:pt-0 lg:px-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Users className="h-4 w-4 text-emerald-400" />
              <span className="font-mono text-[11px] tracking-wider uppercase font-semibold">Cộng Đồng</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-graphik text-3xl font-bold text-white tracking-tight">{totalUsersCount}</span>
              <span className="text-xs text-zinc-500 font-mono">người dùng</span>
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 font-mono">
              Phụ trách nội dung: <strong className="text-emerald-300">{contentLeadsCount}</strong>
            </div>
          </div>

          {/* Metric 3: Streams */}
          <div className="flex flex-col justify-between pt-3 lg:pt-0 lg:px-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Headphones className="h-4 w-4 text-[#ff5500]" />
              <span className="font-mono text-[11px] tracking-wider uppercase font-semibold">Lượt Phát (Streams)</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-graphik text-3xl font-bold text-white tracking-tight">{totalStreamsCount}</span>
              <span className="text-xs text-zinc-500 font-mono">lượt nghe</span>
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 font-mono">
              Theo dõi trực tiếp từ máy chủ
            </div>
          </div>

          {/* Metric 4: Favorites */}
          <div className="flex flex-col justify-between pt-3 lg:pt-0 lg:px-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Heart className="h-4 w-4 text-rose-500 fill-rose-500/20" />
              <span className="font-mono text-[11px] tracking-wider uppercase font-semibold">Lượt Yêu Thích</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-graphik text-3xl font-bold text-white tracking-tight">{totalFavoritesCount}</span>
              <span className="text-xs text-rose-400/80 font-mono">lượt thích</span>
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 font-mono">
              Dữ liệu yêu thích người nghe
            </div>
          </div>

          {/* Metric 5: Revenue */}
          <div className="flex flex-col justify-between pt-3 lg:pt-0 lg:px-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <CreditCard className="h-4 w-4 text-[#ff5500]" />
              <span className="font-mono text-[11px] tracking-wider uppercase font-semibold">Doanh Thu Thuê Bao</span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-graphik text-2xl font-bold text-white tracking-tight">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 font-mono">
              Thuê bao active: <strong className="text-[#ff5500]">{overviewData?.activeSubscriptions ?? 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. SOUNDCLOUD ASYMMETRIC MAIN DECK ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (65% / 8 Cols): Stream Pulse & Top Trending Tracks */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stream Trend Chart */}
          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-graphik text-base font-bold text-white tracking-tight">
                  Lưu Lượng Phát Nhạc Theo Ngày
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Lượt nghe tích lũy được ghi nhận từ lịch sử người nghe
                </p>
              </div>
              <span className="font-mono text-xs text-zinc-500 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/5">
                7 ngày gần nhất
              </span>
            </div>

            {listeningTrend.length === 0 ? (
              <div className="h-44 grid place-items-center rounded-xl bg-white/[0.02] border border-dashed border-white/5 text-xs text-zinc-500 font-mono">
                Chưa có dữ liệu lượt nghe theo ngày
              </div>
            ) : (
              <div className="flex items-end justify-between gap-3 h-48 pt-6 px-2">
                {listeningTrend.map((t, idx) => {
                  const heightPercent = Math.max(Math.round((t.streams / maxTrendStreams) * 100), 8);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      {/* Tooltip on hover */}
                      <span className="text-[11px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                        {t.streams}
                      </span>
                      {/* Bar */}
                      <div className="w-full max-w-[48px] bg-white/[0.06] rounded-t-md h-full flex items-end overflow-hidden group-hover:bg-white/[0.1] transition-colors">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-[#ff5500] rounded-t-md group-hover:bg-[#ff6a1a] transition-all duration-300"
                        />
                      </div>
                      {/* Date label */}
                      <span className="text-[11px] font-mono text-zinc-400 group-hover:text-white transition-colors">
                        {t.label || t.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trending Tracks (SoundCloud Track Strips) */}
          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-graphik text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Flame className="h-4 w-4 text-[#ff5500]" /> Top Bài Hát Thịnh Hành Nền Tảng
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Xếp hạng theo tổng số lượt nghe thực tế trên hệ thống</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("catalog")}
                className="text-xs font-semibold text-[#ff5500] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Toàn bộ kho nhạc <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {topListened.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/5 text-xs text-zinc-500 font-mono">
                Chưa có dữ liệu bài hát thịnh hành
              </div>
            ) : (
              <div className="space-y-2">
                {topListened.map((track, idx) => {
                  const isPlayingThis = isPlayingPreview && previewTrack?.id === track.trackId;

                  return (
                    <div
                      key={track.trackId}
                      className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 ${
                        isPlayingThis
                          ? "border-[#ff5500]/50 bg-[#ff5500]/10 shadow-sm"
                          : "border-transparent bg-[#161722] hover:bg-[#1c1d2a] hover:border-white/5"
                      }`}
                    >
                      {/* Left: Rank + Cover + Play button + Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Rank */}
                        <span className="w-5 text-center font-mono text-xs font-bold text-zinc-500 group-hover:text-zinc-300">
                          {String(idx + 1).padStart(2, "0")}
                        </span>

                        {/* Cover + Play Overlay */}
                        <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/10">
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (onTogglePreview) {
                                onTogglePreview({
                                  id: track.trackId,
                                  title: track.title,
                                  artist: track.artist,
                                  album: "Single",
                                  coverUrl: track.coverUrl,
                                  audioUrl: track.audioUrl,
                                  duration: track.duration,
                                  genre: track.genre,
                                  status: "published",
                                  plays: track.streamCount,
                                  likes: 0,
                                  bpm: 120,
                                  keySignature: "C",
                                  energy: 0.8,
                                  valence: 0.7,
                                  danceability: 0.75,
                                  acousticness: 0.2,
                                  vibeCategory: "Energetic",
                                  moderationScore: 100,
                                  createdAt: "2026-09-01",
                                  spotifyId: track.trackId,
                                });
                              }
                            }}
                            className={`absolute inset-0 grid place-items-center transition-all ${
                              isPlayingThis
                                ? "bg-black/60 opacity-100"
                                : "bg-black/40 opacity-0 group-hover:opacity-100"
                            } cursor-pointer`}
                          >
                            <div className="h-7 w-7 rounded-full bg-[#ff5500] text-white flex items-center justify-center shadow-lg active:scale-90 transition">
                              {isPlayingThis ? (
                                <Pause className="h-3.5 w-3.5 fill-current" />
                              ) : (
                                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                              )}
                            </div>
                          </button>
                        </div>

                        {/* Title & Artist */}
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-white truncate group-hover:text-[#ff5500] transition-colors">
                            {track.title}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {track.artist} · <span className="font-mono text-zinc-500">{track.genre}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Duration + Streams Count */}
                      <div className="flex items-center gap-6 shrink-0 pl-3">
                        <div className="hidden sm:flex items-center gap-1.5 text-zinc-500 font-mono text-xs">
                          <Clock className="h-3 w-3" />
                          <span>{track.duration}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/5">
                          <Headphones className="h-3.5 w-3.5 text-[#ff5500]" />
                          <span>{track.streamCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (35% / 4 Cols): Favorites Leaderboard & Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          {/* Top Favorited */}
          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-graphik text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500 fill-rose-500/20" /> Được Yêu Thích Nhất
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Top bài hát được thả tim nhiều nhất</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("favorites")}
                className="text-[11px] font-semibold text-[#ff5500] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Xem tất cả <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {topFavorited.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/5 text-xs text-zinc-500 font-mono">
                Chưa có dữ liệu yêu thích
              </div>
            ) : (
              <div className="space-y-2">
                {topFavorited.slice(0, 5).map((fav, i) => (
                  <div
                    key={fav.trackId}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#161722] hover:bg-[#1c1d2a] border border-transparent hover:border-white/5 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-zinc-500 w-4 text-center">
                        {i + 1}
                      </span>
                      <img
                        src={fav.coverUrl}
                        alt={fav.title}
                        className="h-9 w-9 rounded-md object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-white truncate">{fav.title}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{fav.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-rose-400 shrink-0 pl-2">
                      <Heart className="h-3 w-3 fill-rose-500" />
                      <span>{fav.favoriteCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Platform Pulse Activity */}
          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-graphik text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Radio className="h-4 w-4 text-[#ff5500]" /> Dòng Hoạt Động Hệ Thống
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Sự kiện người nghe &amp; giao dịch thực tế</p>
              </div>
            </div>

            {recentActivities.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/5 text-xs text-zinc-500 font-mono">
                Chưa có sự kiện gần đây
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-[#161722] border border-white/5 hover:border-white/10 transition"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      {act.type === "PAYMENT" ? (
                        <span className="font-mono font-bold text-[#ff5500]">GIAO DỊCH THUÊ BAO</span>
                      ) : (
                        <span className="font-mono font-bold text-rose-400">YÊU THÍCH BÀI HÁT</span>
                      )}
                      <span className="text-zinc-500 font-mono">{act.timestamp}</span>
                    </div>
                    <h5 className="font-semibold text-xs text-white mt-1.5 truncate">{act.title}</h5>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{act.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
