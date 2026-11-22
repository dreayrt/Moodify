"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock,
  Disc3,
  Edit2,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
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

type RecommendationsCurationTabProps = {
  onToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
};

const ISSUE_LABELS: Record<string, string> = {
  NOT_PUBLISHED: "Chưa có trạng thái xuất bản hợp lệ",
  NOT_PUBLIC: "Chưa công khai",
  NOT_APPROVED: "Chưa được duyệt",
  NO_AUDIO: "Thiếu tệp âm thanh",
  NO_LICENSE: "Chưa liên kết giấy phép",
  LICENSE_NOT_EFFECTIVE: "Giấy phép chưa hoặc không còn hiệu lực",
};

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
      const msg = err instanceof Error ? err.message : "Chưa thể tải dữ liệu tuyển chọn âm nhạc.";
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
      onToast("Đã cập nhật cấu hình vận hành hệ thống đề xuất.", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Không cập nhật được cấu hình vận hành.", "error");
    } finally {
      setControlsBusy(false);
    }
  };

  const getCampaignLifecycleStatus = useCallback(
    (c: Campaign): "ACTIVE" | "SCHEDULED" | "PAUSED" | "ENDED" => {
      if (!c.active) return "PAUSED";
      const endMs = Date.parse(c.endsAt);
      const startMs = Date.parse(c.startsAt);
      if (!Number.isNaN(endMs) && endMs <= clock) return "ENDED";
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
      onToast("Vui lòng nhập tên đợt tuyển chọn.", "warning");
      return;
    }
    const startMs = Date.parse(formStartsAt);
    const endMs = Date.parse(formEndsAt);
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      onToast("Thời gian kết thúc phải sau thời gian bắt đầu.", "warning");
      return;
    }
    if (selectedTargets.size === 0) {
      onToast("Hãy chọn ít nhất 1 bài hát hoặc playlist cho đợt tuyển chọn.", "warning");
      return;
    }

    const targets: CampaignTarget[] = [...selectedTargets].map((key) => {
      const colon = key.indexOf(":");
      return {
        entityType: key.slice(0, colon) as "TRACK" | "PLAYLIST",
        entityId: key.slice(colon + 1),
      };
    });

    const genres = formGenresText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

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
        onToast("Đã cập nhật đợt tuyển chọn âm nhạc.", "success");
      } else {
        await recommendationRequest("/admin/recommendations/campaigns", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onToast("Đã lên lịch đợt tuyển chọn âm nhạc mới.", "success");
      }

      setIsModalOpen(false);
      await loadAll(true);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Chưa lưu được đợt tuyển chọn.", "error");
    } finally {
      setSavingModal(false);
    }
  };

  const handleToggleCampaignActive = async (campaign: Campaign) => {
    if (busyCampaignId) return;
    setBusyCampaignId(campaign.id);
    try {
      await recommendationRequest(`/admin/recommendations/campaigns/${campaign.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...campaign,
          active: !campaign.active,
          expectedRevision: campaign.revision,
        }),
      });
      onToast(
        campaign.active ? `Đã tạm dừng "${campaign.name}".` : `Đã bật lại "${campaign.name}".`,
        "success"
      );
      await loadAll(true);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Không thể cập nhật trạng thái đợt tuyển chọn.", "error");
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

  const candidateItems = useMemo(() => {
    const all = [
      ...tracks.map((t) => ({
        key: `TRACK:${t.id}`,
        entityType: "TRACK" as const,
        title: t.name,
        subtitle: t.artistName || "Nghệ sĩ",
      })),
      ...playlists.map((p) => ({
        key: `PLAYLIST:${p.id}`,
        entityType: "PLAYLIST" as const,
        title: p.name,
        subtitle: "Playlist công khai",
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

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-graphik text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-[#ff5500]" />
            Tuyển chọn âm nhạc
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Quản lý các đợt tuyển chọn bài hát nổi bật và bật hoặc tắt tính năng gợi ý nhạc.
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
            <Plus className="h-4 w-4" /> Tạo đợt tuyển chọn
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span>Đợt đang diễn ra</span>
            <CalendarDays className="h-4 w-4 text-[#ff5500]" />
          </div>
          <div className="font-display text-2xl font-bold text-white tabular-nums">
            {runningCount} <span className="text-sm text-zinc-400 font-normal">/ {campaigns.length} đợt</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 tabular-nums">
            {scheduledCount} đợt đã lên lịch sắp tới
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span>Bài hát đủ điều kiện</span>
            <Disc3 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="font-display text-2xl font-bold text-emerald-400 tabular-nums">
            {readiness ? `${readiness.eligibleTracks}/${readiness.catalogTracks}` : "—"}
          </div>
          <p className="text-xs text-zinc-500 mt-1 tabular-nums">
            {readiness ? `${readiness.publicPlaylists} danh sách phát công khai (${eligibleRatio}%)` : "Đang tải kho nhạc"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span>Gợi ý nhạc</span>
            <Activity className="h-4 w-4 text-sky-400" />
          </div>
          <div className="font-display text-2xl font-bold text-white">
            {operations ? (operations.runtime.flags.enabled ? "Đang bật" : "Tạm dừng") : "—"}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {operations
              ? `Cá nhân hóa: ${operations.runtime.flags.collaborative ? "Bật" : "Tắt"} · Đợt tuyển chọn: ${operations.runtime.flags.campaigns ? "Bật" : "Tắt"}`
              : "Đang kiểm tra"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span>Hàng đợi cập nhật</span>
            <Server className="h-4 w-4 text-amber-400" />
          </div>
          <div className="font-display text-2xl font-bold text-white tabular-nums">
            {operations ? `${operations.outcomeQueue.queued}/${operations.outcomeQueue.capacity}` : "—"}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {operations?.outcomeQueue.circuitOpen ? "Tạm ngưng do lỗi kết nối" : "Đang hoạt động bình thường"}
          </p>
        </div>
      </div>

      {/* Operations & Catalog Readiness 2-col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Runtime Controls Card */}
        <section
          aria-label="Cấu hình gợi ý nhạc"
          className="lg:col-span-6 rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="font-graphik text-sm font-bold text-white">
                  Bật / tắt tính năng gợi ý
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Điều chỉnh trực tiếp các chế độ hiển thị nhạc gợi ý cho người nghe.
                </p>
              </div>
            </div>

            {operations ? (
              <div className="space-y-3">
                {(
                  [
                    {
                      key: "enabled" as const,
                      label: "Hệ thống gợi ý nhạc",
                      desc: "Hiển thị mục gợi ý nhạc trên trang chủ người nghe",
                      active: operations.runtime.flags.enabled,
                    },
                    {
                      key: "collaborative" as const,
                      label: "Gợi ý theo sở thích chung",
                      desc: "Đề xuất dựa trên thói quen nghe tương đồng giữa các người dùng",
                      active: operations.runtime.flags.collaborative,
                    },
                    {
                      key: "campaigns" as const,
                      label: "Ưu tiên đợt tuyển chọn",
                      desc: "Hiển thị các bài hát trong đợt tuyển chọn đang có hiệu lực",
                      active: operations.runtime.flags.campaigns,
                    },
                  ]
                ).map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#171923]/70 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">{item.label}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      disabled={controlsBusy}
                      onClick={() => void handleToggleControlFlag(item.key)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                        item.active
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                          : "bg-zinc-800 text-zinc-400 border border-white/10 hover:text-white"
                      }`}
                    >
                      {item.active ? "Đang bật" : "Đang tắt"}
                    </button>
                  </div>
                ))}

                {operations.monitor?.alerts && operations.monitor.alerts.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                    <div className="text-xs font-semibold text-amber-300">
                      Cảnh báo ({operations.monitor.alerts.length})
                    </div>
                    {operations.monitor.alerts.map((code) => (
                      <p key={code} className="text-xs text-amber-200">
                        • {code}
                      </p>
                    ))}
                  </div>
                )}
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
          aria-label="Tình trạng kho nhạc"
          className="lg:col-span-6 rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="font-graphik text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Tình trạng kho nhạc cho gợi ý
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Chỉ những bài hát đã xuất bản, được duyệt và đủ bản quyền mới xuất hiện trong gợi ý.
                </p>
              </div>
              {readiness?.demoCatalog && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Chế độ thử nghiệm
                </span>
              )}
            </div>

            {readiness ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Tỷ lệ bài hát hợp lệ</span>
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
                    Đang dùng danh mục thử nghiệm · {readiness.standardEligibleTracks ?? 0} bài đủ điều kiện quyền chuẩn.
                  </p>
                )}

                {readiness.eligibleTracks === 0 && (
                  <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    Kho nhạc cần hoàn thiện trạng thái nội dung và quyền phát trước khi tạo gợi ý cho người nghe.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(readiness.issues)
                    .filter(([, count]) => count > 0)
                    .map(([code, count]) => (
                      <div
                        key={code}
                        className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#171923] px-3 py-2 text-xs"
                      >
                        <span className="text-zinc-300 truncate pr-2">{ISSUE_LABELS[code] || code}</span>
                        <span className="font-mono font-bold text-amber-300 shrink-0 tabular-nums">{count}</span>
                      </div>
                    ))}
                </div>
                {Object.values(readiness.issues).every((c) => c === 0) && (
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
            Một bài hát có thể thiếu nhiều điều kiện cùng lúc. Kiểm tra bản quyền: {readiness?.requireActiveLicense ? "Bật" : "Tắt"}.
          </p>
        </section>
      </div>

      {/* Campaigns Filter + Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#12141c] p-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Tìm tên đợt tuyển chọn hoặc thể loại..."
              className="w-full rounded-xl border border-white/[0.08] bg-[#171923] pl-10 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#ff5500] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(
              [
                { id: "ALL", label: "Tất cả" },
                { id: "ACTIVE", label: "Đang diễn ra" },
                { id: "SCHEDULED", label: "Đã lên lịch" },
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
            <Loader2 className="h-4 w-4 animate-spin text-[#ff5500]" /> Đang tải các đợt tuyển chọn...
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12141c] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] bg-[#171923] text-xs font-medium text-zinc-400">
                  <tr>
                    <th className="px-5 py-3.5">Đợt tuyển chọn</th>
                    <th className="px-4 py-3.5">Thời gian hiệu lực</th>
                    <th className="px-4 py-3.5">Độ ưu tiên</th>
                    <th className="px-4 py-3.5">Nội dung áp dụng</th>
                    <th className="px-4 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {paginatedCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400">
                        {campaigns.length === 0
                          ? "Chưa có đợt tuyển chọn nào. Nhấn \"Tạo đợt tuyển chọn\" để bắt đầu."
                          : "Không tìm thấy đợt tuyển chọn phù hợp."}
                      </td>
                    </tr>
                  ) : (
                    paginatedCampaigns.map((campaign) => {
                      const lifecycle = getCampaignLifecycleStatus(campaign);
                      const statusBadge =
                        lifecycle === "ACTIVE"
                          ? { label: "Đang diễn ra", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" }
                          : lifecycle === "SCHEDULED"
                          ? { label: "Đã lên lịch", cls: "border-sky-500/30 bg-sky-500/10 text-sky-300" }
                          : lifecycle === "PAUSED"
                          ? { label: "Tạm dừng", cls: "border-amber-500/30 bg-amber-500/10 text-amber-300" }
                          : { label: "Đã kết thúc", cls: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400" };

                      const isBusy = busyCampaignId === campaign.id;

                      return (
                        <tr key={campaign.id} className="hover:bg-[#171923]/60 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-white text-sm">{campaign.name}</div>
                            {campaign.genres && campaign.genres.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-zinc-400">
                                {campaign.genres.join(" · ")}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[11px] text-zinc-300 tabular-nums">
                            <div>Từ: {new Date(campaign.startsAt).toLocaleString("vi-VN")}</div>
                            <div className="text-zinc-400">Đến: {new Date(campaign.endsAt).toLocaleString("vi-VN")}</div>
                          </td>
                          <td className="px-4 py-3.5 font-mono tabular-nums">
                            <span className="px-2 py-0.5 rounded-md bg-[#ff5500]/15 border border-[#ff5500]/30 text-[#ff9966] font-bold">
                              {campaign.priority}/100
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-zinc-300 tabular-nums">
                            <span>{campaign.targets?.length || 0} mục</span>
                            <div className="text-[11px] text-zinc-500 truncate max-w-[200px] mt-0.5">
                              {campaign.targets
                                .slice(0, 2)
                                .map((t) =>
                                  t.entityType === "TRACK"
                                    ? trackTitleMap.get(t.entityId) || t.entityId
                                    : playlistTitleMap.get(t.entityId) || t.entityId
                                )
                                .join(", ")}
                              {(campaign.targets?.length || 0) > 2 ? "..." : ""}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${statusBadge.cls}`}>
                              {lifecycle === "ACTIVE" && <CheckCircle2 className="h-3 w-3" />}
                              {lifecycle === "SCHEDULED" && <Clock className="h-3 w-3" />}
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(campaign)}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#171923] px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:border-[#ff5500]/50 hover:text-white transition cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-[#ff5500]" /> Sửa
                              </button>
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
              <div className="flex items-center justify-between border-b border-[#222432] pb-4">
                <div>
                  <h3 className="font-graphik text-lg font-bold text-white flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-[#ff5500]" />
                    {editingCampaign ? "Chỉnh sửa đợt tuyển chọn" : "Tạo đợt tuyển chọn âm nhạc"}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Chọn khung thời gian hiệu lực, mức ưu tiên và bài hát / playlist mục tiêu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">
                    Tên chương trình
                  </label>
                  <input
                    required
                    maxLength={150}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ví dụ: Nhạc chill mùa lễ hội..."
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#ff5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">
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
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">
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

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">
                    Mức độ ưu tiên (0–100)
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    max={100}
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-xs font-mono text-white focus:border-[#ff5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">
                    Thể loại mục tiêu (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formGenresText}
                    onChange={(e) => setFormGenresText(e.target.value)}
                    placeholder="pop, indie, chill (phân cách bằng dấu phẩy)"
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-zinc-500 focus:border-[#ff5500] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2.5 border-t border-[#222432] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono text-zinc-300 font-semibold">
                    Chọn nội dung áp dụng · <strong className="text-[#ff5500]">{selectedTargets.size}</strong> đã chọn
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
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono cursor-pointer transition ${
                          candidateTypeFilter === t.id
                            ? "bg-[#ff5500] text-white font-bold"
                            : "bg-[#171822] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  value={candidateQuery}
                  onChange={(e) => setCandidateQuery(e.target.value)}
                  placeholder="Tìm tên bài hát, nghệ sĩ hoặc playlist công khai..."
                  className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#ff5500] focus:outline-none"
                />

                <div className="max-h-56 overflow-y-auto rounded-xl border border-[#222432] bg-[#0e0f14] p-2 space-y-1">
                  {candidateItems.length === 0 ? (
                    <p className="py-6 text-center text-xs font-mono text-zinc-500">
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
                            <div className="text-[11px] font-mono text-zinc-500 truncate">{item.subtitle}</div>
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
                  {editingCampaign ? "Lưu thay đổi" : "Lên lịch tuyển chọn"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
