"use client";

import React from "react";

interface MiniSparklineProps {
  data: number[];
  color?: string; // e.g. "#ff5500", "#10b981", "#38bdf8", "#a855f7"
  height?: number;
  width?: number;
  className?: string;
  fillOpacity?: number;
}

export function MiniSparkline({
  data,
  color = "#ff5500",
  height = 36,
  width = 100,
  className = "",
  fillOpacity = 0.15,
}: MiniSparklineProps) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="opacity-0" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const paddingY = 4;
  const availableHeight = height - paddingY * 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - paddingY - ((val - min) / range) * availableHeight;
    return { x, y };
  });

  // Create smooth Bezier curve path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const controlX = (current.x + next.x) / 2;
    pathD += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  const gradientId = `spark-grad-${Math.abs(data.reduce((a, b) => a + b, 0))}-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Filled Area */}
      <path d={areaD} fill={`url(#${gradientId})`} />

      {/* Smooth Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End Point Glow */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="3"
        fill={color}
        className="animate-pulse"
      />
    </svg>
  );
}
