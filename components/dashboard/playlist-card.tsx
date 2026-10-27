"use client";

import { ListMusic, Play, Music, Lock, Globe } from "lucide-react";
import { Playlist } from "@/lib/api-client";
import { useState } from "react";

type PlaylistCardProps = {
  playlist: Playlist;
  onClick?: () => void;
  onPlay?: (e: React.MouseEvent) => void;
};

export default function PlaylistCard({
  playlist,
  onClick,
  onPlay,
}: PlaylistCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const fallbackCover =
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400";
  const displayCover = imgError || !playlist.coverUrl ? fallbackCover : playlist.coverUrl;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 transition-all duration-300 hover:bg-slate-900/80 hover:border-slate-700 hover:shadow-xl hover:shadow-cyan-950/20 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Cover Art */}
        <div className="relative mb-3 aspect-square rounded-lg overflow-hidden bg-slate-800 shadow-md">
          <img
            src={displayCover}
            alt={playlist.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Playlist Badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-cyan-300 flex items-center gap-1">
            <ListMusic className="w-3 h-3 text-cyan-400" />
            <span>PLAYLIST</span>
          </div>

          {/* Visibility indicator */}
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] text-slate-300 flex items-center gap-1">
            {playlist.isPublic ? (
              <Globe className="w-3 h-3 text-emerald-400" />
            ) : (
              <Lock className="w-3 h-3 text-amber-400" />
            )}
          </div>

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
              title="Phát Playlist"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </button>
          </div>
        </div>

        {/* Info */}
        <h3 className="font-semibold text-sm text-slate-100 truncate group-hover:text-cyan-400 transition-colors">
          {playlist.name}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5 truncate">
          Tạo bởi @{playlist.username}
        </p>
      </div>

      {/* Footer stats */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1 text-slate-400">
          <Music className="w-3 h-3 text-cyan-400/80" />
          {playlist.trackCount || playlist.tracks?.length || 0} bài hát
        </span>
        <span className="text-[10px] text-slate-500">
          {playlist.isPublic ? "Công khai" : "Riêng tư"}
        </span>
      </div>
    </div>
  );
}
