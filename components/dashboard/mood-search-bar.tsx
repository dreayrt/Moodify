"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, HeartPulse } from "lucide-react";
import { useOptionalPlayer } from "./player-context";

export interface MoodSearchBarProps {
  className?: string;
  isPremium?: boolean;
  size?: "md" | "lg";
  autoFocus?: boolean;
  value?: string;
  onChange?: (val: string) => void;
  isMoodMode?: boolean;
  onToggleMood?: (nextMode: boolean) => void;
  onSubmit?: (val: string, isMood: boolean) => void;
  placeholder?: string;
}

export default function MoodSearchBar({
  className = "",
  isPremium,
  size = "md",
  autoFocus = false,
  value,
  onChange,
  isMoodMode: controlledMoodMode,
  onToggleMood,
  onSubmit,
  placeholder,
}: MoodSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const player = useOptionalPlayer();

  // Determine VIP status (prop takes precedence, then player context)
  const isVip = isPremium !== undefined ? isPremium : Boolean(player?.isPremiumUser);

  const isControlledValue = value !== undefined;
  const isControlledMood = controlledMoodMode !== undefined;

  const qParam = searchParams?.get("q") ?? "";
  const modeParam = searchParams?.get("mode") ?? "";

  // Uncontrolled states for Header usage
  const [prevQ, setPrevQ] = useState(qParam);
  const [internalSearchValue, setInternalSearchValue] = useState(qParam);
  const [internalMoodMode, setInternalMoodMode] = useState(() => modeParam === "mood");

  // Sync internal state with URL params if uncontrolled
  if (!isControlledValue && prevQ !== qParam) {
    setPrevQ(qParam);
    setInternalSearchValue(qParam);
  }

  const effectiveSearchValue = isControlledValue ? value : internalSearchValue;
  // Mood mode is only allowed if user is VIP
  const effectiveIsMood = isVip && (isControlledMood ? controlledMoodMode : internalMoodMode);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleInputChange = (newVal: string) => {
    if (isControlledValue) {
      onChange?.(newVal);
    } else {
      setInternalSearchValue(newVal);
    }
  };

  const handleClear = () => {
    handleInputChange("");
    inputRef.current?.focus();
  };

  const handleToggleMood = () => {
    if (!isVip) return;
    const nextMood = !effectiveIsMood;
    if (isControlledMood) {
      onToggleMood?.(nextMood);
    } else {
      setInternalMoodMode(nextMood);
    }
    inputRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = effectiveSearchValue.trim();

    if (onSubmit) {
      onSubmit(query, effectiveIsMood);
      return;
    }

    if (!query) {
      router.push("/dashboard/search");
      return;
    }

    if (effectiveIsMood) {
      router.push(`/dashboard/search?q=${encodeURIComponent(query)}&mode=mood`);
    } else {
      router.push(`/dashboard/search?q=${encodeURIComponent(query)}`);
    }
  };

  const isLg = size === "lg";

  const defaultPlaceholder = effectiveIsMood
    ? "Tìm theo cảm xúc (chill, trầm lắng, bùng nổ, tập trung)..."
    : isLg
    ? "Tìm theo tên bài hát, nghệ sĩ (Vô Tình, Ngọt, HIEUTHUHAI, v.v.)..."
    : "Tìm kiếm bài hát, nghệ sĩ, album...";

  return (
    <div
      className={`flex items-center gap-2.5 w-full ${
        isLg ? "max-w-2xl" : "max-w-xl"
      } ${className}`}
    >
      {/* Search Input Box */}
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-center flex-1 rounded-full transition-all duration-300 ${
          isLg ? "h-[46px] md:h-[48px]" : "h-[34px]"
        } ${
          effectiveIsMood
            ? "border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.25)] bg-[#0d0e1a]"
            : "border border-white/12 hover:border-white/20 bg-white/[0.05] hover:bg-white/[0.07]"
        }`}
      >
        {/* Search Icon */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
            isLg ? "left-4 text-white/50" : "left-3.5 text-white/40"
          }`}
        >
          <Search
            className={`transition-colors ${
              isLg ? "w-5 h-5" : "w-4 h-4"
            } ${effectiveIsMood ? "text-purple-300" : "text-white/40"}`}
            strokeWidth={1.8}
          />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={effectiveSearchValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder || defaultPlaceholder}
          className={`w-full bg-transparent rounded-full text-white placeholder:text-white/40 outline-none transition-all ${
            isLg
              ? "pl-12 pr-11 py-3 text-sm md:text-[15px]"
              : "pl-9.5 pr-8 py-1.5 text-xs"
          }`}
        />

        {/* Clear button inside input */}
        {effectiveSearchValue && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute top-1/2 -translate-y-1/2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${
              isLg ? "right-3.5 p-1.5" : "right-2.5 p-1"
            }`}
            title="Xóa tìm kiếm"
            aria-label="Xóa tìm kiếm"
          >
            <X className={isLg ? "w-4 h-4" : "w-3.5 h-3.5"} />
          </button>
        )}
      </form>

      {/* Separate Toggle Button (CHỈ HIỂN THỊ KHI TÀI KHOẢN VIP) */}
      {isVip && (
        <button
          type="button"
          onClick={handleToggleMood}
          className={`group shrink-0 flex items-center rounded-full font-medium transition-all duration-300 cursor-pointer select-none active:scale-95 ${
            isLg
              ? "h-[46px] md:h-[48px] px-4 gap-2.5 text-xs md:text-sm font-semibold"
              : "h-[34px] px-3 gap-2 text-xs"
          } ${
            effectiveIsMood
              ? "bg-gradient-to-r from-purple-500/25 to-pink-500/25 border border-purple-400/50 text-purple-200 shadow-[0_0_14px_rgba(168,85,247,0.35)]"
              : "bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-white/60 hover:text-white"
          }`}
          title={
            effectiveIsMood
              ? "Chế độ Mood VIP: Đang BẬT (Bấm để tắt)"
              : "Chế độ Mood VIP: Đang TẮT (Bấm để bật)"
          }
          aria-pressed={effectiveIsMood}
        >
          <HeartPulse
            className={`transition-transform duration-200 ${
              isLg ? "w-4 h-4" : "w-3.5 h-3.5"
            } ${
              effectiveIsMood
                ? "text-purple-300 scale-110 animate-pulse"
                : "text-white/40 group-hover:text-white/80"
            }`}
            strokeWidth={2}
          />
          <span className={isLg ? "text-xs md:text-[13px] tracking-wide" : "text-[11px] tracking-wide"}>
            Mood
          </span>

          {/* Switch Indicator */}
          <span
            className={`rounded-full transition-colors duration-200 relative p-0.5 flex items-center ${
              isLg ? "w-6 h-3.5" : "w-5 h-3"
            } ${effectiveIsMood ? "bg-purple-500" : "bg-white/20"}`}
          >
            <span
              className={`rounded-full bg-white shadow-sm transition-transform duration-200 ${
                isLg ? "w-2.5 h-2.5" : "w-2 h-2"
              } ${
                effectiveIsMood
                  ? isLg
                    ? "translate-x-2.5"
                    : "translate-x-2"
                  : "translate-x-0"
              }`}
            />
          </span>
        </button>
      )}
    </div>
  );
}
