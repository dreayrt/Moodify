"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  Filter,
  Headphones,
  HelpCircle,
  Laptop,
  Layers,
  Music2,
  Play,
  RefreshCcw,
  Search,
  Smartphone,
  Sparkles,
  TrendingUp,
  User,
  X,
  XCircle,
} from "lucide-react";
import {
  ListeningHistoryItem,
  ListeningSummaryMetrics,
  PlaybackEventItem,
} from "../types";
import {
  fetchAdminListeningHistory,
  fetchAdminListeningSummary,
  fetchAdminPlaybackEvents,
} from "@/lib/api/admin-client";
import { AdminPagination } from "./shared/admin-pagination";
import { ModalPortal } from "./shared/modal-portal";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
}

function parseDurationToSeconds(durationStr?: string): number {
  if (!durationStr) return 210; // default 3:30
  const parts = durationStr.split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return m * 60 + s;
  }
  return 210;
}

function getSourceBadge(source: string) {
  switch (source) {
    case "EMOTION":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[11px] font-mono font-semibold text-purple-300">
          <Sparkles className="h-3 w-3 text-purple-400" /> Cảm Xúc (AI)
        </span>
      );
    case "SEARCH":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-300">
          <Search className="h-3 w-3 text-amber-400" /> Tìm Kiếm
        </span>
      );
    case "PLAYLIST":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[11px] font-mono font-semibold text-sky-300">
          <Layers className="h-3 w-3 text-sky-400" /> Playlist
        </span>
      );
    case "ALBUM":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[11px] font-mono font-semibold text-indigo-300">
          <Music2 className="h-3 w-3 text-indigo-400" /> Album
        </span>
      );
    case "HOME":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-mono font-semibold text-emerald-300">
          <Compass className="h-3 w-3 text-emerald-400" /> Trang Chủ
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-500/10 border border-zinc-500/30 px-2 py-0.5 text-[11px] font-mono font-semibold text-zinc-400">
          {source}
        </span>
      );
  }
}

function getDeviceBadge(deviceType: string) {
  if (deviceType === "WEB") {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-300">
        <Laptop className="h-3.5 w-3.5 text-sky-400" /> Web Browser
      </span>
    );
  }
  if (deviceType === "ANDROID" || deviceType === "IOS") {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-300">
        <Smartphone className="h-3.5 w-3.5 text-emerald-400" /> {deviceType} App
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-400">
      <Laptop className="h-3.5 w-3.5" /> {deviceType}
    </span>
  );
}

