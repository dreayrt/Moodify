"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Activity,
  BarChart3,
  Bell,
  CalendarRange,
  ChevronRight,
  CircleDollarSign,
  Download,
  Flame,
  Heart,
  LogOut,
  MessageSquare,
  Music2,
  Radio,
  Search,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LogoMark } from "@/components/shared/logo-mark";
import {
  clearAuthSession,
  getCurrentArtistCatalog,
  getCurrentUser,
  getStoredAuthSession,
  getValidAccessToken,
  logout,
  type ArtistProfileResponse,
  type ArtistTrackResponse,
  type UserProfileResponse,
} from "@/lib/auth/auth-client";

import { ArtistTrack, ToastMessage } from "../types";
import { TrackCatalogPanel } from "./track-catalog-panel";
import { TrackEditModal } from "./track-edit-modal";
import { TrackDeleteModal } from "./track-delete-modal";
import { TrackUploadModal } from "./track-upload-modal";
import { ToastNotification } from "./toast-notification";

type TabKey = "tracks" | "comments" | "benefits";

type Stat = {
  key: "plays" | "reposts" | "downloads" | "likes" | "comments";
  value: string;
  trend: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

type Release = {
  title: string;
  type: string;
  stage: string;
  date: string;
  progress: string;
  progressWidth: number;
};

const KEYFRAMES = `
@keyframes artistFloat {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -10px, 0); }
}

@keyframes artistPulse {
  0%, 100% { opacity: 0.45; transform: scale(0.96); }
  50% { opacity: 0.95; transform: scale(1.02); }
}

@keyframes artistSheen {
  0% { transform: translateX(-130%) skewX(-16deg); }
  100% { transform: translateX(150%) skewX(-16deg); }
}

@keyframes artistEqualize {
  0%, 100% { transform: scaleY(0.28); opacity: 0.55; }
  50% { transform: scaleY(1); opacity: 1; }
}
`;

const RELEASES: Release[] = [
  {
    title: "Neon Horizon - Extended EP",
    type: "EP Release (5 Tracks)",
    stage: "Đang hoàn thiện Master",
    date: "18/03/2026",
    progress: "85%",
    progressWidth: 85,
  },
  {
    title: "Midnight Echoes (Acoustic Version)",
    type: "Single / Video Clip",
    stage: "Lên lịch phát hành",
    date: "25/03/2026",
    progress: "50%",
    progressWidth: 50,
  },
  {
    title: "Cyberpunk Tokyo Vinyl Edition",
    type: "Physical Drop (500 copies)",
    stage: "Đặt trước đợt 1",
    date: "10/04/2026",
    progress: "30%",
    progressWidth: 30,
  },
];

const FAN_TOUCHPOINTS = [
  { city: "TP. Hồ Chí Minh", share: "38% thính giả", tone: "Cao điểm 21:00 - 01:00" },
  { city: "Hà Nội", share: "26% thính giả", tone: "Tăng trưởng +34% tháng này" },
  { city: "Đà Nẵng", share: "15% thính giả", tone: "Top thể loại EDM / House" },
  { city: "Tokyo & Seoul", share: "12% thính giả", tone: "Khán giả Synthwave" },
];

const COMMENT_PREVIEWS = [
  {
    name: "Minh Nhật",
    excerpt: "Đoạn drop lúc 2:15 nghe cuốn dã man! Rất mong chờ bản master chính thức trên Spotify.",
    age: "2 giờ trước",
  },
  {
    name: "Alex Chen",
    excerpt: "Amazing vibes on the acoustic demo. Such an emotional chord progression!",
    age: "1 ngày trước",
  },
  {
    name: "Thu Hà",
    excerpt: "Đã nghe đi nghe lại bài này suốt cả buổi tối học bài, giai điệu rất chữa lành.",
    age: "3 ngày trước",
  },
];

const TAB_LABELS: Array<{ key: TabKey; labelKey: string }> = [
  { key: "tracks", labelKey: "dashboard.artist.tabs.tracks" },
  { key: "comments", labelKey: "dashboard.artist.tabs.comments" },
  { key: "benefits", labelKey: "dashboard.artist.tabs.benefits" },
];

const HOME_ROUTE = "/dashboard";
const USER_DASHBOARD_ROUTE = "/dashboard/user";

function formatCatalogDate(value: string | null | undefined) {
  if (!value) return "Chưa cập nhật";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function mapCatalogTrack(track: ArtistTrackResponse): ArtistTrack {
  return {
    id: track.id,
    spotifyId: track.spotifyId,
    title: track.title,
    artist: track.artist,
    genre: track.genre,
    duration: track.duration,
    status: track.status,
    visibility: track.visibility,
    plays: track.plays,
    likes: track.likes,
    commentsCount: track.commentsCount,
    bpm: track.bpm ?? undefined,
    key: track.key ?? undefined,
    coverUrl: track.coverUrl ?? undefined,
    audioUrl: track.audioUrl ?? undefined,
    spotifyUrl: track.spotifyUrl ?? undefined,
    downloadStatus: track.downloadStatus ?? undefined,
    moderationStatus: track.moderationStatus ?? undefined,
    moderationScore: track.moderationScore ?? undefined,
    description: track.description ?? undefined,
    updatedAt: formatCatalogDate(track.updatedAt),
    createdAt: track.createdAt ?? "",
  };
}

function StatCard({ item, delay }: { item: Stat; delay: number }) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <div
      className="anim-fade-up rounded-[22px] border border-white/8 bg-white/[0.04] p-4 md:p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.05]">
          <Icon className="h-[18px] w-[18px] text-white/72" strokeWidth={1.7} />
        </div>
        <span className="rounded-full border border-[#ff8b4d]/25 bg-[#ff8b4d]/10 px-2.5 py-1 text-[10px] tracking-[0.18em] text-[#ffb488]">
          {item.trend}
        </span>
      </div>
      <p className="mt-5 font-graphik text-[28px] leading-none tracking-[-0.03em] text-white">
        {item.value}
      </p>
      <p className="mt-2 text-[12px] tracking-[0.14em] text-white/46 uppercase">
        {t(`dashboard.artist.stats.${item.key}`)}
      </p>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative pb-4 text-left text-[14px] transition-colors ${
        active ? "text-white" : "text-white/48 hover:text-white/76"
      }`}
    >
      <span>{label}</span>
      <span
        className={`absolute bottom-0 left-0 h-[3px] rounded-full bg-white transition-all ${
          active ? "w-full opacity-100" : "w-8 opacity-0"
        }`}
      />
    </button>
  );
}


function TracksPanel({
  tracks,
  onEditTrack,
  onDeleteTrack,
  onToggleStatus,
  onToggleVisibility,
  onCopyLink,
  playingTrackId,
  onTogglePlayTrack,
  onOpenUpload,
  onShowHistory,
}: {
  tracks: ArtistTrack[];
  onEditTrack: (track: ArtistTrack) => void;
  onDeleteTrack: (track: ArtistTrack) => void;
  onToggleStatus: (track: ArtistTrack) => void;
  onToggleVisibility: (track: ArtistTrack) => void;
  onCopyLink: (track: ArtistTrack) => void;
  playingTrackId: string | null;
  onTogglePlayTrack: (track: ArtistTrack) => void;
  onOpenUpload: () => void;
  onShowHistory: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
        <div
          className="anim-fade-up rounded-[28px] border border-white/8 bg-[#121316] p-5 md:p-6 shadow-[0_28px_80px_rgba(0,0,0,0.28)]"
          style={{ animationDelay: "760ms" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] tracking-[0.24em] text-[#ffb488] uppercase">
                {t("dashboard.artist.upload.queue")}
              </p>
              <h3 className="mt-2 font-graphik text-[28px] tracking-[-0.03em] text-white">
                {t("dashboard.artist.upload.title")}
              </h3>
            </div>
            <button
              type="button"
              onClick={onShowHistory}
              className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-white/72 transition hover:bg-white/[0.08] hover:text-white md:inline-flex"
            >
              {t("dashboard.artist.upload.history")}
            </button>
          </div>

          <div
            onClick={onOpenUpload}
            className="relative mt-6 overflow-hidden rounded-[26px] border border-dashed border-white/14 bg-[radial-gradient(circle_at_top,_rgba(255,122,44,0.14),_transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-7 md:p-9 cursor-pointer group transition-all hover:border-[#ff7a2c]/50 hover:bg-white/[0.03]"
          >
            <div className="absolute inset-0 opacity-60">
              <div className="absolute left-[10%] top-5 h-32 w-32 rounded-full bg-[#ff7a2c]/10 blur-3xl" />
              <div className="absolute bottom-0 right-[10%] h-28 w-28 rounded-full bg-[#8fb4ff]/10 blur-3xl" />
            </div>
            <div className="relative flex flex-col items-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-[18px] border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] group-hover:scale-110 transition-transform">
                <UploadCloud className="h-8 w-8 text-white" strokeWidth={1.7} />
              </div>
              <p className="mt-5 text-[24px] font-graphik tracking-[-0.03em] text-white group-hover:text-[#ffb488] transition-colors">
                {t("dashboard.artist.upload.dropTitle")}
              </p>
              <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/58">
                Tải lên bản phối mới nhất (WAV, FLAC, MP3 320kbps) để phân phối trực tiếp tới người nghe trên Moodify.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenUpload();
                  }}
                  className="group/btn relative overflow-hidden rounded-full bg-white px-5 py-3 text-[13px] font-medium text-black transition hover:-translate-y-0.5"
                >
                  <span className="relative z-10">{t("dashboard.artist.upload.choose")}</span>
                  <span
                    className="absolute inset-0 opacity-0 transition-opacity group-hover/btn:opacity-100"
                    style={{
                      background:
                        "linear-gradient(115deg, transparent 0%, rgba(255,122,44,0.08) 35%, rgba(255,255,255,0.85) 50%, rgba(255,122,44,0.08) 65%, transparent 100%)",
                      animation: "artistSheen 820ms ease",
                    }}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenUpload();
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-[13px] text-white/74 transition hover:bg-white/[0.08]"
                >
                  {t("dashboard.artist.upload.import")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="anim-fade-up rounded-[28px] border border-white/8 bg-white/[0.04] p-5 md:p-6 shadow-[0_28px_80px_rgba(0,0,0,0.22)]"
          style={{ animationDelay: "860ms" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-[0.24em] text-[#9ec5ff] uppercase">
                {t("dashboard.artist.release.eyebrow")}
              </p>
              <h3 className="mt-2 font-graphik text-[24px] tracking-[-0.03em] text-white">
                {t("dashboard.artist.release.title")}
              </h3>
            </div>
            <CalendarRange className="h-5 w-5 text-white/42" strokeWidth={1.7} />
          </div>

          <div className="mt-5 space-y-4">
            {RELEASES.map((release, index) => (
              <div
                key={`release-${index}`}
                className="rounded-[22px] border border-white/8 bg-black/20 p-4 transition hover:border-white/14 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] text-white">{release.title}</p>
                    <p className="mt-1 text-[12px] text-white/48">{release.type}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/64">
                    {release.date}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-[12px] text-white/58">
                  <span>{release.stage}</span>
                  <span>{release.progress}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#ff7a2c_0%,#ffb37a_56%,#dce9ff_100%)]"
                    style={{ width: `${release.progressWidth}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Track Catalog Panel */}
      <TrackCatalogPanel
        tracks={tracks}
        onEditTrack={onEditTrack}
        onDeleteTrack={onDeleteTrack}
        onToggleStatus={onToggleStatus}
        onToggleVisibility={onToggleVisibility}
        onCopyLink={onCopyLink}
        playingTrackId={playingTrackId}
        onTogglePlayTrack={onTogglePlayTrack}
        onOpenUpload={onOpenUpload}
      />
    </div>
  );
}


