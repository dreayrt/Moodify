"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  DoorOpen,
  Headphones,
  LockKeyhole,
  MicOff,
  Mic2,
  Music2,
  Pause,
  Play,
  Plus,
  SkipForward,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { usePlayer } from "@/components/dashboard/player-context";
import {
  addKaraokeRoomQueueItem,
  closeKaraokeRoom,
  controlKaraokePlayback,
  fetchKaraokeRoom,
  joinKaraokeRoom,
  leaveKaraokeRoom,
  KaraokeRoomApiError,
  removeKaraokeRoomQueueItem,
  type KaraokeRoomDetail,
  type KaraokeRoomQueueItem,
  type KaraokeTrackSummary,
} from "@/lib/api-client";
import KaraokeTrackCatalog from "./karaoke-track-catalog";
import { useKaraokeRoomLive } from "../hooks/use-karaoke-room-live";
import { useMediasoupRoom } from "../hooks/use-mediasoup-room";
import { useKaraokeRoomScoring } from "../hooks/use-karaoke-room-scoring";
import styles from "./karaoke-room-page.module.css";

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toLocaleUpperCase("vi-VN") || "?"
  );
}

function durationLabel(durationMs: number | null): string {
  if (!durationMs || durationMs < 0) return "--:--";
  return `${Math.floor(durationMs / 60000)}:${String(Math.floor(durationMs / 1000) % 60).padStart(2, "0")}`;
}

function parseLyricCues(raw: string | null | undefined): { startMs: number; text: string }[] {
  if (!raw) return [];
  const cues: { startMs: number; text: string }[] = [];
  const pattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  for (const rawLine of raw.split(/\r?\n/)) {
    const stamps = Array.from(rawLine.matchAll(pattern));
    const text = rawLine.replace(pattern, "").trim();
    if (!text) continue;
    for (const stamp of stamps) {
      const minutes = Number(stamp[1]);
      const seconds = Number(stamp[2]);
      if (seconds > 59) continue;
      const fraction = Number((stamp[3] ?? "").padEnd(3, "0").slice(0, 3) || "0");
      cues.push({ startMs: minutes * 60_000 + seconds * 1000 + fraction, text });
    }
  }
  return cues.sort((left, right) => left.startMs - right.startMs);
}

function clockLabel(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function safeImageSource(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  const cleanedUrl = imageUrl.trim().replaceAll("\\", "/");
  if (cleanedUrl.startsWith("/") && !cleanedUrl.startsWith("//")) return cleanedUrl;
  try {
    const url = new URL(cleanedUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href;
  } catch {
    return null;
  }
}

function safeImageBackground(imageUrl?: string | null): string | null {
  const imageSource = safeImageSource(imageUrl);
  return imageSource
    ? `linear-gradient(140deg, rgba(16, 12, 22, .05), rgba(16, 12, 22, .25)), url(${JSON.stringify(imageSource)})`
    : null;
}

function Cover({
  title,
  imageUrl,
  small = false,
}: {
  title: string;
  imageUrl?: string | null;
  small?: boolean;
}) {
  const imageSource = safeImageSource(imageUrl);
  const [proxyAttemptFor, setProxyAttemptFor] = useState<string | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const usingProxy = imageSource !== null && proxyAttemptFor === imageSource;
  const imageFailed = imageSource === null || failedFor === imageSource;
  const visibleImageSource = imageSource && !imageFailed
    ? usingProxy
      ? `/api/proxy-image?url=${encodeURIComponent(imageSource)}`
      : imageSource
    : null;

  return (
    <div
      className={`${styles.cover} ${small ? styles.coverSmall : ""}`}
      role="img"
      aria-label={`Ảnh bìa ${title}`}
    >
      {visibleImageSource ? (
        <img
          className={styles.coverImage}
          src={visibleImageSource}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => {
            if (!usingProxy && /^https?:\/\//i.test(imageSource ?? "")) {
              setProxyAttemptFor(imageSource);
              return;
            }
            setFailedFor(imageSource);
          }}
        />
      ) : (
        <>
          <span className={styles.coverDisc} />
          <span className={styles.coverInitials}>{initials(title)}</span>
        </>
      )}
    </div>
  );
}

function RemoteAudioPlayer({
  userId,
  stream,
  muted,
  volume,
  outputDeviceId,
}: {
  userId: string;
  stream: MediaStream;
  muted: boolean;
  volume: number;
  outputDeviceId: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.srcObject = stream;
    audio.muted = muted;
    audio.volume = volume;
    const routableAudio = audio as HTMLAudioElement & { setSinkId?: (deviceId: string) => Promise<void> };
    if (typeof routableAudio.setSinkId === "function") {
      void routableAudio.setSinkId(outputDeviceId).catch(() => undefined);
    }
    void audio.play().catch(() => undefined);
    return () => { audio.srcObject = null; };
  }, [muted, outputDeviceId, stream, volume]);
  return <audio ref={audioRef} autoPlay data-karaoke-room-audio="remote" aria-label={`Micro của thành viên ${userId}`} />;
}

