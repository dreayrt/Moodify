"use client";

import React from "react";
import Link from "next/link";
import { Crown, Sparkles, Volume2, SkipForward, ShieldCheck } from "lucide-react";
import { usePlayer } from "./player-context";

export default function AdInterstitialBanner() {
  const { isAdPlaying, adSecondsRemaining, skipAd, isPremiumUser } = usePlayer();

  if (!isAdPlaying || isPremiumUser) {
    return null;
  }

  const canSkip = adSecondsRemaining <= 0;

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 px-4 flex justify-center pointer-events-auto animate-in slide-in-from-bottom-5 duration-300">
      <div className="relative w-full max-w-2xl rounded-2xl border-2 border-amber-400/80 bg-slate-950/95 backdrop-blur-2xl p-4 md:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.35)] overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left info */}
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Visual Icon */}
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-[1.5px] shrink-0 shadow-lg shadow-amber-500/25">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-sm">
                  QUẢNG CÁO
                </span>
                <span className="text-xs font-bold text-amber-300 truncate">
                  Moodify VIP • Âm Nhạc Không Giới Hạn
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                Trải nghiệm nghe nhạc <strong>100% không quảng cáo</strong>, tải MP3 ngoại tuyến và mở khóa trọn bộ linh vật hoàng gia chỉ từ <strong>49.000đ/tháng</strong>.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={skipAd}
              disabled={!canSkip}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                canSkip
                  ? "bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer active:scale-95 shadow-sm"
                  : "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
              }`}
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>
                {canSkip ? "Bỏ qua quảng cáo" : `Bỏ qua sau ${adSecondsRemaining}s`}
              </span>
            </button>

            <Link
              href="/dashboard/premium"
              onClick={skipAd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:brightness-110 text-slate-950 shadow-md shadow-amber-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Crown className="w-3.5 h-3.5 text-slate-950" />
              <span>Nâng cấp VIP (49K)</span>
            </Link>
          </div>
        </div>

        {/* Live Audio Ad Equalizer Bar */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[11px] text-amber-200/80">
              Đang phát thông điệp quảng cáo tài trợ...
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-1 h-2.5 bg-amber-400 rounded-full animate-bounce" />
            <div className="w-1 h-4 bg-amber-300 rounded-full animate-bounce [animation-delay:0.15s]" />
            <div className="w-1 h-3 bg-yellow-400 rounded-full animate-bounce [animation-delay:0.3s]" />
            <div className="w-1 h-5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.45s]" />
          </div>
        </div>
      </div>
    </div>
  );
}
