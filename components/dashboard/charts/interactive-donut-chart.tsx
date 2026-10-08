"use client";

import React, { useState, useMemo } from "react";

export interface DonutSliceItem {
  id: string;
  label: string;
  value: number;
  color: string;
  sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface InteractiveDonutChartProps {
  title?: string;
  subtitle?: string;
  data: DonutSliceItem[];
  centerLabel?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function InteractiveDonutChart({
  title,
  subtitle,
  data,
  centerLabel = "Tổng cộng",
  size = 190,
  strokeWidth = 26,
  className = "",
}: InteractiveDonutChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + (item.value || 0), 0) || 1;
  }, [data]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke offsets
  let accumulatedAngle = 0;
  const slices = data.map((item) => {
    const percentage = item.value / total;
    const strokeDasharray = `${percentage * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += percentage;

    return {
      ...item,
      percentage: Math.round(percentage * 1000) / 10,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSlice = hoveredId ? slices.find((s) => s.id === hoveredId) : null;

  return (
    <div
      className={`rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-xl space-y-4 select-none ${className}`}
    >
      {/* Header */}
      {title && (
        <div className="border-b border-white/[0.06] pb-3">
          <h4 className="font-graphik text-sm font-bold text-white tracking-tight">
            {title}
          </h4>
          {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
      )}

      {/* Donut & Legend Container */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* SVG Circle */}
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 overflow-visible"
          >
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {slices.map((slice) => {
              const isHovered = hoveredId === slice.id;
              return (
                <circle
                  key={slice.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredId(slice.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 8px ${slice.color}80)` : "none",
                    opacity: hoveredId && !isHovered ? 0.45 : 1,
                  }}
                />
              );
            })}
          </svg>

          {/* Donut Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
            {activeSlice ? (
              <>
                <span className="font-mono text-xl font-bold text-white tracking-tight">
                  {activeSlice.percentage}%
                </span>
                <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[85px]">
                  {activeSlice.label}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {activeSlice.value.toLocaleString()}
                </span>
              </>
            ) : (
              <>
                <span className="font-mono text-xl font-bold text-white tracking-tight">
                  {total.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  {centerLabel}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Interactive Legend */}
        <div className="flex-1 w-full space-y-2.5 font-mono text-xs">
          {slices.map((slice) => {
            const isHovered = hoveredId === slice.id;
            const Icon = slice.icon;

            return (
              <div
                key={slice.id}
                onMouseEnter={() => setHoveredId(slice.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isHovered
                    ? "bg-white/[0.06] border-white/20 translate-x-1"
                    : "bg-[#171822]/60 border-white/5 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                    <span className="text-zinc-200 truncate font-semibold text-[11px]">
                      {slice.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-bold">
                    <span className="text-white">{slice.value.toLocaleString()}</span>
                    <span className="text-[11px] text-zinc-400">({slice.percentage}%)</span>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${slice.percentage}%`,
                      backgroundColor: slice.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
