"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Search,
  Sparkles,
  Music2,
  Mic2,
  Disc3,
  Heart,
  ChevronRight,
  X,
  Volume2,
} from "lucide-react";
import {
  fetchMyListeningHistory,
  deleteMyHistoryItem,
  clearMyListeningHistory,
  addToLibrary,
  removeFromLibrary,
  isTrackInLibrary,
  type UserListeningHistoryItem,
  type UserListeningHistorySummary,
} from "@/lib/api-client";
import { usePlayer, type PlayerTrack } from "@/components/dashboard/player-context";
import TrackActionMenu from "@/components/dashboard/track-action-menu";
import { MiniSparkline } from "@/components/dashboard/charts/mini-sparkline";
import { InteractiveBarChart } from "@/components/dashboard/charts/interactive-bar-chart";
import { InteractiveDonutChart } from "@/components/dashboard/charts/interactive-donut-chart";

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "--";
  try {
    const d = new Date(dateStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24 && d.getDate() === now.getDate()) {
      return `${diffHours} giờ trước`;
    }
    if (diffDays === 1 || (diffDays < 2 && d.getDate() === now.getDate() - 1)) {
      return `Hôm qua, ${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function getTimeGroup(dateStr?: string): "Hôm nay" | "Hôm qua" | "Tuần này" | "Trước đó" {
  if (!dateStr) return "Trước đó";
  try {
    const d = new Date(dateStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return "Trước đó";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (d.toDateString() === now.toDateString()) return "Hôm nay";
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Hôm qua";
    if (diffDays < 7) return "Tuần này";
    return "Trước đó";
  } catch {
    return "Trước đó";
  }
}

export default function UserListeningHistoryPage() {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();

  const [historyItems, setHistoryItems] = useState<UserListeningHistoryItem[]>([]);
  const [summary, setSummary] = useState<UserListeningHistorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<"ALL" | "TODAY" | "YESTERDAY" | "WEEK">("ALL");

  // Track liked status cache
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  // Clear history modal state
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Load history from API
  const loadHistory = useCallback(async (query = searchQuery, isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await fetchMyListeningHistory({
        page: 0,
        size: 50,
        search: query.trim() || undefined,
      });
      const items = data.items || [];
      setHistoryItems(items);
      setSummary(data.summary || null);

      // Check liked status in background
      const trackIds = items.map((it) => it.spotifyId || it.trackId).filter(Boolean);
      const uniqueIds = Array.from(new Set(trackIds));
      const checks = await Promise.allSettled(
        uniqueIds.slice(0, 30).map(async (id) => {
          const liked = await isTrackInLibrary(id);
          return { id, liked };
        })
      );
      const newLikedMap: Record<string, boolean> = {};
      checks.forEach((res) => {
        if (res.status === "fulfilled") {
          newLikedMap[res.value.id] = res.value.liked;
        }
      });
      setLikedMap((prev) => ({ ...prev, ...newLikedMap }));
    } catch (err) {
      console.error("Lỗi khi tải lịch sử nghe:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Toggle favorite / like track
  const handleToggleLike = async (e: React.MouseEvent, item: UserListeningHistoryItem) => {
    e.stopPropagation();
    const id = item.spotifyId || item.trackId;
    if (!id) return;
    const isCurrentlyLiked = !!likedMap[id];
    try {
      if (isCurrentlyLiked) {
        await removeFromLibrary(id);
        setLikedMap((prev) => ({ ...prev, [id]: false }));
      } else {
        await addToLibrary(id);
        setLikedMap((prev) => ({ ...prev, [id]: true }));
      }
    } catch (err) {
      console.error("Lỗi cập nhật yêu thích:", err);
    }
  };

  // Delete single history item
  const handleDeleteItem = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await deleteMyHistoryItem(id);
      setHistoryItems((prev) => prev.filter((it) => it.id !== id));
      if (summary) {
        setSummary({
          ...summary,
          totalListenedTracks: Math.max(0, summary.totalListenedTracks - 1),
        });
      }
    } catch (err) {
      console.error("Lỗi khi xóa bài hát khỏi lịch sử:", err);
    }
  };

  // Clear all history
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearMyListeningHistory();
      setHistoryItems([]);
      setIsClearModalOpen(false);
      setSummary({
        totalListenedTracks: 0,
        totalListenedMinutes: 0,
        totalListenedHours: 0,
        completionRatePercent: 0,
        totalCompletedSessions: 0,
      });
    } catch (err) {
      console.error("Lỗi khi xóa toàn bộ lịch sử:", err);
    } finally {
      setIsClearing(false);
    }
  };

  // Convert history item to PlayerTrack format
  const toPlayerTrack = (item: UserListeningHistoryItem): PlayerTrack => {
    return {
      id: item.trackId,
      spotifyId: item.spotifyId || item.trackId,
      name: item.title || item.trackTitle || "Không rõ tên",
      artistName: item.artist || item.artistName || "Nghệ sĩ",
      albumName: "Moodify",
      imageUrl: item.coverUrl,
      audioUrl: item.audioUrl,
      durationMs: item.durationMs,
      lyricsSynced: item.lyricsSynced,
      lyricsPlain: item.lyricsPlain,
    };
  };

  // Play a specific item or toggle
  const handlePlayItem = (e: React.MouseEvent, item: UserListeningHistoryItem) => {
    e.stopPropagation();
    const isCurrent =
      currentTrack && (currentTrack.id === item.trackId || currentTrack.spotifyId === item.trackId);
    if (isCurrent) {
      togglePlay();
    } else {
      const playerTrack = toPlayerTrack(item);
      const queueList = historyItems.map(toPlayerTrack);
      playTrack(playerTrack, queueList);
    }
  };

  // Play all items from history
  const handlePlayAll = () => {
    if (historyItems.length === 0) return;
    const first = toPlayerTrack(historyItems[0]);
    const queueList = historyItems.map(toPlayerTrack);
    playTrack(first, queueList);
  };

  // Calculate top artist and top genre
  const { topArtist, topGenre } = useMemo(() => {
    if (!historyItems.length) return { topArtist: "--", topGenre: "--" };
    const artistCounts: Record<string, number> = {};
    const genreCounts: Record<string, number> = {};

    for (const item of historyItems) {
      const artist = (item.artist || item.artistName || "").trim();
      if (artist && artist !== "Nghệ sĩ" && artist !== "Moodify Artist") {
        artistCounts[artist] = (artistCounts[artist] || 0) + 1;
      }
      const genre = (item.genre || "").trim();
      if (genre) {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      }
    }

    const sortedArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]);
    const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);

    return {
      topArtist: sortedArtists[0]?.[0] || "Đa dạng",
      topGenre: sortedGenres[0]?.[0] || "V-Pop",
    };
  }, [historyItems]);

  // Activity breakdown by day of week
  const activityData = useMemo(() => {
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    if (historyItems.length > 0) {
      historyItems.forEach((item) => {
        if (item.startedAt) {
          const d = new Date(item.startedAt.replace(" ", "T"));
          if (!isNaN(d.getTime())) {
            counts[d.getDay()] += 1;
          }
        }
      });
    }

    const orderedIndices = [1, 2, 3, 4, 5, 6, 0];
    return orderedIndices.map((dayIdx) => {
      const cnt = counts[dayIdx];
      return {
        label: dayNames[dayIdx],
        value: cnt,
        sublabel: `${cnt} bài`,
        color: cnt > 0 ? "#22d3ee" : "#334155",
      };
    });
  }, [historyItems]);

  // Genre breakdown donut data (100% from user listening history)
  const genreDonutData = useMemo(() => {
    if (historyItems.length === 0) return [];

    const genreCounts: Record<string, number> = {};
    historyItems.forEach((item) => {
      const g = (item.genre || "").trim() || "V-Pop";
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });

    const colors = ["#22d3ee", "#a855f7", "#10b981", "#f59e0b", "#ec4899", "#38bdf8"];
    const sorted = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return sorted.map(([genre, count], idx) => ({
      id: `genre-${idx}`,
      label: genre,
      value: count,
      color: colors[idx % colors.length],
    }));
  }, [historyItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return historyItems.filter((it) => {
      if (timeFilter === "ALL") return true;
      const grp = getTimeGroup(it.startedAt);
      if (timeFilter === "TODAY") return grp === "Hôm nay";
      if (timeFilter === "YESTERDAY") return grp === "Hôm qua";
      if (timeFilter === "WEEK") return grp === "Hôm nay" || grp === "Hôm qua" || grp === "Tuần này";
      return true;
    });
  }, [historyItems, timeFilter]);

  // Group items by time
  const groupedSections = useMemo(() => {
    const groups: { [key: string]: UserListeningHistoryItem[] } = {
      "Hôm nay": [],
      "Hôm qua": [],
      "Tuần này": [],
      "Trước đó": [],
    };

    for (const item of filteredItems) {
      const g = getTimeGroup(item.startedAt);
      groups[g].push(item);
    }

    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [filteredItems]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-teal-500/20 border border-white/10 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Clock className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Lịch Sử Nghe Nhạc
              <span className="text-xs px-2.5 py-0.5 rounded-full font-normal bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {historyItems.length} bài đã lưu
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-0.5">
              Những bài hát bạn đã thưởng thức gần đây trên Moodify.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => loadHistory(searchQuery, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            <span>Làm mới</span>
          </button>

          {historyItems.length > 0 && (
            <>
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-black bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Phát tất cả</span>
              </button>

              <button
                onClick={() => setIsClearModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 transition-all cursor-pointer"
                title="Xóa toàn bộ lịch sử"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa lịch sử</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Thống kê âm nhạc thân thiện & trực quan hóa ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-white/50 text-xs mb-1">
              <span>Tổng bài đã nghe</span>
              <Music2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {summary ? summary.totalListenedTracks.toLocaleString() : historyItems.length}
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">Lượt nghe tích lũy</p>
          </div>
          <div className="pt-2">
            <MiniSparkline
              data={activityData.map((d) => d.value)}
              color="#22d3ee"
              height={24}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-white/50 text-xs mb-1">
              <span>Thời gian nghe</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-300 tracking-tight">
              {summary ? `${summary.totalListenedHours}h` : "0h"}
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">
              {summary ? `≈ ${summary.totalListenedMinutes} phút thưởng thức` : "0 phút"}
            </p>
          </div>
          <div className="pt-2">
            <MiniSparkline
              data={activityData.map((d) => d.value * 3)}
              color="#c084fc"
              height={24}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-white/50 text-xs mb-1">
              <span>Nghệ sĩ nghe nhiều</span>
              <Mic2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-white truncate tracking-tight">
              {topArtist}
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">Thường xuyên phát gần đây</p>
          </div>
          <div className="pt-2">
            <MiniSparkline
              data={activityData.map((d) => d.value)}
              color="#10b981"
              height={24}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-white/50 text-xs mb-1">
              <span>Thể loại yêu thích</span>
              <Disc3 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-white truncate tracking-tight">
              {topGenre}
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">Gu âm nhạc của bạn</p>
          </div>
          <div className="pt-2">
            <MiniSparkline
              data={genreDonutData.length > 0 ? genreDonutData.map((d) => d.value) : [0, 0]}
              color="#f59e0b"
              height={24}
            />
          </div>
        </div>
      </div>

      {/* ── Biểu đồ trực quan: Nhịp điệu hoạt động & Phân bổ thể loại ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
        <div className="lg:col-span-7">
          <InteractiveBarChart
            title="Nhịp Điệu Hoạt Động Theo Ngày"
            subtitle="Số bài hát được bạn thưởng thức phân bổ theo các ngày trong tuần"
            data={activityData}
            valueSuffix=" bài"
            defaultColor="#22d3ee"
            height={185}
          />
        </div>
        <div className="lg:col-span-5">
          <InteractiveDonutChart
            title="Gu Âm Nhạc & Thể Loại"
            subtitle="Tỷ lệ phân bổ các dòng nhạc trong lịch sử nghe của bạn"
            data={genreDonutData}
            centerLabel="Gu Âm Nhạc"
            size={180}
            strokeWidth={22}
          />
        </div>
      </div>

      {/* ── Thanh tìm kiếm & Bộ lọc thời gian ─────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Tìm kiếm bài hát hoặc nghệ sĩ trong lịch sử..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/50 focus:bg-white/[0.06] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Time filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "TODAY", label: "Hôm nay" },
            { id: "YESTERDAY", label: "Hôm qua" },
            { id: "WEEK", label: "7 ngày qua" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                timeFilter === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.07] border border-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Danh sách bài hát (Spotify Standard Rows) ─────────── */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-white/40 gap-3">
          <RefreshCw className="w-7 h-7 animate-spin text-cyan-400" />
          <span className="text-xs sm:text-sm">Đang tải lịch sử nghe nhạc...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <Music2 className="w-7 h-7 text-white/30" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white">
            {searchQuery ? "Không tìm thấy bài hát nào" : "Chưa có bài hát nào trong lịch sử"}
          </h3>
          <p className="text-xs text-white/40 max-w-md mt-1">
            {searchQuery
              ? "Hãy thử tìm kiếm với tên bài hát hoặc nghệ sĩ khác."
              : "Bật phát một bài hát bất kỳ trên Moodify, hệ thống sẽ tự động lưu lại vào lịch sử để bạn nghe lại bất cứ lúc nào."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedSections.map(([groupTitle, items]) => (
            <div key={groupTitle} className="space-y-2">
              {/* Tiêu đề nhóm thời gian */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  {groupTitle}
                </span>
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[11px] text-white/40 font-mono">
                  {items.length} bài
                </span>
              </div>

              {/* Bảng danh sách bài hát */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md overflow-hidden divide-y divide-white/[0.04]">
                {items.map((item, idx) => {
                  const isCurrentPlaying =
                    currentTrack &&
                    (currentTrack.id === item.trackId || currentTrack.spotifyId === item.trackId) &&
                    isPlaying;
                  const isThisTrackActive =
                    currentTrack &&
                    (currentTrack.id === item.trackId || currentTrack.spotifyId === item.trackId);
                  const isLiked = !!likedMap[item.spotifyId || item.trackId];

                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      onClick={(e) => handlePlayItem(e, item)}
                      className={`group flex items-center justify-between p-3 sm:px-4 hover:bg-white/[0.05] transition-all cursor-pointer ${
                        isThisTrackActive ? "bg-cyan-500/[0.07] border-l-2 border-cyan-400" : ""
                      }`}
                    >
                      {/* Cột 1: STT / Play Button & Thông tin bài hát */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Number or Equalizer / Play button */}
                        <div className="w-6 text-center shrink-0 hidden sm:block">
                          {isCurrentPlaying ? (
                            <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse mx-auto" />
                          ) : (
                            <span className="text-xs text-white/30 group-hover:hidden font-mono">
                              {idx + 1}
                            </span>
                          )}
                          <button
                            onClick={(e) => handlePlayItem(e, item)}
                            className="hidden group-hover:block mx-auto text-white hover:text-cyan-400"
                          >
                            {isCurrentPlaying ? (
                              <Pause className="w-4 h-4 fill-current text-cyan-400" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>
                        </div>

                        {/* Cover Image */}
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              item.coverUrl ||
                              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=240"
                            }
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            onClick={(e) => handlePlayItem(e, item)}
                            className={`sm:hidden absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
                              isCurrentPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            {isCurrentPlaying ? (
                              <Pause className="w-4 h-4 text-cyan-400 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                            )}
                          </button>
                        </div>

                        {/* Title & Artist */}
                        <div className="min-w-0 flex-1">
                          <h4
                            className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                              isThisTrackActive ? "text-cyan-300" : "text-white group-hover:text-cyan-300"
                            }`}
                          >
                            {item.title || item.trackTitle || "Không rõ"}
                          </h4>
                          <p className="text-[11px] text-white/50 truncate mt-0.5">
                            {item.artist || item.artistName || "Moodify Artist"}
                          </p>
                        </div>
                      </div>

                      {/* Cột 2: Thể loại (Genre) */}
                      {item.genre && (
                        <div className="hidden md:flex items-center px-4 shrink-0 w-28">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-white/60 border border-white/5 truncate">
                            {item.genre}
                          </span>
                        </div>
                      )}

                      {/* Cột 3: Thời điểm nghe (Friendly relative time) */}
                      <div className="hidden sm:flex flex-col items-end px-4 shrink-0 text-right w-36">
                        <span className="text-[11px] text-white/60 font-mono">
                          {formatRelativeTime(item.startedAt)}
                        </span>
                      </div>

                      {/* Cột 4: Thời lượng bài hát */}
                      <div className="hidden lg:flex items-center justify-end px-3 shrink-0 w-16 text-right">
                        <span className="text-[11px] text-white/40 font-mono">
                          {item.totalDuration || "3:30"}
                        </span>
                      </div>

                      {/* Cột 5: Hành động nhanh (Heart, Menu, Xóa) */}
                      <div className="flex items-center gap-1.5 pl-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Nút thả tim / yêu thích */}
                        <button
                          onClick={(e) => handleToggleLike(e, item)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isLiked
                              ? "text-rose-500 hover:text-rose-400"
                              : "text-white/30 hover:text-white"
                          }`}
                          title={isLiked ? "Bỏ yêu thích" : "Thêm vào danh sách yêu thích"}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                        </button>

                        {/* Menu ba chấm (Thêm vào playlist, chia sẻ) */}
                        <TrackActionMenu
                          track={{
                            id: item.trackId,
                            spotifyId: item.spotifyId || item.trackId,
                            name: item.title || item.trackTitle,
                            title: item.title || item.trackTitle,
                            artist: item.artist || item.artistName,
                            artistName: item.artist || item.artistName,
                            imageUrl: item.coverUrl,
                            cover: item.coverUrl,
                            durationMs: item.durationMs,
                            lyricsSynced: item.lyricsSynced,
                            lyricsPlain: item.lyricsPlain,
                          }}
                          isLiked={isLiked}
                          onLikeChange={(liked) => {
                            const trackIdKey = item.spotifyId || item.trackId;
                            if (trackIdKey) {
                              setLikedMap((prev) => ({ ...prev, [trackIdKey]: liked }));
                            }
                          }}
                        />

                        {/* Nút xóa bài khỏi lịch sử */}
                        <button
                          onClick={(e) => handleDeleteItem(e, item.id)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Xóa bài này khỏi lịch sử nghe"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal xác nhận xóa toàn bộ lịch sử ──────────────── */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121620] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Xóa toàn bộ lịch sử nghe nhạc?
              </h3>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Hành động này sẽ xóa sạch danh sách tất cả các bài hát bạn đã nghe khỏi lịch sử cá nhân. Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsClearModalOpen(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleClearAll}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                {isClearing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
