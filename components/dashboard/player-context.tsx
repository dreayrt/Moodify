"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Crown } from "lucide-react";
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
import { recordPlatformVisit, recordListeningSessionTelemetry } from "@/lib/auth/auth-client";

export type PlayerTrack = {
  id?: string;
  spotifyId: string;
  name: string;
  artistName: string;
  albumName?: string;
  imageUrl?: string | null;
  durationMs?: number;
  lyricsPlain?: string | null;
  lyricsSynced?: string | null;
  audioUrl?: string | null;
  localPath?: string | null;
};

export type RepeatMode = "off" | "all" | "one";

export type SubTier = "FAMILY" | "INDIVIDUAL_FULL" | "INDIVIDUAL_BASIC" | "FREE";
export type AdReason = "FREE_REGULAR" | "BASIC_DAILY_LIMIT_EXCEEDED" | "SKIP_PENALTY" | null;

interface PlayerContextType {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
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

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  // ── Shuffle & Repeat Mode ────────────────────────────────────
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const isShuffleRef = useRef(false);
  const repeatModeRef = useRef<RepeatMode>("off");
  const queueRef = useRef<PlayerTrack[]>([]);
  const queueIndexRef = useRef(0);
  const historyIndicesRef = useRef<number[]>([]);

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

  // ── Playback Speed ───────────────────────────────────────────
  const [playbackRate, setPlaybackRateState] = useState(1);
  const playbackRateRef = useRef(1);

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
  const [adSecondsRemaining, setAdSecondsRemaining] = useState(0);
  const [adTotalDuration, setAdTotalDuration] = useState(0);
  const [skipLimitNotice, setSkipLimitNotice] = useState<{ show: boolean; message: string; tier: SubTier } | null>(null);
  const clearSkipLimitNotice = useCallback(() => setSkipLimitNotice(null), []);
  const tracksPlayedRef = useRef(0);
  const freeTracksSinceLastAdRef = useRef(0);
  // Random threshold between 1 and 3 songs before next ad
  const freeNextAdThresholdRef = useRef(Math.floor(Math.random() * 3) + 1);
  const pendingTrackRef = useRef<{ track: PlayerTrack; playlist?: PlayerTrack[] } | null>(null);
  const lastAdIndexRef = useRef(-1);
  const lastAdIdRef = useRef<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const adAudioRef = useRef<HTMLAudioElement | null>(null);

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
      setIsAdPlaying(false);
      setAdReason(null);
      setAdSecondsRemaining(0);
      const pending = pendingTrackRef.current;
      pendingTrackRef.current = null;
      if (pending) {
        executePlayTrackRef.current(pending.track, pending.playlist);
      } else if (audioRef.current) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };

    const onAdError = () => {
      console.warn("Ad audio failed to play, skipping ad");
      setIsAdPlaying(false);
      setAdReason(null);
      const pending = pendingTrackRef.current;
      pendingTrackRef.current = null;
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
    historyId: number | null;
    trackId: string;
    startedAt: number;
    lastPlayTimestamp: number | null;
    accumulatedDurationMs: number;
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
        historyId: session.historyId ?? undefined,
        trackId: session.trackId,
        durationMs: Math.max(0, totalDuration),
        positionMs: Math.max(0, posMs),
        eventType,
        deviceType: "WEB",
        source: "HOME",
      });
    }

    listeningSessionRef.current = null;
  }, []);

  // Initialize audio element once in browser
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = volume;
    audio.playbackRate = playbackRateRef.current;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onPlay = () => {
      const session = listeningSessionRef.current;
      if (session) {
        session.lastPlayTimestamp = Date.now();
        // Nếu đã từng pause và giờ resume lại -> ghi nhận sự kiện RESUME
        if (session.accumulatedDurationMs > 0) {
          const posMs = Math.round(audio.currentTime * 1000);
          void recordListeningSessionTelemetry({
            historyId: session.historyId ?? undefined,
            trackId: session.trackId,
            durationMs: session.accumulatedDurationMs,
            positionMs: posMs,
            eventType: "RESUME",
            deviceType: "WEB",
            source: "HOME",
          });
        }
      }
      setIsPlaying(true);
    };

    const onPause = () => {
      const session = listeningSessionRef.current;
      if (session && session.lastPlayTimestamp) {
        session.accumulatedDurationMs += (Date.now() - session.lastPlayTimestamp);
        session.lastPlayTimestamp = null;
        const posMs = Math.round(audio.currentTime * 1000);
        void recordListeningSessionTelemetry({
          historyId: session.historyId ?? undefined,
          trackId: session.trackId,
          durationMs: session.accumulatedDurationMs,
          positionMs: posMs,
          eventType: "PAUSE",
          deviceType: "WEB",
          source: "HOME",
        });
      }
      setIsPlaying(false);
    };

    const onEnded = () => {
      flushListeningSession("COMPLETE");
      if (repeatModeRef.current === "one") {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => {});
        }
      } else {
        nextTrackRef.current(true);
      }
    };

    const onError = (e: Event) => {
      console.warn("Audio playback issue:", e);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      flushListeningSession("PLAYBACK_STOPPED");
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, [flushListeningSession, volume]);

  const executePlayTrack = useCallback((track: PlayerTrack, playlist?: PlayerTrack[]) => {
    setCurrentTrack(track);

    if (playlist && playlist.length > 0) {
      historyIndicesRef.current = [];
      setQueue(playlist);
      const idx = playlist.findIndex((t) => t.spotifyId === track.spotifyId);
      setQueueIndex(idx >= 0 ? idx : 0);
    } else {
      setQueue((prev) => {
        const exists = prev.some((t) => t.spotifyId === track.spotifyId);
        if (!exists) return [...prev, track];
        return prev;
      });
    }

    // Telemetry: Flush previous track session and initialize new session
    flushListeningSession("TRACK_CHANGED");
    const targetTrackId = track.id || track.spotifyId;
    if (targetTrackId) {
      const newSession = {
        historyId: null as number | null,
        trackId: targetTrackId,
        startedAt: Date.now(),
        lastPlayTimestamp: Date.now(),
        accumulatedDurationMs: 0,
      };
      listeningSessionRef.current = newSession;

      // Ghi nhận sự kiện khởi phát PLAY ban đầu và lưu historyId
      void recordListeningSessionTelemetry({
        trackId: targetTrackId,
        durationMs: 0,
        positionMs: 0,
        eventType: "PLAY",
        deviceType: "WEB",
        source: "HOME",
      }).then((res) => {
        if (res?.success && res.historyId && listeningSessionRef.current?.trackId === targetTrackId) {
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
      
      setCurrentTime(0);
      if (track.durationMs) {
        setDuration(track.durationMs / 1000);
      }

      // 2. Set new stream: Luôn ưu tiên phát trực tiếp từ máy chủ đám mây trực tuyến trên mạng (Oracle Cloud Music Server)
      const onlineAudioUrl = resolveTrackAudioUrl(track);
      const streamUrl = `${onlineAudioUrl}${onlineAudioUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
      audioRef.current.src = streamUrl;
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = playbackRateRef.current;
      audioRef.current.load(); // Forces browser to flush old buffer and load new track stream

      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Autoplay was prevented or audio stream not available:", err);
          setIsPlaying(false);
        });
    }
  }, [flushListeningSession]);

  // Keep a ref for executePlayTrack so ad audio ended callback can access latest
  const executePlayTrackRef = useRef(executePlayTrack);
  useEffect(() => {
    executePlayTrackRef.current = executePlayTrack;
  }, [executePlayTrack]);

  const triggerAd = useCallback((force = false, trackToPlayAfter?: PlayerTrack, playlistToPlayAfter?: PlayerTrack[], reason: AdReason = "FREE_REGULAR") => {
    // Gói NO_ADS (Gia Đình / Cá Nhân FULL) không bị chèn quảng cáo
    if (entitlementsRef.current.adPolicy === "NO_ADS" && !force) return;
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
    setIsAdPlaying(true);
    setAdSecondsRemaining(20); // approximate, will be corrected by timeupdate
    playAdAudio();
  }, [playAdAudio]);

  const skipAd = useCallback((force = false) => {
    // Chỉ người dùng gói VIP Tiết Kiệm (INDIVIDUAL_BASIC) mới có quyền bấm bỏ qua quảng cáo sớm sau đếm ngược.
    // Người dùng FREE bắt buộc phải nghe trọn vẹn quảng cáo trừ khi chuyển hướng mua gói (force = true) hoặc đã hết thời gian.
    const isSaverVip = subTier === "INDIVIDUAL_BASIC";
    if (!force && !isSaverVip && !isPremiumUser && adSecondsRemaining > 0) {
      return;
    }

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
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn("Could not resume audio:", err));
    }
  }, [isPlaying, currentTrack]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn("Could not resume:", err));
    }
  }, [currentTrack]);

  const seek = useCallback((timeSeconds: number) => {
    if (audioRef.current) {
      const oldPosMs = Math.round(audioRef.current.currentTime * 1000);
      const targetPosMs = Math.round(timeSeconds * 1000);
      audioRef.current.currentTime = timeSeconds;
      setCurrentTime(timeSeconds);

      const session = listeningSessionRef.current;
      if (session && session.trackId) {
        const curDur = session.accumulatedDurationMs + (session.lastPlayTimestamp ? (Date.now() - session.lastPlayTimestamp) : 0);
        void recordListeningSessionTelemetry({
          historyId: session.historyId ?? undefined,
          trackId: session.trackId,
          durationMs: Math.max(0, curDur),
          positionMs: oldPosMs,
          targetPositionMs: targetPosMs,
          eventType: "SEEK",
          deviceType: "WEB",
          source: "HOME",
        });
      }
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume > 0 ? volume : 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const setPlaybackRate = useCallback((rate: number) => {
    const validRate = Math.max(0.25, Math.min(3, rate));
    setPlaybackRateState(validRate);
    playbackRateRef.current = validRate;
    if (audioRef.current) {
      audioRef.current.playbackRate = validRate;
    }
  }, []);

  const toggleShuffle = useCallback(() => {
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
    const currentQueue = queueRef.current;
    const currentIdx = queueIndexRef.current;
    if (currentQueue.length === 0) return;

    if (!isAutoAdvance) {
      flushListeningSession("SKIP_NEXT");
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
    }

    // Single track repeat triggered by natural track end
    if (isAutoAdvance && repeatModeRef.current === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
      return;
    }

    if (currentQueue.length === 1) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
      return;
    }

    // Shuffle logic
    if (isShuffleRef.current) {
      const candidates = currentQueue
        .map((_, i) => i)
        .filter((i) => i !== currentIdx);
      const randomIdx = candidates[Math.floor(Math.random() * candidates.length)];
      historyIndicesRef.current.push(currentIdx);
      setQueueIndex(randomIdx);
      const nextItem = currentQueue[randomIdx];
      if (nextItem) {
        playTrack(nextItem, currentQueue);
      }
      return;
    }

    // Repeat OFF & auto advance reaches end of queue -> Stop playback
    if (isAutoAdvance && repeatModeRef.current === "off" && currentIdx >= currentQueue.length - 1) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        setCurrentTime(0);
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
  }, [playTrack, subTier]);

  const prevTrack = useCallback(() => {
    const currentQueue = queueRef.current;
    const currentIdx = queueIndexRef.current;
    if (currentQueue.length === 0) return;

    if (currentTime > 3) {
      seek(0);
      return;
    }

    flushListeningSession("SKIP_PREVIOUS");

    // Pop from played history (important for shuffle navigation)
    if (historyIndicesRef.current.length > 0) {
      const prevIdx = historyIndicesRef.current.pop()!;
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
  }, [currentTime, seek, playTrack]);

  // Keep a ref for ended listener callback to avoid stale closure
  const nextTrackRef = useRef(nextTrack);
  const addToQueue = useCallback((track: PlayerTrack) => {
    setQueue((prev) => {
      const exists = prev.some((t) => t.spotifyId === track.spotifyId);
      if (!exists) return [...prev, track];
      return prev;
    });
  }, []);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
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
