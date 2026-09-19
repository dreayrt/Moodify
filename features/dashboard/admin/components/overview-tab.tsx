"use client";

import React from "react";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Database,
  DollarSign,
  Headphones,
  Music,
  Radio,
  Server,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { AdminTab, AdminUser, CatalogTrack, PaymentTransaction, SystemAuditLog } from "../types";
import { DatabaseTelemetryCard, EmotionDonutChart, RevenueVelocityChart } from "./shared/bi-charts";

type OverviewTabProps = {
  users: AdminUser[];
  tracks: CatalogTrack[];
  transactions: PaymentTransaction[];
  auditLogs: SystemAuditLog[];
  onNavigateTab: (tab: AdminTab) => void;
};

export function OverviewTab({
  users,
  tracks,
  transactions,
  auditLogs,
  onNavigateTab,
}: OverviewTabProps) {
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.status === "ACTIVE").length;
  const artistsCount = users.filter((u) => u.role === "ARTIST").length;
  const totalRevenue = transactions
    .filter((t) => t.status === "SUCCESS")
    .reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  return (
    <div className="space-y-6 anim-fade-up">
      {/* 4 Studio Executive KPI Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Users & Artists */}
        <div className="rounded-xl border border-[#1e2330] bg-[#0c1017] p-5 shadow-sm transition hover:border-[#2a3447] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <Users className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono text-emerald-300 font-semibold">
                <TrendingUp className="h-3 w-3" /> +14.2% YoY
              </span>
            </div>
            <p className="mt-4 text-xs font-mono tracking-wider uppercase text-zinc-400 font-semibold">
              Tổng Tài Khoản IAM
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-graphik text-3xl font-bold text-white tracking-tight">{totalUsersCount}</span>
              <span className="text-xs text-zinc-400 font-mono">({artistsCount} nghệ sĩ)</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-mono text-[11px]">Active: <strong className="text-emerald-400">{activeUsersCount}</strong></span>
            <button
              type="button"
              onClick={() => onNavigateTab("users")}
              className="flex items-center gap-1 font-semibold text-[#ff7a2c] hover:underline"
            >
              Quản trị IAM <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Music Catalog */}
        <div className="rounded-xl border border-[#1e2330] bg-[#0c1017] p-5 shadow-sm transition hover:border-[#2a3447] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
                <Music className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-mono text-cyan-300 font-semibold">
                <Database className="h-3 w-3" /> Catalog Live
              </span>
            </div>
            <p className="mt-4 text-xs font-mono tracking-wider uppercase text-zinc-400 font-semibold">
              Kho Bài Hát Trực Tuyến
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-graphik text-3xl font-bold text-white tracking-tight">{tracks.length}</span>
              <span className="text-xs text-zinc-400 font-mono">bản ghi âm học</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-mono text-[11px]">Chất lượng: <strong className="text-cyan-300">320kbps</strong></span>
            <button
              type="button"
              onClick={() => onNavigateTab("catalog")}
              className="flex items-center gap-1 font-semibold text-cyan-300 hover:underline"
            >
              Kho âm nhạc <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Accumulated Streams */}
        <div className="rounded-xl border border-[#1e2330] bg-[#0c1017] p-5 shadow-sm transition hover:border-[#2a3447] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <Headphones className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono text-amber-300 font-semibold">
                <TrendingUp className="h-3 w-3" /> +28.5% Tuần
              </span>
            </div>
            <p className="mt-4 text-xs font-mono tracking-wider uppercase text-zinc-400 font-semibold">
              Lưu Lượng Phát Trực Tuyến
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-graphik text-3xl font-bold text-white tracking-tight">1.02M</span>
              <span className="text-xs text-zinc-400 font-mono">lượt stream</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-mono text-[11px]">Tỷ lệ hoàn thành: <strong className="text-white">88.4%</strong></span>
            <span className="text-emerald-400 font-mono text-[11px] font-medium">Băng thông ổn định</span>
          </div>
        </div>

        {/* Card 4: Financial Revenue */}
        <div className="rounded-xl border border-[#1e2330] bg-[#0c1017] p-5 shadow-sm transition hover:border-[#2a3447] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-[#ff7a2c]/20 bg-[#ff7a2c]/10 text-[#ff7a2c]">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-[#ff7a2c]/30 bg-[#ff7a2c]/10 px-2 py-0.5 text-[11px] font-mono text-[#ffb488] font-semibold">
                VNPAY · MOMO
              </span>
            </div>
            <p className="mt-4 text-xs font-mono tracking-wider uppercase text-zinc-400 font-semibold">
              Doanh Thu Gói Cước (ACID)
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-2xl font-black text-white tracking-tight">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-mono text-[11px]">Đối soát: <strong className="text-emerald-400">100% Khớp</strong></span>
            <button
              type="button"
              onClick={() => onNavigateTab("monetization")}
              className="flex items-center gap-1 font-semibold text-[#ff7a2c] hover:underline"
            >
              Gói cước <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Bi-Charts (Emotion Donut + Streaming Velocity) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Emotion Vibe Radar */}
        <div className="rounded-2xl border border-[#1e2330] bg-[#0c1017] p-6 lg:col-span-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[#ff7a2c]/30 bg-[#ff7a2c]/10 px-2 py-0.5 text-[11px] font-mono tracking-wide uppercase text-[#ff9b57] font-semibold">
                  ĐẶC TRƯNG ÂM HỌC · VIBE RADAR
                </span>
                <h3 className="font-graphik text-lg font-bold text-white mt-2">
                  Phân Bổ Vibe Cảm Xúc Kho Nhạc
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Thống kê phân loại năng lượng âm học (Valence / Energy) dựa trên {tracks.length} bài hát từ kho nhạc hệ thống
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("catalog")}
                className="text-xs font-mono text-zinc-400 hover:text-white transition"
              >
                Xem chi tiết →
              </button>
            </div>

            <div className="mt-4">
              <EmotionDonutChart tracks={tracks} />
            </div>
          </div>
        </div>

        {/* Right: Revenue & Streaming Velocity */}
        <div className="rounded-2xl border border-[#1e2330] bg-[#0c1017] p-6 lg:col-span-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono tracking-wide uppercase text-emerald-300 font-semibold">
                  LƯU LƯỢNG &amp; DÒNG TIỀN TUẦN
                </span>
                <h3 className="font-graphik text-lg font-bold text-white mt-2">
                  Lưu Lượng Nghe Nhạc &amp; Xu Hướng Tuần
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Mô hình hóa lưu lượng phát trực tuyến và chuyển đổi gói thuê bao theo thời gian thực
                </p>
              </div>
            </div>

            <div className="mt-4">
              <RevenueVelocityChart />
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Polyglot Database Architecture (Full 12 cols for absolute clarity) */}
      <div className="rounded-2xl border border-[#1e2330] bg-[#0c1017] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-graphik text-base font-bold text-white">
                  Hạ Tầng Lưu Trữ & Xử Lý Dữ Liệu Chuyên Biệt
                </h4>
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  HẠ TẦNG ĐỒNG BỘ TRỰC TUYẾN
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Phân tầng kiến trúc: Phân hệ nghiệp vụ bảo toàn giao dịch & Phân hệ lưu trữ âm nhạc phục vụ streaming hiệu năng cao
              </p>
            </div>
          </div>
        </div>

        <DatabaseTelemetryCard
          usersCount={totalUsersCount}
          tracksCount={tracks.length}
          artistsCount={artistsCount}
          packagesCount={6}
        />
      </div>

      {/* Row 4: Security Audit Vault Peek */}
      <div className="rounded-2xl border border-[#1e2330] bg-[#0c1017] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-[#ff7a2c]/30 bg-[#ff7a2c]/10 text-[#ff7a2c]">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-graphik text-base font-bold text-white">
                Nhật Ký Kiểm Toán Hệ Thống Gần Nhất (Audit Vault)
              </h4>
              <p className="text-xs text-zinc-400">
                Ghi nhận nhật ký bất biến các thao tác IAM, can thiệp danh mục và điều chỉnh cấu hình
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("settings")}
            className="text-xs font-mono font-semibold text-[#ff7a2c] hover:underline"
          >
            Toàn bộ Audit Vault →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {auditLogs.slice(0, 4).map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between gap-3 p-3 rounded-xl border border-[#1e2330] bg-[#080d14] hover:bg-[#121622] transition"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-white px-2 py-0.5 rounded-md bg-white/10 border border-white/10">
                    {log.action}
                  </span>
                  <span className="font-graphik text-xs font-semibold text-white/90 truncate">
                    {log.target}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate mt-1.5">{log.details}</p>
              </div>
              <span className="font-mono text-[10px] text-zinc-500 shrink-0 mt-0.5">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
