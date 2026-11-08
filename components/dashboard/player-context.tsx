"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Crown, Laptop } from "lucide-react";
import {
  getTrackStreamUrl,
  getBackendFileUrl,
  fetchTrackById,
  fetchMySubscription,
  fetchActiveAdCampaigns,
  recordAdImpression,
  FREE_ENTITLEMENTS,
  type ActiveAd,
  resolveTrackAudioUrl,
  type PackageEntitlements,
} from "@/lib/api-client";
import { recordPlatformVisit, recordListeningSessionTelemetry, revokeOtherDevices, pingDeviceStatus } from "@/lib/auth/auth-client";

export type PlayerTrack = {
  id?: string;
  spotifyId: string;
  name: string;
  artistName: string;
  artistSpotifyId?: string | null;
  albumName?: string;
  imageUrl?: string | null;
  durationMs?: number;
  lyricsPlain?: string | null;
  lyricsSynced?: string | null;
  audioUrl?: string | null;
  localPath?: string | null;
  playbackContext?: { source: string; sourceId?: string; queueToken?: string; expiresAt?: string };
};

function sameTrack(left: PlayerTrack, right: PlayerTrack) {
  if (left.id && right.id) return left.id === right.id;
  return Boolean(left.spotifyId && right.spotifyId && left.spotifyId === right.spotifyId);
}

function capturePlaybackContext(track?: PlayerTrack | null): NonNullable<PlayerTrack["playbackContext"]> {
  if (track?.playbackContext) return track.playbackContext;
  if (typeof window === "undefined") return { source: "OTHER" };
  const url = new URL(window.location.href);
  const playlistId = url.searchParams.get("playlistId");
  if (playlistId) return { source: "PLAYLIST", sourceId: playlistId };
  if (url.pathname.includes("/library")) return { source: "LIBRARY" };
  if (url.pathname.includes("/search")) return { source: "SEARCH" };
  return { source: "HOME" };
}

function telemetryContext(context: PlayerTrack["playbackContext"]) {
  if (!context) return { source: "OTHER" };
  const { expiresAt, ...fields } = context;
  return expiresAt && Date.parse(expiresAt) <= Date.now() ? { ...fields, queueToken: undefined } : fields;
}

export type RepeatMode = "off" | "all" | "one";

export type SubTier = "FAMILY" | "INDIVIDUAL_FULL" | "INDIVIDUAL_BASIC" | "FREE";
export type AdReason = "FREE_REGULAR" | "BASIC_DAILY_LIMIT_EXCEEDED" | "SKIP_PENALTY" | null;

