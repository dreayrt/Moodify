"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { getTrackStreamUrl, fetchTrackById } from "@/lib/api-client";

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

interface PlayerContextType {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: PlayerTrack[];
  queueIndex: number;
  playTrack: (track: PlayerTrack, playlist?: PlayerTrack[]) => void;
  addToQueue: (track: PlayerTrack) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (timeSeconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element once in browser
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = volume;
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
      nextTrackRef.current();
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

  const playTrack = useCallback((track: PlayerTrack, playlist?: PlayerTrack[]) => {
    setCurrentTrack(track);

    if (playlist && playlist.length > 0) {
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

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    const nextIdx = (queueIndex + 1) % queue.length;
    setQueueIndex(nextIdx);
    const nextItem = queue[nextIdx];
    if (nextItem) {
      playTrack(nextItem, queue);
    }
  }, [queue, queueIndex, playTrack]);

  const prevTrack = useCallback(() => {
    if (queue.length === 0) return;
    if (currentTime > 3) {
      seek(0);
      return;
    }
    const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prevIdx);
    const prevItem = queue[prevIdx];
    if (prevItem) {
      playTrack(prevItem, queue);
    }
  }, [queue, queueIndex, currentTime, seek, playTrack]);

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
        queue,
        queueIndex,
        playTrack,
        addToQueue,
        togglePlay,
        pause,
        resume,
        seek,
        setVolume,
        toggleMute,
        nextTrack,
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
