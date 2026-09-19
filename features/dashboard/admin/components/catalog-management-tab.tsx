"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertOctagon,
  Check,
  Disc,
  Filter,
  Flame,
  Heart,
  LayoutGrid,
  List,
  Music,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Tag,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { CatalogTrack } from "../types";
import { AudioFeaturesRadar } from "./shared/audio-features-radar";
import { WaveformVisualizer } from "./shared/waveform-visualizer";
import { AdminPagination } from "./shared/admin-pagination";

type CatalogManagementTabProps = {
  tracks: CatalogTrack[];
  onTakedownTrack: (trackId: string, reason: string) => void;
  onRestoreTrack: (trackId: string) => void;
  onChangeTrackVibe: (trackId: string, newVibe: CatalogTrack["vibeCategory"]) => void;
  onPreviewTrack?: (track: CatalogTrack) => void;
  playingTrackId?: string | null;
  isPlayingPreview?: boolean;
};

export function CatalogManagementTab({
  tracks,
  onTakedownTrack,
  onRestoreTrack,
  onChangeTrackVibe,
  onPreviewTrack,
  playingTrackId,
  isPlayingPreview = false,
}: CatalogManagementTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [vibeFilter, setVibeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "published" | "taken_down">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, vibeFilter, statusFilter]);

  // Modals state
  const [selectedTrackForTakedown, setSelectedTrackForTakedown] = useState<CatalogTrack | null>(null);
  const [selectedTrackForRestore, setSelectedTrackForRestore] = useState<CatalogTrack | null>(null);
  const [takedownReason, setTakedownReason] = useState("");
  const [selectedTrackForVibe, setSelectedTrackForVibe] = useState<CatalogTrack | null>(null);
  const [selectedTrackForRadar, setSelectedTrackForRadar] = useState<CatalogTrack | null>(null);

  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.spotifyId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVibe = vibeFilter === "ALL" || t.vibeCategory === vibeFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "published" && t.status !== "taken_down") ||
      (statusFilter === "taken_down" && t.status === "taken_down");

    return matchesSearch && matchesVibe && matchesStatus;
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
  };

  const handleConfirmChangeVibe = (vibe: CatalogTrack["vibeCategory"]) => {
    if (!selectedTrackForVibe) return;
    onChangeTrackVibe(selectedTrackForVibe.id, vibe);
    setSelectedTrackForVibe(null);
  };

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Studio Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-graphik text-[24px] font-bold text-white tracking-tight">
              Kho Âm Nhạc &amp; Trí Tuệ Cảm Xúc
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[11px] text-cyan-300 font-semibold shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              CATALOG TRỰC TUYẾN
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Giám sát 147 bản ghi âm học chuyên sâu (**BPM, Energy, Valence, Danceability**), nghe thử dạng sóng và điều phối nhãn Vibe.
          </p>
        </div>

        {/* View Switcher & Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === "grid" ? "bg-white/15 text-white shadow" : "text-zinc-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Studio Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === "table" ? "bg-white/15 text-white shadow" : "text-zinc-400 hover:text-white"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Acoustic Matrix
            </button>
          </div>

          <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300 font-mono">
            {filteredTracks.length} / {tracks.length} bài
          </span>
        </div>
      </div>

      {/* Filter Ribbon with Status & Vibe Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0c1017] p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên bài, nghệ sĩ, thể loại, Spotify ID..."
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#ff7a2c]/60 font-sans"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 border-r border-white/10 pr-3">
          {[
            { id: "ALL", label: "Tất cả bài" },
            { id: "published", label: "Đang phát sóng" },
            { id: "taken_down", label: "Đã gỡ" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                setStatusFilter(st.id as "ALL" | "published" | "taken_down");
                setCurrentPage(1);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-mono transition ${
                statusFilter === st.id
                  ? st.id === "taken_down"
                    ? "bg-rose-500 text-white font-semibold shadow-md shadow-rose-500/20"
                    : st.id === "published"
                    ? "bg-emerald-500 text-black font-semibold shadow-md shadow-emerald-500/20"
                    : "bg-white text-black font-semibold"
                  : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Vibe Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "Energetic", "Chill", "Sadness", "Focus", "Romance"].map((vb) => (
            <button
              key={vb}
              type="button"
              onClick={() => {
                setVibeFilter(vb);
                setCurrentPage(1);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-mono transition ${
                vibeFilter === vb
                  ? "bg-[#ff7a2c] text-black font-semibold shadow-md shadow-[#ff7a2c]/20"
                  : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              {vb === "ALL" ? "Tất cả Vibe" : vb}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: STUDIO GRID */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedTracks.map((track) => {
            const isTakenDown = track.status === "taken_down";
            const isCurrentPlaying = track.id === playingTrackId && isPlayingPreview;

            return (
              <div
                key={track.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-[#0c1017] p-4 shadow-xl transition backdrop-blur-md ${
                  isCurrentPlaying
                    ? "border-[#ff7a2c] ring-1 ring-[#ff7a2c]/50 shadow-[0_0_24px_rgba(255,122,44,0.22)]"
                    : isTakenDown
                    ? "border-rose-500/30 opacity-60"
                    : "border-[#1e2330] hover:border-white/20"
                }`}
              >
                <div>
                  {/* Top Head info */}
                  <div className="flex items-start gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black shadow">
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
                          className={`absolute inset-0 grid place-items-center bg-black/60 transition text-[#ff7a2c] ${
                            isCurrentPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                          title={isCurrentPlaying ? "Tạm dừng phát" : "Nghe thử bài hát"}
                        >
                          {isCurrentPlaying ? (
                            <Pause className="h-6 w-6 fill-current text-[#ff7a2c]" />
                          ) : (
                            <Play className="h-6 w-6 fill-current text-[#ff7a2c]" />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="rounded-md border border-white/8 bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] text-zinc-300">
                          {track.duration} · {track.genre}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold border ${
                            track.status !== "taken_down"
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                              : "border-rose-500/30 bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {track.status !== "taken_down" ? "Đang phát sóng" : "Đã gỡ"}
                        </span>
                      </div>

                      <h3 className="mt-1 font-graphik text-[15px] font-semibold text-white truncate">
                        {track.title}
                      </h3>
                      <p className="text-[12px] text-zinc-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  {/* Vibe Tag & Play Count */}
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedTrackForVibe(track)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#ff7a2c]/30 bg-[#ff7a2c]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#ffb488] hover:bg-[#ff7a2c]/20 transition"
                      title="Bấm để đổi nhãn cảm xúc"
                    >
                      <Sparkles className="h-3 w-3" /> Vibe: {track.vibeCategory}
                    </button>
                    <span className="font-mono text-[10px] text-zinc-400">
                      {track.plays.toLocaleString()} streams
                    </span>
                  </div>

                  {/* Waveform Strip & Preview Trigger */}
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 flex items-center justify-between gap-2">
                    <WaveformVisualizer
                      trackId={track.id}
                      isPlaying={isCurrentPlaying}
                      barCount={26}
                      height={20}
                      activeColor={isCurrentPlaying ? "#ff7a2c" : "#00f2fe"}
                    />
                    {onPreviewTrack && (
                      <button
                        type="button"
                        onClick={() => onPreviewTrack(track)}
                        className={`flex items-center gap-1 text-[11px] font-mono font-semibold shrink-0 cursor-pointer ${
                          isCurrentPlaying ? "text-emerald-400" : "text-[#ff7a2c] hover:underline"
                        }`}
                      >
                        {isCurrentPlaying ? (
                          <>
                            <Pause className="h-3.5 w-3.5 fill-current" /> Đang phát
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" /> Nghe thử
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Audio Features Meters */}
                  <div className="mt-3 rounded-lg border border-white/5 bg-black/30 p-2.5 space-y-1.5 text-[10px] font-mono">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Key: <strong className="text-white">{track.keySignature}</strong></span>
                      <span>BPM: <strong className="text-[#00f2fe]">{track.bpm}</strong></span>
                      <button
                        type="button"
                        onClick={() => setSelectedTrackForRadar(track)}
                        className="text-[10px] text-[#ff7a2c] hover:underline"
                      >
                        Xem Radar →
                      </button>
                    </div>

                    {/* Energy */}
                    <div>
                      <div className="flex justify-between text-white/40 text-[9px]">
                        <span>Energy</span>
                        <span>{Math.round(track.energy * 100)}%</span>
                      </div>
                      <div className="mt-0.5 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[#ff7a2c]" style={{ width: `${track.energy * 100}%` }} />
                      </div>
                    </div>

                    {/* Valence */}
                    <div>
                      <div className="flex justify-between text-white/40 text-[9px]">
                        <span>Valence (Tích cực)</span>
                        <span>{Math.round(track.valence * 100)}%</span>
                      </div>
                      <div className="mt-0.5 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${track.valence * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Spotify ID + Takedown Action */}
                <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-2.5">
                  <span className="font-mono text-[10px] text-white/30 truncate max-w-[130px]">
                    {track.spotifyId}
                  </span>

                  {!isTakenDown ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrackForTakedown(track);
                        setTakedownReason("Vi phạm bản quyền theo thông báo từ chủ sở hữu.");
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-mono text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                    >
                      <AlertOctagon className="h-3 w-3" /> Gỡ bài
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedTrackForRestore(track)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-mono font-semibold text-emerald-300 hover:bg-emerald-500/25 transition cursor-pointer"
                      title="Public lại bài hát lên toàn sàn"
                    >
                      <RefreshCw className="h-3 w-3" /> Public lại
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: ACOUSTIC MATRIX TABLE */}
      {viewMode === "table" && (
        <div className="overflow-x-auto rounded-[20px] border border-white/8 bg-[#0b0d13]/90 shadow-[0_16px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-white/8 bg-white/[0.02] font-mono text-[10px] uppercase text-white/40 tracking-wider">
              <tr>
                <th className="py-3 px-4">Bài Hát / Nghệ Sĩ</th>
                <th className="py-3 px-3">Vibe</th>
                <th className="py-3 px-3">BPM</th>
                <th className="py-3 px-3">Key</th>
                <th className="py-3 px-3">Energy</th>
                <th className="py-3 px-3">Valence</th>
                <th className="py-3 px-3">Dance</th>
                <th className="py-3 px-3">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 font-sans">
              {paginatedTracks.map((track) => {
                const isTakenDown = track.status === "taken_down";

                return (
                  <tr key={track.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="h-9 w-9 rounded-lg object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-[180px]">{track.title}</p>
                          <p className="text-[11px] text-zinc-400 truncate max-w-[180px]">{track.artist}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => setSelectedTrackForVibe(track)}
                        className="font-mono text-[11px] text-[#ffb488] bg-[#ff7a2c]/10 border border-[#ff7a2c]/30 px-2 py-0.5 rounded-md hover:bg-[#ff7a2c]/20"
                      >
                        {track.vibeCategory}
                      </button>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-[#00f2fe]">{track.bpm}</td>
                    <td className="py-3 px-3 font-mono text-zinc-300">{track.keySignature}</td>
                    <td className="py-3 px-3 font-mono text-zinc-200">{Math.round(track.energy * 100)}%</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">{Math.round(track.valence * 100)}%</td>
                    <td className="py-3 px-3 font-mono text-[#8fb4ff]">{Math.round(track.danceability * 100)}%</td>

                    <td className="py-3 px-3 font-mono text-[10px]">
                      <span className={`px-2 py-0.5 rounded-md ${
                        !isTakenDown ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                      }`}>
                        {!isTakenDown ? "Phát sóng" : "Đã gỡ"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onPreviewTrack && (
                          <button
                            type="button"
                            onClick={() => onPreviewTrack(track)}
                            className={`p-1.5 rounded-md transition cursor-pointer ${
                              track.id === playingTrackId && isPlayingPreview
                                ? "text-emerald-300 bg-emerald-500/20 border border-emerald-500/40"
                                : "text-[#ff7a2c] hover:bg-white/10"
                            }`}
                            title={track.id === playingTrackId && isPlayingPreview ? "Tạm dừng phát" : "Nghe thử"}
                          >
                            {track.id === playingTrackId && isPlayingPreview ? (
                              <Pause className="h-4 w-4 fill-current" />
                            ) : (
                              <Play className="h-4 w-4 fill-current" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedTrackForRadar(track)}
                          className="font-mono text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20 hover:bg-cyan-500/20"
                        >
                          Radar
                        </button>
                        {!isTakenDown ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTrackForTakedown(track);
                              setTakedownReason("Vi phạm bản quyền theo yêu cầu của đối tác.");
                            }}
                            className="font-mono text-[10px] text-rose-300 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer"
                          >
                            Gỡ
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedTrackForRestore(track)}
                            className="font-mono text-[10px] text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-md border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer flex items-center gap-1"
                            title="Public lại bài hát"
                          >
                            <RefreshCw className="h-2.5 w-2.5" /> Public lại
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar for Catalog */}
      <AdminPagination
        currentPage={currentPage}
        totalItems={filteredTracks.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[12, 24, 48]}
      />

      {/* ================= MODAL 1: AUDIO FEATURES RADAR INSPECTION ================= */}
      {selectedTrackForRadar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 anim-fade-in">
          <div className="w-full max-w-md rounded-[26px] border border-white/14 bg-[#0a0c12] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div>
                <h3 className="font-graphik text-[17px] font-semibold text-white">
                  Radar Phân Tích Âm Học
                </h3>
                <p className="text-[12px] text-white/50">{selectedTrackForRadar.title} · {selectedTrackForRadar.artist}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrackForRadar(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-6 flex justify-center">
              <AudioFeaturesRadar
                bpm={selectedTrackForRadar.bpm}
                energy={selectedTrackForRadar.energy}
                valence={selectedTrackForRadar.valence}
                danceability={selectedTrackForRadar.danceability}
                acousticness={selectedTrackForRadar.acousticness}
                size={240}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px] bg-white/[0.02] p-3 rounded-[16px] border border-white/6">
              <div>
                <span className="text-white/40 block text-[9px] uppercase">Key</span>
                <span className="text-white font-bold">{selectedTrackForRadar.keySignature}</span>
              </div>
              <div>
                <span className="text-white/40 block text-[9px] uppercase">BPM</span>
                <span className="text-[#00f2fe] font-bold">{selectedTrackForRadar.bpm}</span>
              </div>
              <div>
                <span className="text-white/40 block text-[9px] uppercase">Vibe</span>
                <span className="text-[#ff7a2c] font-bold">{selectedTrackForRadar.vibeCategory}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTrackForRadar(null)}
                className="w-full rounded-full bg-white/10 py-2 text-[13px] font-medium text-white hover:bg-white/15"
              >
                Đóng Radar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: TAKEDOWN TRACK ================= */}
      {selectedTrackForTakedown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 anim-fade-in">
          <div className="w-full max-w-md rounded-[26px] border border-rose-500/30 bg-[#0d090a] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="font-graphik text-[17px] font-semibold text-rose-400">
                Cưỡng Chế Gỡ Bỏ Bài Hát (Takedown)
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTrackForTakedown(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-[13px]">
              <p className="text-white/70">
                Bài hát sẽ lập tức bị chuyển sang trạng thái <strong>TAKEN_DOWN</strong> và gỡ khỏi toàn bộ ứng dụng người nghe:
              </p>
              <div className="rounded-[16px] border border-white/8 bg-black/40 p-3">
                <p className="font-semibold text-white">{selectedTrackForTakedown.title}</p>
                <p className="text-[12px] text-white/50">{selectedTrackForTakedown.artist}</p>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-white/70 mb-1">Lý do cưỡng chế gỡ</label>
                <textarea
                  rows={3}
                  value={takedownReason}
                  onChange={(e) => setTakedownReason(e.target.value)}
                  placeholder="Ghi rõ lý do vi phạm bản quyền / pháp luật..."
                  className="w-full rounded-[14px] border border-white/10 bg-black/40 p-3 text-[13px] text-white placeholder-white/30 outline-none focus:border-rose-400/70"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedTrackForTakedown(null)}
                className="rounded-full bg-white/10 px-4 py-2 text-[12px] font-medium text-white hover:bg-white/15"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmTakedown}
                className="rounded-full bg-rose-500 px-5 py-2 text-[12px] font-semibold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600"
              >
                Xác nhận gỡ bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2.5: RESTORE TRACK ================= */}
      {selectedTrackForRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 anim-fade-in">
          <div className="w-full max-w-md rounded-[26px] border border-emerald-500/30 bg-[#0c0e14] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <RefreshCw className="h-5 w-5" />
                <h3 className="font-graphik text-[17px] font-semibold text-white">Khôi Phục Phát Sóng</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrackForRestore(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedTrackForRestore.coverUrl}
                alt={selectedTrackForRestore.title}
                className="h-12 w-12 rounded-xl object-cover border border-white/10 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-graphik text-sm font-bold text-white truncate">
                  {selectedTrackForRestore.title}
                </p>
                <p className="text-xs text-zinc-400 truncate">{selectedTrackForRestore.artist}</p>
                <span className="inline-block mt-1 font-mono text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                  Trạng thái hiện tại: Đã gỡ
                </span>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-xs text-zinc-300 leading-relaxed space-y-2">
              <p className="font-medium text-emerald-300">
                Bạn có chắc chắn muốn phát sóng (Public lại) bài hát này?
              </p>
              <p className="text-zinc-400 text-[11px]">
                Bài hát sẽ được chuyển trạng thái sang <strong>Được duyệt (Approved)</strong> và lập tức mở quyền stream công khai cho tất cả người dùng Moodify.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedTrackForRestore(null)}
                className="rounded-full bg-white/10 px-4 py-2 text-[12px] font-medium text-white hover:bg-white/15 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onRestoreTrack(selectedTrackForRestore.id);
                  setSelectedTrackForRestore(null);
                }}
                className="rounded-full bg-emerald-500 px-5 py-2 text-[12px] font-semibold text-black shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition cursor-pointer"
              >
                Xác nhận Public lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: CHANGE VIBE ================= */}
      {selectedTrackForVibe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 anim-fade-in">
          <div className="w-full max-w-sm rounded-[26px] border border-white/12 bg-[#0c0e14] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="font-graphik text-[17px] font-semibold text-white">Gán Lại Vibe Cảm Xúc</h3>
              <button
                type="button"
                onClick={() => setSelectedTrackForVibe(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-[12px] text-white/60">
              Chọn nhãn Vibe cảm xúc mới cho bài hát <strong>"{selectedTrackForVibe.title}"</strong>:
            </p>

            <div className="mt-4 space-y-2">
              {(["Energetic", "Chill", "Sadness", "Focus", "Romance"] as CatalogTrack["vibeCategory"][]).map((vibe) => (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => handleConfirmChangeVibe(vibe)}
                  className={`flex w-full items-center justify-between rounded-[14px] border p-3 text-[13px] font-medium transition ${
                    selectedTrackForVibe.vibeCategory === vibe
                      ? "border-[#ff7a2c] bg-[#ff7a2c]/15 text-[#ffb488]"
                      : "border-white/8 bg-white/[0.02] text-white/80 hover:bg-white/[0.06]"
                  }`}
                >
                  <span>{vibe}</span>
                  {selectedTrackForVibe.vibeCategory === vibe && <Check className="h-4 w-4 text-[#ff7a2c]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
