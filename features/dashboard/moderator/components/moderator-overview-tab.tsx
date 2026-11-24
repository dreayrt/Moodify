"use client";

import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ArrowUpRight,
  ChevronRight,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { ModerationStats, ModerationTrack } from "../types";
import { ModeratorTrackCover } from "./moderator-track-cover";

type ModeratorOverviewTabProps = {
  stats: ModerationStats;
  urgentTracks: ModerationTrack[];
  onSelectTrackForReview: (track: ModerationTrack) => void;
  onNavigateToQueue: () => void;
};

export function ModeratorOverviewTab({
  stats,
  urgentTracks,
  onSelectTrackForReview,
  onNavigateToQueue,
}: ModeratorOverviewTabProps) {
  const todayTotal = stats.approvedToday + stats.rejectedToday;

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Đang chờ duyệt */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 transition hover:border-white/15">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#ff7a2c]/20 bg-[#ff7a2c]/10 text-[#ff8b4d]">
              <Clock className="h-5 w-5" />
            </div>
            {stats.urgentCount > 0 && (
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-red-400 tabular-nums">
                {stats.urgentCount} ưu tiên
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="font-display text-3xl font-bold tracking-tight text-white tabular-nums">
              {stats.pendingCount}
            </p>
            <p className="mt-1 text-xs text-white/55">
              Đang chờ duyệt
            </p>
          </div>
        </div>

        {/* Card 2: Đã duyệt hôm nay */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 transition hover:border-white/15">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            {todayTotal > 0 && (
              <span className="text-xs font-medium text-emerald-400 tabular-nums">
                {stats.approvalPercentage}% tỷ lệ duyệt
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="font-display text-3xl font-bold tracking-tight text-white tabular-nums">
              {stats.approvedToday}
            </p>
            <p className="mt-1 text-xs text-white/55">
              Đã duyệt hôm nay
            </p>
          </div>
        </div>

        {/* Card 3: Đã từ chối hôm nay */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 transition hover:border-white/15">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-display text-3xl font-bold tracking-tight text-white tabular-nums">
              {stats.rejectedToday}
            </p>
            <p className="mt-1 text-xs text-white/55">
              Đã từ chối hôm nay
            </p>
          </div>
        </div>

        {/* Card 4: Thời gian duyệt trung bình */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 transition hover:border-white/15">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-400">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-display text-3xl font-bold tracking-tight text-white tabular-nums">
              {stats.avgReviewTimeMinutes > 0 ? stats.avgReviewTimeMinutes : "—"}
              {stats.avgReviewTimeMinutes > 0 && (
                <span className="ml-1 text-base font-normal text-white/50">phút/bài</span>
              )}
            </p>
            <p className="mt-1 text-xs text-white/55">
              Thời gian duyệt trung bình
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: Violations Breakdown & Urgent Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Violations Distribution */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6">
            <h3 className="font-display text-base font-semibold text-white">
              Phân loại lý do từ chối
            </h3>
            <p className="mt-1 text-xs text-white/50">
              Tổng hợp từ các bài hát bị từ chối hoặc yêu cầu chỉnh sửa.
            </p>

            {stats.violationsDistribution && stats.violationsDistribution.length > 0 ? (
              <div className="mt-5 space-y-3.5">
                {stats.violationsDistribution.map((v) => (
                  <div key={v.category}>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium text-white/85">{v.label}</span>
                      <span className="text-white/60 tabular-nums">
                        {v.count} bài ({v.percentage}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#ff5500]"
                        style={{ width: `${v.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] py-10 text-center">
                <ShieldCheck className="mb-2 h-8 w-8 text-white/25" />
                <p className="text-[13px] text-white/65">Chưa có bài hát nào bị từ chối</p>
                <p className="mt-1 max-w-sm text-xs text-white/40">
                  Thống kê sẽ hiển thị khi có bài hát bị từ chối hoặc yêu cầu chỉnh sửa.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Urgent Queue Spotlight */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#12141c] p-6">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-400" />
                <h3 className="font-display text-base font-semibold text-white">
                  Cần xử lý trước
                </h3>
              </div>
              <span className="text-xs font-medium text-red-400 tabular-nums">
                {urgentTracks.length} bài
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {urgentTracks.length === 0 ? (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
                  <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-[13px] font-semibold text-white">Không có bài ưu tiên</p>
                  <p className="mt-1 text-xs text-white/45">
                    Hiện chưa có bài hát nào được đánh dấu cần xử lý trước.
                  </p>
                </div>
              ) : (
                urgentTracks.map((trk) => (
                  <div
                    key={trk.id}
                    onClick={() => onSelectTrackForReview(trk)}
                    className="group cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 transition hover:border-[#ff5500]/50 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center gap-3">
                      <ModeratorTrackCover
                        coverUrl={trk.coverUrl}
                        title={trk.title}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-white group-hover:text-[#ff8b4d] transition">
                          {trk.title}
                        </p>
                        <p className="truncate text-xs text-white/50">
                          {trk.artist}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Mở ${trk.title}`}
                        className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 group-hover:bg-[#ff5500] group-hover:text-white transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-white/[0.08] pt-4">
            <button
              type="button"
              onClick={onNavigateToQueue}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-[13px] font-medium text-white transition hover:bg-white/10 active:scale-[0.99] cursor-pointer"
            >
              <span>Mở hàng chờ duyệt</span>
              <ArrowUpRight className="h-4 w-4 text-[#ff8b4d]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
