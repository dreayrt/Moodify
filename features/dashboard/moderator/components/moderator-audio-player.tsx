"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  Activity,
  AlertTriangle,
  Radio,
  Zap,
} from "lucide-react";
import { ModerationTrack } from "../types";

type ModeratorAudioPlayerProps = {
  track: ModerationTrack;
  autoPlay?: boolean;
};

// Generates an ultra-detailed, natural 75-bar studio audio waveform
function generateStudioWaveform(rawBars: number[] = [], count = 76, seedStr = ""): number[] {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const pseudoRand = (offset: number) => {
    const x = Math.sin(hash + offset * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1); // 0.0 -> 1.0

    // Musical composition curve:
    // Intro -> Verse -> Climax / Drop -> Bridge -> Outro
    let envelope = 0.5;
    if (progress < 0.12) {
      envelope = 0.22 + (progress / 0.12) * 0.45;
    } else if (progress >= 0.42 && progress <= 0.65) {
      // High-energy drop / chorus section
      envelope = 0.82 + Math.sin((progress - 0.42) * Math.PI * 4.5) * 0.15;
    } else if (progress > 0.88) {
      // Gentle outro fade
      envelope = 0.65 - ((progress - 0.88) / 0.12) * 0.42;
    } else {
      // Dynamic rhythmic verses
      envelope = 0.52 + Math.sin(progress * Math.PI * 7) * 0.18;
    }

    // Blend with backend raw waveform if provided
    let rawInfluence = 0.5;
    if (rawBars && rawBars.length > 0) {
      const rawIdx = Math.min(rawBars.length - 1, Math.floor(progress * rawBars.length));
      rawInfluence = rawBars[rawIdx] ?? 0.5;
    }

    // High frequency noise and beat rhythm simulation
    const noise = (pseudoRand(i) * 0.3 - 0.15);
    const rhythmPulse = i % 4 === 0 ? 0.14 : i % 2 === 0 ? 0.06 : -0.04;

    const finalAmp = Math.max(0.14, Math.min(0.98, envelope * 0.55 + rawInfluence * 0.3 + rhythmPulse + noise));
    bars.push(Number(finalAmp.toFixed(3)));
  }
  return bars;
}

