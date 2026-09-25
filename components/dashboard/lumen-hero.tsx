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
} from "lucide-react";
import { fetchTracks, type Track as ApiTrack } from "@/lib/api-client";
import { usePlayer } from "@/components/dashboard/player-context";
import { useVipTheme, type ThemeOption } from "@/lib/theme";
import RealtimeLyrics from "./realtime-lyrics";
import TrackActionMenu, { TrackInlineActions } from "./track-action-menu";

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
  seeAllHref = "#",
}: {
  eyebrow?: string;
  title: string;
  seeAllHref?: string;
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
      </div>
      <a
        href={seeAllHref}
        className="font-manrope text-[11px] tracking-[0.06em] text-white/45 hover:text-purple-300 transition-colors uppercase font-medium"
      >
        Xem tất cả
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
          ? "bg-slate-950/80 border border-purple-500/40 shadow-[0_12px_36px_rgba(0,0,0,0.7)] my-1.5 backdrop-blur-xl"
          : active
          ? "bg-gradient-to-r from-purple-500/20 via-indigo-500/10 to-transparent border border-purple-500/30 shadow-[0_4px_24px_rgba(168,85,247,0.15)]"
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
              active ? "text-purple-300 font-bold" : "text-white/40 group-hover:opacity-0"
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
                ? "font-bold text-purple-200"
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
          {!track.raw?.localPath && (
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
}: {
  vibe: Vibe;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
      style={{
        background: active ? `${vibe.accent}25` : "rgba(255,255,255,0.04)",
        borderColor: active ? vibe.accent : "rgba(255,255,255,0.12)",
        boxShadow: active ? `0 0 16px ${vibe.ring}, inset 0 0 10px ${vibe.accent}20` : "none",
      }}
    >
      <span
        className="inline-block w-[7px] h-[7px] rounded-full"
        style={{ background: vibe.accent, boxShadow: `0 0 8px ${vibe.ring}` }}
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
      const aHas = Boolean(a.localPath);
      const bHas = Boolean(b.localPath);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return 0;
    });

    return sorted.map((t) => ({
      title: t.name,
      artist: t.artistName,
      duration: formatDuration(t.durationMs),
      spotifyId: t.spotifyId,
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

  const handlePlayTrack = (t: Track, index?: number) => {
    if (!t.raw?.localPath) {
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
          spotifyId: t.raw.spotifyId,
          name: t.raw.name,
          artistName: t.raw.artistName,
          albumName: t.raw.albumName,
          imageUrl: t.raw.imageUrl,
          durationMs: t.raw.durationMs,
          lyricsPlain: t.raw.lyricsPlain,
          lyricsSynced: t.raw.lyricsSynced,
        },
        tracks
          .filter((x) => x.raw && x.raw.localPath)
          .map((x) => ({
            spotifyId: x.raw!.spotifyId,
            name: x.raw!.name,
            artistName: x.raw!.artistName,
            albumName: x.raw!.albumName,
            imageUrl: x.raw!.imageUrl,
            durationMs: x.raw!.durationMs,
            lyricsPlain: x.raw!.lyricsPlain,
            lyricsSynced: x.raw!.lyricsSynced,
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
    <div className="flex flex-col gap-10 min-w-0">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

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
                />
              ))}
            </div>
          </div>
        ) : (
          <div
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
                          activeSelectedTrack?.raw?.localPath
                            ? activeSelectedTrack
                            : tracks.find((t) => t.raw?.localPath) || activeSelectedTrack || tracks[0];
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
                      const playableTracks = tracks.filter((t) => t.raw?.localPath);
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
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-4 border-t border-white/10">
                  {VIBES.map((v) => (
                    <MoodChip
                      key={v.id}
                      vibe={v}
                      active={v.id === activeVibe}
                      onClick={() => handleVibeChange(v.id)}
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

      {/* Danh sách bài hát */}
      <div>
        <SectionHeader eyebrow="DANH SÁCH BÀI HÁT" title="Tất cả bài hát" />
        {tracksLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Desktop (md+): 2 independent vertical columns so expanding a track only pushes down its own column */}
            <div className="hidden md:grid md:grid-cols-2 gap-x-3 gap-y-1 items-start max-h-[640px] overflow-y-auto pr-2 moodify-scroll">
              {/* Left Column: 01, 03, 05, 07... */}
              <div className="flex flex-col gap-1 min-w-0">
                {tracks
                  .map((t, i) => ({ track: t, originalIndex: i }))
                  .filter((_, i) => i % 2 === 0)
                  .map(({ track, originalIndex }) => (
                    <TrackRow
                      key={`${activeVibe}-${track.spotifyId || originalIndex}`}
                      track={track}
                      index={originalIndex}
                      vipTheme={activeVipTheme}
                      active={
                        currentTrack?.spotifyId
                          ? currentTrack.spotifyId === track.spotifyId
                          : originalIndex === activeTrackIdx
                      }
                      playing={
                        currentTrack?.spotifyId === track.spotifyId && isPlaying
                      }
                      onClick={() => handlePlayTrack(track, originalIndex)}
                      onMouseEnter={() => setHoveredTrackIdx(originalIndex)}
                      onMouseLeave={() => setHoveredTrackIdx(null)}
                    />
                  ))}
              </div>

              {/* Right Column: 02, 04, 06, 08... */}
              <div className="flex flex-col gap-1 min-w-0">
                {tracks
                  .map((t, i) => ({ track: t, originalIndex: i }))
                  .filter((_, i) => i % 2 !== 0)
                  .map(({ track, originalIndex }) => (
                    <TrackRow
                      key={`${activeVibe}-${track.spotifyId || originalIndex}`}
                      track={track}
                      index={originalIndex}
                      vipTheme={activeVipTheme}
                      active={
                        currentTrack?.spotifyId
                          ? currentTrack.spotifyId === track.spotifyId
                          : originalIndex === activeTrackIdx
                      }
                      playing={
                        currentTrack?.spotifyId === track.spotifyId && isPlaying
                      }
                      onClick={() => handlePlayTrack(track, originalIndex)}
                      onMouseEnter={() => setHoveredTrackIdx(originalIndex)}
                      onMouseLeave={() => setHoveredTrackIdx(null)}
                    />
                  ))}
              </div>
            </div>

            {/* Mobile (<md): 1 single sequential column */}
            <div className="flex md:hidden flex-col gap-1 max-h-[640px] overflow-y-auto pr-2 moodify-scroll">
              {tracks.map((t, i) => (
                <TrackRow
                  key={`${activeVibe}-${t.spotifyId || i}`}
                  track={t}
                  index={i}
                  vipTheme={activeVipTheme}
                  active={
                    currentTrack?.spotifyId
                      ? currentTrack.spotifyId === t.spotifyId
                      : i === activeTrackIdx
                  }
                  playing={currentTrack?.spotifyId === t.spotifyId && isPlaying}
                  onClick={() => handlePlayTrack(t, i)}
                  onMouseEnter={() => setHoveredTrackIdx(i)}
                  onMouseLeave={() => setHoveredTrackIdx(null)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Editor picks */}
      <div>
        <SectionHeader eyebrow="TUYỂN CHỌN ĐẶC BIỆT" title="Editor's Picks" />
        {editorPicks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {editorPicks.map((t, i) => (
              <EditorPickCard
                key={t.title}
                track={t}
                delay={1000 + i * 80}
                vipTheme={activeVipTheme}
                onPlay={() => handlePlayTrack(t)}
              />
            ))}
          </div>
        ) : (
          <div className="text-white/40 text-sm py-4">Chưa có bài hát tuyển chọn nào.</div>
        )}
      </div>

      {/* Hottest in genre */}
      <div>
        <SectionHeader eyebrow="XU HƯỚNG NỔI BẬT" title={`Thịnh hành trong ${active.label}`} />
        <div className="hidden md:grid md:grid-cols-2 gap-x-3 gap-y-1 items-start">
          <div className="flex flex-col gap-1 min-w-0">
            {[...tracks]
              .slice(0, 4)
              .map((t, i) => ({ track: t, originalIndex: i }))
              .filter((_, i) => i % 2 === 0)
              .map(({ track, originalIndex }) => (
                <TrackRow
                  key={`more-${activeVibe}-${track.spotifyId || originalIndex}`}
                  track={track}
                  index={originalIndex}
                  active={currentTrack?.spotifyId === track.spotifyId}
                  playing={currentTrack?.spotifyId === track.spotifyId && isPlaying}
                  onClick={() => handlePlayTrack(track)}
                />
              ))}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            {[...tracks]
              .slice(0, 4)
              .map((t, i) => ({ track: t, originalIndex: i }))
              .filter((_, i) => i % 2 !== 0)
              .map(({ track, originalIndex }) => (
                <TrackRow
                  key={`more-${activeVibe}-${track.spotifyId || originalIndex}`}
                  track={track}
                  index={originalIndex}
                  active={currentTrack?.spotifyId === track.spotifyId}
                  playing={currentTrack?.spotifyId === track.spotifyId && isPlaying}
                  onClick={() => handlePlayTrack(track)}
                />
              ))}
          </div>
        </div>
        <div className="flex md:hidden flex-col gap-1">
          {[...tracks].slice(0, 4).map((t, i) => (
            <TrackRow
              key={`more-${activeVibe}-${t.spotifyId || i}`}
              track={t}
              index={i}
              active={currentTrack?.spotifyId === t.spotifyId}
              playing={currentTrack?.spotifyId === t.spotifyId && isPlaying}
              onClick={() => handlePlayTrack(t)}
            />
          ))}
        </div>
      </div>
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
