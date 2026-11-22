"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Play,
  ListMusic,
  Music2,
  Loader2,
  RefreshCw,
  X,
  MoreVertical,
  EyeOff,
  UserPlus,
  UserCheck,
  Sparkles,
  Flame,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { usePlayerState } from "./player-context";
import {
  createRecommendationQueue,
  fetchRecommendationHome,
  queuePlayerTracks,
  recommendationFeedback,
  recordRecommendationEvent,
  rememberRecommendation,
  fetchFollowedArtists,
  artistRecommendationFeedback,
  RecommendationError,
  recommendationExpiresSoon,
  type RecommendationHome,
  type RecommendationItem,
} from "@/lib/recommendation-client";

const GENRE_FILTERS = [
  { id: "ALL", label: "Tất cả" },
  { id: "V-Pop", label: "V-Pop" },
  { id: "Indie", label: "Indie & Ballad" },
  { id: "Chill", label: "Thư giãn" },
  { id: "Energy", label: "Năng lượng" },
  { id: "R&B", label: "R&B / Soul" },
];

// Atmospheric gradients for personalized mixes
const MIX_GRADIENTS: Record<string, string> = {
  DAILY_MIX: "from-indigo-950 via-slate-900 to-[#080a10]",
  WEEKLY_DISCOVERY: "from-sky-950 via-slate-900 to-[#080a10]",
  TREND_FOR_YOU: "from-purple-950 via-slate-900 to-[#080a10]",
  CHILL_MIX: "from-teal-950 via-slate-900 to-[#080a10]",
  ENERGY_MIX: "from-rose-950 via-slate-900 to-[#080a10]",
  DEFAULT: "from-purple-950/80 via-slate-900 to-[#080a10]",
};

function getMixGradient(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("daily") || lower.includes("hàng ngày")) return MIX_GRADIENTS.DAILY_MIX;
  if (lower.includes("discover") || lower.includes("khám phá")) return MIX_GRADIENTS.WEEKLY_DISCOVERY;
  if (lower.includes("chill") || lower.includes("thư giãn")) return MIX_GRADIENTS.CHILL_MIX;
  if (lower.includes("energy") || lower.includes("năng lượng")) return MIX_GRADIENTS.ENERGY_MIX;
  if (lower.includes("trend") || lower.includes("thịnh hành")) return MIX_GRADIENTS.TREND_FOR_YOU;
  return MIX_GRADIENTS.DEFAULT;
}

/**
 * Personalized Mix Card (Mixtape Style)
 */
