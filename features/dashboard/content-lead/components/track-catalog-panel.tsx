"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  SlidersHorizontal,
  Pencil,
  Trash2,
  MoreHorizontal,
  Play,
  Pause,
  ListMusic,
  CheckCircle2,
  Globe2,
  Lock,
  EyeOff,
  X,
  RotateCcw,
  Copy,
  Radio,
  Music,
  Plus,
} from "lucide-react";
import {
  ArtistTrack,
  TrackFilterStatus,
  TrackFilterVisibility,
  TrackSortOption,
} from "../types";

type TrackCatalogPanelProps = {
  tracks: ArtistTrack[];
  onEditTrack: (track: ArtistTrack) => void;
  onDeleteTrack: (track: ArtistTrack) => void;
  onToggleStatus: (track: ArtistTrack) => void;
  onToggleVisibility: (track: ArtistTrack) => void;
  onCopyLink: (track: ArtistTrack) => void;
  playingTrackId: string | null;
  onTogglePlayTrack: (track: ArtistTrack) => void;
  onOpenUpload: () => void;
};

export function TrackCatalogPanel({
  tracks,
  onEditTrack,
  onDeleteTrack,
  onToggleStatus,
  onToggleVisibility,
  onCopyLink,
  playingTrackId,
  onTogglePlayTrack,
  onOpenUpload,
}: TrackCatalogPanelProps) {
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TrackFilterStatus>("all");
  const [visibilityFilter, setVisibilityFilter] =
    useState<TrackFilterVisibility>("all");
  const [sortOption, setSortOption] = useState<TrackSortOption>("newest");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(
    null
  );

  const filterMenuRef = useRef<HTMLDivElement>(null);
  const trackMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target as Node)
      ) {
        setIsFilterMenuOpen(false);
      }
      if (
        trackMenuRef.current &&
        !trackMenuRef.current.contains(event.target as Node)
      ) {
        setActiveMenuTrackId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: tracks.length,
      draft: tracks.filter((tr) => tr.status === "draft").length,
      published: tracks.filter((tr) => tr.status === "published").length,
    };
  }, [tracks]);

  // Filtered & Sorted Tracks
  const filteredTracks = useMemo(() => {
    let result = [...tracks];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((tr) => tr.status === statusFilter);
    }

    // Visibility filter
    if (visibilityFilter !== "all") {
      result = result.filter((tr) => tr.visibility === visibilityFilter);
    }

    // Search query
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      result = result.filter(
        (tr) =>
          tr.title.toLowerCase().includes(query) ||
          tr.genre.toLowerCase().includes(query) ||
          tr.artist.toLowerCase().includes(query) ||
          (tr.description && tr.description.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "most_played":
          return b.plays - a.plays;
        case "most_liked":
          return b.likes - a.likes;
        case "title_asc":
          return a.title.localeCompare(b.title);
        case "title_desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return result;
  }, [tracks, statusFilter, visibilityFilter, searchTerm, sortOption]);

  const hasActiveAdvancedFilter =
    visibilityFilter !== "all" || sortOption !== "newest";

  const handleResetFilters = () => {
    setVisibilityFilter("all");
    setSortOption("newest");
    setSearchTerm("");
    setStatusFilter("all");
    setIsFilterMenuOpen(false);
  };

  return (
    <div
      className="anim-fade-up rounded-[28px] border border-white/8 bg-[#121316] p-5 md:p-6 shadow-[0_28px_80px_rgba(0,0,0,0.24)]"
      style={{ animationDelay: "940ms" }}
    >
      {/* Top Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] tracking-[0.24em] text-[#ffb488] uppercase">
            {t("dashboard.artist.trackCatalog.eyebrow")}
          </p>
          <h3 className="mt-2 font-graphik text-[26px] tracking-[-0.03em] text-white">
            {t("dashboard.artist.trackCatalog.title")}
          </h3>
          <p className="mt-2 max-w-[560px] text-[14px] leading-6 text-white/52">
            {t("dashboard.artist.trackCatalog.description")}
          </p>
        </div>

        {/* Search and Filter Popover Button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex min-h-[44px] items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 focus-within:border-[#ff8b4d]/40 focus-within:bg-white/[0.07] transition">
            <Search className="h-4 w-4 text-white/42" strokeWidth={1.7} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t("dashboard.artist.trackCatalog.searchLabel")}
              placeholder={t("dashboard.artist.trackCatalog.searchPlaceholder")}
              className="w-full min-w-[220px] bg-transparent text-[13px] text-white outline-none placeholder:text-white/36"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="rounded-full p-0.5 text-white/40 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>

          {/* Filter Popover Trigger */}
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-4 text-[12px] transition ${
                hasActiveAdvancedFilter
                  ? "border-[#ff8b4d]/50 bg-[#ff8b4d]/15 text-[#ffb488]"
                  : "border-white/10 bg-white/[0.04] text-white/74 hover:bg-white/[0.08]"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.7} />
              <span>{t("dashboard.artist.trackCatalog.filter")}</span>
              {hasActiveAdvancedFilter && (
                <span className="h-2 w-2 rounded-full bg-[#ff7a2c]" />
              )}
            </button>

            {/* Filter Popover Content */}
            {isFilterMenuOpen && (
              <div className="absolute right-0 top-full mt-2 z-40 w-72 rounded-2xl border border-white/12 bg-[#171821] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-white/8">
                  <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-white/70">
                    {t("dashboard.artist.trackCatalog.filter")}
                  </span>
                  {hasActiveAdvancedFilter && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="flex items-center gap-1 text-[11px] text-[#ffb488] hover:underline"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {t("dashboard.artist.trackCatalog.resetFilter")}
                    </button>
                  )}
                </div>

                {/* Visibility Filter */}
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/40 mb-2">
                    {t("dashboard.artist.trackCatalog.visibilityLabel")}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: "all" as TrackFilterVisibility, labelKey: "all" },
                      { key: "public" as TrackFilterVisibility, labelKey: "public" },
                      { key: "private" as TrackFilterVisibility, labelKey: "private" },
                      { key: "unlisted" as TrackFilterVisibility, labelKey: "unlisted" },
                    ].map(({ key: vKey, labelKey }) => (
                      <button
                        key={vKey}
                        type="button"
                        onClick={() => setVisibilityFilter(vKey)}
                        className={`rounded-xl px-2.5 py-1.5 text-left text-[11px] transition ${
                          visibilityFilter === vKey
                            ? "bg-[#ff7a2c]/20 text-[#ffb488] font-medium"
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {t(`dashboard.artist.trackCatalog.visibilities.${labelKey}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Option */}
                <div className="mt-4 pt-3 border-t border-white/8">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/40 mb-2">
                    {t("dashboard.artist.trackCatalog.sortLabel")}
                  </p>
                  <div className="flex flex-col gap-1">
                    {[
                      { key: "newest" as TrackSortOption, label: "Mới cập nhật" },
                      { key: "oldest" as TrackSortOption, label: "Cũ nhất" },
                      { key: "most_played" as TrackSortOption, label: "Lượt nghe nhiều nhất" },
                      { key: "most_liked" as TrackSortOption, label: "Lượt thích nhiều nhất" },
                      { key: "title_asc" as TrackSortOption, label: "Tên A - Z" },
                    ].map(({ key: sKey, label }) => (
                      <button
                        key={sKey}
                        type="button"
                        onClick={() => setSortOption(sKey)}
                        className={`rounded-xl px-2.5 py-1.5 text-left text-[11px] transition ${
                          sortOption === sKey
                            ? "bg-[#ff7a2c]/20 text-[#ffb488] font-medium"
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upload Track Button */}
          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff7a2c] to-[#ff9e58] px-5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(255,122,44,0.25)] hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            <span>{t("dashboard.artist.trackCatalog.uploadTrack", "Tải lên bài hát mới")}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs (All / Draft / Published) */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all" as TrackFilterStatus, labelKey: "all", count: counts.all },
            { key: "draft" as TrackFilterStatus, labelKey: "draft", count: counts.draft },
            { key: "published" as TrackFilterStatus, labelKey: "published", count: counts.published },
          ].map(({ key, labelKey, count }) => {
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-medium transition active:scale-95 ${
                  isActive
                    ? "border-[#ff8b4d]/40 bg-[#ff8b4d]/15 text-[#ffb488] shadow-[0_0_20px_rgba(255,122,44,0.12)]"
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white"
                }`}
              >
                <span>{t(`dashboard.artist.trackCatalog.filters.${labelKey}`)}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    isActive ? "bg-[#ff8b4d]/30 text-white" : "bg-white/10 text-white/50"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Add track button */}
        <button
          type="button"
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-[12px] text-white hover:bg-white/[0.1] hover:border-white/25 active:scale-95 transition"
        >
          <Music className="h-3.5 w-3.5 text-[#ffb488]" />
          <span>+ Thêm bài hát</span>
        </button>
      </div>

      {/* Tracks Table / Catalog List */}
      <div className="mt-5 rounded-[22px] border border-white/8 bg-black/20">
        {/* Table Header */}
        <div className="hidden grid-cols-[minmax(260px,1.5fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)_minmax(130px,0.8fr)_110px] gap-4 border-b border-white/8 bg-white/[0.03] px-5 py-3.5 text-[11px] tracking-[0.16em] text-white/42 uppercase md:grid">
          <span>{t("dashboard.artist.trackCatalog.columns.track")}</span>
          <span>{t("dashboard.artist.trackCatalog.columns.status")}</span>
          <span>{t("dashboard.artist.trackCatalog.columns.visibility")}</span>
          <span>{t("dashboard.artist.trackCatalog.columns.updatedAt")}</span>
          <span className="text-right">{t("dashboard.artist.trackCatalog.columns.actions")}</span>
        </div>

        {/* Empty State */}
        {filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.04] border border-white/8 text-white/40 mb-3">
              <ListMusic className="h-8 w-8" />
            </div>
            <h4 className="text-[16px] font-medium text-white">
              {t("dashboard.artist.trackCatalog.emptyTitle")}
            </h4>
            <p className="mt-1.5 max-w-sm text-[13px] text-white/50">
              {t("dashboard.artist.trackCatalog.emptyDesc")}
            </p>
            {(searchTerm || statusFilter !== "all" || visibilityFilter !== "all") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[12px] text-[#ffb488] hover:bg-white/[0.09] transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("dashboard.artist.trackCatalog.clearSearch")}
              </button>
            )}
          </div>
        ) : (
          /* Table Rows */
          <div className="divide-y divide-white/8">
            {filteredTracks.map((track, trackIndex) => {
              const isPlaying = playingTrackId === track.id;
              const isMenuOpen = activeMenuTrackId === track.id;

              return (
                <div
                  key={track.id}
                  className="group relative grid gap-4 px-4 py-4 transition-colors hover:bg-white/[0.04] md:grid-cols-[minmax(260px,1.5fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)_minmax(130px,0.8fr)_110px] md:items-center md:px-5"
                >
                  {/* Column 1: Track Title + Artwork + Play Button */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-white/12 shadow-sm overflow-hidden group/art cursor-pointer"
                      style={{
                        background:
                          track.coverGradient ||
                          "linear-gradient(135deg, #ff7a2c, #7a5cff)",
                      }}
                      onClick={() => onTogglePlayTrack(track)}
                    >
                      {track.coverUrl && (
                        <img
                          src={
                            track.coverUrl.startsWith("http") ||
                            track.coverUrl.startsWith("blob:") ||
                            track.coverUrl.startsWith("data:")
                              ? track.coverUrl
                              : `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}${
                                  track.coverUrl.startsWith("/") ? "" : "/"
                                }${track.coverUrl}`
                          }
                          alt=""
                          onError={(e) => {
                            // Ẩn ảnh bị hỏng để hiện gradient và ký tự viết tắt đẹp mắt
                            e.currentTarget.style.display = "none";
                          }}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      )}
                      {isPlaying ? (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                          <Pause className="h-5 w-5 fill-current animate-pulse" />
                        </div>
                      ) : (
                        <>
                          <span className="text-[12px] font-bold text-white group-hover/art:opacity-0 transition-opacity">
                            {track.title.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/art:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-white truncate group-hover:text-[#ffb488] transition-colors">
                        {track.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[12px] text-white/48">
                        <span className="truncate">{track.genre}</span>
                        {track.duration && (
                          <>
                            <span>•</span>
                            <span>{track.duration}</span>
                          </>
                        )}
                        {track.explicit && (
                          <span className="inline-grid h-3.5 w-3.5 place-items-center rounded bg-white/15 text-[8px] font-bold text-white">
                            E
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Status */}
                  <div>
                    {track.status === "published" || track.moderationStatus === "approved" ? (
                      <span className="inline-flex items-center gap-2 text-[12px] text-emerald-400 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {t("dashboard.artist.trackCatalog.filters.published")}
                      </span>
                    ) : track.moderationStatus === "pending" ? (
                      <span className="inline-flex items-center gap-2 text-[12px] text-amber-300 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        {t("dashboard.artist.trackCatalog.filters.pending", "Chờ kiểm duyệt")}
                      </span>
                    ) : track.moderationStatus === "needs_revision" ? (
                      <span className="inline-flex items-center gap-2 text-[12px] text-orange-400 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                        {t("dashboard.artist.trackCatalog.filters.needs_revision", "Cần chỉnh sửa")}
                      </span>
                    ) : track.moderationStatus === "rejected" ? (
                      <span className="inline-flex items-center gap-2 text-[12px] text-rose-400 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                        {t("dashboard.artist.trackCatalog.filters.rejected", "Bị từ chối")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-[12px] text-white/45 font-normal">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                        {t("dashboard.artist.trackCatalog.filters.draft")}
                      </span>
                    )}
                  </div>

                  {/* Column 3: Visibility */}
                  <div>
                    {track.visibility === "public" && (
                      <span className="inline-flex items-center gap-2 text-[12px] text-white/60">
                        <Globe2 className="h-3.5 w-3.5 text-white/40" strokeWidth={1.7} />
                        {t("dashboard.artist.trackCatalog.visibilities.public")}
                      </span>
                    )}
                    {track.visibility === "private" && (
                      <span className="inline-flex items-center gap-2 text-[12px] text-white/60">
                        <Lock className="h-3.5 w-3.5 text-white/40" strokeWidth={1.7} />
                        {t("dashboard.artist.trackCatalog.visibilities.private")}
                      </span>
                    )}
                    {track.visibility === "unlisted" && (
                      <span className="inline-flex items-center gap-2 text-[12px] text-white/60">
                        <EyeOff className="h-3.5 w-3.5 text-white/40" strokeWidth={1.7} />
                        {t("dashboard.artist.trackCatalog.visibilities.unlisted")}
                      </span>
                    )}
                  </div>

                  {/* Column 4: Updated At */}
                  <div>
                    <p className="text-[13px] text-white/60">{track.updatedAt}</p>
                    {track.plays > 0 && (
                      <p className="mt-0.5 text-[11px] text-white/40">
                        {track.plays.toLocaleString()} plays
                      </p>
                    )}
                  </div>

                  {/* Column 5: Action Buttons */}
                  <div className="flex items-center justify-start gap-1.5 md:justify-end">
                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => onEditTrack(track)}
                      aria-label={t("dashboard.artist.trackCatalog.actions.edit")}
                      title={t("dashboard.artist.trackCatalog.actions.edit")}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.1] hover:text-white active:scale-95 transition"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => onDeleteTrack(track)}
                      aria-label={t("dashboard.artist.trackCatalog.actions.delete")}
                      title={t("dashboard.artist.trackCatalog.actions.delete")}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-red-300/60 hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-300 active:scale-95 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>

                    {/* More Menu Button */}
                    <div className="relative" ref={isMenuOpen ? trackMenuRef : null}>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveMenuTrackId(isMenuOpen ? null : track.id)
                        }
                        aria-label={t("dashboard.artist.trackCatalog.actions.more")}
                        title={t("dashboard.artist.trackCatalog.actions.more")}
                        className={`grid h-8 w-8 place-items-center rounded-full border transition active:scale-95 ${
                          isMenuOpen
                            ? "border-white/30 bg-white/20 text-white"
                            : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.1] hover:text-white"
                        }`}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </button>

                      {/* Dropdown Popover */}
                      {isMenuOpen && (
                        <div
                          className={`absolute right-0 z-50 w-56 rounded-2xl border border-white/12 bg-[#171821] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
                            filteredTracks.length <= 2 || trackIndex >= filteredTracks.length - 2
                              ? "bottom-full mb-2"
                              : "top-full mt-2"
                          }`}
                        >
                          {/* Play Preview */}
                          <button
                            type="button"
                            onClick={() => {
                              onTogglePlayTrack(track);
                              setActiveMenuTrackId(null);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] text-white/80 hover:bg-white/10 hover:text-white transition"
                          >
                            {isPlaying ? (
                              <>
                                <Pause className="h-3.5 w-3.5 text-white/60" />
                                <span>{t("dashboard.artist.trackCatalog.menu.pause")}</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3.5 w-3.5 text-white/60" />
                                <span>{t("dashboard.artist.trackCatalog.menu.play")}</span>
                              </>
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              onEditTrack(track);
                              setActiveMenuTrackId(null);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] text-white/80 hover:bg-white/10 hover:text-white transition"
                          >
                            <Pencil className="h-3.5 w-3.5 text-white/50" />
                            <span>{t("dashboard.artist.trackCatalog.menu.edit")}</span>
                          </button>

                          {/* Toggle Status (Draft <-> Published) */}
                          <button
                            type="button"
                            onClick={() => {
                              onToggleStatus(track);
                              setActiveMenuTrackId(null);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] text-white/80 hover:bg-white/10 hover:text-white transition"
                          >
                            {track.status === "draft" ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-white/50" />
                                <span>{t("dashboard.artist.trackCatalog.menu.publish")}</span>
                              </>
                            ) : (
                              <>
                                <Radio className="h-3.5 w-3.5 text-white/50" />
                                <span>{t("dashboard.artist.trackCatalog.menu.draft")}</span>
                              </>
                            )}
                          </button>

                          {/* Toggle Visibility (Public <-> Private) */}
                          <button
                            type="button"
                            onClick={() => {
                              onToggleVisibility(track);
                              setActiveMenuTrackId(null);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] text-white/80 hover:bg-white/10 hover:text-white transition"
                          >
                            {track.visibility === "public" ? (
                              <>
                                <Lock className="h-3.5 w-3.5 text-white/50" />
                                <span>{t("dashboard.artist.trackCatalog.menu.makePrivate")}</span>
                              </>
                            ) : (
                              <>
                                <Globe2 className="h-3.5 w-3.5 text-white/50" />
                                <span>{t("dashboard.artist.trackCatalog.menu.makePublic")}</span>
                              </>
                            )}
                          </button>

                          {/* Copy Link */}
                          <button
                            type="button"
                            onClick={() => {
                              onCopyLink(track);
                              setActiveMenuTrackId(null);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] text-white/80 hover:bg-white/10 hover:text-white transition"
                          >
                            <Copy className="h-3.5 w-3.5 text-white/50" />
                            <span>{t("dashboard.artist.trackCatalog.menu.copyLink")}</span>
                          </button>

                          {/* Delete */}
                          <div className="my-1 border-t border-white/8" />
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteTrack(track);
                              setActiveMenuTrackId(null);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] text-red-300 hover:bg-red-500/15 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            <span>{t("dashboard.artist.trackCatalog.menu.delete")}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Catalog Summary Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-2 text-[12px] text-white/44">
        <span>
          Đang hiển thị <strong className="text-white/80">{filteredTracks.length}</strong> / {tracks.length} bài hát
        </span>
        <span>Studio Audio Engine v2.4 • Moodify</span>
      </div>
    </div>
  );
}
