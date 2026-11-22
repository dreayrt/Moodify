"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { ToastNotification } from "../../content-lead/components/toast-notification";
import {
  ModerationHistoryItem,
  ModerationStats,
  ModerationTrack,
  ModeratorProfile,
  ToastMessage,
} from "../types";
import {
  getCurrentUser,
  getModeratorHistory,
  getModeratorQueue,
  getValidAccessToken,
  logoutAndRedirect,
  submitModeratorDecision,
} from "@/lib/auth/auth-client";

import { ModeratorSidebar, TabKey } from "./moderator-sidebar";
import { ModeratorOverviewTab } from "./moderator-overview-tab";
import { ModeratorReviewQueueTab } from "./moderator-review-queue-tab";
import { ModeratorHistoryTab } from "./moderator-history-tab";
import { ModeratorAccountTab } from "./moderator-account-tab";
import { ModeratorDecisionModal } from "./moderator-decision-modal";
import { resolveMediaUrl } from "./moderator-track-cover";

const EMPTY_MODERATOR_STATS: ModerationStats = {
  pendingCount: 0,
  urgentCount: 0,
  approvedToday: 0,
  rejectedToday: 0,
  avgReviewTimeMinutes: 0,
  approvalPercentage: 0,
  violationsDistribution: [],
};

function createEmptyProfile(seed?: {
  id?: unknown;
  fullName?: unknown;
  name?: unknown;
  username?: unknown;
  email?: unknown;
  phone?: unknown;
  avatarUrl?: unknown;
} | null): ModeratorProfile {
  return {
    id: seed?.id != null ? String(seed.id) : "",
    fullName: readString(seed?.fullName) || readString(seed?.name) || "Kiểm duyệt viên",
    username: readString(seed?.username),
    email: readString(seed?.email),
    phone: readString(seed?.phone),
    avatarUrl: resolveMediaUrl(readString(seed?.avatarUrl)),
    roleTitle: "Kiểm duyệt viên",
    totalReviewed: 0,
    approvalRate: 0,
    avgReviewTimeMin: 0,
    preferences: {
      autoPlayOnSelect: false,
      defaultPlaybackRate: 1,
      volumeLevel: 0.85,
      urgentNotifications: true,
    },
  };
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function readDecision(value: unknown): ModerationHistoryItem["decision"] {
  if (value === "approved" || value === "rejected" || value === "needs_revision") {
    return value;
  }
  return "needs_revision";
}

function isAuthFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("401") ||
    message.includes("Phiên đăng nhập") ||
    message.includes("không có quyền")
  );
}

function formatHistoryDate(value: unknown) {
  const rawValue = readString(value);
  if (!rawValue) return "Vừa xong";
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return rawValue;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function mapHistoryItem(item: Record<string, unknown>): ModerationHistoryItem {
  const rawReviewedAt = readString(item.reviewedAt);
  return {
    id: readString(item.id, `hist-${readString(item.trackId, "unknown")}`),
    trackId: readString(item.trackId),
    trackTitle: readString(item.trackTitle, "Bài hát đã kiểm duyệt"),
    artistName: readString(item.artistName, "Nghệ sĩ"),
    genre: readString(item.genre, "Pop"),
    coverUrl: resolveMediaUrl(readString(item.coverUrl)) || undefined,
    reviewedAt: formatHistoryDate(item.reviewedAt),
    reviewedAtIso: rawReviewedAt || undefined,
    reviewerId: readString(item.reviewerId),
    reviewerName: readString(item.reviewerName, "Kiểm duyệt viên"),
    decision: readDecision(item.decision),
    rejectionReason: readString(item.rejectionReason) || undefined,
    internalNote: readString(item.internalNote) || undefined,
    reviewDurationSec: readNumber(item.reviewDurationSec),
    assignedExplicitTag:
      typeof item.assignedExplicitTag === "boolean"
        ? item.assignedExplicitTag
        : undefined,
  };
}

function isSameLocalDay(isoValue?: string): boolean {
  if (!isoValue) return false;
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  );
}

