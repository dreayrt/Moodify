"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft,
  AudioLines,
  Headphones,
  Mic2,
  Music2,
  Pause,
  Play,
  Sparkles,
  X,
} from "lucide-react";
import { usePlayer } from "@/components/dashboard/player-context";
import {
  startKaraokeSession,
  submitKaraokePitchFeatures,
  type KaraokePitchFeatures,
  type KaraokeScoreResponse,
  type KaraokeSessionResponse,
  type KaraokeTrackSummary,
} from "@/lib/api-client";
import KaraokeTrackCatalog from "./karaoke-track-catalog";
import styles from "./karaoke-room-page.module.css";

function formatDuration(durationMs: number | null): string {
  if (!durationMs || durationMs < 0) return "Chưa có thời lượng";
  const seconds = Math.floor(durationMs / 1000);
  return (
    String(Math.floor(seconds / 60)) +
    ":" +
    String(seconds % 60).padStart(2, "0")
  );
}

function formatClock(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  return (
    String(Math.floor(safeSeconds / 60)) +
    ":" +
    String(Math.floor(safeSeconds % 60)).padStart(2, "0")
  );
}

type SyncedLyricLine = { startMs: number; text: string };
type KaraokeScoreState =
  | "idle"
  | "preparing"
  | "recording"
  | "uploading"
  | "completed"
  | "error";

type PitchCaptureSummary = Pick<KaraokePitchFeatures,
  "duration_seconds" | "rms_dbfs" | "clipped_fraction"> & { frame_count: number };

const LRC_TIMESTAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

function parseSyncedLyrics(
  rawLyrics: string | null | undefined,
): SyncedLyricLine[] {
  if (!rawLyrics?.trim()) return [];

  const offsetMatch = rawLyrics.match(/^\s*\[offset:([+-]?\d+)\]\s*$/im);
  const offsetMs = offsetMatch ? Number(offsetMatch[1]) : 0;
  const parsed: SyncedLyricLine[] = [];

  for (const rawLine of rawLyrics.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const timestamps = Array.from(line.matchAll(LRC_TIMESTAMP));
    if (timestamps.length === 0) continue;
    const text = line.replace(LRC_TIMESTAMP, "").trim();
    if (!text) continue;

    for (const match of timestamps) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      if (seconds > 59) continue;
      const milliseconds = Number(
        (match[3] ?? "").padEnd(3, "0").slice(0, 3) || "0",
      );
      parsed.push({
        startMs: Math.max(
          0,
          minutes * 60_000 + seconds * 1_000 + milliseconds + offsetMs,
        ),
        text,
      });
    }
  }

  parsed.sort((left, right) => left.startMs - right.startMs);
  const lines: SyncedLyricLine[] = [];
  for (const cue of parsed) {
    const previous = lines[lines.length - 1];
    if (previous?.startMs === cue.startMs) {
      if (previous.text !== cue.text) previous.text += ` · ${cue.text}`;
    } else {
      lines.push({ ...cue });
    }
  }
  return lines;
}

function findLyricLineAtTime(
  lines: SyncedLyricLine[],
  timeSeconds: number,
): number {
  const timeMs = timeSeconds * 1000;
  let low = 0;
  let high = lines.length - 1;
  let candidate = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (lines[middle].startMs <= timeMs) {
      candidate = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return candidate;
}

function errorName(error: unknown): string {
  if (typeof error === "object" && error !== null && "name" in error) {
    return String((error as { name?: unknown }).name ?? "");
  }
  return "";
}

function microphoneError(error: unknown): string {
  const name = errorName(error);
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Trình duyệt chưa cấp quyền micro. Hãy cho phép Micro trong biểu tượng ổ khóa cạnh thanh địa chỉ rồi thử lại.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Không tìm thấy micro đang kết nối với máy.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Micro đang bị ứng dụng khác sử dụng hoặc hệ điều hành không cho mở thiết bị.";
  }
  return "Không thể mở micro. Hãy kiểm tra thiết bị và quyền truy cập của trình duyệt.";
}

