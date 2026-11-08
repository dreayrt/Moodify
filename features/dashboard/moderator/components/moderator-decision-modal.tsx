"use client";

import { useEffect, useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ModerationTrack, ViolationCategory } from "../types";

type ModeratorDecisionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  track: ModerationTrack;
  actionType: "approve" | "reject";
  onSubmitDecision: (payload: {
    actionType: "approve" | "reject";
    rejectionReason?: string;
    internalNote?: string;
    explicitTag?: boolean;
  }) => Promise<void> | void;
};

const VIOLATION_OPTIONS: { category: ViolationCategory; label: string }[] = [
  {
    category: "copyright_infringement",
    label: "Vi phạm bản quyền tác quyền / Content ID",
  },
  {
    category: "poor_audio_quality",
    label: "Chất lượng âm thanh không đạt chuẩn",
  },
  {
    category: "hate_speech_offensive",
    label: "Ngôn từ thù địch / Vi phạm tiêu chuẩn",
  },
  {
    category: "explicit_unlabeled",
    label: "Nội dung người lớn nhưng chưa gắn Explicit",
  },
  {
    category: "metadata_mismatch",
    label: "Sai lệch thông tin metadata / Cover Art",
  },
  {
    category: "artist_impersonation",
    label: "Mạo danh nghệ sĩ / giả giọng trái phép",
  },
  {
    category: "violent_or_dangerous_content",
    label: "Đe dọa, kích động bạo lực hoặc hành vi nguy hiểm",
  },
  {
    category: "harassment_or_privacy_violation",
    label: "Quấy rối cá nhân / tiết lộ thông tin riêng tư",
  },
  {
    category: "spam_or_deceptive_content",
    label: "Spam, lừa đảo hoặc nội dung gây hiểu nhầm",
  },
  {
    category: "non_compliant_cover_art",
    label: "Ảnh bìa có hình ảnh tình dục hoặc bạo lực đồ họa",
  },
  {
    category: "other",
    label: "Lý do kiểm duyệt khác",
  },
];

export function ModeratorDecisionModal({
  isOpen,
  onClose,
  track,
  actionType,
  onSubmitDecision,
}: ModeratorDecisionModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<
    ViolationCategory[]
  >([]);
  const [internalNote, setInternalNote] = useState("");
  const [assignExplicit, setAssignExplicit] = useState(
    track.explicitFlagByArtist || track.aiAssessment.explicitLyricsDetected
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedCategories([]);
    setInternalNote("");
    setAssignExplicit(
      track.explicitFlagByArtist || track.aiAssessment.explicitLyricsDetected
    );
  }, [
    actionType,
    isOpen,
    track.id,
    track.explicitFlagByArtist,
    track.aiAssessment.explicitLyricsDetected,
  ]);

  if (!isOpen) return null;

  const isApprove = actionType === "approve";
  const isReject = actionType === "reject";

  const toggleViolationCategory = (category: ViolationCategory) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((selected) => selected !== category)
        : [...current, category]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmitDecision({
        actionType,
        rejectionReason: isReject
          ? VIOLATION_OPTIONS.filter((option) =>
              selectedCategories.includes(option.category)
            )
              .map((option) => option.label)
              .join("; ")
          : undefined,
        internalNote: isApprove ? internalNote : undefined,
        explicitTag: assignExplicit,
      });
      onClose();
    } catch {
      // The parent displays the request error; keep the modal open for a retry.
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
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[26px] border border-white/12 bg-[#11131a] p-6 shadow-[0_32px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all md:p-8">
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
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                {isApprove && "Xác Nhận Phê Duyệt Bài Hát"}
                {isReject && "Từ Chối Bài Hát & Báo Cáo Vi Phạm"}
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

          {/* Reject Mode Options */}
          {isReject && (
            <div className="space-y-4">
              <fieldset>
                <legend className="text-[12px] font-medium text-white/70">
                  Chọn lý do từ chối
                </legend>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {VIOLATION_OPTIONS.map((opt) => {
                    const isSelected = selectedCategories.includes(
                      opt.category
                    );
                    return (
                      <label
                        key={opt.category}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${
                          isSelected
                            ? "border-red-500/50 bg-red-500/10 text-white"
                            : "border-white/8 bg-white/[0.02] text-white/70 hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleViolationCategory(opt.category)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-red-500"
                        />
                        <span className="text-[12px] font-medium leading-snug">
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
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
                disabled={isSubmitting || selectedCategories.length === 0}
                className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-2 text-[13px] font-medium text-white shadow-[0_4px_16px_rgba(220,38,38,0.35)] transition hover:bg-red-500 active:scale-95 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                <span>{isSubmitting ? "Đang gửi..." : "Từ chối phát hành"}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
