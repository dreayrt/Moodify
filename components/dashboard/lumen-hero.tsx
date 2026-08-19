"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Heart,
  Home,
  Library,
  ListMusic,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { getCurrentUser, getValidAccessToken, type UserProfileResponse } from "@/lib/auth-client";


const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4";

type Vibe = {
  id: string;
  label: string;
  caption: string;
  accent: string;
  ring: string;
  bg: string;
};

const VIBES: Vibe[] = [
  { id: "edm",    label: "EDM",    caption: "Festival anthems, drops, late-night clubs.", accent: "#AFDDFF", ring: "rgba(175,221,255,0.45)", bg: "linear-gradient(135deg,#2c2c52 0%,#16162e 100%)" },
  { id: "lofi",   label: "LO-FI",  caption: "Chill beats, jazzy loops, study sessions.", accent: "#A8DBB2", ring: "rgba(168,219,178,0.45)", bg: "linear-gradient(135deg,#1e3a2a 0%,#0c1a13 100%)" },
  { id: "kpop",   label: "K-POP",  caption: "Bright hooks, choreography, fan chants.",   accent: "#FF8FBF", ring: "rgba(255,143,191,0.45)", bg: "linear-gradient(135deg,#4a1a30 0%,#1f0a17 100%)" },
  { id: "indie",  label: "INDIE",  caption: "Acoustic strums, bedroom pop, slow dance.", accent: "#A0B0FF", ring: "rgba(160,176,255,0.45)", bg: "linear-gradient(135deg,#1f1f3f 0%,#0d0d22 100%)" },
  { id: "pop",    label: "POP",    caption: "Singalong hits, radio edits, dance breaks.", accent: "#FFD978", ring: "rgba(255,213,120,0.45)", bg: "linear-gradient(135deg,#4a3210 0%,#1f1408 100%)" },
];

type Track = {
  title: string;
  artist: string;
  duration: string;
  cover: string;
};

const TRACKS_BY_VIBE: Record<string, Track[]> = {
  edm: [
    { title: "Titanium Pulse",   artist: "Martin Vox",        duration: "3:18", cover: "linear-gradient(135deg,#7a5cff,#1a1430)" },
    { title: "Rattle The Floor", artist: "Nicky V.",          duration: "3:02", cover: "linear-gradient(135deg,#5cffd1,#1a3030)" },
    { title: "Sahara Lights",    artist: "David Guetta Jr.",  duration: "3:24", cover: "linear-gradient(135deg,#ffae5a,#5a2a8a)" },
    { title: "Closer To The Drop",artist: "Hardwell Sons",    duration: "4:11", cover: "linear-gradient(135deg,#3b9cff,#1a3a7a)" },
  ],
  lofi: [
    { title: "Coffee Shop Rain",  artist: "Kudasai Beats",    duration: "3:42", cover: "linear-gradient(135deg,#bff0d8,#3da080)" },
    { title: "1 a.m. Window",     artist: "Idealism",         duration: "4:08", cover: "linear-gradient(135deg,#9ad9ff,#4a8fc8)" },
    { title: "Cat On The Desk",   artist: "Lo.fi Girl",       duration: "2:54", cover: "linear-gradient(135deg,#dfe9c8,#7a9a4a)" },
    { title: "Pillow Talk",       artist: "Sleepy Fish",      duration: "3:33", cover: "linear-gradient(135deg,#c4ccff,#5a6090)" },
  ],
  kpop: [
    { title: "Dynamite 2.0",      artist: "BANGTAN",          duration: "3:21", cover: "linear-gradient(135deg,#ff4d6d,#ff9966)" },
    { title: "How You Like That", artist: "BLANKQUEEN",       duration: "3:02", cover: "linear-gradient(135deg,#ff2d6f,#7a1c4a)" },
    { title: "Super Nova",        artist: "Aespa Beat",       duration: "3:12", cover: "linear-gradient(135deg,#ffb84d,#cc4d1a)" },
    { title: "Magnetic",          artist: "ILLIT Lab",        duration: "3:18", cover: "linear-gradient(135deg,#ff5e9d,#7a2a6a)" },
  ],
  indie: [
    { title: "Bags",              artist: "Clairo Type",      duration: "3:48", cover: "linear-gradient(135deg,#a3b8ff,#3a4a8a)" },
    { title: "Kyoto",             artist: "Phoebe Tape",      duration: "3:11", cover: "linear-gradient(135deg,#9aa6d8,#4a5478)" },
    { title: "Matilda",           artist: "Harry's Echo",     duration: "4:14", cover: "linear-gradient(135deg,#c4ccff,#5a6090)" },
    { title: "Two Slow Dancers",  artist: "Mitski Soul",      duration: "4:05", cover: "linear-gradient(135deg,#b8c4f5,#3a3f6a)" },
  ],
  pop: [
    { title: "Anti-Hero Drive",   artist: "Taylor J.",        duration: "3:21", cover: "linear-gradient(135deg,#ffd97a,#ff7a4d)" },
    { title: "As It Was 2 U",     artist: "Harry S.",         duration: "2:54", cover: "linear-gradient(135deg,#ffae5a,#c84d8a)" },
    { title: "Blinding Lights",   artist: "The Weeknd West",  duration: "3:46", cover: "linear-gradient(135deg,#ffe28a,#9a4d2a)" },
    { title: "Vampire",           artist: "Olivia R.",        duration: "3:33", cover: "linear-gradient(135deg,#ffd97a,#cc7a4d)" },
  ],
};

