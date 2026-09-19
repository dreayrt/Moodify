"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileAudio,
  FileCheck2,
  FileText,
  Filter,
  History,
  Music,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { ReviewAction, ReviewRequest } from "../types";
import { resolveAudioStreamUrl } from "./shared/admin-audio-player-dock";
import { ModalPortal } from "./shared/modal-portal";

type ModerationTabProps = {
  reviews: ReviewRequest[];
  reviewActions: ReviewAction[];
  onApproveReview: (requestId: number) => void;
  onRejectReview: (requestId: number, reason: string) => void;
  onReturnReview: (requestId: number, reason: string) => void;
};

export function ModerationTab({
  reviews,
  reviewActions,
  onApproveReview,
  onRejectReview,
  onReturnReview,
}: ModerationTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedReview, setSelectedReview] = useState<ReviewRequest | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Audio player state
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredReviews = reviews.filter((r) => {
    if (statusFilter === "ALL") return true;
    return r.status === statusFilter;
  });

  const togglePlayAudio = (review: ReviewRequest) => {
    const streamUrl = resolveAudioStreamUrl(review.audioUrl);

    if (playingId === review.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.crossOrigin = "anonymous";
        audioRef.current.src = streamUrl;
        audioRef.current.load();
        audioRef.current.play().catch((err) => {
          console.warn("Audio play error in moderation tab:", err);
        });
      }
      setPlayingId(review.id);
    }
  };

  const handleOpenReturnModal = (review: ReviewRequest) => {
    setSelectedReview(review);
    setReturnReason("Ảnh bìa hoặc chất lượng master chưa đạt tiêu chuẩn. Vui lòng cập nhật lại.");
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = () => {
    if (!selectedReview) return;
    onReturnReview(selectedReview.id, returnReason);
    setIsReturnModalOpen(false);
    setSelectedReview(null);
  };

  const handleOpenRejectModal = (review: ReviewRequest) => {
    setSelectedReview(review);
    setRejectReason("Nội dung vi phạm quyền sở hữu trí tuệ hoặc tiêu chuẩn kiểm duyệt âm nhạc.");
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedReview) return;
    onRejectReview(selectedReview.id, rejectReason);
    setIsRejectModalOpen(false);
    setSelectedReview(null);
  };

  return (
    <div className="space-y-8 anim-fade-in">
      {/* Hidden Audio Player for Preview */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-graphik text-[26px] font-semibold text-white">Kiểm Duyệt & Bản Quyền Nội Dung</h2>
          <p className="mt-1 text-[13px] text-white/50">
            Hàng đợi kiểm duyệt bài hát/album mới từ Nghệ sĩ (`content_review_requests`) & Nhật ký kiểm duyệt viên (`content_review_actions`).
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "PENDING", "IN_REVIEW", "APPROVED", "REJECTED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
                statusFilter === st
                  ? "bg-[#ff7a2c] text-black"
                  : "border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
              }`}
            >
              {st === "ALL"
                ? "Tất cả"
                : st === "PENDING"
                ? "Chờ duyệt"
                : st === "IN_REVIEW"
                ? "Đang duyệt"
                : st === "APPROVED"
                ? "Đã duyệt"
                : "Từ chối"}
            </button>
          ))}
        </div>
      </div>

      {/* Review Queue Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {filteredReviews.length === 0 ? (
          <div className="col-span-2 rounded-[24px] border border-white/8 bg-white/[0.02] py-14 text-center text-white/40">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400/50 mb-3" />
            <p className="text-[14px]">Hiện không có yêu cầu nào trong hàng đợi trạng thái này.</p>
          </div>
        ) : (
          filteredReviews.map((item) => {
            const isPlaying = playingId === item.id;

            return (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-[26px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition hover:border-white/14"
              >
                {/* Top Strip */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="relative group">
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="h-16 w-16 rounded-[16px] object-cover border border-white/10 shadow-md"
                      />
                      {item.audioUrl && (
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(item)}
                          className="absolute inset-0 grid place-items-center rounded-[16px] bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {isPlaying ? (
                            <Pause className="h-6 w-6 text-[#ff7a2c]" />
                          ) : (
                            <Play className="h-6 w-6 text-white ml-0.5" />
                          )}
                        </button>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase font-semibold text-white/70">
                          {item.contentType} · {item.requestType}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.status === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : item.status === "PENDING"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                              : item.status === "IN_REVIEW"
                              ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <h3 className="mt-1 font-graphik text-[17px] font-semibold text-white">{item.title}</h3>
                      <p className="text-[12px] text-white/50">
                        Nghệ sĩ: <span className="text-white/80 font-medium">{item.artistName}</span> · Thể loại: {item.genre}
                      </p>
                    </div>
                  </div>

                  {item.audioUrl && (
                    <button
                      type="button"
                      onClick={() => togglePlayAudio(item)}
                      className={`grid h-10 w-10 place-items-center rounded-full border transition ${
                        isPlaying
                          ? "border-[#ff7a2c] bg-[#ff7a2c]/20 text-[#ff7a2c]"
                          : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                      }`}
                      title={isPlaying ? "Tạm dừng nghe thử" : "Nghe thử bản master"}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </button>
                  )}
                </div>

                {/* Audio Features Indicators */}
                {item.audioFeatures && (
                  <div className="mt-4 rounded-[18px] border border-white/6 bg-black/25 p-3 text-[11px]">
                    <div className="flex items-center justify-between text-white/44 mb-2">
                      <span className="font-semibold uppercase tracking-wider text-[#ffb488]">Chỉ Số Âm Học (Audio Features)</span>
                      <span>Key: {item.audioFeatures.keySignature}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="rounded-[10px] bg-white/[0.03] p-1.5 border border-white/6">
                        <p className="text-white/40">BPM</p>
                        <p className="font-graphik font-semibold text-white">{item.audioFeatures.bpm}</p>
                      </div>
                      <div className="rounded-[10px] bg-white/[0.03] p-1.5 border border-white/6">
                        <p className="text-white/40">Energy</p>
                        <p className="font-graphik font-semibold text-white">{Math.round(item.audioFeatures.energy * 100)}%</p>
                      </div>
                      <div className="rounded-[10px] bg-white/[0.03] p-1.5 border border-white/6">
                        <p className="text-white/40">Dance</p>
                        <p className="font-graphik font-semibold text-white">{Math.round(item.audioFeatures.danceability * 100)}%</p>
                      </div>
                      <div className="rounded-[10px] bg-white/[0.03] p-1.5 border border-white/6">
                        <p className="text-white/40">Valence</p>
                        <p className="font-graphik font-semibold text-white">{Math.round(item.audioFeatures.valence * 100)}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lyrics Excerpt */}
                {item.lyricsPlain && (
                  <p className="mt-3 text-[12px] italic text-white/50 line-clamp-2">
                    &ldquo;{item.lyricsPlain.replace(/\n/g, " ")}&rdquo;
                  </p>
                )}

                {/* Action Controls */}
                <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-3.5">
                  <span className="text-[11px] text-white/40">Gửi lúc: {item.submittedAt}</span>

                  <div className="flex items-center gap-2">
                    {item.status !== "APPROVED" && (
                      <button
                        type="button"
                        onClick={() => onApproveReview(item.id)}
                        className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-emerald-500"
                      >
                        Phê duyệt
                      </button>
                    )}

                    {item.status !== "REJECTED" && (
                      <button
                        type="button"
                        onClick={() => handleOpenReturnModal(item)}
                        className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[12px] text-amber-300 transition hover:bg-amber-500/20"
                      >
                        Yêu cầu sửa
                      </button>
                    )}

                    {item.status !== "REJECTED" && (
                      <button
                        type="button"
                        onClick={() => handleOpenRejectModal(item)}
                        className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[12px] text-rose-300 transition hover:bg-rose-500/20"
                      >
                        Từ chối
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Section 2: Moderator Actions Audit Log */}
      <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-graphik text-[20px] font-semibold text-white">Nhật Ký Kiểm Duyệt Viên (`content_review_actions`)</h3>
            <p className="mt-1 text-[13px] text-white/50">Lịch sử các quyết định duyệt/từ chối của Moderator để audit kiểm toán</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] text-white/70">
            {reviewActions.length} thao tác
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-white/8 text-[11px] uppercase tracking-[0.14em] text-white/44">
              <tr>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3">Kiểm duyệt viên</th>
                <th className="py-3 px-3">Hành động</th>
                <th className="py-3 px-3">Mã yêu cầu</th>
                <th className="py-3 px-3">Lý do / Phản hồi ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 text-white/75">
              {reviewActions.map((act) => (
                <tr key={act.id}>
                  <td className="py-3 px-3 text-white/50 text-[12px]">{act.createdAt}</td>
                  <td className="py-3 px-3 font-medium text-white">{act.moderatorName}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        act.action === "APPROVE"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : act.action === "REJECT"
                          ? "bg-rose-500/15 text-rose-400"
                          : act.action === "RETURN_FOR_EDIT"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-sky-500/15 text-sky-400"
                      }`}
                    >
                      {act.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[12px] font-mono text-white/50">REQ-00{act.reviewRequestId}</td>
                  <td className="py-3 px-3 text-white/70">{act.reason || "Không có ghi chú"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: RETURN FOR EDIT ================= */}
      {isReturnModalOpen && selectedReview && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-sm anim-fade-in">
            <div className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[26px] border border-white/12 bg-[#121316] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <h3 className="font-graphik text-[18px] font-semibold text-white">Yêu Cầu Nghệ Sĩ Bổ Sung / Chỉnh Sửa</h3>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-[13px]">
              <p className="text-white/70">
                Bài hát: <strong className="text-white">{selectedReview.title}</strong>
              </p>
              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Phản hồi chi tiết cho Nghệ sĩ <span className="text-amber-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Ghi rõ phần cần sửa đổi (ảnh bìa mờ, lời bài hát chưa chuẩn, âm lượng master vượt ngưỡng...)"
                  className="mt-1.5 w-full rounded-[14px] border border-white/10 bg-black/40 p-3 text-[13px] text-white placeholder-white/30 outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/8 pt-4">
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="rounded-full px-4 py-2 text-[13px] text-white/60 hover:text-white"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                className="rounded-full bg-amber-600 px-5 py-2 text-[13px] font-medium text-black transition hover:bg-amber-500"
              >
                Gửi Yêu Cầu Sửa Đổi
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* ================= MODAL: REJECT ================= */}
      {isRejectModalOpen && selectedReview && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-sm anim-fade-in">
            <div className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[26px] border border-white/12 bg-[#121316] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <h3 className="font-graphik text-[18px] font-semibold text-rose-400">Từ Chối Phát Hành Bài Hát</h3>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-[13px]">
              <p className="text-white/70">
                Bài hát: <strong className="text-white">{selectedReview.title}</strong>
              </p>
              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Lý do từ chối phát hành <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ghi rõ vi phạm (Bản quyền tác phẩm, ca từ thù địch, spam nội dung...)"
                  className="mt-1.5 w-full rounded-[14px] border border-white/10 bg-black/40 p-3 text-[13px] text-white placeholder-white/30 outline-none focus:border-rose-500/60"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/8 pt-4">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="rounded-full px-4 py-2 text-[13px] text-white/60 hover:text-white"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="rounded-full bg-rose-600 px-5 py-2 text-[13px] font-medium text-white transition hover:bg-rose-500"
              >
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}
    </div>
  );
}
