"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  CircleDollarSign,
  TrendingUp,
  Activity,
  Download,
  Music2,
  Search,
  ArrowUpDown,
  Calendar,
  Sparkles,
  Info,
  ChevronDown,
} from "lucide-react";
import { ArtistTrack } from "../types";

export type TimePeriod = "today" | "week" | "month" | "year";
export type RevenueSortOption = "highest" | "lowest" | "most_played";

export interface TrackRevenueRow {
  id: string;
  title: string;
  genre: string;
  coverUrl?: string;
  plays: number;
  downloads: number;
  streamingRevenue: number;
  downloadRevenue: number;
  totalRevenue: number;
  sharePercentage: number;
}

// Mock dataset đa dạng theo 4 mốc thời gian
const PERIOD_DATA: Record<
  TimePeriod,
  {
    label: string;
    subLabel: string;
    totalRevenue: number;
    growth: number;
    rpm: number;
    points: Array<{ label: string; date: string; value: number }>;
  }
> = {
  today: {
    label: "Hôm nay",
    subLabel: "24 giờ qua (Cập nhật thời gian thực)",
    totalRevenue: 64.5,
    growth: 12.3,
    rpm: 4.35,
    points: [
      { label: "00:00", date: "Hôm nay 00:00", value: 3.2 },
      { label: "04:00", date: "Hôm nay 04:00", value: 1.8 },
      { label: "08:00", date: "Hôm nay 08:00", value: 8.5 },
      { label: "12:00", date: "Hôm nay 12:00", value: 14.2 },
      { label: "16:00", date: "Hôm nay 16:00", value: 19.6 },
      { label: "20:00", date: "Hôm nay 20:00", value: 17.2 },
    ],
  },
  week: {
    label: "1 tuần",
    subLabel: "7 ngày gần nhất",
    totalRevenue: 385.2,
    growth: 15.8,
    rpm: 4.28,
    points: [
      { label: "Th 2", date: "Thứ Hai, 30/09", value: 42.0 },
      { label: "Th 3", date: "Thứ Ba, 01/10", value: 48.5 },
      { label: "Th 4", date: "Thứ Tư, 02/10", value: 55.2 },
      { label: "Th 5", date: "Thứ Năm, 03/10", value: 51.0 },
      { label: "Th 6", date: "Thứ Sáu, 04/10", value: 68.4 },
      { label: "Th 7", date: "Thứ Bảy, 05/10", value: 72.1 },
      { label: "CN", date: "Chủ Nhật, 06/10", value: 48.0 },
    ],
  },
  month: {
    label: "1 tháng",
    subLabel: "30 ngày gần nhất (Kỳ đối soát hiện tại)",
    totalRevenue: 1420.8,
    growth: 18.4,
    rpm: 4.2,
    points: [
      { label: "01/09", date: "01/09 - 05/09", value: 185.0 },
      { label: "06/09", date: "06/09 - 10/09", value: 210.5 },
      { label: "11/09", date: "11/09 - 15/09", value: 245.2 },
      { label: "16/09", date: "16/09 - 20/09", value: 230.0 },
      { label: "21/09", date: "21/09 - 25/09", value: 268.3 },
      { label: "26/09", date: "26/09 - 30/09", value: 281.8 },
    ],
  },
  year: {
    label: "1 năm",
    subLabel: "12 tháng qua",
    totalRevenue: 15640.0,
    growth: 34.6,
    rpm: 4.15,
    points: [
      { label: "T1", date: "Tháng 01/2026", value: 920.0 },
      { label: "T2", date: "Tháng 02/2026", value: 1050.0 },
      { label: "T3", date: "Tháng 03/2026", value: 1240.0 },
      { label: "T4", date: "Tháng 04/2026", value: 1180.0 },
      { label: "T5", date: "Tháng 05/2026", value: 1350.0 },
      { label: "T6", date: "Tháng 06/2026", value: 1420.8 },
    ],
  },
};

interface RevenueAnalyticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tracks?: ArtistTrack[];
}

