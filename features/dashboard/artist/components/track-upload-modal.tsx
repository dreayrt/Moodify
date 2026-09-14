"use client";

import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { UploadCloud, X, Check, Globe2, Lock, EyeOff, FileAudio } from "lucide-react";
import { ArtistTrack, TrackStatus, TrackVisibility } from "../types";

type TrackUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newTrack: ArtistTrack) => void;
};

const GRADIENT_PALETTES = [
  "linear-gradient(135deg, #ff7a2c, #7a5cff)",
  "linear-gradient(135deg, #5cffd1, #2c2c52)",
  "linear-gradient(135deg, #ff8fbf, #7a1c4a)",
  "linear-gradient(135deg, #bff0d8, #3da080)",
  "linear-gradient(135deg, #ffae5a, #9a4d2a)",
  "linear-gradient(135deg, #a0b0ff, #1f1f3f)",
];

function createTrackId(counter: number): string {
  return `trk-${counter}`;
}

export function TrackUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: TrackUploadModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackCounterRef = useRef<number>(100);

  const [selectedFileName, setSelectedFileName] = useState<string>("" );
  const [fileSize, setFileSize] = useState<string>("");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("EDM / Dance");
  const [status, setStatus] = useState<TrackStatus>("published");
  const [visibility, setVisibility] = useState<TrackVisibility>("public");
  const [bpm, setBpm] = useState<number | undefined>(128);
  const [key, setKey] = useState("F# Min");
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setSelectedFileName(file.name);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    setFileSize(`${sizeInMB} MB`);

    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    if (!title || title.trim() === "") {
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || selectedFileName || "Untitled Track";

    trackCounterRef.current += 1;
    const gradientIdx = trackCounterRef.current % GRADIENT_PALETTES.length;
    const coverGradient = GRADIENT_PALETTES[gradientIdx];
    const trackId = createTrackId(trackCounterRef.current);

    const newTrack: ArtistTrack = {
      id: trackId,
      title: finalTitle,
      artist: "You (Artist Studio)",
      genre: genre.trim() || "Electronic",
      duration: "3:30",
      status,
      visibility,
      plays: 0,
      likes: 0,
      commentsCount: 0,
      bpm: bpm ? Number(bpm) : 124,
      key: key.trim() || "A Min",
      coverGradient,
      description: description.trim() || undefined,
      updatedAt: "Vừa xong",
      createdAt: "2026-03-14",
    };

    onUploadSuccess(newTrack);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSelectedFileName("");
    setFileSize("");
    setTitle("");
    setGenre("EDM / Dance");
    setStatus("published");
    setVisibility("public");
    setDescription("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl rounded-[30px] border border-white/12 bg-[#121318] p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-tr from-[#ff7a2c] to-[#ffb488] text-black">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-graphik text-[22px] font-medium text-white">
                {t("dashboard.artist.trackCatalog.modal.uploadTitle")}
              </h3>
              <p className="text-[13px] text-white/50">
                {t("dashboard.artist.trackCatalog.modal.uploadSubtitle")}
              </p>
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Dropzone */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*,.mp3,.wav,.flac,.aac,.m4a"
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
              isDragging
                ? "border-[#ff7a2c] bg-[#ff7a2c]/10 scale-[1.01]"
                : selectedFileName
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
            }`}
          >
            {selectedFileName ? (
              <div className="flex items-center justify-center gap-3 text-emerald-300">
                <FileAudio className="h-7 w-7 text-emerald-400" />
                <div className="text-left">
                  <p className="text-[14px] font-medium text-white truncate max-w-xs">{selectedFileName}</p>
                  <p className="text-[12px] text-emerald-400/80">{fileSize} • File đã sẵn sàng để lưu</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06] text-white/80 mb-3">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <p className="text-[13px] font-medium text-white/90">
                  {t("dashboard.artist.trackCatalog.modal.uploadDropzone")}
                </p>
                <p className="mt-1 text-[11px] text-white/40">
                  Hỗ trợ MP3, WAV, FLAC, AAC tối đa 100MB
                </p>
              </div>
            )}
          </div>

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
                  placeholder="Key (F# Min)"
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
              <Check className="h-4 w-4" />
              {t("dashboard.artist.trackCatalog.modal.upload")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