const EDITOR_PICKS: Track[] = [
  { title: "Lost in Reverie", artist: "Kairo",       duration: "3:29", cover: "linear-gradient(135deg,#7a5cff,#1a1430)" },
  { title: "Glow Up",         artist: "Luna Ray",    duration: "3:41", cover: "linear-gradient(135deg,#ff6b9d,#2a1530)" },
  { title: "Chasing Horizon", artist: "Sienna Skye", duration: "3:46", cover: "linear-gradient(135deg,#ff8a5b,#3a1a30)" },
  { title: "Driftwood",       artist: "NOA",         duration: "4:08", cover: "linear-gradient(135deg,#5cffd1,#1a3030)" },
];

const KEYFRAMES = `
@keyframes bflyGlide {
  0%   { transform: translate3d(0,0,0) rotate(-6deg) scale(0.6); opacity: 0; }
  10%  { opacity: 0.7; }
  50%  { transform: translate3d(30px,-44px,0) rotate(8deg) scale(1); }
  90%  { opacity: 0.55; }
  100% { transform: translate3d(0,0,0) rotate(-4deg) scale(0.7); opacity: 0; }
}
@keyframes bflyFlap {
  0%, 100% { transform: scaleX(1); }
  50%      { transform: scaleX(0.55); }
}
@keyframes equalize {
  0%, 100% { transform: scaleY(0.3); }
  50%      { transform: scaleY(1); }
}
@keyframes waveBar {
  0%, 100% { transform: scaleY(0.3); }
  50%      { transform: scaleY(1); }
}
@keyframes softPulse {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
}
`;

const BUTTERFLY_SVG = (size: number, hue: number) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      filter: `drop-shadow(0 0 3px hsla(${hue}, 92%, 78%, 0.35))`,
      transformOrigin: "center",
      animation: "bflyFlap 280ms ease-in-out infinite",
    }}
  >
    <path
      d="M12 12c-1.4-3-4.2-5-6.8-4.7 0 2.9 2.2 5.6 5.1 6.4-2.9 0.8-5.1 3.5-5.1 6.4 2.6 0.3 5.4-1.7 6.8-4.7 1.4 3 4.2 5 6.8 4.7 0-2.9-2.2-5.6-5.1-6.4 2.9-0.8 5.1-3.5 5.1-6.4-2.6-0.3-5.4 1.7-6.8 4.7z"
      fill={`hsla(${hue}, 88%, 80%, 0.35)`}
      stroke={`hsla(${hue}, 96%, 90%, 0.7)`}
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
  </svg>
);

/* ── Sub-components ───────────────────────────────────────────── */

