"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  fetchUserLibrary,
  fetchUserPlaylists,
  fetchPlaylistById,
  removeTrackFromPlaylist,
  deletePlaylist,
  removeFromLibrary,
  type LibraryTrack,
  type Playlist,
  type Track,
} from "@/lib/api-client";
import { usePlayer } from "@/components/dashboard/player-context";
import TrackCard from "@/components/dashboard/track-card";
import CreatePlaylistModal from "@/components/dashboard/create-playlist-modal";
import TrackActionMenu from "@/components/dashboard/track-action-menu";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Music,
  Heart,
  Clock,
  ArrowLeft,
  ListMusic,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Disc,
} from "lucide-react";

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const playlistIdFromUrl = searchParams.get("playlistId");

  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();

  // Active tab: "playlists" | "liked"
  const [activeTab, setActiveTab] = useState<"playlists" | "liked">("playlists");

  // Playlists state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [loadingSelectedPlaylist, setLoadingSelectedPlaylist] = useState(false);

  // Liked tracks state
  const [likedTracks, setLikedTracks] = useState<LibraryTrack[]>([]);
  const [loadingLiked, setLoadingLiked] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalLiked, setTotalLiked] = useState(0);
  const pageSize = 20;

  // Modal & operation states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [removingTrackId, setRemovingTrackId] = useState<string | null>(null);

  // Load playlists and liked count on mount
  useEffect(() => {
    loadUserPlaylists();
    loadLikedCount();
  }, []);

  // Listen for global library and playlist changes from other components
  useEffect(() => {
    const handleLibraryChange = () => {
      loadLikedCount();
      if (activeTab === "liked") {
        loadLikedTracks(currentPage);
      }
    };

    const handlePlaylistChange = () => {
      loadUserPlaylists();
      if (selectedPlaylist) {
        loadSinglePlaylist(selectedPlaylist.id);
      }
    };

    window.addEventListener("moodify-library-updated", handleLibraryChange);
    window.addEventListener("moodify-playlist-updated", handlePlaylistChange);

    return () => {
      window.removeEventListener("moodify-library-updated", handleLibraryChange);
      window.removeEventListener("moodify-playlist-updated", handlePlaylistChange);
    };
  }, [activeTab, currentPage, selectedPlaylist]);

  // Handle URL playlistId parameter
  useEffect(() => {
    if (playlistIdFromUrl) {
      loadSinglePlaylist(playlistIdFromUrl);
      setActiveTab("playlists");
    } else {
      setSelectedPlaylist(null);
    }
  }, [playlistIdFromUrl]);

  // Load liked tracks when tab or page changes
  useEffect(() => {
    if (activeTab === "liked") {
      loadLikedTracks(currentPage);
    }
  }, [activeTab, currentPage]);

  const loadLikedCount = async () => {
    try {
      const res = await fetchUserLibrary(0, 1);
      setTotalLiked(res.totalElements);
    } catch (err) {
      console.warn("Could not load liked count:", err);
    }
  };

  const loadUserPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const data = await fetchUserPlaylists();
      setPlaylists(data);
    } catch (err) {
      console.error("Failed to load user playlists:", err);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const loadSinglePlaylist = async (id: string) => {
    setLoadingSelectedPlaylist(true);
    try {
      const data = await fetchPlaylistById(id);
      setSelectedPlaylist(data);
    } catch (err) {
      console.error("Failed to load playlist details:", err);
    } finally {
      setLoadingSelectedPlaylist(false);
    }
  };

  const loadLikedTracks = async (page: number) => {
    setLoadingLiked(true);
    try {
      const res = await fetchUserLibrary(page, pageSize);
      setLikedTracks(res.tracks);
      setTotalPages(res.totalPages);
      setTotalLiked(res.totalElements);
    } catch (err) {
      console.error("Failed to load liked tracks:", err);
    } finally {
      setLoadingLiked(false);
    }
  };

  // Unlike a track
  const handleUnlike = async (trackSpotifyId: string) => {
    try {
      await removeFromLibrary(trackSpotifyId);
      setLikedTracks((prev) => prev.filter((t) => t.spotifyId !== trackSpotifyId));
      setTotalLiked((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to unlike track:", err);
      loadLikedTracks(currentPage);
    }
  };

  // Remove track from current playlist
  const handleRemoveTrackFromPlaylist = async (trackId: string) => {
    if (!selectedPlaylist || removingTrackId) return;
    setRemovingTrackId(trackId);

    try {
      const updated = await removeTrackFromPlaylist(selectedPlaylist.id, trackId);
      setSelectedPlaylist(updated);
      setPlaylists((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    } catch (err) {
      console.error("Failed to remove track:", err);
    } finally {
      setRemovingTrackId(null);
    }
  };

  // Delete an entire playlist
  const handleDeletePlaylist = async (playlistId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa playlist này không?")) return;

    setDeletingId(playlistId);
    try {
      await deletePlaylist(playlistId);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
        router.push("/dashboard/library");
      }
    } catch (err) {
      console.error("Failed to delete playlist:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Callback after creating playlist
  const handlePlaylistCreated = (newPlaylist: Playlist) => {
    setPlaylists((prev) => [newPlaylist, ...prev]);
    setSelectedPlaylist(newPlaylist);
    router.push(`/dashboard/library?playlistId=${newPlaylist.id}`);
  };

  // Play an entire playlist or track within playlist
  const handlePlayPlaylist = async (playlist: Playlist, startIndex = 0) => {
    let tracks = playlist.tracks;
    if (!tracks || tracks.length === 0 || tracks.length < playlist.trackCount) {
      try {
        const full = await fetchPlaylistById(playlist.id);
        if (full?.tracks && full.tracks.length > 0) {
          tracks = full.tracks;
        }
      } catch (err) {
        console.warn("Could not load full playlist tracks:", err);
      }
    }
    if (!tracks || tracks.length === 0) return;
    const trackToPlay = tracks[startIndex] || tracks[0];
    playTrack(trackToPlay, tracks);
  };

  // Play liked tracks
  const handlePlayLikedSongs = (startIndex = 0) => {
    if (likedTracks.length === 0) return;
    const trackToPlay = likedTracks[startIndex] || likedTracks[0];
    playTrack(trackToPlay, likedTracks);
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "0:00";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const calculateTotalDuration = (tracks?: Track[]) => {
    if (!tracks || tracks.length === 0) return "0 phút";
    const totalMs = tracks.reduce((acc, t) => acc + (t.durationMs || 0), 0);
    const totalMin = Math.round(totalMs / 60000);
    return `${totalMin} phút`;
  };

  return (
    <div className="flex flex-col gap-6 min-w-0 anim-fade-up">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <ListMusic className="w-7 h-7 text-cyan-400" />
            Thư viện của bạn
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Quản lý danh sách phát và các bài hát bạn đã lưu
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tạo Playlist
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      {!selectedPlaylist && (
        <div className="flex gap-6 border-b border-white/8">
          <button
            onClick={() => setActiveTab("playlists")}
            className={`pb-3 text-sm font-medium transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === "playlists"
                ? "text-cyan-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Disc className="w-4 h-4" />
            Danh sách phát ({playlists.length})
            {activeTab === "playlists" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("liked")}
            className={`pb-3 text-sm font-medium transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === "liked"
                ? "text-cyan-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Heart className="w-4 h-4 text-pink-500" />
            Bài hát đã thích ({totalLiked})
            {activeTab === "liked" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>
        </div>
      )}

      {/* VIEW 1: PLAYLIST DETAIL VIEW */}
      {selectedPlaylist ? (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Back Button */}
            <button
              onClick={() => {
                setSelectedPlaylist(null);
                router.push("/dashboard/library");
              }}
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại danh sách phát
            </button>

            {loadingSelectedPlaylist ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
              </div>
            ) : (
              <>
                {/* Playlist Hero Banner */}
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-end p-6 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Playlist Cover Art */}
                  <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden bg-slate-800 shrink-0 shadow-2xl border border-white/15 relative group flex items-center justify-center">
                    {selectedPlaylist.coverUrl ? (
                      <img
                        src={selectedPlaylist.coverUrl}
                        alt={selectedPlaylist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-cyan-600 to-purple-600 flex items-center justify-center">
                        <Music className="w-16 h-16 text-white/80" />
                      </div>
                    )}
                  </div>

                  {/* Playlist Info */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold uppercase tracking-wider">
                      Danh sách phát
                    </span>
                    <h1 className="text-3xl md:text-5xl font-bold font-display text-white tracking-tight break-words">
                      {selectedPlaylist.name}
                    </h1>
                    {selectedPlaylist.description && (
                      <p className="text-sm text-slate-300 line-clamp-2">
                        {selectedPlaylist.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                      <span className="font-semibold text-white">
                        {selectedPlaylist.username}
                      </span>
                      <span>•</span>
                      <span>{selectedPlaylist.tracks?.length || 0} bài hát</span>
                      <span>•</span>
                      <span>{calculateTotalDuration(selectedPlaylist.tracks)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-3">
                      <button
                        onClick={() => handlePlayPlaylist(selectedPlaylist, 0)}
                        disabled={!selectedPlaylist.tracks || selectedPlaylist.tracks.length === 0}
                        className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-cyan-400 hover:bg-cyan-300 text-black shadow-lg shadow-cyan-400/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        Phát tất cả
                      </button>

                      <button
                        onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                        disabled={deletingId === selectedPlaylist.id}
                        className="p-3 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-colors"
                        title="Xóa danh sách phát"
                      >
                        {deletingId === selectedPlaylist.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tracks Table */}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Danh sách bài hát ({selectedPlaylist.tracks?.length || 0})
                  </h3>

                  {!selectedPlaylist.tracks || selectedPlaylist.tracks.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-white/10 bg-white/5">
                      <Music className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <h4 className="text-base font-semibold text-white mb-1">
                        Playlist này còn trống
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
                        Hãy khám phá 147 ca khúc Việt Nam và thêm những giai điệu bạn yêu thích vào playlist này!
                      </p>
                      <button
                        onClick={() => router.push("/dashboard/search")}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-cyan-400 border border-cyan-400/20 transition-all"
                      >
                        Khám phá bài hát ngay
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/5 bg-slate-900/40 overflow-hidden divide-y divide-white/5">
                      {selectedPlaylist.tracks.map((track, idx) => {
                        const isCurrentPlaying =
                          currentTrack?.spotifyId === track.spotifyId && isPlaying;

                        return (
                          <div
                            key={track.spotifyId || track.id || idx}
                            className="group flex items-center justify-between p-3 sm:px-4 hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                              {/* Index / Play Button */}
                              <div className="w-8 text-center shrink-0">
                                <button
                                  onClick={() => {
                                    if (currentTrack?.spotifyId === track.spotifyId) {
                                      togglePlay();
                                    } else {
                                      handlePlayPlaylist(selectedPlaylist, idx);
                                    }
                                  }}
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-cyan-500/20 transition-all"
                                >
                                  {isCurrentPlaying ? (
                                    <Pause className="w-4 h-4 text-cyan-400 fill-current" />
                                  ) : (
                                    <span className="group-hover:hidden text-xs text-slate-500">
                                      {idx + 1}
                                    </span>
                                  )}
                                  <Play
                                    className={`w-4 h-4 fill-current ${
                                      isCurrentPlaying ? "hidden" : "hidden group-hover:block"
                                    }`}
                                  />
                                </button>
                              </div>

                              {/* Thumbnail */}
                              <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                                {track.imageUrl ? (
                                  <img
                                    src={track.imageUrl}
                                    alt={track.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                                    <Music className="w-5 h-5" />
                                  </div>
                                )}
                              </div>

                              {/* Title and Artist */}
                              <div className="truncate min-w-0 pr-2">
                                <h4
                                  className={`text-sm font-semibold truncate ${
                                    currentTrack?.spotifyId === track.spotifyId
                                      ? "text-cyan-400"
                                      : "text-white"
                                  }`}
                                >
                                  {track.name}
                                </h4>
                                <p className="text-xs text-slate-400 truncate">
                                  {track.artistName}
                                </p>
                              </div>
                            </div>

                            {/* Album name */}
                            <div className="hidden md:block w-1/3 truncate text-xs text-slate-400 px-4">
                              {track.albumName || "—"}
                            </div>

                            {/* Duration and Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDuration(track.durationMs)}
                              </span>

                              <TrackActionMenu
                                track={track}
                                onRemoveFromPlaylist={() =>
                                  handleRemoveTrackFromPlaylist(track.spotifyId || track.id)
                                }
                              />

                              <button
                                onClick={() =>
                                  handleRemoveTrackFromPlaylist(track.spotifyId || track.id)
                                }
                                disabled={removingTrackId === (track.spotifyId || track.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Xóa khỏi playlist này"
                              >
                                {removingTrackId === (track.spotifyId || track.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : activeTab === "playlists" ? (
          /* VIEW 2: PLAYLISTS GRID */
          <div className="space-y-6 animate-in fade-in duration-200">
            {loadingPlaylists ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {/* Special Card: Liked Songs */}
                <div
                  onClick={() => setActiveTab("liked")}
                  className="group relative flex flex-col justify-end p-5 rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 shadow-xl cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-cyan-500/10 aspect-square"
                >
                  <div className="absolute top-4 left-4 p-3 rounded-2xl bg-white/10 backdrop-blur-md text-white">
                    <Heart className="w-6 h-6 fill-white" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-1">
                      Bài hát đã thích
                    </h3>
                    <p className="text-xs text-purple-200 font-medium">
                      {totalLiked} bài hát yêu thích
                    </p>
                  </div>
                </div>

                {/* Create Playlist Quick Card */}
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-white/15 bg-white/5 hover:bg-white/10 hover:border-cyan-400/50 transition-all duration-300 group aspect-square text-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-cyan-300">
                    Tạo playlist mới
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Bộ sưu tập riêng của bạn
                  </span>
                </button>

                {/* User Playlists */}
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => {
                      setSelectedPlaylist(playlist);
                      router.push(`/dashboard/library?playlistId=${playlist.id}`);
                    }}
                    className="group relative flex flex-col p-3 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/15 hover:bg-slate-900/80 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl"
                  >
                    {/* Cover art */}
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-800 mb-3 border border-white/5">
                      {playlist.coverUrl ? (
                        <img
                          src={playlist.coverUrl}
                          alt={playlist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-cyan-600/40 to-purple-600/40 flex items-center justify-center">
                          <Music className="w-10 h-10 text-slate-400" />
                        </div>
                      )}

                      {/* Play overlay button */}
                      {playlist.trackCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPlaylist(playlist, 0);
                          }}
                          className="absolute bottom-2 right-2 p-3 rounded-full bg-cyan-400 text-black shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      )}
                    </div>

                    {/* Details */}
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                      {playlist.name}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {playlist.trackCount || playlist.tracks?.length || 0} bài hát
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* VIEW 3: LIKED SONGS TAB */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Liked Songs Hero Banner */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center p-6 rounded-3xl bg-gradient-to-r from-purple-900/40 via-pink-900/20 to-slate-900/40 border border-purple-500/20 backdrop-blur-xl">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center shrink-0 shadow-2xl">
                <Heart className="w-12 h-12 text-white fill-white" />
              </div>
              <div className="flex-1">
                <span className="text-[11px] font-semibold text-pink-400 uppercase tracking-wider">
                  Bộ sưu tập
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
                  Bài hát đã thích
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {totalLiked} bài hát bạn đã lưu vào danh sách yêu thích
                </p>

                {likedTracks.length > 0 && (
                  <button
                    onClick={() => handlePlayLikedSongs(0)}
                    className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-pink-500 hover:bg-pink-400 text-white shadow-lg shadow-pink-500/25 transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Phát tất cả
                  </button>
                )}
              </div>
            </div>

            {loadingLiked ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-pink-400" />
              </div>
            ) : likedTracks.length === 0 ? (
              <div className="text-center py-20 px-4 rounded-3xl border border-white/5 bg-slate-900/30">
                <Heart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">
                  Bạn chưa thích bài hát nào
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
                  Bấm vào biểu tượng trái tim ở bất kỳ bài hát nào để lưu vào đây!
                </p>
                <button
                  onClick={() => router.push("/dashboard/search")}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all"
                >
                  Tìm kiếm bài hát
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {likedTracks.map((track) => (
                    <TrackCard
                      key={track.spotifyId || track.id}
                      track={track}
                      isLiked={true}
                      onLike={() => handleUnlike(track.spotifyId)}
                      onPlay={() => playTrack(track, likedTracks)}
                      showAddedDate={true}
                      addedAt={track.addedAt}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-6">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 border border-slate-800 text-xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Trước
                    </button>

                    <span className="text-xs text-slate-400">
                      Trang {currentPage + 1} / {totalPages}
                    </span>

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={currentPage >= totalPages - 1}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 border border-slate-800 text-xs"
                    >
                      Sau
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handlePlaylistCreated}
      />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  );
}
