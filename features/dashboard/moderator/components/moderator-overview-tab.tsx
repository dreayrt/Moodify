"use client";

import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Flame,
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
  const targetPercent =
    stats.shiftTarget > 0
      ? Math.min(
          100,
          Math.round((stats.shiftCompleted / stats.shiftTarget) * 100)
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* 4 Bento Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Hàng chờ thẩm định */}
        <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:border-white/15">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-[#ff7a2c]/20 bg-[#ff7a2c]/10 text-[#ff8b4d]">
              <Clock className="h-5 w-5" />
            </div>
            {stats.urgentCount > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                </span>
                {stats.urgentCount} khẩn cấp
              </span>
            ) : (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                Hàng chờ ổn định
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="font-display text-3xl font-bold tracking-tight text-white">
              {stats.pendingCount}
            </p>
            <p className="mt-1 text-[12px] uppercase tracking-wider text-white/50">
              Bài Hát Đang Chờ Duyệt
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3 text-[12px] text-white/40">
            <span>Thời gian chờ tối đa</span>
            <span className="font-medium text-white/70">&lt; 4 giờ</span>
          </div>
        </div>

        {/* Card 2: Đã phê duyệt hôm nay */}
        <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:border-white/15">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
              {stats.approvalPercentage}% tỷ lệ duyệt
            </span>
          </div>
          <div className="mt-4">
            <p className="font-display text-3xl font-bold tracking-tight text-white">
              {stats.approvedToday}
            </p>
            <p className="mt-1 text-[12px] uppercase tracking-wider text-white/50">
              Đã Phê Duyệt Hôm Nay
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3 text-[12px] text-white/40">
            <span>Xuất bản trực tiếp</span>
            <span className="font-medium text-emerald-400">100% On-air</span>
          </div>
        </div>

        {/* Card 3: Đã từ chối */}
        <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:border-white/15">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
              <XCircle className="h-5 w-5" />
            </div>
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-400">
              {stats.rejectedToday} ca vi phạm
            </span>
          </div>
          <div className="mt-4">
            <p className="font-display text-3xl font-bold tracking-tight text-white">
              {stats.rejectedToday}
            </p>
            <p className="mt-1 text-[12px] uppercase tracking-wider text-white/50">
              Đã Từ Chối Phát Hành
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3 text-[12px] text-white/40">
            <span>Nguyên nhân chủ yếu</span>
            <span className="font-medium text-red-400/90">
              {stats.rejectedToday > 0 ? "Bản quyền & Nội dung" : "Chưa có vi phạm"}
            </span>
          </div>
        </div>

        {/* Card 4: Tốc độ xử lý trung bình */}
        <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:border-white/15">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-400">
              <Zap className="h-5 w-5" />
            </div>
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-400">
              Đạt chuẩn KPI
            </span>
          </div>
          <div className="mt-4">
            <p className="font-display text-3xl font-bold tracking-tight text-white">
              {stats.avgReviewTimeMinutes > 0 ? stats.avgReviewTimeMinutes : "--"}
              <span className="text-lg font-normal text-white/50"> phút/bài</span>
            </p>
            <p className="mt-1 text-[12px] uppercase tracking-wider text-white/50">
              Thời Gian Thẩm Định TB
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3 text-[12px] text-white/40">
            <span>Benchmark tiêu chuẩn</span>
            <span className="font-medium text-white/70">&lt; 5.0 phút</span>
          </div>
        </div>
      </div>

      {/* Row 2: Shift Progress & Violations Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Ca trực & Phân bổ vi phạm */}
        <div className="space-y-6 lg:col-span-2">
          {/* Shift Target Progress Card */}
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-semibold text-white">
                  Mục Tiêu Ca Trực Hôm Nay
                </h3>
                <p className="text-[12px] text-white/50">
                  Hoàn thành {stats.shiftCompleted} / {stats.shiftTarget} bài hát
                  yêu cầu
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[#ff7a2c]/30 bg-[#ff7a2c]/10 px-3 py-1 text-[12px] font-semibold text-[#ff9b66]">
                <Flame className="h-4 w-4 text-[#ff7a2c]" />
                <span>{targetPercent}% Hoàn tất</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ff6b2b] via-[#ff955c] to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.max(4, targetPercent)}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-white/40">
              <span>Bắt đầu ca: 08:30</span>
              <span>Còn lại: {Math.max(0, stats.shiftTarget - stats.shiftCompleted)} bài</span>
              <span>Kết thúc ca: 17:30</span>
            </div>
          </div>

          {/* Violations Distribution */}
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
            <h3 className="font-display text-base font-semibold text-white">
              Phân Loại Các Vi Phạm Phổ Biến
            </h3>
            <p className="text-[12px] text-white/50">
              Thống kê từ các bài hát bị từ chối hoặc yêu cầu sửa đổi trong tuần
            </p>

            {stats.violationsDistribution && stats.violationsDistribution.length > 0 ? (
              <div className="mt-5 space-y-3.5">
                {stats.violationsDistribution.map((v) => (
                  <div key={v.category}>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium text-white/80">{v.label}</span>
                      <span className="font-mono text-white/60">
                        {v.count} ca ({v.percentage}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${
                          v.category === "copyright_infringement"
                            ? "bg-red-500"
                            : v.category === "poor_audio_quality"
                            ? "bg-[#ff7a2c]"
                            : v.category === "hate_speech_offensive"
                            ? "bg-amber-400"
                            : "bg-sky-400"
                        }`}
                        style={{ width: `${v.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-white/6 bg-white/[0.015] py-8 text-center">
                <ShieldCheck className="h-8 w-8 text-white/20 mb-2" />
                <p className="text-[13px] text-white/60">Chưa ghi nhận vi phạm phát hành</p>
                <p className="mt-1 text-[11px] text-white/40 max-w-sm">
                  Dữ liệu phân loại vi phạm sẽ được tự động tổng hợp khi kiểm duyệt viên gắn nhãn từ chối hoặc yêu cầu chỉnh sửa.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Urgent Queue Spotlight */}
        <div className="flex flex-col justify-between rounded-[24px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-400" />
                <h3 className="font-display text-base font-semibold text-white">
                  Ưu Tiên Khẩn Cấp
                </h3>
              </div>
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-semibold text-red-400">
                {urgentTracks.length} bài
              </span>
            </div>

            <p className="mt-3 text-[12px] text-white/50">
              Các bài hát có nghệ sĩ VIP, cờ vi phạm AI cao hoặc gần hết hạn SLA
              cần kiểm duyệt ngay lập tức.
            </p>

            <div className="mt-4 space-y-3">
              {urgentTracks.length === 0 ? (
                <div className="rounded-2xl border border-white/6 bg-white/[0.015] p-6 text-center">
                  <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-[13px] font-semibold text-white">Không có ca khẩn cấp</p>
                  <p className="mt-1 text-[11px] text-white/40">
                    Hàng chờ hiện tại không có bài hát nào bị gắn cờ ưu tiên cao hoặc quá hạn cam kết SLA.
                  </p>
                </div>
              ) : (
                urgentTracks.map((trk) => (
                  <div
                    key={trk.id}
                    onClick={() => onSelectTrackForReview(trk)}
                    className="group cursor-pointer rounded-2xl border border-white/8 bg-white/[0.02] p-3 transition hover:border-[#ff7a2c]/50 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-3">
                      <ModeratorTrackCover
                        coverUrl={trk.coverUrl}
                        title={trk.title}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-white group-hover:text-[#ff955c] transition">
                          {trk.title}
                        </p>
                        <p className="truncate text-[11px] text-white/50">
                          {trk.artist}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 group-hover:bg-[#ff7a2c] group-hover:text-white transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-white/8 pt-4">
            <button
              type="button"
              onClick={onNavigateToQueue}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-[13px] font-medium text-white transition hover:bg-white/10"
            >
              <span>Vào toàn bộ hàng chờ</span>
              <ArrowUpRight className="h-4 w-4 text-[#ff8b4d]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
