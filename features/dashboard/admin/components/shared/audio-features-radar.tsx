"use client";

import React from "react";

type AudioFeaturesRadarProps = {
  bpm: number;
  energy: number; // 0.0 - 1.0
  valence: number; // 0.0 - 1.0
  danceability: number; // 0.0 - 1.0
  acousticness: number; // 0.0 - 1.0
  size?: number;
  className?: string;
};

export function AudioFeaturesRadar({
  bpm,
  energy,
  valence,
  danceability,
  acousticness,
  size = 220,
  className = "",
}: AudioFeaturesRadarProps) {
  // Normalize BPM to 0.1 - 1.0 range (base 60 to 180)
  const normalizedBpm = Math.min(1, Math.max(0.1, (bpm - 60) / 120));

  const axes = [
    { label: "Energy", value: Math.max(0.05, Math.min(1, energy)), display: `${Math.round(energy * 100)}%` },
    { label: "Valence", value: Math.max(0.05, Math.min(1, valence)), display: `${Math.round(valence * 100)}%` },
    { label: "Dance", value: Math.max(0.05, Math.min(1, danceability)), display: `${Math.round(danceability * 100)}%` },
    { label: "Acoustic", value: Math.max(0.05, Math.min(1, acousticness)), display: `${Math.round(acousticness * 100)}%` },
    { label: "BPM", value: normalizedBpm, display: `${Math.round(bpm)}` },
  ];

  const total = axes.length;
  const cx = 110;
  const cy = 110;
  const maxRadius = 75;

  // Calculate coordinates on a pentagon
  const getCoordinates = (value: number, index: number) => {
    // Start from top (-Math.PI / 2)
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = maxRadius * value;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Concentric polygon grids (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map((lvl) => {
    return axes
      .map((_, i) => {
        const { x, y } = getCoordinates(lvl, i);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  });

  // Data polygon points
  const dataPoints = axes.map((item, i) => getCoordinates(item.value, i));
  const dataPolygonString = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox="0 0 220 220"
        width={size}
        height={size}
        className="overflow-visible filter drop-shadow-[0_4px_16px_rgba(0,242,254,0.15)]"
      >
        <defs>
          <linearGradient id="radarFillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff7a2c" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="radarStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" />
            <stop offset="100%" stopColor="#ff7a2c" />
          </linearGradient>
        </defs>

        {/* Concentric grid lines */}
        {gridPolygons.map((poly, idx) => (
          <polygon
            key={idx}
            points={poly}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
          />
        ))}

        {/* Spoke lines */}
        {axes.map((_, i) => {
          const { x, y } = getCoordinates(1.0, i);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          );
        })}

        {/* Data area polygon */}
        <polygon
          points={dataPolygonString}
          fill="url(#radarFillGrad)"
          stroke="url(#radarStrokeGrad)"
          strokeWidth="2"
        />

        {/* Vertex points & Labels */}
        {dataPoints.map((point, i) => {
          // Label coordinate slightly outside 1.0 radius
          const labelCoord = getCoordinates(1.22, i);
          return (
            <g key={i}>
              {/* Glowing point */}
              <circle
                cx={point.x}
                cy={point.y}
                r="3.5"
                fill="#ffffff"
                stroke="#00f2fe"
                strokeWidth="2"
                className="animate-pulse"
              />

              {/* Text label */}
              <text
                x={labelCoord.x}
                y={labelCoord.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-white/60 font-mono text-[9px] uppercase tracking-wider font-semibold"
              >
                {axes[i].label}
              </text>
              <text
                x={labelCoord.x}
                y={labelCoord.y + 11}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-[#00f2fe] font-mono text-[9px] font-bold"
              >
                {axes[i].display}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
