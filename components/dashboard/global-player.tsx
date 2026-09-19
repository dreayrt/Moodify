"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Repeat,
  Shuffle,
  Music2,
} from "lucide-react";
import { usePlayer } from "./player-context";
import { addToLibrary, removeFromLibrary, isTrackInLibrary } from "@/lib/api-client";
import TrackActionMenu from "./track-action-menu";

function formatSeconds(sec: number): string {
  if (!sec || isNaN(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GlobalPlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
  } = usePlayer();

  const [liked, setLiked] = useState(false);

  // Check liked status when track changes
  React.useEffect(() => {
    if (!currentTrack?.spotifyId) return;
    let cancelled = false;
    isTrackInLibrary(currentTrack.spotifyId)
      .then((res) => {
        if (!cancelled) setLiked(res);
      })
      .catch(() => {
        if (!cancelled) setLiked(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.spotifyId]);

  // Listen for global library updates (e.g. liked/unliked from 3-dots menu or search)
  React.useEffect(() => {
    const handleLibraryUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackSpotifyId: string; liked: boolean }>;
      if (customEvent.detail && currentTrack?.spotifyId && customEvent.detail.trackSpotifyId === currentTrack.spotifyId) {
        setLiked(customEvent.detail.liked);
      }
    };
    window.addEventListener("moodify-library-updated", handleLibraryUpdate);
    return () => {
      window.removeEventListener("moodify-library-updated", handleLibraryUpdate);
    };
  }, [currentTrack?.spotifyId]);

  const handleToggleLike = async () => {
    if (!currentTrack?.spotifyId) return;
    const nextState = !liked;
    setLiked(nextState);
    try {
      if (nextState) {
        await addToLibrary(currentTrack.spotifyId);
      } else {
        await removeFromLibrary(currentTrack.spotifyId);
      }
      window.dispatchEvent(
        new CustomEvent("moodify-library-updated", {
          detail: { trackSpotifyId: currentTrack.spotifyId, liked: nextState },
        })
      );
    } catch (err) {
      console.error("Failed to toggle like:", err);
      setLiked(!nextState);
    }
  };

  if (!currentTrack) {
    return null;
  }

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seek(ratio * duration);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 md:px-8 py-2.5 bg-black/90 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Track info */}
        <div className="flex items-center gap-3 w-[220px] md:w-[280px] min-w-0">
          <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden shrink-0 shadow-md bg-slate-900 border border-white/10">
            {currentTrack.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.imageUrl}
                alt={currentTrack.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/60 to-cyan-900/60">
                <Music2 className="w-5 h-5 text-cyan-400" />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-0.5">
                <div className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse" />
                <div className="w-1 h-5 bg-cyan-300 rounded-full animate-pulse delay-75" />
                <div className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse delay-150" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-slate-100 text-sm md:text-base leading-snug truncate">
              {currentTrack.name}
            </h4>
            <p className="text-xs text-slate-400 leading-tight truncate mt-0.5">
              {currentTrack.artistName}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleLike}
            className={`p-1.5 rounded-full hover:bg-white/5 transition-colors shrink-0 ${
              liked ? "text-red-500" : "text-slate-400 hover:text-slate-200"
            }`}
            aria-label="Like track"
          >
            <Heart className="w-4 h-4" fill={liked ? "currentColor" : "none"} />
          </button>

          <TrackActionMenu
            track={currentTrack}
            isLiked={liked}
            onLikeChange={setLiked}
          />
        </div>

        {/* Center player controls & progress bar */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1">
          <div className="flex items-center gap-3 md:gap-5">
            <button
              type="button"
              className="hidden sm:block text-slate-400 hover:text-slate-200 transition-colors p-1"
              aria-label="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={prevTrack}
              className="text-slate-300 hover:text-white transition-colors p-1"
              aria-label="Previous track"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white text-black hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg transition-transform"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={nextTrack}
              className="text-slate-300 hover:text-white transition-colors p-1"
              aria-label="Next track"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
            <button
              type="button"
              className="hidden sm:block text-slate-400 hover:text-slate-200 transition-colors p-1"
              aria-label="Repeat"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Scrub bar */}
          <div className="w-full flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 w-9 text-right select-none">
              {formatSeconds(currentTime)}
            </span>
            <div
              onClick={handleSeekClick}
              className="relative flex-1 h-1.5 bg-white/15 rounded-full cursor-pointer group py-2 -my-2 flex items-center"
            >
              <div
                className="h-1.5 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full group-hover:h-2 transition-all relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow transition-opacity" />
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 w-9 select-none">
              {formatSeconds(duration)}
            </span>
          </div>
        </div>

        {/* Right side: Volume */}
        <div className="hidden md:flex items-center justify-end gap-2.5 w-[180px]">
          <button
            type="button"
            onClick={toggleMute}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-cyan-400"
            aria-label="Volume slider"
          />
        </div>
      </div>
    </div>
  );
}
