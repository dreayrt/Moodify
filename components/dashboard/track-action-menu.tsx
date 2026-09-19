"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Heart,
  ListPlus,
  ListMusic,
  Mic2,
  Check,
  Trash2,
  Share2,
  Music,
  Sparkles,
  X,
} from "lucide-react";
import {
  addToLibrary,
  removeFromLibrary,
  isTrackInLibrary,
  type Track,
} from "@/lib/api-client";
import { usePlayer } from "./player-context";
import AddToPlaylistModal from "./add-to-playlist-modal";

export interface TrackActionMenuProps {
  track: {
    id?: string;
    spotifyId?: string;
    name?: string;
    title?: string;
    artist?: string;
    artistName?: string;
    albumName?: string;
    imageUrl?: string | null;
    cover?: string;
    durationMs?: number;
    lyricsSynced?: string | null;
    lyricsPlain?: string | null;
    [key: string]: any;
  };
  isLiked?: boolean;
  onLikeChange?: (isLiked: boolean) => void;
  onShowLyrics?: () => void;
  onRemoveFromPlaylist?: () => void;
  className?: string;
  iconClassName?: string;
}

const MODULAR_KEYFRAMES = `
@keyframes modularEntrance {
  0% {
    opacity: 0;
    transform: scale(0.92) translateY(-6px);
    filter: blur(6px);
  }
  60% {
    transform: scale(1.02) translateY(0);
    filter: blur(0px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes vinylSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes equalizerLive {
  0%, 100% { height: 4px; }
  50% { height: 14px; }
}

@keyframes heartFloatUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(0.6);
  }
  100% {
    opacity: 0;
    transform: translateY(-40px) scale(1.4);
  }
}
`;

/**
 * Reusable inline action panel (expands directly below track row).
 * Features spinning vinyl disc, dual featured cards (Heart & Lyrics), and quick action dock.
 */
