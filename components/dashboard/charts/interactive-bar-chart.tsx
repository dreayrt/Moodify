"use client";

import React, { useState } from "react";
import { BarChart3 } from "lucide-react";

export interface BarChartItem {
  label: string;
  value: number;
  secondaryValue?: number;
  sublabel?: string;
  color?: string;
}

interface InteractiveBarChartProps {
  title?: string;
  subtitle?: string;
  data: BarChartItem[];
  valuePrefix?: string;
  valueSuffix?: string;
  defaultColor?: string; // e.g. "#ff5500"
  secondaryColor?: string; // e.g. "#10b981"
  height?: number;
  className?: string;
}

export function InteractiveBarChart({
  title,
  subtitle,
  data,
  valuePrefix = "",
  valueSuffix = "",
  defaultColor = "#ff5500",
  secondaryColor = "#10b981",
  height = 200,
  className = "",
}: InteractiveBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue || 0)), 1);

  return (
    <div
      className={`rounded-2xl border border-[#222432] bg-[#12131a] p-5 lg:p-6 shadow-xl space-y-4 select-none ${className}`}
    >
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h4 className="font-graphik text-base font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#ff5500]" />
              {title}
            </h4>
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      )}

      {/* Bars Chart View */}
      <div className="relative pt-6">
        <div
          className="flex items-end justify-between gap-2.5 sm:gap-4 px-2"
          style={{ height }}
        >
          {data.map((item, idx) => {
            const barHeightPct = Math.max(Math.round((item.value / maxValue) * 100), 6);
            const secHeightPct = item.secondaryValue
              ? Math.max(Math.round((item.secondaryValue / maxValue) * 100), 4)
              : 0;
            const isHovered = hoveredIdx === idx;
            const barColor = item.color || defaultColor;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
              >
                {/* Floating Value Bubble on hover */}
                <div
                  className={`absolute -top-7 z-20 pointer-events-none px-2 py-0.5 rounded-lg bg-[#171822] border border-white/10 text-[10px] font-mono font-bold text-white shadow-xl transition-all ${
                    isHovered ? "opacity-100 scale-100 -translate-y-1" : "opacity-0 scale-95"
                  }`}
                >
                  {valuePrefix}
                  {item.value.toLocaleString()}
                  {valueSuffix}
                </div>

                {/* Bar Pill Container */}
                <div className="w-full max-w-[42px] h-full flex items-end justify-center gap-1">
                  {/* Primary Bar */}
                  <div className="w-full bg-white/[0.04] rounded-t-lg h-full flex items-end overflow-hidden group-hover:bg-white/[0.08] transition-colors">
                    <div
                      style={{ height: `${barHeightPct}%`, backgroundColor: barColor }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isHovered ? "brightness-125 shadow-lg shadow-orange-500/20" : ""
                      }`}
                    />
                  </div>

                  {/* Secondary Bar if present */}
                  {item.secondaryValue !== undefined && (
                    <div className="w-full bg-white/[0.04] rounded-t-lg h-full flex items-end overflow-hidden">
                      <div
                        style={{ height: `${secHeightPct}%`, backgroundColor: secondaryColor }}
                        className="w-full rounded-t-lg transition-all duration-300 opacity-80"
                      />
                    </div>
                  )}
                </div>

                {/* X Axis Label */}
                <div className="mt-2 text-center">
                  <span
                    className={`block text-[11px] font-mono transition-colors truncate max-w-[60px] ${
                      isHovered ? "text-white font-bold" : "text-zinc-400"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.sublabel && (
                    <span className="block text-[9px] text-zinc-500 font-mono">
                      {item.sublabel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
