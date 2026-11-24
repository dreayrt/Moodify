"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Disc3,
  Edit2,
  Eye,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { fetchTracks, fetchPublicPlaylists, type Track, type Playlist } from "@/lib/api-client";
import { recommendationRequest } from "@/lib/recommendation-client";
import { AdminPagination } from "./shared/admin-pagination";
import { ModalPortal } from "./shared/modal-portal";

type CampaignTarget = {
  entityType: "TRACK" | "PLAYLIST";
  entityId: string;
};

type Campaign = {
  id: string;
  name: string;
  revision: number;
  startsAt: string;
  endsAt: string;
  priority: number;
  genres: string[];
  targets: CampaignTarget[];
  active: boolean;
  timezone: string;
};

type Readiness = {
  catalogTracks: number;
  eligibleTracks: number;
  publicPlaylists: number;
  requireActiveLicense: boolean;
  issues: Record<string, number>;
  demoCatalog?: boolean;
  standardEligibleTracks?: number;
};

type Operations = {
  runtime: {
    startedAt: string;
    flags: {
      enabled: boolean;
      collaborative: boolean;
      campaigns: boolean;
      revision: number;
    };
    counters: Record<string, number>;
  };
  outcomeQueue: {
    queued: number;
    capacity: number;
    circuitOpen: boolean;
  };
  monitor?: {
    available: boolean;
    stale?: boolean;
    at?: string;
    alerts?: string[];
  };
};

type CatalogReviewItem = {
  trackId: string;
  name: string;
  reasons: string[];
};

type CatalogReviewResponse = {
  generatedAt?: string;
  readOnly?: boolean;
  totalTracks: number;
  eligibleTracks: number;
  pendingTracks: number;
  offset: number;
  limit: number;
  items: CatalogReviewItem[];
};

type RecommendationsCurationTabProps = {
  onToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
};

const ISSUE_LABELS: Record<string, string> = {
  NOT_PUBLISHED: "Chưa xuất bản",
  NOT_PUBLIC: "Chưa đặt công khai",
  NOT_APPROVED: "Chưa qua kiểm duyệt",
  NO_AUDIO: "Thiếu tệp âm thanh",
  NO_LICENSE: "Chưa liên kết giấy phép bản quyền",
  LICENSE_NOT_EFFECTIVE: "Giấy phép hết hạn hoặc chưa hiệu lực",
  MISSING_MOOD_FEATURES: "Thiếu dữ liệu cảm xúc (vẫn được gợi ý)",
};

const REVIEW_REASON_LABELS: Record<string, string> = {
  VERIFY_PUBLICATION: "Chưa xuất bản",
  VERIFY_VISIBILITY: "Chưa đặt công khai",
  VERIFY_MODERATION: "Chưa qua kiểm duyệt",
  VERIFY_AUDIO: "Thiếu tệp âm thanh",
  VERIFY_LICENSE: "Chưa có giấy phép bản quyền",
  VERIFY_LICENSE_EFFECTIVE_DATES_AND_STATUS: "Giấy phép hết hạn hoặc chưa hiệu lực",
};

const MONITOR_ALERT_LABELS: Record<string, string> = {
  MONITOR_STALE: "Dữ liệu giám sát gợi ý chậm cập nhật hơn 3 phút",
  MONITOR_UNAVAILABLE: "Không đọc được trạng thái dịch vụ giám sát gợi ý",
  CATALOG_FEATURE_SCAN_STALE: "Tiến trình phân tích đặc trưng âm thanh chậm cập nhật",
  CATALOG_FEATURES_REQUIRE_REVIEW: "Có bài hát cần kiểm tra lại mã âm thanh hoặc dữ liệu cảm xúc",
  CATALOG_FEATURE_RETRY_PENDING: "Một số bài hát đang chờ phân tích lại đặc trưng âm thanh",
  CATALOG_FEATURE_SCAN_UNAVAILABLE: "Chưa có kết quả quét đặc trưng âm thanh kho nhạc",
  RECOMMENDATION_SEED_TIMER_INACTIVE: "Lịch cập nhật mô hình gợi ý định kỳ đang tắt",
  CATALOG_FEATURES_TIMER_INACTIVE: "Lịch quét đặc trưng âm thanh kho nhạc đang tắt",
};

const PRIORITY_PRESETS = [
  { value: 25, label: "Thấp · 25" },
  { value: 50, label: "Trung bình · 50" },
  { value: 80, label: "Cao · 80" },
  { value: 100, label: "Cao nhất · 100" },
] as const;

const COMPACT_DATE_TIME_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function translateMonitorAlert(code: string): string {
  return MONITOR_ALERT_LABELS[code] || `Cảnh báo vận hành (${code})`;
}

function formatDateTimeCompact(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return COMPACT_DATE_TIME_FORMAT.format(d);
}

function getPriorityBadge(priority: number): { label: string; cls: string } {
  if (priority >= 90) {
    return {
      label: "Cao nhất",
      cls: "bg-[#ff5500]/20 border-[#ff5500]/40 text-[#ff9966]",
    };
  }
  if (priority >= 70) {
    return {
      label: "Cao",
      cls: "bg-amber-500/15 border-amber-500/35 text-amber-300",
    };
  }
  if (priority >= 40) {
    return {
      label: "Trung bình",
      cls: "bg-sky-500/15 border-sky-500/35 text-sky-300",
    };
  }
  return {
    label: "Thấp",
    cls: "bg-zinc-500/15 border-zinc-500/35 text-zinc-300",
  };
}