export default function KaraokeSoloPage() {
  const { pause } = usePlayer();
  const [song, setSong] = useState<KaraokeTrackSummary | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState("");
  const [micState, setMicState] = useState<
    "idle" | "requesting" | "active" | "error"
  >("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [micMessage, setMicMessage] = useState("");
  const [micError, setMicError] = useState("");
  const [scoreState, setScoreState] = useState<KaraokeScoreState>("idle");
  const [scoreMessage, setScoreMessage] = useState("");
  const [scoreError, setScoreError] = useState("");
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [scoreResult, setScoreResult] = useState<KaraokeScoreResponse | null>(
    null,
  );
  const scoreDialogRef = useRef<HTMLElement>(null);
  const scoreDialogCloseRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micAnimationRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const pitchProcessorRef = useRef<AudioWorkletNode | null>(null);
  const pitchFeaturesRef = useRef<{ f0_hz: Array<number | null>; voiced_probability: number[] }>({
    f0_hz: [],
    voiced_probability: [],
  });
  const pitchSummaryWaiterRef = useRef<{
    resolve: (summary: PitchCaptureSummary) => void;
    reject: (error: Error) => void;
    timeoutId: number;
  } | null>(null);
  const activeScoreSessionRef = useRef<KaraokeSessionResponse | null>(null);
  const recordingStartOffsetRef = useRef(0);
  const discardRecordingRef = useRef(false);
  const scoreStartLockRef = useRef(false);

  const syncedLyrics = useMemo(
    () => parseSyncedLyrics(song?.lyricsSynced),
    [song?.lyricsSynced],
  );
  const activeLyric =
    activeLyricIndex >= 0 ? syncedLyrics[activeLyricIndex] : null;
  const upcomingLyric =
    syncedLyrics[activeLyricIndex >= 0 ? activeLyricIndex + 1 : 0] ?? null;
  const totalDuration = duration || (song?.durationMs ?? 0) / 1000;
  const hasLyrics = Boolean(
    song?.lyricsSynced?.trim() || song?.lyricsPlain?.trim(),
  );
  const overallScore = scoreResult?.score?.overall ?? 0;
  const scoreProgress = Math.max(0, Math.min(100, overallScore));

  useEffect(() => {
    if (!scoreDialogOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      scoreDialogCloseRef.current?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setScoreDialogOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        scoreDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) {
        event.preventDefault();
        scoreDialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [scoreDialogOpen]);

  const discardActiveRecording = useCallback(() => {
    discardRecordingRef.current = true;
    const waiter = pitchSummaryWaiterRef.current;
    if (waiter) {
      window.clearTimeout(waiter.timeoutId);
      waiter.reject(new Error("Đã hủy bản thu."));
      pitchSummaryWaiterRef.current = null;
    }
    const processor = pitchProcessorRef.current;
    if (processor) {
      processor.port.postMessage({ type: "abort" });
      processor.port.onmessage = null;
      processor.disconnect();
    }
    pitchProcessorRef.current = null;
    pitchFeaturesRef.current = { f0_hz: [], voiced_probability: [] };
    activeScoreSessionRef.current = null;
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    const context = recordingAudioContextRef.current;
    recordingAudioContextRef.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }, []);

  const cancelScoring = useCallback(() => {
    discardActiveRecording();
    audioRef.current?.pause();
    setIsPlaying(false);
    setScoreState("idle");
    setScoreDialogOpen(false);
    setScoreMessage("Đã hủy bản thu; bản thu chưa được gửi đi.");
    setScoreError("");
  }, [discardActiveRecording]);

  const stopMicCheck = useCallback((updateUi = true) => {
    if (micAnimationRef.current !== null) {
      window.cancelAnimationFrame(micAnimationRef.current);
      micAnimationRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    if (micContextRef.current && micContextRef.current.state !== "closed") {
      void micContextRef.current.close().catch(() => undefined);
    }
    micContextRef.current = null;
    if (updateUi) {
      setMicState("idle");
      setMicLevel(0);
      setMicMessage("");
      setMicError("");
    }
  }, []);

  const finishScoring = useCallback(async () => {
    const processor = pitchProcessorRef.current;
    const session = activeScoreSessionRef.current;
    if (!processor || !session || discardRecordingRef.current) return;

    setScoreState("uploading");
    setScoreMessage("Bài hát đã kết thúc. Đang chốt điểm…");
    setScoreError("");
    try {
      const summary = await new Promise<PitchCaptureSummary>((resolve, reject) => {
        const timeoutId = window.setTimeout(
          () => reject(new Error("Không thể hoàn tất phân tích âm thanh.")),
          5_000,
        );
        pitchSummaryWaiterRef.current = { resolve, reject, timeoutId };
        processor.port.postMessage({ type: "finalize" });
      });
      const captured = pitchFeaturesRef.current;
      if (captured.f0_hz.length !== summary.frame_count
          || captured.voiced_probability.length !== summary.frame_count) {
        throw new Error("Dữ liệu âm thanh chưa đầy đủ để tính điểm.");
      }
      const features: KaraokePitchFeatures = {
        duration_seconds: summary.duration_seconds,
        rms_dbfs: summary.rms_dbfs,
        clipped_fraction: summary.clipped_fraction,
        f0_hz: captured.f0_hz,
        voiced_probability: captured.voiced_probability,
        recording_start_offset_ms: recordingStartOffsetRef.current,
        capture_latency_ms: 0,
        allow_octave_shift: true,
      };
      const result = await submitKaraokePitchFeatures({
        sessionId: session.sessionId,
        features,
      });
      setScoreResult(result);
      setScoreDialogOpen(Boolean(result.score));
      setScoreState("completed");
      setScoreMessage(
        result.score
          ? "Đã chấm điểm xong."
          : "Bản thu chưa đủ dữ liệu để tính điểm.",
      );
      setScoreError("");
    } catch (error: unknown) {
      if (discardRecordingRef.current) return;
      setScoreState("error");
      setScoreMessage("");
      setScoreError(
        error instanceof Error ? error.message : "Không thể chốt điểm Karaoke.",
      );
    } finally {
      if (pitchSummaryWaiterRef.current) {
        window.clearTimeout(pitchSummaryWaiterRef.current.timeoutId);
        pitchSummaryWaiterRef.current = null;
      }
      const activeProcessor = pitchProcessorRef.current;
      if (activeProcessor) {
        activeProcessor.port.onmessage = null;
        activeProcessor.disconnect();
      }
      pitchProcessorRef.current = null;
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      const context = recordingAudioContextRef.current;
      recordingAudioContextRef.current = null;
      if (context && context.state !== "closed") void context.close().catch(() => undefined);
      activeScoreSessionRef.current = null;
      pitchFeaturesRef.current = { f0_hz: [], voiced_probability: [] };
    }
  }, []);

  const beginScoring = useCallback(
    async (track: KaraokeTrackSummary, audio: HTMLAudioElement) => {
      if (scoreStartLockRef.current || pitchProcessorRef.current) return;
      if (!track.scoringAvailable) {
        setScoreState("error");
        setScoreError(
          "Bài này chưa có dữ liệu tham chiếu đủ tin cậy để chấm điểm.",
        );
        return;
      }
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setScoreState("error");
        setScoreError(
          "Trình duyệt cần quyền micro trên localhost hoặc HTTPS để ghi giọng hát.",
        );
        return;
      }
      if (typeof AudioWorkletNode === "undefined" || !window.AudioContext) {
        setScoreState("error");
        setScoreError("Trình duyệt này chưa hỗ trợ chấm điểm nhanh. Hãy dùng Chrome hoặc Edge mới.");
        return;
      }
      scoreStartLockRef.current = true;
      setScoreState("preparing");
      setScoreDialogOpen(false);
      setScoreMessage("Đang xin quyền micro và tạo phiên chấm điểm…");
      setScoreError("");
      setScoreResult(null);
      stopMicCheck();
      audio.pause();
      audio.currentTime = 0;
      setCurrentTime(0);
      setActiveLyricIndex(-1);
      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        recordingStreamRef.current = stream;
        const session = await startKaraokeSession(track.songId);
        const context = new AudioContext({ latencyHint: "interactive" });
        recordingAudioContextRef.current = context;
        await context.audioWorklet.addModule("/karaoke-pitch-worklet.js");
        const source = context.createMediaStreamSource(stream);
        const processor = new AudioWorkletNode(context, "karaoke-pitch-processor", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        const mute = context.createGain();
        mute.gain.value = 0;
        source.connect(processor);
        processor.connect(mute);
        mute.connect(context.destination);
        pitchProcessorRef.current = processor;
        activeScoreSessionRef.current = session;
        pitchFeaturesRef.current = { f0_hz: [], voiced_probability: [] };
        discardRecordingRef.current = false;
        processor.port.onmessage = (event: MessageEvent) => {
          const message = event.data as {
            type?: string;
            f0_hz?: Array<number | null>;
            voiced_probability?: number[];
            duration_seconds?: number;
            rms_dbfs?: number;
            clipped_fraction?: number;
            frame_count?: number;
          };
          if (message.type === "features" && message.f0_hz && message.voiced_probability) {
            pitchFeaturesRef.current.f0_hz.push(...message.f0_hz);
            pitchFeaturesRef.current.voiced_probability.push(...message.voiced_probability);
          } else if (message.type === "summary") {
            const waiter = pitchSummaryWaiterRef.current;
            if (waiter && message.duration_seconds !== undefined
                && message.rms_dbfs !== undefined && message.clipped_fraction !== undefined
                && message.frame_count !== undefined) {
              window.clearTimeout(waiter.timeoutId);
              pitchSummaryWaiterRef.current = null;
              waiter.resolve(message as PitchCaptureSummary);
            }
          }
        };

        await context.resume();
        await audio.play();
        recordingStartOffsetRef.current = Math.round(audio.currentTime * 1000);
        processor.port.postMessage({ type: "start" });
        setScoreState("recording");
        setScoreMessage(
          "Đang phân tích giọng hát. Hãy đeo tai nghe; điểm tổng sẽ hiện sau khi bài kết thúc.",
        );
      } catch (error) {
        discardRecordingRef.current = true;
        discardActiveRecording();
        (stream ?? recordingStreamRef.current)
          ?.getTracks()
          .forEach((track) => track.stop());
        recordingStreamRef.current = null;
        audio.pause();
        setScoreState("error");
        setScoreMessage("");
        setScoreError(
          error instanceof Error
            ? error.message
            : "Không thể bắt đầu ghi âm để chấm điểm.",
        );
      } finally {
        scoreStartLockRef.current = false;
      }
    },
    [discardActiveRecording, stopMicCheck],
  );

  useEffect(() => {
    if (!isPlaying || syncedLyrics.length === 0) return;
    let frame = 0;
    let lastClockUpdate = 0;
    const tick = (now: number) => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      const nextLine = findLyricLineAtTime(syncedLyrics, audio.currentTime);
      setActiveLyricIndex((previous) =>
        previous === nextLine ? previous : nextLine,
      );
      if (now - lastClockUpdate >= 100) {
        setCurrentTime(audio.currentTime);
        lastClockUpdate = now;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [isPlaying, song?.songId, syncedLyrics]);

  const requestPlayback = useCallback((audio: HTMLAudioElement) => {
    void audio.play().catch((error: unknown) => {
      setIsPlaying(false);
      setPlaybackError(
        errorName(error) === "NotAllowedError"
          ? "Trình duyệt chặn phát tự động. Nhấn nút Phát để bắt đầu."
          : "Không tải được nhạc nền. Hãy kiểm tra kết nối rồi thử phát lại.",
      );
    });
  }, []);

  const handleSelect = useCallback(
    (track: KaraokeTrackSummary) => {
      if (
        scoreStartLockRef.current ||
        scoreState === "preparing" ||
        scoreState === "uploading"
      ) {
        setScoreError(
          "Đang chuẩn bị hoặc gửi bản thu; hãy đợi thao tác này hoàn tất rồi chọn bài khác.",
        );
        return;
      }
      if (scoreState === "recording") {
        discardActiveRecording();
        audioRef.current?.pause();
        setIsPlaying(false);
      }
      setSong(track);
      setCurrentTime(0);
      setActiveLyricIndex(-1);
      setDuration((track.durationMs ?? 0) / 1000);
      setPlaybackError("");
      setScoreState("idle");
      setScoreMessage("");
      setScoreError("");
      setScoreDialogOpen(false);
      setScoreResult(null);

      const audio = audioRef.current;
      if (!audio || !track.instrumentalUrl) {
        setIsPlaying(false);
        setPlaybackError(
          "Bài này chưa có URL nhạc nền. Hãy tải lại danh sách hoặc kiểm tra backend.",
        );
        return;
      }

      audio.pause();
      audio.src = track.instrumentalUrl;
      audio.currentTime = 0;
      audio.load();
      if (track.scoringAvailable) {
        void beginScoring(track, audio);
      } else {
        requestPlayback(audio);
      }
    },
    [beginScoring, discardActiveRecording, requestPlayback, scoreState],
  );

  const togglePlayback = useCallback(() => {
    if (scoreState === "recording") {
      cancelScoring();
      return;
    }
    const audio = audioRef.current;
    if (!audio || !song?.instrumentalUrl) return;
    if (audio.paused) {
      setPlaybackError("");
      requestPlayback(audio);
    } else {
      audio.pause();
    }
  }, [cancelScoring, requestPlayback, scoreState, song?.instrumentalUrl]);

  const startMicCheck = useCallback(async () => {
    if (!window.isSecureContext) {
      setMicState("error");
      setMicError(
        "Trình duyệt chỉ cho phép dùng micro trên localhost hoặc trang HTTPS.",
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState("error");
      setMicError("Trình duyệt này không hỗ trợ truy cập micro.");
      return;
    }

    setMicState("requesting");
    setMicError("");
    setMicMessage("");
    let context: AudioContext | null = null;
    let stream: MediaStream | null = null;
    try {
      context = new window.AudioContext();
      await context.resume();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);
      micStreamRef.current = stream;
      micContextRef.current = context;

      const samples = new Uint8Array(analyser.fftSize);
      let lastUpdate = 0;
      const sampleInput = () => {
        if (!micStreamRef.current) return;
        analyser.getByteTimeDomainData(samples);
        let squaredTotal = 0;
        for (let index = 0; index < samples.length; index += 1) {
          const amplitude = (samples[index] - 128) / 128;
          squaredTotal += amplitude * amplitude;
        }
        const level = Math.min(
          100,
          Math.round(Math.sqrt(squaredTotal / samples.length) * 330),
        );
        const now = performance.now();
        if (now - lastUpdate >= 100) {
          setMicLevel(level);
          lastUpdate = now;
        }
        micAnimationRef.current = window.requestAnimationFrame(sampleInput);
      };
      setMicState("active");
      setMicMessage(
        "Micro đang hoạt động. Hãy nói hoặc hát để xem mức tín hiệu.",
      );
      micAnimationRef.current = window.requestAnimationFrame(sampleInput);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (context && context.state !== "closed")
        void context.close().catch(() => undefined);
      setMicState("error");
      setMicLevel(0);
      setMicError(microphoneError(error));
    }
  }, []);

  useEffect(() => {
    pause();
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      if (audio) {
        audio.removeAttribute("src");
        audio.load();
      }
      discardActiveRecording();
      stopMicCheck(false);
    };
  }, [discardActiveRecording, pause, stopMicCheck]);

  return (
    <main className={styles.page}>
      <div className={styles.pageGlow} aria-hidden="true" />
      <Link href="/dashboard/karaoke" className={styles.backLink}>
        <ArrowLeft size={16} /> Quay lại chọn chế độ
      </Link>

      <section className={styles.intro} aria-labelledby="solo-title">
        <div>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowLine} /> MOODIFY KARAOKE{" "}
            <span className={styles.eyebrowLine} />
          </div>
          <h1 id="solo-title">
            Sân khấu của riêng bạn<span className={styles.titlePeriod}>.</span>
          </h1>
          <p>Chọn một bài đã được chuẩn bị để bắt đầu karaoke.</p>
        </div>
        <div className={styles.roomChip}>
          <span className={styles.roomChipIcon}>
            <Mic2 size={18} />
          </span>
          <span>
            <strong>Hát một mình</strong>
            <small>Kho bài karaoke</small>
          </span>
        </div>
      </section>

      <div className={styles.previewBanner} role="note">
        <Sparkles size={18} aria-hidden="true" />
        <span>
          <strong>Lời chuyển theo mốc câu có sẵn.</strong> Câu hát bám theo thời
          gian phát nhạc và đổi mềm; bài thiếu mốc LRC sẽ không bị tự đoán thời
          điểm.
        </span>
      </div>

      <section className={styles.soloStage} aria-label="Sân khấu karaoke">
        <div className={styles.stageAura} aria-hidden="true" />
        <div className={styles.stageTopline}>
          <div className={styles.soloStageIdentity}>
            <span className={styles.soloStageIdentityIcon} aria-hidden="true">
              <AudioLines size={17} />
            </span>
            <span className={styles.soloStageIdentityText}>
              <small>MOODIFY KARAOKE</small>
              <strong>Sân khấu của bạn</strong>
            </span>
          </div>
          {!song && <span className={styles.stageRoom}>HÁT MỘT MÌNH</span>}
        </div>

        <div className={styles.stageContent}>
          {!song && (
            <div className={styles.stagePerformer}>
              <h2>Chọn bài để bắt đầu</h2>
              <div className={styles.performerType}>
                <span /> HÁT MỘT MÌNH
              </div>
            </div>
          )}

          <div className={styles.stageSong} aria-live="polite">
            <Music2 size={16} aria-hidden="true" />
            <span>
              <strong>{song?.title ?? "Chưa chọn bài hát"}</strong>
              <small>
                {song?.artist ?? "Chọn một bài trong danh sách bên dưới"}
              </small>
            </span>
          </div>

          <div className={styles.lyrics} aria-live="off">
            {!song ? (
              <p className={styles.soloLyricFaded}>
                Chọn một bài đã chuẩn bị để bắt đầu.
              </p>
            ) : !hasLyrics ? (
              <>
                <p className={styles.soloLyricFaded}>
                  {song.scoringAvailable
                    ? "Có thể chấm điểm sau khi hát"
                    : "Nhạc nền đã sẵn sàng"}
                </p>
                <p className={styles.soloLyricActive}>
                  Bài hát này chưa có lời trong dữ liệu.
                </p>
                <p className={styles.soloLyricFaded}>
                  Bạn vẫn có thể nghe nhạc nền karaoke.
                </p>
              </>
            ) : syncedLyrics.length === 0 ? (
              <>
                <p className={styles.soloLyricFaded}>
                  Bài này chưa có lời đồng bộ theo thời gian
                </p>
                <p className={styles.soloLyricActive}>
                  Nhạc nền vẫn phát bình thường.
                </p>
                <p className={styles.soloLyricFaded}>
                  Dữ liệu hiện chỉ có lời văn bản, chưa có mốc LRC; hệ thống
                  không tự chia lời theo thời lượng.
                </p>
              </>
            ) : (
              <>
                <p
                  className={styles.soloLyricActive}
                  key={`${song.songId}:active:${activeLyric?.startMs ?? "waiting"}`}
                >
                  {activeLyric?.text ??
                    (isPlaying
                      ? "Sắp đến câu đầu tiên…"
                      : "Nhấn Phát để bắt đầu")}
                </p>
                <div className={styles.soloLyricPreviewSlot}>
                  {upcomingLyric ? (
                    <p
                      className={styles.soloLyricPreview}
                      key={`${song.songId}:upcoming:${upcomingLyric.startMs}`}
                    >
                   
                      <span>{upcomingLyric.text}</span>
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>

        <div
          className={styles.playbackControls}
          aria-label="Điều khiển nhạc nền"
        >
          <button
            type="button"
            className={styles.playbackButton}
            onClick={togglePlayback}
            disabled={
              !song?.instrumentalUrl ||
              scoreState === "preparing" ||
              scoreState === "uploading"
            }
            aria-label={
              scoreState === "recording"
                ? "Dừng và hủy bản thu"
                : isPlaying
                  ? "Tạm dừng nhạc nền"
                  : "Phát nhạc nền"
            }
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {scoreState === "recording"
              ? "Dừng & hủy"
              : isPlaying
                ? "Tạm dừng"
                : "Phát"}
          </button>
          <span className={styles.playbackClock}>
            {formatClock(currentTime)}
          </span>
          <input
            className={styles.seekSlider}
            type="range"
            min={0}
            max={totalDuration > 0 ? totalDuration : 1}
            step={0.1}
            value={Math.min(currentTime, totalDuration || 0)}
            disabled={
              !song ||
              totalDuration <= 0 ||
              scoreState === "preparing" ||
              scoreState === "recording" ||
              scoreState === "uploading"
            }
            aria-label="Tua bài hát"
            onChange={(event) => {
              const time = Number(event.currentTarget.value);
              setCurrentTime(time);
              if (audioRef.current) {
                audioRef.current.currentTime = time;
                setActiveLyricIndex(findLyricLineAtTime(syncedLyrics, time));
              }
            }}
          />
          <span className={styles.playbackClock}>
            {formatClock(totalDuration)}
          </span>
        </div>
        {playbackError && (
          <p className={styles.playbackError} role="alert">
            {playbackError}
          </p>
        )}
        <audio
          ref={audioRef}
          preload="none"
          onTimeUpdate={(event) => {
            const time = event.currentTarget.currentTime;
            setCurrentTime(time);
            setActiveLyricIndex(findLyricLineAtTime(syncedLyrics, time));
          }}
          onLoadedMetadata={(event) => {
            const mediaDuration = event.currentTarget.duration;
            if (Number.isFinite(mediaDuration)) setDuration(mediaDuration);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(audioRef.current?.currentTime ?? currentTime);
            if (pitchProcessorRef.current && activeScoreSessionRef.current) {
              setScoreMessage("Bài hát đã kết thúc. Đang hoàn tất bản thu…");
              void finishScoring();
            }
          }}
          onError={() => {
            setIsPlaying(false);
            setPlaybackError(
              "Không mở được file nhạc nền. Hãy kiểm tra đường dẫn karaoke và thử lại.",
            );
            if (pitchProcessorRef.current) {
              discardActiveRecording();
              setScoreState("error");
              setScoreMessage("");
              setScoreError(
                "Nhạc nền bị ngắt nên bản thu đã được hủy, chưa gửi để chấm điểm.",
              );
            }
          }}
        />

        <div className={styles.stageProgress} aria-label="Trạng thái bài hát">
          <span>{formatDuration(song?.durationMs ?? null)}</span>
          <span>
            {song
              ? song.scoringAvailable
                ? "Hỗ trợ chấm điểm"
                : "Chưa có dữ liệu chấm điểm"
              : "Chưa chọn bài"}
          </span>
        </div>
      </section>

      <section
        className={styles.deviceCard + " " + styles.soloControls}
        aria-labelledby="device-heading"
      >
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
          <span className={styles.sectionKicker}>THIẾT BỊ CỦA BẠN</span>
          <h2 id="device-heading">Sẵn sàng để cất giọng?</h2>
          {micMessage && (
            <p className={styles.micMessage} role="status">
              {micMessage}
            </p>
          )}
          {micError && (
            <p className={styles.micError} role="alert">
              {micError}
            </p>
          )}
          {scoreMessage && (
            <p className={styles.scoreMessage} role="status">
              {scoreMessage}
            </p>
          )}
          {scoreError && (
            <p className={styles.scoreError} role="alert">
              {scoreError}
            </p>
          )}
          {song && !song.scoringAvailable && (
            <p className={styles.scoreMessage} role="status">
              Bài này chưa có dữ liệu tham chiếu đủ tin cậy để chấm điểm.
            </p>
          )}
          {micState === "active" && (
            <div className={styles.micMeterRow}>
              <span>Mức âm</span>
              <div
                className={styles.micMeter}
                role="meter"
                aria-label="Mức tín hiệu micro"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={micLevel}
              >
                <span style={{ transform: "scaleX(" + micLevel / 100 + ")" }} />
              </div>
              <span>{micLevel > 5 ? "Có tín hiệu" : "Hãy nói hoặc hát"}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className={styles.micCheckButton}
          onClick={() =>
            micState === "active" ? stopMicCheck() : void startMicCheck()
          }
          disabled={
            micState === "requesting" ||
            scoreState === "preparing" ||
            scoreState === "recording" ||
            scoreState === "uploading"
          }
          aria-pressed={micState === "active"}
        >
          {micState === "active" ? (
            <AudioLines size={16} />
          ) : (
            <Mic2 size={16} />
          )}
          {micState === "requesting"
            ? "Đang xin quyền..."
            : micState === "active"
              ? "Dừng kiểm tra"
              : "Kiểm tra micro"}
        </button>
      </section>

      <section
        className={styles.soloCatalog}
        aria-labelledby="karaoke-catalog-heading"
      >
        <div className={styles.soloCatalogHeader}>
          <div>
            <span className={styles.sectionKicker}>KHO BÀI ĐÃ CHUẨN BỊ</span>
            <h2 id="karaoke-catalog-heading">Chọn bài hát để Karaoke</h2>
          </div>
        </div>
        <KaraokeTrackCatalog
          selectedSongId={song?.songId ?? null}
          onSelect={handleSelect}
          autoSelectFirst={false}
        />
      </section>
      {scoreDialogOpen && scoreResult?.score && typeof document !== "undefined"
        ? createPortal(
            <div
              className={styles.scoreModalBackdrop}
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) {
                  setScoreDialogOpen(false);
                }
              }}
            >
              <section
                ref={scoreDialogRef}
                className={styles.scoreModal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="karaoke-score-title"
                aria-describedby="karaoke-score-description"
                tabIndex={-1}
              >
                <button
                  ref={scoreDialogCloseRef}
                  type="button"
                  className={styles.scoreModalClose}
                  onClick={() => setScoreDialogOpen(false)}
                  aria-label="Đóng kết quả"
                >
                  <X size={17} />
                </button>
                <div className={styles.scoreModalMark} aria-hidden="true">
                  <AudioLines size={20} strokeWidth={1.8} />
                </div>
                <p className={styles.scoreModalEyebrow}>KẾT QUẢ KARAOKE</p>
                <h2 id="karaoke-score-title">Điểm tổng của bạn</h2>
                {song?.title && (
                  <p className={styles.scoreModalSong} title={song.title}>
                    {song.title}
                  </p>
                )}
                <div className={styles.scoreModalValue}>
                  <strong>{overallScore.toFixed(1)}</strong>
                  <span>/ 100</span>
                </div>
                <div
                  className={styles.scoreModalProgress}
                  role="meter"
                  aria-label="Điểm tổng"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={scoreProgress}
                >
                  <span style={{ width: scoreProgress + "%" }} />
                </div>
                <p
                  id="karaoke-score-description"
                  className={styles.scoreModalDescription}
                >
                  Cảm ơn bạn đã hát cùng Moodify.
                </p>
                <button
                  type="button"
                  className={styles.scoreModalAction}
                  onClick={() => setScoreDialogOpen(false)}
                >
                  Tiếp tục
                </button>
              </section>
            </div>,
            document.body,
          )
        : null}
    </main>
  );
}