export function ModeratorAudioPlayer({
  track,
  autoPlay = false,
}: ModeratorAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(track.durationSec || 200);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5 | 2>(1);

  // Waveform interactive hover states
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [hoverPixelX, setHoverPixelX] = useState<number>(0);

  const [prevTrackId, setPrevTrackId] = useState(track.id);
  if (track.id !== prevTrackId) {
    setPrevTrackId(track.id);
    setCurrentTime(0);
    setDuration(track.durationSec || 200);
    setIsPlaying(false);
    setHoverPercent(null);
  }

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Resolve audio URL to point to backend if relative path
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
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    return `${baseUrl.replace(/\/$/, "")}${track.audioUrl.startsWith("/") ? "" : "/"}${track.audioUrl}`;
  })();

  // Sync audio element if track changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = isMuted ? 0 : volume;
      if (autoPlay && resolvedAudioUrl) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Autoplay was blocked or failed:", err);
            setIsPlaying(false);
          });
      }
    }
  }, [track.id, autoPlay, playbackRate, isMuted, volume, resolvedAudioUrl]);

  // Synthetic simulation timer only for mock tracks without real audioUrl
  useEffect(() => {
    if (isPlaying && !resolvedAudioUrl) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.25 * playbackRate;
          if (next >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 250);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, duration, playbackRate, resolvedAudioUrl]);

  const togglePlay = () => {
    if (audioRef.current && resolvedAudioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error("Playback failed for URL:", resolvedAudioUrl, err);
            // Fallback to synthetic state if blocked
            setIsPlaying(true);
          });
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const skipTime = (deltaSeconds: number) => {
    const nextTime = Math.max(0, Math.min(duration, currentTime + deltaSeconds));
    setCurrentTime(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const seekToPercent = (percent: number) => {
    const safePercent = Math.max(0, Math.min(1, percent));
    const nextTime = safePercent * duration;
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
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = volume || 0.85;
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Memoized 76-bar high definition studio waveform
  const waveformBars = useMemo(
    () => generateStudioWaveform(track.waveform, 76, `${track.id}-${track.title}`),
    [track.waveform, track.id, track.title]
  );

  const isClipping = track.audioSpec.peakDb > 0.0;

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0f16]/95 p-5 md:p-6 shadow-[0_24px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#ff773b]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[#427ddb]/10 blur-3xl" />

      {/* Real audio element linked to source */}
      {resolvedAudioUrl ? (
        <audio
          ref={audioRef}
          src={resolvedAudioUrl}
          preload="auto"
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime);
          }}
          onLoadedMetadata={(e) => {
            if (e.currentTarget.duration && !isNaN(e.currentTarget.duration)) {
              setDuration(e.currentTarget.duration);
            }
          }}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            console.warn("Audio element load error:", resolvedAudioUrl, e);
          }}
        />
      ) : (
        <audio ref={audioRef} />
      )}

      {/* Top Header: Technical Specifications Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 text-[11px] font-medium text-white/80">
            <Radio className="h-3.5 w-3.5 text-[#ff8b4d]" />
            <span>{track.audioSpec.format}</span>
            <span className="text-white/30">•</span>
            <span>{track.audioSpec.bitrate}</span>
            <span className="text-white/30">•</span>
            <span>{track.audioSpec.sampleRate}</span>
          </div>

          {isClipping ? (
            <div className="flex h-7 items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 text-[11px] font-medium text-red-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Peak: +{track.audioSpec.peakDb} dB (Clipping)</span>
            </div>
          ) : (
            <div className="flex h-7 items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 text-[11px] font-medium text-emerald-400">
              <Activity className="h-3 w-3" />
              <span>Peak: {track.audioSpec.peakDb} dB (Chuẩn)</span>
            </div>
          )}
        </div>

        {/* Speed Rate Control */}
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-0.5">
          <div className="flex items-center px-2 text-[10px] uppercase tracking-wider text-white/40">
            <Gauge className="mr-1 h-3 w-3" />
            <span>Tốc độ</span>
          </div>
          {([1, 1.25, 1.5, 2] as const).map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => handleRateChange(rate)}
              className={`h-6 rounded-full px-2.5 text-[11px] font-medium transition-all ${
                playbackRate === rate
                  ? "bg-[#ff7a2c] text-white shadow-[0_2px_8px_rgba(255,122,44,0.4)]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Studio Waveform Visualization Section */}
      <div className="mt-5">
        {/* Time info header */}
        <div className="flex items-center justify-between text-[12px] font-mono tracking-wider text-white/60 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[#ff955c] font-bold text-[13px]">
              {formatTime(currentTime)}
            </span>
            <span className="text-white/20">/</span>
            <span className="text-white/40">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff7a2c] animate-pulse" />
            <span>Phòng thu âm thanh • 76 dải tần</span>
          </div>
        </div>

        {/* Interactive Studio Waveform Visualizer */}
        <div
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            setHoverPercent(clickX / rect.width);
            setHoverPixelX(clickX);
          }}
          onMouseLeave={() => {
            setHoverPercent(null);
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            seekToPercent(clickX / rect.width);
          }}
          className="group relative flex h-24 w-full cursor-pointer items-center justify-between gap-[2px] rounded-2xl border border-white/10 bg-black/50 px-4 py-3 shadow-inner transition hover:border-white/20 select-none overflow-hidden"
          title="Nhấp hoặc kéo để tua âm thanh chính xác"
        >
          {/* Subtle grid background lines for studio metering look */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-2 opacity-15">
            <div className="border-b border-white/40 border-dashed w-full" />
            <div className="border-b border-[#ff7a2c]/60 w-full" />
            <div className="border-b border-white/40 border-dashed w-full" />
          </div>

          {/* Climax / Drop Marker (At 50% mark) */}
          <div
            className="pointer-events-none absolute top-1.5 bottom-1.5 w-[1px] bg-amber-400/40 border-l border-dashed border-amber-400/60 z-0 flex flex-col justify-between items-center"
            style={{ left: "50%" }}
          >
            <div className="rounded-full bg-amber-500/20 px-1 py-0.2 text-[8px] font-mono text-amber-300 font-semibold tracking-tighter">
              DROP
            </div>
            <Zap className="h-2.5 w-2.5 text-amber-400" />
          </div>

          {/* Waveform Bars */}
          {waveformBars.map((amp, idx) => {
            const barPercent = (idx / (waveformBars.length - 1)) * 100;
            const hasPlayed = barPercent <= progressPercent;

            // Micro-animation if playing and near playhead
            const isNearHead = isPlaying && Math.abs(barPercent - progressPercent) < 4.5;
            const heightMultiplier = isNearHead ? 1.15 : 1;
            const barHeight = Math.max(6, Math.min(74, amp * 72 * heightMultiplier));

            return (
              <div
                key={idx}
                className="relative flex-1 rounded-full transition-all duration-150 z-10"
                style={{
                  height: `${barHeight}px`,
                  minWidth: "2px",
                  maxWidth: "5px",
                  background: hasPlayed
                    ? "linear-gradient(180deg, #ffa64d 0%, #ff6e20 60%, #e04b00 100%)"
                    : "rgba(255, 255, 255, 0.16)",
                  boxShadow:
                    hasPlayed && isNearHead
                      ? "0 0 10px #ff7a2c, 0 0 16px rgba(255, 122, 44, 0.6)"
                      : hasPlayed
                      ? "0 0 4px rgba(255, 110, 32, 0.25)"
                      : "none",
                }}
              />
            );
          })}

          {/* Scrubber Playhead Line */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_12px_#ffffff] z-20"
            style={{ left: `${progressPercent}%` }}
          >
            {/* Playhead Top Pin */}
            <div className="absolute -top-1 -translate-x-1/2 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#ff6e20] shadow-[0_0_8px_#ff6e20]" />
          </div>

          {/* Hover Preview Line and Timestamp Tooltip */}
          {hoverPercent !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-[1px] bg-white/40 border-l border-dashed border-white/60 z-20"
              style={{ left: `${hoverPixelX}px` }}
            >
              <div className="absolute -top-6 -translate-x-1/2 rounded bg-[#181a24] px-1.5 py-0.5 text-[10px] font-mono text-[#ff955c] border border-white/20 shadow-md whitespace-nowrap">
                {formatTime(hoverPercent * duration)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary Player Controls */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        {/* Playback Controls (Rewind 10s, Play/Pause, Forward 10s) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => skipTime(-10)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95"
            title="Lùi 10 giây"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#ff6b2b] to-[#ff8f50] text-white shadow-[0_8px_24px_rgba(255,107,43,0.35)] transition-all hover:scale-105 active:scale-95"
            title={isPlaying ? "Tạm dừng (Space)" : "Phát thẩm định (Space)"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-white" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-white" />
            )}
          </button>

          <button
            type="button"
            onClick={() => skipTime(10)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95"
            title="Tua tới 10 giây"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* Quick jump to Drop / Climax (50% mark) */}
          <button
            type="button"
            onClick={() => seekToPercent(0.5)}
            className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/70 transition hover:border-[#ff7a2c]/50 hover:bg-white/[0.08] hover:text-white"
          >
            <Zap className="h-3 w-3 text-amber-400" />
            <span>Đến điệp khúc</span>
          </button>
        </div>

        {/* Volume & Mute Slider */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleMute}
            className="text-white/60 hover:text-white transition"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4 text-red-400" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-white/20 accent-[#ff7a2c]"
            title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
          <span className="w-8 text-right font-mono text-[11px] text-white/50">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
