"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Play,
  Pause,
  Mic2,
  Sparkles,
  ChevronDown,
  Shuffle,
  Disc,
  Flame,
  Radio,
  Headphones,
  Music2,
  Users,
  Heart,
  TrendingUp,
  CheckCircle2,
  Clock,
  Compass,
  Coffee,
  Moon,
  Zap,
  PartyPopper,
  Search,
  ChevronRight,
  MoreHorizontal,
  Layers,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import {
  fetchTracks,
  fetchTrackById,
  fetchFollowedArtists,
  fetchPublicAlbums,
  type Track as ApiTrack,
  type FollowedArtist,
  type Album,
} from "@/lib/api-client";
import { usePlayer } from "@/components/dashboard/player-context";
import { useVipTheme, type ThemeOption } from "@/lib/theme";
import RealtimeLyrics from "./realtime-lyrics";
import TrackActionMenu, { TrackInlineActions } from "./track-action-menu";
import AlbumDetailModal from "./album-detail-modal";

// Map UI vibe ids → real genre strings stored in MongoDB
// 147 Vietnamese tracks catalog
const VIBE_TO_GENRES: Record<string, string[]> = {
  all:    ["all", "pop", "Pop", "other", "v-pop", "vpop", "vietnamese", "indie", "hiphop", "edm"],
  pop:    ["pop", "Pop", "v-pop", "vpop"],
  hiphop: ["hiphop", "hip-hop", "rap", "other"],
  indie:  ["indie", "indie pop", "other"],
  edm:    ["edm", "remix", "dance", "other"],
};

type Vibe = {
  id: string;
  label: string;
  caption: string;
  accent: string;
  ring: string;
  bg: string;
};

const VIBES: Vibe[] = [
  { id: "all",    label: "TẤT CẢ",    caption: "Toàn bộ bài hát Việt Nam đặc sắc trên Moodify.", accent: "#818cf8", ring: "rgba(129,140,248,0.45)", bg: "linear-gradient(135deg,#3730a3 0%,#0f172a 100%)" },
  { id: "pop",    label: "V-POP",      caption: "Bản hit V-Pop, ballad ngọt ngào, giai điệu bắt tai.", accent: "#fb7185", ring: "rgba(251,113,133,0.45)", bg: "linear-gradient(135deg,#881337 0%,#1e1b4b 100%)" },
  { id: "hiphop", label: "HIP-HOP",    caption: "Underground flow, rap Việt đỉnh cao, beat chất lượng.", accent: "#fbbf24", ring: "rgba(251,191,36,0.45)", bg: "linear-gradient(135deg,#78350f 0%,#180d2b 100%)" },
  { id: "indie",  label: "INDIE",      caption: "Acoustic mộc mạc, chill nhẹ nhàng, sâu lắng.",        accent: "#c084fc", ring: "rgba(192,132,252,0.45)", bg: "linear-gradient(135deg,#581c87 0%,#180d2b 100%)" },
  { id: "edm",    label: "REMIX/EDM",  caption: "Bản phối sôi động, vinahouse, drop bùng nổ.",     accent: "#38bdf8", ring: "rgba(56,189,248,0.45)", bg: "linear-gradient(135deg,#0369a1 0%,#0f172a 100%)" },
];

type Track = {
  title: string;
  artist: string;
  duration: string;
  cover: string;
  spotifyId?: string;
  audioUrl?: string | null;
  localPath?: string | null;
  lyricsSynced?: string | null;
  lyricsPlain?: string | null;
  raw?: ApiTrack;
};

const KEYFRAMES = `
@keyframes vinylSpinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes equalize {
  0%, 100% { transform: scaleY(0.25); }
  50%      { transform: scaleY(1); }
}
@keyframes waveBar {
  0%, 100% { transform: scaleY(0.2); }
  50%      { transform: scaleY(1); }
}
@keyframes neonPulse {
  0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 10px rgba(168,85,247,0.4)); }
  50%      { opacity: 1; filter: drop-shadow(0 0 22px rgba(168,85,247,0.85)); }
}
@keyframes floatSubtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
`;

/* ── Sub-components ───────────────────────────────────────────── */

function NavTab({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        active 
          ? "bg-purple-500/20 text-white border border-purple-500/30" 
          : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
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
            background: active ? "linear-gradient(to top, #818cf8, #f43f5e)" : "rgba(255,255,255,0.35)",
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
  subtitle,
  seeAllHref,
  onSeeAll,
  seeAllText = "Xem tất cả",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  onSeeAll?: () => void;
  seeAllText?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        {eyebrow && (
          <p className="font-manrope text-[10px] tracking-[0.1em] text-purple-400 mb-1 uppercase font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
            {eyebrow}
          </p>
        )}
        <h2 className="font-display font-bold text-white text-[20px] md:text-[24px] leading-[1.2] tracking-[-0.015em]">
          {title}
        </h2>
        {subtitle && (
          <p className="font-manrope text-[12px] text-white/50 mt-1 font-normal">
            {subtitle}
          </p>
        )}
      </div>
      {(seeAllHref || onSeeAll) && (
        onSeeAll ? (
          <button
            type="button"
            onClick={onSeeAll}
            className="font-manrope text-[11px] tracking-[0.06em] text-purple-400 hover:text-purple-300 transition-colors uppercase font-semibold cursor-pointer"
          >
            {seeAllText}
          </button>
        ) : (
          <Link
            href={seeAllHref || "#"}
            className="font-manrope text-[11px] tracking-[0.06em] text-white/45 hover:text-purple-300 transition-colors uppercase font-medium"
          >
            {seeAllText}
          </Link>
        )
      )}
    </div>
  );
}

