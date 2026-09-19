"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Play,
  Mic2,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { fetchTracks, type Track as ApiTrack } from "@/lib/api-client";
import { usePlayer } from "@/components/dashboard/player-context";
import RealtimeLyrics from "./realtime-lyrics";
import TrackActionMenu, { TrackInlineActions } from "./track-action-menu";

// Map UI vibe ids → real genre strings stored in MongoDB
// 147 Vietnamese tracks catalog
const VIBE_TO_GENRES: Record<string, string[]> = {
  all:    ["v-pop", "vpop", "vietnamese", "pop", "indie", "hiphop", "edm"],
  pop:    ["v-pop", "vpop", "pop"],
  hiphop: ["hiphop", "hip-hop", "rap"],
  indie:  ["indie", "indie pop"],
  edm:    ["edm", "remix", "dance"],
};

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
  { id: "all",    label: "TẤT CẢ (147)", caption: "Toàn bộ 147 bài hát Việt Nam đặc sắc trên Moodify.", accent: "#A0B0FF", ring: "rgba(160,176,255,0.45)", bg: "linear-gradient(135deg,#1f1f3f 0%,#0d0d22 100%)" },
  { id: "pop",    label: "V-POP (58)",   caption: "Bản hit V-Pop, ballad ngọt ngào, giai điệu bắt tai.", accent: "#FFD978", ring: "rgba(255,213,120,0.45)", bg: "linear-gradient(135deg,#4a3210 0%,#1f1408 100%)" },
  { id: "hiphop", label: "HIP-HOP (47)", caption: "Underground flow, rap Việt đỉnh cao, beat chất lượng.", accent: "#FF8FBF", ring: "rgba(255,143,191,0.45)", bg: "linear-gradient(135deg,#4a1a30 0%,#1f0a17 100%)" },
  { id: "indie",  label: "INDIE (42)",   caption: "Acoustic mộc mạc, chill nhẹ nhàng, sâu lắng.",        accent: "#A8DBB2", ring: "rgba(168,219,178,0.45)", bg: "linear-gradient(135deg,#1e3a2a 0%,#0c1a13 100%)" },
  { id: "edm",    label: "REMIX/EDM (15)", caption: "Bản phối sôi động, vinahouse, drop bùng nổ.",     accent: "#AFDDFF", ring: "rgba(175,221,255,0.45)", bg: "linear-gradient(135deg,#2c2c52 0%,#16162e 100%)" },
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

function NavTab({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        active 
          ? "bg-white/10 text-white" 
          : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

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
  eyebrow?: string;
  title: string;
  seeAllHref?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        {eyebrow && (
          <p className="font-manrope text-[10px] tracking-[0.32em] text-[#AFDDFF]/80 mb-2">
            {eyebrow}
          </p>
        )}
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
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`w-full flex flex-col rounded-xl transition-all duration-300 ${
        isExpanded
          ? "bg-white/[0.04] border border-cyan-500/25 shadow-[0_8px_30px_rgba(0,0,0,0.6)] my-1"
          : "border border-transparent hover:bg-white/[0.03]"
      }`}
    >
      {/* Top Track Row */}
      <div
        onClick={onClick}
        className="group w-full grid grid-cols-[24px_44px_1fr_auto_32px] items-center gap-3 px-3 py-2 rounded-xl text-left cursor-pointer transition-colors"
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

        {/* Duration & Status */}
        <div className="flex items-center gap-2 text-right justify-end">
          {!track.raw?.localPath && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-manrope font-medium text-amber-300/80 bg-amber-400/10 border border-amber-400/20">
              Sắp ra mắt
            </span>
          )}
          <span className="font-manrope text-white/45 text-[12px] tracking-wide">
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
                ? "text-cyan-300 bg-cyan-500/25 rotate-180 scale-110 shadow-[0_0_12px_rgba(56,189,248,0.45)] border border-cyan-400/40"
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
          className="w-full px-2.5 pb-2.5 pt-1 animate-in fade-in slide-in-from-top-2 duration-200"
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
}: {
  track: Track;
  delay: number;
  onPlay?: () => void;
}) {
  return (
    <div
      onClick={onPlay}
      className="group cursor-pointer rounded-[12px] overflow-hidden border border-white/8 bg-white/[0.04] hover:bg-white/[0.08] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.5)] anim-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative w-full aspect-[16/10]" style={{ background: track.cover }}>
        <div className="absolute inset-x-3 bottom-3 opacity-90 group-hover:opacity-100 transition-opacity">
          <WaveformPreview active />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay?.();
          }}
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

