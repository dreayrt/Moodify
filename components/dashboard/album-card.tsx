"use client";

import { Disc, Play, Heart, Music, Calendar } from "lucide-react";
import { Album } from "@/lib/api-client";
import { useState } from "react";

type AlbumCardProps = {
  album: Album;
  onClick?: () => void;
  onPlay?: (e: React.MouseEvent) => void;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  isFavorited?: boolean;
};

export default function AlbumCard({
  album,
  onClick,
  onPlay,
  onFavoriteToggle,
  isFavorited = false,
}: AlbumCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const fallbackCover =
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300";
  const displayCover = imgError || !album.coverUrl ? fallbackCover : album.coverUrl;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 transition-all duration-300 hover:bg-slate-900/80 hover:border-slate-700 hover:shadow-xl hover:shadow-cyan-950/20 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Cover Art with Vinyl aesthetic */}
        <div className="relative mb-3 aspect-square rounded-lg overflow-hidden bg-slate-800 shadow-md">
          <img
            src={displayCover}
            alt={album.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Album Badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-cyan-300 flex items-center gap-1">
            <Disc className="w-3 h-3 text-cyan-400 animate-spin-slow" />
            <span>ALBUM</span>
          </div>

          {/* Quick Favorite Button */}
          {onFavoriteToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle(e);
              }}
              className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-colors ${
                isFavorited
                  ? "bg-rose-500/20 text-rose-500 border border-rose-500/40"
                  : "bg-black/60 text-slate-300 hover:text-white border border-white/10 opacity-0 group-hover:opacity-100"
              }`}
              title={isFavorited ? "Bỏ yêu thích" : "Yêu thích album"}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-rose-500" : ""}`} />
            </button>
          )}

          {/* Play Overlay */}
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onPlay) onPlay(e);
                else if (onClick) onClick();
              }}
              className="w-12 h-12 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-lg shadow-cyan-500/30 transition-transform hover:scale-110 active:scale-95"
              title="Phát Album"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </button>
          </div>
        </div>

        {/* Info */}
        <h3 className="font-semibold text-sm text-slate-100 truncate group-hover:text-cyan-400 transition-colors">
          {album.title}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5 truncate">
          {album.authorName || "Nghệ sĩ Moodify"}
        </p>
      </div>

      {/* Footer stats */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1 text-slate-400">
          <Music className="w-3 h-3 text-cyan-400/80" />
          {album.trackCount} bài hát
        </span>
        {album.releaseDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {album.releaseDate.split("-")[0]}
          </span>
        )}
      </div>
    </div>
  );
}
