"use client";

import { Users, Play } from "lucide-react";
import { Artist } from "@/lib/api-client";
import { useState } from "react";

type ArtistCardProps = {
  artist: Artist;
  onClick?: () => void;
};

export default function ArtistCard({ artist, onClick }: ArtistCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-slate-900/40 rounded-lg p-6 border border-slate-800/50 hover:bg-slate-900/60 hover:border-slate-700 transition-all duration-200 cursor-pointer"
    >
      {/* Artist image */}
      <div className="relative mb-4 aspect-square rounded-full overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
        {artist.imageUrl ? (
          <img
            src={artist.imageUrl}
            alt={artist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-16 h-16 text-slate-700"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
          </div>
        )}

        {/* Play overlay */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center hover:bg-cyan-400 transition-colors">
              <Play className="w-6 h-6 text-black fill-black ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Artist info */}
      <div className="text-center">
        <h3 className="text-base font-semibold text-slate-100 mb-2 truncate">
          {artist.name}
        </h3>

        {/* Genres */}
        {artist.genres && artist.genres.length > 0 && (
          <p className="text-xs text-slate-400 mb-3 truncate capitalize">
            {artist.genres.slice(0, 2).join(", ")}
          </p>
        )}

        {/* Followers */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Users className="w-3.5 h-3.5" />
          <span>{formatFollowers(artist.followers)} followers</span>
        </div>

        {/* Popularity indicator */}
        {artist.popularity > 0 && (
          <div className="mt-3 flex justify-center">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 w-6 rounded-full ${
                    i < Math.round(artist.popularity / 20)
                      ? "bg-cyan-500"
                      : "bg-slate-800"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
