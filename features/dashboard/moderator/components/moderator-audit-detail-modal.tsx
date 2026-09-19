"use client";

import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  Disc3,
} from "lucide-react";
import { ModerationHistoryItem } from "../types";
import { ModeratorTrackCover } from "./moderator-track-cover";

type ModeratorAuditDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  item: ModerationHistoryItem | null;
};

export function ModeratorAuditDetailModal({
  isOpen,
  onClose,
  item,
}: ModeratorAuditDetailModalProps) {
  if (!isOpen || !item) return null;

  const isApproved = item.decision === "approved";
  const isRejected = item.decision === "rejected";
  const isRevision = item.decision === "needs_revision";

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m} phút ${s} giây`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-[26px] border border-white/12 bg-[#11131a] p-6 md:p-7 shadow-[0_32px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
              <Disc3 className="h-5 w-5 text-[#ff8b4d]" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-white">
                Chi Tiết Phiên Thẩm Định
              </h3>
              <p className="text-[12px] text-white/50">Mã phiên: {item.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {/* Track Summary */}
          <div className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
            <ModeratorTrackCover
              coverUrl={item.coverUrl}
              title={item.trackTitle}
              size="md"
            />
            <div>
              <h4 className="text-[15px] font-semibold text-white">
                {item.trackTitle}
              </h4>
              <p className="text-[13px] text-white/70">{item.artistName}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/60">
                  {item.genre}
                </span>
                {item.assignedExplicitTag && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                    EXPLICIT
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Decision Status Pill */}
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <span className="text-[12px] text-white/50">Kết quả đánh giá:</span>
            {isApproved && (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[12px] font-medium text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Đã phê duyệt
              </span>
            )}
            {isRejected && (
              <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[12px] font-medium text-red-400">
                <XCircle className="h-3.5 w-3.5" />
                Đã từ chối
              </span>
            )}
            {isRevision && (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[12px] font-medium text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" />
                Yêu cầu chỉnh sửa
              </span>
            )}
          </div>

          {/* Reason / Rejection Feedback if any */}
          {item.rejectionReason && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-red-400/80 font-medium">
                Nguyên nhân từ chối / phản hồi:
              </p>
              <p className="mt-1 text-[13px] text-white/90 leading-relaxed">
                {item.rejectionReason}
              </p>
            </div>
          )}

          {/* Internal Notes */}
          {item.internalNote && (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">
                Ghi chú nội bộ kiểm duyệt:
              </p>
              <p className="mt-1 text-[13px] text-white/80">
                {item.internalNote}
              </p>
            </div>
          )}

          {/* Audit Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-2.5">
              <div className="flex items-center gap-1.5 text-white/40">
                <User className="h-3.5 w-3.5" />
                <span>Kiểm duyệt viên</span>
              </div>
              <p className="mt-1 font-medium text-white">{item.reviewerName}</p>
            </div>

            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-2.5">
              <div className="flex items-center gap-1.5 text-white/40">
                <Clock className="h-3.5 w-3.5" />
                <span>Thời gian nghe thử</span>
              </div>
              <p className="mt-1 font-medium text-white">
                {formatSecs(item.reviewDurationSec)}
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-white/6 bg-white/[0.02] p-2.5">
              <div className="flex items-center gap-1.5 text-white/40">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Thời điểm thực hiện</span>
              </div>
              <p className="mt-1 font-medium text-white">{item.reviewedAt}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-white/8 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 px-5 py-2 text-[13px] font-medium text-white hover:bg-white/15 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