function CommentsPanel() {
  const { t } = useTranslation();

  return (
    <div
      className="anim-fade-up rounded-[28px] border border-white/8 bg-white/[0.04] p-6"
      style={{ animationDelay: "760ms" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.24em] text-[#ffb488] uppercase">
            {t("dashboard.artist.commentsPanel.eyebrow")}
          </p>
          <h3 className="mt-2 font-graphik text-[26px] tracking-[-0.03em] text-white">
            {t("dashboard.artist.commentsPanel.title")}
          </h3>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-white/72 transition hover:bg-white/[0.08]"
        >
          {t("dashboard.artist.commentsPanel.moderate")}
        </button>
      </div>
      <div className="mt-6 space-y-4">
        {COMMENT_PREVIEWS.map((comment) => (
          <div key={comment.name} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] text-white font-medium">{comment.name}</p>
              <p className="text-[11px] text-white/44">{comment.age}</p>
            </div>
            <p className="mt-3 text-[14px] leading-6 text-white/62">{comment.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenefitsPanel() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {[
        {
          title: "Doanh thu trực tiếp 85%",
          body: "Nhận tiền bản quyền trực tiếp từ người nghe với tỉ lệ chi trả cao nhất thị trường.",
        },
        {
          title: "Xác thực nghệ sĩ chính thức",
          body: "Huy hiệu tick xanh độc quyền và trang profile nghệ sĩ tùy biến giao diện.",
        },
        {
          title: "Công cụ phân tích Real-time",
          body: "Theo dõi nhân khẩu học người nghe, bản đồ lượt phát và xu hướng tương tác 24/7.",
        },
      ].map((item, index) => (
        <div
          key={`benefit-${index}`}
          className="anim-fade-up rounded-[28px] border border-white/8 bg-white/[0.04] p-6"
          style={{ animationDelay: `${760 + index * 80}ms` }}
        >
          <Sparkles className="h-5 w-5 text-[#ffb488]" strokeWidth={1.7} />
          <h3 className="mt-5 font-graphik text-[24px] tracking-[-0.03em] text-white">{item.title}</h3>
          <p className="mt-3 text-[14px] leading-6 text-white/58">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

function RightRail() {
  const { t } = useTranslation();

  return (
    <div className="grid gap-5">
      <div
        className="anim-fade-up overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.04] p-5 md:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)]"
        style={{ animationDelay: "900ms" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.24em] text-[#9ec5ff] uppercase">
              {t("dashboard.artist.audience.eyebrow")}
            </p>
            <h3 className="mt-2 font-graphik text-[24px] tracking-[-0.03em] text-white">
              {t("dashboard.artist.audience.title")}
            </h3>
          </div>
          <Users className="h-5 w-5 text-white/40" strokeWidth={1.7} />
        </div>

        <div className="relative mt-6 rounded-[24px] border border-white/8 bg-black/20 p-5">
          <div
            className="absolute right-[-10px] top-[-12px] h-24 w-24 rounded-full bg-[#ff7a2c]/12 blur-2xl"
            style={{ animation: "artistPulse 4s ease-in-out infinite" }}
          />
          <p className="text-[42px] font-graphik leading-none tracking-[-0.04em] text-white">
            18.4K
          </p>
          <p className="mt-2 max-w-[220px] text-[13px] leading-6 text-white/58">
            Người nghe hoạt động hàng tháng (Monthly Listeners)
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full w-[72%] rounded-full bg-[linear-gradient(90deg,#8fb4ff_0%,#dce9ff_100%)]" />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {FAN_TOUCHPOINTS.map((point, index) => (
            <div
              key={`fan-touchpoint-${index}`}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-black/20 px-4 py-3"
            >
              <div>
                <p className="text-[13px] text-white">{point.city}</p>
                <p className="mt-1 text-[11px] text-white/42">{point.tone}</p>
              </div>
              <p className="text-[13px] text-[#ffb488] font-medium">{point.share}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="anim-fade-up rounded-[28px] border border-white/8 bg-[#121316] p-5 md:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)]"
        style={{ animationDelay: "980ms" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.24em] text-[#ffb488] uppercase">
              {t("dashboard.artist.actions.eyebrow")}
            </p>
            <h3 className="mt-2 font-graphik text-[24px] tracking-[-0.03em] text-white">
              {t("dashboard.artist.actions.title")}
            </h3>
          </div>
          <ChevronRight className="h-5 w-5 text-white/40" strokeWidth={1.7} />
        </div>
        <div className="mt-6 space-y-3">
          {[
            {
              icon: Bell,
              title: "Hoàn thiện bản quyền tác giả",
              copy: "Đăng ký ISRC code cho single Midnight Echoes trước ngày phát hành.",
            },
            {
              icon: CircleDollarSign,
              title: "Doanh thu phát sinh tuần này",
              copy: "+$842.50 đã sẵn sàng rút về tài khoản ngân hàng liên kết.",
            },
            {
              icon: Flame,
              title: "Tăng tốc quảng bá Single mới",
              copy: "Gửi bản nghe thử tới 12 Playlist Curators hàng đầu trên hệ thống.",
            },
          ].map((task, index) => {
            const Icon = task.icon;
            return (
              <div key={`studio-action-${index}`} className="rounded-[20px] border border-white/8 bg-black/20 p-4 hover:bg-white/[0.04] transition">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05]">
                    <Icon className="h-[17px] w-[17px] text-white/72" strokeWidth={1.7} />
                  </div>
                  <div>
                    <p className="text-[14px] text-white font-medium">{task.title}</p>
                    <p className="mt-1 text-[12px] leading-5 text-white/52">{task.copy}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ArtistDashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("tracks");
  const [authState, setAuthState] = useState<"checking" | "allowed" | "denied">(
    "checking"
  );
  const [currentUser, setCurrentUser] = useState<UserProfileResponse | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfileResponse | null>(null);
  const [catalogState, setCatalogState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Tracks State & Modals
  const [tracks, setTracks] = useState<ArtistTrack[]>([]);
  const [editingTrack, setEditingTrack] = useState<ArtistTrack | null>(null);
  const [deletingTrack, setDeletingTrack] = useState<ArtistTrack | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const artistAudioRef = useRef<HTMLAudioElement | null>(null);
  const toastCounterRef = useRef(0);

  const addToast = (message: string, type: ToastMessage["type"] = "success") => {
    toastCounterRef.current += 1;
    const newToast: ToastMessage = {
      id: `toast-${toastCounterRef.current}`,
      type,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Actions
  const handleEditTrack = (track: ArtistTrack) => {
    setEditingTrack(track);
  };

  const handleSaveEditedTrack = (updatedTrack: ArtistTrack) => {
    const nextTracks = tracks.map((t) => (t.id === updatedTrack.id ? updatedTrack : t));
    setTracks(nextTracks);
    setEditingTrack(null);
    addToast(
      t("dashboard.artist.trackCatalog.toast.saved", { title: updatedTrack.title }),
      "success"
    );
  };

  const handleDeleteTrack = (track: ArtistTrack) => {
    setDeletingTrack(track);
  };

  const handleConfirmDeleteTrack = (trackId: string) => {
    const target = tracks.find((t) => t.id === trackId);
    const nextTracks = tracks.filter((t) => t.id !== trackId);
    setTracks(nextTracks);
    setDeletingTrack(null);
    if (playingTrackId === trackId) {
      setPlayingTrackId(null);
    }
    addToast(
      t("dashboard.artist.trackCatalog.toast.deleted", {
        title: target?.title || "bài hát",
      }),
      "success"
    );
  };

  const handleUploadSuccess = (newTrack: ArtistTrack) => {
    const nextTracks = [newTrack, ...tracks];
    setTracks(nextTracks);
    addToast(
      t("dashboard.artist.trackCatalog.toast.uploaded", { title: newTrack.title }),
      "success"
    );
  };

  const handleToggleStatus = (track: ArtistTrack) => {
    const nextStatus = track.status === "published" ? "draft" : "published";
    const statusLabel =
      nextStatus === "published"
        ? t("dashboard.artist.trackCatalog.filters.published")
        : t("dashboard.artist.trackCatalog.filters.draft");

    const updatedTrack: ArtistTrack = {
      ...track,
      status: nextStatus,
      updatedAt: "Vừa xong",
    };
    const nextTracks = tracks.map((t) => (t.id === track.id ? updatedTrack : t));
    setTracks(nextTracks);
    addToast(
      t("dashboard.artist.trackCatalog.toast.statusUpdated", {
        title: track.title,
        status: statusLabel,
      }),
      "info"
    );
  };

  const handleToggleVisibility = (track: ArtistTrack) => {
    const nextVis = track.visibility === "public" ? "private" : "public";
    const visLabel =
      nextVis === "public"
        ? t("dashboard.artist.trackCatalog.visibilities.public")
        : t("dashboard.artist.trackCatalog.visibilities.private");

    const updatedTrack: ArtistTrack = {
      ...track,
      visibility: nextVis,
      updatedAt: "Vừa xong",
    };
    const nextTracks = tracks.map((t) => (t.id === track.id ? updatedTrack : t));
    setTracks(nextTracks);
    addToast(
      t("dashboard.artist.trackCatalog.toast.visibilityUpdated", {
        title: track.title,
        visibility: visLabel,
      }),
      "info"
    );
  };

  const handleCopyLink = (track: ArtistTrack) => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/track/${track.id}`;
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          addToast(t("dashboard.artist.trackCatalog.toast.linkCopied"), "success");
        })
        .catch(() => {
          addToast("Đã sao chép liên kết bài hát", "success");
        });
    }
  };

  const handleTogglePlayTrack = (track: ArtistTrack) => {
    if (playingTrackId === track.id) {
      artistAudioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      setPlayingTrackId(track.id);
      if (artistAudioRef.current) {
        artistAudioRef.current.crossOrigin = "anonymous";
        const url = track.audioUrl?.trim() || "https://musiccollector.kandes.io.vn/data/audio/xesi-hoaprox/3b2kCFZhX9GYnQ58qL1cAM_vo-tinh.mp3";
        let streamUrl = url;
        if (url.includes("data/audio/")) {
          streamUrl = `https://musiccollector.kandes.io.vn/${url.slice(url.indexOf("data/audio/"))}`;
        } else if (url.includes("mixkit.co") || !url.startsWith("http")) {
          streamUrl = "https://musiccollector.kandes.io.vn/data/audio/xesi-hoaprox/3b2kCFZhX9GYnQ58qL1cAM_vo-tinh.mp3";
        }
        artistAudioRef.current.src = streamUrl;
        artistAudioRef.current.load();
        artistAudioRef.current.play().catch((err) => {
          console.warn("Artist audio play error:", err);
        });
      }
      addToast(`Đang phát nghe thử: "${track.title}"`, "info");
    }
  };

  const handleShowHistory = () => {
    addToast(`Lịch sử: Đã đồng bộ ${tracks.length} bài hát trong thư viện studio.`, "info");
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const session = getStoredAuthSession();
      await logout(session?.refreshToken);
    } catch (err) {
      console.warn("Logout error (proceeding with local cleanup):", err);
    } finally {
      clearAuthSession();
      setLoggingOut(false);
      router.push(HOME_ROUTE);
    }
  };

  useEffect(() => {
    router.prefetch(HOME_ROUTE);
    router.prefetch(USER_DASHBOARD_ROUTE);
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const guardArtistAccess = async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          if (!cancelled) {
            setAuthState("denied");
            router.replace(HOME_ROUTE);
          }
          return;
        }

        const profile = await getCurrentUser(token);
        const normalizedRole = profile.role.trim().toLowerCase();

        if (cancelled) {
          return;
        }

        if (normalizedRole !== "artist") {
          setAuthState("denied");
          router.replace(USER_DASHBOARD_ROUTE);
          return;
        }

        setCurrentUser(profile);
        setAuthState("allowed");
        setCatalogState("loading");
        setCatalogError(null);

        try {
          const catalog = await getCurrentArtistCatalog(token);
          if (cancelled) {
            return;
          }
          setArtistProfile(catalog.artist);
          setTracks(catalog.tracks.map(mapCatalogTrack));
          setCatalogState("ready");
        } catch (catalogErr) {
          if (cancelled) {
            return;
          }
          setTracks([]);
          setCatalogState("error");
          setCatalogError(
            catalogErr instanceof Error
              ? catalogErr.message
              : "Không thể tải dữ liệu bài hát từ máy chủ"
          );
        }
      } catch {
        clearAuthSession();
        if (!cancelled) {
          setAuthState("denied");
          router.replace(HOME_ROUTE);
        }
      }
    };

    void guardArtistAccess();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Dynamic calculated stats from tracks
  const statsList: Stat[] = useMemo(() => {
    const totalPlays = tracks.reduce((sum, tr) => sum + tr.plays, 0);
    const totalLikes = tracks.reduce((sum, tr) => sum + tr.likes, 0);
    const totalComments = tracks.reduce((sum, tr) => sum + tr.commentsCount, 0);

    const formatNum = (num: number) => {
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return num.toString();
    };
    const downloadedTracks = tracks.filter((tr) => tr.downloadStatus === "completed").length;

    return [
      { key: "plays", value: formatNum(totalPlays), trend: "Thời gian thực", icon: Activity },
      { key: "reposts", value: "0", trend: "Chưa có", icon: Radio },
      { key: "downloads", value: formatNum(downloadedTracks), trend: "Trực tuyến", icon: Download },
      { key: "likes", value: formatNum(totalLikes), trend: "Chưa có", icon: Heart },
      { key: "comments", value: totalComments.toString(), trend: "Chưa có", icon: MessageSquare },
    ];
  }, [tracks]);

  const artistDisplayName =
    artistProfile?.name ||
    currentUser?.fullName ||
    currentUser?.username ||
    t("common.artistFallback");
  const artistImageUrl = artistProfile?.imageUrl || currentUser?.avatarUrl;

  const renderActivePanel = () => {
    switch (activeTab) {
      case "comments":
        return <CommentsPanel />;
      case "benefits":
        return <BenefitsPanel />;
      case "tracks":
      default:
        return (
          <TracksPanel
            tracks={tracks}
            onEditTrack={handleEditTrack}
            onDeleteTrack={handleDeleteTrack}
            onToggleStatus={handleToggleStatus}
            onToggleVisibility={handleToggleVisibility}
            onCopyLink={handleCopyLink}
            playingTrackId={playingTrackId}
            onTogglePlayTrack={handleTogglePlayTrack}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onShowHistory={handleShowHistory}
          />
        );
    }
  };

  if (authState !== "allowed") {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#08090d] px-6 text-[#f4f2ed]">
        <div className="w-full max-w-[460px] rounded-[28px] border border-white/8 bg-white/[0.04] p-7 text-center shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] p-2 shadow-[0_0_24px_rgba(122,92,255,0.35)]">
            <LogoMark variant="icon" className="h-full w-full object-contain" />
          </div>
          <p className="text-[11px] tracking-[0.28em] text-[#ffb488] uppercase">
            {t("dashboard.artist.access.eyebrow")}
          </p>
          <h1 className="mt-3 font-graphik text-[30px] tracking-[-0.04em] text-white">
            {authState === "checking"
              ? t("dashboard.artist.access.checkingTitle")
              : t("dashboard.artist.access.deniedTitle")}
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-white/58">
            {authState === "checking"
              ? t("dashboard.artist.access.checkingCopy")
              : t("dashboard.artist.access.deniedCopy")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#08090d] text-[#f4f2ed]">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <audio ref={artistAudioRef} onEnded={() => setPlayingTrackId(null)} className="hidden" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,122,44,0.12),_transparent_28%),radial-gradient(circle_at_80%_22%,_rgba(143,180,255,0.1),_transparent_20%),linear-gradient(180deg,#0a0b10_0%,#08090d_100%)]" />
        <div
          className="absolute right-[6%] top-28 h-40 w-40 rounded-full bg-[#ff7a2c]/10 blur-3xl"
          style={{ animation: "artistFloat 8s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-20 left-[8%] h-56 w-56 rounded-full bg-[#8fb4ff]/8 blur-3xl"
          style={{ animation: "artistFloat 10s ease-in-out 600ms infinite" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-10">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="anim-fade-up flex items-center gap-3.5">
            <Link
              href={HOME_ROUTE}
              className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] p-2 backdrop-blur-md transition hover:scale-105 hover:border-[#7A5CFF]/60 hover:shadow-[0_0_20px_rgba(122,92,255,0.35)]"
              title="Về trang chủ Moodify"
            >
              <LogoMark variant="icon" className="h-full w-full object-contain" />
            </Link>
            <div>
              <p className="text-[11px] tracking-[0.28em] text-white/44 uppercase">{t("dashboard.artist.header.eyebrow")}</p>
              <h1 className="mt-1 font-graphik text-[32px] tracking-[-0.04em] text-white sm:text-[38px]">
                {t("dashboard.artist.header.title")}
              </h1>
            </div>
          </div>

          <div className="anim-slide-right flex flex-1 flex-col gap-3 lg:ml-auto lg:max-w-[620px] lg:flex-row" style={{ animationDelay: "120ms" }}>
            <label className="flex min-h-[54px] flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 backdrop-blur-md transition focus-within:border-white/20 focus-within:bg-white/[0.06]">
              <Search className="h-4 w-4 text-white/44" strokeWidth={1.7} />
              <input
                aria-label={t("dashboard.artist.header.searchLabel")}
                placeholder={t("dashboard.artist.header.searchPlaceholder")}
                className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/36"
              />
            </label>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-md">
              <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#ff8b4d,#ffd1b5)] text-black font-semibold">
                {artistImageUrl && (
                  <img
                    src={artistImageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                {(() => {
                  if (artistImageUrl) return null;
                  const source = artistDisplayName.trim();
                  const parts = source.split(/\s+/).filter(Boolean);
                  if (parts.length === 0) return "AR";
                  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                  return `${parts[0][0] ?? "A"}${parts[parts.length - 1][0] ?? "R"}`.toUpperCase();
                })()}
              </div>
              <div>
                <p className="text-[13px] text-white font-medium">
                  {artistDisplayName}
                </p>
                <p className="mt-0.5 text-[11px] tracking-[0.16em] text-white/42 uppercase">
                  {t("dashboard.artist.header.studio")}
                </p>
              </div>
            </div>
            <LanguageSwitcher />
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-red-300 backdrop-blur-md transition hover:bg-red-500/10 hover:border-red-500/20 disabled:opacity-50"
              title={t("common.logout")}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.7} />
              <span className="hidden sm:inline">{loggingOut ? t("common.loggingOut") : t("common.logout")}</span>
            </button>
          </div>
        </header>

        {/* Upload quota & upgrade banner */}
        <div
          className="anim-fade-up mt-6 flex flex-col gap-4 rounded-[28px] border border-white/8 bg-white/[0.04] px-5 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] md:flex-row md:items-center md:justify-between"
          style={{ animationDelay: "180ms" }}
        >
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-white/[0.05]">
              <UploadCloud className="h-6 w-6 text-[#ffb488]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-[15px] text-white font-medium">
                Dung lượng phòng thu: <strong className="text-[#ffb488]">{tracks.length * 15} MB</strong> / 2.0 GB ({tracks.length} bài hát)
              </p>
              <div className="mt-2 h-2 w-[240px] max-w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#ff7a2c_0%,#ffb488_60%,#dce9ff_100%)] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(12, (tracks.length / 20) * 100))}%` }}
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-[13px] text-white hover:bg-white/[0.08] hover:border-white/20 transition"
          >
            + Tải lên bài hát mới
          </button>
        </div>

        {/* Main Studio Hub */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_340px]">
          <div className="grid gap-6">
            <div
              className="anim-fade-up overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(135deg,rgba(18,19,22,0.96)_0%,rgba(12,13,18,0.9)_58%,rgba(13,17,28,0.94)_100%)] px-5 py-6 shadow-[0_30px_90px_rgba(0,0,0,0.28)] md:px-7 md:py-7"
              style={{ animationDelay: "260ms" }}
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
                <div>
                  <p className="text-[11px] tracking-[0.28em] text-[#ffb488] uppercase">{t("dashboard.artist.studio.eyebrow")}</p>
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <h2 className="font-graphik text-[38px] leading-none tracking-[-0.05em] text-white sm:text-[48px]">
                      {artistDisplayName}
                    </h2>
                    <p className="pb-1 text-[14px] text-white/52">Studio Verified</p>
                  </div>
                  <p className="mt-4 max-w-[640px] text-[15px] leading-7 text-white/60">
                    Chào mừng bạn quay lại phòng thu âm thanh kỹ thuật số. Quản lý các bản phát hành, theo dõi tương tác của người hâm mộ và tối ưu hóa từng bài nhạc của bạn.
                  </p>
                </div>

                <div className="relative mx-auto flex h-[190px] w-[190px] items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full border border-white/8"
                    style={{ animation: "artistPulse 5s ease-in-out infinite" }}
                  />
                  <div
                    className="absolute inset-[16px] rounded-full border border-[#ff7a2c]/30"
                    style={{ animation: "artistPulse 5s ease-in-out 400ms infinite" }}
                  />
                  <div
                    className="absolute inset-[34px] rounded-full bg-[radial-gradient(circle,_rgba(255,122,44,0.24),_rgba(255,122,44,0.04)_60%,_transparent_70%)] blur-sm"
                    style={{ animation: "artistFloat 7s ease-in-out infinite" }}
                  />
                  <div className="relative grid h-[88px] w-[88px] place-items-center rounded-full border border-white/10 bg-white/[0.06] shadow-[0_24px_50px_rgba(0,0,0,0.28)]">
                    <Music2 className="h-10 w-10 text-white" strokeWidth={1.6} />
                  </div>
                </div>
              </div>

              {/* Dynamic Stats Grid */}
              <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {statsList.map((item, index) => (
                  <StatCard key={item.key} item={item} delay={340 + index * 70} />
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                {[
                  { icon: BarChart3, label: t("dashboard.artist.studio.insight"), copy: "Top 5% nghệ sĩ thịnh hành" },
                  { icon: CircleDollarSign, label: t("dashboard.artist.studio.earnings"), copy: "$1,420.80 tháng này" },
                  { icon: Users, label: t("dashboard.artist.studio.fans"), copy: "+420 fans theo dõi mới" },
                  { icon: Sparkles, label: t("dashboard.artist.studio.benefits"), copy: "Đặc quyền phân phối cấp 2" },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="anim-fade-up flex items-center gap-4 rounded-[22px] border border-white/8 bg-black/20 p-4 hover:bg-white/[0.04] transition"
                      style={{ animationDelay: `${620 + index * 80}ms` }}
                    >
                      <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-white/[0.04]">
                        <Icon className="h-5 w-5 text-[#ffb488]" strokeWidth={1.7} />
                      </div>
                      <div>
                        <p className="text-[14px] text-white font-medium">{item.label}</p>
                        <p className="mt-1 text-[12px] text-white/44">{item.copy}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabs Section */}
            <div
              className="anim-fade-up rounded-[30px] border border-white/8 bg-white/[0.03] px-5 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)] md:px-6"
              style={{ animationDelay: "520ms" }}
            >
              <div className="flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-white/8">
                {TAB_LABELS.map((tab) => (
                  <TabButton
                    key={tab.key}
                    active={tab.key === activeTab}
                    label={t(tab.labelKey)}
                    onClick={() => setActiveTab(tab.key)}
                  />
                ))}
              </div>
              {catalogState === "loading" && (
                <div className="mt-5 rounded-[22px] border border-white/8 bg-black/20 px-5 py-4 text-[13px] text-white/58">
                  Đang tải danh sách bài hát...
                </div>
              )}
              {catalogState === "error" && (
                <div className="mt-5 rounded-[22px] border border-red-400/20 bg-red-500/10 px-5 py-4 text-[13px] text-red-100">
                  Không thể tải catalog nghệ sĩ: {catalogError}
                </div>
              )}
              <div className="mt-5">{renderActivePanel()}</div>
            </div>
          </div>

          <RightRail />
        </div>

        {/* Footer Notes */}
        <div className="anim-fade-up mt-6 grid gap-5 lg:grid-cols-3" style={{ animationDelay: "1080ms" }}>
          <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
            <p className="text-[11px] tracking-[0.24em] text-[#ffb488] uppercase">{t("dashboard.artist.notes.trackEnergy")}</p>
            <h3 className="mt-2 font-graphik text-[24px] tracking-[-0.03em] text-white">Năng lượng âm thanh</h3>
            <p className="mt-3 text-[14px] leading-6 text-white/58">
              Chỉ số dynamic range và loudness trung bình đạt chuẩn LUFS -14 phù hợp cho các nền tảng streaming quốc tế.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
            <p className="text-[11px] tracking-[0.24em] text-[#9ec5ff] uppercase">{t("dashboard.artist.notes.arRadar")}</p>
            <h3 className="mt-2 font-graphik text-[24px] tracking-[-0.03em] text-white">A&R Radar & Hợp tác</h3>
            <p className="mt-3 text-[14px] leading-6 text-white/58">
              3 hãng thu âm Indie đang theo dõi hồ sơ của bạn với 4 bài hát EDM demo được quan tâm nhất.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
            <p className="text-[11px] tracking-[0.24em] text-[#ffb488] uppercase">{t("dashboard.artist.notes.brandNote")}</p>
            <h3 className="mt-2 font-graphik text-[24px] tracking-[-0.03em] text-white">Bảo hộ thương hiệu</h3>
            <p className="mt-3 text-[14px] leading-6 text-white/58">
              Toàn bộ bài hát tải lên Moodify được đăng ký mã fingerprint nhận diện tác quyền tự động.
            </p>
          </div>
        </div>
      </div>

      {/* Modals & Toasts */}
      <TrackEditModal
        isOpen={Boolean(editingTrack)}
        track={editingTrack}
        onClose={() => setEditingTrack(null)}
        onSave={handleSaveEditedTrack}
      />

      <TrackDeleteModal
        isOpen={Boolean(deletingTrack)}
        track={deletingTrack}
        onClose={() => setDeletingTrack(null)}
        onConfirm={handleConfirmDeleteTrack}
      />

      <TrackUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}