function SquareMusicCard({
  track,
  isCurrent,
  isPlaying,
  onPlay,
  vipTheme,
}: {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  vipTheme?: ThemeOption | null;
}) {
  const coverUrl = track.raw?.imageUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400";
  return (
    <div
      onClick={onPlay}
      className={`group/card relative flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border transition-all duration-300 cursor-pointer shadow-md hover:shadow-2xl hover:shadow-purple-900/20 hover:-translate-y-1.5 ${
        isCurrent
          ? "border-purple-500/50 bg-purple-500/[0.08]"
          : "border-white/[0.06] hover:border-white/20"
      }`}
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-900 shadow-md mb-3">
        <img
          src={coverUrl}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
        />

        {/* Floating Spotify Play button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full flex items-center justify-center shadow-xl shadow-black/60 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer ${
            isCurrent && isPlaying
              ? "opacity-100 translate-y-0 bg-purple-500 text-black"
              : "opacity-0 translate-y-2 group-hover/card:opacity-100 group-hover/card:translate-y-0 bg-purple-500 hover:bg-purple-400 text-black"
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>
      </div>

      <h3
        className={`text-sm font-bold truncate transition-colors ${
          isCurrent ? "text-purple-300" : "text-white group-hover/card:text-purple-300"
        }`}
      >
        {track.title}
      </h3>
      <p className="text-white/50 text-xs truncate mt-1">
        {track.artist}
      </p>
    </div>
  );
}

function RankedTrackItem({
  rank,
  track,
  isCurrent,
  isPlaying,
  onPlay,
}: {
  rank: number;
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const rankColors = [
    "from-amber-400 to-amber-600 text-black font-black",
    "from-purple-400 to-pink-500 text-white font-black",
    "from-cyan-400 to-blue-500 text-black font-black",
  ];
  const isTop3 = rank <= 3;
  const rankBadgeClass = isTop3 ? rankColors[rank - 1] : "bg-white/10 text-white/60 font-bold";

  return (
    <div
      onClick={onPlay}
      className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-all duration-200 cursor-pointer border ${
        isCurrent
          ? "bg-purple-500/15 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
          : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 hover:border-white/10"
      }`}
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        {/* Rank Number Badge */}
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
            isTop3 ? `bg-gradient-to-br ${rankBadgeClass} shadow-md` : rankBadgeClass
          }`}
        >
          {rank}
        </div>

        {/* Cover */}
        <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-slate-800 relative group/cover">
          <img
            src={track.raw?.imageUrl || "/covers/focus-flow.jpg"}
            alt={track.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Play className="w-4 h-4 fill-white text-white ml-0.5" />
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold truncate ${isCurrent ? "text-purple-300 font-bold" : "text-white group-hover:text-purple-200"}`}>
            {track.title}
          </p>
          <p className="text-xs text-white/50 truncate mt-0.5">{track.artist}</p>
        </div>
      </div>

      {/* Right meta */}
      <div className="flex items-center gap-3 shrink-0 pl-2">
        {isCurrent && isPlaying ? (
          <div className="flex items-center gap-1">
            <span className="w-1 h-3.5 bg-purple-400 rounded-full animate-bounce" />
            <span className="w-1 h-5 bg-pink-400 rounded-full animate-bounce delay-75" />
            <span className="w-1 h-2.5 bg-amber-400 rounded-full animate-bounce delay-150" />
          </div>
        ) : (
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-purple-300/80 bg-purple-500/10 border border-purple-500/20">
            HOT
          </span>
        )}
        <span className="text-xs font-mono text-white/40">{track.duration}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-purple-500 hover:text-black flex items-center justify-center text-white/60 transition-all cursor-pointer"
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>
      </div>
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
  onMouseEnter,
  onMouseLeave,
  vipTheme,
}: {
  track: Track;
  index: number;
  active: boolean;
  playing: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  vipTheme?: ThemeOption | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`w-full flex flex-col rounded-2xl transition-all duration-300 ${
        isExpanded
          ? vipTheme
            ? "bg-slate-950/85 border border-[#dfba63]/50 shadow-[0_12px_36px_rgba(0,0,0,0.8)] my-1.5 backdrop-blur-xl"
            : "bg-slate-950/80 border border-purple-500/40 shadow-[0_12px_36px_rgba(0,0,0,0.7)] my-1.5 backdrop-blur-xl"
          : active
          ? vipTheme
            ? "bg-gradient-to-r from-[#caa048]/18 via-[#edd087]/10 to-transparent border border-[#caa048]/35 shadow-[0_4px_24px_rgba(202,152,57,0.18)]"
            : "bg-gradient-to-r from-purple-500/20 via-indigo-500/10 to-transparent border border-purple-500/30 shadow-[0_4px_24px_rgba(168,85,247,0.15)]"
          : "border border-white/5 bg-slate-950/40 hover:bg-white/[0.05] hover:border-white/10"
      }`}
    >
      {/* Top Track Row */}
      <div
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="group w-full grid grid-cols-[28px_46px_1fr_auto_32px] items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-left cursor-pointer transition-all"
        style={{
          animation: `lumenFadeIn 500ms cubic-bezier(0.16,1,0.3,1) both`,
          animationDelay: `${900 + index * 50}ms`,
        }}
      >
        {/* Index / equalizer / play on hover */}
        <div className="relative w-7 h-7 flex items-center justify-center">
          <span
            className={`font-mono text-[12px] font-medium ${
              active
                ? vipTheme
                  ? "text-[#edd087] font-bold"
                  : "text-purple-300 font-bold"
                : "text-white/40 group-hover:opacity-0"
            }`}
          >
            {active && playing ? (
              <span className="flex items-end gap-[2px] h-[14px]">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`block w-[2.5px] rounded-sm ${
                      vipTheme
                        ? `bg-gradient-to-t ${vipTheme.equalizerGradient}`
                        : "bg-gradient-to-t from-pink-500 to-purple-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                    }`}
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
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                vipTheme
                  ? vipTheme.iconBtnClass
                  : "bg-purple-500/30 border border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.5)] text-white"
              }`}
            >
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </div>
          </div>
        </div>

        {/* Cover with vinyl groove overlay */}
        <div
          className="w-[46px] h-[46px] rounded-xl shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden relative"
          style={{ background: track.cover }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Title / artist */}
        <div className="min-w-0">
          <p
            className={`font-manrope text-[14px] leading-[18px] truncate transition-colors ${
              active
                ? vipTheme
                  ? "font-bold text-[#fff3d4]"
                  : "font-bold text-purple-200"
                : vipTheme
                ? "font-semibold text-white group-hover:text-[#edd087]"
                : "font-semibold text-white group-hover:text-purple-300"
            }`}
          >
            {track.title}
          </p>
          <p className="font-manrope text-white/50 text-[12px] leading-[15px] truncate mt-0.5">
            {track.artist}
          </p>
        </div>

        {/* Duration & Status */}
        <div className="flex items-center gap-2 text-right justify-end">
          {!track.raw?.audioUrl && !track.raw?.localPath && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium text-amber-300/90 bg-amber-400/10 border border-amber-400/25">
              Sắp ra mắt
            </span>
          )}
          <span className="font-mono text-white/40 text-[12px] tracking-wide">
            {track.duration}
          </span>
        </div>

        {/* Dropdown Chevron Action Trigger */}
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="flex items-center justify-end"
        >
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              isExpanded
                ? "text-purple-200 bg-purple-500/30 rotate-180 scale-110 shadow-[0_0_14px_rgba(168,85,247,0.5)] border border-purple-400/50"
                : "text-white/40 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95"
            }`}
            title={isExpanded ? "Đóng tùy chọn" : "Mở rộng tùy chọn bài hát"}
            aria-label="Tùy chọn bài hát"
          >
            <ChevronDown
              className="w-4 h-4 pointer-events-none transition-transform duration-300"
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      {/* Inline Expanded Action Drawer (Pushes subsequent rows down!) */}
      {isExpanded && (
        <div
          className="w-full px-3 pb-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <TrackInlineActions
            track={
              track.raw || {
                spotifyId: track.spotifyId,
                name: track.title,
                artistName: track.artist,
                cover: track.cover,
                imageUrl: track.cover,
              }
            }
            onShowLyrics={onClick}
            onClose={() => setIsExpanded(false)}
          />
        </div>
      )}
    </div>
  );
}

