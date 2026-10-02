"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Music, Sparkles, AudioLines, HeartPulse } from "lucide-react";
import {
  fetchTracks,
  fetchArtists,
  fetchMoodRecommendation,
  addToLibrary,
  removeFromLibrary,
  fetchLikedTrackIds,
  type Track,
  type Artist,
  type EmotionInfo,
} from "@/lib/api-client";
import TrackCard from "@/components/dashboard/track-card";
import ArtistCard from "@/components/dashboard/artist-card";
import { usePlayer } from "@/components/dashboard/player-context";
import MoodSearchBar from "@/components/dashboard/mood-search-bar";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Tab = "tracks" | "artists";

const GENRE_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "v-pop", label: "V-Pop" },
  { id: "hiphop", label: "Hip-Hop" },
  { id: "indie", label: "Indie" },
  { id: "edm", label: "Remix/EDM" },
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") || "";
  const modeParam = searchParams.get("mode") || "";
  const { playTrack, currentTrack, isPlaying, isPremiumUser } = usePlayer();
  const isMoodMode = modeParam === "mood" && Boolean(isPremiumUser);

  const [activeTab, setActiveTab] = useState<Tab>("tracks");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [query, setQuery] = useState(qParam);
  const [prevQParam, setPrevQParam] = useState(qParam);

  if (prevQParam !== qParam) {
    setPrevQParam(qParam);
    setQuery(qParam);
  }

  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [moodInfo, setMoodInfo] = useState<EmotionInfo | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [totalFound, setTotalFound] = useState<number | null>(null);

  // Perform search or catalog fetch
  const loadData = useCallback(
    async (searchQuery: string, genre: string, isMood: boolean) => {
      setLoading(true);
      try {
        if (activeTab === "tracks") {
          let response;
          if (searchQuery.trim()) {
            if (isMood && isPremiumUser) {
              try {
                const moodRes = await fetchMoodRecommendation(searchQuery.trim(), "empathy", 50);
                setMoodInfo(moodRes.emotion);
                setTracks(moodRes.tracks || []);
                setTotalFound(moodRes.totalMatched ?? (moodRes.tracks ? moodRes.tracks.length : 0));
                const likedIds = await fetchLikedTrackIds().catch(() => []);
                setLikedTracks(new Set(likedIds));
                return;
              } catch (e) {
                console.warn("Mood recommendation API error, falling back to fetchTracks with mode=mood", e);
                response = await fetchTracks({ query: searchQuery.trim(), size: 100, mode: "mood" });
              }
            } else {
              setMoodInfo(null);
              response = await fetchTracks({ query: searchQuery.trim(), size: 100 });
            }
          } else if (genre !== "all") {
            setMoodInfo(null);
            response = await fetchTracks({ genre, size: 100 });
          } else {
            setMoodInfo(null);
            response = await fetchTracks({ size: 200 });
          }

          setTracks(response.content);
          setTotalFound(response.totalElements);

          // Fast single query for all liked track IDs
          const likedIds = await fetchLikedTrackIds().catch(() => []);
          setLikedTracks(new Set(likedIds));
        } else {
          setMoodInfo(null);
          const artistsData = await fetchArtists(searchQuery);
          setArtists(artistsData);
          setTotalFound(artistsData.length);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    },
    [activeTab]
  );

  // Debounced search when query changes
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      loadData(query, selectedGenre, isMoodMode);
    }, query ? 350 : 0);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, selectedGenre, isMoodMode, loadData]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleGenreChange = (genreId: string) => {
    setSelectedGenre(genreId);
    setQuery("");
  };

  const handleTrackLike = async (trackSpotifyId: string) => {
    const isLiked = likedTracks.has(trackSpotifyId);

    // Optimistic update
    setLikedTracks((prev) => {
      const newSet = new Set(prev);
      if (isLiked) {
        newSet.delete(trackSpotifyId);
      } else {
        newSet.add(trackSpotifyId);
      }
      return newSet;
    });

    try {
      if (isLiked) {
        await removeFromLibrary(trackSpotifyId);
      } else {
        await addToLibrary(trackSpotifyId);
      }

      window.dispatchEvent(
        new CustomEvent("moodify-library-updated", {
          detail: { trackSpotifyId, liked: !isLiked },
        })
      );
    } catch (error) {
      console.error("Failed to toggle like:", error);
      // Revert on error
      setLikedTracks((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(trackSpotifyId);
        } else {
          newSet.delete(trackSpotifyId);
        }
        return newSet;
      });
    }
  };

  // Sync liked tracks if toggled in other components
  useEffect(() => {
    const handleLibUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackSpotifyId: string; liked: boolean }>;
      if (customEvent.detail) {
        setLikedTracks((prev) => {
          const next = new Set(prev);
          if (customEvent.detail.liked) {
            next.add(customEvent.detail.trackSpotifyId);
          } else {
            next.delete(customEvent.detail.trackSpotifyId);
          }
          return next;
        });
      }
    };
    window.addEventListener("moodify-library-updated", handleLibUpdate);
    return () => {
      window.removeEventListener("moodify-library-updated", handleLibUpdate);
    };
  }, []);

  const handlePlayTrack = (track: Track) => {
    playTrack(
      {
        spotifyId: track.spotifyId,
        name: track.name,
        artistName: track.artistName,
        albumName: track.albumName,
        imageUrl: track.imageUrl,
        durationMs: track.durationMs,
        lyricsPlain: track.lyricsPlain,
        lyricsSynced: track.lyricsSynced,
      },
      tracks.map((t) => ({
        spotifyId: t.spotifyId,
        name: t.name,
        artistName: t.artistName,
        albumName: t.albumName,
        imageUrl: t.imageUrl,
        durationMs: t.durationMs,
        lyricsPlain: t.lyricsPlain,
        lyricsSynced: t.lyricsSynced,
      }))
    );
  };

  return (
    <div className="flex flex-col gap-6 min-w-0 anim-fade-up">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-cyan-400">
              Khám Phá & Tìm Kiếm
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-slate-100 tracking-[-0.025em] mb-6">
            Tìm kiếm bài hát
          </h1>

          {/* Transferred Header Search Bar with Mood Switch */}
          <MoodSearchBar
            size="lg"
            className="max-w-2xl"
            value={query}
            onChange={(val) => {
              setQuery(val);
              const params = new URLSearchParams(window.location.search);
              if (val.trim()) {
                params.set("q", val.trim());
              } else {
                params.delete("q");
              }
              const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
              window.history.replaceState(null, "", newUrl);
            }}
            isMoodMode={isMoodMode}
            onToggleMood={(next) => {
              if (!isPremiumUser) return;
              const params = new URLSearchParams(window.location.search);
              if (query.trim()) params.set("q", query.trim());
              if (next) {
                params.set("mode", "mood");
              } else {
                params.delete("mode");
              }
              router.push(`/dashboard/search?${params.toString()}`);
            }}
            onSubmit={(val, isMood) => {
              const params = new URLSearchParams();
              if (val.trim()) params.set("q", val.trim());
              if (isMood && isPremiumUser) params.set("mode", "mood");
              router.push(`/dashboard/search?${params.toString()}`);
            }}
            isPremium={Boolean(isPremiumUser)}
            autoFocus={!qParam}
          />

          {/* Active Mood Mode Banner (Only for VIP) */}
          {isMoodMode && isPremiumUser && (
            <div className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-xs text-purple-200 w-fit">
              <HeartPulse className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Chế độ: <strong>Tìm kiếm theo cảm xúc (VIP)</strong></span>
              <button
                type="button"
                onClick={() => {
                  router.push(`/dashboard/search?q=${encodeURIComponent(query)}`);
                }}
                className="ml-1 text-white/50 hover:text-white transition-colors cursor-pointer"
                title="Tắt chế độ cảm xúc"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* AI Emotion Analysis Card */}
          {isMoodMode && moodInfo && query.trim() && (
            <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-slate-900/40 border border-purple-500/30 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-400/30 shrink-0 text-purple-300 shadow-[0_0_14px_rgba(168,85,247,0.35)] flex items-center justify-center">
                  <AudioLines className="w-6 h-6 animate-pulse text-purple-300" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-purple-300">Tâm trạng nhận diện:</span>
                    <span className="text-sm font-bold text-white px-2 py-0.5 rounded-md bg-purple-500/30 border border-purple-400/30">
                      {moodInfo.label}
                    </span>
                    <span className="text-[11px] text-purple-300/80">
                      ({Math.round((moodInfo.confidence || 0) * 100)}% độ tin cậy)
                    </span>
                  </div>
                  {moodInfo.music_recommendation?.mood_analysis && (
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {moodInfo.music_recommendation.mood_analysis}
                    </p>
                  )}
                </div>
              </div>
              {moodInfo.music_recommendation?.seed_genres && moodInfo.music_recommendation.seed_genres.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <span className="text-[10px] uppercase text-purple-300/70 font-semibold mr-1">Gợi ý:</span>
                  {moodInfo.music_recommendation.seed_genres.slice(0, 4).map((g) => (
                    <span key={g} className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/10">
                      #{g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Genre quick filters */}
          {activeTab === "tracks" && (
            <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-2 scrollbar-none">
              {GENRE_FILTERS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleGenreChange(g.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedGenre === g.id && !query
                      ? "bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20"
                      : "bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => handleTabChange("tracks")}
              className={`px-4 py-3 text-sm font-medium transition-all relative ${
                activeTab === "tracks"
                  ? "text-cyan-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Bài hát ({tracks.length})
              {activeTab === "tracks" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
              )}
            </button>
            <button
              onClick={() => handleTabChange("artists")}
              className={`px-4 py-3 text-sm font-medium transition-all relative ${
                activeTab === "artists"
                  ? "text-cyan-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Nghệ sĩ
              {activeTab === "artists" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
              )}
            </button>
          </div>

          {totalFound !== null && (
            <span className="text-xs text-slate-400 hidden sm:block">
              {query
                ? `Tìm thấy ${totalFound} kết quả cho "${query}"`
                : `Hiển thị ${tracks.length} bài hát`}
            </span>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-slate-400">Đang tìm kiếm bài hát...</p>
          </div>
        ) : activeTab === "tracks" ? (
          tracks.length === 0 ? (
            <div className="text-center py-24">
              <Music className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium text-lg">Không tìm thấy bài hát</p>
              <p className="text-slate-500 text-sm mt-1">
                Thử tìm với từ khóa khác (ví dụ: &quot;Ngọt&quot;, &quot;Vô Tình&quot;, &quot;Pop&quot;)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {tracks.map((track) => (
                <TrackCard
                  key={track.spotifyId}
                  track={track}
                  isLiked={likedTracks.has(track.spotifyId)}
                  onLike={() => handleTrackLike(track.spotifyId)}
                  onPlay={() => handlePlayTrack(track)}
                />
              ))}
            </div>
          )
        ) : artists.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-slate-400">Không tìm thấy nghệ sĩ phù hợp</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {artists.map((artist) => (
              <ArtistCard
                key={artist.spotifyId}
                artist={artist}
                onClick={() => {
                  router.push(`/dashboard/artists/${artist.spotifyId}`);
                }}
              />
            ))}
          </div>
        )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-white/50">
          Đang tải trang tìm kiếm...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