function isCampaignExpired(campaign: Campaign, nowMs: number): boolean {
  const endMs = Date.parse(campaign.endsAt);
  return !Number.isNaN(endMs) && endMs <= nowMs;
}

function toDateTimeLocalValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RecommendationsCurationTab({ onToast }: RecommendationsCurationTabProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [operations, setOperations] = useState<Operations | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controlsBusy, setControlsBusy] = useState(false);
  const [busyCampaignId, setBusyCampaignId] = useState<string | null>(null);
  const [clock, setClock] = useState<number>(() => Date.now());

  // Campaign list filters & pagination
  const [listSearch, setListSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SCHEDULED" | "PAUSED" | "ENDED">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [savingModal, setSavingModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formStartsAt, setFormStartsAt] = useState("");
  const [formEndsAt, setFormEndsAt] = useState("");
  const [formPriority, setFormPriority] = useState(50);
  const [formGenresText, setFormGenresText] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidateTypeFilter, setCandidateTypeFilter] = useState<"ALL" | "TRACK" | "PLAYLIST">("ALL");
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());

  // Catalog review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<CatalogReviewResponse | null>(null);
  const [reviewOffset, setReviewOffset] = useState(0);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [campaignList, catalogPage, publicLists, readinessRes, opsRes] = await Promise.all([
        recommendationRequest<Campaign[]>("/admin/recommendations/campaigns"),
        fetchTracks({ size: 500 }),
        fetchPublicPlaylists(),
        recommendationRequest<Readiness>("/admin/recommendations/readiness"),
        recommendationRequest<Operations>("/admin/recommendations/operations"),
      ]);
      setCampaigns(Array.isArray(campaignList) ? campaignList : []);
      setTracks(Array.isArray(catalogPage?.content) ? catalogPage.content : []);
      setPlaylists(Array.isArray(publicLists) ? publicLists : []);
      setReadiness(readinessRes);
      setOperations(opsRes);
      setClock(Date.now());
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chưa thể tải dữ liệu quản lý gợi ý nhạc.";
      setError(msg);
      if (!silent) onToast(msg, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onToast]);

  useEffect(() => {
    void loadAll(true);
    const opsTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void recommendationRequest<Operations>("/admin/recommendations/operations")
          .then((ops) => {
            setOperations(ops);
            setClock(Date.now());
          })
          .catch(() => {});
      }
    }, 30_000);
    return () => clearInterval(opsTimer);
  }, [loadAll]);

  const loadCatalogReview = useCallback(async (offset: number) => {
    setReviewLoading(true);
    setReviewError(null);
    setReviewOffset(offset);
    try {
      const res = await recommendationRequest<CatalogReviewResponse>(
        `/admin/recommendations/catalog-review?offset=${offset}&limit=50`
      );
      setReviewData(res);
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : "Không thể tải danh sách bài hát chưa đủ điều kiện."
      );
    } finally {
      setReviewLoading(false);
    }
  }, []);

  const openCatalogReviewModal = () => {
    setIsReviewModalOpen(true);
    void loadCatalogReview(0);
  };

  const handleToggleControlFlag = async (flag: "enabled" | "collaborative" | "campaigns") => {
    if (!operations || controlsBusy) return;
    setControlsBusy(true);
    try {
      const current = operations.runtime.flags;
      await recommendationRequest("/admin/recommendations/controls", {
        method: "PUT",
        body: JSON.stringify({
          enabled: flag === "enabled" ? !current.enabled : current.enabled,
          collaborative: flag === "collaborative" ? !current.collaborative : current.collaborative,
          campaigns: flag === "campaigns" ? !current.campaigns : current.campaigns,
          expectedRevision: current.revision,
        }),
      });
      const updatedOps = await recommendationRequest<Operations>("/admin/recommendations/operations");
      setOperations(updatedOps);
      onToast("Đã cập nhật chế độ gợi ý nhạc.", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Không cập nhật được chế độ gợi ý.", "error");
    } finally {
      setControlsBusy(false);
    }
  };

  const getCampaignLifecycleStatus = useCallback(
    (c: Campaign): "ACTIVE" | "SCHEDULED" | "PAUSED" | "ENDED" => {
      if (!c.active) return "PAUSED";
      if (isCampaignExpired(c, clock)) return "ENDED";
      const startMs = Date.parse(c.startsAt);
      if (!Number.isNaN(startMs) && startMs > clock) return "SCHEDULED";
      return "ACTIVE";
    },
    [clock]
  );

  const openCreateModal = () => {
    setEditingCampaign(null);
    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setFormName("");
    setFormStartsAt(toDateTimeLocalValue(now.toISOString()));
    setFormEndsAt(toDateTimeLocalValue(inSevenDays.toISOString()));
    setFormPriority(50);
    setFormGenresText("");
    setFormActive(true);
    setCandidateQuery("");
    setCandidateTypeFilter("ALL");
    setSelectedTargets(new Set());
    setIsModalOpen(true);
  };

  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormName(campaign.name);
    setFormStartsAt(toDateTimeLocalValue(campaign.startsAt));
    setFormEndsAt(toDateTimeLocalValue(campaign.endsAt));
    setFormPriority(campaign.priority);
    setFormGenresText((campaign.genres || []).join(", "));
    setFormActive(campaign.active);
    setCandidateQuery("");
    setCandidateTypeFilter("ALL");
    setSelectedTargets(new Set((campaign.targets || []).map((t) => `${t.entityType}:${t.entityId}`)));
    setIsModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingModal) return;

    const cleanName = formName.trim();
    if (!cleanName) {
      onToast("Vui lòng nhập tên chiến dịch.", "warning");
      return;
    }
    const startMs = Date.parse(formStartsAt);
    const endMs = Date.parse(formEndsAt);
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      onToast("Thời gian kết thúc phải sau thời gian bắt đầu.", "warning");
      return;
    }
    if (selectedTargets.size === 0) {
      onToast("Hãy chọn ít nhất 1 bài hát hoặc playlist cho chiến dịch.", "warning");
      return;
    }
    if (selectedTargets.size > 200) {
      onToast("Tối đa 200 bài hát/playlist trong một chiến dịch.", "warning");
      return;
    }

    const genres = formGenresText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (genres.length > 20) {
      onToast("Tối đa 20 thể loại lọc cho một chiến dịch.", "warning");
      return;
    }

    const targets: CampaignTarget[] = [...selectedTargets].map((key) => {
      const colon = key.indexOf(":");
      return {
        entityType: key.slice(0, colon) as "TRACK" | "PLAYLIST",
        entityId: key.slice(colon + 1),
      };
    });

    setSavingModal(true);
    try {
      const payload = {
        name: cleanName,
        active: formActive,
        timezone:
          editingCampaign?.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          "Asia/Ho_Chi_Minh",
        startsAt: new Date(formStartsAt).toISOString(),
        endsAt: new Date(formEndsAt).toISOString(),
        priority: Math.max(0, Math.min(100, Number(formPriority) || 0)),
        genres,
        targets,
        expectedRevision: editingCampaign ? editingCampaign.revision : 1,
      };

      if (editingCampaign) {
        await recommendationRequest(`/admin/recommendations/campaigns/${editingCampaign.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        onToast("Đã cập nhật chiến dịch đẩy nhạc.", "success");
      } else {
        await recommendationRequest("/admin/recommendations/campaigns", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onToast("Đã tạo chiến dịch đẩy nhạc mới.", "success");
      }

      setIsModalOpen(false);
      await loadAll(true);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Chưa lưu được chiến dịch đẩy nhạc.", "error");
    } finally {
      setSavingModal(false);
    }
  };

  const handleToggleCampaignActive = async (campaign: Campaign) => {
    if (busyCampaignId || isCampaignExpired(campaign, clock)) return;
    setBusyCampaignId(campaign.id);
    try {
      await recommendationRequest(`/admin/recommendations/campaigns/${campaign.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: campaign.name,
          active: !campaign.active,
          timezone: campaign.timezone,
          startsAt: campaign.startsAt,
          endsAt: campaign.endsAt,
          priority: campaign.priority,
          genres: campaign.genres || [],
          targets: campaign.targets || [],
          expectedRevision: campaign.revision,
        }),
      });
      onToast(
        campaign.active
          ? `Đã tạm dừng chiến dịch "${campaign.name}".`
          : `Đã bật lại chiến dịch "${campaign.name}".`,
        "success"
      );
      await loadAll(true);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Không thể cập nhật trạng thái chiến dịch.", "error");
    } finally {
      setBusyCampaignId(null);
    }
  };

  const trackTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    tracks.forEach((t) => map.set(t.id, `${t.name} — ${t.artistName || "Nghệ sĩ"}`));
    return map;
  }, [tracks]);

  const playlistTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    playlists.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [playlists]);

  const resolveTargetLabel = useCallback(
    (key: string) => {
      const colon = key.indexOf(":");
      const entityType = key.slice(0, colon);
      const entityId = key.slice(colon + 1);
      if (entityType === "TRACK") {
        return trackTitleMap.get(entityId) || `Bài hát #${entityId}`;
      }
      return playlistTitleMap.get(entityId) || `Playlist #${entityId}`;
    },
    [trackTitleMap, playlistTitleMap]
  );

  const candidateItems = useMemo(() => {
    const all = [
      ...tracks.map((t) => {
        const genrePreview = (t.genres || []).filter(Boolean).slice(0, 2).join(", ");
        return {
          key: `TRACK:${t.id}`,
          entityType: "TRACK" as const,
          title: t.name,
          subtitle: genrePreview
            ? `${t.artistName || "Nghệ sĩ"} · ${genrePreview}`
            : t.artistName || "Nghệ sĩ",
        };
      }),
      ...playlists.map((p) => ({
        key: `PLAYLIST:${p.id}`,
        entityType: "PLAYLIST" as const,
        title: p.name,
        subtitle: `Playlist công khai · ${p.trackCount ?? p.tracks?.length ?? 0} bài`,
      })),
    ];
    const q = candidateQuery.trim().toLocaleLowerCase("vi-VN");
    return all.filter((item) => {
      if (candidateTypeFilter !== "ALL" && item.entityType !== candidateTypeFilter) return false;
      if (!q) return true;
      return `${item.title} ${item.subtitle}`.toLocaleLowerCase("vi-VN").includes(q);
    });
  }, [tracks, playlists, candidateQuery, candidateTypeFilter]);

  const filteredCampaigns = useMemo(() => {
    const q = listSearch.trim().toLocaleLowerCase("vi-VN");
    return campaigns.filter((c) => {
      const lifecycle = getCampaignLifecycleStatus(c);
      if (statusFilter !== "ALL" && lifecycle !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLocaleLowerCase("vi-VN").includes(q) ||
        (c.genres || []).some((g) => g.toLocaleLowerCase("vi-VN").includes(q))
      );
    });
  }, [campaigns, listSearch, statusFilter, getCampaignLifecycleStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [listSearch, statusFilter]);

  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const runningCount = campaigns.filter((c) => getCampaignLifecycleStatus(c) === "ACTIVE").length;
  const scheduledCount = campaigns.filter((c) => getCampaignLifecycleStatus(c) === "SCHEDULED").length;

  const eligibleRatio =
    readiness && readiness.catalogTracks > 0
      ? Math.min(100, Math.round((readiness.eligibleTracks / readiness.catalogTracks) * 100))
      : 0;

  const systemAlerts = operations?.monitor?.alerts ?? [];
  const hasSystemWarning = Boolean(operations?.outcomeQueue.circuitOpen) || systemAlerts.length > 0;
  const campaignsDisabledWhileRunning =
    Boolean(operations && (!operations.runtime.flags.enabled || !operations.runtime.flags.campaigns)) &&
    runningCount > 0;

  const nonZeroIssues = readiness
    ? Object.entries(readiness.issues).filter(([, count]) => count > 0)
    : [];

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-graphik text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-[#ff5500]" />
            Gợi ý nhạc
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Điều khiển chế độ gợi ý trên trang chủ, kiểm tra bài hát đủ điều kiện và lên lịch đẩy nhạc nổi bật.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadAll(false)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#171923] px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:border-white/20 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5500] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#ff5500]/25 hover:bg-[#ff6a1a] transition cursor-pointer active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Tạo chiến dịch nổi bật
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* On-demand Warning Banner (only when circuit breaker opens or monitor reports alerts) */}
      {hasSystemWarning && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-amber-200">
              Lưu ý vận hành hệ thống gợi ý
            </div>
            {operations?.outcomeQueue.circuitOpen && (
              <p className="text-amber-100/90">
                Hệ thống ghi nhận phản hồi nghe nhạc đang tạm ngắt mạch bảo vệ do lỗi kết nối; tính năng gợi ý vẫn hoạt động bình thường.
              </p>
            )}
            {systemAlerts.map((code) => (
              <p key={code} className="text-amber-100/90">
                • {translateMonitorAlert(code)}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* KPI Strip (3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span>Trạng thái gợi ý</span>
            <Activity className="h-4 w-4 text-sky-400" />
          </div>
          <div
            className={`font-display text-2xl font-bold ${
              operations
                ? operations.runtime.flags.enabled
                  ? "text-emerald-400"
                  : "text-amber-300"
                : "text-white"
            }`}
          >
            {operations ? (operations.runtime.flags.enabled ? "Đang bật" : "Đang tạm dừng") : "—"}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {operations
              ? operations.runtime.flags.enabled
                ? `Cùng gu: ${operations.runtime.flags.collaborative ? "Bật" : "Tắt"} · Đẩy nhạc nổi bật: ${operations.runtime.flags.campaigns ? "Bật" : "Tắt"}`
                : "Các mục gợi ý đang tạm ẩn trên trang chủ"
              : "Đang kiểm tra trạng thái"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span>Kho nhạc sẵn sàng gợi ý</span>
            <Disc3 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="font-display text-2xl font-bold text-white tabular-nums">
            {readiness ? `${readiness.eligibleTracks} / ${readiness.catalogTracks} bài` : "—"}
          </div>
          <p className="text-xs text-zinc-400 mt-1 tabular-nums">
            {readiness
              ? `Đạt ${eligibleRatio}% kho nhạc · ${readiness.publicPlaylists} playlist công khai`
              : "Đang kiểm tra kho nhạc"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span>Chiến dịch đang chạy</span>
            <CalendarDays className="h-4 w-4 text-[#ff5500]" />
          </div>
          <div className="font-display text-2xl font-bold text-white tabular-nums">
            {runningCount}{" "}
            <span className="text-sm text-zinc-400 font-normal">/ {campaigns.length} chiến dịch</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 tabular-nums">
            {scheduledCount} chiến dịch sắp chạy
            {operations && (!operations.runtime.flags.enabled || !operations.runtime.flags.campaigns) && (
              <span className="text-amber-300"> · Công tắc đẩy nhạc đang tắt</span>
            )}
          </p>
        </div>
      </div>

      {/* Operations Controls & Catalog Readiness 2-col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Runtime Controls Card */}
        <section
          aria-label="Điều khiển chế độ gợi ý"
          className="lg:col-span-6 rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="font-graphik text-sm font-bold text-white">
                  Điều khiển chế độ gợi ý
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Thay đổi có hiệu lực ngay trên trang chủ người nghe.
                </p>
              </div>
            </div>

            {operations ? (
              <div className="space-y-3">
                {(
                  [
                    {
                      key: "enabled" as const,
                      label: "Hiển thị gợi ý trên trang chủ",
                      badge: "Công tắc chính",
                      desc: "Bật hoặc tạm ẩn toàn bộ các mục gợi ý (Dành cho bạn, Bản phối của bạn, Playlist hợp gu, Tuyển chọn đang diễn ra).",
                      active: operations.runtime.flags.enabled,
                      isChild: false,
                    },
                    {
                      key: "collaborative" as const,
                      label: "Mở rộng theo người nghe cùng gu",
                      desc: "Kết hợp thói quen nghe của các tài khoản có sở thích tương đồng để đề xuất thêm bài mới.",
                      active: operations.runtime.flags.collaborative,
                      isChild: true,
                    },
                    {
                      key: "campaigns" as const,
                      label: "Đẩy bài hát & playlist theo chiến dịch",
                      desc: "Ưu tiên hiển thị nội dung của các chiến dịch đang chạy bên dưới vào mục \"Tuyển chọn đang diễn ra\".",
                      active: operations.runtime.flags.campaigns,
                      isChild: true,
                    },
                  ]
                ).map((item) => {
                  const parentOff = item.isChild && !operations.runtime.flags.enabled;
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#171923]/70 px-4 py-3 transition-opacity ${
                        parentOff ? "opacity-65" : ""
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-white">{item.label}</span>
                          {item.badge && (
                            <span className="rounded-md bg-[#ff5500]/15 border border-[#ff5500]/30 px-2 py-0.5 text-[10px] font-semibold text-[#ff9966]">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                        {parentOff && (
                          <p className="text-[11px] text-amber-300/90">
                            Chỉ áp dụng khi công tắc chính đang bật.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`text-[11px] font-semibold w-7 text-right ${
                            item.active ? "text-emerald-300" : "text-zinc-500"
                          }`}
                        >
                          {item.active ? "Bật" : "Tắt"}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.active}
                          aria-label={item.label}
                          disabled={controlsBusy}
                          onClick={() => void handleToggleControlFlag(item.key)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-50 ${
                            item.active
                              ? "bg-emerald-500 border-emerald-400/50"
                              : "bg-zinc-800 border-white/15"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              item.active ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 flex items-center justify-center text-xs text-zinc-500 gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải trạng thái...
              </div>
            )}
          </div>
        </section>

        {/* Catalog Readiness Card */}
        <section
          aria-label="Điều kiện kho nhạc được gợi ý"
          className="lg:col-span-6 rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="font-graphik text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Điều kiện kho nhạc được gợi ý
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Hệ thống chỉ gợi ý những bài đã xuất bản, công khai, qua kiểm duyệt, có file nhạc và đủ bản quyền.
                </p>
              </div>
              {readiness && readiness.catalogTracks > readiness.eligibleTracks && (
                <button
                  type="button"
                  onClick={openCatalogReviewModal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#171923] px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#ff5500]/50 hover:text-white transition cursor-pointer shrink-0"
                >
                  <Eye className="h-3.5 w-3.5 text-[#ff5500]" />
                  Xem bài chưa đủ điều kiện
                </button>
              )}
            </div>

            {readiness ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Tỷ lệ bài hát đủ điều kiện</span>
                    <span className="text-emerald-400 font-bold tabular-nums">
                      {readiness.eligibleTracks} / {readiness.catalogTracks} ({eligibleRatio}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#ff5500] to-emerald-400 transition-all duration-500"
                      style={{ width: `${eligibleRatio}%` }}
                    />
                  </div>
                </div>

                {readiness.demoCatalog && (
                  <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 tabular-nums">
                    Đang bật kho nhạc thử nghiệm · {readiness.standardEligibleTracks ?? 0} bài đạt chuẩn bản quyền đầy đủ.
                  </p>
                )}

                {readiness.eligibleTracks === 0 && (
                  <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    Chưa có bài hát nào đủ điều kiện hiển thị. Cần xuất bản, duyệt nội dung và gắn giấy phép bản quyền còn hiệu lực.
                  </p>
                )}

                {nonZeroIssues.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {nonZeroIssues.map(([code, count]) => {
                      const isAdvisory = code === "MISSING_MOOD_FEATURES";
                      return (
                        <div
                          key={code}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                            isAdvisory
                              ? "border-sky-500/20 bg-sky-500/5"
                              : "border-amber-500/20 bg-[#171923]"
                          }`}
                        >
                          <span className={`pr-2 ${isAdvisory ? "text-zinc-400" : "text-zinc-300"}`}>
                            {ISSUE_LABELS[code] || code}
                          </span>
                          <span
                            className={`font-mono font-bold shrink-0 tabular-nums ${
                              isAdvisory ? "text-sky-300" : "text-amber-300"
                            }`}
                          >
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {nonZeroIssues.length === 0 && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Tất cả bài hát đều đủ điều kiện đề xuất.
                  </p>
                )}
              </div>
            ) : (
              <div className="py-8 flex items-center justify-center text-xs text-zinc-500 gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra kho nhạc...
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-500 border-t border-white/[0.06] pt-3">
            Một bài hát có thể thiếu nhiều điều kiện cùng lúc · Kiểm tra bản quyền:{" "}
            <span className="text-zinc-300 font-medium">
              {readiness?.requireActiveLicense ? "Bắt buộc" : "Đang tắt"}
            </span>
            .
          </p>
        </section>
      </div>

      {/* Campaigns Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h3 className="font-graphik text-lg font-bold text-white">
              Chiến dịch đẩy nhạc nổi bật
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Lên lịch đưa bài hát hoặc playlist công khai vào mục &ldquo;Tuyển chọn đang diễn ra&rdquo; trên trang chủ theo khung giờ và mức ưu tiên.
            </p>
          </div>
        </div>

        {campaignsDisabledWhileRunning && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              Đang có {runningCount} chiến dịch trong khung giờ chạy, nhưng chưa hiển thị tới người nghe vì công tắc{" "}
              <strong>
                {!operations?.runtime.flags.enabled
                  ? "Hiển thị gợi ý trên trang chủ"
                  : "Đẩy bài hát & playlist theo chiến dịch"}
              </strong>{" "}
              ở trên đang tắt.
            </span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#12141c] p-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Tìm theo tên chiến dịch hoặc thể loại..."
              className="w-full rounded-xl border border-white/[0.08] bg-[#171923] pl-10 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#ff5500] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(
              [
                { id: "ALL", label: "Tất cả" },
                { id: "ACTIVE", label: "Đang chạy" },
                { id: "SCHEDULED", label: "Sắp chạy" },
                { id: "PAUSED", label: "Tạm dừng" },
                { id: "ENDED", label: "Đã kết thúc" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-[#ff5500] text-white shadow-sm"
                    : "bg-[#171923] text-zinc-400 hover:text-white border border-white/[0.08]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-12 flex items-center justify-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin text-[#ff5500]" /> Đang tải danh sách chiến dịch...
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12141c] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] bg-[#171923] text-xs font-medium text-zinc-400">
                  <tr>
                    <th className="px-5 py-3.5">Tên chiến dịch</th>
                    <th className="px-4 py-3.5">Khung giờ áp dụng</th>
                    <th className="px-4 py-3.5">Độ ưu tiên</th>
                    <th className="px-4 py-3.5">Nội dung đẩy</th>
                    <th className="px-4 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {paginatedCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400">
                        {campaigns.length === 0
                          ? "Chưa có chiến dịch nào. Nhấn \"Tạo chiến dịch nổi bật\" để bắt đầu."
                          : "Không tìm thấy chiến dịch phù hợp."}
                      </td>
                    </tr>
                  ) : (
                    paginatedCampaigns.map((campaign) => {
                      const lifecycle = getCampaignLifecycleStatus(campaign);
                      const expired = isCampaignExpired(campaign, clock);
                      const statusBadge =
                        lifecycle === "ACTIVE"
                          ? {
                              label: "Đang chạy",
                              cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                            }
                          : lifecycle === "SCHEDULED"
                          ? {
                              label: "Sắp chạy",
                              cls: "border-sky-500/30 bg-sky-500/10 text-sky-300",
                            }
                          : lifecycle === "PAUSED"
                          ? {
                              label: "Tạm dừng",
                              cls: "border-amber-500/30 bg-amber-500/10 text-amber-300",
                            }
                          : {
                              label: "Đã kết thúc",
                              cls: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
                            };

                      const priorityBadge = getPriorityBadge(campaign.priority);
                      const targets = campaign.targets || [];
                      const trackCount = targets.filter((t) => t.entityType === "TRACK").length;
                      const playlistCount = targets.filter((t) => t.entityType === "PLAYLIST").length;
                      const breakdownParts: string[] = [];
                      if (trackCount > 0) breakdownParts.push(`${trackCount} bài hát`);
                      if (playlistCount > 0) breakdownParts.push(`${playlistCount} playlist`);

                      const isBusy = busyCampaignId === campaign.id;

                      return (
                        <tr key={campaign.id} className="hover:bg-[#171923]/60 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-white text-sm">{campaign.name}</div>
                            {campaign.genres && campaign.genres.length > 0 && (
                              <div className="mt-1 text-xs text-zinc-400">
                                Lọc thể loại: {campaign.genres.join(", ")}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[11px] text-zinc-300 tabular-nums whitespace-nowrap">
                            <div>Bắt đầu: {formatDateTimeCompact(campaign.startsAt)}</div>
                            <div className="text-zinc-400">Kết thúc: {formatDateTimeCompact(campaign.endsAt)}</div>
                          </td>
                          <td className="px-4 py-3.5 tabular-nums whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${priorityBadge.cls}`}
                            >
                              {priorityBadge.label} · {campaign.priority}/100
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-zinc-300 tabular-nums">
                            <div className="font-medium text-white">
                              {breakdownParts.length > 0 ? breakdownParts.join(" · ") : "0 mục"}
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate max-w-[240px] mt-0.5">
                              {targets
                                .slice(0, 2)
                                .map((t) =>
                                  t.entityType === "TRACK"
                                    ? trackTitleMap.get(t.entityId) || `Bài hát #${t.entityId}`
                                    : playlistTitleMap.get(t.entityId) || `Playlist #${t.entityId}`
                                )
                                .join(", ")}
                              {targets.length > 2 ? "..." : ""}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${statusBadge.cls}`}
                            >
                              {lifecycle === "ACTIVE" && <CheckCircle2 className="h-3 w-3" />}
                              {lifecycle === "SCHEDULED" && <Clock className="h-3 w-3" />}
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(campaign)}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#171923] px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:border-[#ff5500]/50 hover:text-white transition cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-[#ff5500]" />
                                {expired ? "Gia hạn / Sửa" : "Sửa"}
                              </button>
                              {!expired && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleToggleCampaignActive(campaign)}
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                                    campaign.active
                                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                  }`}
                                >
                                  {campaign.active ? (
                                    <>
                                      <Pause className="h-3 w-3" /> Tạm dừng
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3" /> Bật lại
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredCampaigns.length > pageSize && (
              <div className="p-4 border-t border-[#222432]">
                <AdminPagination
                  currentPage={currentPage}
                  totalItems={filteredCampaigns.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Campaign Modal */}
      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md anim-fade-in">
            <form
              onSubmit={(e) => void handleSaveCampaign(e)}
              className="relative my-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#222432] bg-[#12131a] p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#222432] pb-4">
                <div>
                  <h3 className="font-graphik text-lg font-bold text-white flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-[#ff5500]" />
                    {editingCampaign ? "Chỉnh sửa chiến dịch đẩy nhạc" : "Tạo chiến dịch đẩy nhạc nổi bật"}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Bài hát và playlist được chọn sẽ xuất hiện trong mục &ldquo;Tuyển chọn đang diễn ra&rdquo; trên trang chủ trong khung giờ hiệu lực.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Tên chiến dịch
                  </label>
                  <input
                    required
                    maxLength={150}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ví dụ: Nhạc thư giãn cuối tuần, Giai điệu nổi bật tháng 11..."
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#ff5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Thời gian bắt đầu
                  </label>
                  <input
                    required
                    type="datetime-local"
                    value={formStartsAt}
                    onChange={(e) => setFormStartsAt(e.target.value)}
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-xs font-mono text-white [color-scheme:dark] focus:border-[#ff5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Thời gian kết thúc
                  </label>
                  <input
                    required
                    type="datetime-local"
                    value={formEndsAt}
                    min={formStartsAt}
                    onChange={(e) => setFormEndsAt(e.target.value)}
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-xs font-mono text-white [color-scheme:dark] focus:border-[#ff5500] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-medium text-zinc-300">
                    Mức độ ưu tiên (0–100)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {PRIORITY_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setFormPriority(preset.value)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                          formPriority === preset.value
                            ? "border-[#ff5500] bg-[#ff5500]/15 text-[#ff9966]"
                            : "border-white/[0.08] bg-[#171822] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <input
                      required
                      type="number"
                      min={0}
                      max={100}
                      value={formPriority}
                      onChange={(e) => setFormPriority(Number(e.target.value))}
                      className="w-24 rounded-xl border border-[#222432] bg-[#171822] px-3 py-1.5 text-xs font-mono text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Số càng cao, nội dung càng được ưu tiên hiển thị trước.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Giới hạn theo thể loại (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formGenresText}
                    onChange={(e) => setFormGenresText(e.target.value)}
                    placeholder="Để trống để áp dụng cho tất cả bài đã chọn (vd: pop, ballad)"
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#ff5500] focus:outline-none"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Chỉ nhập nếu muốn lọc thêm: hệ thống sẽ chỉ đẩy những bài đã chọn có gắn thể loại trùng khớp.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#ff5500] cursor-pointer"
                    />
                    <span>Kích hoạt chiến dịch ngay khi đến giờ bắt đầu</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3 border-t border-[#222432] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-200">
                    Chọn bài hát hoặc playlist để đẩy ·{" "}
                    <strong className="text-[#ff5500] tabular-nums">{selectedTargets.size}</strong>/200 đã chọn
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { id: "ALL", label: "Tất cả" },
                        { id: "TRACK", label: "Bài hát" },
                        { id: "PLAYLIST", label: "Playlist" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCandidateTypeFilter(t.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                          candidateTypeFilter === t.id
                            ? "bg-[#ff5500] text-white font-semibold"
                            : "bg-[#171822] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTargets.size > 0 && (
                  <div className="rounded-xl border border-white/[0.08] bg-[#0e0f14] p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Danh sách đang chọn ({selectedTargets.size})</span>
                      {selectedTargets.size > 1 && (
                        <button
                          type="button"
                          onClick={() => setSelectedTargets(new Set())}
                          className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                        >
                          Bỏ chọn tất cả
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {[...selectedTargets].map((key) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#ff5500]/30 bg-[#ff5500]/10 px-2.5 py-1 text-[11px] text-zinc-200 max-w-full"
                        >
                          <span className="truncate max-w-[200px]">{resolveTargetLabel(key)}</span>
                          <button
                            type="button"
                            aria-label={`Bỏ chọn ${resolveTargetLabel(key)}`}
                            onClick={() =>
                              setSelectedTargets((prev) => {
                                const next = new Set(prev);
                                next.delete(key);
                                return next;
                              })
                            }
                            className="text-zinc-400 hover:text-white cursor-pointer shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  value={candidateQuery}
                  onChange={(e) => setCandidateQuery(e.target.value)}
                  placeholder="Tìm tên bài hát, nghệ sĩ, thể loại hoặc playlist công khai..."
                  className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#ff5500] focus:outline-none"
                />

                <div className="max-h-56 overflow-y-auto rounded-xl border border-[#222432] bg-[#0e0f14] p-2 space-y-1">
                  {candidateItems.length === 0 ? (
                    <p className="py-6 text-center text-xs text-zinc-500">
                      Không tìm thấy nội dung phù hợp.
                    </p>
                  ) : (
                    candidateItems.slice(0, 120).map((item) => {
                      const checked = selectedTargets.has(item.key);
                      return (
                        <label
                          key={item.key}
                          className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer transition ${
                            checked ? "bg-[#ff5500]/10 border border-[#ff5500]/30" : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedTargets((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(item.key);
                                else next.delete(item.key);
                                return next;
                              })
                            }
                            className="accent-[#ff5500]"
                          />
                          {item.entityType === "PLAYLIST" ? (
                            <ListMusic className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                          ) : (
                            <Disc3 className="h-3.5 w-3.5 text-[#ff5500] shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-white truncate">{item.title}</div>
                            <div className="text-[11px] text-zinc-400 truncate">{item.subtitle}</div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-white/[0.08] px-5 py-2 text-xs font-semibold text-zinc-400 hover:bg-[#171923] transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingModal || selectedTargets.size === 0}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5500] px-6 py-2 text-xs font-bold text-white shadow-lg shadow-[#ff5500]/25 hover:bg-[#ff6a1a] disabled:opacity-50 transition cursor-pointer"
                >
                  {savingModal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {editingCampaign ? "Lưu thay đổi" : "Tạo chiến dịch"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Catalog Review Modal (tracks not yet eligible for recommendations) */}
      {isReviewModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl border border-[#222432] bg-[#12131a] p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-[#222432] pb-4">
                <div>
                  <h3 className="font-graphik text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-400" />
                    Bài hát chưa đủ điều kiện gợi ý
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {reviewData
                      ? `${reviewData.pendingTracks} / ${reviewData.totalTracks} bài cần bổ sung điều kiện xuất bản, công khai, kiểm duyệt, file âm thanh hoặc bản quyền.`
                      : "Danh sách các bài hát đang bị loại khỏi hệ thống gợi ý và lý do cụ thể."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {reviewLoading ? (
                  <div className="py-14 flex items-center justify-center gap-2 text-xs text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin text-[#ff5500]" /> Đang tải danh sách kiểm tra kho nhạc...
                  </div>
                ) : reviewError ? (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200 flex items-center justify-between gap-3">
                    <span>{reviewError}</span>
                    <button
                      type="button"
                      onClick={() => void loadCatalogReview(reviewOffset)}
                      className="rounded-lg border border-rose-300/30 px-3 py-1.5 font-semibold hover:bg-rose-500/20 transition cursor-pointer shrink-0"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : !reviewData || reviewData.items.length === 0 ? (
                  <div className="py-12 text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Không có bài hát nào thiếu điều kiện trong trang này.
                  </div>
                ) : (
                  reviewData.items.map((item) => (
                    <div
                      key={item.trackId}
                      className="rounded-xl border border-white/[0.08] bg-[#171923] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {item.name || `Bài hát #${item.trackId}`}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">
                          Mã bài hát: {item.trackId}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        {(item.reasons || []).map((reason) => (
                          <span
                            key={reason}
                            className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
                          >
                            {REVIEW_REASON_LABELS[reason] || reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] pt-4 text-xs">
                <div className="text-zinc-400 tabular-nums">
                  {reviewData && reviewData.pendingTracks > 0
                    ? `Hiển thị ${reviewData.offset + 1}–${Math.min(
                        reviewData.offset + reviewData.items.length,
                        reviewData.pendingTracks
                      )} trên ${reviewData.pendingTracks} bài`
                    : ""}
                </div>
                <div className="flex items-center gap-2">
                  {reviewData && reviewData.pendingTracks > reviewData.limit && (
                    <>
                      <button
                        type="button"
                        disabled={reviewLoading || reviewData.offset <= 0}
                        onClick={() => void loadCatalogReview(Math.max(0, reviewData.offset - reviewData.limit))}
                        className="rounded-lg border border-white/[0.08] bg-[#171923] px-3 py-1.5 font-medium text-zinc-200 hover:text-white disabled:opacity-40 cursor-pointer"
                      >
                        Trang trước
                      </button>
                      <button
                        type="button"
                        disabled={
                          reviewLoading || reviewData.offset + reviewData.limit >= reviewData.pendingTracks
                        }
                        onClick={() => void loadCatalogReview(reviewData.offset + reviewData.limit)}
                        className="rounded-lg border border-white/[0.08] bg-[#171923] px-3 py-1.5 font-medium text-zinc-200 hover:text-white disabled:opacity-40 cursor-pointer"
                      >
                        Trang sau
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="rounded-full border border-white/[0.08] px-4 py-1.5 font-semibold text-zinc-300 hover:bg-[#171923] transition cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
