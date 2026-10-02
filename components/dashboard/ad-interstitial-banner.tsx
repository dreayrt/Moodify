"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, SkipForward, Disc3, Sparkles } from "lucide-react";
import { usePlayer } from "./player-context";

export default function AdInterstitialBanner() {
  const { isAdPlaying, adSecondsRemaining, adTotalDuration, skipAd, subTier, adReason } = usePlayer();

  if (!isAdPlaying) {
    return null;
  }

  const isBasicUpsell = subTier === "INDIVIDUAL_BASIC" || adReason === "BASIC_DAILY_LIMIT_EXCEEDED";
  const AD_SKIP_DELAY = 5;
  const elapsed = adTotalDuration > 0 ? adTotalDuration - adSecondsRemaining : 0;
  const canSkip = elapsed >= AD_SKIP_DELAY || adSecondsRemaining <= 0;
  const skipCountdown = Math.max(0, AD_SKIP_DELAY - elapsed);

  // First 9.5s is dedicated to Moodify's sonic brand identity intro
  const isBrandIdent = elapsed < 9.5;
  const progressPercent = adTotalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / adTotalDuration) * 100)) : 0;

  return (
    <aside
      aria-label="Thông báo phát quảng cáo và nhận diện thương hiệu"
      className="fixed inset-x-0 bottom-24 z-50 px-4 flex justify-center pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      {/* Outer Shell: Double-Bezel Architectural Frame */}
      <div className="relative w-full max-w-xl rounded-3xl p-[1px] bg-gradient-to-b from-white/20 via-white/10 to-transparent shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9),0_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl overflow-hidden">
        {/* Ambient Studio Lighting Mesh */}
        <div className="absolute -top-16 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Inner Core */}
        <div className="relative rounded-[calc(1.5rem-1px)] bg-[#090a0f]/95 p-4 sm:p-5 flex flex-col gap-3.5 border border-white/5">
          <div className="flex items-center justify-between gap-4">
            {/* Visual Artwork & Content */}
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Art-Directed Squircle Vinyl/Headphones Frame */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden ring-1 ring-white/15 shrink-0 bg-neutral-900 shadow-xl group">
                <Image
                  src={
                    isBrandIdent
                      ? "/images/ads/moodify_brand_ident_art.jpg"
                      : "/images/ads/moodify_vip_premium_art.jpg"
                  }
                  alt={isBrandIdent ? "Moodify Sonic Ident" : "Moodify Premium"}
                  fill
                  sizes="64px"
                  className={`object-cover transition-transform duration-1000 ${
                    isBrandIdent ? "scale-105 animate-[spin_24s_linear_infinite]" : "scale-100"
                  }`}
                  priority
                />
                {/* Subtle Glass Sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none" />
                {isBrandIdent && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Disc3 className="w-5 h-5 text-amber-300/80 animate-spin" />
                  </div>
                )}
              </div>

              {/* Text Hierarchy */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-[0.2em] bg-white/5 border border-white/10 text-white/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    {isBrandIdent
                      ? "SONIC IDENT"
                      : isBasicUpsell
                      ? "HẾT HẠN MỨC NGÀY"
                      : "SPONSORED SESSION"}
                  </span>
                </div>

                <h4 className="text-sm font-medium text-white tracking-tight truncate">
                  {isBrandIdent
                    ? "Moodify • Âm Nhạc Theo Cách Của Bạn"
                    : isBasicUpsell
                    ? "Đã nghe hết 15 bài hôm nay"
                    : "Mở khóa trải nghiệm âm nhạc chuẩn studio"}
                </h4>

                <p className="text-xs text-white/60 font-light leading-snug line-clamp-1 mt-0.5">
                  {isBrandIdent
                    ? "Nhạc hiệu độc quyền định danh không gian âm thanh Moodify."
                    : isBasicUpsell
                    ? "Nâng cấp lên gói FULL hoặc Gia Đình để nghe không giới hạn 24/7."
                    : "Chỉ từ 29.000đ/tháng để loại bỏ quảng cáo và nghe chất lượng Lossless."}
                </p>
              </div>
            </div>

            {/* Tactile Button Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={skipAd}
                disabled={!canSkip}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  canSkip
                    ? "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 active:scale-[0.98] cursor-pointer"
                    : "bg-transparent text-white/30 border border-white/5 cursor-not-allowed"
                }`}
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {canSkip ? "Bỏ qua" : `Bỏ qua sau ${skipCountdown}s`}
                </span>
                <span className="sm:hidden">{canSkip ? "Bỏ qua" : `${skipCountdown}s`}</span>
              </button>

              <Link
                href="/dashboard/premium"
                onClick={skipAd}
                className="inline-flex items-center gap-2 pl-3.5 pr-1.5 py-1 rounded-full bg-white text-neutral-950 text-xs font-medium hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.18)] group cursor-pointer"
              >
                <span className="tracking-tight">
                  {isBasicUpsell ? "Lên FULL" : "Nâng VIP"}
                </span>
                <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                  <ArrowUpRight className="w-3.5 h-3.5 text-neutral-950" />
                </span>
              </Link>
            </div>
          </div>

          {/* Minimalist Hairline Progress & Acoustic Status */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-white/40 tracking-wider">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400/80" />
                {isBrandIdent ? "GIAI ĐIỆU ĐỊNH DANH MOODIFY" : "QUẢNG CÁO TÀI TRỢ"}
              </span>
              <span>còn {adSecondsRemaining}s</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