function computeModerationStats(
  queue: ModerationTrack[],
  historyItems: ModerationHistoryItem[],
): ModerationStats {
  const todayItems = historyItems.filter((item) => isSameLocalDay(item.reviewedAtIso));
  const approvedToday = todayItems.filter((item) => item.decision === "approved").length;
  const rejectedToday = todayItems.filter(
    (item) => item.decision === "rejected" || item.decision === "needs_revision",
  ).length;
  const todayTotal = approvedToday + rejectedToday;
  const approvedAll = historyItems.filter((item) => item.decision === "approved").length;
  const approvalPercentage =
    todayTotal > 0
      ? Math.round((approvedToday / todayTotal) * 100)
      : historyItems.length > 0
      ? Math.round((approvedAll / historyItems.length) * 100)
      : 0;

  const timedItems = historyItems.filter((item) => item.reviewDurationSec > 0);
  const avgReviewTimeMinutes =
    timedItems.length > 0
      ? Math.round(
          (timedItems.reduce((sum, item) => sum + item.reviewDurationSec, 0) /
            timedItems.length /
            60) *
            10,
        ) / 10
      : 0;

  const reasonCounts = new Map<string, number>();
  historyItems.forEach((item) => {
    if (item.decision === "approved" || !item.rejectionReason) return;
    const label = item.rejectionReason.split(";")[0]?.trim();
    if (!label) return;
    reasonCounts.set(label, (reasonCounts.get(label) || 0) + 1);
  });
  const totalReasons = Array.from(reasonCounts.values()).reduce((sum, count) => sum + count, 0);
  const violationsDistribution = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count], idx) => ({
      category: `reason-${idx}`,
      label,
      count,
      percentage: totalReasons > 0 ? Math.round((count / totalReasons) * 100) : 0,
    }));

  return {
    pendingCount: queue.length,
    urgentCount: queue.filter((t) => t.priority === "urgent").length,
    approvedToday,
    rejectedToday,
    avgReviewTimeMinutes,
    approvalPercentage,
    violationsDistribution,
  };
}

function mapQueueTrack(item: Record<string, unknown>): ModerationTrack {
  const hasLicenseFieldsFromOlderApi = Boolean(
    readString(item.copyrightOwner) ||
      readNumber(item.distributorId) > 0 ||
      readNumber(item.distributionContractId) > 0 ||
      readString(item.issueDate) ||
      readString(item.expiryDate) ||
      readString(item.licenseDocumentUrl),
  );
  const rawFeatures =
    item.audioFeatures && typeof item.audioFeatures === "object"
      ? (item.audioFeatures as Record<string, unknown>)
      : null;
  const parsedFeatures = rawFeatures
    ? {
        bpm: typeof rawFeatures.bpm === "number" && Number.isFinite(rawFeatures.bpm) ? rawFeatures.bpm : undefined,
        keySignature: readString(rawFeatures.keySignature) || undefined,
        energy: typeof rawFeatures.energy === "number" && Number.isFinite(rawFeatures.energy) ? rawFeatures.energy : undefined,
        danceability: typeof rawFeatures.danceability === "number" && Number.isFinite(rawFeatures.danceability) ? rawFeatures.danceability : undefined,
        valence: typeof rawFeatures.valence === "number" && Number.isFinite(rawFeatures.valence) ? rawFeatures.valence : undefined,
        acousticness: typeof rawFeatures.acousticness === "number" && Number.isFinite(rawFeatures.acousticness) ? rawFeatures.acousticness : undefined,
      }
    : undefined;
  const hasRealFeatures = Boolean(
    parsedFeatures &&
      Object.values(parsedFeatures).some((val) => val !== undefined),
  );

  return {
    id: readString(item.id),
    title: readString(item.title, "Bài hát chưa đặt tên"),
    artist: readString(item.artist, "Nghệ sĩ"),
    genre: readString(item.genre, "Pop"),
    duration: readString(item.duration, "—"),
    durationSec: readNumber(item.durationSec, 0),
    coverUrl: resolveMediaUrl(readString(item.coverUrl)),
    audioUrl: resolveMediaUrl(readString(item.audioUrl)),
    submittedAt: readString(item.submittedAt, "Hôm nay"),
    priority:
      item.priority === "urgent" || item.priority === "high" || item.priority === "normal"
        ? item.priority
        : "normal",
    status:
      item.status === "pending" ||
      item.status === "approved" ||
      item.status === "rejected" ||
      item.status === "needs_revision"
        ? item.status
        : "pending",
    releaseType:
      item.releaseType === "EP Track" || item.releaseType === "Album Track"
        ? item.releaseType
        : "Single",
    explicitFlagByArtist: readBoolean(item.explicitFlagByArtist),
    lyricsPlain: readString(item.lyricsPlain),
    licenseRecordExists:
      item.licenseRecordExists === true || hasLicenseFieldsFromOlderApi,
    licenseType: readString(item.licenseType) || undefined,
    copyrightOwner: readString(item.copyrightOwner) || undefined,
    distributorId: readNumber(item.distributorId) || undefined,
    distributorName: readString(item.distributorName) || undefined,
    distributionContractId: readNumber(item.distributionContractId) || undefined,
    distributionContractCode: readString(item.distributionContractCode) || undefined,
    issueDate: readString(item.issueDate) || undefined,
    expiryDate: readString(item.expiryDate) || undefined,
    licenseStatus: readString(item.licenseStatus) || undefined,
    licenseDocumentUrl: resolveMediaUrl(readString(item.licenseDocumentUrl)),
    audioFeatures: hasRealFeatures ? parsedFeatures : undefined,
  };
}

