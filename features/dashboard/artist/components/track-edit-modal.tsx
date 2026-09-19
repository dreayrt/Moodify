"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Save, Music2, Globe2, Lock, EyeOff } from "lucide-react";
import { ArtistTrack, TrackStatus, TrackVisibility } from "../types";

type TrackEditModalProps = {
  isOpen: boolean;
  track: ArtistTrack | null;
  onClose: () => void;
  onSave: (updatedTrack: ArtistTrack) => Promise<void> | void;
  isSaving?: boolean;
};

function TrackEditForm({
  track,
  onClose,
  onSave,
  isSaving = false,
}: {
  track: ArtistTrack;
  onClose: () => void;
  onSave: (updatedTrack: ArtistTrack) => Promise<void> | void;
  isSaving?: boolean;
}) {
  const { t } = useTranslation();

  const [title, setTitle] = useState(track.title);
  const [genre, setGenre] = useState(track.genre || "Pop");
  const [featuredArtists, setFeaturedArtists] = useState(track.featuredArtists || "");
  const [albumName, setAlbumName] = useState(track.albumName || "");
  const [explicit, setExplicit] = useState(track.explicit || false);
  const [status, setStatus] = useState<TrackStatus>(track.status);
  const [visibility, setVisibility] = useState<TrackVisibility>(track.visibility);
  const [description, setDescription] = useState(track.description || "");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [track.id, track.coverUrl]);

  const resolvedCoverUrl = (() => {
    if (!track.coverUrl) return "";
    if (
      track.coverUrl.startsWith("http://") ||
      track.coverUrl.startsWith("https://") ||
      track.coverUrl.startsWith("blob:") ||
      track.coverUrl.startsWith("data:")
    ) {
      return track.coverUrl;
    }
    const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
    return `${baseUrl}${track.coverUrl.startsWith("/") ? "" : "/"}${track.coverUrl}`;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;

    await onSave({
      ...track,
      title: title.trim(),
      genre: genre.trim() || "Pop",
      featuredArtists: featuredArtists.trim() || undefined,
      albumName: albumName.trim() || undefined,
      explicit,
      status,
      visibility,
      description: description.trim() || undefined,
      updatedAt: "Vừa xong",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
      <div className="px-6 sm:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Media Info, Status & Visibility (5 cols) */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Track Artwork & Quick Info Box */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
              <div
                className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-white/10 shadow-sm overflow-hidden"
                style={{
                  background:
                    track.coverGradient ||
                    "linear-gradient(135deg, #ff7a2c, #7a5cff)",
                }}
              >
                {resolvedCoverUrl && !imgError ? (
                  <img
                    src={resolvedCoverUrl}
                    alt={track.title}
                    onError={() => setImgError(true)}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[14px] font-bold text-white font-mono">
                    {track.title.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-white truncate">
                  {title || track.title}
                </p>
                <p className="text-[11px] text-white/50 truncate mt-0.5">
                  {track.artist || "You (Artist)"}
                </p>
                <p className="text-[10px] text-[#ffb488] font-mono mt-0.5">
                  ID: {track.id}
                </p>
              </div>
            </div>

            {/* Status Selection */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                {t("dashboard.artist.trackCatalog.modal.status")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("published")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[12px] font-medium transition ${
                    status === "published"
                      ? "border-white/20 bg-white/[0.08] text-white shadow-sm"
                      : "border-white/8 bg-white/[0.02] text-white/50 hover:text-white/80"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      status === "published" ? "bg-emerald-400" : "bg-white/30"
                    }`}
                  />
                  {t("dashboard.artist.trackCatalog.filters.published")}
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("draft")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[12px] font-medium transition ${
                    status === "draft"
                      ? "border-white/20 bg-white/[0.08] text-white shadow-sm"
                      : "border-white/8 bg-white/[0.02] text-white/50 hover:text-white/80"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      status === "draft" ? "bg-white/60" : "bg-white/20"
                    }`}
                  />
                  {t("dashboard.artist.trackCatalog.filters.draft")}
                </button>
              </div>
            </div>

            {/* Visibility Selection */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                {t("dashboard.artist.trackCatalog.modal.visibility")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "public" as TrackVisibility, labelKey: "public", icon: Globe2 },
                  { key: "private" as TrackVisibility, labelKey: "private", icon: Lock },
                  { key: "unlisted" as TrackVisibility, labelKey: "unlisted", icon: EyeOff },
                ].map(({ key: visKey, labelKey, icon: Icon }) => (
                  <button
                    key={visKey}
                    type="button"
                    onClick={() => setVisibility(visKey)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-1 text-[11px] font-medium whitespace-nowrap transition ${
                      visibility === visKey
                        ? "border-[#ff8b4d]/40 bg-[#ff8b4d]/10 text-[#ffb488]"
                        : "border-white/8 bg-white/[0.02] text-white/50 hover:text-white/80"
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span>{t(`dashboard.artist.trackCatalog.visibilities.${labelKey}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Explicit 18+ Checkbox */}
            <div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-xl border border-white/8 bg-white/[0.02] p-2 hover:border-white/15 transition">
                <input
                  type="checkbox"
                  checked={explicit}
                  onChange={(e) => setExplicit(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 text-[#ff7a2c] focus:ring-0 accent-[#ff7a2c]"
                />
                <div className="flex items-center gap-2">
                  <span className="inline-grid h-3.5 w-3.5 place-items-center rounded bg-white/15 text-[8px] font-bold text-white">
                    E
                  </span>
                  <span className="text-[11px] font-medium text-white/90">
                    {t("dashboard.artist.trackCatalog.modal.explicit")}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* RIGHT COLUMN: Track Metadata & Description (7 cols) */}
          <div className="lg:col-span-7 space-y-3.5">
            {/* Title Input */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                {t("dashboard.artist.trackCatalog.modal.trackName")} <span className="text-[#ff7a2c]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("dashboard.artist.trackCatalog.modal.trackNamePlaceholder")}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 focus:bg-white/[0.07] transition"
              />
            </div>

            {/* Genre & Featured Artists */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                  {t("dashboard.artist.trackCatalog.modal.genre")}
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder={t("dashboard.artist.trackCatalog.modal.genrePlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                  {t("dashboard.artist.trackCatalog.modal.featuredArtists")}
                </label>
                <input
                  type="text"
                  value={featuredArtists}
                  onChange={(e) => setFeaturedArtists(e.target.value)}
                  placeholder={t("dashboard.artist.trackCatalog.modal.featuredArtistsPlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 transition"
                />
              </div>
            </div>

            {/* Album */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                {t("dashboard.artist.trackCatalog.modal.album")}
              </label>
              <input
                type="text"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                placeholder={t("dashboard.artist.trackCatalog.modal.albumPlaceholder")}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 transition"
              />
            </div>

            {/* Description / Notes */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                {t("dashboard.artist.trackCatalog.modal.description")}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("dashboard.artist.trackCatalog.modal.descriptionPlaceholder")}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-[12px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 transition"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="flex items-center justify-between px-6 sm:px-8 py-3.5 border-t border-white/8 bg-[#121318] shrink-0">
        <div className="text-[11px] text-white/40">
          Chỉnh sửa thông tin bài hát
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-white/70 hover:bg-white/[0.08] hover:text-white transition"
          >
            {t("dashboard.artist.trackCatalog.modal.cancel")}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff7a2c] to-[#ff9e64] px-5 py-2 text-[12px] font-semibold text-black shadow-[0_8px_20px_rgba(255,122,44,0.3)] hover:brightness-110 active:scale-95 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Đang lưu..." : t("dashboard.artist.trackCatalog.modal.save")}</span>
          </button>
        </div>
      </div>
    </form>
  );
}

export function TrackEditModal({
  isOpen,
  track,
  onClose,
  onSave,
  isSaving = false,
}: TrackEditModalProps) {
  const { t } = useTranslation();

  if (!isOpen || !track) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={isSaving ? undefined : onClose}
      />

      {/* Modal Container: Compact 2-Column Wide Layout (No Scroll) */}
      <div className="relative w-full max-w-3xl flex flex-col rounded-[28px] border border-white/12 bg-[#121318] shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-3.5 border-b border-white/8 shrink-0 bg-[#121318]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff7a2c]/15 text-[#ffb488]">
              <Music2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-graphik text-[18px] sm:text-[20px] font-semibold text-white">
                {t("dashboard.artist.trackCatalog.modal.editTitle")}
              </h3>
              <p className="text-[12px] text-white/50">{track.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.1] hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <TrackEditForm
          key={track.id}
          track={track}
          onClose={onClose}
          onSave={onSave}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