function ButterflySwarm({ count = 8, className = "" }: { count?: number; className?: string }) {
  const butterflies = useMemo(() => {
    const seeded = (i: number, salt: number) => {
      const x = Math.sin(i * 9301 + salt * 49297) * 233280;
      return x - Math.floor(x);
    };
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      startX: 42 + seeded(i, 1) * 24,
      startY: 16 + seeded(i, 2) * 56,
      size: 8 + seeded(i, 3) * 6,
      hue: 195 + seeded(i, 4) * 35,
      duration: 9000 + seeded(i, 5) * 5000,
      delay: seeded(i, 6) * 3500,
    }));
  }, [count]);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {butterflies.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{
            left: `${b.startX}%`,
            top: `${b.startY}%`,
            animation: `bflyGlide ${b.duration}ms ease-in-out ${b.delay}ms infinite`,
          }}
        >
          {BUTTERFLY_SVG(b.size, b.hue)}
        </div>
      ))}
    </div>
  );
}

function WaveformPreview({ active }: { active: boolean }) {
  const bars = useMemo(
    () => Array.from({ length: 32 }, (_, i) => 0.3 + ((Math.sin(i * 127.1) * 43758.5453) % 1 + 1) % 1 * 0.7),
    []
  );
  return (
    <div className="flex items-center gap-[2px] h-[24px] w-full">
      {bars.map((h, i) => (
        <span
          key={i}
          className="block w-[2px] rounded-full"
          style={{
            height: `${h * 100}%`,
            background: active ? "#AFDDFF" : "rgba(255,255,255,0.35)",
            transformOrigin: "bottom",
            animation: active ? `waveBar ${600 + i * 30}ms ease-in-out ${i * 40}ms infinite` : "none",
          }}
        />
      ))}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  seeAllHref = "#",
}: {
  eyebrow: string;
  title: string;
  seeAllHref?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <p className="font-manrope text-[10px] tracking-[0.32em] text-[#AFDDFF]/80 mb-2">
          {eyebrow}
        </p>
        <h2 className="font-graphik text-white text-[20px] md:text-[22px] leading-[1.1] tracking-[-0.01em]">
          {title}
        </h2>
      </div>
      <a
        href={seeAllHref}
        className="font-manrope text-[11px] tracking-[0.18em] text-white/55 hover:text-white transition-colors uppercase"
      >
        See all
      </a>
    </div>
  );
}

/* ── Track row ───────────────────────────────────────────────── */

function TrackRow({
  track,
  index,
  active,
  playing,
  onClick,
}: {
  track: Track;
  index: number;
  active: boolean;
  playing: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full grid grid-cols-[24px_44px_1fr_auto_24px] items-center gap-3 px-3 py-2 rounded-[8px] hover:bg-white/[0.06] transition-colors text-left"
      style={{
        animation: `lumenFadeIn 500ms cubic-bezier(0.16,1,0.3,1) both`,
        animationDelay: `${900 + index * 60}ms`,
      }}
    >
      {/* Index / equalizer / play on hover */}
      <div className="relative w-6 h-6 flex items-center justify-center">
        <span
          className={`font-manrope text-[12px] ${
            active ? "text-[#AFDDFF]" : "text-white/45 group-hover:opacity-0"
          }`}
        >
          {active && playing ? (
            <span className="flex items-end gap-[2px] h-[14px]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block w-[2px] rounded-sm bg-[#AFDDFF]"
                  style={{
                    height: "100%",
                    transformOrigin: "bottom",
                    animation: `equalize 800ms ease-in-out ${i * 120}ms infinite`,
                  }}
                />
              ))}
            </span>
          ) : (
            String(index + 1).padStart(2, "0")
          )}
        </span>
        <Play
          className="absolute w-[14px] h-[14px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
          fill="currentColor"
        />
      </div>

      {/* Cover */}
      <div
        className="w-[44px] h-[44px] rounded-[6px] shrink-0 shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
        style={{ background: track.cover }}
      />

      {/* Title / artist */}
      <div className="min-w-0">
        <p
          className={`font-manrope text-[14px] leading-[18px] truncate ${
            active ? "text-[#AFDDFF]" : "text-white"
          }`}
        >
          {track.title}
        </p>
        <p className="font-manrope text-white/55 text-[12px] leading-[15px] truncate mt-[2px]">
          {track.artist}
        </p>
      </div>

      {/* Duration */}
      <span className="font-manrope text-white/45 text-[12px] tracking-wide">
        {track.duration}
      </span>

      {/* More */}
      <MoreHorizontal className="w-[16px] h-[16px] text-white/35 group-hover:text-white transition-colors" strokeWidth={1.5} />
    </button>
  );
}

