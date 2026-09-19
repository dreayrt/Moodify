"use client";

import { useState } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Music2,
} from "lucide-react";
import { ModerationTrack } from "../types";
import { ModeratorAudioPlayer } from "./moderator-audio-player";
import { ModeratorTrackCover } from "./moderator-track-cover";

type ModeratorReviewQueueTabProps = {
  tracks: ModerationTrack[];
  selectedTrack: ModerationTrack | null;
  onSelectTrack: (track: ModerationTrack) => void;
  onOpenDecisionModal: (
    track: ModerationTrack,
    actionType: "approve" | "reject" | "needs_revision"
  ) => void;
};

export function ModeratorReviewQueueTab({
  tracks,
  selectedTrack,
  onSelectTrack,
  onOpenDecisionModal,
}: ModeratorReviewQueueTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.genre.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (priorityFilter === "urgent") return t.priority === "urgent";
    if (priorityFilter === "high_risk") return t.aiAssessment.riskScore >= 50;
    if (priorityFilter === "clean") return t.aiAssessment.riskScore < 20;

    return true;
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Queue List (5 of 12 cols) */}
      <div className="space-y-4 lg:col-span-5">
        {/* Search & Filter Header */}
        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên bài, nghệ sĩ, thể loại..."
              className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2 pl-10 pr-4 text-[13px] text-white placeholder-white/30 transition focus:border-[#ff7a2c] focus:outline-none"
            />
          </div>

          {/* Quick Filter Chips */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <button
              type="button"
              onClick={() => setPriorityFilter("all")}
              className={`rounded-full px-3 py-1 font-medium transition ${
                priorityFilter === "all"
                  ? "bg-white text-black font-semibold shadow"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              Tất cả ({tracks.length})
            </button>
            <button
              type="button"
              onClick={() => setPriorityFilter("urgent")}
              className={`rounded-full px-3 py-1 font-medium transition ${
                priorityFilter === "urgent"
                  ? "bg-red-500 text-white font-semibold"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              Khẩn cấp
            </button>
            <button
              type="button"
              onClick={() => setPriorityFilter("high_risk")}
              className={`rounded-full px-3 py-1 font-medium transition ${
                priorityFilter === "high_risk"
                  ? "bg-amber-500 text-black font-semibold"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              Cảnh báo AI
            </button>
            <button
              type="button"
              onClick={() => setPriorityFilter("clean")}
              className={`rounded-full px-3 py-1 font-medium transition ${
                priorityFilter === "clean"
                  ? "bg-emerald-500 text-white font-semibold"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              An toàn cao
            </button>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="max-h-[calc(100vh-280px)] space-y-2.5 overflow-y-auto pr-1">
          {filteredTracks.length === 0 ? (
            <div className="rounded-[24px] border border-white/6 bg-white/[0.02] p-8 text-center text-white/40">
              <Music2 className="mx-auto mb-2 h-8 w-8 text-white/20" />
              <p className="text-[13px] font-medium text-white/60">
                {tracks.length === 0
                  ? "Hàng chờ kiểm duyệt đang trống"
                  : "Không tìm thấy bài hát phù hợp bộ lọc"}
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                {tracks.length === 0
                  ? "Hiện tại không có bài hát nào chờ duyệt."
                  : "Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc."}
              </p>
            </div>
          ) : (
            filteredTracks.map((t) => {
              const isSelected = selectedTrack?.id === t.id;
              const isRiskHigh = t.aiAssessment.riskScore >= 60;
              const isRiskMedium =
                t.aiAssessment.riskScore >= 25 && t.aiAssessment.riskScore < 60;

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTrack(t)}
                  className={`group relative cursor-pointer overflow-hidden rounded-[20px] border p-3.5 transition-all ${
                    isSelected
                      ? "border-[#ff7a2c] bg-white/[0.07] shadow-[0_12px_30px_rgba(255,122,44,0.15)]"
                      : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff7a2c]" />
                  )}

                  <div className="flex items-center gap-3">
                    <ModeratorTrackCover
                      coverUrl={t.coverUrl}
                      title={t.title}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-white group-hover:text-[#ff955c] transition">
                          {t.title}
                        </p>
                        {t.priority === "urgent" && (
                          <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
                            URGENT
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[12px] text-white/50">
                        {t.artist}
                      </p>

                      <div className="mt-1 flex items-center gap-2 text-[11px] text-white/40">
                        <span>{t.genre}</span>
                        <span>•</span>
                        <span>{t.duration}</span>
                      </div>
                    </div>

                    {/* AI Risk Score Pill */}
                    <div className="text-right shrink-0">
                      {isRiskHigh && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                          <ShieldAlert className="h-3 w-3" />
                          {t.aiAssessment.riskScore}%
                        </span>
                      )}
                      {isRiskMedium && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          {t.aiAssessment.riskScore}%
                        </span>
                      )}
                      {!isRiskHigh && !isRiskMedium && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          <ShieldCheck className="h-3 w-3" />
                          {t.aiAssessment.riskScore}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Deep Inspection Studio (7 of 12 cols) */}
      <div className="lg:col-span-7">
        {selectedTrack ? (
          <div className="space-y-6">
            {/* Track Hero Banner */}
            <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <ModeratorTrackCover
                  coverUrl={selectedTrack.coverUrl}
                  title={selectedTrack.title}
                  size="xl"
                  className="shadow-[0_16px_32px_rgba(0,0,0,0.5)] border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-white/70">
                      {selectedTrack.genre}
                    </span>
                    <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-white/70">
                      {selectedTrack.releaseType}
                    </span>
                    {selectedTrack.explicitFlagByArtist && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                        EXPLICIT
                      </span>
                    )}
                  </div>

                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {selectedTrack.title}
                  </h2>
                  <p className="text-[14px] text-white/70 font-medium">
                    {selectedTrack.artist}
                    {selectedTrack.artistEmail && (
                      <span className="ml-2 text-[12px] font-normal text-white/40">
                        ({selectedTrack.artistEmail})
                      </span>
                    )}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-white/50">
                    <span>
                      ISRC:{" "}
                      <span className="font-mono text-white/80">
                        {selectedTrack.isrcCode || "N/A"}
                      </span>
                    </span>
                    <span>
                      Hãng đĩa:{" "}
                      <span className="text-white/80">
                        {selectedTrack.label || "Tự phát hành"}
                      </span>
                    </span>
                    <span>Nộp lúc: {selectedTrack.submittedAt}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Review Player */}
            <ModeratorAudioPlayer track={selectedTrack} autoPlay={false} />

            {/* Copyright & Technical Profile */}
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
              <div className="flex items-center gap-2 border-b border-white/8 pb-3">
                <ShieldCheck className="h-4 w-4 text-[#ff8b4d]" />
                <h3 className="text-[13px] font-semibold text-white">
                  Hồ sơ tác quyền & Kỹ thuật
                </h3>
              </div>

                <div className="mt-4 space-y-4">
                  {/* Copyright License Box */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between border-b border-white/6 pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[#ff8b4d]" />
                        <h4 className="text-[12px] font-semibold uppercase tracking-wider text-white">
                          Hồ sơ bản quyền (MySQL song_licenses)
                        </h4>
                      </div>
                      <span className="rounded-full bg-[#ff7a2c]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#ffb488]">
                        {selectedTrack.licenseType || "DIRECT_LICENSE"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                      <div>
                        <span className="text-white/40">Chủ sở hữu quyền:</span>
                        <p className="mt-0.5 font-medium text-white">
                          {selectedTrack.copyrightOwner || "Chưa có chủ sở hữu"}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/40">Đơn vị phân phối:</span>
                        <p className="mt-0.5 font-medium text-white">
                          {selectedTrack.distributorId
                            ? `Nhà phân phối #${selectedTrack.distributorId}`
                            : "Nghệ sĩ tự phát hành trực tiếp"}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/40">Mã hợp đồng:</span>
                        <p className="mt-0.5 font-mono text-white/90">
                          {selectedTrack.distributionContractId
                            ? `#${selectedTrack.distributionContractId}`
                            : "Không có hợp đồng trung gian"}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/40">Thời hạn giấy phép:</span>
                        <p className="mt-0.5 text-white/90">
                          {selectedTrack.issueDate || "Hôm nay"} →{" "}
                          {selectedTrack.expiryDate || "Vô thời hạn (Vĩnh viễn)"}
                        </p>
                      </div>
                    </div>

                    {selectedTrack.licenseDocumentUrl && (
                      <div className="mt-3 pt-3 border-t border-white/6 flex items-center justify-between">
                        <span className="text-[11px] text-white/50">Chứng từ đính kèm:</span>
                        <a
                          href={selectedTrack.licenseDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#ff8b4d] hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Xem tệp chứng từ bản quyền</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Audio Tech Specs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
                    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">Mã ISRC</span>
                      <p className="mt-1 font-mono font-medium text-white">
                        {selectedTrack.isrcCode || "Chưa đăng ký"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">Định dạng</span>
                      <p className="mt-1 font-medium text-white">
                        {selectedTrack.audioSpec.format}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">Bitrate</span>
                      <p className="mt-1 font-medium text-white">
                        {selectedTrack.audioSpec.bitrate}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">Tần số</span>
                      <p className="mt-1 font-medium text-white">
                        {selectedTrack.audioSpec.sampleRate}
                      </p>
                    </div>
                  </div>
                </div>
            </div>

            {/* Decision Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-[#12141c]/90 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="text-[12px] text-white/50">
                <span>Trạng thái: </span>
                <span className="font-semibold text-amber-400 uppercase">
                  Đang chờ quyết định thẩm định
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenDecisionModal(selectedTrack, "reject")}
                  className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-[13px] font-medium text-red-400 transition hover:bg-red-500 hover:text-white active:scale-95"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Từ chối</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onOpenDecisionModal(selectedTrack, "needs_revision")
                  }
                  className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-[13px] font-medium text-amber-300 transition hover:bg-amber-500 hover:text-black active:scale-95"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>Yêu cầu sửa</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDecisionModal(selectedTrack, "approve")}
                  className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-[13px] font-medium text-white shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400 active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Phê duyệt</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[440px] flex-col items-center justify-center rounded-[24px] border border-white/8 bg-white/[0.02] p-8 text-center backdrop-blur-xl">
            <div className="grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-white/[0.04] text-[#ff8b4d] shadow-[0_8px_24px_rgba(255,122,44,0.15)]">
              <ShieldCheck className="h-8 w-8" strokeWidth={1.8} />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-white">
              {tracks.length === 0
                ? "Không Có Bài Hát Chờ Thẩm Định"
                : "Chưa Chọn Bài Hát Thẩm Định"}
            </h3>
            <p className="mt-1.5 max-w-sm text-[13px] text-white/50">
              {tracks.length === 0
                ? "Toàn bộ bài hát gửi lên hệ thống đã được kiểm duyệt xong. Hàng chờ đang ở trạng thái sạch sẽ."
                : "Vui lòng chọn một tác phẩm từ danh sách hàng chờ bên trái để bắt đầu nghe thử, kiểm tra phổ âm thanh và phê duyệt."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
