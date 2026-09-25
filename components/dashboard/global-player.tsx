"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Repeat,
  Repeat1,
  Shuffle,
  Music2,
  Crown,
  ShieldCheck,
  Radio,
  Share2,
  Gauge,
} from "lucide-react";
import { usePlayer } from "./player-context";
import { addToLibrary, removeFromLibrary, isTrackInLibrary } from "@/lib/api-client";
import { useVipTheme } from "@/lib/theme";
import TrackActionMenu from "./track-action-menu";
import AdInterstitialBanner from "./ad-interstitial-banner";
import ShareSongCardModal from "./share-song-card-modal";

function formatSeconds(sec: number): string {
  if (!sec || isNaN(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function GlobalPlayerBar() {
  const pathname = usePathname();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isAdPlaying,
    isPremiumUser,
    playbackRate,
    isShuffle,
    repeatMode,
    triggerAd,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleShuffle,
    toggleRepeat,
    nextTrack,
    prevTrack,
  } = usePlayer();

  const { vipButtonsEnabled, vipShellEnabled, currentVipTheme, normalTheme } = useVipTheme();
  const isVipButtonsActive = Boolean(isPremiumUser) && vipButtonsEnabled;
  const isVipShellActive = Boolean(isPremiumUser) && vipShellEnabled;
  const currentShellTheme = isVipShellActive ? currentVipTheme : normalTheme;

  const [liked, setLiked] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);

  // Check liked status when track changes
  React.useEffect(() => {
    if (!currentTrack?.spotifyId) return;
    let cancelled = false;
    isTrackInLibrary(currentTrack.spotifyId)
      .then((res) => {
        if (!cancelled) setLiked(res);
      })
      .catch(() => {
        if (!cancelled) setLiked(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.spotifyId]);

  // Listen for global library updates (e.g. liked/unliked from 3-dots menu or search)
  React.useEffect(() => {
    const handleLibraryUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackSpotifyId: string; liked: boolean }>;
      if (customEvent.detail && currentTrack?.spotifyId && customEvent.detail.trackSpotifyId === currentTrack.spotifyId) {
        setLiked(customEvent.detail.liked);
      }
    };
    window.addEventListener("moodify-library-updated", handleLibraryUpdate);
    return () => {
      window.removeEventListener("moodify-library-updated", handleLibraryUpdate);
    };
  }, [currentTrack?.spotifyId]);

  const handleToggleLike = async () => {
    if (!currentTrack?.spotifyId) return;
    const nextState = !liked;
    setLiked(nextState);
    try {
      if (nextState) {
        await addToLibrary(currentTrack.spotifyId);
      } else {
        await removeFromLibrary(currentTrack.spotifyId);
      }
      window.dispatchEvent(
        new CustomEvent("moodify-library-updated", {
          detail: { trackSpotifyId: currentTrack.spotifyId, liked: nextState },
        })
      );
    } catch (err) {
      console.error("Failed to toggle like:", err);
      setLiked(!nextState);
    }
  };

  if (!currentTrack) {
    return null;
  }

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seek(ratio * duration);
  };

  return (
    <>
      <AdInterstitialBanner />
      <div className={`fixed bottom-0 left-0 right-0 z-50 px-4 md:px-8 py-3 backdrop-blur-3xl transition-all duration-300 ${currentShellTheme.playerBg} ${currentShellTheme.playerBorder}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Track info */}
          <div className="flex items-center gap-3 w-[220px] md:w-[280px] min-w-0">
            <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden shrink-0 shadow-lg bg-slate-900 border border-white/10">
              {isAdPlaying ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-yellow-600/30 border border-amber-400/40">
                  <Crown className="w-6 h-6 text-amber-300 animate-bounce" />
                </div>
              ) : currentTrack.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentTrack.imageUrl}
                  alt={currentTrack.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-950 to-slate-900">
                  <Music2 className="w-5 h-5 text-purple-400" />
                </div>
              )}
              {isPlaying && !isAdPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                  <div
                    className="w-1 h-3.5 rounded-full animate-pulse"
                    style={{
                      backgroundColor: isVipButtonsActive ? currentVipTheme.accent : "#f472b6",
                    }}
                  />
                  <div
                    className="w-1 h-5 rounded-full animate-pulse delay-75"
                    style={{
                      backgroundColor: isVipButtonsActive ? currentVipTheme.accent : "#d8b4fe",
                    }}
                  />
                  <div
                    className="w-1 h-2.5 rounded-full animate-pulse delay-150"
                    style={{
                      backgroundColor: isVipButtonsActive ? currentVipTheme.accent : "#f472b6",
                    }}
                  />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="font-display font-semibold text-slate-100 text-sm md:text-base leading-snug tracking-[-0.01em] truncate">
                {isAdPlaying ? "📢 Moodify VIP Sponsor" : currentTrack.name}
              </h4>
              <p className="text-xs text-slate-400 leading-tight truncate mt-0.5">
                {isAdPlaying ? "Quảng cáo âm thanh đang phát..." : currentTrack.artistName}
              </p>
            </div>

            {!isAdPlaying && (
              <>
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className={`p-1.5 rounded-full hover:bg-white/5 transition-colors shrink-0 ${
                    liked ? "text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]" : "text-slate-400 hover:text-slate-200"
                  }`}
                  aria-label="Like track"
                >
                  <Heart className="w-4 h-4" fill={liked ? "currentColor" : "none"} />
                </button>

                <TrackActionMenu
                  track={currentTrack}
                  isLiked={liked}
                  onLikeChange={setLiked}
                />
              </>
            )}
          </div>

          {/* Center player controls & progress bar */}
          <div className="flex-1 max-w-2xl flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              {/* Shuffle Button */}
              <button
                type="button"
                disabled={isAdPlaying}
                onClick={toggleShuffle}
                className={`hidden sm:flex items-center justify-center p-1.5 rounded-lg transition-all cursor-pointer active:scale-95 disabled:opacity-40 relative group ${
                  isShuffle
                    ? isVipButtonsActive
                      ? "text-amber-300 hover:text-amber-200"
                      : "text-purple-400 hover:text-purple-300"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title={isShuffle ? "Phát ngẫu nhiên: BẬT (Bấm để tắt)" : "Phát ngẫu nhiên: TẮT (Bấm để bật)"}
                aria-label="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
                {isShuffle && (
                  <span
                    className="absolute bottom-0 w-1 h-1 rounded-full shadow-sm"
                    style={{
                      backgroundColor: isVipButtonsActive ? currentVipTheme.accent : "#c084fc",
                      boxShadow: `0 0 6px ${isVipButtonsActive ? currentVipTheme.accent : "#c084fc"}`,
                    }}
                  />
                )}
              </button>

              <button
                type="button"
                disabled={isAdPlaying}
                onClick={prevTrack}
                className="text-slate-300 hover:text-white transition-colors p-1 hover:scale-110 active:scale-95 disabled:opacity-40 cursor-pointer"
                aria-label="Previous track"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              <button
                type="button"
                disabled={isAdPlaying}
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isAdPlaying
                    ? "bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed"
                    : isVipButtonsActive
                    ? `${currentVipTheme.primaryBtnClass} hover:scale-110 active:scale-95`
                    : "bg-gradient-to-tr from-purple-500 to-pink-500 text-white hover:scale-108 active:scale-95 shadow-[0_4px_20px_rgba(168,85,247,0.5)]"
                }`}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                disabled={isAdPlaying}
                onClick={nextTrack}
                className="text-slate-300 hover:text-white transition-colors p-1 hover:scale-110 active:scale-95 disabled:opacity-40 cursor-pointer"
                aria-label="Next track"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>

              {/* Repeat Button */}
              <button
                type="button"
                disabled={isAdPlaying}
                onClick={toggleRepeat}
                className={`hidden sm:flex items-center justify-center p-1.5 rounded-lg transition-all cursor-pointer active:scale-95 disabled:opacity-40 relative group ${
                  repeatMode !== "off"
                    ? "text-purple-400 hover:text-purple-300"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title={
                  repeatMode === "off"
                    ? "Lặp lại: TẮT (Bấm để lặp toàn bộ danh sách)"
                    : repeatMode === "all"
                    ? "Lặp lại: TOÀN BỘ (Bấm để lặp 1 bài)"
                    : "Lặp lại: 1 BÀI (Bấm để tắt lặp)"
                }
                aria-label="Repeat"
              >
                {repeatMode === "one" ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
                {repeatMode !== "off" && (
                  <span
                    className="absolute bottom-0 w-1 h-1 rounded-full shadow-sm"
                    style={{
                      backgroundColor: isVipButtonsActive ? currentVipTheme.accent : "#c084fc",
                      boxShadow: `0 0 6px ${isVipButtonsActive ? currentVipTheme.accent : "#c084fc"}`,
                    }}
                  />
                )}
              </button>

              <div className="hidden sm:block w-px h-4 bg-white/10 mx-0.5" />

              {/* Playback Speed Pill & Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                    playbackRate !== 1
                      ? "text-cyan-300 bg-cyan-500/20 border-cyan-400/40 shadow-[0_0_10px_rgba(56,189,248,0.3)]"
                      : "text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10"
                  }`}
                  title="Tốc độ phát âm thanh"
                >
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  <span>{playbackRate}x</span>
                </button>

                {isSpeedMenuOpen && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1.5 rounded-2xl bg-slate-900/95 border border-white/15 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col gap-1 z-[100] min-w-[76px]">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 text-center">
                      Tốc độ
                    </span>
                    {SPEED_OPTIONS.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          setPlaybackRate(rate);
                          setIsSpeedMenuOpen(false);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer text-center ${
                          playbackRate === rate
                            ? isVipButtonsActive
                              ? `${currentVipTheme.primaryBtnClass} shadow-sm`
                              : "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm"
                            : "text-slate-300 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Scrub bar */}
            <div className="w-full flex items-center gap-2.5">
              <span className="text-[11px] font-mono text-slate-400 w-9 text-right select-none">
                {isAdPlaying ? "QC" : formatSeconds(currentTime)}
              </span>

              <div
                onClick={!isAdPlaying ? handleSeekClick : undefined}
                className={`relative flex-1 h-1.5 rounded-full group py-2 -my-2 flex items-center ${
                  isAdPlaying ? "bg-amber-500/20 cursor-not-allowed" : "bg-white/15 cursor-pointer"
                }`}
              >
                {/* Progress bar filler */}
                <div
                  className={`h-1.5 rounded-full transition-all relative ${
                    isAdPlaying
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                      : isVipButtonsActive
                      ? `${currentVipTheme.equalizerGradient} group-hover:h-2`
                      : "bg-gradient-to-r from-purple-500 via-pink-500 to-amber-300 group-hover:h-2 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                  }`}
                  style={{ width: isAdPlaying ? "100%" : `${progressPercent}%` }}
                >
                  {!isAdPlaying && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-opacity" />
                  )}
                </div>
              </div>

              <span className="text-[11px] font-mono text-slate-400 w-9 select-none">
                {isAdPlaying ? "0:15" : formatSeconds(duration)}
              </span>
            </div>
          </div>

          {/* Right side: Story Card Share & Volume & VIP / Test Ad */}
          <div className="hidden md:flex items-center justify-end gap-2.5 w-[280px]">
            {/* Share Song Button */}
            {!isAdPlaying && (
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="text-slate-400 hover:text-purple-300 transition-colors p-1.5 rounded-lg hover:bg-white/5 active:scale-95 cursor-pointer"
                title="Chia sẻ bài hát"
                aria-label="Chia sẻ bài hát"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {isPremiumUser ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm transition-all"
                style={{
                  backgroundColor: `${isVipButtonsActive ? currentVipTheme.accent : "#eab308"}1a`,
                  borderColor: `${isVipButtonsActive ? currentVipTheme.accent : "#eab308"}40`,
                  color: isVipButtonsActive ? currentVipTheme.accent : "#fde047",
                  borderWidth: 1,
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>VIP</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => triggerAd(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition cursor-pointer active:scale-95"
                title="Kích hoạt quảng cáo ngay để kiểm thử trải nghiệm"
              >
                <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                <span>Test QC</span>
              </button>
            )}

            {/* Volume controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="text-slate-400 hover:text-purple-300 transition-colors p-1"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-18 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: isVipShellActive ? currentShellTheme.playerAccent : "#c084fc" }}
                aria-label="Volume slider"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Share Song Card / Story Modal */}
      <ShareSongCardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        track={currentTrack}
        currentTime={currentTime}
      />
    </>
  );
}
