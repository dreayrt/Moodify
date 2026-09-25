"use client";

import React, { useEffect, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Disc,
  Edit2,
  Eye,
  Headphones,
  Heart,
  Music,
  Pause,
  Play,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { CatalogTrack } from "../types";
import { AdminPagination } from "./shared/admin-pagination";
import { ModalPortal } from "./shared/modal-portal";

export function normalizeGenre(genre?: string, title?: string, artist?: string): string {
  if (!genre || genre.trim().toLowerCase() === "other") {
    const text = `${title || ""} ${artist || ""}`.toLowerCase();
    if (text.includes("remix") || text.includes("dj ") || text.includes("wrc") || text.includes("drum") || text.includes("edm") || text.includes("vinahouse")) return "EDM / Remix";
    if (text.includes("đen") || text.includes("b ray") || text.includes("binz") || text.includes("pháp kiều") || text.includes("coldzy") || text.includes("bigdaddy") || text.includes("hieuthuhai") || text.includes("rap") || text.includes("dick") || text.includes("hurrykng")) return "Rap / Hip-Hop";
    if (text.includes("ngọt") || text.includes("the flob") || text.includes("indiek") || text.includes("lucidrari") || text.includes("ronboogz") || text.includes("yedira") || text.includes("ashen") || text.includes("t.r.i") || text.includes("cheyenne") || text.includes("vẫn thế") || text.includes("trong bao nỗi buồn")) return "Indie";
    if (text.includes("wren evans") || text.includes("kimmese") || text.includes("grey d")) return "R&B / Soul";
    if (text.includes("phạm hồng phước") || text.includes("hà nhi") || text.includes("duongg") || text.includes("buồn") || text.includes("mưa") || text.includes("nỗi buồn")) return "Ballad";
    return "V-Pop";
  }
  const lower = genre.trim().toLowerCase();
  if (lower === "vpop" || lower === "v-pop" || lower === "pop") return "V-Pop";
  if (lower === "indie") return "Indie";
  if (lower.includes("rap") || lower.includes("hiphop") || lower.includes("hip-hop")) return "Rap / Hip-Hop";
  if (lower.includes("r&b") || lower.includes("rnb")) return "R&B / Soul";
  if (lower.includes("edm") || lower.includes("remix") || lower.includes("dance")) return "EDM / Remix";
  if (lower === "ballad") return "Ballad";
  if (lower === "rock") return "Rock";
  return genre;
}

export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return "Chưa cập nhật";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

type CatalogManagementTabProps = {
  tracks: CatalogTrack[];
  onTakedownTrack: (trackId: string, reason: string) => void;
  onRestoreTrack: (trackId: string) => void;
  onChangeTrackGenre?: (trackId: string, newGenre: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  onPreviewTrack?: (track: CatalogTrack) => void;
  playingTrackId?: string | null;
  isPlayingPreview?: boolean;
};

export function CatalogManagementTab({
  tracks,
  onTakedownTrack,
  onRestoreTrack,
  onChangeTrackGenre,
  onDeleteTrack,
  onPreviewTrack,
  playingTrackId,
  isPlayingPreview = false,
}: CatalogManagementTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "published" | "taken_down">("ALL");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modals state
  const [inspectingTrack, setInspectingTrack] = useState<CatalogTrack | null>(null);
  const [selectedTrackForTakedown, setSelectedTrackForTakedown] = useState<CatalogTrack | null>(null);
  const [selectedTrackForRestore, setSelectedTrackForRestore] = useState<CatalogTrack | null>(null);
  const [selectedTrackForDelete, setSelectedTrackForDelete] = useState<CatalogTrack | null>(null);
  const [takedownReason, setTakedownReason] = useState("");
  const [editingGenreTrackId, setEditingGenreTrackId] = useState<string | null>(null);
  const [selectedGenreVal, setSelectedGenreVal] = useState<string>("");

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, genreFilter, statusFilter]);

  const filteredTracks = tracks
    .map((t) => ({
      ...t,
      genre: normalizeGenre(t.genre, t.title, t.artist),
    }))
    .filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.album.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.spotifyId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGenre =
        genreFilter === "ALL" ||
        t.genre.toLowerCase().includes(genreFilter.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "published" && t.status !== "taken_down") ||
        (statusFilter === "taken_down" && t.status === "taken_down");

      return matchesSearch && matchesGenre && matchesStatus;
    });

  const paginatedTracks = filteredTracks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleConfirmTakedown = () => {
    if (!selectedTrackForTakedown) return;
    onTakedownTrack(
      selectedTrackForTakedown.id,
      takedownReason.trim() || "Vi phạm bản quyền theo yêu cầu của chủ sở hữu tác quyền."
    );
    setSelectedTrackForTakedown(null);
    if (inspectingTrack?.id === selectedTrackForTakedown.id) {
      setInspectingTrack((prev) => (prev ? { ...prev, status: "taken_down" } : null));
    }
  };

  const handleConfirmRestore = () => {
    if (!selectedTrackForRestore) return;
    onRestoreTrack(selectedTrackForRestore.id);
    setSelectedTrackForRestore(null);
    if (inspectingTrack?.id === selectedTrackForRestore.id) {
      setInspectingTrack((prev) => (prev ? { ...prev, status: "published" } : null));
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedTrackForDelete) return;
    if (onDeleteTrack) {
      onDeleteTrack(selectedTrackForDelete.id);
    }
    if (inspectingTrack?.id === selectedTrackForDelete.id) {
      setInspectingTrack(null);
    }
    setSelectedTrackForDelete(null);
  };

  const handleSaveGenre = (trackId: string) => {
    if (onChangeTrackGenre && selectedGenreVal) {
      onChangeTrackGenre(trackId, selectedGenreVal);
    }
    setEditingGenreTrackId(null);
    if (inspectingTrack?.id === trackId) {
      setInspectingTrack((prev) => (prev ? { ...prev, genre: selectedGenreVal } : null));
    }
  };

  return (
    <div className="space-y-6 anim-fade-in select-none">
      {/* Header - No superfluous chip */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-graphik text-[24px] font-bold text-white tracking-tight">
            Kho Bài Hát Hệ Thống
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Quản trị danh mục âm nhạc hệ thống, kiểm soát tác giả, thời lượng, thể loại, ngày phát hành và tình trạng phát sóng.
          </p>
        </div>

        <div className="text-xs text-zinc-400 font-mono">
          Hiển thị {filteredTracks.length} / {tracks.length} bài hát
        </div>
      </div>

      {/* Filter Ribbon with Search & Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#222432] bg-[#12131a] p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bài hát, nghệ sĩ, thể loại, album..."
            className="w-full rounded-xl border border-[#222432] bg-[#171822] py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#ff5500] font-sans"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Genre Dropdown */}
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-[#ff5500] cursor-pointer"
          >
            <option value="ALL" className="bg-[#12131a]">Tất cả thể loại</option>
            {["V-Pop", "Indie", "Rap / Hip-Hop", "EDM / Remix", "Ballad", "R&B / Soul", "Pop"].map((gn) => (
              <option key={gn} value={gn} className="bg-[#12131a]">{gn}</option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "published" | "taken_down")}
            className="rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-[#ff5500] cursor-pointer"
          >
            <option value="ALL" className="bg-[#12131a]">Tất cả trạng thái</option>
            <option value="published" className="bg-[#12131a]">Đang phát sóng</option>
            <option value="taken_down" className="bg-[#12131a]">Đã gỡ</option>
          </select>
        </div>
      </div>

      {/* PRIMARY VIEW: DẠNG DANH SÁCH BÀI HÁT & QUẢN LÝ ĐỦ QUYỀN */}
      <div className="overflow-hidden rounded-2xl border border-[#222432] bg-[#12131a] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#222432] bg-[#171822] font-mono text-[10px] uppercase text-zinc-400 tracking-wider">
              <tr>
                <th className="py-3.5 pl-5 pr-2 w-10">#</th>
                <th className="py-3.5 px-3">Bài Hát &amp; Album</th>
                <th className="py-3.5 px-3">Tác Giả / Nghệ Sĩ</th>
                <th className="py-3.5 px-3">Thể Loại</th>
                <th className="py-3.5 px-3">Thời Lượng</th>
                <th className="py-3.5 px-3">Ngày Phát Hành</th>
                <th className="py-3.5 px-3">Lượt Nghe</th>
                <th className="py-3.5 px-3">Trạng Thái</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Thao Tác Quản Trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredTracks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-zinc-400 font-mono">
                    Không tìm thấy bài hát nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                paginatedTracks.map((track, idx) => {
                  const isTakenDown = track.status === "taken_down";
                  const isCurrentPlaying = track.id === playingTrackId && isPlayingPreview;
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={track.id}
                      className={`transition hover:bg-white/[0.02] ${
                        isCurrentPlaying ? "bg-[#ff5500]/5" : ""
                      }`}
                    >
                      {/* Number */}
                      <td className="py-3 pl-5 pr-2 font-mono text-zinc-500 text-[11px]">
                        {String(itemIndex).padStart(2, "0")}
                      </td>

                      {/* Song Title + Cover + Album */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black shadow group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                            {onPreviewTrack && (
                              <button
                                type="button"
                                onClick={() => onPreviewTrack(track)}
                                className={`absolute inset-0 grid place-items-center bg-black/60 transition text-[#ff5500] cursor-pointer ${
                                  isCurrentPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                }`}
                                title={isCurrentPlaying ? "Tạm dừng phát" : "Nghe thử"}
                              >
                                {isCurrentPlaying ? (
                                  <Pause className="h-4 w-4 fill-current text-[#ff5500]" />
                                ) : (
                                  <Play className="h-4 w-4 fill-current text-[#ff5500] ml-0.5" />
                                )}
                              </button>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p
                              onClick={() => setInspectingTrack(track)}
                              className="font-semibold text-white truncate max-w-[200px] hover:text-[#ff5500] transition cursor-pointer"
                              title={track.title}
                            >
                              {track.title}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                              {track.album || "Single"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Artist / Author */}
                      <td className="py-3 px-3">
                        <span className="font-medium text-white/90 truncate max-w-[150px] block" title={track.artist}>
                          {track.artist}
                        </span>
                      </td>

                      {/* Genre */}
                      <td className="py-3 px-3 font-mono text-zinc-300">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-[11px] font-medium text-zinc-200">
                          {track.genre}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3 font-mono text-zinc-400">
                        {track.duration}
                      </td>

                      {/* Release Date */}
                      <td className="py-3 px-3 font-mono text-zinc-400 text-[11px]">
                        {formatDisplayDate(track.createdAt)}
                      </td>

                      {/* Plays count */}
                      <td className="py-3 px-3 font-mono text-zinc-300">
                        {track.plays.toLocaleString()} lượt
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              !isTakenDown ? "bg-emerald-400" : "bg-rose-400"
                            }`}
                          />
                          <span className={!isTakenDown ? "text-emerald-400" : "text-rose-400 font-semibold"}>
                            {!isTakenDown ? "Đang phát sóng" : "Đã gỡ"}
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 pl-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Play / Preview */}
                          {onPreviewTrack && (
                            <button
                              type="button"
                              onClick={() => onPreviewTrack(track)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isCurrentPlaying
                                  ? "border-[#ff5500]/50 bg-[#ff5500]/15 text-[#ff5500]"
                                  : "border-[#222432] bg-[#171822] text-zinc-300 hover:text-white hover:border-zinc-500"
                              }`}
                              title={isCurrentPlaying ? "Tạm dừng phát" : "Nghe thử"}
                            >
                              {isCurrentPlaying ? (
                                <Pause className="h-3.5 w-3.5 fill-current" />
                              ) : (
                                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                              )}
                            </button>
                          )}

                          {/* Inspect Track Details */}
                          <button
                            type="button"
                            onClick={() => setInspectingTrack(track)}
                            className="p-1.5 rounded-lg border border-[#222432] bg-[#171822] text-zinc-300 hover:text-white hover:border-zinc-500 transition cursor-pointer"
                            title="Xem chi tiết bài hát"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Takedown or Restore */}
                          {!isTakenDown ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTrackForTakedown(track);
                                setTakedownReason("Vi phạm bản quyền theo thông báo từ chủ sở hữu.");
                              }}
                              className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 font-mono text-[11px] text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                              title="Gỡ bài hát khỏi sàn"
                            >
                              Gỡ bài
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedTrackForRestore(track)}
                              className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 font-mono text-[11px] text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer flex items-center gap-1"
                              title="Khôi phục phát sóng bài hát"
                            >
                              <RefreshCw className="h-3 w-3" /> Khôi phục
                            </button>
                          )}

                          {/* Delete Track */}
                          {onDeleteTrack && (
                            <button
                              type="button"
                              onClick={() => setSelectedTrackForDelete(track)}
                              className="p-1.5 rounded-lg border border-[#222432] bg-[#171822] text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer"
                              title="Xóa bài hát"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredTracks.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[15, 30, 50]}
        />
      </div>

      {/* ================= MODAL 1: XEM CHI TIẾT BÀI HÁT ================= */}
      {inspectingTrack && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-xl rounded-2xl border border-[#222432] bg-[#12131a] p-6 shadow-2xl">
              <div className="flex items-start justify-between border-b border-[#222432] pb-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={inspectingTrack.coverUrl}
                    alt={inspectingTrack.title}
                    className="h-16 w-16 rounded-xl object-cover border border-[#222432] shadow-md shrink-0"
                  />
                  <div>
                    <h3 className="font-graphik text-lg font-bold text-white">
                      {inspectingTrack.title}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Nghệ sĩ / Tác giả: <strong className="text-white">{inspectingTrack.artist}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectingTrack(null)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Track Details Grid */}
              <div className="mt-5 grid grid-cols-2 gap-3.5 text-xs">
                <div className="p-3 rounded-xl bg-[#171822] border border-[#222432]">
                  <span className="text-[11px] font-mono text-zinc-500 block">Album / Tuyển tập</span>
                  <span className="font-medium text-white mt-1 block">{inspectingTrack.album || "Single"}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#171822] border border-[#222432]">
                  <span className="text-[11px] font-mono text-zinc-500 block">Thể loại âm nhạc</span>
                  {editingGenreTrackId === inspectingTrack.id ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <select
                        value={selectedGenreVal}
                        onChange={(e) => setSelectedGenreVal(e.target.value)}
                        className="rounded-lg border border-[#222432] bg-[#12131a] px-2 py-1 text-xs text-white outline-none focus:border-[#ff5500]"
                      >
                        {["V-Pop", "Indie", "Rap / Hip-Hop", "EDM / Remix", "Ballad", "R&B / Soul", "Pop", "Rock"].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSaveGenre(inspectingTrack.id)}
                        className="rounded-lg bg-[#ff5500] px-2 py-1 text-[11px] font-semibold text-white"
                      >
                        Lưu
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-medium text-white">{inspectingTrack.genre}</span>
                      {onChangeTrackGenre && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGenreTrackId(inspectingTrack.id);
                            setSelectedGenreVal(inspectingTrack.genre);
                          }}
                          className="text-[11px] text-[#ff5500] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" /> Đổi
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#171822] border border-[#222432]">
                  <span className="text-[11px] font-mono text-zinc-500 block">Thời lượng phát</span>
                  <span className="font-mono font-medium text-white mt-1 block">{inspectingTrack.duration}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#171822] border border-[#222432]">
                  <span className="text-[11px] font-mono text-zinc-500 block">Ngày phát hành</span>
                  <span className="font-mono font-medium text-white mt-1 block">{formatDisplayDate(inspectingTrack.createdAt)}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#171822] border border-[#222432]">
                  <span className="text-[11px] font-mono text-zinc-500 block">Tổng lượt nghe</span>
                  <span className="font-mono font-bold text-white mt-1 block">{inspectingTrack.plays.toLocaleString()} streams</span>
                </div>

                <div className="p-3 rounded-xl bg-[#171822] border border-[#222432]">
                  <span className="text-[11px] font-mono text-zinc-500 block">Lượt yêu thích</span>
                  <span className="font-mono font-bold text-rose-400 mt-1 block">{inspectingTrack.likes.toLocaleString()} likes</span>
                </div>

                <div className="p-3 rounded-xl bg-[#171822] border border-[#222432]">
                  <span className="text-[11px] font-mono text-zinc-500 block">Mã bài hát hệ thống</span>
                  <span className="font-mono text-zinc-300 text-[11px] mt-1 block truncate">{inspectingTrack.id}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#171822] border border-[#222432]">
                  <span className="text-[11px] font-mono text-zinc-500 block">Trạng thái phát sóng</span>
                  <span className="inline-flex items-center gap-1.5 mt-1 font-mono text-xs">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        inspectingTrack.status !== "taken_down" ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    <span className={inspectingTrack.status !== "taken_down" ? "text-emerald-400" : "text-rose-400 font-semibold"}>
                      {inspectingTrack.status !== "taken_down" ? "Đang phát sóng" : "Đã gỡ khỏi hệ thống"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Actions footer */}
              <div className="mt-6 flex items-center justify-between border-t border-[#222432] pt-4">
                {onPreviewTrack && (
                  <button
                    type="button"
                    onClick={() => onPreviewTrack(inspectingTrack)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#ff5500] px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-[#ff6a1a] transition cursor-pointer"
                  >
                    {inspectingTrack.id === playingTrackId && isPlayingPreview ? (
                      <>
                        <Pause className="h-4 w-4 fill-current" /> Tạm Dừng Nghe Thử
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-current" /> Nghe Thử Bài Hát
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center gap-2">
                  {inspectingTrack.status !== "taken_down" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrackForTakedown(inspectingTrack);
                        setTakedownReason("Vi phạm bản quyền theo yêu cầu của đối tác.");
                      }}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-mono text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                    >
                      Gỡ bài hát
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedTrackForRestore(inspectingTrack)}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-mono text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" /> Khôi phục phát sóng
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setInspectingTrack(null)}
                    className="rounded-xl border border-[#222432] bg-[#171822] px-4 py-2 text-xs text-zinc-300 hover:text-white transition cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ================= MODAL 2: GỠ BÀI HÁT ================= */}
      {selectedTrackForTakedown && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#12131a] p-6 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertOctagon className="h-6 w-6" />
                <h3 className="font-graphik text-lg font-bold text-white">Gỡ Bài Hát Khỏi Hệ Thống</h3>
              </div>

              <p className="mt-3 text-xs text-zinc-300 leading-relaxed">
                Bạn đang chuẩn bị cưỡng chế gỡ bài hát{" "}
                <strong className="text-white font-semibold">"{selectedTrackForTakedown.title}"</strong> của nghệ sĩ{" "}
                <strong className="text-white">{selectedTrackForTakedown.artist}</strong>. Người dùng sẽ không thể tìm kiếm hay phát bài hát này.
              </p>

              <div className="mt-4">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Lý do gỡ bài (ghi nhận vào lịch sử kiểm toán)
                </label>
                <textarea
                  value={takedownReason}
                  onChange={(e) => setTakedownReason(e.target.value)}
                  rows={3}
                  placeholder="Nhập lý do cụ thể (vi phạm bản quyền, yêu cầu từ tác giả...)"
                  className="w-full rounded-xl border border-[#222432] bg-[#171822] p-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-rose-500"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedTrackForTakedown(null)}
                  className="rounded-xl border border-[#222432] bg-[#171822] px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTakedown}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/25 hover:bg-rose-500 transition cursor-pointer"
                >
                  Xác Nhận Gỡ Bài
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ================= MODAL 3: KHÔI PHỤC BÀI HÁT ================= */}
      {selectedTrackForRestore && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[#12131a] p-6 shadow-2xl">
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
                <h3 className="font-graphik text-lg font-bold text-white">Khôi Phục Phát Sóng Bài Hát</h3>
              </div>

              <p className="mt-3 text-xs text-zinc-300 leading-relaxed">
                Bài hát <strong className="text-white font-semibold">"{selectedTrackForRestore.title}"</strong> sẽ được đưa trở lại danh mục phát sóng công khai trên toàn hệ thống Moodify.
              </p>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedTrackForRestore(null)}
                  className="rounded-xl border border-[#222432] bg-[#171822] px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-500 transition cursor-pointer"
                >
                  Xác Nhận Khôi Phục
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ================= MODAL 4: XÁC NHẬN XÓA BÀI HÁT ================= */}
      {selectedTrackForDelete && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#12131a] p-6 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="font-graphik text-lg font-bold text-white">Xóa Bài Hát Khỏi Danh Mục</h3>
              </div>

              <p className="mt-3 text-xs text-zinc-300 leading-relaxed">
                Hành động này sẽ xóa vĩnh viễn bài hát{" "}
                <strong className="text-white font-semibold">"{selectedTrackForDelete.title}"</strong> của nghệ sĩ{" "}
                <strong className="text-white">{selectedTrackForDelete.artist}</strong> khỏi danh mục quản lý.
              </p>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedTrackForDelete(null)}
                  className="rounded-xl border border-[#222432] bg-[#171822] px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/25 hover:bg-rose-500 transition cursor-pointer"
                >
                  Xóa Vĩnh Viễn
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
