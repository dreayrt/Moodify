"use client";

import { useEffect, useRef, useState } from "react";
import { Music2, X } from "lucide-react";
import { AdminPreviewTrack } from "../../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8088";

// The backend resolves collector and uploaded media paths. Never substitute another song.
export function resolveAudioStreamUrl(rawUrl?: string | null): string {
  const url = rawUrl?.trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

type Props = {
  track: AdminPreviewTrack | null;
  isPlaying?: boolean;
  onTogglePlay?: (playing: boolean) => void;
  onClose: () => void;
};

export function AdminAudioPlayerDock({ track, isPlaying = false, onTogglePlay, onClose }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [error, setError] = useState("");
  const source = resolveAudioStreamUrl(track?.audioUrl);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!source || !isPlaying) {
      audio.pause();
      return;
    }
    let cancelled = false;
    void audio.play().catch((cause: unknown) => {
      if (cancelled || (cause instanceof Error && cause.name === "AbortError")) return;
      setError("Không phát được tệp âm thanh. Hãy kiểm tra nguồn hoặc nhấn phát lại.");
      onTogglePlay?.(false);
    });
    return () => { cancelled = true; };
  }, [source, isPlaying, onTogglePlay]);

  if (!track) return null;
  return (
    <section aria-label="Nghe thử bài hát" className="fixed bottom-3 left-3 right-3 z-40 mx-auto max-w-3xl rounded-xl border border-zinc-700 bg-[#171822] p-3 shadow-xl sm:bottom-5 sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Music2 aria-hidden="true" className="h-5 w-5 shrink-0 text-[#ff5500]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white" title={track.title}>{track.title}</p>
          <p className="truncate text-xs text-zinc-400">{track.artist}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng trình phát" className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      {source ? <audio key={source} ref={audioRef} src={source} controls preload="metadata" className="mt-3 h-10 w-full"
        onPlay={() => { setError(""); onTogglePlay?.(true); }}
        onPause={() => onTogglePlay?.(false)} onEnded={() => onTogglePlay?.(false)}
        onError={() => { setError("Không tải được âm thanh của bài hát này."); onTogglePlay?.(false); }}
      /> : <p role="status" className="mt-2 text-sm text-amber-300">Bài hát chưa có tệp âm thanh để nghe thử.</p>}
      {error && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
    </section>
  );
}
