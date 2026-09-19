"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePlayer } from "./player-context";
import { useCurrentMascot, getMascotUrls, getMascotById } from "@/lib/mascots";

// Dynamic import with ssr: false to guarantee clean client-only mounting
const MascotComponent = dynamic(
  () => import("page-mascot").then((mod) => mod.Mascot),
  {
    ssr: false,
    loading: () => (
      <div className="w-[52px] h-[52px] rounded-full bg-white/5 animate-pulse flex items-center justify-center">
        <span className="text-xl">🐨</span>
      </div>
    ),
  }
);

interface MoodifyMascotProps {
  className?: string;
  size?: number;
  mascotId?: string;
  onClick?: (e: React.MouseEvent) => void;
  showBadge?: boolean;
}

export default function MoodifyMascot({
  className = "",
  size = 56,
  mascotId: propMascotId,
  onClick,
  showBadge = true,
}: MoodifyMascotProps) {
  const [mounted, setMounted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const { isPlaying } = usePlayer();
  const currentMascotState = useCurrentMascot();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const activeId = propMascotId || currentMascotState.mascotId;
  const activeMascot = getMascotById(activeId);
  const urls = getMascotUrls(activeId);

  return (
    <div
      className={`relative flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute -bottom-9 right-0 whitespace-nowrap px-3 py-1 rounded-full bg-slate-950/95 border border-white/15 text-[11px] font-medium text-white/90 shadow-2xl backdrop-blur-md pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5">
          {isPlaying ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>{activeMascot.name} đang chill cùng bạn 🎵</span>
            </>
          ) : (
            <>
              <span>{activeMascot.name} • Nhấp để mở tài khoản & đổi linh vật</span>
            </>
          )}
        </div>
      )}

      {/* Pill Wrapper around the Mascot */}
      <div
        onClick={onClick}
        className={`relative flex items-center p-1 rounded-full border border-white/12 bg-white/[0.05] backdrop-blur-md hover:bg-white/[0.12] hover:border-cyan-400/50 transition-all duration-300 shadow-lg group cursor-pointer active:scale-95`}
      >
        {/* Ambient Glow */}
        <div
          className={`absolute inset-0 rounded-full blur-md pointer-events-none transition-all duration-500 ${
            isPlaying
              ? "bg-cyan-500/35 opacity-100"
              : "bg-purple-500/25 opacity-50 group-hover:opacity-100"
          }`}
        />

        {/* Interactive Mascot */}
        <div
          className="relative select-none"
          title={`${activeMascot.name} • Nhấp để mở menu tài khoản`}
        >
          <MascotComponent
            key={activeId}
            directions={urls.directions}
            reactions={urls.reactions}
            size={size}
            label={activeMascot.name}
          />
        </div>

        {/* Music badge indicator when playing */}
        {showBadge && isPlaying && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[9px] font-bold shadow-md shadow-cyan-500/50 animate-bounce">
            ♫
          </div>
        )}
      </div>
    </div>
  );
}
