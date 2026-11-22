"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  AlertCircle,
} from "lucide-react";
import { ModerationTrack } from "../types";

type ModeratorAudioPlayerProps = {
  track: ModerationTrack;
  autoPlay?: boolean;
};

export function ModeratorAudioPlayer({
  track,
  autoPlay = false,
}: ModeratorAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(track.durationSec || 0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5 | 2>(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [prevTrackId, setPrevTrackId] = useState(track.id);
  if (track.id !== prevTrackId) {
    setPrevTrackId(track.id);
    setCurrentTime(0);
    setDuration(track.durationSec || 0);
    setIsPlaying(false);
    setAudioError(null);
  }

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const resolvedAudioUrl = (() => {
    if (!track.audioUrl) return "";
    if (
      track.audioUrl.startsWith("http://") ||
      track.audioUrl.startsWith("https://") ||
      track.audioUrl.startsWith("blob:") ||
      track.audioUrl.startsWith("data:")
    ) {
      return track.audioUrl;
    }
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8088";
    return `${baseUrl.replace(/\/$/, "")}${track.audioUrl.startsWith("/") ? "" : "/"}${track.audioUrl}`;
  })();

  const hasAudio = Boolean(resolvedAudioUrl);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.playbackRate = playbackRate;
    if (autoPlay && resolvedAudioUrl) {
      el.play()
        .then(() => {
          setAudioError(null);
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, [track.id, autoPlay, playbackRate, resolvedAudioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || !hasAudio) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      setAudioError(null);
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
          setAudioError("Không thể phát tệp âm thanh này.");
        });
    }
  };

  const skipTime = (deltaSeconds: number) => {
    if (!hasAudio || duration <= 0) return;
    const nextTime = Math.max(0, Math.min(duration, currentTime + deltaSeconds));
    setCurrentTime(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasAudio || duration <= 0) return;
    const nextTime = parseFloat(e.target.value);
    setCurrentTime(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const handleRateChange = (rate: 1 | 1.25 | 1.5 | 2) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      const restored = volume > 0 ? volume : 0.85;
      setVolume(restored);
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = restored;
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 md:p-6">
      {hasAudio && (
        <audio
          ref={audioRef}
          src={resolvedAudioUrl}
          preload="metadata"
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime);
          }}
          onLoadedMetadata={(e) => {
            if (e.currentTarget.duration && Number.isFinite(e.currentTarget.duration)) {
              setDuration(e.currentTarget.duration);
            }
          }}
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            setIsPlaying(false);
            setAudioError("Không tải được tệp âm thanh để nghe thử.");
          }}
        />
      )}

      {/* Top Row: Label + Playback Speed */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <span className="text-xs font-medium text-white/60">Nghe thử bài hát</span>

        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-0.5">
          <div className="flex items-center px-2 text-[11px] text-white/50">
            <Gauge className="mr-1 h-3 w-3" />
            <span>Tốc độ</span>
          </div>
          {([1, 1.25, 1.5, 2] as const).map((rate) => (
            <button
              key={rate}
              type="button"
              disabled={!hasAudio}
              onClick={() => handleRateChange(rate)}
              className={`h-6 rounded-full px-2.5 text-[11px] font-medium tabular-nums transition disabled:opacity-40 cursor-pointer ${
                playbackRate === rate
                  ? "bg-[#ff5500] text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Audio Missing / Error Notice or Seekable Progress Bar */}
      {!hasAudio ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>Bài hát này chưa có tệp âm thanh để nghe thử</span>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {audioError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{audioError}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="w-11 text-xs font-mono font-semibold text-[#ff8b4d] tabular-nums">
              {formatTime(currentTime)}
            </span>
            <div className="relative flex flex-1 items-center">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#ff5500] transition-[width] duration-100"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <input
                type="range"
                aria-label="Vị trí phát"
                min={0}
                max={duration > 0 ? duration : 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                disabled={duration <= 0}
                onChange={handleSeekChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
            </div>
            <span className="w-11 text-right text-xs font-mono text-white/50 tabular-nums">
              {duration > 0 ? formatTime(duration) : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Primary Player Controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={!hasAudio || duration <= 0}
            onClick={() => skipTime(-5)}
            className="flex h-9 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-white/75 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Lùi 5 giây"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="tabular-nums">-5s</span>
          </button>

          <button
            type="button"
            disabled={!hasAudio}
            onClick={togglePlay}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ff5500] text-white shadow-[0_6px_20px_rgba(255,85,0,0.3)] transition hover:bg-[#ff6a1a] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={isPlaying ? "Tạm dừng" : "Nghe thử"}
            aria-label={isPlaying ? "Tạm dừng" : "Nghe thử"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-white" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-white" />
            )}
          </button>

          <button
            type="button"
            disabled={!hasAudio || duration <= 0}
            onClick={() => skipTime(5)}
            className="flex h-9 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-white/75 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Tua tới 5 giây"
          >
            <span className="tabular-nums">+5s</span>
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Volume & Mute Slider */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted || volume === 0 ? "Bật tiếng" : "Tắt tiếng"}
            className="text-white/60 hover:text-white transition cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4 text-rose-400" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            aria-label="Âm lượng"
            min="0"
            max="1"
            step="0.02"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-white/20 accent-[#ff5500]"
          />
          <span className="w-9 text-right text-xs font-mono text-white/50 tabular-nums">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