interface PlayerContextType {
  currentTrack: PlayerTrack | null;
  isPlayerBarHidden: boolean;
  setPlayerBarHidden: (hidden: boolean) => void;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  queue: PlayerTrack[];
  queueIndex: number;
  isAdPlaying: boolean;
  adSecondsRemaining: number;
  adTotalDuration: number;
  isPremiumUser: boolean;
  subTier: SubTier;
  adReason: AdReason;
  dailyTracksCount: number;
  dailySkipsCount: number;
  skipLimitNotice: { show: boolean; message: string; tier: SubTier } | null;
  clearSkipLimitNotice: () => void;
  skipAd: (force?: boolean) => void;
  triggerAd: (force?: boolean, trackToPlayAfter?: PlayerTrack, playlistToPlayAfter?: PlayerTrack[], reason?: AdReason) => void;
  playTrack: (track: PlayerTrack, playlist?: PlayerTrack[]) => void;
  addToQueue: (track: PlayerTrack) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (timeSeconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// ── Daily Quota Storage Helpers ──────────────────────────────
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDailyStats(): { tracks: number; skips: number } {
  if (typeof window === "undefined") return { tracks: 0, skips: 0 };
  try {
    const raw = localStorage.getItem(`moodify_daily_${getTodayKey()}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { tracks: 0, skips: 0 };
}

function recordDailyTrackPlayed(): number {
  if (typeof window === "undefined") return 1;
  const stats = getDailyStats();
  stats.tracks += 1;
  try {
    localStorage.setItem(`moodify_daily_${getTodayKey()}`, JSON.stringify(stats));
  } catch (_) {}
  return stats.tracks;
}

function recordDailySkip(): number {
  if (typeof window === "undefined") return 1;
  const stats = getDailyStats();
  stats.skips += 1;
  try {
    localStorage.setItem(`moodify_daily_${getTodayKey()}`, JSON.stringify(stats));
  } catch (_) {}
  return stats.skips;
}

// ── Playback State Persistence Helpers ───────────────────────
const PLAYBACK_STATE_KEY = "moodify_playback_state";
const PLAYER_BAR_HIDDEN_KEY = "moodify-player-bar-hidden";

export interface PersistedPlaybackState {
  currentTrack: PlayerTrack | null;
  currentTime: number;
  duration: number;
  queue: PlayerTrack[];
  queueIndex: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  playbackRate: number;
  savedAt: number;
}

function loadPersistedPlaybackState(): PersistedPlaybackState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAYBACK_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as PersistedPlaybackState;
    }
  } catch (_) {}
  return null;
}

function savePersistedPlaybackState(state: Partial<PersistedPlaybackState>) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadPersistedPlaybackState() || {
      currentTrack: null,
      currentTime: 0,
      duration: 0,
      queue: [],
      queueIndex: 0,
      volume: 0.8,
      isMuted: false,
      repeatMode: "off" as RepeatMode,
      isShuffle: false,
      playbackRate: 1,
      savedAt: Date.now(),
    };
    const updated = {
      ...existing,
      ...state,
      savedAt: Date.now(),
    };
    localStorage.setItem(PLAYBACK_STATE_KEY, JSON.stringify(updated));
  } catch (_) {}
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlayerBarHidden, setIsPlayerBarHidden] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const retryCountRef = useRef(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  useEffect(() => {
    try {
      setIsPlayerBarHidden(window.localStorage.getItem(PLAYER_BAR_HIDDEN_KEY) === "true");
    } catch (_) {}
  }, []);

  const setPlayerBarHidden = useCallback((hidden: boolean) => {
    setIsPlayerBarHidden(hidden);
    try {
      window.localStorage.setItem(PLAYER_BAR_HIDDEN_KEY, String(hidden));
    } catch (_) {}
  }, []);

  // ── Playback Speed ───────────────────────────────────────────
  const [playbackRate, setPlaybackRateState] = useState(1);
  const playbackRateRef = useRef(1);

  // ── Persistence State Tracking ───────────────────────────────
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const currentTimeRef = useRef(0);
  const lastTimeSaveRef = useRef(0);
  const volumeRef = useRef(0.8);
  const isMutedRef = useRef(false);
  const durationRef = useRef(0);
  const sourceGenerationRef = useRef(0);
  const pendingPositionRef = useRef<{ src: string; seconds: number; restored?: boolean } | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearRetry = useCallback(() => {
    if (retryTimerRef.current !== null) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  }, []);

  // ── Shuffle & Repeat Mode ────────────────────────────────────
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const isShuffleRef = useRef(false);
  const repeatModeRef = useRef<RepeatMode>("off");
  const queueRef = useRef<PlayerTrack[]>([]);
  const queueIndexRef = useRef(0);
  const historyIndicesRef = useRef<number[]>([]);
  const shuffleRemainingRef = useRef<number[] | null>(null);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    queueRef.current = queue;
    queueIndexRef.current = queueIndex;
  }, [queue, queueIndex]);

  const currentTrackRef = useRef<PlayerTrack | null>(null);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // ── Restore Persisted Playback State on Client Mount ───────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = loadPersistedPlaybackState();
      if (saved && saved.currentTrack) {
        setCurrentTrack(saved.currentTrack);
        currentTrackRef.current = saved.currentTrack;

        const restoredDuration = Number.isFinite(saved.duration) && saved.duration > 0
          ? saved.duration : (saved.currentTrack.durationMs ?? 0) / 1000;
        const restoredTime = Number.isFinite(saved.currentTime) && saved.currentTime >= 0 &&
          (!restoredDuration || saved.currentTime < restoredDuration - 0.25) ? saved.currentTime : 0;
        setCurrentTime(restoredTime);
        currentTimeRef.current = restoredTime;

        setDuration(restoredDuration);
        durationRef.current = restoredDuration;

        if (Array.isArray(saved.queue) && saved.queue.length > 0) {
          setQueue(saved.queue);
          queueRef.current = saved.queue;
        } else {
          setQueue([saved.currentTrack]);
          queueRef.current = [saved.currentTrack];
        }

        const restoredIndex = queueRef.current.findIndex(item => sameTrack(item, saved.currentTrack!));
        if (restoredIndex < 0) {
          queueRef.current = [saved.currentTrack];
          setQueue(queueRef.current);
        }
        queueIndexRef.current = Math.max(0, restoredIndex);
        setQueueIndex(queueIndexRef.current);

        if (typeof saved.volume === "number") {
          setVolumeState(saved.volume);
          volumeRef.current = saved.volume;
        }

        if (typeof saved.isMuted === "boolean") {
          setIsMuted(saved.isMuted);
          isMutedRef.current = saved.isMuted;
        }

        if (saved.repeatMode) {
          setRepeatMode(saved.repeatMode);
          repeatModeRef.current = saved.repeatMode;
        }

        if (typeof saved.isShuffle === "boolean") {
          setIsShuffle(saved.isShuffle);
          isShuffleRef.current = saved.isShuffle;
        }

        if (typeof saved.playbackRate === "number") {
          setPlaybackRateState(saved.playbackRate);
          playbackRateRef.current = saved.playbackRate;
        }
      }
    } catch (e) {
      console.warn("Failed to restore playback state from localStorage:", e);
    } finally {
      setHasRestoredState(true);
    }
  }, []);

  // ── Continuous Playback State Persistence ────────────────────
  useEffect(() => {
    if (!hasRestoredState || !currentTrack) return;
    savePersistedPlaybackState({
      currentTrack,
      queue,
      queueIndex,
      volume,
      isMuted,
      repeatMode,
      isShuffle,
      playbackRate,
      currentTime: currentTimeRef.current,
      duration: durationRef.current || (currentTrack.durationMs ? currentTrack.durationMs / 1000 : 0),
    });
  }, [hasRestoredState, currentTrack, queue, queueIndex, volume, isMuted, repeatMode, isShuffle, playbackRate]);

  // ── Audio Ad Management & Tiered Quotas ──────────────────────
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [subTier, setSubTier] = useState<SubTier>("FREE");
  // Quyền hạn theo gói do backend trả về (features_json) — nguồn quyết định
  // hạn mức quảng cáo/skip thật thay vì số cứng ở client.
  const [entitlements, setEntitlements] = useState<PackageEntitlements>(FREE_ENTITLEMENTS);
  const entitlementsRef = useRef<PackageEntitlements>(FREE_ENTITLEMENTS);
  // Danh sách quảng cáo ACTIVE do admin quản lý (backend); rỗng = fallback mix cứng
  const [activeAds, setActiveAds] = useState<ActiveAd[]>([]);
  const activeAdsRef = useRef<ActiveAd[]>([]);
  useEffect(() => {
    entitlementsRef.current = entitlements;
  }, [entitlements]);
  useEffect(() => {
    activeAdsRef.current = activeAds;
  }, [activeAds]);
  const [adReason, setAdReason] = useState<AdReason>(null);
  const [dailyTracksCount, setDailyTracksCount] = useState<number>(0);
  const [dailySkipsCount, setDailySkipsCount] = useState<number>(0);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const isAdPlayingRef = useRef(false);
  useEffect(() => { isAdPlayingRef.current = isAdPlaying; }, [isAdPlaying]);
  const [adSecondsRemaining, setAdSecondsRemaining] = useState(0);
  const [adTotalDuration, setAdTotalDuration] = useState(0);
  const [skipLimitNotice, setSkipLimitNotice] = useState<{ show: boolean; message: string; tier: SubTier } | null>(null);
  const clearSkipLimitNotice = useCallback(() => setSkipLimitNotice(null), []);

  const [deviceRevokedNotice, setDeviceRevokedNotice] = useState<{ show: boolean; message: string } | null>(null);
  const [isReclaimingDevice, setIsReclaimingDevice] = useState(false);

  useEffect(() => {
    const handleDeviceRevoked = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      const msg =
        customEvent.detail?.message ||
        "Thiết bị này đã bị thu hồi quyền truy cập do tài khoản đã đăng nhập trên thiết bị khác vượt quá hạn mức thiết bị của gói cước.";

      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (_) {}
      }
      if (adAudioRef.current) {
        try {
          adAudioRef.current.pause();
        } catch (_) {}
      }
      playbackIntentRef.current = false;
      sourceGenerationRef.current += 1;
      clearRetry();
      setIsPlaying(false);
      setIsAdPlaying(false);

      setDeviceRevokedNotice({
        show: true,
        message: msg,
      });
    };

    window.addEventListener("moodify:device-revoked", handleDeviceRevoked);
    return () => {
      window.removeEventListener("moodify:device-revoked", handleDeviceRevoked);
    };
  }, [clearRetry]);

  const handleReclaimDevice = useCallback(async () => {
    try {
      setIsReclaimingDevice(true);
      await revokeOtherDevices();
      setDeviceRevokedNotice(null);
      if (audioRef.current && currentTrack) {
        playbackIntentRef.current = true;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    } catch (err) {
      console.error("Could not reclaim device:", err);
    } finally {
      setIsReclaimingDevice(false);
    }
  }, [currentTrack]);

  // Periodic device status heartbeat while playing or when tab gains focus
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const checkStatus = async () => {
      if (typeof window === "undefined" || !playbackIntentRef.current) return;
      try {
        await pingDeviceStatus();
      } catch (_) {
        // Handled automatically via requestJson 403 DEVICE_REVOKED
      }
    };

    if (playbackIntentRef.current) {
      // Keep the device session alive while playback is intended, including
      // brief browser/OS pauses while this tab is in the background.
      timer = setInterval(checkStatus, 6000);
    }

    const handleFocusOrVisible = () => {
      if (typeof document === "undefined" || document.visibilityState !== "visible") return;

      void pingDeviceStatus();

      // Some browsers or operating systems pause background media. Resume only
      // when playback was active before it paused, never after an explicit stop.
      if (!playbackIntentRef.current || resumeAttemptRef.current) return;
      const audio = isAdPlaying ? adAudioRef.current : audioRef.current;
      if (!audio?.paused) return;
      if (!isAdPlaying && !currentTrackRef.current) return;

      resumeAttemptRef.current = true;
      void audio.play()
        .then(() => setIsPlaying(true))
        .catch((error) => console.warn("Could not resume background audio:", error))
        .finally(() => {
          resumeAttemptRef.current = false;
        });
    };

    document.addEventListener("visibilitychange", handleFocusOrVisible);
    window.addEventListener("focus", handleFocusOrVisible);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
      window.removeEventListener("focus", handleFocusOrVisible);
    };
  }, [isPlaying, isAdPlaying]);
  const tracksPlayedRef = useRef(0);
  const freeTracksSinceLastAdRef = useRef(0);
  // Random threshold between 1 and 3 songs before next ad
  const freeNextAdThresholdRef = useRef(Math.floor(Math.random() * 3) + 1);
  const pendingTrackRef = useRef<{ track: PlayerTrack; playlist?: PlayerTrack[] } | null>(null);
  const lastAdIndexRef = useRef(-1);
  const lastAdIdRef = useRef<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const adAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackIntentRef = useRef(false);
  const resumeAttemptRef = useRef(false);

  // Load daily stats on mount
  useEffect(() => {
    const s = getDailyStats();
    setDailyTracksCount(s.tracks);
    setDailySkipsCount(s.skips);
  }, []);

  // Check user subscription status + tải quảng cáo ACTIVE từ backend
  useEffect(() => {
    const checkSub = () => {
      fetchMySubscription()
        .then((info) => {
          const isVip = Boolean(info?.isPremium);
          setIsPremiumUser(isVip);
          const tier = (info?.tier as SubTier) || "FREE";
          setSubTier(tier);
          const ents: PackageEntitlements = info?.entitlements
            ? { ...info.entitlements }
            : FREE_ENTITLEMENTS;
          if (!ents.tier) ents.tier = tier;
          setEntitlements(ents);
          if (isVip && ents.adPolicy === "NO_ADS") {
            setIsAdPlaying(false);
            if (adAudioRef.current) {
              adAudioRef.current.pause();
              adAudioRef.current.currentTime = 0;
            }
          }
        })
        .catch(() => {
          setIsPremiumUser(false);
          setSubTier("FREE");
          setEntitlements(FREE_ENTITLEMENTS);
        });
    };

    checkSub();
    window.addEventListener("moodify-subscription-updated", checkSub);
    return () => {
      window.removeEventListener("moodify-subscription-updated", checkSub);
    };
  }, []);

  // Lấy danh sách chiến dịch quảng cáo đang hiệu lực do admin cấu hình.
  // Thất bại hoặc rỗng thì vẫn dùng bộ mix cứng làm dự phòng.
  useEffect(() => {
    fetchActiveAdCampaigns()
      .then((ads) => setActiveAds(Array.isArray(ads) ? ads : []))
      .catch(() => setActiveAds([]));
  }, []);

  // ── Pre-mixed Ad Audio System ──────────────────────────────────
  // 8 pre-mixed MP3 files (all prepended with the Moodify brand sonic ident intro)
  const AD_MIX_COUNT = 8;
  const AD_SKIP_DELAY = 5; // seconds before skip button is enabled

  // Initialize ad audio element
  useEffect(() => {
    if (typeof window === "undefined") return;
    const adAudio = new Audio();
    adAudio.preload = "auto";
    adAudio.volume = 0.95;
    adAudioRef.current = adAudio;

    const onAdTimeUpdate = () => {
      if (adAudio.duration && !isNaN(adAudio.duration)) {
        const remaining = Math.max(0, Math.ceil(adAudio.duration - adAudio.currentTime));
        setAdSecondsRemaining(remaining);
        setAdTotalDuration(Math.ceil(adAudio.duration));
      }
    };

    const onAdEnded = () => {
      isAdPlayingRef.current = false;
      setIsAdPlaying(false);
      setAdReason(null);
      setAdSecondsRemaining(0);
      const pending = pendingTrackRef.current;
      pendingTrackRef.current = null;
      if (!playbackIntentRef.current) return;
      if (pending) {
        executePlayTrackRef.current(pending.track, pending.playlist);
      } else if (audioRef.current) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };

    const onAdError = () => {
      isAdPlayingRef.current = false;
      console.warn("Ad audio failed to play, skipping ad");
      setIsAdPlaying(false);
      setAdReason(null);
      const pending = pendingTrackRef.current;
      pendingTrackRef.current = null;
      if (!playbackIntentRef.current) return;
      if (pending) {
        executePlayTrackRef.current(pending.track, pending.playlist);
      }
    };

    adAudio.addEventListener("timeupdate", onAdTimeUpdate);
    adAudio.addEventListener("ended", onAdEnded);
    adAudio.addEventListener("error", onAdError);

    return () => {
      adAudio.pause();
      adAudio.removeEventListener("timeupdate", onAdTimeUpdate);
      adAudio.removeEventListener("ended", onAdEnded);
      adAudio.removeEventListener("error", onAdError);
      adAudioRef.current = null;
    };
  }, []);

  // Play an ad: ưu tiên chiến dịch ACTIVE từ hệ thống quản lý quảng cáo,
  // fallback về bộ pre-mixed MP3 cứng khi chưa có dữ liệu.
  const playAdAudio = useCallback(() => {
    if (typeof window === "undefined" || !adAudioRef.current) return;
    try {
      const campaigns = activeAdsRef.current;
      if (campaigns.length > 0) {
        // Chọn ngẫu nhiên một chiến dịch (tránh lặp lại ngay lượt trước)
        let picked: ActiveAd;
        do {
          picked = campaigns[Math.floor(Math.random() * campaigns.length)];
        } while (campaigns.length > 1 && picked.id === lastAdIdRef.current);
        lastAdIdRef.current = picked.id;

        adAudioRef.current.src = `${getBackendFileUrl(picked.audioUrl)}?t=${Date.now()}`;
        adAudioRef.current.currentTime = 0;
        adAudioRef.current.load();
        adAudioRef.current
          .play()
          .then(() => {
            console.log(`[Ad] Playing campaign "${picked.title}" (${picked.audioUrl})`);
            void recordAdImpression(picked.id);
          })
          .catch((err) => {
            console.warn("Ad audio autoplay blocked:", err);
          });
        return;
      }

      // Fallback: pre-mixed ad files
      let idx: number;
      do {
        idx = Math.floor(Math.random() * AD_MIX_COUNT) + 1;
      } while (idx === lastAdIndexRef.current && AD_MIX_COUNT > 1);
      lastAdIndexRef.current = idx;

      const adUrl = `/ads/ad_mix_${idx}.mp3?t=${Date.now()}`;
      adAudioRef.current.src = adUrl;
      adAudioRef.current.currentTime = 0;
      adAudioRef.current.load();
      adAudioRef.current
        .play()
        .then(() => {
          console.log(`[Ad] Playing fallback ad_mix_${idx}.mp3`);
        })
        .catch((err) => {
          console.warn("Ad audio autoplay blocked:", err);
        });
    } catch (e) {
      console.warn("Could not play ad audio:", e);
    }
  }, []);

  // ── Listening History & Playback Telemetry ──────────────────
  const listeningSessionRef = useRef<{
    sessionKey: string;
    historyId: number | null;
    trackId: string;
    startedAt: number;
    lastPlayTimestamp: number | null;
    accumulatedDurationMs: number;
    playbackContext: NonNullable<PlayerTrack["playbackContext"]>;
  } | null>(null);

  const flushListeningSession = useCallback((eventType: string = "TRACK_CHANGED") => {
    const session = listeningSessionRef.current;
    if (!session || !session.trackId) return;

    let totalDuration = session.accumulatedDurationMs;
    if (session.lastPlayTimestamp) {
      totalDuration += (Date.now() - session.lastPlayTimestamp);
    }

    const posMs = audioRef.current ? Math.round(audioRef.current.currentTime * 1000) : totalDuration;

    // Ghi nhận đầy đủ 100% mọi phiên nghe và sự kiện vào MySQL listening_history và playback_events
    if (totalDuration > 0 || eventType === "COMPLETE" || eventType === "TRACK_CHANGED" || eventType === "SKIP_NEXT" || eventType === "SKIP_PREVIOUS" || eventType === "PLAYBACK_STOPPED") {
      void recordListeningSessionTelemetry({
        sessionKey: session.sessionKey,
        historyId: session.historyId ?? undefined,
        trackId: session.trackId,
        durationMs: Math.max(0, totalDuration),
        positionMs: Math.max(0, posMs),
        eventType,
        deviceType: "WEB",
        ...telemetryContext(session.playbackContext),
      });
    }

    listeningSessionRef.current = null;
  }, []);

  // Initialize audio element once in browser
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = isMutedRef.current ? 0 : volumeRef.current;
    audio.playbackRate = playbackRateRef.current;
    audioRef.current = audio;

    // Pre-wire restored audio source if present
    const saved = loadPersistedPlaybackState();
    if (saved?.currentTrack) {
      const onlineAudioUrl = resolveTrackAudioUrl(saved.currentTrack);
      audio.src = onlineAudioUrl;
      pendingPositionRef.current = { src: audio.src, seconds: currentTimeRef.current, restored: true };
    }

    const onTimeUpdate = () => {
      if (audio.readyState === 0 || pendingPositionRef.current) return;
      const cur = audio.currentTime;
      setCurrentTime(cur);
      currentTimeRef.current = cur;

      // Throttle saving playback progress to localStorage every 2 seconds
      const now = Date.now();
      if (now - lastTimeSaveRef.current > 2000) {
        lastTimeSaveRef.current = now;
        savePersistedPlaybackState({
          currentTrack: currentTrackRef.current,
          currentTime: cur,
          duration: audio.duration && !isNaN(audio.duration) ? audio.duration : undefined,
        });
      }
    };

    const heartbeat = window.setInterval(() => {
      const session = listeningSessionRef.current;
      if (!session || audio.paused || audio.seeking || audio.readyState < 2) return;
      void recordListeningSessionTelemetry({
        sessionKey: session.sessionKey,
        historyId: session.historyId ?? undefined,
        trackId: session.trackId,
        durationMs: session.accumulatedDurationMs,
        positionMs: Math.round(audio.currentTime * 1000),
        eventType: "HEARTBEAT",
        ...telemetryContext(session.playbackContext),
      });
    }, 5000);

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
        durationRef.current = audio.duration;
      }
      const pending = pendingPositionRef.current;
      if (pending && pending.src === (audio.currentSrc || audio.src)) {
        pendingPositionRef.current = null;
        const position = Number.isFinite(audio.duration)
          ? pending.restored && pending.seconds >= audio.duration - 0.25 ? 0 : Math.min(pending.seconds, audio.duration)
          : pending.seconds;
        try {
          audio.currentTime = position;
        } catch (_) {}
        currentTimeRef.current = position;
        setCurrentTime(position);
      }
    };

    const onPlay = () => {
      if (audio.paused || !playbackIntentRef.current) return;
      playbackIntentRef.current = true;
      const session = listeningSessionRef.current;
      if (session) {
        session.lastPlayTimestamp = Date.now();
        // Nếu đã từng pause và giờ resume lại -> ghi nhận sự kiện RESUME
        if (session.accumulatedDurationMs > 0) {
          const posMs = Math.round(audio.currentTime * 1000);
          void recordListeningSessionTelemetry({
            sessionKey: session.sessionKey,
            historyId: session.historyId ?? undefined,
            trackId: session.trackId,
            durationMs: session.accumulatedDurationMs,
            positionMs: posMs,
            eventType: "RESUME",
            deviceType: "WEB",
            ...telemetryContext(session.playbackContext),
          });
        }
      } else {
        // Playback restored from persisted state or resumed via togglePlay has no
        // listening session yet — create one so heartbeats and revenue qualification keep working.
        const track = currentTrackRef.current;
        const targetTrackId = track ? (track.id || track.spotifyId) : undefined;
        if (targetTrackId) {
          const newSession = {
            sessionKey: crypto.randomUUID(),
            historyId: null as number | null,
            trackId: targetTrackId,
            startedAt: Date.now(),
            lastPlayTimestamp: Date.now(),
            accumulatedDurationMs: 0,
            playbackContext: capturePlaybackContext(track),
          };
          listeningSessionRef.current = newSession;
          void recordListeningSessionTelemetry({
            sessionKey: newSession.sessionKey,
            trackId: targetTrackId,
            durationMs: 0,
            positionMs: Math.round(audio.currentTime * 1000),
            eventType: "PLAY",
            deviceType: "WEB",
            ...telemetryContext(newSession.playbackContext),
          }).then((res) => {
            if (res?.success && res.historyId && listeningSessionRef.current === newSession) {
              listeningSessionRef.current.historyId = res.historyId;
            }
          });
        }
      }
      setIsPlaying(true);
    };

    const onPause = () => {
      // A source replacement queues pause events for the old source. Do not pause the new session.
      if (!audio.paused || audio.ended || audio.readyState === 0) return;
      const session = listeningSessionRef.current;
      if (session && session.lastPlayTimestamp) {
        session.accumulatedDurationMs += (Date.now() - session.lastPlayTimestamp);
        session.lastPlayTimestamp = null;
        const posMs = Math.round(audio.currentTime * 1000);
        void recordListeningSessionTelemetry({
          sessionKey: session.sessionKey,
          historyId: session.historyId ?? undefined,
          trackId: session.trackId,
          durationMs: session.accumulatedDurationMs,
          positionMs: posMs,
          eventType: "PAUSE",
          deviceType: "WEB",
          ...telemetryContext(session.playbackContext),
        });
      }
      setIsPlaying(false);
      savePersistedPlaybackState({
        currentTime: audio.currentTime,
      });
    };

    const onEnded = () => {
      if (!audio.ended) return;
      flushListeningSession("COMPLETE");
      nextTrackRef.current(true);
    };

    const onWaiting = () => {
      setIsBuffering(true);
    };

    const onCanPlay = () => {
      setIsBuffering(false);
      retryCountRef.current = 0;
    };

    const onPlaying = () => {
      if (audio.paused || !playbackIntentRef.current) return;
      playbackIntentRef.current = true;
      setIsBuffering(false);
      setIsPlaying(true);
      retryCountRef.current = 0;
    };

    const onError = (e: Event) => {
      console.warn("Audio playback issue:", e);
      setIsBuffering(false);
      if (!playbackIntentRef.current || isAdPlayingRef.current) return;

      // Tự động khôi phục luồng stream khi mạng yếu/chập chờn với Exponential Backoff & Server Fallback
      if (retryCountRef.current < 3) {
        retryCountRef.current += 1;
        const savedPos = audio.currentTime;
        const generation = sourceGenerationRef.current;
        clearRetry();
        console.log(`[AudioStream] Network hiccup detected. Auto-retrying playback (${retryCountRef.current}/3) at ${savedPos.toFixed(1)}s...`);
        setIsBuffering(true);

        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          if (audioRef.current !== audio || generation !== sourceGenerationRef.current || !playbackIntentRef.current) return;
          const currentTrk = currentTrackRef.current;
          if (!currentTrk) return;

          let targetUrl = resolveTrackAudioUrl(currentTrk);
          // Lần thử thứ 2: fallback sang endpoint streaming của backend gateway
          if (retryCountRef.current >= 2) {
            targetUrl = getTrackStreamUrl(currentTrk.spotifyId || currentTrk.id || "");
          }
          const streamUrl = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}retry=${Date.now()}`;
          audioRef.current.src = streamUrl;
          pendingPositionRef.current = { src: audioRef.current.src, seconds: savedPos };
          currentTimeRef.current = savedPos;
          audioRef.current.load();
          audioRef.current
            .play()
            .then(() => {
              if (generation !== sourceGenerationRef.current || !playbackIntentRef.current) return;
              setIsPlaying(true);
              setIsBuffering(false);
            })
            .catch(() => {});
        }, retryCountRef.current * 1500);
      } else {
        playbackIntentRef.current = false;
        setIsPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);

    // Persist latest state on page reload / tab close / navigation
    const handleBeforeUnload = () => {
      if (currentTrackRef.current) {
        savePersistedPlaybackState({
          currentTrack: currentTrackRef.current,
          currentTime: pendingPositionRef.current?.seconds ?? audioRef.current?.currentTime ?? currentTimeRef.current,
          duration: Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationRef.current,
          queue: queueRef.current,
          queueIndex: queueIndexRef.current,
          volume: volumeRef.current,
          isMuted: isMutedRef.current,
          repeatMode: repeatModeRef.current,
          isShuffle: isShuffleRef.current,
          playbackRate: playbackRateRef.current,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.clearInterval(heartbeat);
      clearRetry();
      sourceGenerationRef.current += 1;
      handleBeforeUnload();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      flushListeningSession("PLAYBACK_STOPPED");
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, [flushListeningSession, clearRetry]);

  // Synchronize audio volume without re-initializing or interrupting the Audio element
  useEffect(() => {
    const effectiveVol = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = effectiveVol;
    }
    if (adAudioRef.current) {
      adAudioRef.current.volume = effectiveVol;
    }
  }, [volume, isMuted]);

  const executePlayTrack = useCallback((track: PlayerTrack, playlist?: PlayerTrack[]) => {
    const attribution = capturePlaybackContext(track);
    track = { ...track, playbackContext: attribution };
    playlist = playlist?.map(item => ({ ...item, playbackContext: item.playbackContext ?? attribution }));
    if (playlist && playlist.length > 0) {
      const sameQueue = queueRef.current.length === playlist.length &&
        queueRef.current.every((item, index) => sameTrack(item, playlist![index]));
      if (!sameQueue) {
        historyIndicesRef.current = [];
        shuffleRemainingRef.current = null;
      }
      queueRef.current = playlist;
      setQueue(playlist);
      const idx = playlist.findIndex(item => sameTrack(item, track));
      queueIndexRef.current = Math.max(0, idx);
      setQueueIndex(queueIndexRef.current);
    } else {
      const index = queueRef.current.findIndex(item => sameTrack(item, track));
      queueRef.current = index < 0 ? [...queueRef.current, track] : queueRef.current.map((item, i) => i === index ? track : item);
      queueIndexRef.current = index < 0 ? queueRef.current.length - 1 : index;
      setQueue(queueRef.current);
      setQueueIndex(queueIndexRef.current);
    }
    if (shuffleRemainingRef.current) {
      shuffleRemainingRef.current = shuffleRemainingRef.current.filter(index => index !== queueIndexRef.current);
    }

    // Telemetry: Flush previous track session and initialize new session
    flushListeningSession("TRACK_CHANGED");
    // Stop the previous audio before assigning the next session; otherwise its
    // pause event would be attributed to the new song.
    audioRef.current?.pause();
    clearRetry();
    const generation = ++sourceGenerationRef.current;
    pendingPositionRef.current = null;
    currentTimeRef.current = 0;
    durationRef.current = (track.durationMs ?? 0) / 1000;
    lastTimeSaveRef.current = 0;
    currentTrackRef.current = track;
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(durationRef.current);
    playbackIntentRef.current = true;
    savePersistedPlaybackState({ currentTrack: track, currentTime: 0, duration: durationRef.current,
      queue: queueRef.current, queueIndex: queueIndexRef.current });
    const targetTrackId = track.id || track.spotifyId;
    if (targetTrackId) {
      const newSession = {
        sessionKey: crypto.randomUUID(),
        historyId: null as number | null,
        trackId: targetTrackId,
        startedAt: Date.now(),
        lastPlayTimestamp: null,
        accumulatedDurationMs: 0,
        playbackContext: attribution,
      };
      listeningSessionRef.current = newSession;

      // Ghi nhận sự kiện khởi phát PLAY ban đầu và lưu historyId
      void recordListeningSessionTelemetry({
        sessionKey: newSession.sessionKey,
        trackId: targetTrackId,
        durationMs: 0,
        positionMs: 0,
        eventType: "PLAY",
        deviceType: "WEB",
        ...telemetryContext(newSession.playbackContext),
      }).then((res) => {
        if (res?.success && res.historyId && listeningSessionRef.current === newSession) {
          listeningSessionRef.current.historyId = res.historyId;
        }
      });

      recordPlatformVisit({
        targetType: "TRACK",
        targetId: targetTrackId,
        platform: "WEB",
        referrerType: "DIRECT",
      });
    }

    // Auto-fetch full track details including lyrics if lyricsSynced or lyricsPlain is missing
    if ((!track.lyricsSynced || !track.lyricsPlain) && track.spotifyId) {
      fetchTrackById(track.spotifyId)
        .then((full) => {
          if (full?.lyricsSynced || full?.lyricsPlain) {
            setCurrentTrack((curr) =>
              curr && curr.spotifyId === track.spotifyId
                ? { ...curr, lyricsSynced: full.lyricsSynced, lyricsPlain: full.lyricsPlain }
                : curr
            );
          }
        })
        .catch(() => {});
    }

    if (audioRef.current) {
      // 1. Immediately pause and flush existing audio buffer to prevent playing old cached audio
      try {
        audioRef.current.pause();
      } catch (_) {}
      
      retryCountRef.current = 0;
      setIsBuffering(true);
      setCurrentTime(0);
      if (track.durationMs) {
        setDuration(track.durationMs / 1000);
      }

      // 2. Set new stream: Luôn ưu tiên phát trực tiếp từ máy chủ đám mây trực tuyến trên mạng (Oracle Cloud Music Server)
      const onlineAudioUrl = resolveTrackAudioUrl(track);
      const streamUrl = `${onlineAudioUrl}${onlineAudioUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
      audioRef.current.src = streamUrl;
      pendingPositionRef.current = { src: audioRef.current.src, seconds: 0 };
      audioRef.current.playbackRate = playbackRateRef.current;
      audioRef.current.load(); // Forces browser to flush old buffer and load new track stream

      audioRef.current
        .play()
        .then(() => {
          if (generation !== sourceGenerationRef.current || !playbackIntentRef.current) return;
          playbackIntentRef.current = true;
          setIsPlaying(true);
          setIsBuffering(false);
        })
        .catch((err) => {
          if (generation !== sourceGenerationRef.current) return;
          console.warn("Autoplay was prevented or audio stream not available:", err);
          playbackIntentRef.current = false;
          setIsPlaying(false);
          setIsBuffering(false);
        });
    }
  }, [flushListeningSession, clearRetry]);

  // Ad completion needs the latest play callback without recreating the ad audio element.
  const executePlayTrackRef = useRef(executePlayTrack);
  useEffect(() => {
    executePlayTrackRef.current = executePlayTrack;
  }, [executePlayTrack]);

  const triggerAd = useCallback((force = false, trackToPlayAfter?: PlayerTrack, playlistToPlayAfter?: PlayerTrack[], reason: AdReason = "FREE_REGULAR") => {
    // Gói NO_ADS (Gia Đình / Cá Nhân FULL) không bị chèn quảng cáo
    if (entitlementsRef.current.adPolicy === "NO_ADS" && !force) return;
    clearRetry();
    if (isAdPlayingRef.current) {
      if (trackToPlayAfter) pendingTrackRef.current = { track: trackToPlayAfter, playlist: playlistToPlayAfter };
      return;
    }
    sourceGenerationRef.current += 1;
    playbackIntentRef.current = true;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch (_) {}
      setIsPlaying(false);
    }
    if (trackToPlayAfter) {
      pendingTrackRef.current = { track: trackToPlayAfter, playlist: playlistToPlayAfter };
    }
    setAdReason(reason);
    isAdPlayingRef.current = true;
    setIsAdPlaying(true);
    setAdSecondsRemaining(20); // approximate, will be corrected by timeupdate
    playAdAudio();
  }, [playAdAudio, clearRetry]);

  const skipAd = useCallback((force = false) => {
    // Chỉ người dùng gói VIP Tiết Kiệm (INDIVIDUAL_BASIC) mới có quyền bấm bỏ qua quảng cáo sớm sau đếm ngược.
    // Người dùng FREE bắt buộc phải nghe trọn vẹn quảng cáo trừ khi chuyển hướng mua gói (force = true) hoặc đã hết thời gian.
    const isSaverVip = subTier === "INDIVIDUAL_BASIC";
    if (!force && !isSaverVip && !isPremiumUser && adSecondsRemaining > 0) {
      return;
    }

    isAdPlayingRef.current = false;
    setIsAdPlaying(false);
    setAdReason(null);
    // Stop ad audio
    if (adAudioRef.current) {
      adAudioRef.current.pause();
      adAudioRef.current.currentTime = 0;
    }
    const pending = pendingTrackRef.current;
    pendingTrackRef.current = null;
    if (pending) {
      executePlayTrack(pending.track, pending.playlist);
    } else if (audioRef.current && currentTrack) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [executePlayTrack, currentTrack, subTier, isPremiumUser, adSecondsRemaining]);

  const playTrack = useCallback((track: PlayerTrack, playlist?: PlayerTrack[]) => {
    if (isAdPlayingRef.current) {
      pendingTrackRef.current = { track, playlist };
      return;
    }
    const todayTracks = recordDailyTrackPlayed();
    setDailyTracksCount(todayTracks);
    const ent = entitlementsRef.current;

    // Rule 1: Gói không quảng cáo hoàn toàn (admin cấu hình adPolicy = NO_ADS)
    if (ent.adPolicy === "NO_ADS") {
      executePlayTrack(track, playlist);
      return;
    }

    // Rule 2: Hạn mức không quảng cáo theo ngày (DAILY_QUOTA — ví dụ Gói Tiết Kiệm)
    if (ent.adPolicy === "DAILY_QUOTA") {
      const adFreeLimit = Math.max(0, ent.adFreeDailyLimit);
      if (todayTracks <= adFreeLimit) {
        executePlayTrack(track, playlist);
        return;
      }
      // Sau hạn mức: quảng cáo xuất hiện thưa hơn theo adIntervalAfterLimit
      const tracksAfter = todayTracks - adFreeLimit;
      const interval = Math.max(1, ent.adIntervalAfterLimit);
      if (tracksAfter % interval === 0) {
        triggerAd(false, track, playlist, "BASIC_DAILY_LIMIT_EXCEEDED");
        return;
      }
      executePlayTrack(track, playlist);
      return;
    }

    // Rule 3: FULL_ADS — tài khoản FREE (ngẫu nhiên 1..adIntervalAfterLimit bài một quảng cáo)
    freeTracksSinceLastAdRef.current += 1;
    console.log(
      `[Moodify Ad Engine] Gói FREE: Đã phát ${freeTracksSinceLastAdRef.current}/${freeNextAdThresholdRef.current} bài trước quảng cáo tiếp theo.`
    );
    if (freeTracksSinceLastAdRef.current >= freeNextAdThresholdRef.current) {
      freeTracksSinceLastAdRef.current = 0;
      freeNextAdThresholdRef.current = Math.max(1, ent.adIntervalAfterLimit) > 1
        ? Math.floor(Math.random() * Math.max(1, ent.adIntervalAfterLimit)) + 1
        : 1; // Chọn ngưỡng ngẫu nhiên cho chu kỳ sau
      triggerAd(false, track, playlist, "FREE_REGULAR");
      return;
    }

    executePlayTrack(track, playlist);
  }, [triggerAd, executePlayTrack]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack || isAdPlayingRef.current) return;
    if (isPlaying) {
      sourceGenerationRef.current += 1;
      clearRetry();
      setIsBuffering(false);
      playbackIntentRef.current = false;
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      playbackIntentRef.current = true;
      const generation = ++sourceGenerationRef.current;
      const currentSrc = audioRef.current.src;
      if (!currentSrc || currentSrc === "" || currentSrc === window.location.href || currentSrc.endsWith("/")) {
        const onlineAudioUrl = resolveTrackAudioUrl(currentTrack);
        const streamUrl = `${onlineAudioUrl}${onlineAudioUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
        audioRef.current.src = streamUrl;
        pendingPositionRef.current = { src: audioRef.current.src, seconds: currentTimeRef.current };
        audioRef.current.playbackRate = playbackRateRef.current;
        audioRef.current.load();
      }
      audioRef.current
        .play()
        .then(() => {
          if (generation === sourceGenerationRef.current && playbackIntentRef.current) setIsPlaying(true);
        })
        .catch((err) => {
          if (generation !== sourceGenerationRef.current) return;
          playbackIntentRef.current = false;
          console.warn("Could not resume audio:", err);
        });
    }
  }, [isPlaying, currentTrack, clearRetry]);

  const pause = useCallback(() => {
    sourceGenerationRef.current += 1;
    clearRetry();
    setIsBuffering(false);
    if (audioRef.current) {
      playbackIntentRef.current = false;
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [clearRetry]);

  const resume = useCallback(() => {
    if (audioRef.current && currentTrack && !isAdPlayingRef.current) {
      playbackIntentRef.current = true;
      const generation = ++sourceGenerationRef.current;
      const currentSrc = audioRef.current.src;
      if (!currentSrc || currentSrc === "" || currentSrc === window.location.href || currentSrc.endsWith("/")) {
        const onlineAudioUrl = resolveTrackAudioUrl(currentTrack);
        const streamUrl = `${onlineAudioUrl}${onlineAudioUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
        audioRef.current.src = streamUrl;
        pendingPositionRef.current = { src: audioRef.current.src, seconds: currentTimeRef.current };
        audioRef.current.playbackRate = playbackRateRef.current;
        audioRef.current.load();
      }
      audioRef.current
        .play()
        .then(() => {
          if (generation === sourceGenerationRef.current && playbackIntentRef.current) setIsPlaying(true);
        })
        .catch((err) => {
          if (generation === sourceGenerationRef.current) console.warn("Could not resume:", err);
        });
    }
  }, [currentTrack]);

  const seek = useCallback((timeSeconds: number) => {
    if (!Number.isFinite(timeSeconds) || isAdPlayingRef.current) return;
    timeSeconds = Math.max(0, durationRef.current > 0 ? Math.min(timeSeconds, durationRef.current) : timeSeconds);
    if (audioRef.current) {
      if (currentTrack && (!audioRef.current.src || audioRef.current.src === "" || audioRef.current.src === window.location.href || audioRef.current.src.endsWith("/"))) {
        const onlineAudioUrl = resolveTrackAudioUrl(currentTrack);
        audioRef.current.src = onlineAudioUrl;
        audioRef.current.load();
      }
      const oldPosMs = Math.round(audioRef.current.currentTime * 1000);
      const targetPosMs = Math.round(timeSeconds * 1000);
      const session = listeningSessionRef.current;
      if (session && session.trackId && oldPosMs >= 60_000 && targetPosMs <= 2_000) {
        // Rewinding a substantially played song to its start begins a genuine new replay.
        flushListeningSession("TRACK_CHANGED");
        const replaySession = {
          sessionKey: crypto.randomUUID(), historyId: null as number | null,
          trackId: session.trackId, startedAt: Date.now(),
          lastPlayTimestamp: audioRef.current.paused ? null : Date.now(),
          accumulatedDurationMs: 0,
          playbackContext: session.playbackContext,
        };
        listeningSessionRef.current = replaySession;
        void recordListeningSessionTelemetry({
          sessionKey: replaySession.sessionKey, trackId: replaySession.trackId,
          durationMs: 0, positionMs: targetPosMs, eventType: "PLAY",
          deviceType: "WEB", ...telemetryContext(replaySession.playbackContext),
        });
      } else if (session && session.trackId) {
        const curDur = session.accumulatedDurationMs + (session.lastPlayTimestamp ? (Date.now() - session.lastPlayTimestamp) : 0);
        void recordListeningSessionTelemetry({
          sessionKey: session.sessionKey,
          historyId: session.historyId ?? undefined,
          trackId: session.trackId,
          durationMs: Math.max(0, curDur),
          positionMs: oldPosMs,
          targetPositionMs: targetPosMs,
          eventType: "SEEK",
          deviceType: "WEB",
          ...telemetryContext(session.playbackContext),
        });
      }
      if (audioRef.current.readyState === 0) {
        pendingPositionRef.current = { src: audioRef.current.src, seconds: timeSeconds };
      } else {
        try { audioRef.current.currentTime = timeSeconds; } catch (_) {}
      }
      currentTimeRef.current = timeSeconds;
      savePersistedPlaybackState({ currentTime: timeSeconds });
      setCurrentTime(timeSeconds);
    }
  }, [flushListeningSession, currentTrack]);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (adAudioRef.current) {
      adAudioRef.current.volume = clamped;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      const targetVol = nextMuted ? 0 : (volume > 0 ? volume : 0.8);
      if (nextMuted) {
        if (audioRef.current) audioRef.current.volume = 0;
        if (adAudioRef.current) adAudioRef.current.volume = 0;
      } else {
        setVolumeState(targetVol);
        if (audioRef.current) audioRef.current.volume = targetVol;
        if (adAudioRef.current) adAudioRef.current.volume = targetVol;
      }
      return nextMuted;
    });
  }, [volume]);

  const setPlaybackRate = useCallback((rate: number) => {
    const validRate = Math.max(0.25, Math.min(3, rate));
    setPlaybackRateState(validRate);
    playbackRateRef.current = validRate;
    if (audioRef.current) {
      audioRef.current.playbackRate = validRate;
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    shuffleRemainingRef.current = null;
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  }, []);

  const nextTrack = useCallback((isAutoAdvance = false) => {
    const pending = isAdPlayingRef.current ? pendingTrackRef.current : null;
    const currentQueue = pending?.playlist ?? queueRef.current;
    const currentIdx = pending ? Math.max(0, currentQueue.findIndex(item => sameTrack(item, pending.track))) : queueIndexRef.current;
    if (currentQueue.length === 0) return;

    if (!isAutoAdvance) {
      const ent = entitlementsRef.current;
      if (ent.skipPolicy === "LIMITED") {
        const todaySkips = recordDailySkip();
        setDailySkipsCount(todaySkips);
        const skipLimit = Math.max(1, ent.skipDailyLimit);
        if (todaySkips > skipLimit) {
          setSkipLimitNotice({
            show: true,
            tier: subTier,
            message:
              subTier === "FREE"
                ? `Tài khoản Miễn phí chỉ có ${skipLimit} lượt chuyển bài mỗi ngày. Nâng cấp Gói Tiết Kiệm (29K) hoặc Cá Nhân FULL để chuyển bài thoải mái!`
                : `Bạn đã dùng hết ${skipLimit} lượt chuyển bài hôm nay. Nâng cấp lên Gói Cá Nhân FULL (49K) để chuyển bài không giới hạn!`,
          });
          return;
        }
      }
      flushListeningSession("SKIP_NEXT");
    }

    // Single track repeat triggered by natural track end
    if (isAutoAdvance && repeatModeRef.current === "one") {
      const repeated = currentQueue[currentIdx];
      if (repeated) playTrack(repeated, currentQueue);
      return;
    }

    const stopAtEnd = () => {
      sourceGenerationRef.current += 1;
      playbackIntentRef.current = false;
      clearRetry();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      currentTimeRef.current = 0;
      setIsPlaying(false);
      setIsBuffering(false);
      setCurrentTime(0);
      savePersistedPlaybackState({ currentTime: 0 });
    };
    // Natural completion must stop even for a one-song queue. Clear intent so focus cannot restart it.
    if (isAutoAdvance && repeatModeRef.current === "off" &&
        (currentQueue.length === 1 || (!isShuffleRef.current && currentIdx >= currentQueue.length - 1))) {
      stopAtEnd();
      return;
    }

    if (currentQueue.length === 1) {
      playTrack(currentQueue[0], currentQueue);
      return;
    }

    // Shuffle logic
    if (isShuffleRef.current) {
      let candidates = shuffleRemainingRef.current ?? currentQueue.map((_, i) => i).filter(i => i !== currentIdx);
      if (candidates.length === 0) {
        if (isAutoAdvance && repeatModeRef.current === "off") { stopAtEnd(); return; }
        candidates = currentQueue.map((_, i) => i).filter(i => i !== currentIdx);
      }
      const randomIdx = candidates[Math.floor(Math.random() * candidates.length)];
      shuffleRemainingRef.current = candidates.filter(index => index !== randomIdx);
      historyIndicesRef.current.push(currentIdx);
      setQueueIndex(randomIdx);
      const nextItem = currentQueue[randomIdx];
      if (nextItem) {
        playTrack(nextItem, currentQueue);
      }
      return;
    }

    // Sequential next track
    const nextIdx = (currentIdx + 1) % currentQueue.length;
    historyIndicesRef.current.push(currentIdx);
    setQueueIndex(nextIdx);
    const nextItem = currentQueue[nextIdx];
    if (nextItem) {
      playTrack(nextItem, currentQueue);
    }
  }, [playTrack, subTier, flushListeningSession, clearRetry]);

  const prevTrack = useCallback(() => {
    const pending = isAdPlayingRef.current ? pendingTrackRef.current : null;
    const currentQueue = pending?.playlist ?? queueRef.current;
    const currentIdx = pending ? Math.max(0, currentQueue.findIndex(item => sameTrack(item, pending.track))) : queueIndexRef.current;
    if (currentQueue.length === 0) return;

    if (currentTimeRef.current > 3 && !isAdPlayingRef.current) {
      seek(0);
      return;
    }

    flushListeningSession("SKIP_PREVIOUS");

    // Pop from played history (important for shuffle navigation)
    if (historyIndicesRef.current.length > 0) {
      const prevIdx = historyIndicesRef.current.pop()!;
      if (isShuffleRef.current && shuffleRemainingRef.current) {
        shuffleRemainingRef.current = [...new Set([...shuffleRemainingRef.current, currentIdx])];
      }
      setQueueIndex(prevIdx);
      const prevItem = currentQueue[prevIdx];
      if (prevItem) {
        playTrack(prevItem, currentQueue);
      }
      return;
    }

    const prevIdx = (currentIdx - 1 + currentQueue.length) % currentQueue.length;
    setQueueIndex(prevIdx);
    const prevItem = currentQueue[prevIdx];
    if (prevItem) {
      playTrack(prevItem, currentQueue);
    }
  }, [seek, playTrack, flushListeningSession]);

  // Keep a ref for ended listener callback to avoid stale closure
  const nextTrackRef = useRef(nextTrack);
  const addToQueue = useCallback((track: PlayerTrack) => {
    if (queueRef.current.some(item => sameTrack(item, track))) return;
    queueRef.current = [...queueRef.current, track];
    shuffleRemainingRef.current = null;
    setQueue(queueRef.current);
  }, []);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlayerBarHidden,
        setPlayerBarHidden,
        isPlaying,
        isBuffering,
        currentTime,
        duration,
        volume: isMuted ? 0 : volume,
        isMuted,
        playbackRate,
        isShuffle,
        repeatMode,
        queue,
        queueIndex,
        isAdPlaying,
        adSecondsRemaining,
        adTotalDuration,
        isPremiumUser,
        subTier,
        adReason,
        dailyTracksCount,
        dailySkipsCount,
        skipLimitNotice,
        clearSkipLimitNotice,
        skipAd,
        triggerAd,
        playTrack,
        addToQueue,
        togglePlay,
        pause,
        resume,
        seek,
        setVolume,
        toggleMute,
        setPlaybackRate,
        toggleShuffle,
        toggleRepeat,
        nextTrack: () => nextTrack(false),
        prevTrack,
      }}
    >
      {children}
      {skipLimitNotice?.show && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] rounded-2xl p-[1px] bg-gradient-to-b from-white/25 via-white/10 to-transparent shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="rounded-[calc(1rem-1px)] bg-[#0a0b10]/95 p-4 border border-white/5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden ring-1 ring-white/10 shrink-0 bg-neutral-900 shadow-md">
                <Image
                  src="/images/ads/moodify_vip_premium_art.jpg"
                  alt="Moodify VIP"
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-amber-400/90 mb-0.5">
                  HẠN MỨC CHUYỂN BÀI
                </div>
                <p className="text-xs text-white/75 font-light leading-relaxed">
                  {skipLimitNotice.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <button
                type="button"
                onClick={() => setSkipLimitNotice(null)}
                className="text-xs text-white/40 hover:text-white/80 transition-colors cursor-pointer px-2 py-1"
              >
                Đã hiểu
              </button>
              <a
                href="/dashboard/premium"
                onClick={() => setSkipLimitNotice(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-neutral-950 text-xs font-medium hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-sm"
              >
                <span>Nâng cấp VIP</span>
                <span className="text-[10px]">→</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {deviceRevokedNotice?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-3xl p-[1px] bg-gradient-to-b from-amber-400/40 via-white/10 to-transparent shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200">
            <div className="rounded-[calc(1.5rem-1px)] bg-[#0d0e15] p-6 border border-white/10 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Laptop className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 block mb-1">
                  RÀNG BUỘC THIẾT BỊ
                </span>
                <h3 className="text-lg font-bold text-white">
                  Giới Hạn Thiết Bị Đã Vượt Quá
                </h3>
                <p className="text-xs text-white/70 mt-2 leading-relaxed">
                  {deviceRevokedNotice.message}
                </p>
              </div>

              <div className="w-full h-px bg-white/10 my-1" />

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
                <button
                  type="button"
                  disabled={isReclaimingDevice}
                  onClick={handleReclaimDevice}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isReclaimingDevice ? "Đang kích hoạt..." : "Sử dụng trên thiết bị này"}
                </button>

                <a
                  href="/dashboard/premium"
                  onClick={() => setDeviceRevokedNotice(null)}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold shadow-lg shadow-amber-400/20 active:scale-95 transition-all text-center"
                >
                  Nâng cấp gói VIP
                </a>
              </div>

              <button
                type="button"
                onClick={() => setDeviceRevokedNotice(null)}
                className="text-xs text-white/40 hover:text-white/80 transition-colors cursor-pointer pt-1"
              >
                Đóng thông báo
              </button>
            </div>
          </div>
        </div>
      )}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}

export function useOptionalPlayer() {
  return useContext(PlayerContext);
}
