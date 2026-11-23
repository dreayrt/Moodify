"use client";

import { AdminCoverImage } from "./shared/admin-cover-image";

import type { AdminPreviewTrack } from "../types";

import React, { useState } from "react";
import {
  ArrowUpRight,
  Headphones,
  Heart,
  Play,
  Pause,
  Compass,
  Flame,
  Music2,
  Users,
  CreditCard,
  Smartphone,
  Laptop,
  CheckCircle2,
} from "lucide-react";
import {
  AdminTab,
  AdminUser,
  CatalogTrack,
  PaymentTransaction,
  SystemAuditLog,
  TrackRetentionMetric,
} from "../types";
import { AdminOverviewResponse } from "@/lib/api/admin-client";
import { InteractiveAreaChart } from "@/components/dashboard/charts/interactive-area-chart";
import { InteractiveDonutChart } from "@/components/dashboard/charts/interactive-donut-chart";

type OverviewTabProps = {
  users: AdminUser[];
  tracks?: CatalogTrack[];
  transactions: PaymentTransaction[];
  auditLogs: SystemAuditLog[];
  overviewData?: AdminOverviewResponse | null;
  previewTrack?: AdminPreviewTrack | null;
  isPlayingPreview?: boolean;
  onTogglePreview?: (track: AdminPreviewTrack) => void;
  onNavigateTab: (tab: AdminTab) => void;
};

