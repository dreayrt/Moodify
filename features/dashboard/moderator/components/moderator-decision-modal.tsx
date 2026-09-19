"use client";

import { useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
} from "lucide-react";
import { ModerationTrack, ViolationCategory } from "../types";

type ModeratorDecisionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  track: ModerationTrack;
  actionType: "approve" | "reject" | "needs_revision";
  onSubmitDecision: (payload: {
    actionType: "approve" | "reject" | "needs_revision";
    violationCategory?: ViolationCategory;
    rejectionReason?: string;
    internalNote?: string;
    explicitTag?: boolean;
  }) => Promise<void> | void;
};

const VIOLATION_OPTIONS: { category: ViolationCategory; label: string; desc: string }[] = [
  {
    category: "copyright_infringement",
    label: "Vi phạm bản quyền tác quyền / Content ID",
    desc: "Sử dụng beat, sample hoặc vocal stem chưa được cấp phép sở hữu.",
  },
  {
    category: "poor_audio_quality",
    label: "Chất lượng âm thanh không đạt chuẩn",
    desc: "File bị vỡ tiếng (clipping), méo dải tần, bitrate thấp dưới 320kbps.",
  },
  {
    category: "hate_speech_offensive",
    label: "Ngôn từ thù địch / Vi phạm tiêu chuẩn",
    desc: "Lời bài hát chứa nội dung kích động bạo lực, xúc phạm danh dự.",
  },
  {
    category: "explicit_unlabeled",
    label: "Nội dung người lớn nhưng chưa gắn Explicit",
    desc: "Bài hát có từ ngữ 18+ nhưng nghệ sĩ khai báo là bản nhạc phổ thông.",
  },
  {
    category: "metadata_mismatch",
    label: "Sai lệch thông tin metadata / Cover Art",
    desc: "Ảnh bìa có watermark, tên nghệ sĩ hoặc thể loại sai lệch thực tế.",
  },
  {
    category: "other",
    label: "Lý do kiểm duyệt khác",
    desc: "Các trường hợp đặc thù theo quy chế kiểm duyệt nội dung Moodify.",
  },
];

