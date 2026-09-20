"use client";

import { useState, useEffect, useCallback } from "react";
import { Search as SearchIcon, X, Music, Sparkles } from "lucide-react";
import {
  fetchTracks,
  fetchArtists,
  addToLibrary,
  removeFromLibrary,
  fetchLikedTrackIds,
  type Track,
  type Artist,
} from "@/lib/api-client";
import TrackCard from "@/components/dashboard/track-card";
import ArtistCard from "@/components/dashboard/artist-card";
import { usePlayer } from "@/components/dashboard/player-context";
import { useRouter } from "next/navigation";

type Tab = "tracks" | "artists";

const GENRE_FILTERS = [
  { id: "all", label: "Tất cả (147)" },
  { id: "v-pop", label: "V-Pop (58)" },
  { id: "hiphop", label: "Hip-Hop (47)" },
  { id: "indie", label: "Indie (42)" },
  { id: "edm", label: "Remix/EDM (15)" },
];

export default function SearchPage() {
  const router = useRouter();
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  const [activeTab, setActiveTab] = useState<Tab>("tracks");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [totalFound, setTotalFound] = useState<number | null>(null);

  // Perform search or catalog fetch
  const loadData = useCallback(
    async (searchQuery: string, genre: string) => {
      setLoading(true);
      try {
        if (activeTab === "tracks") {
          let response;
          if (searchQuery.trim()) {
            response = await fetchTracks({ query: searchQuery.trim(), size: 100 });
          } else if (genre !== "all") {
            response = await fetchTracks({ genre, size: 100 });
          } else {
            response = await fetchTracks({ size: 200 });
          }

          setTracks(response.content);
          setTotalFound(response.totalElements);

          // Fast single query for all liked track IDs
          const likedIds = await fetchLikedTrackIds().catch(() => []);
          setLikedTracks(new Set(likedIds));
        } else {
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
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      loadData(query, selectedGenre);
    }, query ? 350 : 0);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [query, selectedGenre, loadData]);

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

          {/* Search bar */}
          <div className="relative max-w-2xl">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên bài hát, nghệ sĩ (Vô Tình, Ngọt, HIEUTHUHAI, v.v.)..."
              className="w-full pl-12 pr-12 py-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm md:text-base shadow-lg"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Genre quick filters */}
          {activeTab === "tracks" && (
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-none">
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