export function TrackInlineActions({
  track,
  isLiked: initialLiked,
  onLikeChange,
  onShowLyrics,
  onRemoveFromPlaylist,
  onClose,
  className = "",
}: {
  track: any;
  isLiked?: boolean;
  onLikeChange?: (isLiked: boolean) => void;
  onShowLyrics?: () => void;
  onRemoveFromPlaylist?: () => void;
  onClose?: () => void;
  className?: string;
}) {
  const [liked, setLiked] = useState<boolean>(initialLiked ?? false);
  const [copied, setCopied] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [heartParticles, setHeartParticles] = useState<{ id: number; left: number }[]>([]);

  const { playTrack, addToQueue } = usePlayer();

  const trackSpotifyId = track.spotifyId || track.id || "";
  const trackTitle = track.title || track.name || "Bài hát";
  const trackArtist = track.artist || track.artistName || "Nghệ sĩ";
  const trackCover = track.imageUrl || track.cover || null;

  // Check liked status when mounted
  useEffect(() => {
    if (initialLiked !== undefined) {
      setLiked(initialLiked);
      return;
    }
    if (!trackSpotifyId) return;

    let cancelled = false;
    isTrackInLibrary(trackSpotifyId)
      .then((res) => {
        if (!cancelled) setLiked(res);
      })
      .catch(() => {
        if (!cancelled) setLiked(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trackSpotifyId, initialLiked]);

  // Listen for global library updates
  useEffect(() => {
    const handleLibraryUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackSpotifyId: string; liked: boolean }>;
      if (customEvent.detail && customEvent.detail.trackSpotifyId === trackSpotifyId) {
        setLiked(customEvent.detail.liked);
      }
    };
    window.addEventListener("moodify-library-updated", handleLibraryUpdate);
    return () => {
      window.removeEventListener("moodify-library-updated", handleLibraryUpdate);
    };
  }, [trackSpotifyId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const triggerHeartBurst = () => {
    const newParticles = [
      { id: Date.now() + 1, left: 25 },
      { id: Date.now() + 2, left: 50 },
      { id: Date.now() + 3, left: 75 },
    ];
    setHeartParticles(newParticles);
    setTimeout(() => {
      setHeartParticles([]);
    }, 800);
  };

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!trackSpotifyId) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    if (onLikeChange) onLikeChange(nextLiked);

    if (nextLiked) {
      triggerHeartBurst();
    }

    try {
      if (nextLiked) {
        await addToLibrary(trackSpotifyId);
        showToast("Đã thêm vào Bài hát yêu thích ✨");
      } else {
        await removeFromLibrary(trackSpotifyId);
        showToast("Đã xóa khỏi Bài hát yêu thích");
      }

      window.dispatchEvent(
        new CustomEvent("moodify-library-updated", {
          detail: { trackSpotifyId, liked: nextLiked },
        })
      );
    } catch (err: any) {
      console.error("Failed to toggle like:", err);
      setLiked(!nextLiked);
      if (onLikeChange) onLikeChange(!nextLiked);
      showToast(err?.message || "Vui lòng đăng nhập để lưu bài hát");
    }
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const normalizedTrack: any = {
      id: track.id || track.spotifyId || "",
      spotifyId: trackSpotifyId,
      name: trackTitle,
      artistName: trackArtist,
      albumName: track.albumName || "",
      durationMs: track.durationMs || 180000,
      imageUrl: trackCover,
      lyricsPlain: track.lyricsPlain,
      lyricsSynced: track.lyricsSynced,
      localPath: track.localPath,
    };

    addToQueue(normalizedTrack);
    showToast("Đã thêm vào danh sách chờ 🎵");
  };

  const handleViewLyrics = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (onShowLyrics) {
      onShowLyrics();
    } else {
      const normalizedTrack: any = {
        id: track.id || track.spotifyId || "",
        spotifyId: trackSpotifyId,
        name: trackTitle,
        artistName: trackArtist,
        albumName: track.albumName || "",
        durationMs: track.durationMs || 180000,
        imageUrl: trackCover,
        lyricsPlain: track.lyricsPlain,
        lyricsSynced: track.lyricsSynced,
        localPath: track.localPath,
      };
      playTrack(normalizedTrack);
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const url = `${window.location.origin}/dashboard?track=${trackSpotifyId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      showToast("Đã sao chép liên kết bài hát 🔗");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenPlaylistModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsPlaylistModalOpen(true);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onRemoveFromPlaylist) {
      onRemoveFromPlaylist();
    }
    if (onClose) onClose();
  };

  const normalizedForPlaylist: Track = {
    id: track.id || trackSpotifyId,
    spotifyId: trackSpotifyId,
    name: trackTitle,
    artistName: trackArtist,
    artistSpotifyId: track.artistSpotifyId || "",
    albumName: track.albumName || "",
    durationMs: track.durationMs || 0,
    popularity: track.popularity || 50,
    previewUrl: track.previewUrl || null,
    imageUrl: trackCover,
    genres: track.genres || [],
    lyricsPlain: track.lyricsPlain,
    lyricsSynced: track.lyricsSynced,
  };

  return (
    <div
      style={{
        animation: "modularEntrance 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
      className={`w-full flex flex-col gap-2 select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <style dangerouslySetInnerHTML={{ __html: MODULAR_KEYFRAMES }} />

      {/* ISLAND 1: Floating Hologram Song Bar with Spinning Vinyl Disc */}
      <div className="relative rounded-2xl border border-white/20 bg-slate-950/90 backdrop-blur-3xl p-2.5 shadow-[0_12px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(56,189,248,0.12)] flex items-center justify-between gap-3 overflow-hidden group">
        {/* Ambient top neon rim */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/15 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-3 min-w-0">
          {/* Spinning Vinyl Record */}
          <div
            className="relative w-10 h-10 rounded-full bg-zinc-950 border border-white/25 shadow-lg flex items-center justify-center shrink-0"
            style={{ animation: "vinylSpin 5s linear infinite" }}
          >
            <div className="absolute inset-1 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />

            <div className="w-5 h-5 rounded-full overflow-hidden border border-white/40 bg-zinc-800 flex items-center justify-center">
              {trackCover ? (
                <img
                  src={trackCover}
                  alt={trackTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-3 h-3 text-white/70" />
              )}
            </div>
            <div className="absolute w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm" />
          </div>

          {/* Details */}
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate leading-tight tracking-tight">
              {trackTitle}
            </p>
            <p className="text-[10.5px] text-white/60 truncate mt-0.5">
              {trackArtist}
            </p>
          </div>
        </div>

        {/* Live soundwave & optional close X button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-end gap-[2px] h-3 px-1">
            <span className="w-[2px] bg-cyan-400 rounded-full" style={{ animation: "equalizerLive 1.1s infinite ease-in-out" }} />
            <span className="w-[2px] bg-cyan-300 rounded-full" style={{ animation: "equalizerLive 0.8s infinite ease-in-out 0.2s" }} />
            <span className="w-[2px] bg-sky-400 rounded-full" style={{ animation: "equalizerLive 1.3s infinite ease-in-out 0.4s" }} />
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title="Đóng tùy chọn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ISLAND 2: Dual Featured Action Cards (Side-by-Side) */}
      <div className="grid grid-cols-2 gap-2">
        {/* CARD A: Heart / Like */}
        <button
          type="button"
          onClick={handleToggleLike}
          className={`relative rounded-2xl border p-3 flex flex-col justify-between h-[78px] text-left transition-all duration-300 backdrop-blur-2xl cursor-pointer hover:scale-[1.02] active:scale-95 group overflow-hidden ${
            liked
              ? "border-pink-500/50 bg-gradient-to-br from-pink-500/25 via-rose-950/40 to-slate-950/80 shadow-[0_8px_25px_rgba(244,63,94,0.25)]"
              : "border-white/15 bg-gradient-to-br from-white/[0.08] to-slate-950/80 hover:border-pink-500/40 hover:bg-pink-500/10 shadow-lg"
          }`}
        >
          {/* Heart Particles Burst */}
          {heartParticles.map((p) => (
            <span
              key={p.id}
              className="absolute text-pink-400 text-sm pointer-events-none"
              style={{
                left: `${p.left}%`,
                bottom: "20px",
                animation: "heartFloatUp 0.7s ease-out forwards",
              }}
            >
              ❤️
            </span>
          ))}

          <div className="flex items-center justify-between">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110 duration-200 ${
                liked
                  ? "bg-pink-500 text-white border-pink-400 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                  : "bg-white/10 text-pink-300 border-white/15 group-hover:border-pink-500/40"
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-white" : ""}`} />
            </div>
            {liked && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-pink-500/30 border border-pink-400/40 text-pink-200">
                ĐÃ LƯU
              </span>
            )}
          </div>

          <div>
            <p className="text-[12px] font-bold text-white group-hover:text-pink-200 transition-colors">
              {liked ? "Bỏ thích" : "Yêu thích"}
            </p>
            <p className="text-[9.5px] text-white/50">
              {liked ? "Trong Thư viện" : "Thêm vào Yêu thích"}
            </p>
          </div>
        </button>

        {/* CARD B: Lyrics / Karaoke */}
        <button
          type="button"
          onClick={handleViewLyrics}
          className="relative rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.08] via-purple-950/30 to-slate-950/80 hover:border-purple-500/40 hover:bg-purple-500/15 p-3 flex flex-col justify-between h-[78px] text-left transition-all duration-300 backdrop-blur-2xl cursor-pointer hover:scale-[1.02] active:scale-95 group overflow-hidden shadow-lg hover:shadow-[0_8px_25px_rgba(168,85,247,0.25)]"
        >
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-12 duration-200 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              <Mic2 className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-200 animate-pulse">
              REALTIME
            </span>
          </div>

          <div>
            <p className="text-[12px] font-bold text-white group-hover:text-purple-200 transition-colors">
              Xem Lời Bài Hát
            </p>
            <p className="text-[9.5px] text-white/50">
              Lyrics chạy theo nhạc
            </p>
          </div>
        </button>
      </div>

      {/* ISLAND 3: Floating Action Pods Dock */}
      <div className="rounded-2xl border border-white/15 bg-slate-950/90 backdrop-blur-3xl p-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.7)] flex items-center justify-between gap-1.5">
        {/* Orb 1: Playlist Modal */}
        <button
          type="button"
          onClick={handleOpenPlaylistModal}
          className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl hover:bg-cyan-500/15 border border-transparent hover:border-cyan-500/30 transition-all duration-200 group cursor-pointer active:scale-95"
          title="Thêm vào Playlist"
        >
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(56,189,248,0.4)]">
            <ListPlus className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-medium text-white/70 group-hover:text-cyan-200 mt-1 truncate">
            Playlist
          </span>
        </button>

        {/* Orb 2: Add to Queue */}
        <button
          type="button"
          onClick={handleAddToQueue}
          className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 transition-all duration-200 group cursor-pointer active:scale-95"
          title="Thêm vào danh sách chờ"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/25 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(245,158,11,0.4)]">
            <ListMusic className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-medium text-white/70 group-hover:text-amber-200 mt-1 truncate">
            Hàng chờ
          </span>
        </button>

        {/* Orb 3: Share link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl hover:bg-emerald-500/15 border border-transparent hover:border-emerald-500/30 transition-all duration-200 group cursor-pointer active:scale-95"
          title="Sao chép liên kết"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.4)]">
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="text-[10px] font-medium text-white/70 group-hover:text-emerald-200 mt-1 truncate">
            {copied ? "Đã copy" : "Chia sẻ"}
          </span>
        </button>

        {/* Optional: Remove from current playlist */}
        {onRemoveFromPlaylist && (
          <button
            type="button"
            onClick={handleRemove}
            className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl hover:bg-red-500/20 border border-transparent hover:border-red-500/30 transition-all duration-200 group cursor-pointer active:scale-95"
            title="Xóa khỏi playlist"
          >
            <div className="w-7 h-7 rounded-lg bg-red-500/15 text-red-400 border border-red-500/25 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(239,68,68,0.4)]">
              <Trash2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-medium text-red-300 mt-1 truncate">
              Xóa
            </span>
          </button>
        )}
      </div>

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        track={normalizedForPlaylist}
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        onTrackAdded={() => {
          showToast("Đã thêm bài hát vào playlist! 🎶");
          window.dispatchEvent(
            new CustomEvent("moodify-playlist-updated", {
              detail: { trackSpotifyId },
            })
          );
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 rounded-full bg-slate-950/95 border border-cyan-400/30 text-white text-xs font-semibold shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(56,189,248,0.25)] backdrop-blur-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>,
          document.body
        )}
    </div>
  );
}

