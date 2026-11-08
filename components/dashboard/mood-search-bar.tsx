"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  HeartPulse,
  LoaderCircle,
  Music2,
  Search,
  X,
} from "lucide-react";
import { useOptionalPlayer } from "./player-context";
import {
  fetchTracks,
  recordMySearchHistory,
  type Track,
} from "@/lib/api-client";
import { queueEmotionSearchHistory } from "@/lib/mood-search-history";

type QuickSearchSuggestion = { kind: "TRACK"; title: string };

const EMPTY_QUICK_RESULTS = { tracks: [] as Track[] };
const QUICK_SEARCH_DEBOUNCE_MS = 350;
const QUICK_SEARCH_MIN_LENGTH = 2;

function resolveQuickCoverUrl(rawUrl?: string | null) {
  const url = rawUrl?.trim();
  if (!url) return null;
  if (url.startsWith("//")) return `https:${url}`;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  const apiOrigin = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8088")
    .replace(/\/$/, "")
    .replace(/\/api$/i, "");
  return `${apiOrigin}/${url.replace(/^\/+/, "")}`;
}

function QuickTrackCover({ track }: { track: Track }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = resolveQuickCoverUrl(track.imageUrl);

  if (!imageUrl || imageFailed) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-purple-200">
        <Music2 className="h-4 w-4" />
      </span>
    );
  }

  return (
    <img
      src={imageUrl}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setImageFailed(true)}
      className="h-9 w-9 shrink-0 rounded-lg bg-white/[0.06] object-cover"
    />
  );
}

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
  const [quickResults, setQuickResults] = useState(EMPTY_QUICK_RESULTS);
  const [quickSearchStatus, setQuickSearchStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [isQuickResultsOpen, setIsQuickResultsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  useEffect(() => {
    if (isControlledValue || effectiveIsMood) return;

    const query = internalSearchValue.trim();
    if (query.length < QUICK_SEARCH_MIN_LENGTH) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setQuickSearchStatus("loading");

      void fetchTracks({ query, size: 5, signal: controller.signal })
        .then((trackPage) => {
          if (controller.signal.aborted) return;
          setQuickResults({
            tracks: trackPage.content.slice(0, 5),
          });
          setActiveSuggestionIndex(-1);
          setQuickSearchStatus("ready");
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setQuickResults(EMPTY_QUICK_RESULTS);
          setQuickSearchStatus("error");
        });
    }, QUICK_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [effectiveIsMood, internalSearchValue, isControlledValue]);

  const quickSuggestions: QuickSearchSuggestion[] = quickResults.tracks.map((track) => ({
    kind: "TRACK",
    title: track.name,
  }));

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
      setQuickResults(EMPTY_QUICK_RESULTS);
      setQuickSearchStatus(newVal.trim().length >= QUICK_SEARCH_MIN_LENGTH && !effectiveIsMood ? "loading" : "idle");
      setIsQuickResultsOpen(newVal.trim().length >= QUICK_SEARCH_MIN_LENGTH && !effectiveIsMood);
    }
    setActiveSuggestionIndex(-1);
  };

  const handleClear = () => {
    handleInputChange("");
    inputRef.current?.focus();
  };

  const handleToggleMood = () => {
    if (!isVip) return;
    const nextMood = !effectiveIsMood;
    setQuickResults(EMPTY_QUICK_RESULTS);
    setQuickSearchStatus("idle");
    setIsQuickResultsOpen(false);
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
    setIsQuickResultsOpen(false);

    if (onSubmit) {
      onSubmit(query, effectiveIsMood);
      return;
    }

    if (query) {
      if (effectiveIsMood) {
        queueEmotionSearchHistory(query);
      } else {
        void recordMySearchHistory({ keyword: query, searchType: "ALL" }).catch(() => undefined);
      }
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

  const handleSuggestionSelect = (suggestion: QuickSearchSuggestion) => {
    setIsQuickResultsOpen(false);
    void recordMySearchHistory({ keyword: suggestion.title, searchType: suggestion.kind }).catch(() => undefined);
    const params = new URLSearchParams({ q: suggestion.title, type: suggestion.kind });
    router.push(`/dashboard/search?${params.toString()}`);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsQuickResultsOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (!isQuickResultsOpen || quickSuggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % quickSuggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current <= 0 ? quickSuggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      handleSuggestionSelect(quickSuggestions[activeSuggestionIndex]);
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
          onFocus={() => {
            if (!isControlledValue && effectiveSearchValue.trim().length >= QUICK_SEARCH_MIN_LENGTH && !effectiveIsMood) {
              setIsQuickResultsOpen(true);
            }
          }}
          onBlur={() => window.setTimeout(() => {
            setIsQuickResultsOpen(false);
            setActiveSuggestionIndex(-1);
          }, 120)}
          onKeyDown={handleInputKeyDown}
          role={!isControlledValue ? "combobox" : undefined}
          aria-label={!isControlledValue ? placeholder || defaultPlaceholder : undefined}
          aria-autocomplete={!isControlledValue ? "list" : undefined}
          aria-expanded={!isControlledValue ? isQuickResultsOpen : undefined}
          aria-controls={!isControlledValue ? "mood-search-quick-results" : undefined}
          aria-activedescendant={
            !isControlledValue && activeSuggestionIndex >= 0
              ? `mood-search-suggestion-${activeSuggestionIndex}`
              : undefined
          }
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

        {!isControlledValue && isQuickResultsOpen && !effectiveIsMood && effectiveSearchValue.trim().length >= QUICK_SEARCH_MIN_LENGTH && (
          <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#10111d] shadow-[0_20px_55px_rgba(0,0,0,0.55)]">
            <div id="mood-search-quick-results" role="listbox" aria-label="Gợi ý tìm kiếm" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
              {quickSearchStatus === "loading" && (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-white/55">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Đang tìm gợi ý...
                </div>
              )}

              {quickSearchStatus === "error" && (
                <p className="px-3 py-4 text-sm text-white/50">Chưa tải được gợi ý. Bạn vẫn có thể nhấn Enter để xem kết quả.</p>
              )}

              {quickSearchStatus === "ready" && quickSuggestions.length === 0 && (
                <p className="px-3 py-4 text-sm text-white/50">Không tìm thấy gợi ý phù hợp.</p>
              )}

              {quickResults.tracks.length > 0 && (
                <div role="group" aria-label="Bài hát">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">Bài hát</p>
                  {quickResults.tracks.map((track, index) => (
                    <button
                      id={`mood-search-suggestion-${index}`}
                      key={`track-${track.spotifyId || track.id}`}
                      type="button"
                      role="option"
                      aria-selected={activeSuggestionIndex === index}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionSelect({
                        kind: "TRACK",
                        title: track.name,
                      })}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${activeSuggestionIndex === index ? "bg-purple-500/20" : "hover:bg-white/[0.06]"}`}
                    >
                      <QuickTrackCover track={track} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{track.name}</span>
                        <span className="block truncate text-xs text-white/45">{track.artistName}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

            </div>

            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSubmit()}
              className="flex w-full items-center justify-between border-t border-white/[0.08] px-4 py-3 text-left text-xs font-semibold text-purple-200 transition hover:bg-white/[0.04]"
            >
              <span>Xem tất cả kết quả cho “{effectiveSearchValue.trim()}”</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
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
