"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Music, Sparkles, AudioLines, HeartPulse, Disc, ListMusic } from "lucide-react";
import {
  fetchTracks,
  fetchArtists,
  fetchPublicAlbums,
  fetchPublicPlaylists,
  fetchPlaylistById,
  fetchAlbumDetail,
  toggleFavoriteAlbum,
  fetchMoodRecommendation,
  addToLibrary,
  removeFromLibrary,
  fetchLikedTrackIds,
  recordMySearchHistory,
  selectMySearchHistoryResult,
  type Track,
  type Artist,
  type Album,
  type Playlist,
  type EmotionInfo,
  type MoodCatalogDiagnostics,
  type SearchHistoryItem,
  type SearchHistoryType,
} from "@/lib/api-client";
import {
  onEmotionSearchSubmitted,
  queueEmotionSearchHistory,
  takePendingEmotionSearchHistory,
} from "@/lib/mood-search-history";
import TrackCard from "@/components/dashboard/track-card";
import ArtistCard from "@/components/dashboard/artist-card";
import AlbumCard from "@/components/dashboard/album-card";
import PlaylistCard from "@/components/dashboard/playlist-card";
import AlbumDetailModal from "@/components/dashboard/album-detail-modal";
import { usePlayer } from "@/components/dashboard/player-context";
import MoodSearchBar from "@/components/dashboard/mood-search-bar";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Tab = "tracks" | "artists" | "albums" | "playlists";

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
  const typeParam = searchParams.get("type") || "";
  const { playTrack, isPremiumUser } = usePlayer();
  const isMoodMode = modeParam === "mood" && Boolean(isPremiumUser);

  const [activeTab, setActiveTab] = useState<Tab>(typeParam === "ARTIST" ? "artists" : "tracks");
  const [prevTypeParam, setPrevTypeParam] = useState(typeParam);
  const currentTab: Tab = isMoodMode ? "tracks" : activeTab;
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [query, setQuery] = useState(qParam);
  const [prevQParam, setPrevQParam] = useState(qParam);

  if (prevQParam !== qParam) {
    setPrevQParam(qParam);
    setQuery(qParam);
  }

  if (prevTypeParam !== typeParam) {
    setPrevTypeParam(typeParam);
    setActiveTab(typeParam === "ARTIST" ? "artists" : "tracks");
  }

  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedAlbumIdForModal, setSelectedAlbumIdForModal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [moodInfo, setMoodInfo] = useState<EmotionInfo | null>(null);
  const [moodError, setMoodError] = useState<string | null>(null);
  const [historySaveError, setHistorySaveError] = useState<string | null>(null);
  const [moodMatchStatus, setMoodMatchStatus] = useState<string | null>(null);
  const [moodCandidateCount, setMoodCandidateCount] = useState(0);
  const [moodDistanceCutoff, setMoodDistanceCutoff] = useState<number | null>(null);
  const [moodCatalogDiagnostics, setMoodCatalogDiagnostics] = useState<MoodCatalogDiagnostics | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const historyRecordRef = useRef<{
    keyword: string;
    searchType: SearchHistoryType;
    promise: Promise<SearchHistoryItem>;
  } | null>(null);
  const [moodSubmissionVersion, setMoodSubmissionVersion] = useState(0);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [totalFound, setTotalFound] = useState<number | null>(null);

  const saveSearchHistory = useCallback((input: Parameters<typeof recordMySearchHistory>[0]) => {
    setHistorySaveError(null);
    const promise = recordMySearchHistory(input);
    historyRecordRef.current = { keyword: input.keyword, searchType: input.searchType, promise };
    void promise.catch((error) => {
      console.error("Failed to save search history:", error);
      if (input.searchType === "EMOTION") {
        setHistorySaveError("Đã tìm được nhạc nhưng chưa lưu được lịch sử. Vui lòng thử tìm lại.");
      }
    });
    return promise;
  }, []);

  useEffect(() => onEmotionSearchSubmitted(() => setMoodSubmissionVersion((version) => version + 1)), []);

  // Perform search or catalog fetch
  const loadData = useCallback(
    async (
      searchQuery: string,
      genre: string,
      isMood: boolean,
      signal: AbortSignal = new AbortController().signal
    ) => {
      setLoading(true);
      setMoodError(null);
      setHistorySaveError(null);
      setMoodCatalogDiagnostics(null);
      try {
        if (isMood && isPremiumUser && searchQuery.trim()) {
          setMoodInfo(null);
          setMoodMatchStatus(null);
          setMoodCandidateCount(0);
          setMoodDistanceCutoff(null);
          setMoodCatalogDiagnostics(null);
          const moodRes = await fetchMoodRecommendation(searchQuery.trim(), "empathy", 50, signal);
          if (signal.aborted) return;
          setMoodInfo(moodRes.emotion);
          setMoodMatchStatus(moodRes.matchStatus || null);
          setMoodCandidateCount(moodRes.candidateCount || 0);
          setMoodDistanceCutoff(moodRes.maxMatchDistance ?? null);
          setMoodCatalogDiagnostics(moodRes.catalogDiagnostics ?? null);
          setTracks(moodRes.tracks || []);
          setTotalFound(moodRes.totalMatched || moodRes.tracks?.length || 0);
          const predictedEmotion = moodRes.emotion;
          if (
            predictedEmotion?.label?.trim() &&
            typeof predictedEmotion.confidence === "number" &&
            Number.isFinite(predictedEmotion.confidence) &&
            predictedEmotion.confidence >= 0 &&
            predictedEmotion.confidence <= 1 &&
            takePendingEmotionSearchHistory(searchQuery)
          ) {
            await saveSearchHistory({
              keyword: searchQuery.trim(),
              searchType: "EMOTION",
              detectedEmotion: predictedEmotion.label,
              emotionConfidence: predictedEmotion.confidence,
            }).catch(() => undefined);
            if (signal.aborted) return;
          }
          const likedIds = await fetchLikedTrackIds(signal).catch(() => []);
          if (signal.aborted) return;
          setLikedTracks(new Set(likedIds));
          return;
        }

        if (currentTab === "tracks") {
          let response;
          if (searchQuery.trim()) {
            setMoodInfo(null);
            setMoodMatchStatus(null);
            setMoodCandidateCount(0);
            setMoodDistanceCutoff(null);
            response = await fetchTracks({ query: searchQuery.trim(), size: 100, signal });
          } else if (genre !== "all") {
            setMoodInfo(null);
            setMoodMatchStatus(null);
            setMoodCandidateCount(0);
            setMoodDistanceCutoff(null);
            response = await fetchTracks({ genre, size: 100, signal });
          } else {
            setMoodInfo(null);
            setMoodMatchStatus(null);
            setMoodCandidateCount(0);
            setMoodDistanceCutoff(null);
            response = await fetchTracks({ size: 200, signal });
          }

          if (signal.aborted) return;

          setTracks(response.content);
          setTotalFound(response.totalElements);

          // Fast single query for all liked track IDs
          const likedIds = await fetchLikedTrackIds(signal).catch(() => []);
          if (signal.aborted) return;
          setLikedTracks(new Set(likedIds));
        } else if (activeTab === "artists") {
          setMoodInfo(null);
          setMoodMatchStatus(null);
          setMoodCandidateCount(0);
          setMoodDistanceCutoff(null);
          const artistsData = await fetchArtists(searchQuery, signal);
          if (signal.aborted) return;
          setArtists(artistsData);
          setTotalFound(artistsData.length);
        } else if (activeTab === "albums") {
          setMoodInfo(null);
          const albumsData = await fetchPublicAlbums(searchQuery);
          setAlbums(albumsData.content || []);
          setTotalFound(albumsData.totalElements || 0);
        } else if (activeTab === "playlists") {
          setMoodInfo(null);
          const playlistsData = await fetchPublicPlaylists(searchQuery);
          setPlaylists(playlistsData || []);
          setTotalFound(playlistsData ? playlistsData.length : 0);
        }
      } catch (error) {
        if (signal.aborted) return;
        if (isMood && isPremiumUser && searchQuery.trim()) {
          setMoodInfo(null);
          setMoodMatchStatus(null);
          setTracks([]);
          setTotalFound(0);
          setMoodCatalogDiagnostics(null);
          setMoodError(error instanceof Error ? error.message : "Không thể tìm nhạc theo cảm xúc lúc này.");
        } else {
          console.error("Search failed:", error);
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [currentTab, isPremiumUser, saveSearchHistory]
  );

  // Debounced search when query changes
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const controller = new AbortController();
    timeoutRef.current = setTimeout(() => {
      void loadData(query, selectedGenre, isMoodMode, controller.signal);
    }, query ? 350 : 0);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      controller.abort();
    };
  }, [query, selectedGenre, isMoodMode, loadData, moodSubmissionVersion]);

  const handleTabChange = (tab: Tab) => {
    if (isMoodMode) return;
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

  const recordSelectedResult = (targetType: "TRACK" | "ARTIST", targetId: string) => {
    const recordedSearch = historyRecordRef.current;
    if (!recordedSearch || recordedSearch.keyword !== query.trim()) return;
    if (isMoodMode !== (recordedSearch.searchType === "EMOTION")) return;

    void recordedSearch.promise
      .then((history) => selectMySearchHistoryResult(history.id, targetType, targetId))
      .catch((error) => {
        console.error("Failed to save selected search result:", error);
        if (isMoodMode) setHistorySaveError("Chưa lưu được bài hát đã chọn vào lịch sử tìm kiếm.");
      });
  };

  const handlePlayTrack = (track: Track) => {
    recordSelectedResult("TRACK", track.spotifyId);
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
        audioUrl: track.audioUrl || (track.localPath ? `http://158.178.247.33/${track.localPath.replace(/^\/+/, "")}` : undefined),
        localPath: track.localPath,
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
        audioUrl: t.audioUrl || (t.localPath ? `http://158.178.247.33/${t.localPath.replace(/^\/+/, "")}` : undefined),
        localPath: t.localPath,
      }))
    );
  };

  const handlePlayAlbum = async (alb: Album) => {
    try {
      const detail = await fetchAlbumDetail(alb.id);
      if (detail.tracks && detail.tracks.length > 0) {
        const playlistTracks = detail.tracks.map((t) => ({
          spotifyId: t.spotifyId,
          name: t.name,
          artistName: t.artistName,
          albumName: alb.title,
          imageUrl: t.imageUrl || alb.coverUrl,
          durationMs: t.durationMs,
          lyricsPlain: t.lyricsPlain,
          lyricsSynced: t.lyricsSynced,
          audioUrl: t.audioUrl || (t.localPath ? `http://158.178.247.33/${t.localPath.replace(/^\/+/, "")}` : undefined),
          localPath: t.localPath,
        }));
        playTrack(playlistTracks[0], playlistTracks);
      }
    } catch (e) {
      console.error("Play album error:", e);
    }
  };

  const handleToggleAlbumFav = async (alb: Album) => {
    try {
      await toggleFavoriteAlbum(alb.id);
      setAlbums((prev) =>
        prev.map((a) => (a.id === alb.id ? { ...a, isFavorited: !a.isFavorited } : a))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlayPlaylist = async (pl: Playlist) => {
    try {
      let fullPlaylist = pl;
      if (!fullPlaylist.tracks || fullPlaylist.tracks.length === 0) {
        fullPlaylist = await fetchPlaylistById(pl.id);
      }
      if (fullPlaylist.tracks && fullPlaylist.tracks.length > 0) {
        const playlistTracks = fullPlaylist.tracks.map((t) => ({
          spotifyId: t.spotifyId,
          name: t.name,
          artistName: t.artistName,
          albumName: t.albumName || pl.name,
          imageUrl: t.imageUrl || pl.coverUrl,
          durationMs: t.durationMs,
          lyricsPlain: t.lyricsPlain,
          lyricsSynced: t.lyricsSynced,
          audioUrl: t.audioUrl || (t.localPath ? `http://158.178.247.33/${t.localPath.replace(/^\/+/, "")}` : undefined),
          localPath: t.localPath,
        }));
        playTrack(playlistTracks[0], playlistTracks);
      }
    } catch (e) {
      console.error("Play playlist error:", e);
    }
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
              if (next) setActiveTab("tracks");
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
              const normalized = val.trim();
              if (normalized) {
                const matchingEmotion = isMood && moodInfo?.text?.trim() === normalized ? moodInfo : null;
                if (isMood && isPremiumUser) {
                  if (
                    matchingEmotion?.label?.trim() &&
                    typeof matchingEmotion.confidence === "number" &&
                    Number.isFinite(matchingEmotion.confidence) &&
                    matchingEmotion.confidence >= 0 &&
                    matchingEmotion.confidence <= 1
                  ) {
                    void saveSearchHistory({
                      keyword: normalized,
                      searchType: "EMOTION",
                      detectedEmotion: matchingEmotion.label,
                      emotionConfidence: matchingEmotion.confidence,
                    });
                  } else {
                    queueEmotionSearchHistory(normalized);
                  }
                } else {
                  void saveSearchHistory({
                    keyword: normalized,
                    searchType: currentTab === "artists" ? "ARTIST" : "TRACK",
                  });
                }
              }

              const params = new URLSearchParams();
              if (normalized) params.set("q", normalized);
              if (isMood && isPremiumUser) params.set("mode", "mood");
              else if (currentTab === "artists") params.set("type", "ARTIST");
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

          {isMoodMode && query.trim() && moodError && (
            <div role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              Không thể hoàn tất tìm kiếm cảm xúc: {moodError}
            </div>
          )}

          {isMoodMode && query.trim() && historySaveError && (
            <div role="alert" className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
              {historySaveError}
            </div>
          )}

          {isMoodMode && query.trim() && moodMatchStatus === "MATCHED" && (
            <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-2.5 text-xs text-emerald-100">
              Tìm được {totalFound} bài đạt ngưỡng phù hợp trong {moodCandidateCount} bài đã chấm.
              {moodDistanceCutoff !== null && <span> Ngưỡng khoảng cách: {moodDistanceCutoff.toFixed(2)}.</span>}
            </div>
          )}

          {isMoodMode && query.trim() && moodMatchStatus === "LIMITED" && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-2.5 text-xs text-amber-100">
              Chưa có bài nào đạt ngưỡng phù hợp trong {moodCandidateCount} bài đã chấm. Đang hiển thị các bài gần nhất để bạn tham khảo.
              {moodDistanceCutoff !== null && <span> Ngưỡng khoảng cách: {moodDistanceCutoff.toFixed(2)}.</span>}
            </div>
          )}

          {isMoodMode && query.trim() && moodMatchStatus === "NO_CANDIDATES" && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-2.5 text-xs text-amber-100">
              Kho nhạc hiện chưa có bài hát phù hợp để chấm theo tâm trạng này.
            </div>
          )}

          {isMoodMode && query.trim() && moodCatalogDiagnostics && (
            <div className="mt-2 text-[11px] text-slate-400">
              Dữ liệu kho nhạc: {moodCatalogDiagnostics.tracksWithAudioFeatures}/{moodCandidateCount} bài có đặc trưng âm thanh,
              {" "}{moodCatalogDiagnostics.tracksWithCompleteAudioFeatures} bài đủ đặc trưng,
              {" "}{moodCatalogDiagnostics.tracksWithGenreTags} bài có thẻ thể loại,
              {" "}{moodCatalogDiagnostics.tracksWithMoodTags} bài có thẻ tâm trạng,
              {" "}độ phủ trung bình {Math.round(moodCatalogDiagnostics.averageFeatureCoverage * 100)}%.
            </div>
          )}

          {/* Genre quick filters */}
          {currentTab === "tracks" && (
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
                currentTab === "tracks"
                  ? "text-cyan-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Bài hát ({tracks.length})
              {currentTab === "tracks" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
              )}
            </button>
            <button
              disabled={isMoodMode}
              onClick={() => handleTabChange("artists")}
              className={`px-4 py-3 text-sm font-medium transition-all relative disabled:cursor-not-allowed disabled:opacity-40 ${
                currentTab === "artists"
                  ? "text-cyan-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Nghệ sĩ
              {currentTab === "artists" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
              )}
            </button>
            <button
              onClick={() => handleTabChange("albums")}
              className={`px-4 py-3 text-sm font-medium transition-all relative ${
                activeTab === "albums"
                  ? "text-cyan-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Album ({albums.length})
              {activeTab === "albums" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
              )}
            </button>
            <button
              onClick={() => handleTabChange("playlists")}
              className={`px-4 py-3 text-sm font-medium transition-all relative ${
                activeTab === "playlists"
                  ? "text-cyan-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Danh sách phát ({playlists.length})
              {activeTab === "playlists" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
              )}
            </button>
          </div>

          {totalFound !== null && (
            <span className="text-xs text-slate-400 hidden sm:block">
              {query
                ? `Tìm thấy ${totalFound} kết quả cho "${query}"`
                : activeTab === "albums"
                ? `Hiển thị ${albums.length} album`
                : activeTab === "playlists"
                ? `Hiển thị ${playlists.length} danh sách phát`
                : activeTab === "artists"
                ? `Hiển thị ${artists.length} nghệ sĩ`
                : `Hiển thị ${tracks.length} bài hát`}
            </span>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-slate-400">Đang tìm kiếm...</p>
          </div>
        ) : currentTab === "tracks" ? (
          tracks.length === 0 ? (
            <div className="text-center py-24">
              <Music className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium text-lg">
                {moodError
                  ? "Chưa thể hiển thị kết quả tìm kiếm"
                  : isMoodMode && moodMatchStatus === "NO_CANDIDATES"
                    ? "Kho nhạc chưa có bài hát để gợi ý"
                    : "Không tìm thấy bài hát"}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {moodError
                  ? "Thông tin lỗi được hiển thị phía trên; thử lại khi dịch vụ cảm xúc hoạt động."
                  : "Thử tìm với từ khóa khác (ví dụ: \"Ngọt\", \"Vô Tình\", \"Pop\")"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {tracks.map((track, idx) => (
                <TrackCard
                  key={track.spotifyId || track.id || `track-${idx}`}
                  track={track}
                  isLiked={likedTracks.has(track.spotifyId)}
                  onLike={() => handleTrackLike(track.spotifyId)}
                  onPlay={() => handlePlayTrack(track)}
                />
              ))}
            </div>
          )
        ) : activeTab === "artists" ? (
          artists.length === 0 ? (
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
                    recordSelectedResult("ARTIST", artist.spotifyId);
                    router.push(`/dashboard/artists/${artist.spotifyId}`);
                  }}
                />
              ))}
            </div>
          )
        ) : activeTab === "albums" ? (
          albums.length === 0 ? (
            <div className="text-center py-24">
              <Disc className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium text-lg">Không tìm thấy album phù hợp</p>
              <p className="text-slate-500 text-sm mt-1">
                Thử tìm tên album hoặc nghệ sĩ tạo album khác
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {albums.map((alb) => (
                <AlbumCard
                  key={alb.id}
                  album={alb}
                  isFavorited={alb.isFavorited}
                  onClick={() => setSelectedAlbumIdForModal(alb.id)}
                  onPlay={() => handlePlayAlbum(alb)}
                  onFavoriteToggle={() => handleToggleAlbumFav(alb)}
                />
              ))}
            </div>
          )
        ) : playlists.length === 0 ? (
          <div className="text-center py-24">
            <ListMusic className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium text-lg">Không tìm thấy danh sách phát phù hợp</p>
            <p className="text-slate-500 text-sm mt-1">
              Thử tìm tên danh sách phát hoặc người tạo (chỉ hiển thị playlist công khai)
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {playlists.map((pl) => (
              <PlaylistCard
                key={pl.id}
                playlist={pl}
                onClick={() => router.push(`/dashboard/library?playlistId=${pl.id}`)}
                onPlay={() => handlePlayPlaylist(pl)}
              />
            ))}
          </div>
        )}

        {/* Album Detail Modal */}
        <AlbumDetailModal
          isOpen={Boolean(selectedAlbumIdForModal)}
          albumId={selectedAlbumIdForModal}
          onClose={() => setSelectedAlbumIdForModal(null)}
          onAlbumUpdated={() => loadData(query, selectedGenre, isMoodMode, new AbortController().signal)}
        />
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
