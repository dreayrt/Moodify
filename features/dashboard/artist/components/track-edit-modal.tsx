"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Save, Music2, Globe2, Lock, EyeOff } from "lucide-react";
import { ArtistTrack, TrackStatus, TrackVisibility } from "../types";

type TrackEditModalProps = {
  isOpen: boolean;
  track: ArtistTrack | null;
  onClose: () => void;
  onSave: (updatedTrack: ArtistTrack) => void;
};

function TrackEditForm({
  track,
  onClose,
  onSave,
}: {
  track: ArtistTrack;
  onClose: () => void;
  onSave: (updatedTrack: ArtistTrack) => void;
}) {
  const { t } = useTranslation();

  const [title, setTitle] = useState(track.title);
  const [genre, setGenre] = useState(track.genre || "");
  const [status, setStatus] = useState<TrackStatus>(track.status);
  const [visibility, setVisibility] = useState<TrackVisibility>(track.visibility);
  const [bpm, setBpm] = useState<number | undefined>(track.bpm);
  const [key, setKey] = useState(track.key || "");
  const [description, setDescription] = useState(track.description || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...track,
      title: title.trim(),
      genre: genre.trim() || "Electronic",
      status,
      visibility,
      bpm: bpm ? Number(bpm) : undefined,
      key: key.trim() || undefined,
      description: description.trim() || undefined,
      updatedAt: "Vừa xong",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      {/* Title Input */}
      <div>
        <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-white/60 mb-2">
          {t("dashboard.artist.trackCatalog.modal.trackName")} <span className="text-[#ff7a2c]">*</span>
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("dashboard.artist.trackCatalog.modal.trackNamePlaceholder")}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 focus:bg-white/[0.07] transition"
        />
      </div>

      {/* Genre & Key row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-white/60 mb-2">
            {t("dashboard.artist.trackCatalog.modal.genre")}
          </label>
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder={t("dashboard.artist.trackCatalog.modal.genrePlaceholder")}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 focus:bg-white/[0.07] transition"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-white/60 mb-2">
            {t("dashboard.artist.trackCatalog.modal.key")} & {t("dashboard.artist.trackCatalog.modal.bpm")}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Key (vd: A Min)"
              className="w-1/2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 transition"
            />
            <input
              type="number"
              value={bpm ?? ""}
              onChange={(e) => setBpm(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="BPM (128)"
              className="w-1/2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 transition"
            />
          </div>
        </div>
      </div>

      {/* Status Selection */}
      <div>
        <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-white/60 mb-2">
          {t("dashboard.artist.trackCatalog.modal.status")}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setStatus("published")}
            className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-[13px] font-medium transition ${
              status === "published"
                ? "border-white/20 bg-white/[0.08] text-white"
                : "border-white/8 bg-white/[0.02] text-white/50 hover:text-white/80"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${status === "published" ? "bg-emerald-400" : "bg-white/30"}`} />
            {t("dashboard.artist.trackCatalog.filters.published")}
          </button>
          <button
            type="button"
            onClick={() => setStatus("draft")}
            className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-[13px] font-medium transition ${
              status === "draft"
                ? "border-white/20 bg-white/[0.08] text-white"
                : "border-white/8 bg-white/[0.02] text-white/50 hover:text-white/80"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${status === "draft" ? "bg-white/60" : "bg-white/20"}`} />
            {t("dashboard.artist.trackCatalog.filters.draft")}
          </button>
        </div>
      </div>

      {/* Visibility Selection */}
      <div>
        <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-white/60 mb-2">
          {t("dashboard.artist.trackCatalog.modal.visibility")}
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { key: "public" as TrackVisibility, labelKey: "public", icon: Globe2 },
            { key: "private" as TrackVisibility, labelKey: "private", icon: Lock },
            { key: "unlisted" as TrackVisibility, labelKey: "unlisted", icon: EyeOff },
          ].map(({ key: visKey, labelKey, icon: Icon }) => (
            <button
              key={visKey}
              type="button"
              onClick={() => setVisibility(visKey)}
              className={`flex items-center justify-center gap-2 rounded-2xl border py-2.5 px-3 text-[12px] font-medium transition ${
                visibility === visKey
                  ? "border-[#ff8b4d]/40 bg-[#ff8b4d]/10 text-[#ffb488]"
                  : "border-white/8 bg-white/[0.02] text-white/50 hover:text-white/80"
              }`}
            >
              <Icon className="h-3.5 w-3.5 text-white/50" />
              {t(`dashboard.artist.trackCatalog.visibilities.${labelKey}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-white/60 mb-2">
          {t("dashboard.artist.trackCatalog.modal.description")}
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("dashboard.artist.trackCatalog.modal.descriptionPlaceholder")}
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 focus:bg-white/[0.07] transition"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/8">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-[13px] text-white/70 hover:bg-white/[0.08] hover:text-white transition"
        >
          {t("dashboard.artist.trackCatalog.modal.cancel")}
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff7a2c] to-[#ff9e64] px-6 py-2.5 text-[13px] font-medium text-black shadow-[0_10px_25px_rgba(255,122,44,0.3)] hover:brightness-110 active:scale-95 transition"
        >
          <Save className="h-4 w-4" />
          {t("dashboard.artist.trackCatalog.modal.save")}
        </button>
      </div>
    </form>
  );
}

export function TrackEditModal({
  isOpen,
  track,
  onClose,
  onSave,
}: TrackEditModalProps) {
  const { t } = useTranslation();

  if (!isOpen || !track) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl rounded-[28px] border border-white/12 bg-[#121318] p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff7a2c]/15 text-[#ffb488]">
              <Music2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-graphik text-[20px] font-medium text-white">
                {t("dashboard.artist.trackCatalog.modal.editTitle")}
              </h3>
              <p className="text-[12px] text-white/50">{track.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.1] hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <TrackEditForm
          key={track.id}
          track={track}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  );
}