export function RevenueAnalyticsDrawer({
  isOpen,
  onClose,
  tracks = [],
}: RevenueAnalyticsDrawerProps) {
  const [period, setPeriod] = useState<TimePeriod>("month");
  const [sortOption, setSortOption] = useState<RevenueSortOption>("highest");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Đóng bằng phím Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Ngăn cuộn trang phía sau khi Drawer đang mở
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const currentDataset = PERIOD_DATA[period];

  // Tạo mock revenue theo danh sách bài hát hiện có hoặc danh sách mẫu
  const trackRevenueList: TrackRevenueRow[] = useMemo(() => {
    // Nhân hệ số tỉ lệ theo kỳ
    const multiplier =
      period === "today"
        ? 0.045
        : period === "week"
        ? 0.27
        : period === "month"
        ? 1.0
        : 11.0;

    // Các bài hát mẫu nếu catalog chưa có bài
    const baseTracks =
      tracks.length > 0
        ? tracks
        : [
            {
              id: "tr-1",
              title: "Neon Horizon (Extended Mix)",
              genre: "Synthwave / Cyberpunk",
              plays: 12450,
              likes: 1420,
              coverUrl: "",
            },
            {
              id: "tr-2",
              title: "Midnight Echoes (Acoustic Demo)",
              genre: "Indie Pop",
              plays: 8930,
              likes: 980,
              coverUrl: "",
            },
            {
              id: "tr-3",
              title: "Cyberpunk Tokyo Vibes",
              genre: "Electronic / Dance",
              plays: 6420,
              likes: 670,
              coverUrl: "",
            },
            {
              id: "tr-4",
              title: "test3",
              genre: "Pop",
              plays: 3500,
              likes: 210,
              coverUrl: "",
            },
            {
              id: "tr-5",
              title: "Summer Memories Instrumental",
              genre: "Lo-Fi Chill",
              plays: 2840,
              likes: 195,
              coverUrl: "",
            },
          ];

    // Sinh doanh thu tỉ lệ dựa trên lượt nghe và vị trí
    const rows = baseTracks.map((tr, index) => {
      const weight = Math.max(0.15, 1 - index * 0.18);
      const approxPlays = Math.round(((tr.plays || 2500) + 1200) * multiplier);
      const streamingRev = +(
        currentDataset.totalRevenue *
        weight *
        0.35
      ).toFixed(2);
      const dlRev = +(streamingRev * 0.22).toFixed(2);
      const total = +(streamingRev + dlRev).toFixed(2);

      return {
        id: tr.id,
        title: tr.title,
        genre: tr.genre || "Pop",
        coverUrl: (tr as any).coverUrl || "",
        plays: approxPlays,
        downloads: Math.round(approxPlays * 0.08),
        streamingRevenue: streamingRev,
        downloadRevenue: dlRev,
        totalRevenue: total,
        sharePercentage: 0, // sẽ tính ở bước sau
      };
    });

    // Tính tổng thực tế và phần trăm tỷ trọng
    const sumTotal = rows.reduce((acc, r) => acc + r.totalRevenue, 0) || 1;
    return rows.map((r) => ({
      ...r,
      sharePercentage: Math.min(100, +((r.totalRevenue / sumTotal) * 100).toFixed(1)),
    }));
  }, [tracks, period, currentDataset.totalRevenue]);

  // Lọc và sắp xếp bảng
  const filteredAndSortedTracks = useMemo(() => {
    let list = [...trackRevenueList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.genre.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortOption === "highest") return b.totalRevenue - a.totalRevenue;
      if (sortOption === "lowest") return a.totalRevenue - b.totalRevenue;
      if (sortOption === "most_played") return b.plays - a.plays;
      return 0;
    });

    return list;
  }, [trackRevenueList, searchQuery, sortOption]);

  // Dữ liệu vẽ biểu đồ SVG
  const chartPoints = currentDataset.points;
  const maxValue = Math.max(...chartPoints.map((p) => p.value), 10);
  const chartHeight = 160;
  const chartWidth = 720;
  const paddingX = 40;
  const paddingY = 24;

  const pointsCoordinates = useMemo(() => {
    const usableW = chartWidth - paddingX * 2;
    const usableH = chartHeight - paddingY * 2;
    const step = chartPoints.length > 1 ? usableW / (chartPoints.length - 1) : 0;

    return chartPoints.map((pt, i) => {
      const x = paddingX + i * step;
      const y = chartHeight - paddingY - (pt.value / maxValue) * usableH;
      return { x, y, ...pt };
    });
  }, [chartPoints, maxValue]);

  // Tạo đường dẫn SVG Path mượt mà
  const linePath = useMemo(() => {
    if (pointsCoordinates.length === 0) return "";
    return pointsCoordinates.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      // Dùng bezier cong nhẹ nhàng
      const prev = arr[i - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
    }, "");
  }, [pointsCoordinates]);

  // Đường dẫn vùng diện tích phát sáng dưới đường line
  const areaPath = useMemo(() => {
    if (pointsCoordinates.length === 0) return "";
    const first = pointsCoordinates[0];
    const last = pointsCoordinates[pointsCoordinates.length - 1];
    const bottom = chartHeight - paddingY;
    return `${linePath} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
  }, [linePath, pointsCoordinates]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-visibility duration-300 ${
        isOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
      }`}
    >
      {/* Backdrop mờ ảo, click ra ngoài để đóng */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300 ease-out ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Tab trượt từ trái sang phải chiếm 80% màn hình */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-[80vw] max-w-[1420px] flex-col border-r border-white/10 bg-[#0d0e14] shadow-[30px_0_90px_rgba(0,0,0,0.85)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* TOP BAR: Tiêu đề bên trái, nút đóng góc trên bên phải */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4.5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ff7a2c]/30 bg-[#ff7a2c]/10 text-[#ffb488]">
              <CircleDollarSign className="h-5 w-5" strokeWidth={1.9} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffb488]">
                  DOANH THU & TÀI CHÍNH
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-medium text-emerald-400 border border-emerald-500/25">
                  Đối soát 85%
                </span>
              </div>
              <h2 className="font-graphik text-[20px] font-bold tracking-[-0.02em] text-white sm:text-[22px]">
                Báo cáo Doanh thu & Phân bổ Bản quyền
              </h2>
            </div>
          </div>

          {/* Nút thoát ở góc trên bên phải (phiên bản ban đầu) */}
          <button
            type="button"
            onClick={onClose}
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] font-medium text-white/75 backdrop-blur-md transition-all hover:border-[#ff7a2c]/40 hover:bg-white/[0.08] hover:text-white cursor-pointer active:scale-95"
            title="Đóng tab trượt (Phím Esc)"
          >
            <X className="h-4 w-4 transition-transform group-hover:rotate-90 text-white/70 group-hover:text-white" />
            <span className="hidden sm:inline">Quay lại Studio</span>
            <kbd className="hidden sm:inline-block rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/40">
              Esc
            </kbd>
          </button>
        </div>

        {/* NỘI DUNG CUỘN TRONG DRAWER */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 space-y-6">
          {/* HÀNG 1: Tổng quan KPI & Bộ chọn 4 mốc thời gian */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Bộ chọn thời gian: Hôm nay / 1 tuần / 1 tháng / 1 năm */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.03] p-1.5">
              {[
                { key: "today" as TimePeriod, label: "Hôm nay (24h)" },
                { key: "week" as TimePeriod, label: "1 tuần" },
                { key: "month" as TimePeriod, label: "1 tháng" },
                { key: "year" as TimePeriod, label: "1 năm" },
              ].map((t) => {
                const isActive = period === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setPeriod(t.key)}
                    className={`rounded-xl px-3.5 py-1.5 text-[12px] font-medium transition cursor-pointer ${
                      isActive
                        ? "bg-[#ff7a2c] text-black font-semibold shadow-[0_4px_14px_rgba(255,122,44,0.35)]"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <p className="text-[12px] text-white/45 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#ffb488]" />
              <span>Kỳ thống kê: {currentDataset.subLabel}</span>
            </p>
          </div>

          {/* HÀNG 2: 3 THẺ KPI TÀI CHÍNH */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Thẻ 1: Tổng doanh thu */}
            <div className="rounded-[24px] border border-white/8 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-5 shadow-[0_16px_36px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  TỔNG DOANH THU
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <TrendingUp className="h-3 w-3" />+{currentDataset.growth}%
                </span>
              </div>
              <p className="mt-3 font-graphik text-[32px] font-bold tracking-tight text-white">
                ${currentDataset.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-[12px] text-white/45">
                Đã trừ 15% phí hạ tầng máy chủ
              </p>
            </div>

            {/* Thẻ 2: Doanh thu trung bình mỗi 1.000 streams (RPM) */}
            <div className="rounded-[24px] border border-white/8 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-5 shadow-[0_16px_36px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  RPM TRUNG BÌNH (1K STREAM)
                </span>
                <Activity className="h-4 w-4 text-[#ffb488]" />
              </div>
              <p className="mt-3 font-graphik text-[32px] font-bold tracking-tight text-[#ffb488]">
                ${currentDataset.rpm.toFixed(2)}
              </p>
              <p className="mt-1 text-[12px] text-white/45">
                Thu nhập ước tính trên 1.000 lượt nghe hợp lệ
              </p>
            </div>

            {/* Thẻ 3: Trạng thái đối soát */}
            <div className="rounded-[24px] border border-white/8 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-5 shadow-[0_16px_36px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  ĐỐI SOÁT & CHI TRẢ
                </span>
                <Sparkles className="h-4 w-4 text-[#ff7a2c]" />
              </div>
              <p className="mt-3 font-graphik text-[20px] font-semibold text-emerald-300">
                Tự động ngày 15 hàng tháng
              </p>
              <p className="mt-1 text-[12px] text-white/45">
                Chuyển khoản trực tiếp vào tài khoản nghệ sĩ
              </p>
            </div>
          </div>

          {/* HÀNG 3: BIỂU ĐỒ DOANH THU TƯƠNG TÁC (Interactive SVG Area Chart) */}
          <div className="rounded-[26px] border border-white/8 bg-black/30 p-5 sm:p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[15px] font-semibold text-white tracking-wide">
                  Biểu đồ xu hướng tăng trưởng doanh thu
                </h3>
                <p className="text-[12px] text-white/45 mt-0.5">
                  Rê chuột vào các mốc thời gian để xem chi tiết doanh thu theo ngày
                </p>
              </div>

              {hoveredPointIndex !== null && pointsCoordinates[hoveredPointIndex] && (
                <div className="flex items-center gap-2 rounded-xl border border-[#ff7a2c]/30 bg-[#ff7a2c]/10 px-3 py-1 text-[12px] text-[#ffb488] animate-in fade-in duration-150">
                  <span className="text-white/60">
                    {pointsCoordinates[hoveredPointIndex].date}:
                  </span>
                  <span className="font-bold text-white">
                    ${pointsCoordinates[hoveredPointIndex].value.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Khung vẽ SVG Responsive */}
            <div className="relative w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-[180px] sm:h-[220px] overflow-visible"
              >
                <defs>
                  {/* Gradient màu hổ phách/cam dịu mắt */}
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff7a2c" stopOpacity="0.32" />
                    <stop offset="70%" stopColor="#ff7a2c" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#ff7a2c" stopOpacity="0" />
                  </linearGradient>

                  <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ff9e58" />
                    <stop offset="100%" stopColor="#ff7a2c" />
                  </linearGradient>
                </defs>

                {/* Đường lưới ngang mờ */}
                {[0.25, 0.5, 0.75].map((pct, idx) => {
                  const y =
                    chartHeight -
                    paddingY -
                    pct * (chartHeight - paddingY * 2);
                  return (
                    <line
                      key={idx}
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="rgba(255,255,255,0.06)"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Vùng diện tích phát sáng */}
                {areaPath && <path d={areaPath} fill="url(#revenueGradient)" />}

                {/* Đường cong doanh thu */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="url(#strokeGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Các điểm dữ liệu & Tương tác Hover */}
                {pointsCoordinates.map((pt, index) => {
                  const isHovered = hoveredPointIndex === index;
                  return (
                    <g
                      key={index}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredPointIndex(index)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    >
                      {/* Vùng bắt hover rộng hơn */}
                      <circle cx={pt.x} cy={pt.y} r="16" fill="transparent" />

                      {/* Vòng ngoài khi hover */}
                      {isHovered && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="8"
                          fill="rgba(255,122,44,0.25)"
                          className="animate-pulse"
                        />
                      )}

                      {/* Điểm nút */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? "5" : "3.5"}
                        fill={isHovered ? "#ffffff" : "#ff7a2c"}
                        stroke="#0d0e14"
                        strokeWidth="2"
                      />

                      {/* Nhãn mốc dưới trục X */}
                      <text
                        x={pt.x}
                        y={chartHeight - 4}
                        textAnchor="middle"
                        fill={isHovered ? "#ffffff" : "rgba(255,255,255,0.4)"}
                        fontSize="11"
                        fontWeight={isHovered ? "600" : "400"}
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* HÀNG 4: BẢNG DANH SÁCH BÀI HÁT KÈM DOANH THU & BỘ LỌC */}
          <div className="rounded-[26px] border border-white/8 bg-black/20 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[16px] font-semibold text-white">
                  Chi tiết doanh thu theo từng bài hát
                </h3>
                <p className="text-[12px] text-white/45">
                  Hiển thị {filteredAndSortedTracks.length} bài hát có lượt phát sinh doanh thu trong kỳ
                </p>
              </div>

              {/* Bộ lọc sắp xếp & Tìm kiếm */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Tìm kiếm bài hát */}
                <div className="flex min-h-[38px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 focus-within:border-[#ff8b4d]/40 transition">
                  <Search className="h-3.5 w-3.5 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên bài hát..."
                    className="w-[140px] sm:w-[170px] bg-transparent text-[12px] text-white outline-none placeholder:text-white/35"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-white/40 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Sắp xếp: Cao nhất / Thấp nhất / Nghe nhiều nhất */}
                <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/70">
                  <ArrowUpDown className="h-3.5 w-3.5 text-[#ffb488]" />
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as RevenueSortOption)}
                    aria-label="Sắp xếp danh sách doanh thu bài hát"
                    className="bg-transparent text-[12px] text-white outline-none cursor-pointer"
                  >
                    <option value="highest" className="bg-[#171821] text-white">
                      Doanh thu: Cao nhất đến thấp nhất
                    </option>
                    <option value="lowest" className="bg-[#171821] text-white">
                      Doanh thu: Thấp nhất đến cao nhất
                    </option>
                    <option value="most_played" className="bg-[#171821] text-white">
                      Lượt stream nhiều nhất
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bảng danh sách bài hát */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-white/8 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    <th className="pb-3 pl-2">Bài hát</th>
                    <th className="pb-3">Lượt nghe</th>
                    <th className="pb-3">Lượt tải</th>
                    <th className="pb-3">Streaming (85%)</th>
                    <th className="pb-3">Tải nhạc / Mua</th>
                    <th className="pb-3 text-right">Tổng doanh thu</th>
                    <th className="pb-3 pr-2 text-right">Tỷ trọng (% Share)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {filteredAndSortedTracks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-white/40 text-[13px]">
                        Không tìm thấy bài hát nào khớp với từ khóa.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedTracks.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="group hover:bg-white/[0.03] transition-colors"
                      >
                        {/* Bài hát */}
                        <td className="py-3.5 pl-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[#ffb488]">
                              <Music2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate max-w-[200px] sm:max-w-[240px]">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-white/45 truncate">
                                {item.genre}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Lượt nghe */}
                        <td className="py-3.5 text-white/75 font-mono text-[12px]">
                          {item.plays.toLocaleString()}
                        </td>

                        {/* Lượt tải */}
                        <td className="py-3.5 text-white/75 font-mono text-[12px]">
                          {item.downloads.toLocaleString()}
                        </td>

                        {/* Doanh thu streaming */}
                        <td className="py-3.5 text-white/70 font-mono text-[12px]">
                          ${item.streamingRevenue.toFixed(2)}
                        </td>

                        {/* Doanh thu tải về */}
                        <td className="py-3.5 text-white/70 font-mono text-[12px]">
                          ${item.downloadRevenue.toFixed(2)}
                        </td>

                        {/* Tổng doanh thu bài hát */}
                        <td className="py-3.5 text-right font-semibold text-[#ffb488] font-mono text-[13px]">
                          ${item.totalRevenue.toFixed(2)}
                        </td>

                        {/* Thanh tỷ trọng đóng góp */}
                        <td className="py-3.5 pr-2 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <div className="h-1.5 w-16 sm:w-20 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#ff9e58] to-[#ff7a2c] transition-all duration-300"
                                style={{ width: `${item.sharePercentage}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-white/60 w-9 text-right">
                              {item.sharePercentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Chú thích bản quyền tài chính */}
            <div className="flex items-center gap-2 pt-2 text-[11px] text-white/35 border-t border-white/6">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>
                Doanh thu được tính dựa trên mô hình phân chia lợi nhuận 85/15 theo điều khoản đối tác Content Lead Moodify 2026.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