/* ── Editor pick card ────────────────────────────────────────── */

function EditorPickCard({
  track,
  delay,
  onPlay,
  vipTheme,
}: {
  track: Track;
  delay: number;
  onPlay?: () => void;
  vipTheme?: ThemeOption | null;
}) {
  return (
    <div
      onClick={onPlay}
      className="group relative cursor-pointer rounded-2xl overflow-hidden border border-white/10 bg-slate-950/60 backdrop-blur-xl hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,0,0,0.7)] anim-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative w-full aspect-[16/10] overflow-hidden" style={{ background: track.cover }}>
        {/* Vinyl peek disc on hover */}
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full border border-white/20 bg-black/90 opacity-0 group-hover:opacity-90 group-hover:translate-x-2 transition-all duration-500 pointer-events-none flex items-center justify-center shadow-2xl">
          <div className="w-8 h-8 rounded-full border border-white/30 bg-purple-900/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
        </div>

        <div className="absolute inset-x-3 bottom-3 opacity-80 group-hover:opacity-100 transition-opacity">
          <WaveformPreview active />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay?.();
          }}
          aria-label={`Play ${track.title}`}
          className={`absolute right-3 bottom-3 w-10 h-10 rounded-full grid place-items-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all active:scale-95 ${
            vipTheme
              ? vipTheme.primaryBtnClass
              : "bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-[0_6px_20px_rgba(168,85,247,0.6)]"
          }`}
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </button>
      </div>
      <div className="p-3.5">
        <p className="font-manrope font-semibold text-white text-[13px] leading-[17px] truncate group-hover:text-purple-300 transition-colors">
          {track.title}
        </p>
        <p className="font-manrope text-white/50 text-[11px] leading-[15px] truncate mt-1">
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
  vipTheme,
}: {
  vibe: Vibe;
  active: boolean;
  onClick: () => void;
  vipTheme?: ThemeOption | null;
}) {
  const chipAccent = vipTheme && vibe.id === "all" ? vipTheme.accent : vibe.accent;
  const chipRing = vipTheme && vibe.id === "all" ? vipTheme.glow : vibe.ring;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
      style={{
        background: active ? `${chipAccent}25` : "rgba(255,255,255,0.04)",
        borderColor: active ? chipAccent : "rgba(255,255,255,0.12)",
        boxShadow: active ? `0 0 16px ${chipRing}, inset 0 0 10px ${chipAccent}20` : "none",
      }}
    >
      <span
        className="inline-block w-[7px] h-[7px] rounded-full"
        style={{ background: chipAccent, boxShadow: `0 0 8px ${chipRing}` }}
      />
      <span
        className="font-manrope text-[11px] font-semibold tracking-[0.14em]"
        style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.7)" }}
      >
        {vibe.label}
      </span>
    </button>
  );
}

/* ── Main component ───────────────────────────────────────────── */

function LumenHeroContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const vibeFromUrl = searchParams.get("vibe") || "all";

  const { playTrack, currentTrack, isPlaying, currentTime, duration, seek, togglePlay, isPremiumUser } = usePlayer();
  const { vipButtonsEnabled, currentVipTheme } = useVipTheme();
  const isVipButtonsActive = Boolean(isPremiumUser) && vipButtonsEnabled;
  const activeVipTheme = isVipButtonsActive ? currentVipTheme : null;
  const [activeVibe, setActiveVibe] = useState<string>(vibeFromUrl);
  const [viewMode, setViewMode] = useState<"lyrics" | "hero">("hero");
  const [activeTrackIdx, setActiveTrackIdx] = useState(0);
  const [hoveredTrackIdx, setHoveredTrackIdx] = useState<number | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);

  // Determine the track currently in spotlight (hovered > playing > selected by index > first track)
  const activeSelectedTrack =
    (hoveredTrackIdx !== null ? tracks[hoveredTrackIdx] : null) ||
    tracks.find(
      (t) =>
        t.spotifyId &&
        currentTrack?.spotifyId &&
        t.spotifyId === currentTrack.spotifyId
    ) ||
    tracks[activeTrackIdx] ||
    tracks[0];

  const selectedImageUrl = currentTrack?.imageUrl || activeSelectedTrack?.raw?.imageUrl;

  // Auto-play shared track from URL (?track=... or ?song=...)
  const trackIdFromUrl = searchParams.get("track") || searchParams.get("song");
  const [sharedToast, setSharedToast] = useState<string | null>(null);
  const handledSharedTrackRef = useRef<string | null>(null);

  useEffect(() => {
    if (!trackIdFromUrl || handledSharedTrackRef.current === trackIdFromUrl) return;

    let isMounted = true;
    (async () => {
      try {
        const trk = await fetchTrackById(trackIdFromUrl);
        if (!isMounted || !trk) return;
        handledSharedTrackRef.current = trackIdFromUrl;

        // Auto play shared track & open live lyrics mode
        setViewMode("lyrics");
        playTrack({
          id: trk.id,
          spotifyId: trk.spotifyId,
          name: trk.name,
          artistName: trk.artistName,
          albumName: trk.albumName,
          imageUrl: trk.imageUrl,
          durationMs: trk.durationMs,
          lyricsPlain: trk.lyricsPlain,
          lyricsSynced: trk.lyricsSynced,
          audioUrl: trk.audioUrl || (trk.localPath ? `http://158.178.247.33/${trk.localPath.replace(/^\/+/, "")}` : undefined),
          localPath: trk.localPath,
        });

        setSharedToast(`Đang phát bài hát được chia sẻ: ${trk.name} - ${trk.artistName} 🎵`);
        setTimeout(() => setSharedToast(null), 5000);
      } catch (err) {
        console.warn("Could not load shared track:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [trackIdFromUrl, playTrack]);

  useEffect(() => {
    if (vibeFromUrl) {
      setActiveVibe(vibeFromUrl);
    }
  }, [vibeFromUrl]);

  useEffect(() => {
    const onVibeEvent = (e: Event) => {
      const ce = e as CustomEvent<{ vibeId: string }>;
      if (ce.detail?.vibeId) {
        setActiveVibe(ce.detail.vibeId);
      }
    };
    window.addEventListener("moodify-vibe-changed", onVibeEvent);
    return () => window.removeEventListener("moodify-vibe-changed", onVibeEvent);
  }, []);

  const handleVibeChange = (id: string) => {
    setActiveVibe(id);
    const targetBase = pathname?.startsWith("/dashboard/user") ? "/dashboard/user" : "/dashboard";
    router.push(`${targetBase}?vibe=${id}`);
    window.dispatchEvent(new CustomEvent("moodify-vibe-changed", { detail: { vibeId: id } }));
  };

  // Helper function to format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Map API track → UI Track; sorts playable tracks with audio first
  const mapApiTracks = (items: ApiTrack[]): Track[] => {
    const sorted = [...items].sort((a, b) => {
      const aHas = Boolean(a.audioUrl || a.localPath);
      const bHas = Boolean(b.audioUrl || b.localPath);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return 0;
    });

    return sorted.map((t) => ({
      title: t.name,
      artist: t.artistName,
      duration: formatDuration(t.durationMs),
      spotifyId: t.spotifyId,
      audioUrl: t.audioUrl,
      localPath: t.localPath,
      raw: t,
      cover: t.imageUrl
        ? `url(${t.imageUrl}) center/cover no-repeat`
        : "linear-gradient(135deg,#7a5cff,#1a1430)",
    }));
  };

  // Fetch tracks whose MongoDB `genres` array contains any of the target genres.
  const fetchByGenres = async (genres: string[], size: number): Promise<ApiTrack[]> => {
    if (activeVibe === "all") {
      try {
        const resp = await fetchTracks({ size: 200 });
        return resp.content;
      } catch (err) {
        console.error("Failed to fetch all tracks:", err);
      }
    }

    const seen = new Set<string>();
    const merged: ApiTrack[] = [];
    await Promise.all(
      genres.map(async (g) => {
        try {
          const resp = await fetchTracks({ genre: g, size });
          for (const t of resp.content) {
            if (!seen.has(t.spotifyId)) {
              seen.add(t.spotifyId);
              merged.push(t);
            }
          }
        } catch (err) {
          console.error(`Failed to fetch genre "${g}":`, err);
        }
      })
    );

    // If specific genre returned 0 tracks, fallback to general tracks from catalog
    if (merged.length === 0) {
      try {
        const resp = await fetchTracks({ size: 200 });
        return resp.content;
      } catch (err) {
        console.error("Failed to fetch fallback tracks:", err);
      }
    }

    return merged;
  };

  // Fetch tracks when vibe changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTracksLoading(true);
      try {
        const genres = VIBE_TO_GENRES[activeVibe] ?? [activeVibe];
        const items = await fetchByGenres(genres, 150);
        if (!cancelled) {
          setTracks(mapApiTracks(items));
          setActiveTrackIdx(0);
        }
      } catch (error) {
        console.error("Failed to fetch tracks:", error);
        if (!cancelled) {
          setTracks([]);
          setActiveTrackIdx(0);
        }
      } finally {
        if (!cancelled) {
          setTracksLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeVibe]);

  // Public Albums State
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | string | null>(null);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [albumsLoading, setAlbumsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAlbumsLoading(true);
      try {
        const resp = await fetchPublicAlbums(undefined, 0, 8);
        if (!cancelled && resp?.content) {
          setAlbums(resp.content);
        }
      } catch (err) {
        console.error("Failed to fetch public albums:", err);
      } finally {
        if (!cancelled) setAlbumsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Catalog Section State
  const [catalogSearch, setCatalogSearch] = useState("");
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);

  // Fetch editor picks from MongoDB (popular tracks across all genres)
  const [editorPicks, setEditorPicks] = useState<Track[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetchTracks({ size: 8 });
        if (!cancelled) {
          setEditorPicks(mapApiTracks(resp.content.slice(0, 4)));
        }
      } catch (err) {
        console.error("Failed to fetch editor picks:", err);
        if (!cancelled) {
          setEditorPicks([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch followed artists to display their shelf on the dashboard
  const [followedArtists, setFollowedArtists] = useState<FollowedArtist[]>([]);
  useEffect(() => {
    let cancelled = false;
    const loadFollowed = async () => {
      try {
        const data = await fetchFollowedArtists();
        if (!cancelled) {
          setFollowedArtists(data);
        }
      } catch {
        // user not logged in or network error
      }
    };
    loadFollowed();

    const handleFollowChange = () => {
      loadFollowed();
    };
    window.addEventListener("moodify-artist-followed", handleFollowChange);
    return () => {
      cancelled = true;
      window.removeEventListener("moodify-artist-followed", handleFollowChange);
    };
  }, []);

  const handlePlayTrack = (t: Track, index?: number) => {
    if (!t.raw?.audioUrl && !t.raw?.localPath) {
      alert(`Bài hát "${t.title}" hiện chưa có bản thu âm sẵn trên hệ thống. Vui lòng chọn bài hát có sẵn audio.`);
      return;
    }
    if (index !== undefined) {
      setActiveTrackIdx(index);
    }
    setViewMode("lyrics");
    if (t.raw) {
      playTrack(
        {
          id: t.raw.id,
          spotifyId: t.raw.spotifyId,
          name: t.raw.name,
          artistName: t.raw.artistName,
          albumName: t.raw.albumName,
          imageUrl: t.raw.imageUrl,
          durationMs: t.raw.durationMs,
          lyricsPlain: t.raw.lyricsPlain,
          lyricsSynced: t.raw.lyricsSynced,
          audioUrl: t.raw.audioUrl || (t.raw.localPath ? `http://158.178.247.33/${t.raw.localPath.replace(/^\/+/, "")}` : undefined),
          localPath: t.raw.localPath,
        },
        tracks
          .filter((x) => x.raw && (x.raw.audioUrl || x.raw.localPath))
          .map((x) => ({
            id: x.raw!.id,
            spotifyId: x.raw!.spotifyId,
            name: x.raw!.name,
            artistName: x.raw!.artistName,
            albumName: x.raw!.albumName,
            imageUrl: x.raw!.imageUrl,
            durationMs: x.raw!.durationMs,
            lyricsPlain: x.raw!.lyricsPlain,
            lyricsSynced: x.raw!.lyricsSynced,
            audioUrl: x.raw!.audioUrl || (x.raw!.localPath ? `http://158.178.247.33/${x.raw!.localPath.replace(/^\/+/, "")}` : undefined),
            localPath: x.raw!.localPath,
          }))
      );
    }
  };

  const active = VIBES.find((v) => v.id === activeVibe) ?? VIBES[0];

  if (tracksLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-white/60">
        Đang tải bài hát...
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="text-white/80 text-xl mb-2">Chưa có bài hát nào</div>
        <div className="text-white/40 text-sm">Vui lòng chọn thể loại khác</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 min-w-0 relative">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Floating Shared Track Notification */}
      {sharedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] px-5 py-3 rounded-2xl bg-slate-900/95 border border-purple-500/50 text-purple-200 text-sm font-semibold shadow-[0_10px_40px_rgba(168,85,247,0.4)] backdrop-blur-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5 text-pink-400 animate-pulse shrink-0" />
          <span>{sharedToast}</span>
        </div>
      )}

      {/* Middle Stage: Hero Banner or Real-Time Synced Lyrics */}
      <div className="flex flex-col gap-4">
        {/* If a track is active, provide quick tabs between Live Lyrics and Genre Overview */}
        {currentTrack && (
          <div className="flex items-center justify-between gap-3 anim-fade-up">
            <div className="flex items-center gap-2 p-1.5 rounded-full bg-slate-950/70 border border-white/10 backdrop-blur-xl shadow-lg">
              <button
                type="button"
                onClick={() => setViewMode("lyrics")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "lyrics"
                    ? "bg-purple-500/25 text-purple-200 border border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Mic2 className="w-3.5 h-3.5 text-pink-400" />
                <span>Lời bài hát</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("hero")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "hero"
                    ? "bg-white/15 text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Khám phá thể loại</span>
              </button>
            </div>

            <p className="font-manrope text-[11px] tracking-[0.06em] text-purple-300/80 hidden sm:block uppercase font-medium">
              {viewMode === "lyrics" ? "Lời bài hát trực tiếp" : "Danh mục Moodify"}
            </p>
          </div>
        )}

        {viewMode === "lyrics" && currentTrack ? (
          <div className="anim-fade-up">
            <RealtimeLyrics
              track={currentTrack}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onSeek={seek}
              onTogglePlay={togglePlay}
            />
            {/* Genre chips underneath lyrics */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {VIBES.map((v) => (
                <MoodChip
                  key={v.id}
                  vibe={v}
                  active={v.id === activeVibe}
                  onClick={() => handleVibeChange(v.id)}
                  vipTheme={activeVipTheme}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            id="tour-hero-player"
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950/90 via-[#0d101e]/85 to-slate-950/90 backdrop-blur-2xl p-6 sm:p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] anim-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            {/* Ambient Aurora behind Hero */}
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-600/20 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-pink-600/15 blur-[100px] pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-8 items-center">
              {/* Left Column: Headline & Controls */}
              <div className="flex flex-col gap-4">
                <h1 className="font-display text-white font-bold leading-[1.08] text-[32px] sm:text-[44px] md:text-[50px] tracking-[-0.03em] uppercase">
                  Your Music,
                  <br />
                  <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-amber-200 bg-clip-text text-transparent">
                    Your Mood.
                  </span>
                </h1>

                <p className="font-manrope text-white/70 text-[14px] sm:text-[15px] leading-[22px] max-w-[520px]">
                  Nghe những gì bạn thích, khám phá những thứ bạn chưa từng nghe.
                </p>

                {/* Quick Audio CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isPlaying && currentTrack?.spotifyId === activeSelectedTrack?.spotifyId) {
                        togglePlay();
                      } else {
                        const target =
                          (activeSelectedTrack?.raw?.audioUrl || activeSelectedTrack?.raw?.localPath)
                            ? activeSelectedTrack
                            : tracks.find((t) => t.raw?.audioUrl || t.raw?.localPath) || activeSelectedTrack || tracks[0];
                        if (target) handlePlayTrack(target);
                      }
                    }}
                    className={`group relative flex items-center gap-2.5 px-6 py-3 rounded-full text-[13px] font-bold tracking-wide hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer overflow-hidden border shadow-lg ${
                      isVipButtonsActive
                        ? "shadow-[0_8px_25px_rgba(0,0,0,0.6)]"
                        : "border-white/30 hover:border-white/60 shadow-[0_8px_25px_rgba(0,0,0,0.5)]"
                    }`}
                    style={{
                      borderColor: isVipButtonsActive ? currentVipTheme.accent : undefined,
                      boxShadow: isVipButtonsActive
                        ? `0 0 20px ${currentVipTheme.accent}40, 0 8px 25px rgba(0,0,0,0.6)`
                        : undefined,
                    }}
                    title={
                      activeSelectedTrack
                        ? `Phát: ${activeSelectedTrack.title} - ${activeSelectedTrack.artist}`
                        : "Nghe ngay"
                    }
                  >
                    {/* Background layer: Song artwork cover image */}
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-115"
                      style={{
                        backgroundImage: selectedImageUrl
                          ? isVipButtonsActive
                            ? `linear-gradient(135deg, ${currentVipTheme.accent}50 0%, rgba(0, 0, 0, 0.72) 100%), url(${selectedImageUrl})`
                            : `linear-gradient(135deg, rgba(0, 0, 0, 0.38) 0%, rgba(0, 0, 0, 0.68) 100%), url(${selectedImageUrl})`
                          : isVipButtonsActive
                          ? undefined
                          : "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                        backgroundColor: "#1a1336",
                      }}
                    />

                    {/* Shimmer sweep effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                    {/* Button content */}
                    {isPlaying && currentTrack?.spotifyId === activeSelectedTrack?.spotifyId ? (
                      <Pause className="w-4 h-4 fill-current ml-0.5 relative z-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5 relative z-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                    )}
                    <span className="relative z-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      {isPlaying && currentTrack?.spotifyId === activeSelectedTrack?.spotifyId
                        ? "Tạm dừng"
                        : "Nghe ngay"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const playableTracks = tracks.filter((t) => t.raw?.audioUrl || t.raw?.localPath);
                      if (playableTracks.length > 0) {
                        const randomIndex = Math.floor(Math.random() * playableTracks.length);
                        handlePlayTrack(playableTracks[randomIndex]);
                      } else if (tracks.length > 0) {
                        handlePlayTrack(tracks[0]);
                      }
                    }}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full text-[13px] font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                      isVipButtonsActive
                        ? currentVipTheme.secondaryBtnClass
                        : "bg-white/[0.06] hover:bg-white/10 border border-white/15 text-white/90 hover:text-white"
                    }`}
                  >
                    <Shuffle className={`w-4 h-4 ${isVipButtonsActive ? "text-current" : "text-purple-300"}`} />
                    <span>Phát ngẫu nhiên</span>
                  </button>
                </div>

                {/* Genre Vibe Chips */}
                <div id="tour-vibe-filter" className="flex flex-wrap items-center gap-2 mt-3 pt-4 border-t border-white/10">
                  {VIBES.map((v) => (
                    <MoodChip
                      key={v.id}
                      vibe={v}
                      active={v.id === activeVibe}
                      onClick={() => handleVibeChange(v.id)}
                      vipTheme={activeVipTheme}
                    />
                  ))}
                </div>
              </div>

              {/* Right Column: Vinyl Disc Visualizer Stage (Hidden on small screens) */}
              <div className="hidden lg:flex flex-col items-center justify-center relative">
                <div className="relative w-72 h-72 flex items-center justify-center">
                  {/* Vinyl outer sleeve glow */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600/30 to-pink-600/30 blur-2xl animate-pulse" />

                  {/* Vinyl record disc - Spins smoothly when isPlaying is true */}
                  <div
                    className="relative w-68 h-68 md:w-72 md:h-72 rounded-full bg-[#0a0a0f] border-4 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden transition-transform"
                    style={{
                      backgroundImage: `radial-gradient(circle at center, transparent 35%, rgba(255,255,255,0.03) 36%, transparent 37%, transparent 45%, rgba(255,255,255,0.03) 46%, transparent 47%, transparent 58%, rgba(255,255,255,0.03) 59%, transparent 60%, transparent 72%, rgba(255,255,255,0.03) 73%, transparent 74%, transparent 88%, rgba(255,255,255,0.03) 89%, transparent 90%)`,
                      animation: "vinylSpinSlow 14s linear infinite",
                      animationPlayState: isPlaying ? "running" : "paused",
                    }}
                  >
                    {/* Vinyl specular shine reflection */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />

                    {/* Center Vinyl Label - Enlarged Album Art as requested */}
                    <div
                      className="relative w-44 h-44 md:w-48 md:h-48 rounded-full border-2 border-white/30 shadow-2xl overflow-hidden flex items-center justify-center"
                      style={{
                        background: selectedImageUrl
                          ? `url(${selectedImageUrl}) center/cover no-repeat`
                          : (tracks[0]?.cover || "linear-gradient(135deg,#7A5CFF,#F557B6)"),
                      }}
                    >
                      {/* Center Spindle Hole */}
                      <div className="w-6 h-6 rounded-full bg-[#06070a] border-2 border-white/70 shadow-lg z-10" />
                    </div>
                  </div>

                  {/* Floating live badge */}
                  <div className="absolute -bottom-3 px-4 py-1.5 rounded-full bg-slate-950/90 border border-white/20 backdrop-blur-xl shadow-xl flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-pink-400 animate-ping" : "bg-white/40"}`} />
                    <span className="text-[11px] font-mono font-medium text-white/90">
                      {isPlaying && currentTrack ? "Đang phát nhạc" : "Sẵn sàng phát"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SPOTIFY QUICK ACCESS SHORTCUTS (6 cards)                                  */}
      {/* ========================================================================= */}
      {tracks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 anim-fade-up">
          {/* 1. Liked Songs card */}
          <Link
            href="/dashboard/library?tab=tracks"
            className="group relative flex items-center gap-3.5 bg-white/[0.04] hover:bg-white/[0.09] rounded-xl overflow-hidden transition-all duration-300 border border-white/[0.06] hover:border-purple-500/40 shadow-md hover:shadow-xl cursor-pointer pr-4"
          >
            <div className="w-16 h-16 shrink-0 bg-gradient-to-br from-purple-700 via-pink-600 to-indigo-800 flex items-center justify-center shadow-lg">
              <Heart className="w-7 h-7 text-white fill-white animate-pulse" />
            </div>
            <div className="min-w-0 flex-1 py-2">
              <p className="text-white font-bold text-sm truncate">Bài hát đã thích</p>
              <p className="text-purple-300/70 text-xs truncate mt-0.5">Playlist của bạn</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-500 text-black flex items-center justify-center shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shrink-0">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </Link>

          {/* 2-6: Popular Playable Tracks */}
          {(tracks.filter((t) => t.raw?.audioUrl || t.raw?.localPath).length >= 5
            ? tracks.filter((t) => t.raw?.audioUrl || t.raw?.localPath)
            : tracks
          )
            .slice(0, 5)
            .map((t, idx) => (
              <div
                key={t.spotifyId || idx}
                onClick={() => handlePlayTrack(t)}
                className="group relative flex items-center gap-3.5 bg-white/[0.04] hover:bg-white/[0.09] rounded-xl overflow-hidden transition-all duration-300 border border-white/[0.06] hover:border-purple-500/40 shadow-md hover:shadow-xl cursor-pointer pr-4"
              >
                <div
                  className="w-16 h-16 shrink-0 bg-slate-800 bg-cover bg-center"
                  style={{ backgroundImage: t.raw?.imageUrl ? `url(${t.raw.imageUrl})` : undefined }}
                />
                <div className="min-w-0 flex-1 py-2">
                  <p className="text-white font-bold text-sm truncate group-hover:text-purple-200 transition-colors">
                    {t.title}
                  </p>
                  <p className="text-white/50 text-xs truncate mt-0.5">{t.artist}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-500 text-black flex items-center justify-center shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shrink-0">
                  {isPlaying && currentTrack?.spotifyId === t.spotifyId ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOX 1: DÀNH RIÊNG CHO BẠN (Made For You / Based on your listening)        */}
      {/* ========================================================================= */}
      <div className="anim-fade-up">
        <SectionHeader
          eyebrow="MADE FOR YOU"
          title="Dành riêng cho bạn"
          subtitle="Giai điệu dựa trên thói quen nghe nhạc gần đây của bạn"
          onSeeAll={() => handleVibeChange("all")}
          seeAllText="Khám phá thêm"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {(tracks.filter((t) => t.raw?.audioUrl || t.raw?.localPath).length >= 6
            ? tracks.filter((t) => t.raw?.audioUrl || t.raw?.localPath)
            : tracks
          )
            .slice(0, 6)
            .map((t, idx) => (
              <SquareMusicCard
                key={`mfy-${t.spotifyId || idx}`}
                track={t}
                isCurrent={currentTrack?.spotifyId === t.spotifyId}
                isPlaying={Boolean(isPlaying && currentTrack?.spotifyId === t.spotifyId)}
                onPlay={() => handlePlayTrack(t, idx)}
                vipTheme={activeVipTheme}
              />
            ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOX 2: HÔM NAY NGHE GÌ? - BẢNG XẾP HẠNG TOP HITS (Spotify Charts)          */}
      {/* ========================================================================= */}
      <div className="anim-fade-up">
        <SectionHeader
          eyebrow="BẢNG XẾP HẠNG"
          title="Hôm nay nghe gì? / Hot Hits Vietnam"
          subtitle="Top ca khúc thịnh hành được cộng đồng nghe nhiều nhất tuần này"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {tracks.slice(0, 6).map((t, idx) => (
            <RankedTrackItem
              key={`rank-${t.spotifyId || idx}`}
              rank={idx + 1}
              track={t}
              isCurrent={currentTrack?.spotifyId === t.spotifyId}
              isPlaying={Boolean(isPlaying && currentTrack?.spotifyId === t.spotifyId)}
              onPlay={() => handlePlayTrack(t, idx)}
            />
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOX 3: TUYỂN TẬP & ALBUM CHỌN LỌC (Curated by Moodify / New Music Friday)  */}
      {/* ========================================================================= */}
      {albums.length > 0 && (
        <div className="anim-fade-up">
          <SectionHeader
            eyebrow="CURATED BY MOODIFY"
            title="Tuyển tập & Album chọn lọc"
            subtitle="Các album tinh hoa được tuyển tập bởi đội ngũ âm nhạc Moodify"
            onSeeAll={() => router.push("/dashboard/library?tab=albums")}
            seeAllText="Tất cả album"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {albums.slice(0, 6).map((alb) => (
              <div
                key={alb.id}
                onClick={() => {
                  setSelectedAlbumId(alb.id);
                  setIsAlbumModalOpen(true);
                }}
                className="group/album relative flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-cyan-500/40 transition-all duration-300 cursor-pointer shadow-md hover:shadow-2xl hover:shadow-cyan-950/20 hover:-translate-y-1.5"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-800 shadow-md mb-3">
                  <img
                    src={alb.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300"}
                    alt={alb.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/album:scale-105"
                  />

                  {/* Album badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                    <Disc className="w-3 h-3 text-cyan-400 animate-spin-slow" />
                    <span>ALBUM</span>
                  </div>

                  {/* Play on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAlbumId(alb.id);
                      setIsAlbumModalOpen(true);
                    }}
                    className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center shadow-xl shadow-black/60 translate-y-2 opacity-0 group-hover/album:translate-y-0 group-hover/album:opacity-100 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </button>
                </div>

                <h3 className="text-white text-sm font-bold truncate group-hover/album:text-cyan-300 transition-colors">
                  {alb.title}
                </h3>
                <p className="text-white/50 text-xs truncate mt-1">
                  {alb.authorName || "Nhiều nghệ sĩ"} • {alb.trackCount || 0} bài hát
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOX 4: NGHỆ SĨ VIỆT NAM NỔI BẬT (Featured Artists / Artists to Follow)     */}
      {/* ========================================================================= */}
      <div className="anim-fade-up">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            eyebrow="NGHỆ SĨ TIÊU BIỂU"
            title="Nghệ sĩ Việt Nam nổi bật"
            subtitle="Theo dõi các giọng ca hàng đầu đang tạo nên làn sóng âm nhạc"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {(() => {
            const artistMap = new Map<string, { name: string; image?: string; id?: string }>();
            tracks.forEach((t) => {
              if (t.artist && !artistMap.has(t.artist) && t.raw?.imageUrl) {
                artistMap.set(t.artist, {
                  name: t.artist,
                  image: t.raw.imageUrl,
                  id: t.raw.artistSpotifyId || t.raw.artistName,
                });
              }
            });
            const list = Array.from(artistMap.values()).slice(0, 6);
            return list.map((art) => (
              <div
                key={art.name}
                onClick={() => router.push(`/dashboard/artist/${encodeURIComponent(art.id || art.name)}`)}
                className="group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-purple-500/30 transition-all duration-300 cursor-pointer text-center flex flex-col items-center hover:-translate-y-1.5"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-3 bg-slate-800 ring-2 ring-white/10 group-hover:ring-purple-400/80 transition-all shadow-xl relative group/avatar">
                  {art.image ? (
                    <img
                      src={art.image}
                      alt={art.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-900/30 text-purple-300">
                      <Users className="w-8 h-8" />
                    </div>
                  )}

                  {/* Play overlay on artist avatar */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-purple-500 text-black flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 justify-center w-full">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                    {art.name}
                  </h4>
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20 shrink-0" />
                </div>
                <p className="text-[11px] text-white/50 truncate w-full mt-0.5">Nghệ sĩ xác minh</p>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOX 5: GIAI ĐIỆU THEO TÂM TRẠNG (Mood & Atmosphere Stations)               */}
      {/* ========================================================================= */}
      <div className="anim-fade-up">
        <SectionHeader
          eyebrow="TRẠM CẢM XÚC"
          title="Giai điệu theo tâm trạng"
          subtitle="Chọn trạng thái cảm xúc để đắm chìm vào không gian âm nhạc phù hợp"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          {[
            {
              id: "indie",
              title: "Cà Phê Quán Quen",
              desc: "Acoustic, Indie, Lofi êm dịu",
              icon: "☕",
              bg: "linear-gradient(135deg, #581c87 0%, #1e1b4b 100%)",
              border: "rgba(192, 132, 252, 0.3)",
            },
            {
              id: "hiphop",
              title: "Năng Lượng & Flow",
              desc: "Rap Việt bốc lửa, beat căng",
              icon: "🔥",
              bg: "linear-gradient(135deg, #78350f 0%, #180d2b 100%)",
              border: "rgba(251, 191, 36, 0.3)",
            },
            {
              id: "pop",
              title: "V-Pop Thịnh Hành",
              desc: "Ballad ngọt ngào, hit viral",
              icon: "💖",
              bg: "linear-gradient(135deg, #881337 0%, #1e1b4b 100%)",
              border: "rgba(251, 113, 133, 0.3)",
            },
            {
              id: "edm",
              title: "Sôi Động / Remix",
              desc: "Vinahouse, bass drop bùng nổ",
              icon: "🎉",
              bg: "linear-gradient(135deg, #0369a1 0%, #0f172a 100%)",
              border: "rgba(56, 189, 248, 0.3)",
            },
            {
              id: "all",
              title: "Tập Trung Đỉnh Cao",
              desc: "Deep focus, giai điệu thư thái",
              icon: "🎧",
              bg: "linear-gradient(135deg, #134e4a 0%, #0f172a 100%)",
              border: "rgba(45, 212, 191, 0.3)",
            },
          ].map((st) => (
            <div
              key={st.title}
              onClick={() => handleVibeChange(st.id)}
              className="group relative rounded-2xl p-4 overflow-hidden transition-all duration-300 cursor-pointer hover:-translate-y-1.5 shadow-lg border hover:shadow-2xl"
              style={{ background: st.bg, borderColor: st.border }}
            >
              <div className="text-3xl mb-3">{st.icon}</div>
              <h4 className="text-white font-bold text-sm leading-tight group-hover:text-purple-200 transition-colors">
                {st.title}
              </h4>
              <p className="text-white/70 text-[11px] mt-1 line-clamp-2 leading-relaxed">
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOX 6: KHÁM PHÁ DANH SÁCH BÀI HÁT (Interactive Catalog Explorer)          */}
      {/* Thay vì đổ ra 150 bài làm loãng trang, giờ có ô tìm kiếm và thu gọn/mở rộng */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/40 backdrop-blur-xl p-5 sm:p-6 shadow-xl anim-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10">
          <div>
            <p className="font-manrope text-[10px] tracking-[0.1em] text-purple-400 uppercase font-bold flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
              DANH MỤC CA KHÚC
            </p>
            <h3 className="font-display font-bold text-white text-lg sm:text-xl">
              {active.label === "TẤT CẢ" ? "Tất cả bài hát" : `Giai điệu: ${active.label}`} ({tracks.length} ca khúc)
            </h3>
          </div>

          {/* Quick in-section search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Tìm trong danh mục..."
              className="w-full pl-9 pr-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white placeholder-white/40 text-xs focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
            />
          </div>
        </div>

        {/* Clean track table */}
        <div className="flex flex-col gap-1.5">
          {(() => {
            const filtered = catalogSearch.trim()
              ? tracks.filter(
                  (t) =>
                    t.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                    t.artist.toLowerCase().includes(catalogSearch.toLowerCase())
                )
              : tracks;

            const displayList = isCatalogExpanded || catalogSearch.trim() ? filtered : filtered.slice(0, 10);

            if (displayList.length === 0) {
              return (
                <div className="text-center py-10 text-white/40 text-xs">
                  Không tìm thấy bài hát nào khớp với từ khóa "{catalogSearch}".
                </div>
              );
            }

            return (
              <>
                {displayList.map((track, idx) => (
                  <TrackRow
                    key={`cat-${track.spotifyId || idx}`}
                    track={track}
                    index={idx}
                    vipTheme={activeVipTheme}
                    active={
                      currentTrack?.spotifyId
                        ? currentTrack.spotifyId === track.spotifyId
                        : idx === activeTrackIdx
                    }
                    playing={Boolean(currentTrack?.spotifyId === track.spotifyId && isPlaying)}
                    onClick={() => handlePlayTrack(track, idx)}
                    onMouseEnter={() => setHoveredTrackIdx(idx)}
                    onMouseLeave={() => setHoveredTrackIdx(null)}
                  />
                ))}

                {!catalogSearch.trim() && filtered.length > 10 && (
                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={() => setIsCatalogExpanded(!isCatalogExpanded)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold hover:border-purple-400/40 transition-all cursor-pointer"
                    >
                      {isCatalogExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 text-purple-400" />
                          <span>Thu gọn danh sách</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 text-purple-400" />
                          <span>Xem thêm {filtered.length - 10} bài hát còn lại</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Album Detail Modal */}
      <AlbumDetailModal
        albumId={selectedAlbumId}
        isOpen={isAlbumModalOpen}
        onClose={() => {
          setIsAlbumModalOpen(false);
          setSelectedAlbumId(null);
        }}
      />
    </div>
  );
}

export default function LumenHero() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-white/60">
          Đang tải...
        </div>
      }
    >
      <LumenHeroContent />
    </Suspense>
  );
}
