"use client";

import { useState, useEffect } from "react";
import { X, Plus, Check, Loader2, Music, ListMusic } from "lucide-react";
import {
  fetchUserPlaylists,
  addTrackToPlaylist,
  type Playlist,
  type Track,
} from "@/lib/api-client";
import CreatePlaylistModal from "./create-playlist-modal";

interface AddToPlaylistModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
  onTrackAdded?: (playlist: Playlist, track: Track) => void;
}

export default function AddToPlaylistModal({
  track,
  isOpen,
  onClose,
  onTrackAdded,
}: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && track) {
      loadPlaylists();
      setAddedIds(new Set());
      setError(null);
    }
  }, [isOpen, track]);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const data = await fetchUserPlaylists();
      setPlaylists(data);

      // Check which playlists already have this track
      if (track) {
        const alreadyIn = new Set<string>();
        data.forEach((p) => {
          if (p.tracks?.some((t) => t.spotifyId === track.spotifyId || t.id === track.id)) {
            alreadyIn.add(p.id);
          }
        });
        setAddedIds(alreadyIn);
      }
    } catch (err: any) {
      console.error("Failed to load user playlists:", err);
      setError("Không thể tải danh sách phát. Vui lòng đăng nhập.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !track) return null;

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (addingId) return;
    setAddingId(playlist.id);
    setError(null);

    try {
      const trackId = track.spotifyId || track.id;
      const updated = await addTrackToPlaylist(playlist.id, trackId);
      setAddedIds((prev) => new Set([...prev, playlist.id]));
      if (onTrackAdded) {
        onTrackAdded(updated, track);
      }
    } catch (err: any) {
      console.error("Failed to add track to playlist:", err);
      setError(err?.message || "Không thể thêm vào playlist");
    } finally {
      setAddingId(null);
    }
  };

  const handlePlaylistCreated = async (newPlaylist: Playlist) => {
    setPlaylists((prev) => [newPlaylist, ...prev]);
    // Automatically add this track to the newly created playlist
    await handleAddToPlaylist(newPlaylist);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div
          className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Thêm vào Playlist</h2>
              <p className="text-xs text-slate-400 truncate max-w-[260px]">
                {track.name} • {track.artistName}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* New Playlist Trigger */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="w-full mb-4 flex items-center gap-3 p-3 rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 transition-all font-medium text-sm group"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <span>Tạo playlist mới</span>
          </button>

          {/* Playlist List */}
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : playlists.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Bạn chưa có playlist nào. Hãy bấm &quot;Tạo playlist mới&quot; ở trên!
              </div>
            ) : (
              playlists.map((playlist) => {
                const isAdded = addedIds.has(playlist.id);
                const isAdding = addingId === playlist.id;

                return (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist)}
                    disabled={isAdding}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                      isAdded
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-white/5 bg-white/5 hover:bg-white/10 text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-white/10 flex items-center justify-center">
                        {playlist.coverUrl ? (
                          <img
                            src={playlist.coverUrl}
                            alt={playlist.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">
                          {playlist.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {playlist.trackCount || playlist.tracks?.length || 0} bài hát
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-3">
                      {isAdding ? (
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      ) : isAdded ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <Check className="w-4 h-4" />
                          <span>Đã thêm</span>
                        </div>
                      ) : (
                        <div className="p-1 rounded-full bg-white/10 text-slate-400 group-hover:text-white">
                          <Plus className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modal for creating a playlist */}
      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handlePlaylistCreated}
      />
    </>
  );
}
