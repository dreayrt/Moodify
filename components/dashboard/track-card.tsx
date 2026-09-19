"use client";

import { Heart, Play, Clock, ListPlus } from "lucide-react";
import { Track } from "@/lib/api-client";
import { useState } from "react";
import AddToPlaylistModal from "./add-to-playlist-modal";
import TrackActionMenu from "./track-action-menu";

type TrackCardProps = {
  track: Track;
  isLiked?: boolean;
  onLike?: () => void;
  onPlay?: () => void;
  onAddToPlaylist?: (track: Track) => void;
  showAddedDate?: boolean;
  addedAt?: string;
};

export default function TrackCard({
  track,
  isLiked = false,
  onLike,
  onPlay,
  onAddToPlaylist,
  showAddedDate = false,
  addedAt,
}: TrackCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div
      className="group relative rounded-lg border border-slate-800/50 bg-slate-900/40 p-4 transition-all hover:bg-slate-900/60 hover:border-slate-700"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex gap-4">
        {/* Album Art */}
        <div className="relative flex-shrink-0">
          <div className="h-16 w-16 rounded-md bg-slate-800 overflow-hidden">
            {track.imageUrl ? (
              <img
                src={track.imageUrl}
                alt={track.albumName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-600">
                <svg
                  className="h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Play button overlay */}
          {isHovered && onPlay && (
            <button
              onClick={onPlay}
              className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-md transition-opacity"
            >
              <Play className="h-6 w-6 text-white fill-white" />
            </button>
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-slate-100 truncate">
            {track.name}
          </h3>
          <p className="text-xs text-slate-400 truncate mt-1">
            {track.artistName}
          </p>
          {track.albumName && (
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {track.albumName}
            </p>
          )}
          
          {/* Genres */}
          {track.genres && track.genres.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {track.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-0.5 rounded-full bg-slate-800/60 text-[10px] text-slate-400 uppercase tracking-wide"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end justify-between gap-2">
          {/* Like & Add to playlist buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (onAddToPlaylist) {
                  onAddToPlaylist(track);
                } else {
                  setShowPlaylistModal(true);
                }
              }}
              title="Thêm vào playlist"
              className="p-1.5 rounded-full text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
              <ListPlus className="h-4 w-4" />
            </button>

            {onLike && (
              <button
                onClick={onLike}
                title={isLiked ? "Bỏ thích" : "Yêu thích"}
                className={`p-1.5 rounded-full transition-colors ${
                  isLiked
                    ? "text-red-500 hover:text-red-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Heart
                  className="h-4 w-4"
                  fill={isLiked ? "currentColor" : "none"}
                />
              </button>
            )}

            <TrackActionMenu track={track} isLiked={isLiked} />
          </div>

          {/* Duration */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(track.durationMs)}</span>
          </div>

          {/* Added date */}
          {showAddedDate && addedAt && (
            <div className="text-[10px] text-slate-600">
              {formatDate(addedAt)}
            </div>
          )}
        </div>
      </div>

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        track={track}
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
      />
    </div>
  );
}
