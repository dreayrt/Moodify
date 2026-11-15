"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronRight,
  Heart,
  ListPlus,
  Check,
  Trash2,
  Share2,
  Music,
  X,
} from "lucide-react";
import {
  addToLibrary,
  removeFromLibrary,
  isTrackInLibrary,
  type Track,
} from "@/lib/api-client";
import AddToPlaylistModal from "./add-to-playlist-modal";
import ShareSongCardModal from "./share-song-card-modal";

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
  onRemoveFromPlaylist?: () => void;
  className?: string;
  iconClassName?: string;
}

const MODULAR_KEYFRAMES = `
@keyframes modularEntrance {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

/** Shared song actions for floating menus and inline track drawers. */
export function TrackInlineActions({
  track,
  isLiked: initialLiked,
  onLikeChange,
  onRemoveFromPlaylist,
  onClose,
  onModalOpenChange,
  className = "",
}: {
  track: any;
  isLiked?: boolean;
  onLikeChange?: (isLiked: boolean) => void;
  onRemoveFromPlaylist?: () => void;
  onClose?: () => void;
  onModalOpenChange?: (isOpen: boolean) => void;
  className?: string;
}) {
  const [liked, setLiked] = useState<boolean>(initialLiked ?? false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const isModalOpen = isPlaylistModalOpen || isShareModalOpen;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Keep modal state mounted while suspending the menu's backdrop and dismissal.
  useEffect(() => {
    onModalOpenChange?.(isModalOpen);
  }, [isModalOpen, onModalOpenChange]);

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

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!trackSpotifyId) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    if (onLikeChange) onLikeChange(nextLiked);

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
        display: isModalOpen ? "none" : undefined,
      }}
      role="group"
      aria-label="Thao tác bài hát"
      className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <style dangerouslySetInnerHTML={{ __html: MODULAR_KEYFRAMES }} />

      <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.03] p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
          {trackCover ? (
            <img src={trackCover} alt={trackTitle} className="h-full w-full object-cover" />
          ) : (
            <Music className="h-5 w-5 text-slate-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-5" title={trackTitle}>{trackTitle}</p>
          <p className="mt-0.5 truncate text-xs text-slate-400" title={trackArtist}>{trackArtist}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-400"
            title="Đóng tùy chọn"
            aria-label="Đóng tùy chọn"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-1 p-2">
        <button
          type="button"
          onClick={handleToggleLike}
          aria-pressed={liked}
          className={`group flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-pink-400 ${liked ? "bg-pink-500/10 hover:bg-pink-500/15" : "hover:bg-white/[0.06]"}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-300">
            <Heart className={`h-[18px] w-[18px] ${liked ? "fill-current" : ""}`} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">{liked ? "Bỏ yêu thích" : "Yêu thích"}</span>
            <span className="mt-0.5 block text-[11px] text-slate-400">{liked ? "Đã lưu trong thư viện" : "Lưu vào bài hát yêu thích"}</span>
          </span>
          {liked && <Check className="h-4 w-4 shrink-0 text-pink-300" />}
        </button>

        <button
          type="button"
          onClick={handleOpenPlaylistModal}
          title="Thêm vào Playlist"
          className="group flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
            <ListPlus className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">Thêm vào playlist</span>
            <span className="mt-0.5 block text-[11px] text-slate-400">Chọn hoặc tạo danh sách phát</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-cyan-300" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsShareModalOpen(true);
          }}
          title="Tạo Story & Card bài hát"
          className="group flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-purple-400"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
            <Share2 className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">Tạo Story</span>
            <span className="mt-0.5 block text-[11px] text-slate-400">Chia sẻ bài hát theo cách của bạn</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-purple-300" />
        </button>

        {onRemoveFromPlaylist && (
          <div className="mt-1 border-t border-white/[0.08] pt-1">
            <button
              type="button"
              onClick={handleRemove}
              title="Xóa khỏi playlist"
              className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-red-300 transition-colors hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-red-400"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center"><Trash2 className="h-[18px] w-[18px]" /></span>
              <span className="text-[13px] font-medium">Xóa khỏi playlist</span>
            </button>
          </div>
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

      {/* Share Song Card / Story Modal */}
      <ShareSongCardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        track={{
          spotifyId: trackSpotifyId,
          name: trackTitle,
          artistName: trackArtist,
          albumName: track.albumName || "",
          imageUrl: trackCover,
          durationMs: track.durationMs,
          lyricsPlain: track.lyricsPlain,
          lyricsSynced: track.lyricsSynced,
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
  onRemoveFromPlaylist,
  className = "",
  iconClassName = "",
}: TrackActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ top: 16, left: 16 });

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    if (!isOpen || isChildModalOpen) return;

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
  }, [isOpen, isChildModalOpen]);

  // Measure the redesigned panel so it also fits near screen edges and above the player.
  useLayoutEffect(() => {
    if (!isOpen || isChildModalOpen) return;
    const updatePosition = () => {
      if (!buttonRef.current || !menuRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const { offsetWidth: width, offsetHeight: height } = menuRef.current;
      const left = Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16));
      const below = rect.bottom + 8;
      const top = Math.max(16, Math.min(
        below + height <= window.innerHeight - 16 ? below : rect.top - height - 8,
        window.innerHeight - height - 16,
      ));
      setMenuCoords((previous) => previous.top === top && previous.left === left ? previous : { top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, isChildModalOpen]);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen((previous) => !previous);
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
        aria-expanded={isOpen}
      >
        <ChevronDown
          className={`w-4 h-4 pointer-events-none transition-transform duration-300 ${iconClassName}`}
          strokeWidth={2}
        />
      </button>

      {/* Backdrop catcher */}
      {isOpen && !isChildModalOpen &&
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
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
            }}
            className="z-[9999] w-[304px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <TrackInlineActions
              track={track}
              isLiked={initialLiked}
              onLikeChange={onLikeChange}
              onRemoveFromPlaylist={onRemoveFromPlaylist}
              onClose={() => setIsOpen(false)}
              onModalOpenChange={setIsChildModalOpen}
            />
          </div>,
          document.body
        )}
    </>
  );
}