/* ── Editor pick card ────────────────────────────────────────── */

function EditorPickCard({ track, delay }: { track: Track; delay: number }) {
  return (
    <div
      className="group rounded-[12px] overflow-hidden border border-white/8 bg-white/[0.04] hover:bg-white/[0.08] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.5)] anim-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative w-full aspect-[16/10]" style={{ background: track.cover }}>
        <div className="absolute inset-x-3 bottom-3 opacity-90 group-hover:opacity-100 transition-opacity">
          <WaveformPreview active />
        </div>
        <button
          type="button"
          aria-label={`Play ${track.title}`}
          className="absolute right-3 bottom-3 w-[40px] h-[40px] rounded-full grid place-items-center bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.4)] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all"
        >
          <Play className="w-[14px] h-[14px]" fill="currentColor" />
        </button>
      </div>
      <div className="p-3">
        <p className="font-manrope text-white text-[13px] leading-[16px] truncate">
          {track.title}
        </p>
        <p className="font-manrope text-white/55 text-[11px] leading-[14px] truncate mt-[2px]">
          {track.artist}
        </p>
      </div>
    </div>
  );
}

/* ── Mood chip (pill) ─────────────────────────────────────────── */

function MoodChip({
  vibe,
  active,
  onClick,
}: {
  vibe: Vibe;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:-translate-y-px"
      style={{
        background: active ? `${vibe.accent}20` : "rgba(255,255,255,0.04)",
        borderColor: active ? vibe.accent : "rgba(255,255,255,0.10)",
        boxShadow: active ? `0 0 0 1px ${vibe.accent}55, 0 8px 20px rgba(0,0,0,0.35)` : "none",
      }}
    >
      <span
        className="inline-block w-[6px] h-[6px] rounded-full"
        style={{ background: vibe.accent, boxShadow: `0 0 6px ${vibe.ring}` }}
      />
      <span
        className="font-manrope text-[10px] tracking-[0.18em]"
        style={{ color: active ? vibe.accent : "rgba(255,255,255,0.7)" }}
      >
        {vibe.label}
      </span>
    </button>
  );
}

/* ── Vibe dropdown ────────────────────────────────────────────── */