function messageFor(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Không thể tải dữ liệu phòng.";
}

function isInviteError(error: unknown): boolean {
  return (
    error instanceof KaraokeRoomApiError &&
    (error.code === "ROOM_INVITE_REQUIRED" ||
      error.code === "ROOM_INVITE_INVALID")
  );
}

export default function KaraokeRoomPage({ roomId }: { roomId: string }) {
  const { pause } = usePlayer();
  const router = useRouter();
  const numericRoomId = Number(roomId);
  const [room, setRoom] = useState<KaraokeRoomDetail | null>(null);
  const [snapshotAt, setSnapshotAt] = useState(0);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const snapshotGuardRef = useRef({ roomId: numericRoomId, requestStartedAt: 0, playbackVersion: -1 });
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [audioOutputDevices, setAudioOutputDevices] = useState<{ deviceId: string; label: string }[]>([]);
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState("");
  const [remoteAudioSettings, setRemoteAudioSettings] = useState<Record<string, { muted: boolean; volume: number }>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRequired, setInviteRequired] = useState(false);
  const [joined, setJoined] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] =
    useState<KaraokeTrackSummary | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [groupScoreOpen, setGroupScoreOpen] = useState(false);
  const groupScoreCloseRef = useRef<HTMLButtonElement | null>(null);
  const groupScoreActionRef = useRef<HTMLButtonElement | null>(null);
  const lastOpenedScoreSessionRef = useRef("");

  const applyRoomSnapshot = useCallback((snapshot: KaraokeRoomDetail, requestStartedAt = Date.now()) => {
    const receivedAt = Date.now();
    const guard = snapshotGuardRef.current;
    if (guard.roomId !== numericRoomId) {
      guard.roomId = numericRoomId;
      guard.requestStartedAt = 0;
      guard.playbackVersion = -1;
    }
    if (requestStartedAt < guard.requestStartedAt || snapshot.playback.version < guard.playbackVersion) return;
    guard.requestStartedAt = requestStartedAt;
    guard.playbackVersion = snapshot.playback.version;
    setRoom(snapshot);
    setSnapshotAt(receivedAt);
    const serverTimeMs = snapshot.playback?.serverTimeMs;
    if (typeof serverTimeMs === "number" && Number.isFinite(serverTimeMs) && serverTimeMs > 0) {
      const midpoint = (requestStartedAt + receivedAt) / 2;
      const offsetSample = serverTimeMs - midpoint;
      setServerOffsetMs((previous) => previous === 0 ? offsetSample : previous * 0.75 + offsetSample * 0.25);
    }
  }, [numericRoomId]);
  const voice = useMediasoupRoom(numericRoomId, joined && !inviteRequired && !pageError);

  const refreshOutputDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioOutputDevices(devices
        .filter((device) => device.kind === "audiooutput")
        .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Loa ${index + 1}` })));
    } catch {
      setAudioOutputDevices([]);
    }
  }, []);

  useEffect(() => {
    if (!joined) return;
    const devices = navigator.mediaDevices;
    const onDeviceChange = () => { void refreshOutputDevices(); };
    const refreshTimer = window.setTimeout(() => { void refreshOutputDevices(); }, 0);
    devices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      window.clearTimeout(refreshTimer);
      devices?.removeEventListener?.("devicechange", onDeviceChange);
    };
  }, [joined, refreshOutputDevices, voice.microphoneOn]);

  useEffect(() => {
    const audios = document.querySelectorAll<HTMLAudioElement>("audio[data-karaoke-room-audio]");
    for (const audio of audios) {
      const routableAudio = audio as HTMLAudioElement & { setSinkId?: (deviceId: string) => Promise<void> };
      if (typeof routableAudio.setSinkId === "function") {
        void routableAudio.setSinkId(selectedOutputDeviceId).catch(() => {
          setAudioError("Không thể đổi loa đầu ra trên trình duyệt này.");
        });
      }
    }
  }, [selectedOutputDeviceId, voice.remoteVoices]);

  useEffect(() => pause(), [pause]);

  const refreshRoom = useCallback(async () => {
    if (!Number.isSafeInteger(numericRoomId) || numericRoomId <= 0) {
      setPageError("Đường dẫn phòng không hợp lệ.");
      setLoading(false);
      return;
    }
    try {
      const requestStartedAt = Date.now();
      const snapshot = await fetchKaraokeRoom(numericRoomId);
      applyRoomSnapshot(snapshot, requestStartedAt);
      setPageError("");
    } catch (error) {
      setPageError(messageFor(error));
    } finally {
      setLoading(false);
    }
  }, [applyRoomSnapshot, numericRoomId]);

  const enterRoom = useCallback(
    async (code?: string) => {
      if (!Number.isSafeInteger(numericRoomId) || numericRoomId <= 0) {
        setPageError("Đường dẫn phòng không hợp lệ.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setPageError("");
      setInviteError("");
      try {
        const requestStartedAt = Date.now();
        const snapshot = await joinKaraokeRoom(numericRoomId, code);
        applyRoomSnapshot(snapshot, requestStartedAt);
        setJoined(true);
        setInviteRequired(false);
        setInviteCode(code ?? "");
      } catch (error) {
        if (isInviteError(error)) {
          setInviteRequired(true);
          setInviteError(
            error instanceof Error
              ? error.message
              : "Nhập mã mời để vào phòng riêng.",
          );
        } else {
          setPageError(messageFor(error));
        }
        setJoined(false);
      } finally {
        setLoading(false);
      }
    },
    [applyRoomSnapshot, numericRoomId],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void enterRoom(), 0);
    return () => window.clearTimeout(timeout);
  }, [enterRoom]);

  const beforeSocketConnect = useCallback(async () => {
    const requestStartedAt = Date.now();
    const snapshot = await joinKaraokeRoom(
      numericRoomId,
      inviteCode || undefined,
    );
    applyRoomSnapshot(snapshot, requestStartedAt);
  }, [applyRoomSnapshot, inviteCode, numericRoomId]);

  const onRealtimeEvent = useCallback(() => {
    void refreshRoom();
  }, [refreshRoom]);
  const onSubscribed = useCallback(() => {
    setConnectionError("");
    void refreshRoom();
  }, [refreshRoom]);
  const onRealtimeError = useCallback((error: Error) => {
    if (
      error.message.includes("ROOM_INVITE_REQUIRED") ||
      error.message.includes("ROOM_INVITE_INVALID")
    ) {
      setJoined(false);
      setInviteRequired(true);
      setInviteError(error.message);
      return;
    }
    setConnectionError("Đang thử kết nối lại để cập nhật phòng.");
  }, []);
  const { connected } = useKaraokeRoomLive({
    scope: "room",
    roomId: numericRoomId,
    enabled: joined && !inviteRequired && !pageError,
    beforeConnect: beforeSocketConnect,
    onEvent: onRealtimeEvent,
    onSubscribed,
    onError: onRealtimeError,
  });

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const playback = room?.playback;
  const currentTrack = playback?.track;
  const playingElapsedMs = playback?.status !== "PLAYING"
    ? 0
    : playback.serverTimeMs > 0
      ? Math.max(0, clockNow + serverOffsetMs - playback.serverTimeMs)
      : Math.max(0, clockNow - snapshotAt);
  const currentPositionMs = playback ? playback.positionMs + playingElapsedMs : 0;
  const roomScoring = useKaraokeRoomScoring({
    roomId: numericRoomId,
    playbackRunId: playback?.playbackRunId ?? null,
    songId: currentTrack?.trackId ?? null,
    songTitle: currentTrack?.title ?? null,
    durationMs: currentTrack?.durationMs ?? null,
    playbackStatus: playback?.status ?? "IDLE",
    positionMs: currentPositionMs,
    microphoneStream: voice.microphoneStream,
    enabled: joined && !inviteRequired && !pageError,
  });

  useEffect(() => {
    if (roomScoring.score === null || !roomScoring.scoreSessionId
        || lastOpenedScoreSessionRef.current === roomScoring.scoreSessionId) return;
    lastOpenedScoreSessionRef.current = roomScoring.scoreSessionId;
    setGroupScoreOpen(true);
  }, [roomScoring.score, roomScoring.scoreSessionId]);

  useEffect(() => {
    if (!groupScoreOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => groupScoreCloseRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGroupScoreOpen(false);
      } else if (event.key === "Tab") {
        const closeButton = groupScoreCloseRef.current;
        const actionButton = groupScoreActionRef.current;
        if (event.shiftKey && document.activeElement === closeButton) {
          event.preventDefault();
          actionButton?.focus();
        } else if (!event.shiftKey && document.activeElement === actionButton) {
          event.preventDefault();
          closeButton?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [groupScoreOpen]);
  const lyricCues = parseLyricCues(currentTrack?.lyricsSynced);
  let activeLyricIndex = -1;
  for (let index = 0; index < lyricCues.length; index += 1) {
    if (lyricCues[index].startMs <= currentPositionMs) activeLyricIndex = index;
    else break;
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.instrumentalUrl || !playback) {
      audio?.pause();
      return;
    }
    if (audio.src !== currentTrack.instrumentalUrl) {
      audio.src = currentTrack.instrumentalUrl;
      audio.load();
    }
    const syncAndPlay = () => {
      const targetSeconds = currentPositionMs / 1000;
      const boundedTarget = Number.isFinite(audio.duration)
        ? Math.min(targetSeconds, Math.max(0, audio.duration - 0.15))
        : targetSeconds;
      if (Math.abs(audio.currentTime - boundedTarget) > 0.4) {
        try { audio.currentTime = boundedTarget; } catch {}
      }
      if (playback.status === "PLAYING" && audioEnabled) {
        if (audio.paused) void audio.play().then(() => setAudioError("")).catch(() => {
          setAudioError("Trình duyệt đang chặn âm thanh. Hãy bấm “Bật nghe sân khấu”.");
        });
      } else {
        audio.pause();
      }
    };
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) syncAndPlay();
    else audio.addEventListener("loadedmetadata", syncAndPlay, { once: true });
    return () => audio.removeEventListener("loadedmetadata", syncAndPlay);
  }, [audioEnabled, currentPositionMs, currentTrack?.instrumentalUrl, playback]);

  useEffect(() => {
    if (!isRequestOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsRequestOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRequestOpen]);

  const selectedTrackTitle = selectedTrack?.title ?? "";
  const myQueueItem = room?.queue.find((item) => item.requestedByMe);
  const handleTrackSelect = useCallback(
    (track: KaraokeTrackSummary) => setSelectedTrack(track),
    [],
  );

  const addRequest = async () => {
    if (!selectedTrack || busy) return;
    setBusy(true);
    try {
      await addKaraokeRoomQueueItem(numericRoomId, selectedTrack.songId);
      setIsRequestOpen(false);
      setSelectedTrack(null);
      setNotice("Đã thêm bài vào hàng đợi. Chủ phòng có thể bắt đầu phát trên sân khấu.");
      await refreshRoom();
    } catch (error) {
      setNotice(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  const removeRequest = async (item: KaraokeRoomQueueItem) => {
    if (busy) return;
    setBusy(true);
    try {
      await removeKaraokeRoomQueueItem(numericRoomId, item.id);
      setNotice("Đã rút bài hát khỏi hàng đợi.");
      await refreshRoom();
    } catch (error) {
      setNotice(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  const leaveRoom = async () => {
    setBusy(true);
    try {
      await leaveKaraokeRoom(numericRoomId);
      setJoined(false);
      router.push("/dashboard/karaoke/rooms");
    } catch (error) {
      setNotice(messageFor(error));
      setBusy(false);
    }
  };

  const closeRoom = async () => {
    if (
      !room?.canManage ||
      busy ||
      !window.confirm("Đóng phòng này? Thành viên sẽ bị đưa ra khỏi phòng.")
    )
      return;
    setBusy(true);
    try {
      await closeKaraokeRoom(numericRoomId);
      setJoined(false);
      router.push("/dashboard/karaoke/rooms");
    } catch (error) {
      setNotice(messageFor(error));
      setBusy(false);
    }
  };

  const playbackCommand = async (command: "start" | "pause" | "resume" | "skip") => {
    if (!room || busy) return;
    setBusy(true);
    try {
      const requestStartedAt = Date.now();
      const snapshot = await controlKaraokePlayback(numericRoomId, command, room.playback.version);
      applyRoomSnapshot(snapshot, requestStartedAt);
      if ((command === "start" || command === "resume") && audioEnabled && audioRef.current) {
        void audioRef.current.play().catch(() => setAudioError("Bấm “Bật nghe sân khấu” để cho phép phát nhạc."));
      }
      setNotice(command === "skip" ? "Đã chuyển sang bài tiếp theo." : "Đã cập nhật trạng thái sân khấu.");
    } catch (error) {
      if (error instanceof KaraokeRoomApiError && error.status === 409) {
        await refreshRoom();
        setNotice(error.code === "PLAYBACK_VERSION_CONFLICT"
          ? "Phòng vừa có thao tác khác. Đã tải trạng thái mới; hãy thử lại."
          : messageFor(error));
      } else {
        setNotice(messageFor(error));
      }
    } finally {
      setBusy(false);
    }
  };

  const enableRoomAudio = async () => {
    setAudioEnabled(true);
    setAudioError("");
    const audioElements = document.querySelectorAll<HTMLAudioElement>("audio[data-karaoke-room-audio]");
    for (const audio of audioElements) {
      try {
        await audio.play();
      } catch {
        setAudioError("Chưa thể bật âm thanh. Hãy kiểm tra trình duyệt hoặc thiết bị đầu ra.");
      }
    }
  };

  const submitInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = inviteCode.trim();
    if (!trimmed) return;
    await enterRoom(trimmed);
  };

  if (loading && !room && !inviteRequired) {
    return (
      <main className={styles.page}>
        <div className={styles.pageGlow} aria-hidden="true" />
        <div className={styles.roomsMessage}>Đang kết nối vào phòng…</div>
      </main>
    );
  }

  if (inviteRequired) {
    return (
      <main className={styles.page}>
        <div className={styles.pageGlow} aria-hidden="true" />
        <Link href="/dashboard/karaoke/rooms" className={styles.backLink}>
          <ArrowLeft size={16} /> Quay lại danh sách phòng
        </Link>
        <form className={styles.invitePanel} onSubmit={submitInvite}>
          <span className={styles.roomCardIcon}>
            <LockKeyhole size={20} />
          </span>
          <span className={styles.sectionKicker}>PHÒNG RIÊNG</span>
          <h1>Nhập mã mời</h1>
          <p>Phòng này chỉ dành cho người có mã mời.</p>
          <label className={styles.fieldLabel} htmlFor="room-invite-code">
            Mã mời
          </label>
          <input
            id="room-invite-code"
            className={styles.roomTextInput}
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            autoComplete="off"
            required
          />
          {inviteError && (
            <p className={styles.formError} role="alert">
              {inviteError}
            </p>
          )}
          {pageError && (
            <p className={styles.formError} role="alert">
              {pageError}
            </p>
          )}
          <button
            type="submit"
            className={styles.modalSubmit}
            disabled={loading || !inviteCode.trim()}
          >
            {loading ? "Đang xác thực…" : "Vào phòng"}
            <ArrowRight size={17} />
          </button>
        </form>
      </main>
    );
  }

  if (pageError || !room) {
    return (
      <main className={styles.page}>
        <div className={styles.pageGlow} aria-hidden="true" />
        <Link href="/dashboard/karaoke/rooms" className={styles.backLink}>
          <ArrowLeft size={16} /> Quay lại danh sách phòng
        </Link>
        <div className={styles.roomsMessage} role="alert">
          <strong>Không thể mở phòng</strong>
          <span>{pageError || "Phòng không tồn tại."}</span>
          <Link
            className={styles.roomRetryButton}
            href="/dashboard/karaoke/rooms"
          >
            Về danh sách phòng
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageGlow} aria-hidden="true" />
      <Link href="/dashboard/karaoke/rooms" className={styles.backLink}>
        <ArrowLeft size={16} /> Quay lại danh sách phòng
      </Link>

      <section className={styles.intro} aria-labelledby="karaoke-title">
        <div>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowLine} /> MOODIFY KARAOKE{" "}
            <span className={styles.eyebrowLine} />
          </div>
          <h1 id="karaoke-title">
            {room.name}
            <span className={styles.titlePeriod}>.</span>
          </h1>
          <p>
            Một không gian chung để đăng ký bài hát và xem ai đang ở trong
            phòng.
          </p>
        </div>
        <div className={styles.roomActions}>
          {room.canManage && (
            <button
              type="button"
              className={styles.leaveRoomButton}
              onClick={() => void closeRoom()}
              disabled={busy}
            >
              Đóng phòng
            </button>
          )}
          <button
            type="button"
            className={styles.leaveRoomButton}
            onClick={() => void leaveRoom()}
            disabled={busy}
          >
            <DoorOpen size={14} /> Rời phòng
          </button>
          <span className={styles.visuallyHidden} role="status" aria-live="polite">
            {connectionError || (connected ? "Dữ liệu đang đồng bộ trực tiếp" : "Đang kết nối…")}{voice.connected ? " · Media đã kết nối" : ""}
          </span>
        </div>
      </section>

      <div className={styles.mainGrid}>
        <div className={styles.leftColumn}>
          <section
            className={`${styles.stage} ${styles.roomIdleStage}`}
            aria-labelledby="stage-heading"
          >
            <div className={styles.stageAura} aria-hidden="true" />
            <div className={styles.stageTopline}>
              <span className={styles.stageTag}>
                <AudioLines size={13} /> {playback?.status === "PLAYING" ? "SÂN KHẤU ĐANG PHÁT" : playback?.status === "PAUSED" ? "SÂN KHẤU TẠM DỪNG" : "SÂN KHẤU ĐANG CHỜ"}
              </span>
              <span className={styles.stageRoom}>
                PHÒNG #{room.id} <span aria-hidden="true">/</span>{" "}
                {room.memberCount}/{room.maxMembers} NGƯỜI
              </span>
            </div>
            <div className={styles.idleStageContent}>
              <span className={styles.idleStageIcon}>
                <Headphones size={30} />
              </span>
              <span className={styles.performerCaption}>TRẠNG THÁI PHÒNG</span>
              <h2 id="stage-heading">{currentTrack?.title ?? (playback?.status === "PAUSED" ? "Sân khấu đang tạm dừng" : "Sẵn sàng cho buổi hát")}</h2>
              <p>{currentTrack ? currentTrack.artist || "Đang phát nhạc nền karaoke" : "Bài hát chung và lời đồng bộ sẽ xuất hiện tại đây khi chủ phòng bắt đầu."}</p>
              {currentTrack && lyricCues.length > 0 && (
                <div className={styles.roomLyrics} aria-live="polite" aria-atomic="true">
                  <span>{lyricCues[activeLyricIndex - 1]?.text ?? ""}</span>
                  <strong>{lyricCues[activeLyricIndex]?.text ?? "♪"}</strong>
                  <span>{lyricCues[activeLyricIndex + 1]?.text ?? ""}</span>
                </div>
              )}
              {currentTrack && !lyricCues.length && currentTrack.lyricsPlain && (
                <div className={styles.roomLyricsPlain}>{currentTrack.lyricsPlain.split(/\r?\n/).slice(0, 3).join(" · ")}</div>
              )}
            </div>
            <div className={styles.stageSong}>
              <Music2 size={16} aria-hidden="true" />
              <span>
                <small>{currentTrack ? "ĐANG PHÁT" : "BÀI TIẾP THEO"}</small>
                <strong>
                  {currentTrack?.title ?? room.queue[0]?.title ?? "Chưa có bài trong hàng đợi"}
                </strong>
              </span>
            </div>
            <div className={styles.roomPlaybackControls}>
              {room.canManage && playback?.status === "IDLE" && (
                <button type="button" className={styles.playbackButton} disabled={busy || !room.queue.length} onClick={() => void playbackCommand("start")}>
                  <Play size={15} /> Bắt đầu
                </button>
              )}
              {room.canManage && playback?.status === "PLAYING" && (
                <button type="button" className={styles.playbackButton} disabled={busy} onClick={() => void playbackCommand("pause")}>
                  <Pause size={15} /> Tạm dừng
                </button>
              )}
              {room.canManage && playback?.status === "PAUSED" && (
                <button type="button" className={styles.playbackButton} disabled={busy} onClick={() => void playbackCommand("resume")}>
                  <Play size={15} /> Tiếp tục
                </button>
              )}
              {room.canManage && currentTrack && (
                <button type="button" className={styles.playbackButton} disabled={busy} onClick={() => void playbackCommand("skip")}>
                  <SkipForward size={15} /> Bỏ qua
                </button>
              )}
              <button type="button" className={styles.playbackButton} onClick={() => void enableRoomAudio()}>
                <Volume2 size={15} /> {audioEnabled ? "Âm thanh đã bật" : "Bật nghe sân khấu"}
              </button>
            </div>
            {audioError && <p className={styles.playbackError} role="status">{audioError}</p>}
            <audio ref={audioRef} preload="auto" data-karaoke-room-audio="instrumental" onEnded={roomScoring.trackEnded} />
            {voice.remoteVoices.map((remote) => {
              const settings = remoteAudioSettings[remote.userId] ?? { muted: false, volume: 1 };
              const memberName = room.members.find((member) => String(member.userId) === remote.userId)?.name ?? `Thành viên ${remote.userId}`;
              return (
                <div className={styles.remoteVoiceControl} key={remote.userId}>
                  <RemoteAudioPlayer
                    userId={remote.userId}
                    stream={remote.stream}
                    muted={settings.muted}
                    volume={settings.volume}
                    outputDeviceId={selectedOutputDeviceId}
                  />
                  <span className={styles.remoteVoiceName}>{memberName}</span>
                  <button
                    type="button"
                    className={styles.remoteVoiceMute}
                    aria-label={`${settings.muted ? "Bật tiếng" : "Tắt tiếng"} ${memberName} trên thiết bị của bạn`}
                    aria-pressed={settings.muted}
                    onClick={() => setRemoteAudioSettings((current) => ({
                      ...current,
                      [remote.userId]: { ...settings, muted: !settings.muted },
                    }))}
                  >
                    {settings.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                  <label className={styles.remoteVoiceVolume}>
                    <span className={styles.visuallyHidden}>Âm lượng của {memberName}</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.volume}
                      onChange={(event) => setRemoteAudioSettings((current) => ({
                        ...current,
                        [remote.userId]: { ...settings, volume: Number(event.target.value) },
                      }))}
                    />
                  </label>
                </div>
              );
            })}
            <div className={styles.stageProgress}>
              <span>{currentTrack ? clockLabel(currentPositionMs) : "Chưa phát"}</span>
              <div className={styles.progressTrack}>
                <span style={{ width: `${currentTrack?.durationMs ? Math.min(100, currentPositionMs / currentTrack.durationMs * 100) : 0}%` }} />
              </div>
              <span>{currentTrack ? durationLabel(currentTrack.durationMs) : "--:--"}</span>
            </div>
          </section>

        </div>

        <aside
          className={styles.rightColumn}
          aria-label="Thông tin phòng karaoke"
        >
          <section className={styles.queueCard} aria-labelledby="queue-heading">
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.sectionKicker}>
                  TIẾP THEO TRÊN SÂN KHẤU
                </span>
                <h2 id="queue-heading">Hàng đợi</h2>
              </div>
              <span className={styles.countBadge}>
                {room.queue.length} lượt
              </span>
            </div>
            {room.queue.length ? (
              <div className={styles.queueList}>
                {room.queue.map((item, index) => (
                  <div
                    key={item.id}
                    className={`${styles.queueItem} ${item.requestedByMe ? styles.myQueueItem : ""}`}
                  >
                    <span className={styles.queueNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Cover title={item.title} imageUrl={item.imageUrl} small />
                    <div className={styles.queueInfo}>
                      <strong>{item.title}</strong>
                      <span>
                        {item.artist || "Nghệ sĩ chưa rõ"} · {item.requestedBy}{" "}
                        · {durationLabel(item.durationMs)}
                      </span>
                    </div>
                    {(item.requestedByMe || room.canManage) && (
                      <button
                        type="button"
                        className={styles.queueRemoveIcon}
                        onClick={() => void removeRequest(item)}
                        disabled={busy}
                        aria-label={`Rút ${item.title}`}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.queueEmpty}>
                <Music2 size={22} />
                <strong>Chưa có bài chờ</strong>
                <span>Chọn một bài từ kho Karaoke để thêm vào đây.</span>
              </div>
            )}
            {myQueueItem ? (
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => void removeRequest(myQueueItem)}
                disabled={busy}
              >
                Rút lượt hát của tôi <X size={15} />
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  setSelectedTrack(null);
                  setIsRequestOpen(true);
                }}
                disabled={busy}
              >
                <Plus size={18} /> Đăng ký lượt hát{" "}
                <span aria-hidden="true">›</span>
              </button>
            )}
          </section>

          <section
            className={styles.membersCard}
            aria-labelledby="members-heading"
          >
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.sectionKicker}>
                  CÙNG CHUNG GIAI ĐIỆU
                </span>
                <h2 id="members-heading">Trong phòng</h2>
              </div>
              <span className={styles.memberCount}>
                {room.memberCount}/{room.maxMembers} người
              </span>
            </div>
            <div className={styles.memberList}>
              {room.members.map((member) => {
                const backgroundImage = safeImageBackground(member.avatarUrl);
                return (
                  <div key={member.userId} className={styles.member}>
                    <span
                      className={styles.memberAvatar}
                      style={
                        backgroundImage
                          ? { backgroundImage, backgroundSize: "cover" }
                          : undefined
                      }
                    >
                      {!backgroundImage && initials(member.name)}
                    </span>
                    <span className={styles.memberName}>
                      {member.name}
                      {member.host && <small>Chủ phòng</small>}
                    </span>
                    <span
                      className={`${styles.memberDot} ${voice.speakingUserIds.includes(String(member.userId)) ? styles.memberSpeaking : ""}`}
                      title={voice.speakingUserIds.includes(String(member.userId)) ? "Đang nói" : "Đang ở trong phòng"}
                      aria-label={voice.speakingUserIds.includes(String(member.userId)) ? "Đang nói" : "Đang kết nối"}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>

      <section className={styles.deviceCard} aria-labelledby="device-heading">
        <div className={styles.deviceArtwork}>
          <Headphones size={26} />
          <span className={styles.deviceWave} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className={styles.deviceCopy}>
          <span className={styles.sectionKicker}>TRƯỚC KHI LÊN SÂN KHẤU</span>
          <h2 id="device-heading">Thiết bị âm thanh</h2>
          <p>{voice.connected ? "Âm thanh phòng đã kết nối. Micro luôn tắt cho đến khi bạn chủ động bật." : "Đang kết nối máy chủ voice mediasoup; micro mặc định tắt."}</p>
          <p>Phần cao độ từ micro đang bật được ghép vào một điểm chung cho cả phòng sau khi bài hát kết thúc.</p>
          {voice.voiceError && <p className={styles.micError} role="status">{voice.voiceError}</p>}
        </div>
        <button
          type="button"
          className={styles.micCheckButton}
          onClick={() => void voice.toggleMicrophone()}
          disabled={!voice.ready || voice.microphoneBusy}
          aria-pressed={voice.microphoneOn}
          title={!voice.ready ? "Đang kết nối đến mediasoup" : voice.microphoneBusy ? "Đang xử lý micro" : voice.microphoneOn ? "Tắt micro" : "Bật micro cho mọi người trong phòng nghe"}
        >
          {voice.microphoneOn ? <MicOff size={16} /> : <Mic2 size={16} />}
          {!voice.ready ? "Đang kết nối" : voice.microphoneBusy ? "Đang xử lý micro…" : voice.microphoneOn ? "Tắt micro" : "Bật micro"}
        </button>
        <div className={styles.deviceSettings}>
          <label>
            <span>Micro đầu vào</span>
            <select
              value={voice.selectedInputDeviceId}
              onChange={(event) => void voice.selectInputDevice(event.target.value)}
              disabled={voice.microphoneBusy || voice.audioInputDevices.length === 0}
            >
              {voice.audioInputDevices.length === 0 && <option value="">Thiết bị mặc định</option>}
              {voice.audioInputDevices.map((device) => (
                <option value={device.deviceId} key={device.deviceId}>{device.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Loa đầu ra</span>
            <select
              value={selectedOutputDeviceId}
              onChange={(event) => setSelectedOutputDeviceId(event.target.value)}
              disabled={audioOutputDevices.length === 0}
            >
              <option value="">Loa mặc định</option>
              {audioOutputDevices.filter((device) => device.deviceId).map((device) => (
                <option value={device.deviceId} key={device.deviceId}>{device.label}</option>
              ))}
            </select>
          </label>
          <p>Điều chỉnh âm lượng hoặc tắt tiếng từng thành viên chỉ ảnh hưởng thiết bị của bạn.</p>
        </div>
      </section>

      {notice && (
        <div className={styles.toast} role="status">
          <Check size={17} />
          {notice}
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Đóng thông báo"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {isRequestOpen && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy)
              setIsRequestOpen(false);
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.sectionKicker}>ĐĂNG KÝ LƯỢT HÁT</span>
                <h2 id="request-title">Bài hát của bạn</h2>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setIsRequestOpen(false)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            {selectedTrack && (
              <div className={styles.modalSong}>
                <Cover
                  title={selectedTrackTitle}
                  imageUrl={selectedTrack.imageUrl}
                  small
                />
                <div>
                  <strong>{selectedTrack.title}</strong>
                  <span>
                    {selectedTrack.artist} ·{" "}
                    {durationLabel(selectedTrack.durationMs)}
                  </span>
                </div>
              </div>
            )}
            <div className={styles.fieldLabel}>Chọn bài từ kho Karaoke</div>
            <KaraokeTrackCatalog
              selectedSongId={selectedTrack?.songId ?? null}
              onSelect={handleTrackSelect}
              pageSize={5}
              compact
            />
            <div className={styles.modalNotice}>
              <Volume2 size={16} />
              Bài được đưa vào hàng đợi chung. Hiện phòng chưa phát beat hoặc
              micro trực tuyến.
            </div>
            <button
              type="button"
              className={styles.modalSubmit}
              onClick={() => void addRequest()}
              disabled={busy || !selectedTrack}
            >
              {busy
                ? "Đang thêm…"
                : selectedTrack
                  ? "Thêm vào hàng đợi"
                  : "Chọn bài hát"}
              <ArrowLeft size={17} className={styles.submitArrow} />
            </button>
          </div>
        </div>
      )}

      {groupScoreOpen && roomScoring.score !== null && typeof document !== "undefined"
        ? createPortal(
        <div
          className={styles.roomScoreBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setGroupScoreOpen(false);
          }}
        >
          <section
            className={styles.roomScoreModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-score-title"
            aria-describedby="room-score-description"
          >
            <button
              ref={groupScoreCloseRef}
              type="button"
              className={styles.roomScoreClose}
              onClick={() => setGroupScoreOpen(false)}
              aria-label="Đóng kết quả điểm chung"
            >
              <X size={17} />
            </button>
            <div className={styles.roomScoreHeading}>
              <span className={styles.roomScoreMark}><Trophy size={19} strokeWidth={1.8} /></span>
              <span>KẾT QUẢ PHIÊN HÁT CHUNG</span>
            </div>
            <h2 id="room-score-title">Cả phòng đã cùng tỏa sáng</h2>
            <p className={styles.roomScoreSong} title={roomScoring.scoreSongTitle}>
              {roomScoring.scoreSongTitle}
            </p>
            <div
              className={styles.roomScoreRing}
              style={{ background: `conic-gradient(from -90deg, #f1b4dc 0 ${Math.max(0, Math.min(100, roomScoring.score))}%, rgba(255,255,255,.09) ${Math.max(0, Math.min(100, roomScoring.score))}% 100%)` }}
              role="meter"
              aria-label="Điểm chung của phòng"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={roomScoring.score}
            >
              <div className={styles.roomScoreRingCore}>
                <span>ĐIỂM CHUNG</span>
                <strong>{roomScoring.score.toFixed(1)}</strong>
                <small>trên 100</small>
              </div>
            </div>
            <div className={styles.roomScoreTogether}>
              <Sparkles size={15} aria-hidden="true" />
              Một bài hát · Một phiên · Một điểm số cho cả phòng
            </div>
            <p id="room-score-description" className={styles.roomScoreDescription}>
              Điểm được tổng hợp từ các phần hát của thành viên bật micro trong bài này.
            </p>
            <button
              ref={groupScoreActionRef}
              type="button"
              className={styles.roomScoreAction}
              onClick={() => setGroupScoreOpen(false)}
            >
              Trở lại phòng hát
              <ArrowRight size={16} />
            </button>
          </section>
        </div>,
        document.body,
      ) : null}
    </main>
  );
}
