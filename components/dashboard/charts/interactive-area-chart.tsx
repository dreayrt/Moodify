"use client";

import React, { useId, useState, useRef, useMemo } from "react";
import { TrendingUp } from "lucide-react";

export interface AreaChartDataPoint {
  label: string;
  date?: string;
  streams: number;
  completed?: number;
  revenue?: number;
}

interface InteractiveAreaChartProps {
  title?: string;
  subtitle?: string;
  data: AreaChartDataPoint[];
  metricLabel?: string;
  secondaryLabel?: string;
  accentColor?: string; // e.g. "#ff5500"
  secondaryColor?: string; // e.g. "#10b981"
  height?: number;
  activeRange?: "7D" | "30D" | "90D";
  onRangeChange?: (range: "7D" | "30D" | "90D") => void;
  valueUnit?: string;
  formatValue?: (val: number) => string;
  formatAxisValue?: (val: number) => string;
  showSecondaryRatio?: boolean;
  hideRangeSelector?: boolean;
  className?: string;
}

export function InteractiveAreaChart({
  title = "Lưu Lượng Phát Nhạc Theo Thời Gian",
  subtitle = "Biểu đồ biến thiên lượt nghe và mức độ gắn kết của người dùng",
  data,
  metricLabel = "Lượt phát",
  secondaryLabel = "Nghe trọn vẹn",
  accentColor = "#ff5500",
  secondaryColor = "#10b981",
  height = 240,
  activeRange = "7D",
  onRangeChange,
  valueUnit = "lượt",
  formatValue,
  formatAxisValue,
  showSecondaryRatio = true,
  hideRangeSelector = false,
  className = "",
}: InteractiveAreaChartProps) {
  const uid = useId().replace(/:/g, "");
  const areaGradId = `area-glow-${uid}`;
  const lineGradId = `line-glow-${uid}`;
  const pointGlowId = `point-glow-${uid}`;

  const [internalRange, setInternalRange] = useState<"7D" | "30D" | "90D">(activeRange);
  const currentRange = onRangeChange ? activeRange : internalRange;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const maxLen = currentRange === "7D" ? 7 : currentRange === "30D" ? 30 : 90;
    if (onRangeChange) {
      return data.length > maxLen ? data.slice(-maxLen) : data;
    }
    if (currentRange === "7D") {
      return data.slice(-7);
    }
    if (currentRange === "30D") {
      return data.length >= 30 ? data.slice(-30) : data;
    }
    return data;
  }, [data, currentRange, onRangeChange]);

  const maxVal = useMemo(() => {
    if (!displayData.length) return 100;
    const peak = Math.max(...displayData.map((d) => Math.max(d.streams, d.completed || 0)));
    return Math.ceil(peak * 1.15) || 10;
  }, [displayData]);

  const formatMetric = (val: number) =>
    formatValue ? formatValue(val) : `${val.toLocaleString("vi-VN")} ${valueUnit}`;
  const formatAxis = (val: number) =>
    formatAxisValue ? formatAxisValue(val) : val.toLocaleString("vi-VN");

  const minVal = 0;
  const paddingLeft = formatAxisValue ? 56 : 48;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = 700; // SVG internal coordinate width
  const chartHeight = height;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  // Calculate points
  const points = useMemo(() => {
    if (displayData.length < 2) return [];
    return displayData.map((item, idx) => {
      const x = paddingLeft + (idx / (displayData.length - 1)) * plotWidth;
      const y = paddingTop + plotHeight - ((item.streams - minVal) / (maxVal - minVal)) * plotHeight;
      const y2 = item.completed !== undefined
        ? paddingTop + plotHeight - ((item.completed - minVal) / (maxVal - minVal)) * plotHeight
        : y;
      return { x, y, y2, data: item };
    });
  }, [displayData, maxVal, minVal, plotWidth, plotHeight]);

  // Cubic Bezier curve generator
  const createSplinePath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cX = (curr.x + next.x) / 2;
      d += ` C ${cX} ${curr.y}, ${cX} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const linePath = useMemo(() => {
    return createSplinePath(points.map((p) => ({ x: p.x, y: p.y })));
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length < 2) return "";
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x} ${paddingTop + plotHeight} L ${first.x} ${paddingTop + plotHeight} Z`;
  }, [points, linePath, plotHeight]);

  const completedLinePath = useMemo(() => {
    if (!points.some((p) => p.data.completed !== undefined)) return "";
    return createSplinePath(points.map((p) => ({ x: p.x, y: p.y2 })));
  }, [points]);

  // Handle Mouse Move for Hover Tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * chartWidth;
    const ratio = Math.max(0, Math.min(1, (svgX - paddingLeft) / plotWidth));
    const targetIdx = Math.round(ratio * (points.length - 1));
    setHoverIndex(targetIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  // Y-axis tick marks
  const yTicks = [
    { label: formatAxis(maxVal), y: paddingTop },
    { label: formatAxis(Math.round(maxVal * 0.66)), y: paddingTop + plotHeight * 0.33 },
    { label: formatAxis(Math.round(maxVal * 0.33)), y: paddingTop + plotHeight * 0.66 },
    { label: formatAxis(0), y: paddingTop + plotHeight },
  ];

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-[#222432] bg-[#12131a] p-5 lg:p-6 shadow-xl space-y-4 ${className}`}
    >
      {/* ── Chart Header with Controls ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <h3 className="font-graphik text-base font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#ff5500]" />
            {title}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend indicators */}
          <div className="hidden md:flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
              <span className="text-zinc-300">{metricLabel}</span>
            </div>
            {completedLinePath && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
                <span className="text-zinc-300">{secondaryLabel}</span>
              </div>
            )}
          </div>

          {/* Timeframe Toggle Buttons */}
          {!hideRangeSelector && (
            <div className="flex items-center bg-[#171822] p-1 rounded-xl border border-white/5 text-[11px] font-mono">
              {(["7D", "30D", "90D"] as const).map((rng) => (
                <button
                  key={rng}
                  type="button"
                  onClick={() => {
                    setInternalRange(rng);
                    if (onRangeChange) onRangeChange(rng);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                    currentRange === rng
                      ? "bg-[#ff5500] text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {rng === "7D" ? "7 Ngày" : rng === "30D" ? "30 Ngày" : "90 Ngày"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SVG Chart Viewport ────────────────────────────────── */}
      <div className="relative w-full overflow-visible select-none">
        {points.length < 2 ? (
          <div className="h-48 grid place-items-center text-xs text-zinc-500 font-mono italic">
            Chưa có đủ điểm dữ liệu để biểu diễn đồ thị
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto cursor-crosshair overflow-visible"
              style={{ minHeight: height }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                {/* Glow & Area Linear Gradients */}
                <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity="0.32" />
                  <stop offset="50%" stopColor={accentColor} stopOpacity="0.08" />
                  <stop offset="100%" stopColor={accentColor} stopOpacity="0.00" />
                </linearGradient>

                <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={accentColor} />
                  <stop offset="100%" stopColor="#ff7a29" />
                </linearGradient>

                <filter id={pointGlowId} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Horizontal Grid Lines */}
              {yTicks.map((tick, idx) => (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={tick.y}
                    x2={chartWidth - paddingRight}
                    y2={tick.y}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeDasharray={idx === yTicks.length - 1 ? "" : "3 3"}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={tick.y + 3}
                    textAnchor="end"
                    fill="rgba(255, 255, 255, 0.35)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {/* Filled Area */}
              <path d={areaPath} fill={`url(#${areaGradId})`} />

              {/* Secondary Line (Completed streams) if available */}
              {completedLinePath && (
                <path
                  d={completedLinePath}
                  fill="none"
                  stroke={secondaryColor}
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  strokeOpacity="0.85"
                />
              )}

              {/* Primary Curve Line */}
              <path
                d={linePath}
                fill="none"
                stroke={`url(#${lineGradId})`}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Static points */}
              {points.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill="#12131a"
                  stroke={accentColor}
                  strokeWidth="2"
                  className="transition-all hover:r-5"
                />
              ))}

              {/* X-axis Labels */}
              {points.map((p, idx) => {
                // Show spaced labels to avoid overlapping on small screens
                const shouldShow =
                  displayData.length <= 10 ||
                  idx === 0 ||
                  idx === points.length - 1 ||
                  idx % Math.ceil(points.length / 7) === 0;

                if (!shouldShow) return null;

                return (
                  <text
                    key={idx}
                    x={p.x}
                    y={paddingTop + plotHeight + 18}
                    textAnchor="middle"
                    fill={hoverIndex === idx ? "#ffffff" : "rgba(255, 255, 255, 0.45)"}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight={hoverIndex === idx ? "bold" : "normal"}
                  >
                    {p.data.label || p.data.date}
                  </text>
                );
              })}

              {/* Interactive Hover Crosshair Guideline */}
              {activePoint && (
                <g>
                  {/* Vertical Guideline */}
                  <line
                    x1={activePoint.x}
                    y1={paddingTop}
                    x2={activePoint.x}
                    y2={paddingTop + plotHeight}
                    stroke="rgba(255, 85, 0, 0.5)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />

                  {/* Highlighted Outer Ring */}
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="8"
                    fill="rgba(255, 85, 0, 0.2)"
                    stroke={accentColor}
                    strokeWidth="1"
                    filter={`url(#${pointGlowId})`}
                  />

                  {/* Inner Solid Dot */}
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="4.5"
                    fill="#ffffff"
                    stroke={accentColor}
                    strokeWidth="2"
                  />

                  {/* Secondary Point on Hover if available */}
                  {completedLinePath && (
                    <circle
                      cx={activePoint.x}
                      cy={activePoint.y2}
                      r="4"
                      fill="#ffffff"
                      stroke={secondaryColor}
                      strokeWidth="2"
                    />
                  )}
                </g>
              )}
            </svg>

            {/* Floating Glass Tooltip Card */}
            {activePoint && (() => {
              const xPct = (activePoint.x / chartWidth) * 100;
              const yPct = (activePoint.y / chartHeight) * 100;
              const tx = xPct < 28 ? "12px" : xPct > 72 ? "calc(-100% - 12px)" : "-50%";
              const ty = yPct < 46 ? "14px" : "calc(-100% - 14px)";
              return (
                <div
                  className="absolute z-40 pointer-events-none w-max max-w-[260px] rounded-xl border border-white/15 bg-[#171822]/95 backdrop-blur-md p-3 shadow-2xl text-xs font-mono transition-[left,top,transform] duration-75"
                  style={{
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    transform: `translate(${tx}, ${ty})`,
                  }}
                >
                  <div className="font-bold text-white mb-1.5 pb-1 border-b border-white/10 flex items-center justify-between gap-3">
                    <span className="whitespace-nowrap">{activePoint.data.date || activePoint.data.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 whitespace-nowrap">
                      {currentRange}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-400 flex items-center gap-1.5 whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                        {metricLabel}:
                      </span>
                      <strong className="text-white font-bold whitespace-nowrap">
                        {formatMetric(activePoint.data.streams)}
                      </strong>
                    </div>

                    {activePoint.data.completed !== undefined && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-400 flex items-center gap-1.5 whitespace-nowrap">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: secondaryColor }} />
                          {secondaryLabel}:
                        </span>
                        <strong className="text-emerald-400 font-bold whitespace-nowrap">
                          {formatMetric(activePoint.data.completed)}
                          {showSecondaryRatio
                            ? ` (${activePoint.data.streams > 0 ? Math.round((activePoint.data.completed / activePoint.data.streams) * 100) : 0}%)`
                            : ""}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
