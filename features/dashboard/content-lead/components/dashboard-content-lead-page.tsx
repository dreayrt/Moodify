"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  LogOut,
  Pause,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
  Square,
  FastForward,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LogoMark } from "@/components/shared/logo-mark";
import {
  clearAuthSession,
  deleteArtistTrack,
  getCurrentArtistCatalog,
  getCurrentUser,
  getValidAccessToken,
  logoutAndRedirect,
  recordListeningSessionTelemetry,
  updateArtistTrack,
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
const KEYFRAMES = `
@keyframes artistDiscSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;



const HOME_ROUTE = "/";
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

function resolveMediaUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) return undefined;
  if (
    rawUrl.startsWith("http://") ||
    rawUrl.startsWith("https://") ||
    rawUrl.startsWith("blob:") ||
    rawUrl.startsWith("data:")
  ) {
    if (rawUrl.includes("musiccollector.kandes.io.vn")) {
      const audioServerUrl = (process.env.NEXT_PUBLIC_AUDIO_SERVER_URL || "https://moodify.click").replace(/\/$/, "");
      return rawUrl.replace("https://musiccollector.kandes.io.vn", audioServerUrl);
    }
    return rawUrl;
  }

  if (rawUrl.startsWith("data/audio/") || rawUrl.startsWith("/data/audio/")) {
    const audioServerUrl = (process.env.NEXT_PUBLIC_AUDIO_SERVER_URL || "https://moodify.click").replace(/\/$/, "");
    return `${audioServerUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
  }

  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8088").replace(/\/$/, "");
  return `${baseUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
}

function parseDurationLabel(value: string | undefined) {
  if (!value) return 0;
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function formatPlaybackTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function mapCatalogTrack(track: ArtistTrackResponse): ArtistTrack {
  return {
    id: track.id,
    spotifyId: track.spotifyId,
    title: track.title,
    artist: track.artist,
    genre: track.genre,
    albumName: track.albumName ?? undefined,
    featuredArtists: track.featuredArtists ?? undefined,
    duration: track.duration,
    status: track.status,
    visibility: track.visibility,
    plays: track.plays,
    likes: track.likes,
    commentsCount: track.commentsCount,
    coverUrl: resolveMediaUrl(track.coverUrl) ?? undefined,
    coverGradient: "linear-gradient(135deg, #ff7a2c, #7a5cff)",
    audioUrl: resolveMediaUrl(track.audioUrl) ?? undefined,
    spotifyUrl: track.spotifyUrl ?? undefined,
    downloadStatus: track.downloadStatus ?? undefined,
    moderationStatus: track.moderationStatus ?? undefined,
    moderationScore: track.moderationScore ?? undefined,
    description: track.description ?? undefined,
    explicit: track.explicit,
    updatedAt: formatCatalogDate(track.updatedAt),
    createdAt: track.createdAt ?? "",
  };
}

function PreviewPlayer({
  track,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onStop,
  onSeekBy,
  onPreviousTrack,
  onNextTrack,
}: {
  track: ArtistTrack;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSeekBy: (seconds: number) => void;
  onPreviousTrack: () => void;
  onNextTrack: () => void;
}) {
  const coverUrl = resolveMediaUrl(track.coverUrl);
  const fallbackDuration = parseDurationLabel(track.duration);
  const resolvedDuration = duration || fallbackDuration;
  const progress =
    resolvedDuration > 0 ? Math.min(100, Math.max(0, (currentTime / resolvedDuration) * 100)) : 0;

  return (
    <div className="fixed bottom-5 left-1/2 z-40 w-[calc(100%-32px)] max-w-[620px] -translate-x-1/2 rounded-[28px] border border-white/12 bg-[#14151b]/94 p-3 text-white shadow-[0_28px_90px_rgba(0,0,0,0.58)] backdrop-blur-2xl sm:bottom-6 sm:p-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-[linear-gradient(135deg,#ff7a2c,#7a5cff)] shadow-[0_12px_35px_rgba(0,0,0,0.32)]"
          style={{
            animation: isPlaying ? "artistDiscSpin 4s linear infinite" : undefined,
            background: track.coverGradient || "linear-gradient(135deg,#ff7a2c,#7a5cff)",
          }}
        >
          {coverUrl && (
            <img
              src={coverUrl}
              alt=""
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-[24px] rounded-full border border-white/25 bg-black/70" />
          <span className="relative text-[10px] font-bold text-white">
            {track.title.slice(0, 2).toUpperCase()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-white">{track.title}</p>
              <p className="mt-0.5 truncate text-[12px] text-white/50">
                {track.artist} • {track.genre}
              </p>
            </div>
            <button
              type="button"
              onClick={onStop}
              aria-label="Dừng nghe thử"
              title="Dừng nghe thử"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/58 transition hover:bg-white/[0.1] hover:text-white"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-white/44">
            <span className="w-9 tabular-nums">{formatPlaybackTime(currentTime)}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#ff7a2c_0%,#ffb488_68%,#dce9ff_100%)] transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="w-9 text-right tabular-nums">
              {formatPlaybackTime(resolvedDuration)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onPreviousTrack}
              aria-label="Bài trước"
              title="Bài trước"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
            >
              <SkipBack className="h-4 w-4 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => onSeekBy(-5)}
              aria-label="Lùi 5 giây"
              title="Lùi 5 giây"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
            >
              <Rewind className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onPlayPause}
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
              title={isPlaying ? "Tạm dừng" : "Phát"}
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.18)] transition hover:scale-105 active:scale-95"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onSeekBy(5)}
              aria-label="Tới 5 giây"
              title="Tới 5 giây"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
            >
              <FastForward className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNextTrack}
              aria-label="Bài tiếp theo"
              title="Bài tiếp theo"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
            >
              <SkipForward className="h-4 w-4 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



function StudioFooter() {
  return (
    <footer className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[22px] border border-white/6 bg-white/[0.02] px-5 py-4 text-[12px] text-white/40 sm:flex-row">
      <div className="flex flex-wrap items-center gap-2.5">
        <LogoMark className="h-5 w-5" />
        <span className="font-medium text-white/70">Moodify Content Lead Studio</span>
      </div>
      <p className="text-[11px] text-white/35">
        © 2026 Moodify Platform. Mọi quyền được bảo lưu.
      </p>
    </footer>
  );
}

export default function ContentLeadDashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
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
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [savingTrackId, setSavingTrackId] = useState<string | null>(null);
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);
  const toastCounterRef = useRef(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  // Listening telemetry for studio preview playback. Without a session the
  // backend never creates listening_history rows, so preview listens were invisible.
  const previewSessionRef = useRef<{
    sessionKey: string;
    trackId: string;
    accumulatedMs: number;
    lastPlayTimestamp: number | null;
    historyId: number | null;
  } | null>(null);

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

  const reportPreviewSession = (
    session: NonNullable<typeof previewSessionRef.current>,
    eventType: string,
    positionMs: number
  ) => {
    void recordListeningSessionTelemetry({
      sessionKey: session.sessionKey,
      historyId: session.historyId ?? undefined,
      trackId: session.trackId,
      durationMs: Math.max(0, session.accumulatedMs),
      positionMs: Math.max(0, positionMs),
      eventType,
      deviceType: "WEB",
      source: "OTHER",
    }).then((res) => {
      if (res?.success && res.historyId && previewSessionRef.current === session) {
        previewSessionRef.current.historyId = res.historyId;
      }
    });
  };

  const flushPreviewSession = (eventType: string) => {
    const session = previewSessionRef.current;
    if (!session) return;
    if (session.lastPlayTimestamp) {
      session.accumulatedMs += Math.max(0, Date.now() - session.lastPlayTimestamp);
      session.lastPlayTimestamp = null;
    }
    previewSessionRef.current = null;
    const posMs = audioPlayerRef.current ? Math.round(audioPlayerRef.current.currentTime * 1000) : session.accumulatedMs;
    reportPreviewSession(session, eventType, posMs);
  };

  const startPreviewTrack = (track: ArtistTrack, resetPosition = true) => {
    const audio = audioPlayerRef.current;
    const resolvedUrl = resolveMediaUrl(track.audioUrl);

    setPreviewTrackId(track.id);
    setPlayingTrackId(track.id);

    if (!audio || !resolvedUrl) {
      setIsPreviewPlaying(false);
      addToast("Bài hát này chưa có file audio để nghe thử", "warning");
      return;
    }

    // Continuing the same track via the play/pause toggle resumes the same telemetry
    // session; every other start (new track, replay, seek-to-start) is a new session.
    const resuming =
      previewSessionRef.current?.trackId === track.id &&
      audio.src === resolvedUrl &&
      !resetPosition &&
      !audio.ended &&
      (previewSessionRef.current?.accumulatedMs ?? 0) > 0;
    if (!resuming) {
      flushPreviewSession("TRACK_CHANGED");
      previewSessionRef.current = {
        sessionKey: crypto.randomUUID(),
        trackId: track.id,
        accumulatedMs: 0,
        lastPlayTimestamp: null,
        historyId: null,
      };
    }

    if (audio.src !== resolvedUrl) {
      audio.src = resolvedUrl;
      if (resetPosition) {
        audio.currentTime = 0;
      }
    } else if (resetPosition && audio.ended) {
      audio.currentTime = 0;
    }

    void audio.play().then(() => {
      setIsPreviewPlaying(true);
      const session = previewSessionRef.current;
      if (!session) return;
      session.lastPlayTimestamp = Date.now();
      reportPreviewSession(session, session.accumulatedMs > 0 ? "RESUME" : "PLAY", Math.round(audio.currentTime * 1000));
    }).catch((err) => {
      console.warn("Audio preview playback failed:", err);
      setIsPreviewPlaying(false);
      addToast("Không thể phát nghe thử bài hát này", "error");
    });
  };

  const pausePreviewTrack = () => {
    audioPlayerRef.current?.pause();
    setPlayingTrackId(null);
    setIsPreviewPlaying(false);
  };

  const stopPreviewTrack = () => {
    flushPreviewSession("PLAYBACK_STOPPED");
    const audio = audioPlayerRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPreviewTrackId(null);
    setPlayingTrackId(null);
    setPreviewCurrentTime(0);
    setPreviewDuration(0);
    setIsPreviewPlaying(false);
  };

  // Heartbeat mirrors the main player: the backend only accumulates continuous
  // listening time from progress events at most 15 seconds apart.
  useEffect(() => {
    const heartbeat = window.setInterval(() => {
      const session = previewSessionRef.current;
      const audio = audioPlayerRef.current;
      if (!session || !audio || audio.paused || audio.seeking || audio.readyState < 2) return;
      reportPreviewSession(session, "HEARTBEAT", Math.round(audio.currentTime * 1000));
    }, 5000);
    return () => window.clearInterval(heartbeat);
  }, []);

  const seekPreviewBy = (seconds: number) => {
    const audio = audioPlayerRef.current;
    if (!audio) return;
    const fallbackDuration = parseDurationLabel(
      tracks.find((track) => track.id === previewTrackId)?.duration
    );
    const maxTime = Number.isFinite(audio.duration) ? audio.duration : fallbackDuration;
    const nextTime = Math.min(Math.max(audio.currentTime + seconds, 0), maxTime || Number.MAX_SAFE_INTEGER);
    audio.currentTime = nextTime;
    setPreviewCurrentTime(nextTime);
  };

  const playAdjacentPreviewTrack = (direction: -1 | 1) => {
    if (tracks.length === 0) return;
    const currentIndex = tracks.findIndex((track) => track.id === previewTrackId);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + direction + tracks.length) % tracks.length;
    startPreviewTrack(tracks[nextIndex]);
  };

  const togglePreviewPlayback = () => {
    const previewTrack = tracks.find((track) => track.id === previewTrackId);
    if (!previewTrack) return;

    if (isPreviewPlaying) {
      pausePreviewTrack();
      return;
    }

    startPreviewTrack(previewTrack, false);
  };

  // Actions
  const handleEditTrack = (track: ArtistTrack) => {
    setEditingTrack(track);
  };

  const persistTrackUpdate = async (updatedTrack: ArtistTrack) => {
    setSavingTrackId(updatedTrack.id);
    try {
      const savedTrack = await updateArtistTrack(updatedTrack.id, {
        title: updatedTrack.title,
        genre: updatedTrack.genre,
        featuredArtists: updatedTrack.featuredArtists,
        albumName: updatedTrack.albumName,
        status: updatedTrack.status,
        visibility: updatedTrack.visibility,
        explicit: updatedTrack.explicit,
        lyricsPlain: updatedTrack.lyricsPlain,
        description: updatedTrack.description,
      });
      const mappedTrack = mapCatalogTrack(savedTrack);
      setTracks((currentTracks) =>
        currentTracks.map((track) => (track.id === mappedTrack.id ? mappedTrack : track))
      );
      return mappedTrack;
    } finally {
      setSavingTrackId(null);
    }
  };

  const handleSaveEditedTrack = async (updatedTrack: ArtistTrack) => {
    try {
      const savedTrack = await persistTrackUpdate(updatedTrack);
      setEditingTrack(null);
      addToast(
        t("dashboard.artist.trackCatalog.toast.saved", { title: savedTrack.title }),
        "success"
      );
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Không thể lưu thay đổi bài hát xuống database",
        "error"
      );
    }
  };

  const handleDeleteTrack = (track: ArtistTrack) => {
    setDeletingTrack(track);
  };

  const handleConfirmDeleteTrack = async (trackId: string) => {
    const target = tracks.find((t) => t.id === trackId);
    setDeletingTrackId(trackId);
    try {
      await deleteArtistTrack(trackId);
      setTracks((currentTracks) => currentTracks.filter((t) => t.id !== trackId));
      setDeletingTrack(null);
      if (playingTrackId === trackId || previewTrackId === trackId) {
        stopPreviewTrack();
      }
      addToast(
        t("dashboard.artist.trackCatalog.toast.deleted", {
          title: target?.title || "bài hát",
        }),
        "success"
      );
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Không thể xóa bài hát khỏi database",
        "error"
      );
    } finally {
      setDeletingTrackId(null);
    }
  };

  const handleUploadSuccess = (newTrack: ArtistTrack) => {
    const nextTracks = [newTrack, ...tracks];
    setTracks(nextTracks);
    addToast(
      t("dashboard.artist.trackCatalog.toast.uploaded", { title: newTrack.title }),
      "success"
    );
  };

  const handleToggleStatus = async (track: ArtistTrack) => {
    if (savingTrackId === track.id) return;
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
    try {
      const savedTrack = await persistTrackUpdate(updatedTrack);
      addToast(
        t("dashboard.artist.trackCatalog.toast.statusUpdated", {
          title: savedTrack.title,
          status: statusLabel,
        }),
        "info"
      );
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Không thể cập nhật trạng thái bài hát",
        "error"
      );
    }
  };

  const handleToggleVisibility = async (track: ArtistTrack) => {
    if (savingTrackId === track.id) return;
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
    try {
      const savedTrack = await persistTrackUpdate(updatedTrack);
      addToast(
        t("dashboard.artist.trackCatalog.toast.visibilityUpdated", {
          title: savedTrack.title,
          visibility: visLabel,
        }),
        "info"
      );
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Không thể cập nhật quyền hiển thị bài hát",
        "error"
      );
    }
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
    if (previewTrackId === track.id && isPreviewPlaying) {
      pausePreviewTrack();
      return;
    }

    startPreviewTrack(track, previewTrackId !== track.id);
  };

  const handleLogout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    logoutAndRedirect();
  };

  useEffect(() => {
    let cancelled = false;

    const guardArtistAccess = async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          if (!cancelled) {
            // Wipe any stale cookie hint so the middleware cannot bounce the
            // user straight back to this role dashboard (logout flicker loop).
            clearAuthSession();
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

        if (normalizedRole !== "content_lead" && normalizedRole !== "artist") {
          setAuthState("denied");
          if (normalizedRole === "moderator") {
            router.replace("/dashboard/moderator");
          } else if (normalizedRole === "admin") {
            router.replace("/dashboard/admin");
          } else {
            router.replace(USER_DASHBOARD_ROUTE);
          }
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


  const artistDisplayName =
    artistProfile?.name ||
    currentUser?.fullName ||
    currentUser?.username ||
    t("common.artistFallback");
  const artistImageUrl = artistProfile?.imageUrl || currentUser?.avatarUrl;
  const previewTrack = tracks.find((track) => track.id === previewTrackId) ?? null;



  if (authState !== "allowed") {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#08090d] px-6 text-[#f4f2ed]">
        <div className="w-full max-w-[460px] rounded-[28px] border border-white/8 bg-white/[0.04] p-7 text-center shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] p-2.5 shadow-[0_0_24px_rgba(122,92,255,0.35)]">
            <LogoMark variant="gradient" className="h-full w-full" />
          </div>
          <div className="mb-3 flex items-center justify-center">
            <span className="font-graphik text-[20px] font-bold tracking-tight text-white">Moodify</span>
          </div>
          <p className="text-[11px] font-semibold tracking-[0.06em] text-[#ffb488] uppercase">
            {t("dashboard.artist.hero.badge")}
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
    <section className="min-h-screen bg-[#08090d] bg-[radial-gradient(ellipse_at_top,rgba(255,122,44,0.10),transparent_42%)] text-[#f4f2ed]">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div className="mx-auto w-full max-w-[1280px] px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-white/[0.06] pb-4 lg:flex-row lg:items-center">
          <div className="anim-fade-up flex flex-wrap items-center gap-4 sm:gap-5">
            <Link
              href={HOME_ROUTE}
              className="group flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02]"
              title="Về trang chủ Moodify"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/[0.06] p-1.5 shadow-[0_0_15px_rgba(122,92,255,0.25)] backdrop-blur-md transition-all duration-300 group-hover:border-[#7A5CFF]/60 group-hover:shadow-[0_0_22px_rgba(122,92,255,0.4)]">
                <LogoMark variant="gradient" className="h-full w-full" />
              </div>
              <span className="font-graphik text-[22px] font-bold tracking-tight text-white transition-colors group-hover:text-white/90">
                Moodify
              </span>
            </Link>

            <div className="hidden h-7 w-[1px] bg-white/10 md:block" />

            <div>
              <h1 className="font-graphik text-[20px] font-bold tracking-[-0.03em] text-white sm:text-[24px]">
                {t("dashboard.artist.header.title")}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:ml-auto">
            <div className="flex min-w-0 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
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
              <div className="min-w-0">
                <p className="max-w-[13rem] truncate text-[13px] font-medium text-white">
                  {artistDisplayName}
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

        <main className="mt-6 min-w-0 sm:mt-8">
          <TrackCatalogPanel
            tracks={tracks}
            loading={catalogState === "idle" || catalogState === "loading"}
            error={catalogError}
            onEditTrack={handleEditTrack}
            onDeleteTrack={handleDeleteTrack}
            onToggleStatus={handleToggleStatus}
            onToggleVisibility={handleToggleVisibility}
            onCopyLink={handleCopyLink}
            playingTrackId={playingTrackId}
            onTogglePlayTrack={handleTogglePlayTrack}
            onOpenUpload={() => setIsUploadModalOpen(true)}
          />
        </main>

        <StudioFooter />
      </div>

      {/* Modals & Toasts */}
      <TrackEditModal
        isOpen={Boolean(editingTrack)}
        track={editingTrack}
        onClose={() => setEditingTrack(null)}
        onSave={handleSaveEditedTrack}
        isSaving={savingTrackId === editingTrack?.id}
      />

      <TrackDeleteModal
        isOpen={Boolean(deletingTrack)}
        track={deletingTrack}
        onClose={() => setDeletingTrack(null)}
        onConfirm={handleConfirmDeleteTrack}
        isDeleting={deletingTrackId === deletingTrack?.id}
      />

      <TrackUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <ToastNotification toasts={toasts} onDismiss={dismissToast} />

      {previewTrack && (
        <PreviewPlayer
          track={previewTrack}
          isPlaying={isPreviewPlaying}
          currentTime={previewCurrentTime}
          duration={previewDuration}
          onPlayPause={togglePreviewPlayback}
          onStop={stopPreviewTrack}
          onSeekBy={seekPreviewBy}
          onPreviousTrack={() => playAdjacentPreviewTrack(-1)}
          onNextTrack={() => playAdjacentPreviewTrack(1)}
        />
      )}

      {/* Hidden Audio Player for Studio Preview */}
      <audio
        ref={audioPlayerRef}
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          setPreviewDuration(Number.isFinite(nextDuration) ? nextDuration : 0);
        }}
        onTimeUpdate={(event) => {
          setPreviewCurrentTime(event.currentTarget.currentTime);
        }}
        onPlay={() => setIsPreviewPlaying(true)}
        onPause={() => {
          // Fires for every pause path (button, toggle, stop) — settle the
          // telemetry bookkeeping exactly once per pause.
          const audio = audioPlayerRef.current;
          const session = previewSessionRef.current;
          if (audio && session && session.lastPlayTimestamp) {
            session.accumulatedMs += Math.max(0, Date.now() - session.lastPlayTimestamp);
            session.lastPlayTimestamp = null;
            reportPreviewSession(session, "PAUSE", Math.round(audio.currentTime * 1000));
          }
          setIsPreviewPlaying(false);
        }}
        onEnded={() => {
          flushPreviewSession("COMPLETE");
          setPlayingTrackId(null);
          setIsPreviewPlaying(false);
          setPreviewCurrentTime(audioPlayerRef.current?.duration || 0);
        }}
        onError={() => {
          flushPreviewSession("PLAYBACK_STOPPED");
          setPlayingTrackId(null);
          setIsPreviewPlaying(false);
        }}
        className="hidden"
      />
    </section>
  );
}
