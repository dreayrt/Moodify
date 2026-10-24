"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Clock,
  Compass,
  FastForward,
  Filter,
  Headphones,
  Laptop,
  Layers,
  Music2,
  Pause,
  Play,
  Radio,
  RefreshCcw,
  Rewind,
  Search,
  Smartphone,
  Sparkles,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { PlaybackEventItem } from "../types";
import { fetchAdminAllPlaybackEvents } from "@/lib/api/admin-client";
import { AdminPagination } from "./shared/admin-pagination";

function getEventBadge(type: string) {
  const norm = (type || "").toUpperCase();
  switch (norm) {
    case "PLAY":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-300">
          <Play className="h-3 w-3 fill-emerald-400 text-emerald-400" /> BẮT ĐẦU PHÁT
        </span>
      );
    case "PAUSE":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-300">
          <Pause className="h-3 w-3 fill-amber-400 text-amber-400" /> TẠM DỪNG
        </span>
      );
    case "RESUME":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[11px] font-mono font-bold text-sky-300">
          <Play className="h-3 w-3 text-sky-400" /> TIẾP TỤC
        </span>
      );
    case "SEEK":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[11px] font-mono font-bold text-purple-300">
          <Zap className="h-3 w-3 text-purple-400" /> TUA NHẠC
        </span>
      );
    case "SKIP_NEXT":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[11px] font-mono font-bold text-rose-300">
          <FastForward className="h-3 w-3 text-rose-400" /> BỎ QUA TIẾP
        </span>
      );
    case "SKIP_PREVIOUS":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[11px] font-mono font-bold text-orange-300">
          <Rewind className="h-3 w-3 text-orange-400" /> QUAY LẠI
        </span>
      );
    case "COMPLETE":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 text-[11px] font-mono font-bold text-teal-300">
          <Sparkles className="h-3 w-3 text-teal-400" /> NGHE TRỌN VẸN
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-500/15 border border-zinc-500/30 px-2 py-0.5 text-[11px] font-mono font-semibold text-zinc-300">
          {type}
        </span>
      );
  }
}

