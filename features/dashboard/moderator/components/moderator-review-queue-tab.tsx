"use client";


import { useState } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
  Music2,
  Activity,
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
    actionType: "approve" | "reject"
  ) => void;
};

export function ModeratorReviewQueueTab({
  tracks,
  selectedTrack,
  onSelectTrack,
  onOpenDecisionModal,
}: ModeratorReviewQueueTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "urgent">("all");

  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.genre.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (priorityFilter === "urgent") return t.priority === "urgent";
    return true;
  });

  const urgentCount = tracks.filter((t) => t.priority === "urgent").length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Queue List (5 of 12 cols) */}
      <div className="space-y-4 lg:col-span-5">
        {/* Search & Filter Header */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên bài, nghệ sĩ, thể loại..."
              className="w-full rounded-xl border border-white/10 bg-[#0b0d13] py-2 pl-10 pr-4 text-[13px] text-white placeholder-white/35 transition focus:border-[#ff5500] focus:outline-none"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPriorityFilter("all")}
              className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer tabular-nums ${
                priorityFilter === "all"
                  ? "bg-white text-black font-semibold"
                  : "bg-white/[0.04] text-white/65 hover:text-white"
              }`}
            >
              Tất cả ({tracks.length})
            </button>
            {urgentCount > 0 && (
              <button
                type="button"
                onClick={() => setPriorityFilter("urgent")}
                className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer tabular-nums ${
                  priorityFilter === "urgent"
                    ? "bg-red-500 text-white font-semibold"
                    : "bg-white/[0.04] text-white/65 hover:text-white"
                }`}
              >
                Ưu tiên ({urgentCount})
              </button>
            )}
          </div>
        </div>

        {/* Queue Items List */}
        <div className="max-h-[calc(100vh-280px)] space-y-2.5 overflow-y-auto pr-1">
          {filteredTracks.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-8 text-center text-white/45">
              <Music2 className="mx-auto mb-2 h-8 w-8 text-white/25" />
              <p className="text-[13px] font-medium text-white/70">
                {tracks.length === 0
                  ? "Chưa có bài hát nào chờ duyệt"
                  : "Không tìm thấy bài hát phù hợp"}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {tracks.length === 0
                  ? "Các bài hát mới gửi lên sẽ hiển thị tại đây."
                  : "Thử đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc."}
              </p>
            </div>
          ) : (
            filteredTracks.map((t) => {
              const isSelected = selectedTrack?.id === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTrack(t)}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-3.5 transition ${
                    isSelected
                      ? "border-[#ff5500] bg-[#161924]"
                      : "border-white/[0.08] bg-[#12141c] hover:border-white/20 hover:bg-[#151822]"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff5500]" />
                  )}

                  <div className="flex items-center gap-3">
                    <ModeratorTrackCover
                      coverUrl={t.coverUrl}
                      title={t.title}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-white group-hover:text-[#ff8b4d] transition">
                          {t.title}
                        </p>
                        {t.priority === "urgent" && (
                          <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                            Ưu tiên
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-white/55">
                        {t.artist}
                      </p>

                      <div className="mt-1 flex items-center gap-2 text-[11px] text-white/45 tabular-nums">
                        <span>{t.genre}</span>
                        <span>•</span>
                        <span>{t.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Track Inspection */}
      <div className="lg:col-span-7">
        {selectedTrack ? (
          <div className="space-y-6">
            {/* Track Banner */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <ModeratorTrackCover
                  coverUrl={selectedTrack.coverUrl}
                  title={selectedTrack.title}
                  size="xl"
                  className="border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <span>{selectedTrack.genre}</span>
                    <span>•</span>
                    <span>{selectedTrack.releaseType}</span>
                    {selectedTrack.explicitFlagByArtist && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-red-400">Nội dung 18+</span>
                      </>
                    )}
                  </div>

                  <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
                    {selectedTrack.title}
                  </h2>
                  <p className="text-[14px] font-medium text-white/75">
                    {selectedTrack.artist}
                    {selectedTrack.artistEmail && (
                      <span className="ml-2 text-xs font-normal text-white/45">
                        ({selectedTrack.artistEmail})
                      </span>
                    )}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/50">
                    <span>
                      Đơn vị phát hành:{" "}
                      <span className="text-white/80">
                        {selectedTrack.label || "Tự phát hành"}
                      </span>
                    </span>
                    <span>Gửi lúc: {selectedTrack.submittedAt}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Review Player */}
            <ModeratorAudioPlayer track={selectedTrack} autoPlay={false} />

            {/* Audio Features (shown only when real backend metrics exist) */}
            {selectedTrack.audioFeatures && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#ff8b4d]" />
                    <h3 className="text-sm font-semibold text-white">
                      Thông số âm thanh
                    </h3>
                  </div>
                  {selectedTrack.audioFeatures.keySignature && (
                    <span className="text-xs font-mono font-medium text-[#ffb488]">
                      Giọng nhạc: {selectedTrack.audioFeatures.keySignature}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <p className="text-xs text-white/50">Nhịp độ (BPM)</p>
                    <p className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                      {selectedTrack.audioFeatures.bpm ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <p className="text-xs text-white/50">Năng lượng</p>
                    <p className="mt-1 font-mono text-xl font-bold text-[#ff8b4d] tabular-nums">
                      {selectedTrack.audioFeatures.energy !== undefined
                        ? `${Math.round(selectedTrack.audioFeatures.energy * 100)}%`
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <p className="text-xs text-white/50">Độ sôi động</p>
                    <p className="mt-1 font-mono text-xl font-bold text-amber-400 tabular-nums">
                      {selectedTrack.audioFeatures.danceability !== undefined
                        ? `${Math.round(selectedTrack.audioFeatures.danceability * 100)}%`
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <p className="text-xs text-white/50">Sắc thái</p>
                    <p className="mt-1 font-mono text-xl font-bold text-emerald-400 tabular-nums">
                      {selectedTrack.audioFeatures.valence !== undefined
                        ? `${Math.round(selectedTrack.audioFeatures.valence * 100)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Copyright Profile */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#ff8b4d]" />
                  <h3 className="text-sm font-semibold text-white">
                    Hồ sơ bản quyền
                  </h3>
                </div>
                {selectedTrack.licenseRecordExists && selectedTrack.licenseStatus && (
                  <span className="text-xs font-medium text-white/70">
                    {selectedTrack.licenseStatus}
                  </span>
                )}
              </div>

              {selectedTrack.licenseRecordExists ? (
                <div className="mt-4">
                  <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                    <div>
                      <span className="text-white/45">Chủ sở hữu quyền</span>
                      <p className="mt-1 font-medium text-white">
                        {selectedTrack.copyrightOwner || selectedTrack.artist || "Chưa có thông tin"}
                      </p>
                    </div>
                    <div>
                      <span className="text-white/45">Đơn vị phân phối</span>
                      <p className="mt-1 font-medium text-white">
                        {selectedTrack.distributorName ||
                          (selectedTrack.distributorId
                            ? `Đơn vị #${selectedTrack.distributorId}`
                            : "Không qua đơn vị phân phối")}
                      </p>
                    </div>
                    <div>
                      <span className="text-white/45">Mã hợp đồng</span>
                      <p className="mt-1 font-mono font-medium text-white/90">
                        {selectedTrack.distributionContractCode ||
                          (selectedTrack.distributionContractId
                            ? `#${selectedTrack.distributionContractId}`
                            : "Chưa có mã hợp đồng")}
                      </p>
                    </div>
                    <div>
                      <span className="text-white/45">Thời hạn giấy phép</span>
                      <p className="mt-1 text-white/90 tabular-nums">
                        {selectedTrack.issueDate || "—"} – {selectedTrack.expiryDate || "Không thời hạn"}
                      </p>
                    </div>
                  </div>

                  {selectedTrack.licenseDocumentUrl && (
                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3">
                      <span className="text-xs text-white/50">Tài liệu đính kèm</span>
                      <a
                        href={selectedTrack.licenseDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff8b4d] hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Xem giấy phép bản quyền</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center text-xs text-white/50">
                  Chưa có hồ sơ bản quyền cho bài hát này.
                </p>
              )}
            </div>

            {/* Decision Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#12141c] p-4">
              <div className="text-xs text-white/55">
                <span>Trạng thái: </span>
                <span className="font-semibold text-amber-400">
                  Chờ duyệt
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenDecisionModal(selectedTrack, "reject")}
                  className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-[13px] font-medium text-red-400 transition hover:bg-red-500 hover:text-white active:scale-95 cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Từ chối</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDecisionModal(selectedTrack, "approve")}
                  className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-[13px] font-medium text-white transition hover:bg-emerald-400 active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Phê duyệt</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[440px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#12141c] p-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#ff8b4d]">
              <ShieldCheck className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-white">
              {tracks.length === 0
                ? "Không có bài hát chờ duyệt"
                : "Chọn bài hát để kiểm duyệt"}
            </h3>
            <p className="mt-1.5 max-w-sm text-[13px] text-white/50">
              {tracks.length === 0
                ? "Hiện tại tất cả bài hát gửi lên đã được xử lý."
                : "Chọn một bài hát ở danh sách bên trái để nghe thử và kiểm tra hồ sơ bản quyền."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