/**
 * Standard Standalone TrackActionMenu (using dropdown ChevronDown button).
 */
export default function TrackActionMenu({
  track,
  isLiked: initialLiked,
  onLikeChange,
  onShowLyrics,
  onRemoveFromPlaylist,
  className = "",
  iconClassName = "",
}: TrackActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 286;
      const menuHeight = 280;

      let left = rect.right - menuWidth;
      if (left < 16) left = 16;
      if (left + menuWidth > window.innerWidth - 16) {
        left = window.innerWidth - menuWidth - 16;
      }

      let top = rect.bottom + 8;
      if (top + menuHeight > window.innerHeight - 16) {
        top = rect.top - menuHeight - 8;
      }
      if (top < 16) top = 16;

      setMenuCoords({ top, left });
      setIsOpen(true);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MODULAR_KEYFRAMES }} />

      {/* Dropdown Chevron Button (replacing 3-dots) */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleMenu}
        className={`relative p-1.5 rounded-full transition-all duration-300 cursor-pointer ${
          isOpen
            ? "text-cyan-300 bg-cyan-500/20 rotate-180 scale-110 shadow-[0_0_14px_rgba(56,189,248,0.4)] border border-cyan-400/40"
            : "text-white/40 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95"
        } ${className}`}
        title={isOpen ? "Đóng tùy chọn" : "Mở rộng tùy chọn bài hát"}
        aria-label="Tùy chọn bài hát"
      >
        <ChevronDown
          className={`w-4 h-4 pointer-events-none transition-transform duration-300 ${iconClassName}`}
          strokeWidth={2}
        />
      </button>

      {/* Backdrop catcher */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9990] bg-black/15 backdrop-blur-[1.5px] transition-opacity"
            onClick={() => setIsOpen(false)}
          />,
          document.body
        )}

      {/* Floating HUD Action Cluster (if rendered in floating mode) */}
      {isOpen &&
        menuCoords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
            }}
            className="z-[9999] w-[286px] pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <TrackInlineActions
              track={track}
              isLiked={initialLiked}
              onLikeChange={onLikeChange}
              onShowLyrics={onShowLyrics}
              onRemoveFromPlaylist={onRemoveFromPlaylist}
              onClose={() => setIsOpen(false)}
            />
          </div>,
          document.body
        )}
    </>
  );
}
