"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { PlayerTrack, usePlayer } from "./player-context";
import { useVipTheme } from "@/lib/theme";
import { Play, Pause, Music, Mic2, ArrowDown } from "lucide-react";

export interface LyricLine {
  id: number;
  time: number; // in seconds
  endTime: number;
  text: string;
}

interface RealtimeLyricsProps {
  track: PlayerTrack | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (timeSeconds: number) => void;
  onTogglePlay?: () => void;
  className?: string;
}

/**
 * Intelligent Lyric Parser:
 * - Detects standard [mm:ss.xx] LRC format if present.
 * - Otherwise gracefully partitions plain multiline text across duration
 *   weighted by line character & word count for realistic natural singing pace.
 */
export function parseLyrics(
  lyricsRaw: string | null | undefined,
  totalDurationSeconds: number
): LyricLine[] {
  if (!lyricsRaw || !lyricsRaw.trim()) return [];

  const rawLines = lyricsRaw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) return [];

  // Check if timestamped LRC: [mm:ss.xx] or [m:ss.xx]
  const lrcRegex = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/;
  const hasLrc = rawLines.some((l) => lrcRegex.test(l));

  if (hasLrc) {
    const parsed: LyricLine[] = [];
    let idCounter = 0;
    for (const raw of rawLines) {
      // Ignore metadata tags like [ar:Artist], [ti:Title], [length:04:25], etc.
      if (/^\[(ti|ar|al|by|offset|length):/i.test(raw)) {
        continue;
      }
      const match = raw.match(lrcRegex);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const ms = match[3] ? parseFloat("0." + match[3]) : 0;
        const time = mins * 60 + secs + ms;
        const text = match[4].trim();
        if (text) {
          parsed.push({
            id: idCounter++,
            time: Math.round(time * 100) / 100,
            endTime: Math.round((time + 3.5) * 100) / 100,
            text,
          });
        }
      }
    }
    // Calculate accurate end times based on the next line's start time
    for (let i = 0; i < parsed.length - 1; i++) {
      parsed[i].endTime = parsed[i + 1].time;
    }
    if (parsed.length > 0) {
      return parsed;
    }
  }

  // Plain multiline lyrics: Weighted distribution
  const total = totalDurationSeconds > 10 ? totalDurationSeconds : 210;
  // Intro delay: between 4s and 12s depending on song length
  const introDuration = Math.min(10, Math.max(4, total * 0.045));
  const outroDuration = Math.min(12, Math.max(4, total * 0.05));
  const singableDuration = Math.max(10, total - introDuration - outroDuration);

  // Calculate proportional weight for each line based on character count & words
  const weights = rawLines.map((line) => {
    const charLen = line.length;
    const words = line.split(/\s+/).length;
    return Math.max(12, charLen * 0.6 + words * 2.2);
  });
  const sumWeights = weights.reduce((acc, w) => acc + w, 0);

  let currTime = introDuration;
  const lines: LyricLine[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const lineDuration = (weights[i] / sumWeights) * singableDuration;
    const startTime = Math.round(currTime * 100) / 100;
    const endTime = Math.round((currTime + lineDuration) * 100) / 100;

    lines.push({
      id: i,
      time: startTime,
      endTime,
      text: rawLines[i],
    });

    currTime += lineDuration;
  }

  return lines;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RealtimeLyrics({
  track,
  currentTime,
  duration,
  isPlaying,
  onSeek,
  onTogglePlay,
  className = "",
}: RealtimeLyricsProps) {
  const { isPremiumUser } = usePlayer();
  const { vipButtonsEnabled, currentVipTheme } = useVipTheme();
  const isVipButtonsActive = Boolean(isPremiumUser) && vipButtonsEnabled;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [userIsScrolling, setUserIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse lyrics: Prioritize millisecond-accurate synced lyrics [mm:ss.xx]
  const lyrics = useMemo(() => {
    const rawLyrics = track?.lyricsSynced || track?.lyricsPlain;
    return parseLyrics(rawLyrics, duration || (track?.durationMs ? track.durationMs / 1000 : 210));
  }, [track?.lyricsSynced, track?.lyricsPlain, duration, track?.durationMs]);

  // Find active line index
  const activeIndex = useMemo(() => {
    if (lyrics.length === 0) return -1;
    if (currentTime < lyrics[0].time) return -1;

    for (let i = 0; i < lyrics.length; i++) {
      const line = lyrics[i];
      const nextLine = lyrics[i + 1];
      if (nextLine) {
        if (currentTime >= line.time && currentTime < nextLine.time) {
          return i;
        }
      } else {
        if (currentTime >= line.time) {
          return i;
        }
      }
    }
    return lyrics.length - 1;
  }, [lyrics, currentTime]);

  // Scroll active line into center
  const scrollToActiveLine = useCallback((index: number, smooth = true) => {
    if (index < 0) return;
    const el = lineRefs.current[index];
    const container = scrollContainerRef.current;
    if (el && container) {
      const elTop = el.offsetTop;
      const elHeight = el.offsetHeight;
      const containerHeight = container.clientHeight;
      const targetScroll = elTop - containerHeight / 2 + elHeight / 2;

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Effect to auto-scroll when activeIndex changes unless user is manually browsing
  useEffect(() => {
    if (!userIsScrolling && activeIndex >= 0) {
      scrollToActiveLine(activeIndex, true);
    }
  }, [activeIndex, userIsScrolling, scrollToActiveLine]);

  // Handle user manual scroll
  const handleScroll = () => {
    setUserIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setUserIsScrolling(false);
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // If no track selected
  if (!track) {
    return (
      <div className={`p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl text-center ${className}`}>
        <Music className="w-12 h-12 mx-auto mb-3 text-white/30" />
        <p className="text-white/60 font-manrope text-sm">Chọn một bài hát để bắt đầu nghe nhạc và hiển thị lời.</p>
      </div>
    );
  }

  // If track has no lyrics
  if (lyrics.length === 0) {
    return (
      <div
        className={`relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-[#121626]/90 to-[#0b0c16]/90 backdrop-blur-2xl p-6 md:p-8 shadow-2xl ${className}`}
      >
        {/* Glow ambient */}
        <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full bg-purple-500/15 blur-[100px] pointer-events-none" />

        <div className="flex items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {track.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={track.imageUrl}
                alt={track.name}
                className="w-12 h-12 rounded-xl object-cover shadow-lg border border-white/10"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 grid place-items-center text-purple-300">
                <Music className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-graphik text-white text-base md:text-lg font-semibold truncate">
                {track.name}
              </h3>
              <p className="font-manrope text-white/55 text-xs truncate">{track.artistName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-purple-200 font-medium px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-400/25">
              {formatTime(currentTime)} / {formatTime(duration || (track.durationMs ? track.durationMs / 1000 : 0))}
            </span>
          </div>
        </div>

        <div className="py-14 text-center flex flex-col items-center justify-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 grid place-items-center">
              <Mic2 className="w-8 h-8 text-white/40" />
            </div>
            {isPlaying && (
              <div className="absolute -inset-1 rounded-full border border-pink-400/40 animate-ping" />
            )}
          </div>
          <h4 className="font-graphik text-white/90 text-lg font-medium mb-1">
            Lời bài hát đang được cập nhật
          </h4>
          <p className="font-manrope text-white/45 text-xs max-w-md">
            Giai điệu đang được phát trực tuyến với chất lượng âm thanh cao. Hãy đắm chìm trong không gian âm nhạc cùng Moodify!
          </p>

          {/* Equalizer animation */}
          <div className="flex items-end gap-1.5 h-7 mt-6">
            {[0.4, 0.8, 0.6, 1.0, 0.7, 0.9, 0.5, 0.8, 0.3].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-gradient-to-t from-pink-500 to-purple-400 rounded-full transition-all"
                style={{
                  height: isPlaying ? `${h * 100}%` : "20%",
                  animation: isPlaying ? `waveBar 800ms ease-in-out ${i * 90}ms infinite` : "none",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-[#12162a]/95 via-[#0e101f]/95 to-[#090a14]/95 backdrop-blur-3xl shadow-2xl p-5 md:p-7 transition-all ${className}`}
      style={{
        boxShadow: "0 24px 60px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      {/* Dynamic ambient radial light */}
      <div className="absolute -top-24 left-1/3 w-96 h-96 rounded-full bg-purple-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-pink-600/15 blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4 relative z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          {track.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.imageUrl}
              alt={track.name}
              className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover shadow-lg border border-white/15 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-purple-500/20 grid place-items-center text-purple-300 shrink-0">
              <Music className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-200 border border-purple-400/30 tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                Live Lyrics
              </span>
              <span className="text-[11px] font-manrope text-white/40">
                {lyrics.length} câu
              </span>
            </div>
            <h3 className="font-graphik text-white text-base md:text-lg font-semibold truncate mt-0.5">
              {track.name}
            </h3>
            <p className="font-manrope text-white/55 text-xs truncate">{track.artistName}</p>
          </div>
        </div>

        {/* Quick controls & time */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="font-mono text-xs text-purple-300 font-semibold">
              {formatTime(currentTime)}
            </span>
            <span className="font-mono text-xs text-white/40">
              {" "}
              / {formatTime(duration || (track.durationMs ? track.durationMs / 1000 : 0))}
            </span>
          </div>

          {onTogglePlay && (
            <button
              type="button"
              onClick={onTogglePlay}
              className={`w-9 h-9 rounded-full grid place-items-center hover:scale-108 active:scale-95 transition-all shadow-md cursor-pointer ${
                isVipButtonsActive
                  ? currentVipTheme.primaryBtnClass
                  : "bg-gradient-to-tr from-purple-500 to-pink-500 text-white"
              }`}
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" fill="currentColor" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Floating snap button if user scrolled away */}
      {userIsScrolling && activeIndex >= 0 && (
        <div className="absolute bottom-6 right-8 z-20 animate-in fade-in zoom-in duration-200">
          <button
            type="button"
            onClick={() => {
              setUserIsScrolling(false);
              scrollToActiveLine(activeIndex, true);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
              isVipButtonsActive
                ? currentVipTheme.primaryBtnClass
                : "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_4px_16px_rgba(168,85,247,0.5)]"
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Cuộn về lời đang phát</span>
          </button>
        </div>
      )}

      {/* Scrolling lyrics body with Spotify-style gradient mask */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative h-[290px] md:h-[340px] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 select-none py-10"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
        }}
      >
        {/* Intro placeholder if song hasn't started first lyric yet */}
        {activeIndex === -1 && (
          <div className="text-center py-6 text-purple-300/60 text-sm font-manrope italic animate-pulse">
            ♪ Giai điệu mở đầu...
          </div>
        )}

        <div className="flex flex-col gap-5 md:gap-6">
          {lyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            return (
              <div
                key={line.id}
                ref={(el) => {
                  lineRefs.current[idx] = el;
                }}
                onClick={() => {
                  onSeek(line.time);
                }}
                className={`group flex items-start gap-3 cursor-pointer rounded-xl px-3 py-1.5 transition-all duration-300 ${
                  isActive
                    ? "text-white scale-[1.02] origin-left drop-shadow-[0_0_25px_rgba(244,63,94,0.7)]"
                    : isPast
                    ? "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
                    : "text-white/30 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                {/* Left indicator: Pink bullet or quick jump icon */}
                <div className="w-5 shrink-0 pt-1 flex items-center justify-center">
                  {isActive ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_12px_#f43f5e] animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-mono text-white/20 group-hover:text-purple-300 group-hover:opacity-100 opacity-0 transition-opacity">
                      ▶
                    </span>
                  )}
                </div>

                {/* Lyric line text */}
                <div className="flex-1">
                  <p
                    className={`font-graphik tracking-tight leading-snug transition-all ${
                      isActive
                        ? "text-[20px] sm:text-[23px] md:text-[26px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-100 to-purple-200"
                        : "text-[16px] sm:text-[18px] md:text-[20px] font-semibold"
                    }`}
                  >
                    {line.text}
                  </p>
                  {/* Subtle timestamp on hover */}
                  <span className="text-[10px] font-mono text-purple-400/0 group-hover:text-purple-400/80 transition-colors">
                    {formatTime(line.time)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Outro placeholder */}
        {activeIndex === lyrics.length - 1 && (
          <div className="text-center py-8 text-purple-300/60 text-sm font-manrope italic">
            ♪ Giai điệu kết thúc...
          </div>
        )}
      </div>
    </div>
  );
}
