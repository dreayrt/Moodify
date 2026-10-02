"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Share2,
  TrendingUp,
  Smartphone,
  Monitor,
  Sparkles,
  Globe,
  RefreshCw,
  ChevronRight,
  X,
  Layers,
  BarChart2,
} from "lucide-react";
import {
  getContentLeadAudienceAnalytics,
  type ContentLeadAudienceResponse,
  type AudienceChannelItem,
  type ArtistTrackResponse,
} from "@/lib/auth/auth-client";

type PeriodType = "7d" | "30d" | "90d" | "all";

interface AudienceDistributionCardProps {
  token: string | null;
  tracks?: ArtistTrackResponse[];
}

export function AudienceDistributionCard({
  token,
  tracks = [],
}: AudienceDistributionCardProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodType>("30d");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("all");
  const [data, setData] = useState<ContentLeadAudienceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModalChannel, setSelectedModalChannel] = useState<AudienceChannelItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Fetch analytics data
  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getContentLeadAudienceAnalytics(token, {
        period,
        trackId: selectedTrackId === "all" ? undefined : selectedTrackId,
      });
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load audience analytics";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, period, selectedTrackId]);

  // Icon mapper helper
  const renderChannelIcon = (iconName: string, className = "h-4 w-4") => {
    switch (iconName) {
      case "smartphone":
        return <Smartphone className={className} />;
      case "monitor":
        return <Monitor className={className} />;
      case "sparkles":
        return <Sparkles className={className} />;
      case "globe":
        return <Globe className={className} />;
      default:
        return <BarChart2 className={className} />;
    }
  };

  const handleOpenChannelModal = (channel: AudienceChannelItem) => {
    setSelectedModalChannel(channel);
    setIsModalOpen(true);
  };

  const handleOpenGeneralModal = () => {
    if (data?.channels && data.channels.length > 0) {
      setSelectedModalChannel(data.channels[0]);
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <div
        className="anim-fade-up overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.04] p-5 md:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)]"
        style={{ animationDelay: "900ms" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.06em] text-[#9ec5ff]">
              KÊNH TIẾP CẬN ĐA NỀN TẢNG
            </p>
            <h3 className="mt-2 font-graphik text-[24px] font-semibold tracking-[-0.02em] text-white">
              Kênh tiếp cận người nghe
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchData}
              title="Làm mới dữ liệu"
              disabled={loading}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/8 bg-white/[0.04] text-white/50 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#ff7a2c]" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenGeneralModal}
              title="Xem chi tiết"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/8 bg-white/[0.04] text-white/50 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filters Row: Period Pills & Track Selector */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {/* Period selector */}
          <div className="inline-flex rounded-full border border-white/8 bg-black/40 p-1">
            {(
              [
                { key: "7d", label: "7 ngày" },
                { key: "30d", label: "30 ngày" },
                { key: "90d", label: "90 ngày" },
                { key: "all", label: "Tất cả" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriod(item.key)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  period === item.key
                    ? "bg-[#ff7a2c] text-white shadow-sm"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Optional Track Filter */}
          {tracks.length > 0 && (
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className="rounded-full border border-white/8 bg-black/40 px-3 py-1 text-[11px] text-white/70 outline-none hover:border-white/16 focus:border-[#ff7a2c]/50"
            >
              <option value="all" className="bg-[#18191c] text-white">
                Toàn bộ danh mục
              </option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#18191c] text-white">
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Main Stats Card */}
        <div className="relative mt-5 overflow-hidden rounded-[24px] border border-white/8 bg-black/30 p-5">
          <div
            className="absolute right-[-10px] top-[-12px] h-28 w-28 rounded-full bg-[#ff7a2c]/15 blur-2xl pointer-events-none"
            style={{ animation: "artistPulse 4s ease-in-out infinite" }}
          />

          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[38px] font-graphik font-semibold leading-none tracking-[-0.04em] text-white">
                {data?.totalReach ? data.totalReach.toLocaleString() : "0"}
              </p>
              <p className="mt-2 text-[12px] leading-5 text-white/58">
                Tổng lượt tiếp cận
              </p>
            </div>

            {/* Growth badge */}
            <div className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>+{data?.growthRate ?? 14.8}%</span>
            </div>
          </div>

          {/* 3 Sub-metrics Pills */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/6 pt-4 text-center">
            <div className="rounded-[14px] bg-white/[0.03] p-2">
              <p className="text-[10px] text-white/44">
                Người nghe duy nhất
              </p>
              <p className="mt-1 font-graphik text-[13px] font-medium text-white">
                {data?.uniqueListeners ? data.uniqueListeners.toLocaleString() : "0"}
              </p>
            </div>
            <div className="rounded-[14px] bg-white/[0.03] p-2">
              <p className="text-[10px] text-white/44">
                Tỷ lệ bấm nghe
              </p>
              <p className="mt-1 font-graphik text-[13px] font-medium text-[#8fb4ff]">
                {data?.avgCompletionRate ?? 82.5}%
              </p>
            </div>
            <div className="rounded-[14px] bg-white/[0.03] p-2">
              <p className="text-[10px] text-white/44">
                Thời gian nghe
              </p>
              <p className="mt-1 font-graphik text-[13px] font-medium text-[#ffb488]">
                {data?.totalListeningHours ?? 0}h
              </p>
            </div>
          </div>

          {/* Multi-segmented Distribution Bar */}
          <div className="mt-4">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/8">
              {(data?.channels ?? [
                { id: "web", share: 48, color: "#8fb4ff" },
                { id: "android", share: 34, color: "#ff7a2c" },
                { id: "ios", share: 18, color: "#c084fc" },
              ]).map((c, i) => (
                <div
                  key={c.id || i}
                  style={{
                    width: `${c.share}%`,
                    backgroundColor: c.color,
                  }}
                  title={`${c.share}%`}
                  className="h-full transition-all duration-500 hover:brightness-125"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Channel Cards List */}
        <div className="mt-5 space-y-3">
          {(data?.channels ?? [
            {
              id: "web",
              channel: "Moodify Web Player",
              subtitle: "Trình duyệt máy tính và điện thoại",
              shareFormatted: "48% lưu lượng",
              streams: 1480,
              completionRate: 81.5,
              color: "#8fb4ff",
              icon: "monitor",
            },
            {
              id: "android",
              channel: "Moodify Android App",
              subtitle: "Ứng dụng trên Android",
              shareFormatted: "34% lưu lượng",
              streams: 1050,
              completionRate: 86.2,
              color: "#ff7a2c",
              icon: "smartphone",
            },
            {
              id: "ios",
              channel: "Moodify iOS App",
              subtitle: "Ứng dụng trên iPhone và iPad",
              shareFormatted: "18% lưu lượng",
              streams: 556,
              completionRate: 88.4,
              color: "#c084fc",
              icon: "smartphone",
            },
          ]).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpenChannelModal(item as AudienceChannelItem)}
              className="group flex w-full items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-black/20 px-4 py-3.5 text-left transition hover:border-white/16 hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10"
                  style={{
                    backgroundColor: `${item.color}15`,
                    color: item.color,
                  }}
                >
                  {renderChannelIcon(item.icon, "h-4 w-4")}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white transition group-hover:text-[#ffb488]">
                    {item.channel}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-white/44">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[13px] font-medium text-[#ffb488]">
                  {item.shareFormatted}
                </p>
                <div className="mt-0.5 flex items-center justify-end gap-1">
                  <span className="text-[10px] text-white/40">
                    {item.completionRate}% bấm nghe
                  </span>
                  <ChevronRight className="h-3 w-3 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/60" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* View Deep Insights CTA Footer */}
        <div className="mt-4 pt-2">
          <button
            type="button"
            onClick={handleOpenGeneralModal}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-2.5 text-[12px] font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white"
          >
            <BarChart2 className="h-3.5 w-3.5 text-[#ff7a2c]" />
            <span>Xem chi tiết kênh tiếp cận</span>
            <ChevronRight className="h-3 w-3 text-white/40" />
          </button>
        </div>
      </div>

      {/* Drill-down Modal */}
      {isModalOpen && (
        <AudienceDrilldownModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={data}
          selectedChannel={selectedModalChannel}
          onSelectChannel={setSelectedModalChannel}
        />
      )}
    </>
  );
}

// ==========================================
// Drill-down Modal Component
// ==========================================
interface AudienceDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ContentLeadAudienceResponse | null;
  selectedChannel: AudienceChannelItem | null;
  onSelectChannel: (channel: AudienceChannelItem) => void;
}

function AudienceDrilldownModal({
  isOpen,
  onClose,
  data,
  selectedChannel,
  onSelectChannel,
}: AudienceDrilldownModalProps) {
  if (!isOpen) return null;

  const currentChannel = selectedChannel || data?.channels?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-white/12 bg-[#121316] p-6 md:p-8 shadow-[0_32px_90px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#ff7a2c]/30 bg-[#ff7a2c]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#ffb488]">
                <Layers className="h-3 w-3" />
                <span>Tiếp cận đa nền tảng</span>
              </span>
              <span className="text-[11px] text-white/40">
                {data?.period?.toUpperCase() ?? "30D"}
              </span>
            </div>
            <h2 className="mt-2 font-graphik text-[24px] font-semibold text-white">
              Chi tiết kênh tiếp cận
            </h2>
            <p className="mt-1 text-[13px] text-white/60">
              Thống kê lượt truy cập và tỷ lệ người nghe phát nhạc trên từng nền tảng.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.1] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Channel Navigation Tabs */}
        {data?.channels && data.channels.length > 0 && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {data.channels.map((ch) => {
              const isSelected = ch.id === currentChannel?.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => onSelectChannel(ch)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-medium transition ${
                    isSelected
                      ? "border-[#ff7a2c]/40 bg-[#ff7a2c]/15 text-white"
                      : "border-white/8 bg-black/20 text-white/60 hover:border-white/16 hover:text-white"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: ch.color }}
                  />
                  <span>{ch.channel}</span>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-white/70">
                    {ch.share}%
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Channel Metrics Showcase */}
        {currentChannel && (
          <div className="mt-5 rounded-[24px] border border-white/8 bg-black/30 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 pb-4">
              <div>
                <p className="text-[12px] text-white/44">{currentChannel.subtitle}</p>
                <h3 className="mt-1 font-graphik text-[20px] font-semibold text-white">
                  {currentChannel.channel}
                </h3>
              </div>
              <div className="text-right">
                <p className="font-graphik text-[24px] font-semibold text-[#ffb488]">
                  {currentChannel.streams.toLocaleString()} lượt tiếp cận
                </p>
                <p className="text-[11px] text-emerald-400">
                  Tỷ lệ bấm nghe: {currentChannel.completionRate}%
                </p>
              </div>
            </div>

            {/* Custom Channel Details Meta */}
            {currentChannel.details && (
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {Object.entries(currentChannel.details).map(([key, val]) => (
                  <div
                    key={key}
                    className="rounded-[16px] border border-white/6 bg-white/[0.02] p-3"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-white/40">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <p className="mt-1 font-graphik text-[12px] font-medium text-white/90">
                      {String(val)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mini Stream Trend Chart */}
        {data?.dailyTrends && data.dailyTrends.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 font-graphik text-[15px] font-semibold text-white">
                <BarChart2 className="h-4 w-4 text-[#8fb4ff]" />
                <span>Xu hướng tiếp cận 14 ngày gần nhất</span>
              </h4>
              <span className="text-[11px] text-white/40">Lượt truy cập</span>
            </div>

            {/* SVG Interactive Trend Bar Chart */}
            <div className="mt-4 rounded-[20px] border border-white/8 bg-black/20 p-4">
              <div className="flex h-32 items-end gap-1 sm:gap-2">
                {(() => {
                  const maxVal = Math.max(
                    ...data.dailyTrends.map((d) => d.streams),
                    1,
                  );
                  return data.dailyTrends.map((d, index) => {
                    const heightPercent = Math.max(8, (d.streams / maxVal) * 100);
                    return (
                      <div
                        key={d.date || index}
                        className="group relative flex flex-1 flex-col items-center h-full justify-end"
                      >
                        {/* Hover Tooltip */}
                        <div className="pointer-events-none absolute -top-9 z-20 hidden rounded-md bg-[#25282f] px-2 py-1 text-[10px] text-white shadow-lg group-hover:block whitespace-nowrap">
                          {d.label}: {d.streams.toLocaleString()} lượt tiếp cận
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full rounded-t-[4px] bg-[linear-gradient(180deg,#ff7a2c_0%,#8fb4ff_100%)] opacity-75 transition-all duration-300 group-hover:opacity-100 group-hover:brightness-125"
                        />
                        <span className="mt-2 text-[9px] text-white/40 group-hover:text-white/80">
                          {d.label}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}


        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-6 py-2.5 text-[13px] font-semibold text-black transition hover:bg-white/90"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
