"use client";

import React, { useMemo, useState } from "react";
import { CatalogTrack } from "../../types";

// ==========================================
// 1. EMOTION DONUT CHART (SVG)
// ==========================================

const VIBE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  Energetic: { label: "Hưng phấn (Energetic)", color: "#ff5500", bg: "bg-[#ff5500]/10", border: "border-[#ff5500]/30" },
  Chill: { label: "Thư thái (Chill)", color: "#00f2fe", bg: "bg-[#00f2fe]/10", border: "border-[#00f2fe]/30" },
  Sadness: { label: "Tâm trạng (Sadness)", color: "#818cf8", bg: "bg-[#818cf8]/10", border: "border-[#818cf8]/30" },
  Focus: { label: "Tập trung (Focus)", color: "#10b981", bg: "bg-[#10b981]/10", border: "border-[#10b981]/30" },
  Romance: { label: "Lãng mạn (Romance)", color: "#f43f5e", bg: "bg-[#f43f5e]/10", border: "border-[#f43f5e]/30" },
};

type EmotionDonutChartProps = {
  tracks: CatalogTrack[];
  size?: number;
};

export function EmotionDonutChart({ tracks, size = 180 }: EmotionDonutChartProps) {
  const [hoveredVibe, setHoveredVibe] = useState<string | null>(null);

  const distribution = useMemo(() => {
    const counts: Record<string, number> = {
      Energetic: 0,
      Chill: 0,
      Sadness: 0,
      Focus: 0,
      Romance: 0,
    };

    tracks.forEach((t) => {
      const v = t.vibeCategory || "Chill";
      if (counts[v] !== undefined) counts[v] += 1;
      else counts.Chill += 1;
    });

    const total = tracks.length || 1;
    let accumulatedAngle = 0;

    return Object.entries(counts).map(([vibe, count]) => {
      const percentage = (count / total) * 100;
      const angle = (count / total) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;
      return {
        vibe,
        count,
        percentage: Math.round(percentage),
        startAngle,
        endAngle: accumulatedAngle,
        config: VIBE_CONFIG[vibe] || VIBE_CONFIG.Chill,
      };
    });
  }, [tracks]);

  // Radius for donut ring
  const r = 62;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* SVG Donut */}
      <div className="relative grid place-items-center shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 160 160" width={size} height={size} className="-rotate-90">
          {/* Background circle track */}
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {distribution.map((item) => {
            const strokeDasharray = `${(item.count / (tracks.length || 1)) * circumference} ${circumference}`;
            const strokeDashoffset = -((item.startAngle / 360) * circumference);

            return (
              <circle
                key={item.vibe}
                cx="80"
                cy="80"
                r={r}
                fill="none"
                stroke={item.config.color}
                strokeWidth={hoveredVibe === item.vibe ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredVibe(item.vibe)}
                onMouseLeave={() => setHoveredVibe(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="font-graphik text-[22px] font-bold text-white tracking-tight">
            {tracks.length}
          </span>
          <span className="text-[10px] font-mono tracking-wider uppercase text-white/50">
            {hoveredVibe ? hoveredVibe : "Bài Hát"}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="flex-1 space-y-2 w-full">
        {distribution.map((item) => (
          <div
            key={item.vibe}
            onMouseEnter={() => setHoveredVibe(item.vibe)}
            onMouseLeave={() => setHoveredVibe(null)}
            className={`p-2.5 rounded-lg border transition cursor-pointer ${
              hoveredVibe === item.vibe
                ? `${item.config.bg} ${item.config.border}`
                : "border-[#1e2330] bg-[#121622]/50 hover:bg-[#161b2a]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: item.config.color }}
                />
                <span className="text-xs font-medium text-zinc-200">
                  {item.config.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-white">
                  {item.count} bài
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {item.percentage}%
                </span>
              </div>
            </div>
            {/* Clean progress bar */}
            <div className="mt-1.5 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.config.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 2. REVENUE VELOCITY CHART (SVG Area Chart)
// ==========================================

export function RevenueVelocityChart() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = [
    { day: "T2", fullDay: "Thứ Hai", streams: 124, revenue: 18.5 },
    { day: "T3", fullDay: "Thứ Ba", streams: 142, revenue: 22.0 },
    { day: "T4", fullDay: "Thứ Tư", streams: 138, revenue: 20.8 },
    { day: "T5", fullDay: "Thứ Năm", streams: 165, revenue: 26.5 },
    { day: "T6", fullDay: "Thứ Sáu", streams: 198, revenue: 34.0 },
    { day: "T7", fullDay: "Thứ Bảy", streams: 245, revenue: 42.5 },
    { day: "CN", fullDay: "Chủ Nhật", streams: 280, revenue: 48.0 },
  ];

  // SVG dimensions
  const width = 460;
  const height = 140;
  const padX = 30;
  const padY = 20;

  const maxStreams = 300;
  const stepX = (width - padX * 2) / (data.length - 1);

  // Calculate points
  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = height - padY - (d.streams / maxStreams) * (height - padY * 2);
    return {
      x,
      y,
      day: d.day,
      fullDay: d.fullDay,
      streams: d.streams,
      revenue: d.revenue,
    };
  });

  // Path commands
  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

  const hoveredPoint =
    hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < points.length
      ? points[hoveredIndex]
      : null;

  return (
    <div className="w-full relative">
      {/* Legend */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[#ff5500]" />
            <span className="text-zinc-300 font-medium">Lượt stream tuần (nghìn lượt)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-zinc-500" />
            <span className="text-zinc-400">Doanh thu dự phóng</span>
          </div>
        </div>
        <span className="font-mono text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          +28.4% tuần này
        </span>
      </div>

      {/* Floating Tooltip */}
      {hoveredPoint && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-xl border border-[#222432] bg-[#12131a]/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-md transition-all duration-150 min-w-[140px]"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${Math.max(10, (hoveredPoint.y / height) * 100 - 10)}%`,
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1.5">
            <span className="font-bold text-white text-xs">{hoveredPoint.fullDay}</span>
            <span className="font-mono text-[10px] text-zinc-400 font-semibold">({hoveredPoint.day})</span>
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between gap-3 text-zinc-300">
              <span className="text-zinc-400">Streams:</span>
              <span className="font-bold text-[#ff5500]">{hoveredPoint.streams.toLocaleString()}k</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-zinc-300">
              <span className="text-zinc-400">Dự phóng:</span>
              <span className="font-bold text-zinc-200">{hoveredPoint.revenue}M đ</span>
            </div>
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-36 overflow-visible select-none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="streamGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff5500" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#ff5500" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = height - padY - ratio * (height - padY * 2);
          return (
            <line
              key={ratio}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeDasharray="3 3"
            />
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#streamGrad)" />

        {/* Line stroke */}
        <path
          d={pathD}
          fill="none"
          stroke="#ff5500"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Vertical Guide Line on Hover */}
        {hoveredPoint && (
          <line
            x1={hoveredPoint.x}
            y1={padY}
            x2={hoveredPoint.x}
            y2={height - padY}
            stroke="#ff5500"
            strokeDasharray="3 3"
            strokeWidth="1.5"
            opacity="0.8"
          />
        )}

        {/* Points & Labels */}
        {points.map((p, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <g key={i}>
              {/* Highlight Aura if hovered */}
              {isHovered && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="9"
                  fill="#ff5500"
                  opacity="0.3"
                  className="animate-ping"
                />
              )}
              {/* Point circle */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5.5 : 4}
                fill={isHovered ? "#ff5500" : "#08090c"}
                stroke={isHovered ? "#ffffff" : "#ff5500"}
                strokeWidth={isHovered ? 2.5 : 2}
                className="transition-all duration-200"
              />
              {/* Day label */}
              <text
                x={p.x}
                y={height - 4}
                textAnchor="middle"
                className={`font-mono text-[10px] transition-colors ${
                  isHovered ? "fill-white font-bold" : "fill-zinc-400"
                }`}
              >
                {p.day}
              </text>
            </g>
          );
        })}

        {/* Interactive Invisible Hitbox Columns for Smooth Hover */}
        {points.map((p, i) => (
          <rect
            key={`hitbox-${i}`}
            x={p.x - stepX / 2}
            y={0}
            width={stepX}
            height={height}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredIndex(i)}
          />
        ))}
      </svg>
    </div>
  );
}

// ==========================================
// 3. DATABASE TELEMETRY CARD (POLYGLOT ARCHITECTURE)
// ==========================================

type DatabaseTelemetryCardProps = {
  usersCount?: number;
  tracksCount?: number;
  artistsCount?: number;
  packagesCount?: number;
};

export function DatabaseTelemetryCard({
  usersCount = 189,
  tracksCount = 147,
  artistsCount = 183,
  packagesCount = 6,
}: DatabaseTelemetryCardProps) {
  return (
    <div className="space-y-4">
      {/* 2 Database Nodes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Node 1: Core Transactional & User Cluster */}
        <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg border border-[#ff5500]/30 bg-[#ff5500]/10 text-[#ff5500] font-mono font-bold text-xs">
                  AUTH
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-base font-bold text-white tracking-tight">Phân Hệ Tài Khoản &amp; Giao Dịch</h5>
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold bg-[#ff5500]/15 text-[#ff8c42] border border-[#ff5500]/30">
                      Bảo Toàn Giao Dịch
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                    Hệ thống: <span className="text-white font-semibold">Moodify Core Storage</span> · Trạng thái: <span className="text-emerald-300 font-semibold">Đồng bộ liên tục</span>
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Trực Tuyến
              </span>
            </div>

            {/* Purpose & Responsibility */}
            <div className="mt-4 p-3 rounded-lg border border-[#222432] bg-[#171822] text-xs leading-relaxed text-zinc-300">
              <span className="text-[#ff5500] font-bold block mb-1">Nhiệm Vụ Chính:</span>
              Quản lý tài khoản người dùng, phân quyền truy cập quản trị viên và nghệ sĩ, quản lý bảng giá các gói thuê bao và đối soát giao dịch thanh toán trực tuyến.
            </div>

            {/* Managed Entities */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[#0e0f14] p-2.5 border border-[#222432]">
                <span className="text-[10px] font-mono text-zinc-400 block uppercase font-medium">Tài Khoản Người Dùng</span>
                <span className="font-bold text-white text-sm mt-0.5 block">{usersCount} tài khoản</span>
                <span className="text-[10px] text-zinc-500 font-mono">Người dùng &amp; phân quyền</span>
              </div>
              <div className="rounded-lg bg-[#0e0f14] p-2.5 border border-[#222432]">
                <span className="text-[10px] font-mono text-zinc-400 block uppercase font-medium">Gói Cước &amp; Thuê Bao</span>
                <span className="font-bold text-[#ff8c42] text-sm mt-0.5 block">{packagesCount} gói đang bán</span>
                <span className="text-[10px] text-zinc-500 font-mono">Gói dịch vụ &amp; thuê bao</span>
              </div>
              <div className="rounded-lg bg-[#0e0f14] p-2.5 border border-[#222432]">
                <span className="text-[10px] font-mono text-zinc-400 block uppercase font-medium">Bản Quyền &amp; Hợp Đồng</span>
                <span className="font-bold text-white text-sm mt-0.5 block">147 bản ghi phép</span>
                <span className="text-[10px] text-zinc-500 font-mono">Hợp đồng &amp; giấy phép</span>
              </div>
              <div className="rounded-lg bg-[#0e0f14] p-2.5 border border-[#222432]">
                <span className="text-[10px] font-mono text-zinc-400 block uppercase font-medium">Giao Dịch Thanh Toán</span>
                <span className="font-bold text-emerald-400 text-sm mt-0.5 block">Cổng Trực Tuyến</span>
                <span className="text-[10px] text-zinc-500 font-mono">Lịch sử thanh toán</span>
              </div>
            </div>
          </div>
        </div>

        {/* Node 2: Catalog & Streaming Cluster */}
        <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg border border-[#ff5500]/30 bg-[#ff5500]/10 text-[#ff5500] font-mono font-bold text-xs">
                  SONG
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-base font-bold text-white tracking-tight">Phân Hệ Âm Nhạc &amp; Streaming</h5>
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold bg-[#ff5500]/15 text-[#ff8c42] border border-[#ff5500]/30">
                      Truy Xuất Nhanh
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                    Hệ thống: <span className="text-white font-semibold">Moodify Music Store</span> · Trạng thái: <span className="text-emerald-300 font-semibold">Sẵn sàng phục vụ</span>
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Trực Tuyến
              </span>
            </div>

            {/* Purpose & Responsibility */}
            <div className="mt-4 p-3 rounded-lg border border-[#222432] bg-[#171822] text-xs leading-relaxed text-zinc-300">
              <span className="text-[#ff5500] font-bold block mb-1">Nhiệm Vụ Chính:</span>
              Lưu trữ danh mục bài hát, thông tin nghệ sĩ, dữ liệu phát trực tuyến âm thanh chất lượng cao và các thông số âm học DSP phục vụ trải nghiệm thính giác tối ưu.
            </div>

            {/* Managed Collections */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[#0e0f14] p-2.5 border border-[#222432]">
                <span className="text-[10px] font-mono text-zinc-400 block uppercase font-medium">Kho Bài Hát Streaming</span>
                <span className="font-bold text-white text-sm mt-0.5 block">{tracksCount} bài hát</span>
                <span className="text-[10px] text-zinc-500 font-mono">Nhạc 320kbps &amp; lời bài hát</span>
              </div>
              <div className="rounded-lg bg-[#0e0f14] p-2.5 border border-[#222432]">
                <span className="text-[10px] font-mono text-zinc-400 block uppercase font-medium">Hồ Sơ Nghệ Sĩ</span>
                <span className="font-bold text-white text-sm mt-0.5 block">{artistsCount} nghệ sĩ</span>
                <span className="text-[10px] text-zinc-500 font-mono">Tiểu sử &amp; ảnh đại diện</span>
              </div>
              <div className="rounded-lg bg-[#0e0f14] p-2.5 border border-[#222432]">
                <span className="text-[10px] font-mono text-zinc-400 block uppercase font-medium">Album &amp; Tuyển Tập</span>
                <span className="font-bold text-white text-sm mt-0.5 block">128 phát hành</span>
                <span className="text-[10px] text-zinc-500 font-mono">Đĩa đơn, EP &amp; album</span>
              </div>
              <div className="rounded-lg bg-[#0e0f14] p-2.5 border border-[#222432]">
                <span className="text-[10px] font-mono text-zinc-400 block uppercase font-medium">Đặc Trưng Âm Học</span>
                <span className="font-bold text-[#ff5500] text-sm mt-0.5 block">DSP &amp; Beats</span>
                <span className="text-[10px] text-zinc-500 font-mono">Nhịp điệu &amp; năng lượng</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logical Bridge Box */}
      <div className="rounded-xl border border-[#222432] bg-[#12131a] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30 px-2 py-0.5 font-mono text-[11px] font-bold uppercase">
            ĐỒNG BỘ DỮ LIỆU
          </span>
          <span className="text-zinc-300 font-medium">
            Liên kết dữ liệu nghệ sĩ và kho bài hát thông qua mã định danh hệ thống:
          </span>
          <code className="font-mono text-white bg-black/60 px-2.5 py-1 rounded border border-[#222432] text-xs">
            Hồ Sơ Nghệ Sĩ ⟷ Danh Mục Bài Hát ⟷ Quản Lý Tác Quyền
          </code>
        </div>
        <span className="text-zinc-400 text-xs shrink-0 font-medium">
          Đảm bảo tính đồng nhất dữ liệu và truyền phát âm thanh mượt mà
        </span>
      </div>
    </div>
  );
}
