"use client";

import { useTranslation } from "react-i18next";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { ArtistTrack } from "../types";

type TrackDeleteModalProps = {
  isOpen: boolean;
  track: ArtistTrack | null;
  onClose: () => void;
  onConfirm: (trackId: string) => void;
};

export function TrackDeleteModal({
  isOpen,
  track,
  onClose,
  onConfirm,
}: TrackDeleteModalProps) {
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
      <div className="relative w-full max-w-md rounded-[28px] border border-red-500/20 bg-[#141214] p-6 sm:p-7 shadow-[0_25px_80px_rgba(239,68,68,0.15)] backdrop-blur-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/15 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-graphik text-[18px] font-medium text-white">
                {t("dashboard.artist.trackCatalog.modal.deleteTitle")}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.1] hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex items-center gap-3.5">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10"
              style={{ background: track.coverGradient || "linear-gradient(135deg, #ff7a2c, #7a5cff)" }}
            >
              <span className="text-[12px] font-bold text-white">
                {track.title.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-white truncate">{track.title}</p>
              <p className="text-[12px] text-white/50">{track.genre} • {track.duration}</p>
            </div>
          </div>

          <p className="text-[13px] leading-relaxed text-red-200/80">
            {t("dashboard.artist.trackCatalog.modal.deleteWarning")}
          </p>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-[13px] text-white/70 hover:bg-white/[0.08] hover:text-white transition"
          >
            {t("dashboard.artist.trackCatalog.modal.cancel")}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(track.id)}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_25px_rgba(220,38,38,0.35)] hover:bg-red-500 active:scale-95 transition"
          >
            <Trash2 className="h-4 w-4" />
            {t("dashboard.artist.trackCatalog.modal.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
