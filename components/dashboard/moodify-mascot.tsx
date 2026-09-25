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
  isVip?: boolean;
}

export default function MoodifyMascot({
  className = "",
  size = 56,
  mascotId: propMascotId,
  onClick,
  showBadge = true,
  isVip: propIsVip,
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
  const isVip = propIsVip !== undefined ? propIsVip : Boolean(activeMascot.isVip);

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
              <span>
                {activeMascot.name} {isVip ? "• Linh vật VIP 👑" : ""} • Nhấp để mở tài khoản & đổi linh vật
              </span>
            </>
          )}
        </div>
      )}

      {/* Pill Wrapper around the Mascot */}
      <div
        onClick={onClick}
        className={`relative flex items-center justify-center p-1 rounded-full transition-all duration-300 group cursor-pointer active:scale-95 ${
          isVip
            ? "border-2 border-amber-400/90 bg-gradient-to-b from-amber-500/20 via-slate-950 to-black shadow-[0_0_22px_rgba(245,158,11,0.5),inset_0_0_12px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.8),inset_0_0_16px_rgba(245,158,11,0.45)] hover:border-yellow-300"
            : "border border-white/12 bg-white/[0.05] backdrop-blur-md hover:bg-white/[0.12] hover:border-cyan-400/50 shadow-lg"
        }`}
      >
        {/* Ambient Glow */}
        <div
          className={`absolute inset-0 rounded-full blur-md pointer-events-none transition-all duration-500 ${
            isVip
              ? "bg-gradient-to-r from-amber-500/40 via-yellow-400/40 to-amber-600/40 opacity-90"
              : isPlaying
              ? "bg-cyan-500/35 opacity-100"
              : "bg-purple-500/25 opacity-50 group-hover:opacity-100"
          }`}
        />

        {/* VIP Crown perched on top */}
        {isVip && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center pointer-events-none filter drop-shadow-[0_2px_6px_rgba(245,158,11,0.9)] animate-pulse">
            <span className="text-[14px] leading-none select-none">👑</span>
          </div>
        )}

        {/* Interactive Mascot */}
        <div
          className="relative select-none"
          title={`${activeMascot.name} ${isVip ? "• Linh vật VIP" : ""} • Nhấp để mở menu tài khoản`}
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
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow-md animate-bounce z-20 ${
              isVip
                ? "bg-amber-400 text-slate-950 shadow-amber-500/60"
                : "bg-cyan-400 text-black shadow-cyan-500/50"
            }`}
          >
            ♫
          </div>
        )}

        {/* Bottom VIP Pill */}
        {isVip && !isPlaying && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-20 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-[8px] font-black tracking-wider uppercase shadow-md shadow-amber-500/60 pointer-events-none border border-amber-200">
            VIP
          </div>
        )}
      </div>
    </div>
  );
}