export function OverviewTab({
  users,
  tracks = [],
  transactions,
  overviewData,
  previewTrack,
  isPlayingPreview = false,
  onTogglePreview,
  onNavigateTab,
}: OverviewTabProps) {
  // Core metrics
  const totalUsersCount = overviewData?.totalUsers ?? users.length;
  const contentLeadsCount =
    overviewData?.artistUsers ??
    users.filter((u) => u.role === "CONTENT_LEAD" || u.role === "ARTIST").length;
  const totalTracksCount = overviewData?.totalTracks ?? tracks.length;
  const publishedTracksCount =
    overviewData?.publishedTracks ?? tracks.filter((t) => t.status === "published").length;
  const totalStreamsCount = overviewData?.totalStreams ?? 0;
  const totalFavoritesCount = overviewData?.totalFavorites ?? 0;

  const totalRevenue =
    overviewData?.totalRevenue ??
    transactions
      .filter((t) => t.status === "SUCCESS")
      .reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  // Performance metrics per track (100% from backend trackPerformanceMetrics)
  const trackMetrics: TrackRetentionMetric[] = React.useMemo(() => {
    if (overviewData?.trackPerformanceMetrics && overviewData.trackPerformanceMetrics.length > 0) {
      return overviewData.trackPerformanceMetrics;
    }
    return [];
  }, [overviewData?.trackPerformanceMetrics, overviewData?.topListenedTracks]);

  // Real Platform and Source distributions from DB
  const realPlatformCounts = React.useMemo(() => {
    const raw = overviewData?.streamsByPlatform;
    const counts: Record<string, number> = { WEB: 0, ANDROID: 0, IOS: 0, OTHER: 0 };
    if (Array.isArray(raw)) {
      raw.forEach((item: { platform?: string; device?: string; source?: string; count?: number; value?: number }) => {
        const p = (item.platform || item.device || "").toString().toUpperCase();
        const val = Number(item.count || item.value || 0);
        if (p && counts[p] !== undefined) {
          counts[p] += val;
        } else if (val > 0) {
          counts.OTHER += val;
        }
      });
    } else if (raw && typeof raw === "object") {
      Object.entries(raw).forEach(([k, v]) => {
        const p = k.toUpperCase();
        const val = Number(v || 0);
        if (counts[p] !== undefined) counts[p] += val;
        else if (val > 0) counts.OTHER += val;
      });
    }
    return counts;
  }, [overviewData?.streamsByPlatform]);

  const realSourceCounts = React.useMemo(() => {
    const raw = overviewData?.streamsBySource;
    const counts: Record<string, number> = { EMOTION: 0, HOME: 0, SEARCH: 0, PLAYLIST: 0, OTHER: 0 };
    if (Array.isArray(raw)) {
      raw.forEach((item: { platform?: string; device?: string; source?: string; count?: number; value?: number }) => {
        const s = (item.source || "").toString().toUpperCase();
        const val = Number(item.count || item.value || 0);
        if (s && counts[s] !== undefined) {
          counts[s] += val;
        } else if (val > 0) {
          counts.OTHER += val;
        }
      });
    } else if (raw && typeof raw === "object") {
      Object.entries(raw).forEach(([k, v]) => {
        const s = k.toUpperCase();
        const val = Number(v || 0);
        if (counts[s] !== undefined) counts[s] += val;
        else if (val > 0) counts.OTHER += val;
      });
    }
    return counts;
  }, [overviewData?.streamsBySource]);

  const listeningTrend = overviewData?.listeningTrend || [];

  // Platform Avg Completion Rate
  const avgCompletionRate =
    overviewData?.avgCompletionRate !== undefined
      ? Number(overviewData.avgCompletionRate)
      : trackMetrics.length > 0
      ? Math.round(
          trackMetrics.reduce((sum, item) => sum + (item.completionRatePercent ?? 0), 0) /
            trackMetrics.length
        )
      : 0;

  // Area Chart Data: continuous 90-calendar-day series so 7D / 30D / 90D always render smoothly
  const chartData = React.useMemo(() => {
    const byDate = new Map<string, { streams: number; completed?: number }>();
    const byLabel = new Map<string, { streams: number; completed?: number }>();
    (listeningTrend || []).forEach((t) => {
      const entry = {
        streams: Number(t.streams) || 0,
        completed: t.completed !== undefined ? Number(t.completed) : 0,
      };
      if (t.date) byDate.set(t.date.slice(0, 10), entry);
      if (t.label) byLabel.set(t.label, entry);
    });

    const today = new Date();
    const continuous: { label: string; date: string; streams: number; completed: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const isoDate = `${yyyy}-${mm}-${dd}`;
      const label = `${dd}/${mm}`;
      const matched = byDate.get(isoDate) ?? byLabel.get(label);
      continuous.push({
        label,
        date: isoDate,
        streams: matched?.streams ?? 0,
        completed: matched?.completed ?? 0,
      });
    }
    return continuous;
  }, [listeningTrend]);

  // Donut 1: Channels & Sources (100% Real DB)
  const sourceDonutData = React.useMemo(() => {
    const base = [
      {
        id: "EMOTION",
        label: "Theo cảm xúc",
        value: realSourceCounts.EMOTION,
        color: "#a855f7",
        icon: Headphones,
      },
      {
        id: "HOME",
        label: "Trang chủ",
        value: realSourceCounts.HOME,
        color: "#10b981",
        icon: Compass,
      },
      {
        id: "SEARCH",
        label: "Tìm kiếm",
        value: realSourceCounts.SEARCH,
        color: "#f59e0b",
        icon: Compass,
      },
      {
        id: "PLAYLIST",
        label: "Danh sách phát",
        value: realSourceCounts.PLAYLIST,
        color: "#38bdf8",
        icon: Music2,
      },
    ];
    if (realSourceCounts.OTHER > 0) {
      base.push({
        id: "OTHER",
        label: "Nguồn khác",
        value: realSourceCounts.OTHER,
        color: "#64748b",
        icon: Compass,
      });
    }
    return base;
  }, [realSourceCounts]);

  // Donut 2: Platform Devices (100% Real DB)
  const platformDonutData = React.useMemo(() => {
    const base = [
      {
        id: "WEB",
        label: "Trình duyệt web",
        value: realPlatformCounts.WEB,
        color: "#38bdf8",
        icon: Laptop,
      },
      {
        id: "ANDROID",
        label: "Android",
        value: realPlatformCounts.ANDROID,
        color: "#10b981",
        icon: Smartphone,
      },
      {
        id: "IOS",
        label: "iOS",
        value: realPlatformCounts.IOS,
        color: "#a855f7",
        icon: Smartphone,
      },
    ];
    if (realPlatformCounts.OTHER > 0) {
      base.push({
        id: "OTHER",
        label: "Nền tảng khác",
        value: realPlatformCounts.OTHER,
        color: "#64748b",
        icon: Smartphone,
      });
    }
    return base;
  }, [realPlatformCounts]);

  return (
    <div className="space-y-6 anim-fade-up select-none">
      {/* ================= 1. EXECUTIVE KPI BANNER ================= */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
          {/* KPI 1: Tracks */}
          <div className="flex flex-col justify-between pt-3 lg:pt-0 lg:px-4 first:pt-0 first:px-0">
            <div className="flex items-center gap-2 text-zinc-400">
              <Music2 className="h-4 w-4 text-[#ff5500]" />
              <span className="text-xs font-medium">
                Tổng bài hát
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-graphik text-3xl font-bold text-white tracking-tight tabular-nums">
                {totalTracksCount}
              </span>
              <span className="text-xs text-zinc-500">bài</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06]">
              <span className="text-[11px] text-zinc-400 tabular-nums">
                Đã duyệt: <strong className="text-zinc-200">{publishedTracksCount}</strong>
              </span>
              <div className="flex items-center gap-1.5" title={`${publishedTracksCount}/${totalTracksCount} bài hát đã duyệt`}>
                <div className="w-[54px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff5500] rounded-full transition-all duration-500"
                    style={{
                      width: `${totalTracksCount > 0 ? Math.min(100, Math.round((publishedTracksCount / totalTracksCount) * 100)) : 0}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                  {totalTracksCount > 0 ? Math.round((publishedTracksCount / totalTracksCount) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* KPI 2: Streams */}
          <div className="flex flex-col justify-between pt-3 lg:pt-0 lg:px-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Headphones className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-medium">
                Lượt nghe
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-graphik text-3xl font-bold text-sky-400 tracking-tight tabular-nums">
                {totalStreamsCount}
              </span>
              <span className="text-xs text-zinc-500">lượt</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06]">
              <span className="text-[11px] text-zinc-400 tabular-nums">
                {overviewData?.totalListenedFormatted || `${overviewData?.totalListenedHours || 0} giờ`}
              </span>
            </div>
          </div>

          {/* KPI 3: Avg Completion Rate */}
          <div className="flex flex-col justify-between pt-3 lg:pt-0 lg:px-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium">
                Tỷ lệ nghe hết
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-graphik text-3xl font-bold text-emerald-400 tracking-tight tabular-nums">
                {avgCompletionRate}%
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06]">
              <span className="text-[11px] text-zinc-400">Trung bình</span>
            </div>
          </div>

          {/* KPI 4: Users */}
          <div className="flex flex-col justify-between pt-3 lg:pt-0 lg:px-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Users className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium">
                Người dùng
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-graphik text-3xl font-bold text-white tracking-tight tabular-nums">
                {totalUsersCount}
              </span>
              <span className="text-xs text-zinc-500">tài khoản</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06]">
              <span className="text-[11px] text-zinc-400 tabular-nums">
                Nghệ sĩ: <strong className="text-amber-300">{contentLeadsCount}</strong>
              </span>
              <div className="flex items-center gap-1.5" title={`${contentLeadsCount}/${totalUsersCount} nghệ sĩ`}>
                <div className="w-[54px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${totalUsersCount > 0 ? Math.min(100, Math.round((contentLeadsCount / totalUsersCount) * 100)) : 0}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                  {totalUsersCount > 0 ? Math.round((contentLeadsCount / totalUsersCount) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* KPI 5: Revenue */}
          <div className="flex flex-col justify-between pt-3 lg:pt-0 lg:px-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <CreditCard className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-medium">
                Doanh thu
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-graphik text-2xl font-bold text-purple-300 tracking-tight tabular-nums">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06]">
              <span className="text-[11px] text-zinc-400 tabular-nums">
                Đang dùng gói: <strong className="text-purple-300">{overviewData?.activeSubscriptions ?? 0}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. CORE: PER-TRACK RETENTION & COMPLETION RATE TABLE ================= */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-[#ff5500]" />
              <h3 className="font-graphik text-base font-bold text-white tracking-tight">
                Bài hát nghe nhiều nhất
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Tỷ lệ nghe hết và tỷ lệ bỏ qua của các bài hát phổ biến.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab("recommendations")}
              className="text-xs font-semibold text-[#ff5500] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Quản lý gợi ý nhạc <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {trackMetrics.length === 0 ? (
          <div className="py-14 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-xs text-zinc-500">
            Chưa có dữ liệu bài hát.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-medium text-zinc-400">
                  <th className="px-4 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3">Bài hát</th>
                  <th className="px-4 py-3">Lượt nghe</th>
                  <th className="px-4 py-3">Người nghe</th>
                  <th className="px-4 py-3">Thời lượng</th>
                  <th className="px-4 py-3">Thời lượng nghe trung bình</th>
                  <th className="px-4 py-3 min-w-[180px]">Tỷ lệ nghe hết</th>
                  <th className="px-4 py-3">Tỷ lệ bỏ qua</th>
                  <th className="px-4 py-3 text-right">Lượt thích</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {trackMetrics.map((track, idx) => {
                  const isPlayingThis = isPlayingPreview && previewTrack?.id === track.trackId;
                  const isHighCompletion = track.completionRatePercent != null && track.completionRatePercent >= 75;
                  const isLowCompletion = track.completionRatePercent != null && track.completionRatePercent < 45;

                  return (
                    <tr
                      key={track.trackId}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isPlayingThis ? "bg-[#ff5500]/5" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-zinc-500 tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </td>

                      {/* Track info + Play button */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/10 group">
                            <AdminCoverImage
                              src={track.coverUrl}
                              alt={track.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (onTogglePreview) {
                                  const existing = tracks.find((tr) => tr.id === track.trackId);
                                  if (existing) {
                                    onTogglePreview(existing);
                                  } else {
                                    onTogglePreview({
                                      id: track.trackId,
                                      title: track.title,
                                      artist: track.artist,
                                      coverUrl: track.coverUrl,
                                      audioUrl: track.audioUrl,
                                    });
                                  }
                                }
                              }}
                              className={`absolute inset-0 grid place-items-center transition-all ${
                                isPlayingThis
                                  ? "bg-black/60 opacity-100"
                                  : "bg-black/40 opacity-0 group-hover:opacity-100"
                              } cursor-pointer`}
                              title="Nghe thử bài hát"
                            >
                              <div className="h-6 w-6 rounded-full bg-[#ff5500] text-white flex items-center justify-center shadow-lg active:scale-90 transition">
                                {isPlayingThis ? (
                                  <Pause className="h-3 w-3 fill-current" />
                                ) : (
                                  <Play className="h-3 w-3 fill-current ml-0.5" />
                                )}
                              </div>
                            </button>
                          </div>
                          <div className="min-w-0 max-w-[200px]">
                            <p className="font-semibold text-white truncate text-xs hover:text-[#ff5500] transition-colors">
                              {track.title}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {track.artist} · <span className="text-zinc-500">{track.genre}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Streams */}
                      <td className="px-4 py-3.5 font-mono text-zinc-200 font-bold tabular-nums">
                        {track.streamCount.toLocaleString("vi-VN")}
                      </td>

                      {/* Unique Listeners */}
                      <td className="px-4 py-3.5 font-mono text-zinc-400 tabular-nums">
                        {track.uniqueListeners.toLocaleString("vi-VN")}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3.5 font-mono text-zinc-400 tabular-nums">
                        {track.duration}
                      </td>

                      {/* Avg Listened Duration */}
                      <td className="px-4 py-3.5 font-mono text-emerald-400 font-bold tabular-nums">
                        {track.avgDurationFormatted || "0:00"}
                      </td>

                      {/* Completion Rate with Progress Bar */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                            <span
                              className={`font-bold ${
                                isHighCompletion
                                  ? "text-emerald-400"
                                  : isLowCompletion
                                  ? "text-rose-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {track.completionRatePercent == null ? "Chưa có thời lượng" : `${track.completionRatePercent ?? 0}%`}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isHighCompletion
                                  ? "bg-emerald-400"
                                  : isLowCompletion
                                  ? "bg-rose-400"
                                  : "bg-amber-400"
                              }`}
                              style={{ width: `${track.completionRatePercent ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Skip Rate */}
                      <td className="px-4 py-3.5 font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            track.skipRatePercent > 35 ? "text-rose-400" : "text-zinc-400"
                          }`}
                        >
                          {track.skipRatePercent}%
                        </span>
                      </td>

                      {/* Favorites */}
                      <td className="px-4 py-3.5 text-right font-mono text-rose-400 font-bold tabular-nums">
                        <div className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                          <span>{track.favoriteCount}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= 3. MULTIDIMENSIONAL ANALYTICS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Spline Interactive Area Chart */}
        <div className="lg:col-span-7">
          <InteractiveAreaChart
            title="Xu hướng lượt nghe"
            subtitle="Thống kê lượt nghe và lượt nghe hết theo ngày."
            data={chartData}
            metricLabel="Lượt nghe"
            secondaryLabel="Nghe hết"
            accentColor="#ff5500"
            secondaryColor="#10b981"
            height={270}
          />
        </div>

        {/* RIGHT COLUMN (5 cols): Donut Visual Distributions */}
        <div className="lg:col-span-5 space-y-6">
          <InteractiveDonutChart
            title="Nguồn nghe nhạc"
            subtitle="Tỷ lệ lượt nghe theo nơi bắt đầu phát"
            data={sourceDonutData}
            centerLabel="Nguồn"
            size={180}
            strokeWidth={22}
          />

          <InteractiveDonutChart
            title="Nền tảng truy cập"
            subtitle="Tỷ lệ lượt nghe theo thiết bị"
            data={platformDonutData}
            centerLabel="Thiết bị"
            size={180}
            strokeWidth={22}
          />
        </div>
      </div>
    </div>
  );
}