/* ── Main component ───────────────────────────────────────────── */

function LumenHeroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vibeFromUrl = searchParams.get("vibe") || "all";

  const { playTrack, currentTrack, isPlaying, currentTime, duration, seek, togglePlay } = usePlayer();
  const [activeVibe, setActiveVibe] = useState<string>(vibeFromUrl);
  const [viewMode, setViewMode] = useState<"lyrics" | "hero">("hero");
  const [activeTrackIdx, setActiveTrackIdx] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);

  useEffect(() => {
    if (vibeFromUrl) {
      setActiveVibe(vibeFromUrl);
    }
  }, [vibeFromUrl]);

  const handleVibeChange = (id: string) => {
    setActiveVibe(id);
    router.push(`/dashboard?vibe=${id}`);
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
      {/* Middle Stage: Hero Banner or Real-Time Synced Lyrics */}
      <div className="flex flex-col gap-4">
        {/* If a track is active, provide quick tabs between Live Lyrics and Genre Overview */}
        {currentTrack && (
          <div className="flex items-center justify-between gap-3 anim-fade-up">
            <div className="flex items-center gap-2 p-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setViewMode("lyrics")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "lyrics"
                    ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 shadow-[0_0_15px_rgba(56,189,248,0.25)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Mic2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Lời bài hát trực tiếp</span>
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

            <p className="font-manrope text-[11px] tracking-[0.25em] text-[#AFDDFF]/70 hidden sm:block uppercase">
              {viewMode === "lyrics" ? "Spotify / SoundCloud Style Lyrics" : "Moodify Catalog"}
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
          <div className="flex flex-col gap-4 anim-fade-up" style={{ animationDelay: "400ms" }}>
            <p className="font-manrope text-[11px] tracking-[0.32em] text-[#AFDDFF]/80">
              TOP GENRE · {String(VIBES.indexOf(active) + 1).padStart(2, "0")}/05 · NOW PLAYING
            </p>
            <h1 className="font-graphik text-white font-normal leading-[1.05] text-[36px] sm:text-[48px] md:text-[58px]">
              Your world,
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #AFDDFF 0%, #d6e7ff 60%, #ffffff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
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
                  onClick={() => handleVibeChange(v.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Danh sách bài hát */}
      <div>
        <SectionHeader title="Danh sách bài hát" />
        {tracksLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Desktop (md+): 2 independent vertical columns so expanding a track only pushes down its own column */}
            <div className="hidden md:grid md:grid-cols-2 gap-x-3 gap-y-1 items-start max-h-[640px] overflow-y-auto pr-2 scrollbar-thin">
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
                      active={
                        currentTrack?.spotifyId
                          ? currentTrack.spotifyId === track.spotifyId
                          : originalIndex === activeTrackIdx
                      }
                      playing={
                        currentTrack?.spotifyId === track.spotifyId && isPlaying
                      }
                      onClick={() => handlePlayTrack(track, originalIndex)}
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
                      active={
                        currentTrack?.spotifyId
                          ? currentTrack.spotifyId === track.spotifyId
                          : originalIndex === activeTrackIdx
                      }
                      playing={
                        currentTrack?.spotifyId === track.spotifyId && isPlaying
                      }
                      onClick={() => handlePlayTrack(track, originalIndex)}
                    />
                  ))}
              </div>
            </div>

            {/* Mobile (<md): 1 single sequential column */}
            <div className="flex md:hidden flex-col gap-1 max-h-[640px] overflow-y-auto pr-2 scrollbar-thin">
              {tracks.map((t, i) => (
                <TrackRow
                  key={`${activeVibe}-${t.spotifyId || i}`}
                  track={t}
                  index={i}
                  active={
                    currentTrack?.spotifyId
                      ? currentTrack.spotifyId === t.spotifyId
                      : i === activeTrackIdx
                  }
                  playing={currentTrack?.spotifyId === t.spotifyId && isPlaying}
                  onClick={() => handlePlayTrack(t, i)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Editor picks */}
      <div>
        <SectionHeader eyebrow="✦ CURATED" title="Editor picks" />
        {editorPicks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {editorPicks.map((t, i) => (
              <EditorPickCard
                key={t.title}
                track={t}
                delay={1000 + i * 80}
                onPlay={() => handlePlayTrack(t)}
              />
            ))}
          </div>
        ) : (
          <div className="text-white/40 text-sm py-4">No curated picks yet.</div>
        )}
      </div>

      {/* Hottest in genre */}
      <div>
        <SectionHeader eyebrow="TRENDING IN" title={`${active.label}`} />
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