export function PlaybackBehaviorTab({
  onToast,
}: {
  onToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}) {
  const [items, setItems] = useState<PlaybackEventItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");

  // Behavior Distribution Stats
  const [distribution, setDistribution] = useState<Record<string, number>>({});

  const loadData = async (targetPage = page) => {
    setIsLoading(true);
    try {
      const res = await fetchAdminAllPlaybackEvents({
        page: targetPage,
        size: pageSize,
        eventType: eventTypeFilter,
        search: search.trim() || undefined,
      });
      setItems(res.items || []);
      setTotalElements(res.totalElements || 0);
      setPage(res.page || 0);
      if (res.distribution) {
        setDistribution(res.distribution);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (onToast) onToast(`Lỗi khi tải dữ liệu sự kiện: ${msg}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypeFilter, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(0);
  };

  // Behavior metrics
  const totalEvents = Object.values(distribution).reduce((a, b) => a + b, 0);
  const playCount = distribution["PLAY"] || 0;
  const pauseCount = distribution["PAUSE"] || 0;
  const seekCount = distribution["SEEK"] || 0;
  const skipCount = (distribution["SKIP_NEXT"] || 0) + (distribution["SKIP_PREVIOUS"] || 0);
  const completeCount = distribution["COMPLETE"] || 0;

  const getPercent = (count: number) => {
    if (!totalEvents) return "0%";
    return `${Math.round((count / totalEvents) * 100)}%`;
  };

  return (
    <div className="space-y-6 select-none anim-fade-up">
      {/* ================= 1. HEADER & EXPLANATION ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222432] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-graphik text-xl font-bold text-white tracking-tight">
                Hành Vi Người Nghe &amp; Sự Kiện Phát Nhạc
              </h2>
              <p className="font-mono text-xs text-zinc-400 mt-0.5">
                Giám sát dòng tương tác thời gian thực: Tua nhạc, Tạm dừng, Bỏ qua bài và Lưu vết phiên
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData(page)}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#171822] hover:bg-[#1f202e] border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
        >
          <RefreshCcw className={`h-3.5 w-3.5 text-purple-400 ${isLoading ? "animate-spin" : ""}`} />
          <span>Làm Mới Sự Kiện</span>
        </button>
      </div>

      {/* ================= 2. BEHAVIOR INTERACTION METRICS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Metric: PLAY */}
        <div className="p-4 rounded-xl border border-[#222432] bg-[#12131a] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase font-semibold text-emerald-400">Khởi Động Phát</span>
            <Play className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />
          </div>
          <div className="mt-2.5">
            <span className="font-graphik text-2xl font-bold text-white tracking-tight">{playCount}</span>
            <span className="font-mono text-xs text-zinc-500 ml-1.5">lượt ({getPercent(playCount)})</span>
          </div>
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: getPercent(playCount) }}
            />
          </div>
        </div>

        {/* Metric: PAUSE */}
        <div className="p-4 rounded-xl border border-[#222432] bg-[#12131a] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase font-semibold text-amber-400">Tạm Dừng</span>
            <Pause className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          </div>
          <div className="mt-2.5">
            <span className="font-graphik text-2xl font-bold text-white tracking-tight">{pauseCount}</span>
            <span className="font-mono text-xs text-zinc-500 ml-1.5">lượt ({getPercent(pauseCount)})</span>
          </div>
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full"
              style={{ width: getPercent(pauseCount) }}
            />
          </div>
        </div>

        {/* Metric: SEEK */}
        <div className="p-4 rounded-xl border border-[#222432] bg-[#12131a] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase font-semibold text-purple-400">Tua Nhạc (Seek)</span>
            <Zap className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="mt-2.5">
            <span className="font-graphik text-2xl font-bold text-white tracking-tight">{seekCount}</span>
            <span className="font-mono text-xs text-zinc-500 ml-1.5">lượt ({getPercent(seekCount)})</span>
          </div>
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-400 rounded-full"
              style={{ width: getPercent(seekCount) }}
            />
          </div>
        </div>

        {/* Metric: SKIP */}
        <div className="p-4 rounded-xl border border-[#222432] bg-[#12131a] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase font-semibold text-rose-400">Bỏ Qua Bài (Skip)</span>
            <FastForward className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="mt-2.5">
            <span className="font-graphik text-2xl font-bold text-white tracking-tight">{skipCount}</span>
            <span className="font-mono text-xs text-zinc-500 ml-1.5">lượt ({getPercent(skipCount)})</span>
          </div>
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-400 rounded-full"
              style={{ width: getPercent(skipCount) }}
            />
          </div>
        </div>

        {/* Metric: COMPLETE */}
        <div className="p-4 rounded-xl border border-[#222432] bg-[#12131a] flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase font-semibold text-teal-400">Nghe Trọn Vẹn</span>
            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
          </div>
          <div className="mt-2.5">
            <span className="font-graphik text-2xl font-bold text-white tracking-tight">{completeCount}</span>
            <span className="font-mono text-xs text-zinc-500 ml-1.5">lượt ({getPercent(completeCount)})</span>
          </div>
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-400 rounded-full"
              style={{ width: getPercent(completeCount) }}
            />
          </div>
        </div>
      </div>

      {/* ================= 3. FILTER BAR ================= */}
      <div className="p-4 rounded-2xl border border-[#222432] bg-[#12131a] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên bài, ca sĩ, @username..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#171822] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 font-mono"
          />
        </form>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="h-3.5 w-3.5 text-zinc-500" />
            <span className="font-mono text-xs text-zinc-400">Loại Sự Kiện:</span>
          </div>

          <div className="flex items-center gap-1 bg-[#171822] p-1 rounded-xl border border-white/5 text-xs font-mono">
            {[
              { key: "ALL", label: "Tất Cả" },
              { key: "PLAY", label: "Play" },
              { key: "PAUSE", label: "Pause" },
              { key: "SEEK", label: "Tua (Seek)" },
              { key: "SKIP_NEXT", label: "Skip Next" },
              { key: "COMPLETE", label: "Hoàn Tất" },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setEventTypeFilter(f.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  eventTypeFilter === f.key
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-[#171822] border border-white/10 text-xs text-zinc-300 font-mono focus:outline-none shrink-0"
          >
            <option value={15}>15 dòng</option>
            <option value={25}>25 dòng</option>
            <option value={50}>50 dòng</option>
          </select>
        </div>
      </div>

      {/* ================= 4. PLAYBACK EVENTS DATA TABLE ================= */}
      <div className="rounded-2xl border border-[#222432] bg-[#12131a] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#222432] bg-[#171822]/80 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="px-5 py-3.5">Mã SK</th>
                <th className="px-5 py-3.5">Hành Vi (Event)</th>
                <th className="px-5 py-3.5">Bài Hát</th>
                <th className="px-5 py-3.5">Người Thao Tác</th>
                <th className="px-5 py-3.5">Vị Trí Trong Bài</th>
                <th className="px-5 py-3.5">Mốc Tua Tới</th>
                <th className="px-5 py-3.5">Thiết Bị &amp; Kênh</th>
                <th className="px-5 py-3.5 text-right">Thời Điểm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222432]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-zinc-500 font-mono">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mb-2" />
                    <p>Đang tải dòng sự kiện tương tác...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-zinc-500 font-mono italic">
                    Không tìm thấy sự kiện phát nhạc nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                items.map((evt) => (
                  <tr
                    key={evt.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    {/* ID & Session */}
                    <td className="px-5 py-3.5 font-mono text-zinc-400">
                      <div>#{evt.id}</div>
                      <span className="text-[10px] text-zinc-600 block">
                        Phiên #{evt.listeningHistoryId}
                      </span>
                    </td>

                    {/* Event Type Badge */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getEventBadge(evt.eventType)}
                    </td>

                    {/* Track info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-900">
                          {evt.coverUrl ? (
                            <img
                              src={evt.coverUrl}
                              alt={evt.trackTitle || "Track"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-500">
                              <Music2 className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate max-w-[170px]">
                            {evt.trackTitle}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate max-w-[170px]">
                            {evt.artistName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-zinc-200 truncate max-w-[130px]">
                        {evt.fullName}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-500 truncate">
                        @{evt.username}
                      </div>
                    </td>

                    {/* Position */}
                    <td className="px-5 py-3.5 font-mono text-zinc-300">
                      <span className="text-white font-bold">{evt.positionFormatted || "0:00"}</span>
                      <span className="text-[10px] text-zinc-500 block">
                        {evt.positionMs.toLocaleString()} ms
                      </span>
                    </td>

                    {/* Target Position (if seek) */}
                    <td className="px-5 py-3.5 font-mono">
                      {evt.targetPositionMs && evt.targetPositionMs > 0 ? (
                        <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                          <ArrowRight className="h-3 w-3 text-purple-400" />
                          <span>{evt.targetPositionFormatted || "0:00"}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Device & Source */}
                    <td className="px-5 py-3.5 font-mono text-zinc-400">
                      <div className="text-zinc-300 font-semibold">{evt.deviceType || "WEB"}</div>
                      <div className="text-[10px] text-zinc-500">{evt.source || "OTHER"}</div>
                    </td>

                    {/* Occurred At */}
                    <td className="px-5 py-3.5 text-right font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                      {evt.occurredAt}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[#222432] bg-[#12131a]">
          <AdminPagination
            currentPage={page}
            totalItems={totalElements}
            pageSize={pageSize}
            onPageChange={(p) => loadData(p)}
          />
        </div>
      </div>
    </div>
  );
}
