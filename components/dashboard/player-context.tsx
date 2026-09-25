"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { getTrackStreamUrl, fetchTrackById, fetchMySubscription } from "@/lib/api-client";

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
};

export type RepeatMode = "off" | "all" | "one";

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
  isPremiumUser: boolean;
  skipAd: () => void;
  triggerAd: (force?: boolean) => void;
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

  // ── Audio Ad Management ──────────────────────────────────────
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adSecondsRemaining, setAdSecondsRemaining] = useState(5);
  const tracksPlayedRef = useRef(0);
  const pendingTrackRef = useRef<{ track: PlayerTrack; playlist?: PlayerTrack[] } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check user subscription status
  useEffect(() => {
    const checkSub = () => {
      fetchMySubscription()
        .then((info) => {
          const isVip = Boolean(info?.isPremium);
          setIsPremiumUser(isVip);
          if (isVip) {
            setIsAdPlaying(false);
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              window.speechSynthesis.cancel();
            }
          }
        })
        .catch(() => setIsPremiumUser(false));
    };

    checkSub();
    window.addEventListener("moodify-subscription-updated", checkSub);
    return () => {
      window.removeEventListener("moodify-subscription-updated", checkSub);
    };
  }, []);

  // Audio Ad Chime Synthesizer & Vietnamese Voiceover
  const playAdAudio = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.16);
          gain.gain.setValueAtTime(0, now + idx * 0.16);
          gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.16 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.16);
          osc.stop(now + idx * 0.16 + 0.45);
        });
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          "Bạn đang nghe nhạc trên Moodify. Nâng cấp tài khoản VIP ngay hôm nay để chặn 100% quảng cáo và tải nhạc không giới hạn."
        );
        utterance.lang = "vi-VN";
        utterance.rate = 1.05;
        utterance.volume = 0.95;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn("Could not play ad chime:", e);
    }
  }, []);

  // Ad countdown interval
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isAdPlaying) {
      timer = setInterval(() => {
        setAdSecondsRemaining((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAdPlaying]);

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

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    const onEnded = () => {
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
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, []);

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

      // 2. Set new stream with cache buster so browser never serves previous song chunks
      const streamUrl = `${getTrackStreamUrl(track.spotifyId || track.id || "")}?t=${Date.now()}`;
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
  }, []);

  const triggerAd = useCallback((force = false, trackToPlayAfter?: PlayerTrack, playlistToPlayAfter?: PlayerTrack[]) => {
    if (isPremiumUser && !force) return;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch (_) {}
      setIsPlaying(false);
    }
    if (trackToPlayAfter) {
      pendingTrackRef.current = { track: trackToPlayAfter, playlist: playlistToPlayAfter };
    }
    setIsAdPlaying(true);
    setAdSecondsRemaining(5);
    playAdAudio();
  }, [isPremiumUser, playAdAudio]);

  const skipAd = useCallback(() => {
    setIsAdPlaying(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    const pending = pendingTrackRef.current;
    pendingTrackRef.current = null;
    if (pending) {
      executePlayTrack(pending.track, pending.playlist);
    } else if (audioRef.current && currentTrack) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [executePlayTrack, currentTrack]);

  const playTrack = useCallback((track: PlayerTrack, playlist?: PlayerTrack[]) => {
    if (!isPremiumUser) {
      tracksPlayedRef.current += 1;
      // Trigger ad every 3 tracks for free users
      if (tracksPlayedRef.current % 3 === 0) {
        triggerAd(false, track, playlist);
        return;
      }
    }
    executePlayTrack(track, playlist);
  }, [isPremiumUser, triggerAd, executePlayTrack]);

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
      audioRef.current.currentTime = timeSeconds;
      setCurrentTime(timeSeconds);
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
  }, [playTrack]);

  const prevTrack = useCallback(() => {
    const currentQueue = queueRef.current;
    const currentIdx = queueIndexRef.current;
    if (currentQueue.length === 0) return;

    if (currentTime > 3) {
      seek(0);
      return;
    }

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
        isPremiumUser,
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