export function ModeratorDecisionModal({
  isOpen,
  onClose,
  track,
  actionType,
  onSubmitDecision,
}: ModeratorDecisionModalProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<ViolationCategory>("copyright_infringement");
  const [rejectionReason, setRejectionReason] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [assignExplicit, setAssignExplicit] = useState(
    track.explicitFlagByArtist || track.aiAssessment.explicitLyricsDetected
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isApprove = actionType === "approve";
  const isReject = actionType === "reject";
  const isRevision = actionType === "needs_revision";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmitDecision({
        actionType,
        violationCategory: isApprove ? undefined : selectedCategory,
        rejectionReason: isApprove ? undefined : rejectionReason,
        internalNote,
        explicitTag: assignExplicit,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-[26px] border border-white/12 bg-[#11131a] p-6 md:p-8 shadow-[0_32px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3">
            {isApprove && (
              <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
            {isReject && (
              <div className="grid h-10 w-10 place-items-center rounded-full bg-red-500/15 text-red-400">
                <XCircle className="h-5 w-5" />
              </div>
            )}
            {isRevision && (
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ff7a2c]/15 text-[#ffb488]">
                <AlertCircle className="h-5 w-5" />
              </div>
            )}
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                {isApprove && "Xác Nhận Phê Duyệt Bài Hát"}
                {isReject && "Từ Chối Bài Hát & Báo Cáo Vi Phạm"}
                {isRevision && "Yêu Cầu Nghệ Sĩ Chỉnh Sửa"}
              </h2>
              <p className="text-[12px] text-white/50">
                {track.title} • {track.artist}
              </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Approve Mode Options */}
          {isApprove && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-[13px] text-emerald-300/90 leading-relaxed">
                Bài hát sẽ được xuất bản công khai lên kho nhạc Moodify và thông
                báo chúc mừng sẽ được gửi trực tiếp đến nghệ sĩ qua email và hệ
                thống.
              </div>

              {/* Explicit Content Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                <div>
                  <p className="text-[13px] font-medium text-white">
                    Gán nhãn Explicit Content (18+)
                  </p>
                  <p className="text-[11px] text-white/50">
                    Bật nhãn này nếu bài hát có ca từ nhạy cảm hoặc chủ đề người lớn.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={assignExplicit}
                    onChange={(e) => setAssignExplicit(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#ff7a2c] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </label>
              </div>

              {/* Internal Note */}
              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Ghi chú nội bộ thẩm định (Tùy chọn)
                </label>
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Nhập ghi chú cho đội ngũ QA hoặc ca trực sau..."
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[13px] text-white placeholder-white/30 focus:border-[#ff7a2c] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Reject or Revision Mode Options */}
          {(isReject || isRevision) && (
            <div className="space-y-4">
              {/* Category Dropdown/Selector */}
              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Nhóm vi phạm chính
                </label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {VIOLATION_OPTIONS.map((opt) => {
                    const isSelected = selectedCategory === opt.category;
                    return (
                      <button
                        key={opt.category}
                        type="button"
                        onClick={() => setSelectedCategory(opt.category)}
                        className={`flex flex-col text-left rounded-xl border p-2.5 transition ${
                          isSelected
                            ? "border-red-500/50 bg-red-500/10 text-white shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                            : "border-white/8 bg-white/[0.02] text-white/70 hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="text-[12px] font-medium leading-snug">
                          {opt.label}
                        </span>
                        <span className="mt-0.5 text-[10px] text-white/40 line-clamp-2">
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reason / Feedback message to Artist */}
              <div>
                <label className="flex items-center justify-between text-[12px] font-medium text-white/70">
                  <span>Lời nhắn giải thích gửi nghệ sĩ (Bắt buộc)</span>
                  <span className="text-[10px] text-white/40">
                    Sẽ gửi trực tiếp qua email
                  </span>
                </label>
                <textarea
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={
                    isReject
                      ? "Mô tả chi tiết nguyên nhân vi phạm và căn cứ kiểm duyệt để nghệ sĩ hiểu rõ..."
                      : "Chỉ rõ phần cần upload lại (ví dụ: cần re-master lại dải cao, cập nhật lại cover art chuẩn 3000x3000px)..."
                  }
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[13px] text-white placeholder-white/30 focus:border-red-500/50 focus:outline-none"
                />
              </div>

              {/* Internal Note */}
              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Ghi chú nội bộ cho ban quản trị
                </label>
                <input
                  type="text"
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Ví dụ: AI Content ID khớp 84% với track gốc..."
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder-white/30 focus:border-white/25 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Bottom Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/8 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-4 py-2 text-[13px] text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Hủy bỏ
            </button>

            {isApprove && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2 text-[13px] font-medium text-white shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSubmitting ? "Đang xử lý..." : "Xác nhận duyệt"}</span>
              </button>
            )}

            {isReject && (
              <button
                type="submit"
                disabled={isSubmitting || !rejectionReason.trim()}
                className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-2 text-[13px] font-medium text-white shadow-[0_4px_16px_rgba(220,38,38,0.35)] transition hover:bg-red-500 active:scale-95 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                <span>{isSubmitting ? "Đang gửi..." : "Từ chối phát hành"}</span>
              </button>
            )}

            {isRevision && (
              <button
                type="submit"
                disabled={isSubmitting || !rejectionReason.trim()}
                className="flex items-center gap-2 rounded-full bg-[#ff7a2c] px-6 py-2 text-[13px] font-medium text-white shadow-[0_4px_16px_rgba(255,122,44,0.35)] transition hover:bg-[#ff8f50] active:scale-95 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? "Đang gửi..." : "Yêu cầu sửa"}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
