"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Album,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Disc3,
  History,
  ListMusic,
  LoaderCircle,
  Music2,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  clearMySearchHistory,
  deleteMySearchHistoryItem,
  fetchMySearchHistory,
  recordMySearchHistory,
  type SearchHistoryItem,
  type SearchHistoryPage,
  type SearchHistoryType,
} from "@/lib/api-client";
import { queueEmotionSearchHistory } from "@/lib/mood-search-history";

const PAGE_SIZE = 20;

const FILTERS: { label: string; value: SearchHistoryType | "" }[] = [
  { label: "Tất cả", value: "" },
  { label: "Bài hát", value: "TRACK" },
  { label: "Nghệ sĩ", value: "ARTIST" },
  { label: "Album", value: "ALBUM" },
  { label: "Playlist", value: "PLAYLIST" },
  { label: "Theo tâm trạng", value: "EMOTION" },
];

const EMPTY_PAGE: SearchHistoryPage = {
  content: [],
  number: 0,
  size: PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};

const TYPE_LABELS: Record<SearchHistoryType, string> = {
  ALL: "Tìm kiếm tổng hợp",
  TRACK: "Bài hát",
  ARTIST: "Nghệ sĩ",
  ALBUM: "Album",
  PLAYLIST: "Playlist",
  EMOTION: "Theo tâm trạng",
};

function TypeIcon({ type }: { type: SearchHistoryType }) {
  const Icon = type === "ARTIST"
    ? Users
    : type === "ALBUM"
      ? Album
      : type === "PLAYLIST"
        ? ListMusic
        : type === "EMOTION"
          ? History
          : type === "ALL"
            ? Search
            : Music2;

  return <Icon className="h-4 w-4" />;
}

function formatSearchedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa tìm kiếm";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserSearchHistoryPage() {
  const router = useRouter();
  const [historyPage, setHistoryPage] = useState<SearchHistoryPage>(EMPTY_PAGE);
  const [selectedType, setSelectedType] = useState<SearchHistoryType | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(0);
      setQuery(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadHistory = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetchMySearchHistory({
        page,
        size: PAGE_SIZE,
        type: selectedType,
        query,
      });
      if (requestId === requestIdRef.current) setHistoryPage(response);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Không thể tải lịch sử tìm kiếm.");
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [page, query, selectedType]);

  useEffect(() => {
    void loadHistory();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadHistory]);

  const handleDelete = async (item: SearchHistoryItem) => {
    setBusyItemId(item.id);
    setError("");
    try {
      await deleteMySearchHistoryItem(item.id);
      if (historyPage.content.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        await loadHistory();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không thể xóa mục lịch sử.");
    } finally {
      setBusyItemId(null);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    setError("");
    try {
      await clearMySearchHistory();
      setConfirmClear(false);
      setPage(0);
      setHistoryPage(EMPTY_PAGE);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Không thể xóa lịch sử tìm kiếm.");
    } finally {
      setClearing(false);
    }
  };

  const handleSearchAgain = (item: SearchHistoryItem) => {
    const params = new URLSearchParams({ q: item.keyword });
    if (item.searchType === "EMOTION") {
      params.set("mode", "mood");
      params.set("type", "EMOTION");
    } else if (item.searchType !== "ALL") {
      params.set("type", item.searchType);
    }

    if (item.searchType === "EMOTION") {
      queueEmotionSearchHistory(item.keyword);
    } else {
      void recordMySearchHistory({
        keyword: item.keyword,
        searchType: item.searchType,
      }).catch(() => undefined);
    }
    router.push(`/dashboard/search?${params.toString()}`);
  };

  const hasFilters = Boolean(selectedType || query);
  const hasAnyHistory = historyPage.totalElements > 0 || hasFilters;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0c0d18]/80 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="border-b border-white/[0.08] bg-gradient-to-r from-purple-950/50 via-[#101122] to-cyan-950/30 px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-300/20 bg-purple-400/10 text-purple-200 shadow-[0_0_28px_rgba(168,85,247,0.16)]">
                <History className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-200/80">
                    Cá nhân
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/60">
                    {historyPage.totalElements.toLocaleString("vi-VN")} mục
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Lịch sử tìm kiếm
                </h1>
                <p className="mt-1 text-sm text-white/50">
                  Xem lại và tìm lại những gì bạn đã khám phá trên Moodify.
                </p>
              </div>
            </div>

            {hasAnyHistory && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-rose-400/20 bg-rose-500/[0.08] px-3.5 py-2.5 text-xs font-semibold text-rose-200 transition hover:border-rose-300/40 hover:bg-rose-500/[0.14] sm:self-auto"
              >
                <Trash2 className="h-4 w-4" />
                Xóa lịch sử
              </button>
            )}
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tìm trong lịch sử..."
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-purple-400/40 focus:bg-white/[0.055]"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Xóa từ khóa lọc"
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:justify-end">
              {FILTERS.map((filter) => {
                const active = selectedType === filter.value;
                return (
                  <button
                    key={filter.label}
                    type="button"
                    onClick={() => {
                      setSelectedType(filter.value);
                      setPage(0);
                    }}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-purple-300/40 bg-purple-400/15 text-purple-100 shadow-[0_0_18px_rgba(168,85,247,0.12)]"
                        : "border-white/[0.08] bg-white/[0.025] text-white/55 hover:border-white/20 hover:text-white/85"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-500/[0.07] px-4 py-3 text-sm text-rose-200">
              <span>{error}</span>
              <button type="button" onClick={() => void loadHistory()} className="shrink-0 font-semibold underline underline-offset-2">
                Thử lại
              </button>
            </div>
          )}

          <div className="min-h-[260px]">
            {loading ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-sm text-white/45">
                <LoaderCircle className="h-6 w-6 animate-spin text-purple-300" />
                Đang tải lịch sử tìm kiếm...
              </div>
            ) : historyPage.content.length > 0 ? (
              <div className="space-y-2">
                {historyPage.content.map((item) => (
                  <article
                    key={item.id}
                    className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-purple-300/20 hover:bg-white/[0.045] sm:gap-4 sm:px-4"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      item.searchType === "EMOTION"
                        ? "border-fuchsia-300/15 bg-fuchsia-400/[0.08] text-fuchsia-200"
                        : "border-cyan-300/15 bg-cyan-400/[0.07] text-cyan-200"
                    }`}>
                      <TypeIcon type={item.searchType} />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSearchAgain(item)}
                      className="min-w-0 flex-1 text-left"
                      title="Tìm lại từ khóa này"
                    >
                      <span className="block truncate text-sm font-semibold text-white/90 sm:text-[15px]">
                        {item.keyword}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/40">
                        <span>{TYPE_LABELS[item.searchType]}</span>
                        {item.detectedEmotion && (
                          <span className="rounded-full border border-fuchsia-300/15 bg-fuchsia-400/[0.06] px-2 py-0.5 text-fuchsia-200/75">
                            {item.detectedEmotion}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {formatSearchedAt(item.searchedAt)}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSearchAgain(item)}
                      aria-label={`Tìm lại: ${item.keyword}`}
                      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/35 transition hover:bg-purple-400/10 hover:text-purple-100 sm:flex"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      disabled={busyItemId === item.id || clearing}
                      aria-label={`Xóa: ${item.keyword}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/35 transition hover:bg-rose-400/10 hover:text-rose-200 disabled:opacity-40"
                    >
                      {busyItemId === item.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-4 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-white/35">
                  {hasFilters ? <Search className="h-6 w-6" /> : <Disc3 className="h-6 w-6" />}
                </div>
                <h2 className="text-base font-semibold text-white/80">
                  {hasFilters ? "Không tìm thấy kết quả" : "Chưa có lịch sử tìm kiếm"}
                </h2>
                <p className="mt-1 max-w-sm text-sm text-white/40">
                  {hasFilters
                    ? "Thử đổi từ khóa hoặc chọn loại tìm kiếm khác."
                    : "Những lần tìm kiếm bạn gửi sẽ xuất hiện ở đây để dễ dàng tìm lại."}
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSelectedType("");
                      setPage(0);
                    }}
                    className="mt-4 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/65 transition hover:border-white/20 hover:text-white"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            )}
          </div>

          {historyPage.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/[0.07] pt-4">
              <p className="text-xs text-white/40">
                Trang {historyPage.number + 1} / {historyPage.totalPages}
                <span className="hidden sm:inline"> · {historyPage.totalElements.toLocaleString("vi-VN")} kết quả</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={historyPage.first || loading}
                  aria-label="Trang trước"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/65 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={historyPage.last || loading}
                  aria-label="Trang tiếp theo"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/65 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {confirmClear && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-search-history-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11121e] p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="clear-search-history-title" className="text-lg font-bold text-white">
                  Xóa toàn bộ lịch sử tìm kiếm?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-white/50">
                  Thao tác này sẽ xóa toàn bộ lịch sử tìm kiếm khỏi tài khoản của bạn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                disabled={clearing}
                aria-label="Đóng hộp thoại"
                className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                disabled={clearing}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/[0.05] disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleClear()}
                disabled={clearing}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-500/15 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-50"
              >
                {clearing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
