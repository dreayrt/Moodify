"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePlayer } from "./player-context";

// Dynamic import with ssr: false to guarantee clean client-only mounting
const MascotComponent = dynamic(
  () => import("page-mascot").then((mod) => mod.Mascot),
  {
    ssr: false,
    loading: () => (
      <div className="w-[48px] h-[48px] rounded-full bg-white/5 animate-pulse flex items-center justify-center">
        <span className="text-xl">🐨</span>
      </div>
    ),
  }
);

interface MoodifyMascotProps {
  className?: string;
  size?: number;
}

export default function MoodifyMascot({ className = "", size = 68 }: MoodifyMascotProps) {
  const [mounted, setMounted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const { isPlaying, currentTrack } = usePlayer();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`relative flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute -bottom-10 right-0 whitespace-nowrap px-3 py-1 rounded-full bg-slate-950/95 border border-white/15 text-[11px] font-medium text-white/90 shadow-2xl backdrop-blur-md pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5">
          {isPlaying ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Đang chill cùng bạn 🎵</span>
            </>
          ) : (
            <>
              <span>Chạm để chọc tui nha! 🐨</span>
            </>
          )}
        </div>
      )}

      {/* Pill Wrapper around the Mascot */}
      <div className="relative flex items-center p-1 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-md hover:bg-white/[0.1] hover:border-cyan-400/40 transition-all duration-200 shadow-md group">
        {/* Ambient Glow */}
        <div
          className={`absolute inset-0 rounded-full blur-md pointer-events-none transition-all duration-500 ${
            isPlaying
              ? "bg-cyan-500/30 opacity-100"
              : "bg-purple-500/20 opacity-40 group-hover:opacity-100"
          }`}
        />

        {/* Interactive Mascot */}
        <div
          className="relative cursor-pointer select-none active:scale-90 transition-transform"
          title="Koala Buddy • Chạm để chọc tui nha!"
        >
          <MascotComponent
            directions="/mascots/koala-directions.webp"
            reactions="/mascots/koala-reactions.webp"
            size={size}
            label="Koala Moodify Buddy"
          />
        </div>

        {/* Music badge indicator when playing */}
        {isPlaying && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[9px] font-bold shadow-md shadow-cyan-500/50 animate-bounce">
            ♫
          </div>
        )}
      </div>
    </div>
  );
}
