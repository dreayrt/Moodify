"use client";

import React, { useMemo } from "react";

type WaveformVisualizerProps = {
  trackId?: string;
  isPlaying?: boolean;
  progress?: number; // 0.0 - 1.0
  onSeek?: (progress: number) => void;
  barCount?: number;
  height?: number;
  activeColor?: string;
  inactiveColor?: string;
  className?: string;
};

export function WaveformVisualizer({
  trackId = "default-track",
  isPlaying = false,
  progress = 0.35,
  onSeek,
  barCount = 42,
  height = 38,
  activeColor = "#ff7a2c",
  inactiveColor = "rgba(255, 255, 255, 0.16)",
  className = "",
}: WaveformVisualizerProps) {
  // Deterministic heights generation based on trackId string
  const bars = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < trackId.length; i++) {
      hash = (hash << 5) - hash + trackId.charCodeAt(i);
      hash |= 0;
    }

    const result: number[] = [];
    for (let i = 0; i < barCount; i++) {
      // Natural music waveform envelope (envelope higher in middle, lower at start/end)
      const envelope = Math.sin((i / barCount) * Math.PI) * 0.5 + 0.5;
      const pseudoRand = Math.abs(Math.sin(hash + i * 13.37));
      const normalizedHeight = Math.max(0.15, Math.min(1.0, envelope * 0.4 + pseudoRand * 0.6));
      result.push(normalizedHeight);
    }
    return result;
  }, [trackId, barCount]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(newProgress);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-center gap-[2.5px] cursor-pointer select-none py-1 ${className}`}
      style={{ height: `${height}px` }}
      title="Nhấp chuột để tua đoạn phát"
    >
      {bars.map((barRatio, index) => {
        const barProgress = index / (barCount - 1);
        const isPassed = barProgress <= progress;

        // Animated height when playing
        const currentBarHeight = `${Math.round(barRatio * height)}px`;

        return (
          <div
            key={index}
            className={`w-[3px] rounded-full transition-all duration-150 ${
              isPlaying && isPassed ? "animate-pulse" : ""
            }`}
            style={{
              height: currentBarHeight,
              backgroundColor: isPassed ? activeColor : inactiveColor,
              boxShadow: isPassed ? `0 0 8px ${activeColor}40` : "none",
            }}
          />
        );
      })}
    </div>
  );
}