export default function DashboardModeratorPage() {
  const router = useRouter();

  // Primary state
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [profile, setProfile] = useState<ModeratorProfile>(() => {
    if (typeof window !== "undefined") {
      try {
        const rawUser = window.localStorage.getItem("moodify.auth.user");
        if (rawUser) {
          return createEmptyProfile(JSON.parse(rawUser));
        }
      } catch {}
    }
    return createEmptyProfile();
  });
  const [stats, setStats] = useState<ModerationStats>(EMPTY_MODERATOR_STATS);
  const [pendingTracks, setPendingTracks] = useState<ModerationTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<ModerationTrack | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moderatorToken, setModeratorToken] = useState<string | null>(null);
  const [history, setHistory] = useState<ModerationHistoryItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const fetchModerationQueue = async (tokenOverride?: string): Promise<ModerationTrack[]> => {
    try {
      setIsLoadingQueue(true);
      const token = tokenOverride ?? moderatorToken;
      if (!token) {
        throw new Error("Phiên đăng nhập kiểm duyệt đã hết hạn. Vui lòng đăng nhập lại.");
      }

      const data = await getModeratorQueue(token);
      const mappedTracks = Array.isArray(data) ? data.map(mapQueueTrack) : [];
      setPendingTracks(mappedTracks);
      setSelectedTrack((prev) =>
        prev ? mappedTracks.find((t) => t.id === prev.id) || mappedTracks[0] || null : mappedTracks[0] || null
      );
      setLoadError(null);
      return mappedTracks;
    } catch (err) {
      console.warn("Could not fetch moderator queue from backend:", err);
      setPendingTracks([]);
      setSelectedTrack(null);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Không thể tải danh sách bài hát chờ duyệt từ máy chủ.";
      setLoadError(message);
      if (isAuthFailure(err)) {
        throw err;
      }
      return [];
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const fetchModerationHistory = async (tokenOverride?: string): Promise<ModerationHistoryItem[]> => {
    try {
      const token = tokenOverride ?? moderatorToken;
      if (!token) {
        throw new Error("Phiên đăng nhập kiểm duyệt đã hết hạn. Vui lòng đăng nhập lại.");
      }

      const data = await getModeratorHistory(token);
      const mappedHistory = Array.isArray(data) ? data.map(mapHistoryItem) : [];
      setHistory(mappedHistory);
      const timed = mappedHistory.filter((item) => item.reviewDurationSec > 0);
      const avgMin =
        timed.length > 0
          ? Math.round(
              (timed.reduce((sum, item) => sum + item.reviewDurationSec, 0) / timed.length / 60) * 10
            ) / 10
          : 0;
      setProfile((prev) => ({
        ...prev,
        totalReviewed: mappedHistory.length,
        approvalRate:
          mappedHistory.length > 0
            ? Math.round(
                (mappedHistory.filter((item) => item.decision === "approved").length /
                  mappedHistory.length) *
                  1000
              ) / 10
            : 0,
        avgReviewTimeMin: avgMin,
      }));
      return mappedHistory;
    } catch (err) {
      console.warn("Could not fetch moderator history from backend:", err);
      throw err;
    }
  };

  useEffect(() => {
    setStats(computeModerationStats(pendingTracks, history));
  }, [pendingTracks, history]);

  useEffect(() => {
    let isCancelled = false;

    const hydrateModeratorDashboard = async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          throw new Error("Phiên đăng nhập kiểm duyệt đã hết hạn. Vui lòng đăng nhập lại.");
        }

        const currentUser = await getCurrentUser(token);
        const normalizedRole = (currentUser.role || "").trim().toLowerCase();
        if (normalizedRole !== "moderator") {
          if (normalizedRole === "admin") {
            router.replace("/dashboard/admin");
            return;
          }
          if (normalizedRole === "content_lead" || normalizedRole === "artist") {
            router.replace("/dashboard/content-lead");
            return;
          }
          router.replace("/dashboard/user");
          return;
        }

        if (isCancelled) return;

        setModeratorToken(token);
        setProfile((prev) => ({
          ...prev,
          id: String(currentUser.id),
          fullName: currentUser.fullName || prev.fullName,
          email: currentUser.email || prev.email,
          username: currentUser.username || prev.username,
          phone: currentUser.phone || "",
          avatarUrl: resolveMediaUrl(readString(currentUser.avatarUrl)) || prev.avatarUrl,
        }));

        try {
          await Promise.all([
            fetchModerationQueue(token),
            fetchModerationHistory(token),
          ]);
        } catch (fetchErr) {
          console.warn("Notice: failed to load queue or history:", fetchErr);
        }
      } catch (err) {
        if (isCancelled) return;

        console.warn("Could not hydrate moderator dashboard:", err);
        addToast(
          err instanceof Error
            ? err.message
            : "Không thể xác thực phiên kiểm duyệt. Vui lòng đăng nhập lại.",
          "error",
        );
        router.replace("/dashboard/user");
      }
    };

    void hydrateModeratorDashboard();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Decision modal state
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionActionType, setDecisionActionType] = useState<
    "approve" | "reject"
  >("approve");
  const [decisionTrack, setDecisionTrack] = useState<ModerationTrack | null>(
    null
  );

  const addToast = (
    message: string,
    type: "success" | "info" | "warning" | "error" = "info"
  ) => {
    const newToast: ToastMessage = {
      id: "toast-" + Date.now() + Math.random(),
      message,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleOpenDecisionModal = (
    track: ModerationTrack,
    actionType: "approve" | "reject"
  ) => {
    setDecisionTrack(track);
    setDecisionActionType(actionType);
    setDecisionModalOpen(true);
  };

  const handleProcessDecision = async ({
    actionType,
    rejectionReason,
    internalNote,
    explicitTag,
    rightsVerified,
  }: {
    actionType: "approve" | "reject";
    rejectionReason?: string;
    internalNote?: string;
    explicitTag?: boolean;
    rightsVerified?: boolean;
  }) => {
    if (!decisionTrack) return;

    const trackTitle = decisionTrack.title;

    try {
      await submitModeratorDecision({
        trackId: decisionTrack.id,
        actionType,
        rejectionReason,
        internalNote,
        explicitTag,
    rightsVerified,
      }, moderatorToken || undefined);
    } catch (err) {
      console.error("Failed to submit moderator decision to backend:", err);
      addToast(
        err instanceof Error
          ? err.message
          : "Không thể lưu quyết định kiểm duyệt.",
        "error"
      );
      throw err;
    }

    if (actionType === "approve") {
      addToast(
        `Đã duyệt và phát hành bài hát "${trackTitle}".`,
        "success"
      );
    } else {
      addToast(
        `Đã từ chối bài hát "${trackTitle}".`,
        "info"
      );
    }

    try {
      await Promise.all([
        fetchModerationQueue(moderatorToken || undefined),
        fetchModerationHistory(moderatorToken || undefined),
      ]);
    } catch (err) {
      console.error("Decision was saved, but moderator data could not refresh:", err);
      addToast(
        "Quyết định đã được lưu, nhưng chưa thể làm mới hàng chờ và lịch sử.",
        "warning"
      );
    }
  };

  const handleLogout = () => {
    logoutAndRedirect();
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        fetchModerationQueue(moderatorToken || undefined),
        fetchModerationHistory(moderatorToken || undefined),
      ]);
      addToast("Đã cập nhật hàng chờ và lịch sử mới nhất.", "info");
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Không thể tải dữ liệu kiểm duyệt.",
        "error",
      );
    }
  };

  const urgentTracks = pendingTracks.filter((t) => t.priority === "urgent");

  const getTabTitle = () => {
    switch (activeTab) {
      case "overview":
        return {
          title: "Tổng quan kiểm duyệt",
          subtitle: "Theo dõi hàng chờ và kết quả duyệt bài.",
        };
      case "queue":
        return {
          title: "Hàng chờ duyệt bài",
          subtitle: "Nghe thử, kiểm tra hồ sơ bản quyền và quyết định phát hành.",
        };
      case "history":
        return {
          title: "Lịch sử duyệt bài",
          subtitle: "Danh sách các bài hát đã duyệt, yêu cầu sửa hoặc từ chối.",
        };
      case "account":
        return {
          title: "Tài khoản kiểm duyệt",
          subtitle: "Thông tin cá nhân và bảo mật tài khoản.",
        };
    }
  };

  const currentTabMeta = getTabTitle();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#08090d] text-white lg:flex-row">
      {/* Left Sidebar Navigation */}
      <ModeratorSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingCount={pendingTracks.length}
        profile={profile}
        onLogout={handleLogout}
      />

      {/* Right Content Area */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Desktop Top Bar */}
        <header className="sticky top-0 z-30 hidden border-b border-white/[0.08] bg-[#08090d]/90 px-8 py-4 backdrop-blur-xl lg:block">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-white">
                {currentTabMeta.title}
              </h1>
              <p className="mt-0.5 text-xs text-white/50">
                {currentTabMeta.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isLoadingQueue}
                onClick={handleRefresh}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#12141c] px-3.5 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                title="Làm mới hàng chờ"
              >
                <RotateCcw className={`h-3.5 w-3.5 text-[#ff8b4d] ${isLoadingQueue ? "animate-spin" : ""}`} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Tab Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {loadError && (
            <div
              role="alert"
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200"
            >
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="rounded-lg border border-rose-400/30 bg-rose-500/20 px-3 py-1 font-semibold text-white hover:bg-rose-500/30 transition cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          )}
          {activeTab === "overview" && (
            <ModeratorOverviewTab
              stats={stats}
              urgentTracks={urgentTracks}
              onSelectTrackForReview={(track) => {
                setSelectedTrack(track);
                setActiveTab("queue");
              }}
              onNavigateToQueue={() => setActiveTab("queue")}
            />
          )}

          {activeTab === "queue" && (
            <ModeratorReviewQueueTab
              tracks={pendingTracks}
              selectedTrack={selectedTrack}
              onSelectTrack={(track) => setSelectedTrack(track)}
              onOpenDecisionModal={handleOpenDecisionModal}
            />
          )}

          {activeTab === "history" && (
            <ModeratorHistoryTab history={history} />
          )}

          {activeTab === "account" && (
            <ModeratorAccountTab
              profile={profile}
              onUpdateProfile={(updated) => setProfile(updated)}
              onShowToast={addToast}
            />
          )}
        </main>
      </div>

      {/* Decision Modal (Approve / Reject) */}
      {decisionTrack && (
        <ModeratorDecisionModal
          isOpen={decisionModalOpen}
          onClose={() => setDecisionModalOpen(false)}
          track={decisionTrack}
          actionType={decisionActionType}
          onSubmitDecision={handleProcessDecision}
        />
      )}

      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
