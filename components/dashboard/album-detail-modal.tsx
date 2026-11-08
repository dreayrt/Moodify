"use client";

import { useState, useEffect } from "react";
import { X, Play, Heart, Disc, Music, Trash2, Plus, Clock, Loader2, Sparkles, User as UserIcon } from "lucide-react";
import {
  fetchAlbumDetail,
  toggleFavoriteAlbum,
  removeTrackFromAlbum,
  addTrackToAlbum,
  fetchTracks,
  type AlbumDetail,
  type Track,
} from "@/lib/api-client";
import { usePlayer } from "./player-context";

interface AlbumDetailModalProps {
  albumId: number | string | null;
  isOpen: boolean;
  onClose: () => void;
  onAlbumUpdated?: () => void;
  currentUsername?: string | null;
}

export default function AlbumDetailModal({
  albumId,
  isOpen,
  onClose,
  onAlbumUpdated,
  currentUsername,
}: AlbumDetailModalProps) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);

  // Search track to add
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [searchTrackQuery, setSearchTrackQuery] = useState("");
  const [searchTrackResults, setSearchTrackResults] = useState<Track[]>([]);
  const [searchingTracks, setSearchingTracks] = useState(false);
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && albumId) {
      loadDetail(albumId);
    } else {
      setAlbum(null);
      setShowAddTrack(false);
    }
  }, [isOpen, albumId]);

  const loadDetail = async (id: number | string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAlbumDetail(id);
      setAlbum(data);
      setIsFavorited(Boolean(data.isFavorited));
    } catch (err: any) {
      console.error("Load album detail error:", err);
      setError(err?.message || "Không thể tải chi tiết album");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFav = async () => {
    if (!album) return;
    const next = !isFavorited;
    setIsFavorited(next);
    try {
      await toggleFavoriteAlbum(album.id);
      if (onAlbumUpdated) onAlbumUpdated();
    } catch (err) {
      setIsFavorited(!next);
    }
  };

  const handlePlayEntireAlbum = () => {
    if (!album || !album.tracks || album.tracks.length === 0) return;
    const playlistTracks = album.tracks.map((t) => ({
      id: t.id,
      spotifyId: t.spotifyId,
      name: t.name,
      artistName: t.artistName,
      albumName: album.title,
      imageUrl: t.imageUrl || album.coverUrl,
      durationMs: t.durationMs,
      lyricsPlain: t.lyricsPlain,
      lyricsSynced: t.lyricsSynced,
      audioUrl: t.audioUrl || (t.localPath ? `https://moodify.click/${t.localPath.replace(/^\/+/, "")}` : undefined),
      localPath: t.localPath,
    }));

    playTrack(playlistTracks[0], playlistTracks);
  };

  const handlePlaySingleTrack = (track: Track) => {
    if (!album) return;
    const playlistTracks = album.tracks.map((t) => ({
      id: t.id,
      spotifyId: t.spotifyId,
      name: t.name,
      artistName: t.artistName,
      albumName: album.title,
      imageUrl: t.imageUrl || album.coverUrl,
      durationMs: t.durationMs,
      lyricsPlain: t.lyricsPlain,
      lyricsSynced: t.lyricsSynced,
      audioUrl: t.audioUrl || (t.localPath ? `https://moodify.click/${t.localPath.replace(/^\/+/, "")}` : undefined),
      localPath: t.localPath,
    }));

    const target = playlistTracks.find((t) => t.spotifyId === track.spotifyId) || playlistTracks[0];
    playTrack(target, playlistTracks);
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!album) return;
    try {
      const updated = await removeTrackFromAlbum(album.id, trackId);
      setAlbum(updated);
      if (onAlbumUpdated) onAlbumUpdated();
    } catch (err: any) {
      alert(err?.message || "Không thể xóa bài hát khỏi album");
    }
  };

  const handleSearchTracks = async (q: string) => {
    setSearchTrackQuery(q);
    if (!q.trim()) {
      setSearchTrackResults([]);
      return;
    }
    setSearchingTracks(true);
    try {
      const res = await fetchTracks({ query: q.trim(), size: 10 });
      setSearchTrackResults(res.content);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingTracks(false);
    }
  };

  const handleAddTrack = async (track: Track) => {
    if (!album) return;
    const trackIdToAdd = track.spotifyId || track.id;
    setAddingTrackId(trackIdToAdd);
    try {
      const updated = await addTrackToAlbum(album.id, trackIdToAdd);
      setAlbum(updated);
      setSearchTrackResults((prev) => prev.filter((t) => (t.spotifyId || t.id) !== trackIdToAdd));
      if (onAlbumUpdated) onAlbumUpdated();
    } catch (err: any) {
      alert(err?.message || "Không thể thêm bài hát vào album");
    } finally {
      setAddingTrackId(null);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "0:00";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[88vh] rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mb-3" />
            <p className="text-sm">Đang tải thông tin album...</p>
          </div>
        ) : error || !album ? (
          <div className="p-8 text-center text-slate-400">
            <p className="text-red-400 text-sm mb-4">{error || "Không tìm thấy album"}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20 transition-all"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            {/* Header with Cover & Controls */}
            <div className="p-6 bg-gradient-to-b from-cyan-950/40 via-slate-900/40 to-slate-900 border-b border-white/5 flex flex-col md:flex-row gap-5 items-start md:items-center">
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden shadow-2xl shrink-0 bg-slate-800">
                <img
                  src={album.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300"}
                  alt={album.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-bold text-cyan-300">
                  ALBUM
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  <Disc className="w-4 h-4 animate-spin-slow" />
                  <span>Album Tuyển Tập</span>
                  {album.releaseDate && (
                    <span className="text-slate-400 font-normal">
                      • {album.releaseDate.split("-")[0]}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-1 mb-1 truncate">
                  {album.title}
                </h2>

                <div className="flex items-center gap-2 text-xs text-slate-300 mb-2">
                  <span className="flex items-center gap-1 font-medium text-slate-200">
                    <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                    {album.authorName}
                  </span>
                  <span>•</span>
                  <span>{album.trackCount} bài hát</span>
                </div>

                {album.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                    {album.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handlePlayEntireAlbum}
                    disabled={!album.tracks || album.tracks.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    Phát Album
                  </button>

                  <button
                    onClick={handleToggleFav}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isFavorited
                        ? "bg-rose-500/20 border-rose-500/50 text-rose-400"
                        : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                    title={isFavorited ? "Bỏ yêu thích album" : "Thả tim yêu thích album"}
                  >
                    <Heart className={`w-4 h-4 ${isFavorited ? "fill-rose-500" : ""}`} />
                  </button>

                  <button
                    onClick={() => setShowAddTrack(!showAddTrack)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors ml-auto"
                  >
                    <Plus className="w-4 h-4 text-cyan-400" />
                    <span>Thêm bài hát</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Add Track Section (Collapsible) */}
            {showAddTrack && (
              <div className="p-4 bg-slate-950/80 border-b border-white/5 animate-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={searchTrackQuery}
                    onChange={(e) => handleSearchTracks(e.target.value)}
                    placeholder="Tìm bài hát để thêm vào album..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  {searchingTracks && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
                </div>

                {searchTrackResults.length > 0 && (
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {searchTrackResults.map((t) => {
                      const tId = t.spotifyId || t.id;
                      const isAlreadyIn = album.tracks?.some((at) => (at.spotifyId || at.id) === tId);
                      return (
                        <div
                          key={tId}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-white/5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={t.imageUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=240"}
                              className="w-7 h-7 rounded object-cover"
                              alt=""
                            />
                            <div className="truncate">
                              <p className="font-semibold text-white truncate">{t.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{t.artistName}</p>
                            </div>
                          </div>
                          {isAlreadyIn ? (
                            <span className="text-[10px] text-slate-500 font-medium">Đã có</span>
                          ) : (
                            <button
                              onClick={() => handleAddTrack(t)}
                              disabled={addingTrackId === tId}
                              className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold text-[11px] transition-colors"
                            >
                              {addingTrackId === tId ? "..." : "+ Thêm"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tracklist Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {!album.tracks || album.tracks.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Music className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Album chưa có bài hát nào</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Bấm &quot;Thêm bài hát&quot; ở trên để tuyển chọn bài hát vào album
                  </p>
                </div>
              ) : (
                album.tracks.map((t, idx) => {
                  const isCurrent = currentTrack?.spotifyId === t.spotifyId;
                  return (
                    <div
                      key={t.spotifyId || idx}
                      className={`group flex items-center justify-between p-2.5 rounded-xl transition-all ${
                        isCurrent
                          ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
                          : "hover:bg-white/5 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-6 text-center text-xs font-mono text-slate-500 group-hover:hidden">
                          {idx + 1}
                        </span>
                        <button
                          onClick={() => handlePlaySingleTrack(t)}
                          className="w-6 hidden group-hover:flex items-center justify-center text-cyan-400"
                          title="Phát bài này"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>

                        <img
                          src={t.imageUrl || album.coverUrl}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate ${isCurrent ? "text-cyan-400" : "text-white"}`}>
                            {t.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{t.artistName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500">
                        <span className="font-mono">{formatDuration(t.durationMs)}</span>
                        <button
                          onClick={() => handleRemoveTrack(t.spotifyId || t.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Gỡ khỏi album"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