function VibeDropdown({
  active,
  onPick,
  open,
  onToggle,
}: {
  active: Vibe;
  onPick: (id: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative anim-slide-right" style={{ animationDelay: "500ms" }}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-[8px] px-[14px] py-[8px] rounded-full border border-white/12 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors"
      >
        <span
          className="inline-block w-[8px] h-[8px] rounded-full"
          style={{ background: active.accent, boxShadow: `0 0 10px ${active.ring}` }}
        />
        <span className="font-manrope text-white text-[11px] tracking-[0.18em]">
          {active.label}
        </span>
        <ChevronDown
          className={`w-[14px] h-[14px] text-white/65 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          strokeWidth={1.6}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[220px] rounded-[14px] border border-white/12 bg-black/85 backdrop-blur-xl p-2 z-30"
          style={{ animation: "lumenFadeIn 220ms cubic-bezier(0.16,1,0.3,1) both" }}
        >
          {VIBES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                onPick(v.id);
                onToggle();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-[10px] text-left transition-colors ${
                v.id === active.id ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <span
                className="inline-block w-[8px] h-[8px] rounded-full"
                style={{ background: v.accent, boxShadow: `0 0 8px ${v.ring}` }}
              />
              <span className="font-manrope text-white text-[12px] tracking-[0.18em]">
                {v.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Account pill ─────────────────────────────────────────────── */

function AccountPill({ user, loading }: { user: UserProfileResponse | null; loading: boolean }) {
  const displayName = user?.fullName || user?.username || "Guest";
  const initials = useMemo(() => {
    const source = (user?.fullName || user?.username || "G").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "G";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user]);

  const firstName = useMemo(() => {
    const source = (user?.fullName || user?.username || "friend").trim();
    return source.split(/\s+/)[0] || "friend";
  }, [user]);

  return (
    <div
      className="anim-slide-right flex items-center gap-[10px] px-[12px] py-[6px] rounded-full border border-white/12 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors"
      style={{ animationDelay: "600ms" }}
    >
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={displayName}
          className="w-[26px] h-[26px] rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="w-[26px] h-[26px] rounded-full grid place-items-center text-[11px] font-semibold text-black"
          style={{ background: "linear-gradient(135deg,#AFDDFF,#dbeeff)" }}
        >
          {loading ? "…" : initials}
        </div>
      )}
      <span className="font-manrope text-white text-[12px] tracking-wide">
        {loading ? "Hi, …" : `Hi, ${firstName}`}
      </span>
    </div>
  );
}

/* ── Mini player (bottom bar) ─────────────────────────────────── */

function MiniPlayer({
  track,
  playing,
  liked,
  onTogglePlay,
  onToggleLike,
}: {
  track: Track;
  playing: boolean;
  liked: boolean;
  onTogglePlay: () => void;
  onToggleLike: () => void;
}) {
  return (
    <div className="w-full px-4 md:px-6 py-3 flex items-center gap-4 md:gap-6 border-t border-white/10 bg-black/85 backdrop-blur-xl">
      {/* Track info */}
      <div className="flex items-center gap-3 min-w-0 w-[200px] md:w-[260px]">
        <div
          className="w-[48px] h-[48px] md:w-[56px] md:h-[56px] rounded-[8px] shrink-0 shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
          style={{ background: track.cover }}
        />
        <div className="min-w-0">
          <p className="font-manrope text-white text-[13px] md:text-[14px] leading-[16px] truncate">
            {track.title}
          </p>
          <p className="font-manrope text-white/55 text-[11px] md:text-[12px] leading-[14px] truncate mt-[2px]">
            {track.artist}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleLike}
          aria-label="Like"
          className={`ml-1 shrink-0 ${liked ? "text-[#AFDDFF]" : "text-white/45 hover:text-white"}`}
        >
          <Heart className="w-[16px] h-[16px]" fill={liked ? "currentColor" : "none"} strokeWidth={1.6} />
        </button>
      </div>

      {/* Controls + progress */}
      <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Shuffle" className="hidden md:block text-white/55 hover:text-white transition-colors">
            <Shuffle className="w-[14px] h-[14px]" strokeWidth={1.6} />
          </button>
          <button type="button" aria-label="Previous" className="text-white/75 hover:text-white transition-colors">
            <SkipBack className="w-[16px] h-[16px]" fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="w-[36px] h-[36px] rounded-full grid place-items-center bg-white text-black hover:scale-105 transition-transform"
          >
            {playing ? (
              <Pause className="w-[14px] h-[14px]" fill="currentColor" />
            ) : (
              <Play className="w-[14px] h-[14px]" fill="currentColor" />
            )}
          </button>
          <button type="button" aria-label="Next" className="text-white/75 hover:text-white transition-colors">
            <SkipForward className="w-[16px] h-[16px]" fill="currentColor" />
          </button>
          <button type="button" aria-label="Repeat" className="hidden md:block text-white/55 hover:text-white transition-colors">
            <Repeat className="w-[14px] h-[14px]" strokeWidth={1.6} />
          </button>
        </div>
        <div className="w-full flex items-center gap-2 mt-1">
          <span className="font-manrope text-white/50 text-[10px] tabular-nums">1:24</span>
          <div className="relative flex-1 h-[3px] rounded-full bg-white/10 overflow-hidden group cursor-pointer">
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{
                width: "38%",
                background: "linear-gradient(90deg,#AFDDFF,#ffffff)",
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: "calc(38% - 5px)" }}
            />
          </div>
          <span className="font-manrope text-white/50 text-[10px] tabular-nums">{track.duration}</span>
        </div>
      </div>

      {/* Volume + queue (desktop only) */}
      <div className="hidden md:flex items-center gap-3 w-[200px] justify-end">
        <button type="button" aria-label="Queue" className="text-white/55 hover:text-white transition-colors">
          <ListMusic className="w-[16px] h-[16px]" strokeWidth={1.6} />
        </button>
        <Volume2 className="w-[16px] h-[16px] text-white/55" strokeWidth={1.6} />
        <div className="relative w-[100px] h-[3px] rounded-full bg-white/10 overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-white/80"
            style={{ width: "60%" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */

export default function LumenHero() {
  const [activeVibe, setActiveVibe] = useState<string>("edm");
  const [vibeMenuOpen, setVibeMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [liked, setLiked] = useState(false);
  const [activeTrackIdx, setActiveTrackIdx] = useState(0);
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          if (!cancelled) {
            setUser(null);
            setUserLoading(false);
          }
          return;
        }
        const profile = await getCurrentUser(token);
        if (!cancelled) {
          setUser(profile);
          setUserLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setUserLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = VIBES.find((v) => v.id === activeVibe) ?? VIBES[0];
  const tracks = TRACKS_BY_VIBE[activeVibe] ?? TRACKS_BY_VIBE.edm;
  const currentTrack = tracks[activeTrackIdx] ?? tracks[0];

  return (
    <section className="relative w-full min-h-screen overflow-hidden bg-black">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Background video + dark overlay */}
      <video
        className="absolute inset-0 w-full h-full object-cover anim-fade-in"
        src={VIDEO_SRC}
        autoPlay
        muted
        loop
        playsInline
      />
      <div
        className="absolute inset-0 anim-fade-in"
        style={{
          animationDelay: "150ms",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Butterflies (subtle, gom cụm cột giữa-phải) */}
      <ButterflySwarm count={7} className="hidden lg:block" />

      {/* Layout shell */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="flex items-center gap-[16px] px-5 md:px-[35px] pt-5 md:pt-[27px]">
          <span
            className="font-graphik text-white text-[18px] md:text-[21px] leading-[21px] whitespace-nowrap anim-fade-up tracking-[-0.02em]"
            style={{ animationDelay: "200ms" }}
          >
            Moodify
          </span>

          <div
            className="hidden md:flex items-center gap-[10px] ml-[18px] px-[14px] py-[9px] rounded-full border border-white/10 bg-white/5 backdrop-blur-md w-[280px] anim-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            <Search className="w-[14px] h-[14px] text-white/55" strokeWidth={1.6} />
            <input
              aria-label="Search"
              placeholder="Search artists, tracks, playlists…"
              className="bg-transparent outline-none text-white text-[12px] leading-[14px] flex-1 placeholder:text-white/40"
            />
            <span className="font-manrope text-[10px] text-white/40 tracking-[0.2em]">⌘ K</span>
          </div>

          <div className="ml-auto flex items-center gap-[10px]">
            <VibeDropdown
              active={active}
              onPick={setActiveVibe}
              open={vibeMenuOpen}
              onToggle={() => setVibeMenuOpen((v) => !v)}
            />
            <AccountPill user={user} loading={userLoading} />
          </div>
        </header>

        {/* Main grid: 3-column shell, sidebar + content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6 lg:gap-10 mt-10 md:mt-14 px-5 md:px-[35px] pb-[140px]">
          {/* Left rail (lg+) — Spotify-style nav */}
          <nav className="hidden lg:flex flex-col gap-2 anim-fade-up" style={{ animationDelay: "400ms" }}>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-[8px] bg-white/[0.08] text-white"
            >
              <Home className="w-[16px] h-[16px]" strokeWidth={1.6} />
              <span className="font-manrope text-[13px]">Home</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-[8px] text-white/65 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Search className="w-[16px] h-[16px]" strokeWidth={1.6} />
              <span className="font-manrope text-[13px]">Search</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-[8px] text-white/65 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Library className="w-[16px] h-[16px]" strokeWidth={1.6} />
              <span className="font-manrope text-[13px]">Your Library</span>
            </a>

            <div className="mt-6">
              <p className="font-manrope text-[10px] tracking-[0.32em] text-white/35 mb-2 px-3">
                PLAYLISTS
              </p>
              {VIBES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveVibe(v.id)}
                  className="w-full flex items-center gap-3 px-3 py-1.5 rounded-[6px] text-left transition-colors"
                  style={{
                    background: v.id === activeVibe ? "rgba(255,255,255,0.06)" : "transparent",
                  }}
                >
                  <span
                    className="w-[20px] h-[20px] rounded-[5px] shrink-0"
                    style={{ background: v.bg, boxShadow: `inset 0 0 0 1px ${v.ring}` }}
                  />
                  <span
                    className="font-manrope text-[12px] truncate"
                    style={{ color: v.id === activeVibe ? v.accent : "rgba(255,255,255,0.65)" }}
                  >
                    {v.label}
                  </span>
                </button>
              ))}
            </div>
          </nav>

          {/* Main content */}
          <div className="flex flex-col gap-10 min-w-0">
            {/* Hero */}
            <div className="flex flex-col gap-4 anim-fade-up" style={{ animationDelay: "400ms" }}>
              <p className="font-manrope text-[11px] tracking-[0.32em] text-[#AFDDFF]/80">
                TOP GENRE · {String(VIBES.indexOf(active) + 1).padStart(2, "0")}/05 · NOW PLAYING
              </p>
              <h1 className="font-graphik text-white font-normal leading-[1.05] text-[36px] sm:text-[48px] md:text-[58px]">
                Your world,
                <br />
                <span style={{
                  background: "linear-gradient(90deg, #AFDDFF 0%, #d6e7ff 60%, #ffffff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  your music.
                </span>
              </h1>
              <p className="font-manrope text-white/65 text-[14px] leading-[22px] max-w-[520px]">
                Pick a genre, get a playlist made for the moment. EDM to study-free, LO-FI for late nights, K-POP for road trips.
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {VIBES.map((v) => (
                  <MoodChip
                    key={v.id}
                    vibe={v}
                    active={v.id === activeVibe}
                    onClick={() => setActiveVibe(v.id)}
                  />
                ))}
              </div>
            </div>

            {/* Recently played */}
            <div>
              <SectionHeader eyebrow="FOR YOU" title="Recently played" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {tracks.map((t, i) => (
                  <TrackRow
                    key={`${activeVibe}-${i}`}
                    track={t}
                    index={i}
                    active={i === activeTrackIdx}
                    playing={playing}
                    onClick={() => setActiveTrackIdx(i)}
                  />
                ))}
              </div>
            </div>

            {/* Editor picks */}
            <div>
              <SectionHeader eyebrow="✦ CURATED" title="Editor picks" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {EDITOR_PICKS.map((t, i) => (
                  <EditorPickCard key={t.title} track={t} delay={1000 + i * 80} />
                ))}
              </div>
            </div>

            {/* Hottest in genre */}
            <div>
              <SectionHeader eyebrow="TRENDING IN" title={`${active.label}`} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {[...tracks].reverse().slice(0, 3).map((t, i) => (
                  <TrackRow
                    key={`more-${activeVibe}-${i}`}
                    track={t}
                    index={i}
                    active={false}
                    playing={false}
                    onClick={() => {
                      const idx = tracks.findIndex((x) => x.title === t.title);
                      if (idx >= 0) setActiveTrackIdx(idx);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom mini player */}
      <div className="fixed bottom-0 left-0 right-0 z-30 anim-fade-up" style={{ animationDelay: "1500ms" }}>
        <MiniPlayer
          track={currentTrack}
          playing={playing}
          liked={liked}
          onTogglePlay={() => setPlaying((p) => !p)}
          onToggleLike={() => setLiked((l) => !l)}
        />
      </div>
    </section>
  );
}