function PersonalizedMixCard({
  item,
  onPlay,
  onOpen,
  onHide,
  busy,
}: {
  item: RecommendationItem;
  onPlay: () => void;
  onOpen: () => void;
  onHide: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const recorded = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || recorded.current) return;
    let visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (timer) clearTimeout(timer);
      if (visible && document.visibilityState === "visible" && !recorded.current) {
        timer = setTimeout(() => {
          recorded.current = true;
          recordRecommendationEvent(item, "IMPRESSION");
        }, 1000);
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        update();
      },
      { threshold: [0, 0.5] }
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [item]);

  const gradient = getMixGradient(item.title);

  return (
    <article
      ref={ref}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4.5 border border-white/[0.08] hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-black/60`}
    >
      {/* Top row: Hide button */}
      <div className="flex items-center justify-end gap-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onHide();
          }}
          aria-label={`Ẩn ${item.title}`}
          className="rounded-full bg-black/40 backdrop-blur-md p-1.5 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          title={`Ẩn ${item.title}`}
        >
          <X size={13} />
        </button>
      </div>

      {/* Middle artwork & Vinyl record graphic */}
      <div className="relative my-4 aspect-square w-full overflow-hidden rounded-xl bg-black/40 shadow-inner flex items-center justify-center">
        <button
          onClick={onOpen}
          className="relative h-full w-full overflow-hidden rounded-xl"
          aria-label={`Mở ${item.title}`}
        >
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt=""
              width={320}
              height={320}
              unoptimized
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-tr from-white/[0.04] to-transparent p-4 text-center">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 shadow-2xl">
                <div className="h-10 w-10 rounded-full border border-white/40 bg-purple-500/20" />
                <div className="absolute h-4 w-4 rounded-full bg-white" />
              </div>
            </div>
          )}
        </button>

        {/* Floating Play button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          disabled={busy}
          aria-label={`Phát ${item.title}`}
          className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500 text-black shadow-xl shadow-black/80 transition-all duration-300 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 disabled:opacity-60 z-20"
        >
          {busy ? <Loader2 size={20} className="animate-spin text-white" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>
      </div>

      {/* Bottom text info */}
      <div className="space-y-1 z-10">
        <button
          onClick={onOpen}
          className="block w-full truncate text-left text-base font-bold text-white hover:text-purple-200 transition-colors"
          title={item.title}
        >
          {item.title}
        </button>
        <p className="line-clamp-2 text-xs text-white/55 leading-relaxed" title={item.subtitle || item.reason}>
          {item.subtitle || item.reason}
        </p>
        <div className="pt-2 flex items-center justify-between text-[11px] text-white/40">
          <span>{item.trackCount} bài hát</span>
          <span className="text-purple-300/80 hover:underline cursor-pointer" onClick={onOpen}>
            Nghe ngay &rarr;
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * Standard Recommendation Card (Tracks & Playlists)
 */
function RecommendationCard({
  item,
  onPlay,
  onOpen,
  onHide,
  onNotInterested,
  onArtist,
  followed,
  busy,
  activeMenu,
  onToggleMenu,
}: {
  item: RecommendationItem;
  onPlay: () => void;
  onOpen: () => void;
  onHide: () => void;
  onNotInterested: () => void;
  onArtist: (id: string, action: "FOLLOW" | "HIDE", enabled: boolean) => void;
  followed: Set<string>;
  busy: boolean;
  activeMenu: boolean;
  onToggleMenu: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const recorded = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || recorded.current) return;
    let visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (timer) clearTimeout(timer);
      if (visible && document.visibilityState === "visible" && !recorded.current) {
        timer = setTimeout(() => {
          recorded.current = true;
          recordRecommendationEvent(item, "IMPRESSION");
        }, 1000);
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        update();
      },
      { threshold: [0, 0.5] }
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [item]);

  const artistId = item.track?.artistIds?.[0] || item.track?.artistSpotifyId;
  const isFollowed = artistId ? followed.has(artistId) : false;

  return (
    <article
      ref={ref}
      className="group relative flex flex-col rounded-2xl bg-white/[0.025] hover:bg-white/[0.055] p-3 border border-white/[0.04] hover:border-white/10 transition-all duration-300"
    >
      {/* Artwork container */}
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-white/5">
        <button onClick={onOpen} className="h-full w-full" aria-label={`Mở ${item.title}`}>
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt=""
              width={320}
              height={320}
              unoptimized
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-purple-300/40">
              {item.entityType === "TRACK" ? <Music2 size={40} /> : <ListMusic size={40} />}
            </span>
          )}
        </button>

        {/* Quick Hide button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onHide();
          }}
          aria-label={`Ẩn ${item.title}`}
          className="absolute right-2 top-2 rounded-full bg-black/60 backdrop-blur-md p-1.5 text-white/50 hover:text-white transition-opacity opacity-0 group-hover:opacity-100"
          title={`Ẩn ${item.title}`}
        >
          <X size={13} />
        </button>

        {/* Hover Play Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          disabled={busy}
          aria-label={`Phát ${item.title}`}
          className="absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-purple-500 text-black shadow-xl shadow-black/70 transition-all duration-300 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          {busy ? <Loader2 size={18} className="animate-spin text-white" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>
      </div>

      {/* Title & Subtitle */}
      <div className="min-w-0 flex-1">
        <button
          onClick={onOpen}
          className="block w-full truncate text-left text-sm font-semibold text-white hover:text-purple-200 transition-colors"
          title={item.title}
        >
          {item.title}
        </button>
        <p className="mt-0.5 truncate text-xs text-white/50">
          {item.entityType === "TRACK" ? item.subtitle : `${item.trackCount} bài hát`}
        </p>

        {/* Editorial Reason Pill */}
        <div
          className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/55 border border-white/[0.04]"
          title={item.reason}
        >
          <Sparkles size={10} className="shrink-0 text-purple-300/80" />
          <span className="truncate">{item.reason}</span>
        </div>
      </div>

      {/* Card Action Footer with Clean More Menu */}
      <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.04] pt-2 text-xs">
        <button
          onClick={onOpen}
          className="text-[11px] font-medium text-white/40 hover:text-purple-300 transition-colors"
        >
          {item.entityType === "TRACK" ? "Nghe bài" : "Xem playlist"}
        </button>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            disabled={busy}
            aria-label={`Tùy chọn cho ${item.title}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <MoreVertical size={14} />
          </button>

          {/* Context Dropdown Menu */}
          {activeMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 bottom-full mb-2 w-48 rounded-xl bg-slate-900/95 border border-white/10 p-1.5 shadow-2xl backdrop-blur-xl z-30 anim-scale-up"
            >
              {item.entityType === "TRACK" && (
                <button
                  disabled={busy}
                  onClick={() => {
                    onNotInterested();
                    onToggleMenu();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <EyeOff size={13} className="text-white/50" />
                  <span>Không quan tâm</span>
                </button>
              )}

              {artistId && (
                <>
                  <button
                    disabled={busy}
                    onClick={() => {
                      onArtist(artistId, "FOLLOW", !isFollowed);
                      onToggleMenu();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {isFollowed ? (
                      <>
                        <UserCheck size={13} className="text-purple-300" />
                        <span>Bỏ theo dõi nghệ sĩ</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={13} className="text-white/50" />
                        <span>Theo dõi nghệ sĩ</span>
                      </>
                    )}
                  </button>

                  <button
                    disabled={busy}
                    onClick={() => {
                      onArtist(artistId, "HIDE", true);
                      onToggleMenu();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-red-400/90 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  >
                    <X size={13} className="text-red-400" />
                    <span>Ẩn nghệ sĩ này</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function RecommendationSections() {
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [home, setHome] = useState<RecommendationHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [lastHidden, setLastHidden] = useState<{
    item: RecommendationItem;
    feedbackType: "HIDE" | "NOT_INTERESTED";
  } | null>(null);
  const [activeGenre, setActiveGenre] = useState<string>("ALL");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const router = useRouter();
  const { playTrack } = usePlayerState();

  // Close open context menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const load = useCallback(
    async (genre?: string, signal?: AbortSignal) => {
      try {
        const result = await fetchRecommendationHome(genre || activeGenre, signal);
        if (!signal?.aborted) setHome(result);
      } catch (failure) {
        if (!signal?.aborted) {
          setError(failure instanceof Error ? failure.message : "Chưa thể tải gợi ý.");
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [activeGenre]
  );

  const handleGenreChange = (genreId: string) => {
    setActiveGenre(genreId);
    setLoading(true);
    setError(null);
    void load(genreId);
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.visibilityState === "visible") void load();
      }, 400);
    };
    window.addEventListener("moodify:recommendation-changed", refresh);
    window.addEventListener("moodify-artist-followed", refresh);
    window.addEventListener("moodify-library-updated", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("moodify:recommendation-changed", refresh);
      window.removeEventListener("moodify-artist-followed", refresh);
      window.removeEventListener("moodify-library-updated", refresh);
    };
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchFollowedArtists()
      .then((ids) => {
        if (!controller.signal.aborted) setFollowed(new Set(ids));
      })
      .catch(() => {});

    fetchRecommendationHome(activeGenre, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setHome(result);
          setLoading(false);
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : "Chưa thể tải gợi ý.");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [activeGenre]);

  const play = async (item: RecommendationItem) => {
    setBusy(item.itemId);
    setError(null);
    try {
      let current = item;
      const refresh = async () => {
        const fresh = await fetchRecommendationHome(activeGenre);
        setHome(fresh);
        const replacement = fresh.sections
          .flatMap((section) => section.items)
          .find((candidate) => candidate.entityType === item.entityType && candidate.entityId === item.entityId);
        if (!replacement) throw new Error("Nội dung đã thay đổi. Hãy chọn một gợi ý mới.");
        return replacement;
      };
      if (!home || recommendationExpiresSoon(home.expiresAt)) current = await refresh();
      let queue;
      try {
        queue = await createRecommendationQueue(current);
      } catch (failure) {
        if (!(failure instanceof RecommendationError) || failure.code !== "RECOMMENDATION_TOKEN_EXPIRED") throw failure;
        queue = await createRecommendationQueue(await refresh());
      }
      const tracks = queuePlayerTracks(queue);
      if (tracks.length === 0) throw new Error("Chưa có bài đủ điều kiện để phát trong danh sách này.");
      playTrack(tracks[0], tracks);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Chưa thể phát nội dung.");
    } finally {
      setBusy(null);
    }
  };

  const open = (item: RecommendationItem) => {
    recordRecommendationEvent(item, "OPEN");
    if (item.entityType === "TRACK") {
      void play(item);
      return;
    }
    rememberRecommendation(item);
    router.push(`/dashboard/recommendations/${encodeURIComponent(item.entityId)}?type=${item.entityType}&item=${item.itemId}`);
  };

  const hide = async (item: RecommendationItem, feedbackType: "HIDE" | "NOT_INTERESTED" = "HIDE") => {
    try {
      await recommendationFeedback(item, true, feedbackType);
      setHidden((prior) => new Set([...prior, `${item.entityType}:${item.entityId}`]));
      setLastHidden({ item, feedbackType });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Chưa thể lưu lựa chọn.");
    }
  };

  const artist = async (id: string, action: "FOLLOW" | "HIDE", enabled: boolean) => {
    try {
      await artistRecommendationFeedback(id, action, enabled);
      setFollowed(new Set(await fetchFollowedArtists()));
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Chưa thể lưu sở thích nghệ sĩ.");
    }
  };

  const undo = async () => {
    if (!lastHidden) return;
    try {
      await recommendationFeedback(lastHidden.item, false, lastHidden.feedbackType);
      setHidden((prior) => {
        const next = new Set(prior);
        next.delete(`${lastHidden.item.entityType}:${lastHidden.item.entityId}`);
        return next;
      });
      setLastHidden(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Chưa thể hoàn tác.");
    }
  };

  return (
    <div className="flex flex-col gap-10" aria-label="Gợi ý cá nhân">
      {/* Vibe / Mood Quick Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-purple-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Gu nghe hôm nay</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {GENRE_FILTERS.map((filter) => {
            const active = activeGenre === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => handleGenreChange(filter.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-white text-black shadow-md font-semibold"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.06]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-200 backdrop-blur-md"
        >
          <span>{error}</span>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              void load();
            }}
            className="flex items-center gap-2 font-medium text-white hover:underline cursor-pointer"
          >
            <RefreshCw size={14} />
            Thử lại
          </button>
        </div>
      )}

      {/* Undo Notification Banner */}
      {lastHidden && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/90 border border-white/10 px-4 py-3 text-xs text-white/80 shadow-2xl backdrop-blur-md anim-fade-up"
        >
          <span className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Đã ẩn <strong className="text-white">{lastHidden.item.title}</strong> khỏi danh sách đề xuất.
          </span>
          <button
            onClick={() => void undo()}
            className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1 font-semibold text-white transition-colors cursor-pointer"
          >
            Hoàn tác
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !home && (
        <div className="space-y-6" aria-label="Đang tải gợi ý">
          <div className="h-6 w-48 rounded bg-white/5 animate-pulse" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04] p-3 border border-white/[0.04]" />
            ))}
          </div>
        </div>
      )}

      {/* Render Sections */}
      {home?.sections
        .toSorted(
          (a, b) =>
            ["personal_mixes", "for_you", "playlists_for_you", "trending", "campaigns"].indexOf(a.id) -
            ["personal_mixes", "for_you", "playlists_for_you", "trending", "campaigns"].indexOf(b.id)
        )
        .map((section) => {
          const items = section.items.filter((item) => !hidden.has(`${item.entityType}:${item.entityId}`));
          if (!items.length) return null;

          const isPersonalMixes = section.id === "personal_mixes";

          return (
            <section key={section.id} aria-labelledby={`rec-${section.id}`} className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {section.id === "trending" && <Flame size={18} className="text-orange-400" />}
                    {section.id === "personal_mixes" && <Radio size={18} className="text-purple-400" />}
                    <h2
                      id={`rec-${section.id}`}
                      className="font-display text-xl font-bold tracking-tight text-white md:text-2xl"
                    >
                      {section.title}
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-white/45">{section.description}</p>
                </div>
              </div>

              {/* Differentiated Grid layout */}
              {isPersonalMixes ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {items.map((item) => (
                    <PersonalizedMixCard
                      key={item.itemId}
                      item={item}
                      busy={busy === item.itemId}
                      onPlay={() => void play(item)}
                      onOpen={() => open(item)}
                      onHide={() => void hide(item)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
                  {items.map((item) => (
                    <RecommendationCard
                      key={item.itemId}
                      item={item}
                      followed={followed}
                      onArtist={(id, action, enabled) => void artist(id, action, enabled)}
                      busy={busy === item.itemId}
                      onPlay={() => void play(item)}
                      onOpen={() => open(item)}
                      onHide={() => void hide(item)}
                      onNotInterested={() => void hide(item, "NOT_INTERESTED")}
                      activeMenu={activeMenuId === item.itemId}
                      onToggleMenu={() => setActiveMenuId((prev) => (prev === item.itemId ? null : item.itemId))}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

      {/* Empty State */}
      {home && !home.sections.some((section) => section.items.length) && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/50">
            {home.availabilityStatus === "NO_ELIGIBLE_CATALOG"
              ? "Đề xuất đang chờ kho nhạc đủ quyền phát hành."
              : "Chưa có nội dung phù hợp với bộ lọc hiện tại. Hãy chọn thể loại khác hoặc nghe thêm bài để cập nhật gu của bạn."}
          </p>
        </div>
      )}
    </div>
  );
}
