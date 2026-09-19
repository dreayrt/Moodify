"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  RotateCcw,
  Clock,
} from "lucide-react";
import { ToastNotification } from "../../artist/components/toast-notification";
import {
  INITIAL_MODERATOR_PROFILE,
  INITIAL_MODERATOR_STATS,
  INITIAL_PENDING_TRACKS,
} from "../mock-moderator-data";
import {
  ModerationHistoryItem,
  ModerationStats,
  ModerationTrack,
  ModeratorProfile,
  ToastMessage,
  ViolationCategory,
} from "../types";
import {
  clearAuthSession,
  getCurrentUser,
  getModeratorHistory,
  getModeratorQueue,
  getStoredAuthSession,
  getValidAccessToken,
  logout,
  submitModeratorDecision,
} from "@/lib/auth/auth-client";

import { ModeratorSidebar, TabKey } from "./moderator-sidebar";
import { ModeratorOverviewTab } from "./moderator-overview-tab";
import { ModeratorReviewQueueTab } from "./moderator-review-queue-tab";
import { ModeratorHistoryTab } from "./moderator-history-tab";
import { ModeratorAccountTab } from "./moderator-account-tab";
import { ModeratorDecisionModal } from "./moderator-decision-modal";
import { resolveMediaUrl } from "./moderator-track-cover";

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
  return {
    id: readString(item.id, `hist-${readString(item.trackId, "unknown")}`),
    trackId: readString(item.trackId),
    trackTitle: readString(item.trackTitle, "Bài hát đã kiểm duyệt"),
    artistName: readString(item.artistName, "Nghệ sĩ"),
    genre: readString(item.genre, "Pop"),
    coverUrl: resolveMediaUrl(readString(item.coverUrl)) || undefined,
    reviewedAt: formatHistoryDate(item.reviewedAt),
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

function mapQueueTrack(item: Record<string, unknown>): ModerationTrack {
  const waveform = Array.isArray(item.waveform)
    ? item.waveform.filter((point): point is number => typeof point === "number")
    : [];

  return {
    id: readString(item.id),
    title: readString(item.title, "Bài hát chưa đặt tên"),
    artist: readString(item.artist, "Nghệ sĩ"),
    genre: readString(item.genre, "Pop"),
    duration: readString(item.duration, "3:30"),
    durationSec: readNumber(item.durationSec, 210),
    coverUrl: resolveMediaUrl(readString(item.coverUrl)),
    audioUrl: resolveMediaUrl(readString(item.audioUrl)),
    waveform: waveform.length > 0 ? waveform : [0.3, 0.6, 0.8, 0.4, 0.7, 0.5, 0.9, 0.6, 0.4, 0.5],
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
    audioSpec: {
      format: "MP3 320kbps",
      sampleRate: "44.1 kHz",
      bitrate: "320 kbps",
      peakDb: -0.2,
      durationSec: readNumber(item.durationSec, 210),
    },
    aiAssessment: {
      riskScore: 5,
      copyrightMatchPercent: 0,
      explicitLyricsDetected: readBoolean(item.explicitFlagByArtist),
      flaggedKeywords: [],
      audioQualityScore: 95,
      notes: "Bài hát gửi lên từ Nghệ sĩ kèm hồ sơ bản quyền hợp lệ.",
    },
    licenseType: readString(item.licenseType) || undefined,
    copyrightOwner: readString(item.copyrightOwner) || undefined,
    distributorId: readNumber(item.distributorId) || undefined,
    distributionContractId: readNumber(item.distributionContractId) || undefined,
    issueDate: readString(item.issueDate) || undefined,
    expiryDate: readString(item.expiryDate) || undefined,
    licenseStatus: readString(item.licenseStatus) || undefined,
    licenseDocumentUrl: resolveMediaUrl(readString(item.licenseDocumentUrl)),
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
          const userObj = JSON.parse(rawUser);
          if (userObj && (userObj.fullName || userObj.name)) {
            return {
              ...INITIAL_MODERATOR_PROFILE,
              fullName: userObj.fullName || userObj.name || INITIAL_MODERATOR_PROFILE.fullName,
              email: userObj.email || INITIAL_MODERATOR_PROFILE.email,
              username: userObj.username || INITIAL_MODERATOR_PROFILE.username,
              avatarUrl: userObj.avatarUrl || INITIAL_MODERATOR_PROFILE.avatarUrl,
              staffId: userObj.id ? `MOD-${userObj.id}` : INITIAL_MODERATOR_PROFILE.staffId,
            };
          }
        }
      } catch {}
    }
    return INITIAL_MODERATOR_PROFILE;
  });
  const [stats, setStats] = useState<ModerationStats>(INITIAL_MODERATOR_STATS);
  const [pendingTracks, setPendingTracks] = useState<ModerationTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<ModerationTrack | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [moderatorToken, setModeratorToken] = useState<string | null>(null);
  const [history, setHistory] = useState<ModerationHistoryItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [currentTime, setCurrentTime] = useState<string>("");

  const fetchModerationQueue = async (tokenOverride?: string) => {
    try {
      setIsLoadingQueue(true);
      const token = tokenOverride ?? moderatorToken;
      if (!token) {
        throw new Error("Phiên đăng nhập kiểm duyệt đã hết hạn. Vui lòng đăng nhập lại.");
      }

      const data = await getModeratorQueue(token);
      if (Array.isArray(data) && data.length > 0) {
        const mappedTracks = data.map(mapQueueTrack);
        setPendingTracks(mappedTracks);
        setSelectedTrack((prev) =>
          prev ? mappedTracks.find((t) => t.id === prev.id) || mappedTracks[0] : mappedTracks[0]
        );
        setStats((prev) => ({
          ...prev,
          pendingCount: mappedTracks.length,
          urgentCount: mappedTracks.filter((t) => t.priority === "urgent").length,
        }));
      } else {
        // If server returns empty, fallback to empty
        setPendingTracks([]);
        setSelectedTrack(null);
        setStats((prev) => ({ ...prev, pendingCount: 0, urgentCount: 0 }));
      }
    } catch (err) {
      console.warn("Could not fetch moderator queue from backend:", err);
      if (isAuthFailure(err)) {
        setPendingTracks([]);
        setSelectedTrack(null);
        setStats((prev) => ({ ...prev, pendingCount: 0, urgentCount: 0 }));
        throw err;
      }
      // If backend not available yet, provide INITIAL_PENDING_TRACKS as graceful fallback
      if (pendingTracks.length === 0) {
        setPendingTracks(INITIAL_PENDING_TRACKS);
        setSelectedTrack(INITIAL_PENDING_TRACKS[0] || null);
      }
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const fetchModerationHistory = async (tokenOverride?: string) => {
    try {
      const token = tokenOverride ?? moderatorToken;
      if (!token) {
        throw new Error("Phiên đăng nhập kiểm duyệt đã hết hạn. Vui lòng đăng nhập lại.");
      }

      const data = await getModeratorHistory(token);
      const mappedHistory = Array.isArray(data) ? data.map(mapHistoryItem) : [];
      setHistory(mappedHistory);
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
            : prev.approvalRate,
      }));
    } catch (err) {
      console.warn("Could not fetch moderator history from backend:", err);
      setHistory([]);
      if (isAuthFailure(err)) {
        throw err;
      }
    }
  };

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
          throw new Error("Tài khoản hiện tại không có quyền truy cập khu vực kiểm duyệt.");
        }

        if (isCancelled) return;

        setModeratorToken(token);
        setProfile((prev) => ({
          ...prev,
          id: String(currentUser.id),
          fullName: currentUser.fullName || prev.fullName,
          email: currentUser.email || prev.email,
          username: currentUser.username || prev.username,
          avatarUrl: currentUser.avatarUrl || prev.avatarUrl,
          staffId: `MOD-${currentUser.id}`,
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
        router.push("/dashboard");
      }
    };

    void hydrateModeratorDashboard();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Update real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Decision modal state
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionActionType, setDecisionActionType] = useState<
    "approve" | "reject" | "needs_revision"
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
    actionType: "approve" | "reject" | "needs_revision"
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
  }: {
    actionType: "approve" | "reject" | "needs_revision";
    violationCategory?: ViolationCategory;
    rejectionReason?: string;
    internalNote?: string;
    explicitTag?: boolean;
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
      }, moderatorToken || undefined);

      await Promise.all([
        fetchModerationQueue(moderatorToken || undefined),
        fetchModerationHistory(moderatorToken || undefined),
      ]);

      if (actionType === "approve") {
        addToast(
          `Đã phê duyệt và phát hành bài hát "${trackTitle}" thành công!`,
          "success"
        );
      } else if (actionType === "reject") {
        addToast(
          `Đã từ chối bài hát "${trackTitle}". Lịch sử đã được lưu xuống database.`,
          "error"
        );
      } else {
        addToast(
          `Đã gửi yêu cầu chỉnh sửa bài hát "${trackTitle}" và lưu lịch sử thẩm định.`,
          "warning"
        );
      }
    } catch (err) {
      console.error("Failed to submit moderator decision to backend:", err);
      addToast(
        err instanceof Error
          ? err.message
          : "Không thể lưu quyết định kiểm duyệt xuống database",
        "error"
      );
    }
  };

  const handleLogout = async () => {
    addToast("Đang đăng xuất khỏi hệ thống kiểm duyệt...", "info");
    try {
      const session = getStoredAuthSession();
      if (session?.refreshToken) {
        await logout(session.refreshToken);
      }
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      clearAuthSession();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      router.push("/");
    }
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        fetchModerationQueue(moderatorToken || undefined),
        fetchModerationHistory(moderatorToken || undefined),
      ]);
      addToast("Đã đồng bộ hàng chờ và lịch sử từ máy chủ!", "info");
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Không thể đồng bộ dữ liệu kiểm duyệt.",
        "error",
      );
    }
  };

  const urgentTracks = pendingTracks.filter((t) => t.priority === "urgent");

  // Page title mapping based on active tab
  const getTabTitle = () => {
    switch (activeTab) {
      case "overview":
        return {
          title: "Tổng Quan Studio",
          subtitle: "Trung tâm chỉ huy & hiệu suất kiểm duyệt âm nhạc Moodify",
        };
      case "queue":
        return {
          title: "Hàng Chờ Thẩm Định",
          subtitle: "Phân tích phổ âm thanh, kiểm tra bản quyền & ra quyết định xuất bản",
        };
      case "history":
        return {
          title: "Nhật Ký & Lịch Sử Đánh Giá",
          subtitle: "Truy vết các quyết định kiểm duyệt, lý do từ chối và biên bản thẩm định",
        };
      case "account":
        return {
          title: "Tài Khoản & Ca Trực",
          subtitle: "Thiết lập định danh kiểm duyệt viên, chứng chỉ năng lực & bảo mật",
        };
    }
  };

  const currentTabMeta = getTabTitle();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#08090d] text-white lg:flex-row">
      {/* Ambient background lighting */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[20%] h-[550px] w-[550px] rounded-full bg-[#ff773b]/5 blur-[150px]" />
        <div className="absolute bottom-[5%] right-[10%] h-[500px] w-[500px] rounded-full bg-[#427ddb]/5 blur-[150px]" />
      </div>

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
        {/* Desktop Top Bar (Header khu vực làm việc) */}
        <header className="sticky top-0 z-30 hidden border-b border-white/8 bg-[#08090d]/80 px-8 py-4 backdrop-blur-xl lg:block">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold tracking-tight text-white">
                  {currentTabMeta.title}
                </h1>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-white/60">
                  Phòng Kiểm Duyệt
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-white/40">
                {currentTabMeta.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Shift Live Time */}
              <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-1.5 text-[12px] text-white/60">
                <Clock className="h-3.5 w-3.5 text-[#ff8b4d]" />
                <span className="font-mono text-white/80">{currentTime || "--:--:--"}</span>
              </div>

              {/* Refresh queue button */}
              <button
                type="button"
                onClick={handleRefresh}
                className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                title="Làm mới hàng chờ"
              >
                <RotateCcw className="h-3.5 w-3.5 text-white/50" />
                <span>Đồng bộ</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Tab Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
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

      {/* Decision Modal (Approve / Reject / Revision) */}
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