export function ListeningHistoryTab({
  onToast,
}: {
  onToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}) {
  const [items, setItems] = useState<ListeningHistoryItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [completionFilter, setCompletionFilter] = useState<"ALL" | "COMPLETED" | "DROPPED">("ALL");

  // Summary Metrics
  const [summary, setSummary] = useState<ListeningSummaryMetrics | null>(null);

  // Events Modal
  const [selectedSession, setSelectedSession] = useState<ListeningHistoryItem | null>(null);
  const [sessionEvents, setSessionEvents] = useState<PlaybackEventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const loadSummary = async () => {
    try {
      const res = await fetchAdminListeningSummary();
      setSummary(res);
    } catch (err) {
      console.warn("Lỗi khi tải tóm tắt telemetry:", err);
    }
  };

  const loadData = async (targetPage = page) => {
    setIsLoading(true);
    try {
      const res = await fetchAdminListeningHistory({
        page: targetPage,
        size: pageSize,
        search: search.trim() || undefined,
        deviceType: deviceFilter,
        source: sourceFilter,
      });
      setItems(res.items || []);
      setTotalElements(res.totalElements || 0);
      setPage(res.currentPage);
    } catch (err) {
      console.error("Lỗi khi tải lịch sử nghe:", err);
      if (onToast) onToast("Không thể tải danh sách phiên nghe nhạc.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  useEffect(() => {
    void loadData(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, deviceFilter, sourceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadData(0);
  };

  const handleOpenEventsModal = async (session: ListeningHistoryItem) => {
    setSelectedSession(session);
    setIsLoadingEvents(true);
    setSessionEvents([]);
    try {
      const events = await fetchAdminPlaybackEvents(session.id);
      setSessionEvents(events);
    } catch (err) {
      console.error("Lỗi khi tải sự kiện phát nhạc:", err);
      if (onToast) onToast("Không thể tải sự kiện phát nhạc của phiên này.", "error");
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Filtered by completion rate on client if needed
  const displayedItems = items.filter((item) => {
    if (completionFilter === "ALL") return true;
    const trackSec = parseDurationToSeconds(item.totalDuration);
    const rate = trackSec > 0 ? (item.listenedDurationSeconds / trackSec) * 100 : 100;
    if (completionFilter === "COMPLETED") return rate >= 75;
    if (completionFilter === "DROPPED") return rate < 40;
    return true;
  });

  return (
    <div className="space-y-6 select-none anim-fade-up">
      {/* ================= 1. HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222432] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#ff5500]/10 border border-[#ff5500]/20 flex items-center justify-center text-[#ff5500]">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-graphik text-xl font-bold text-white tracking-tight">
                Nhật Ký Lượt Nghe Chi Tiết
              </h2>
              <p className="font-mono text-xs text-zinc-400 mt-0.5">
                Quản lý và đối soát 100% phiên nghe thực tế, thời lượng, nguồn phát và tỷ lệ hoàn thành bài hát
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadData(page);
            void loadSummary();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#171822] hover:bg-[#1f202e] border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
        >
          <RefreshCcw className={`h-3.5 w-3.5 text-[#ff5500] ${isLoading ? "animate-spin" : ""}`} />
          <span>Làm Mới Lịch Sử</span>
        </button>
      </div>

      {/* ================= 2. KPI METRICS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-[#222432] bg-[#12131a] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase font-semibold">Tổng Phiên Nghe Ghi Nhận</span>
            <Headphones className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2.5">
            <span className="font-graphik text-2xl font-bold text-white tracking-tight">
              {summary?.totalSessions?.toLocaleString("vi-VN") || 0}
            </span>
            <span className="font-mono text-xs text-zinc-500 ml-1.5">phiên</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 font-mono">Dữ liệu thực từ listening_history</p>
        </div>

        <div className="p-4 rounded-xl border border-[#222432] bg-[#12131a] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase font-semibold">Tổng Giờ Nghe Thực Tế</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <span className="font-graphik text-2xl font-bold text-emerald-400 tracking-tight">
              {summary?.totalHours?.toLocaleString("vi-VN") || 0}
            </span>
            <span className="font-mono text-xs text-zinc-400 ml-1.5">giờ phát</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 font-mono">Thời lượng nghe tích lũy</p>
        </div>

        <div className="p-4 rounded-xl border border-[#222432] bg-[#12131a] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase font-semibold">Tỷ Lệ Nghe Trọn Vẹn</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2.5">
            <span className="font-graphik text-2xl font-bold text-amber-400 tracking-tight">
              {summary?.completionRatePercent || 0}%
            </span>
            <span className="font-mono text-xs text-zinc-500 ml-1.5">tỷ lệ hoàn thành</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 font-mono">Dựa trên sự kiện phát COMPLETE</p>
        </div>

        <div className="p-4 rounded-xl border border-[#222432] bg-[#12131a] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase font-semibold">Hoạt Động 24 Giờ Qua</span>
            <TrendingUp className="h-4 w-4 text-[#ff5500]" />
          </div>
          <div className="mt-2.5">
            <span className="font-graphik text-2xl font-bold text-[#ff5500] tracking-tight">
              {summary?.sessionsLast24h?.toLocaleString("vi-VN") || 0}
            </span>
            <span className="font-mono text-xs text-zinc-500 ml-1.5">phiên phát sinh</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 font-mono">Phiên nghe phát sinh trong ngày</p>
        </div>
      </div>

      {/* ================= 3. FILTER & SEARCH ================= */}
      <div className="p-4 rounded-2xl border border-[#222432] bg-[#12131a] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên bài hát, ca sĩ, @username..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#171822] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff5500]/50 font-mono"
          />
        </form>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0">
          {/* Completion Filter */}
          <select
            value={completionFilter}
            onChange={(e) => setCompletionFilter(e.target.value as "ALL" | "COMPLETED" | "DROPPED")}
            className="px-3 py-1.5 rounded-xl bg-[#171822] border border-white/10 text-xs text-zinc-300 font-mono focus:outline-none shrink-0"
          >
            <option value="ALL">Tất cả tỷ lệ nghe</option>
            <option value="COMPLETED">Hoàn thành &ge; 75%</option>
            <option value="DROPPED">Bỏ dở sớm &lt; 40%</option>
          </select>

          {/* Device Filter */}
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#171822] border border-white/10 text-xs text-zinc-300 font-mono focus:outline-none shrink-0"
          >
            <option value="ALL">Mọi thiết bị</option>
            <option value="WEB">Web Browser</option>
            <option value="ANDROID">Android</option>
            <option value="IOS">iOS</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#171822] border border-white/10 text-xs text-zinc-300 font-mono focus:outline-none shrink-0"
          >
            <option value="ALL">Mọi nguồn phát</option>
            <option value="HOME">Trang chủ</option>
            <option value="SEARCH">Tìm kiếm</option>
            <option value="EMOTION">Gợi ý cảm xúc (AI)</option>
            <option value="PLAYLIST">Playlist</option>
            <option value="ALBUM">Album</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-[#171822] border border-white/10 text-xs text-zinc-300 font-mono focus:outline-none shrink-0"
          >
            <option value={15}>15 dòng</option>
            <option value={20}>20 dòng</option>
            <option value={50}>50 dòng</option>
          </select>
        </div>
      </div>

      {/* ================= 4. MAIN SESSIONS TABLE ================= */}
      <div className="rounded-2xl border border-[#222432] bg-[#12131a] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#222432] bg-[#171822]/80 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="px-5 py-3.5">Mã Phiên</th>
                <th className="px-5 py-3.5">Người Nghe</th>
                <th className="px-5 py-3.5">Bài Hát</th>
                <th className="px-5 py-3.5">Thời Lượng Nghe</th>
                <th className="px-5 py-3.5">Tỷ Lệ Hoàn Thành</th>
                <th className="px-5 py-3.5">Nguồn Phát</th>
                <th className="px-5 py-3.5">Thiết Bị</th>
                <th className="px-5 py-3.5">Thời Điểm</th>
                <th className="px-5 py-3.5 text-right">Lưu Vết SK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222432]">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center text-zinc-500 font-mono">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#ff5500] border-t-transparent mb-2" />
                    <p>Đang đối soát lịch sử nghe nhạc...</p>
                  </td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-zinc-500 font-mono italic">
                    Không tìm thấy phiên nghe nhạc nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                displayedItems.map((session) => {
                  const trackSec = parseDurationToSeconds(session.totalDuration);
                  const completionRate = trackSec > 0
                    ? Math.min(100, Math.round((session.listenedDurationSeconds / trackSec) * 100))
                    : 100;
                  const isCompleted = completionRate >= 75;
                  const isDroppedEarly = completionRate < 40;

                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* ID */}
                      <td className="px-5 py-3.5 font-mono text-zinc-400 font-semibold">
                        #{session.id}
                      </td>

                      {/* Listener */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 shrink-0 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-white text-[11px]">
                            {session.fullName ? session.fullName.charAt(0) : "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate max-w-[130px]">
                              {session.fullName}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500 truncate">
                              @{session.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Track */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-900">
                            {session.coverUrl ? (
                              <img
                                src={session.coverUrl}
                                alt={session.trackTitle}
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
                              {session.trackTitle}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate max-w-[170px]">
                              {session.artistName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-5 py-3.5 font-mono">
                        <div className="font-bold text-emerald-400">
                          {formatDuration(session.listenedDurationSeconds)}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Độ dài bài: {session.totalDuration || "3:30"}
                        </div>
                      </td>

                      {/* Completion Rate with Progress Bar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-between gap-2 font-mono text-xs mb-1">
                          <span
                            className={`font-bold ${
                              isCompleted
                                ? "text-emerald-400"
                                : isDroppedEarly
                                ? "text-rose-400"
                                : "text-amber-400"
                            }`}
                          >
                            {completionRate}%
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {isCompleted ? "Trọn vẹn" : isDroppedEarly ? "Bỏ dở sớm" : "Một phần"}
                          </span>
                        </div>
                        <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCompleted
                                ? "bg-emerald-400"
                                : isDroppedEarly
                                ? "bg-rose-400"
                                : "bg-amber-400"
                            }`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getSourceBadge(session.source)}
                      </td>

                      {/* Device */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getDeviceBadge(session.deviceType)}
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-3.5 font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                        {session.startedAt}
                      </td>

                      {/* Action to view detailed events */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEventsModal(session)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#171822] hover:bg-white/10 border border-white/10 text-[11px] font-mono text-zinc-300 hover:text-white transition cursor-pointer"
                        >
                          <Activity className="h-3 w-3 text-[#ff5500]" />
                          <span>{session.eventCount} SK</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
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

      {/* ================= 5. SESSION EVENTS MODAL ================= */}
      {selectedSession && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm anim-fade-in">
            <div className="relative w-full max-w-2xl rounded-2xl border border-[#222432] bg-[#171822] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-graphik text-base font-bold text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#ff5500]" />
                    Lưu Vết Chi Tiết Phiên Nghe #{selectedSession.id}
                  </h3>
                  <p className="font-mono text-xs text-zinc-400 mt-0.5">
                    Bài hát: <strong className="text-white">{selectedSession.trackTitle}</strong> · Người nghe: @{selectedSession.username}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Session Overview Mini Box */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#12131a] border border-white/8 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Thời Lượng Nghe</span>
                  <span className="font-bold text-emerald-400">
                    {formatDuration(selectedSession.listenedDurationSeconds)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Thiết Bị</span>
                  <span className="font-semibold text-white">{selectedSession.deviceType}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Nguồn Phát</span>
                  <span className="font-semibold text-white">{selectedSession.source}</span>
                </div>
              </div>

              {/* Events Timeline */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Chuỗi Sự Kiện Playback ({sessionEvents.length} sự kiện)
                </h4>

                {isLoadingEvents ? (
                  <div className="py-12 text-center text-zinc-400 font-mono text-xs">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#ff5500] border-t-transparent mb-2" />
                    <p>Đang tải chuỗi sự kiện...</p>
                  </div>
                ) : sessionEvents.length === 0 ? (
                  <div className="py-10 text-center text-zinc-500 font-mono text-xs italic bg-[#12131a] rounded-xl border border-white/5">
                    Không ghi nhận sự kiện con trong phiên này.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessionEvents.map((evt, idx) => (
                      <div
                        key={evt.id || idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#12131a] border border-white/5 text-xs font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-600 font-bold text-[11px] w-5 text-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-white px-2 py-0.5 rounded bg-white/5 border border-white/10">
                            {evt.eventType}
                          </span>
                          <span className="text-zinc-400">
                            Tại mốc: <strong className="text-zinc-200">{formatDuration(evt.positionSeconds)}</strong>
                            {evt.targetPositionSeconds && evt.targetPositionSeconds > 0 ? (
                              <span className="text-purple-300 ml-1">
                                &rarr; Tua đến {formatDuration(evt.targetPositionSeconds)}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500">{evt.occurredAt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
