"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchKaraokeRoomScoreSession,
  finishKaraokeRoomScoreSession,
  registerKaraokeRoomScoreParticipant,
  startKaraokeRoomScoreSession,
  submitKaraokeRoomContribution,
  type KaraokePitchFeatures,
  type KaraokeRoomPitchSegment,
  type KaraokeRoomScoreSession,
} from "@/lib/api-client";

type CaptureSummary = {
  duration_seconds: number;
  rms_dbfs: number;
  clipped_fraction: number;
  frame_count: number;
};

type ActiveCapture = {
  context: AudioContext;
  processor: AudioWorkletNode;
  source: MediaStreamAudioSourceNode;
  mute: GainNode;
  offsetMs: number;
  pitches: Array<number | null>;
  probabilities: number[];
  resolveSummary: ((summary: CaptureSummary) => void) | null;
};

type RoomRun = {
  roomId: number;
  runId: string;
  songId: string;
  durationMs: number;
  sessionPromise: Promise<KaraokeRoomScoreSession>;
  participantPromise: Promise<KaraokeRoomScoreSession> | null;
  activeCapture: ActiveCapture | null;
  captureStarting: boolean;
  segments: KaraokeRoomPitchSegment[];
  lastPositionMs: number;
  closed: boolean;
  finishing: boolean;
};

function scoreFromSession(session: KaraokeRoomScoreSession | null): number | null {
  const value = session?.score?.score?.overall;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function useKaraokeRoomScoring(input: {
  roomId: number;
  playbackRunId: string | null;
  songId: string | null;
  songTitle: string | null;
  durationMs: number | null;
  playbackStatus: "IDLE" | "PLAYING" | "PAUSED";
  positionMs: number;
  microphoneStream: MediaStream | null;
  enabled: boolean;
}) {
  const runRef = useRef<RoomRun | null>(null);
  const microphoneStreamRef = useRef(input.microphoneStream);
  const playbackStatusRef = useRef(input.playbackStatus);
  const watchedTitlesRef = useRef(new Map<string, string>());
  const watchedStatusesRef = useRef(new Map<string, KaraokeRoomScoreSession["status"]>());
  const [watchedSessionIds, setWatchedSessionIds] = useState<string[]>([]);
  const [scoringStatus, setScoringStatus] = useState<KaraokeRoomScoreSession["status"] | "idle">("idle");
  const [score, setScore] = useState<number | null>(null);
  const [scoreSessionId, setScoreSessionId] = useState("");
  const [scoreSongTitle, setScoreSongTitle] = useState("");
  const [scoreError, setScoreError] = useState("");
  const [capturing, setCapturing] = useState(false);

  microphoneStreamRef.current = input.microphoneStream;
  playbackStatusRef.current = input.playbackStatus;

  const stopCapture = useCallback(async (run: RoomRun, discard = false) => {
    const capture = run.activeCapture;
    if (!capture) return;
    run.activeCapture = null;
    setCapturing(false);

    if (discard || capture.context.state === "closed") {
      capture.processor.port.postMessage({ type: "abort" });
      capture.processor.port.onmessage = null;
      capture.source.disconnect();
      capture.processor.disconnect();
      capture.mute.disconnect();
      void capture.context.close().catch(() => undefined);
      return;
    }

    let timeoutId = 0;
    try {
      const summary = await new Promise<CaptureSummary>((resolve, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error("Không thể hoàn tất phân tích giọng hát trong phòng.")), 5000);
        capture.resolveSummary = resolve;
        capture.processor.port.postMessage({ type: "finalize" });
      });
      if (capture.pitches.length === summary.frame_count && capture.probabilities.length === summary.frame_count
          && summary.duration_seconds > 0.05) {
        const features: KaraokePitchFeatures = {
          duration_seconds: summary.duration_seconds,
          f0_hz: capture.pitches,
          voiced_probability: capture.probabilities,
          rms_dbfs: summary.rms_dbfs,
          clipped_fraction: summary.clipped_fraction,
          recording_start_offset_ms: 0,
          capture_latency_ms: 0,
          allow_octave_shift: true,
        };
        run.segments.push({ offset_ms: capture.offsetMs, features });
        void run.sessionPromise.then(async (session) => {
          if (session.status !== "collecting" || run.segments.length === 0) return;
          run.participantPromise ??= registerKaraokeRoomScoreParticipant(run.roomId, session.sessionId);
          await run.participantPromise;
          await submitKaraokeRoomContribution({ roomId: run.roomId, sessionId: session.sessionId, segments: run.segments });
        }).catch(() => undefined);
      }
    } catch (error) {
      setScoreError(error instanceof Error ? error.message : "Không thể chốt phần giọng hát.");
    } finally {
      window.clearTimeout(timeoutId);
      capture.resolveSummary = null;
      capture.processor.port.onmessage = null;
      capture.source.disconnect();
      capture.processor.disconnect();
      capture.mute.disconnect();
      void capture.context.close().catch(() => undefined);
    }
  }, []);

  const discardRun = useCallback((run: RoomRun) => {
    run.closed = true;
    const capture = run.activeCapture;
    setCapturing(false);
    if (!capture) return;
    run.activeCapture = null;
    capture.processor.port.postMessage({ type: "abort" });
    capture.processor.port.onmessage = null;
    capture.source.disconnect();
    capture.processor.disconnect();
    capture.mute.disconnect();
    if (capture.context.state !== "closed") void capture.context.close().catch(() => undefined);
  }, []);

  const finishRun = useCallback(async (run: RoomRun) => {
    if (run.finishing || run.closed) return;
    run.finishing = true;
    await stopCapture(run);
    try {
      const session = await run.sessionPromise;
      if (session.status === "collecting") {
        if (run.segments.length) {
          await (run.participantPromise ?? registerKaraokeRoomScoreParticipant(run.roomId, session.sessionId));
          await submitKaraokeRoomContribution({ roomId: run.roomId, sessionId: session.sessionId, segments: run.segments });
        }
        const finished = await finishKaraokeRoomScoreSession(run.roomId, session.sessionId);
        setScoringStatus(finished.status);
        const overall = scoreFromSession(finished);
        if (overall !== null) {
          setScore(overall);
          setScoreSessionId(finished.sessionId);
          setScoreSongTitle(input.songTitle ?? "Bài hát trong phòng");
        }
      } else {
        setScoringStatus(session.status);
        const overall = scoreFromSession(session);
        if (overall !== null) {
          setScore(overall);
          setScoreSessionId(session.sessionId);
          setScoreSongTitle(input.songTitle ?? "Bài hát trong phòng");
        }
      }
    } catch (error) {
      setScoreError(error instanceof Error ? error.message : "Không thể gửi dữ liệu chấm điểm cho phòng.");
    } finally {
      run.closed = true;
    }
  }, [input.songTitle, stopCapture]);

  useEffect(() => {
    if (!input.enabled || !input.playbackRunId || !input.songId || !input.durationMs) return;
    const active = runRef.current;
    if (active?.runId === input.playbackRunId && active.songId === input.songId) return;

    if (active) {
      if (active.lastPositionMs >= active.durationMs - 700) void finishRun(active);
      else discardRun(active);
    }

    setScoreError("");
    const next: RoomRun = {
      roomId: input.roomId,
      runId: input.playbackRunId,
      songId: input.songId,
      durationMs: input.durationMs,
      sessionPromise: startKaraokeRoomScoreSession(input.roomId),
      participantPromise: null,
      activeCapture: null,
      captureStarting: false,
      segments: [],
      lastPositionMs: input.positionMs,
      closed: false,
      finishing: false,
    };
    runRef.current = next;
    setScoringStatus("collecting");
    void next.sessionPromise.then((session) => {
      watchedTitlesRef.current.set(session.sessionId, input.songTitle ?? "Bài hát trong phòng");
      watchedStatusesRef.current.set(session.sessionId, session.status);
      setWatchedSessionIds((current) => current.includes(session.sessionId) ? current : [...current, session.sessionId]);
      setScoringStatus(session.status);
      const overall = scoreFromSession(session);
      if (overall !== null) {
        setScore(overall);
        setScoreSessionId(session.sessionId);
        setScoreSongTitle(input.songTitle ?? "Bài hát trong phòng");
      }
    }).catch((error: unknown) => {
      setScoreError(error instanceof Error ? error.message : "Không thể mở phiên chấm điểm cho phòng.");
      setScoringStatus("failed");
    });

    return () => {
      if (runRef.current !== next) return;
      if (next.lastPositionMs >= next.durationMs - 700) void finishRun(next);
      else discardRun(next);
      runRef.current = null;
    };
  }, [discardRun, finishRun, input.durationMs, input.enabled, input.playbackRunId, input.roomId, input.songId, input.songTitle]);

  useEffect(() => {
    const run = runRef.current;
    if (!run || run.closed) return;
    run.lastPositionMs = input.positionMs;
    if (input.playbackStatus === "PLAYING" && input.positionMs >= run.durationMs - 300) {
      void finishRun(run);
      return;
    }

    if (!input.microphoneStream || input.playbackStatus !== "PLAYING") {
      if (run.activeCapture) void stopCapture(run);
      return;
    }
    if (run.activeCapture || run.captureStarting || run.finishing) return;

    const stream = input.microphoneStream;
    const offsetMs = Math.max(0, Math.min(run.durationMs, input.positionMs));
    run.captureStarting = true;
    void (async () => {
      let context: AudioContext | null = null;
      try {
        const session = await run.sessionPromise;
        if (session.status !== "collecting" || run.closed || runRef.current !== run) return;
        run.participantPromise ??= registerKaraokeRoomScoreParticipant(run.roomId, session.sessionId);
        await run.participantPromise;
        if (run.closed || runRef.current !== run || playbackStatusRef.current !== "PLAYING"
            || microphoneStreamRef.current !== stream
            || !stream.getAudioTracks().some((track) => track.readyState === "live")) return;
        if (!window.isSecureContext || typeof AudioWorkletNode === "undefined" || !window.AudioContext) {
          throw new Error("Trình duyệt cần hỗ trợ AudioWorklet trên HTTPS hoặc localhost để chấm điểm trong phòng.");
        }
        context = new AudioContext({ latencyHint: "interactive" });
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
        const capture: ActiveCapture = {
          context, processor, source, mute, offsetMs, pitches: [], probabilities: [], resolveSummary: null,
        };
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
            capture.pitches.push(...message.f0_hz);
            capture.probabilities.push(...message.voiced_probability);
          } else if (message.type === "summary" && message.duration_seconds !== undefined
              && message.rms_dbfs !== undefined && message.clipped_fraction !== undefined
              && message.frame_count !== undefined) {
            const resolve = capture.resolveSummary;
            if (resolve) resolve(message as CaptureSummary);
          }
        };
        await context.resume();
        if (run.closed || runRef.current !== run || playbackStatusRef.current !== "PLAYING"
            || microphoneStreamRef.current !== stream
            || !stream.getAudioTracks().some((track) => track.readyState === "live")) {
          processor.port.postMessage({ type: "abort" });
          source.disconnect(); processor.disconnect(); mute.disconnect();
          await context.close();
          return;
        }
        run.activeCapture = capture;
        processor.port.postMessage({ type: "start" });
        setCapturing(true);
      } catch (error) {
        if (context && context.state !== "closed") void context.close().catch(() => undefined);
        setScoreError(error instanceof Error ? error.message : "Không thể phân tích micro trong phòng.");
      } finally {
        run.captureStarting = false;
      }
    })();
  }, [finishRun, input.microphoneStream, input.playbackStatus, input.positionMs, stopCapture]);

  useEffect(() => {
    if (!watchedSessionIds.length) return;
    let stopped = false;
    const refresh = async () => {
      await Promise.all(watchedSessionIds.map(async (id) => {
        if (["completed", "failed"].includes(watchedStatusesRef.current.get(id) ?? "collecting")) return;
        try {
          const session = await fetchKaraokeRoomScoreSession(input.roomId, id);
          if (stopped) return;
          watchedStatusesRef.current.set(id, session.status);
          if (runRef.current?.runId === session.playbackRunId || session.status === "completed" || session.status === "failed") {
            setScoringStatus(session.status);
          }
          const overall = scoreFromSession(session);
          if (overall !== null) {
            setScore(overall);
            setScoreSessionId(id);
            setScoreSongTitle(watchedTitlesRef.current.get(id) ?? "Bài hát trong phòng");
          } else if (session.status === "failed") {
            setScoreError("Không thể chấm điểm phiên hát chung. Hãy thử lại ở bài tiếp theo.");
          }
        } catch {
          // Realtime reconnects and the next poll will retry the shared result lookup.
        }
      }));
    };
    const timer = window.setInterval(() => void refresh(), 2500);
    void refresh();
    return () => { stopped = true; window.clearInterval(timer); };
  }, [input.roomId, watchedSessionIds]);

  const trackEnded = useCallback(() => {
    const run = runRef.current;
    if (run) {
      run.lastPositionMs = run.durationMs;
      void finishRun(run);
    }
  }, [finishRun]);

  return { score, scoreSessionId, scoreSongTitle, scoringStatus, scoreError, capturing, trackEnded };
}
