"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Play, Pause, Loader2, SkipBack, SkipForward, Volume2, VolumeX,
  Heart, Repeat, Repeat1, Shuffle, Music2, ShieldCheck, Share2,
  Gauge, ChevronDown, SlidersHorizontal,
} from "lucide-react";
import { usePlayer } from "./player-context";
import { addToLibrary, removeFromLibrary, isTrackInLibrary } from "@/lib/api-client";
import { useVipTheme } from "@/lib/theme";
import TrackActionMenu from "./track-action-menu";
import AdInterstitialBanner from "./ad-interstitial-banner";
import ShareSongCardModal from "./share-song-card-modal";
import styles from "./global-player.module.css";

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, "0")}`;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function GlobalPlayerBar() {
  const pathname = usePathname();
  const {
    currentTrack, isPlayerBarHidden, setPlayerBarHidden, isPlaying, isBuffering,
    currentTime, duration, volume, isMuted, isAdPlaying, isPremiumUser, subTier,
    adReason, playbackRate, isShuffle, repeatMode, togglePlay, seek, setVolume,
    toggleMute, setPlaybackRate, toggleShuffle, toggleRepeat, nextTrack, prevTrack,
  } = usePlayer();
  const { vipButtonsEnabled, vipShellEnabled, currentVipTheme, normalTheme } = useVipTheme();
  const isVipButtonsActive = Boolean(isPremiumUser) && vipButtonsEnabled;
  const currentShellTheme = isPremiumUser && vipShellEnabled ? currentVipTheme : normalTheme;
  const accent = isVipButtonsActive ? currentVipTheme.accent : "#c084fc";
  const [liked, setLiked] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const isVisible = Boolean(currentTrack) && !isPlayerBarHidden && !pathname?.startsWith("/dashboard/karaoke");

  // Reserve the actual dock height, including expanded controls and iOS safe area.
  useEffect(() => {
    if (!isVisible || !barRef.current) return;
    const bar = barRef.current;
    const updateHeight = () => document.documentElement.style.setProperty(
      "--moodify-player-height", `${Math.ceil(window.innerHeight - bar.getBoundingClientRect().top)}px`,
    );
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(bar);
    window.addEventListener("resize", updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
      document.documentElement.style.removeProperty("--moodify-player-height");
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isOptionsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOptionsOpen(false);
        optionsButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOptionsOpen]);

  useEffect(() => {
    let cancelled = false;
    if (currentTrack?.spotifyId) {
      isTrackInLibrary(currentTrack.spotifyId)
        .then((value) => { if (!cancelled) setLiked(value); })
        .catch(() => { if (!cancelled) setLiked(false); });
    }
    return () => { cancelled = true; };
  }, [currentTrack?.spotifyId]);

  useEffect(() => {
    const handleLibraryUpdate = (event: Event) => {
      const { detail } = event as CustomEvent<{ trackSpotifyId: string; liked: boolean }>;
      if (detail && currentTrack?.spotifyId && detail.trackSpotifyId === currentTrack.spotifyId) {
        setLiked(detail.liked);
      }
    };
    window.addEventListener("moodify-library-updated", handleLibraryUpdate);
    return () => window.removeEventListener("moodify-library-updated", handleLibraryUpdate);
  }, [currentTrack?.spotifyId]);

  const handleToggleLike = async () => {
    if (!currentTrack?.spotifyId) return;
    const nextState = !liked;
    setLiked(nextState);
    try {
      if (nextState) await addToLibrary(currentTrack.spotifyId);
      else await removeFromLibrary(currentTrack.spotifyId);
      window.dispatchEvent(new CustomEvent("moodify-library-updated", {
        detail: { trackSpotifyId: currentTrack.spotifyId, liked: nextState },
      }));
    } catch (err) {
      console.error("Failed to toggle like:", err);
      setLiked(!nextState);
    }
  };

  if (pathname?.startsWith("/dashboard/karaoke") || !currentTrack) return null;

  const progressPercent = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;
  const repeatLabel = repeatMode === "off" ? "Tắt" : repeatMode === "all" ? "Toàn bộ" : "Một bài";
  const isBasicAd = subTier === "INDIVIDUAL_BASIC" || adReason === "BASIC_DAILY_LIMIT_EXCEEDED";

  return (
    <>
      <AdInterstitialBanner />
      {isPlayerBarHidden ? (
        <button
          type="button"
          onClick={() => setPlayerBarHidden(false)}
          className={styles.reopen}
          aria-label="Mở thanh phát nhạc"
          title={`Mở thanh phát nhạc — ${currentTrack.name}`}
        >
          <Music2 size={20} style={{ color: accent }} />
          <span className={styles.reopenText}>{currentTrack.name}</span>
          {isPlaying && <span className={styles.liveDot} />}
        </button>
      ) : (
        <section
          ref={barRef}
          aria-label="Trình phát nhạc"
          className={`${styles.dock} ${currentShellTheme.playerBg} ${currentShellTheme.playerBorder}`}
          style={{ "--player-accent": accent } as React.CSSProperties}
        >
          <div className={styles.layout}>
            <div className={styles.track}>
              <div className={styles.artwork}>
                {isAdPlaying ? (
                  <>
                    <Image
                      src={isBasicAd ? "/images/ads/moodify_brand_ident_art.jpg" : "/images/ads/moodify_vip_premium_art.jpg"}
                      alt="Ảnh quảng cáo" fill sizes="56px" className="object-cover" priority
                    />
                    <span className={styles.adBadge}>AD</span>
                  </>
                ) : currentTrack.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentTrack.imageUrl} alt={currentTrack.name} />
                ) : <Music2 size={22} style={{ color: accent }} />}
              </div>
              <div className={styles.trackText}>
                <p className={styles.eyebrow}>{isAdPlaying ? "Nội dung tài trợ" : isPlaying ? "Đang phát" : "Đã tạm dừng"}</p>
                <h4 className={styles.title} title={currentTrack.name}>
                  {isAdPlaying ? (isBasicAd ? "Moodify Premium" : "Moodify Studio Sponsor") : currentTrack.name}
                </h4>
                {!isAdPlaying && (
                  <Link
                    href={`/dashboard/artist/${encodeURIComponent(currentTrack.artistSpotifyId || currentTrack.artistName)}`}
                    className={styles.artist} title={currentTrack.artistName}
                  >{currentTrack.artistName}</Link>
                )}
              </div>
              <div className={styles.trackActions}>
                {!isAdPlaying && (
                  <button type="button" onClick={handleToggleLike} className={styles.iconButton}
                    aria-label={liked ? "Bỏ thích bài hát" : "Yêu thích bài hát"} aria-pressed={liked}
                    style={liked ? { color: "#fb7185" } : undefined}>
                    <Heart size={19} fill={liked ? "currentColor" : "none"} />
                  </button>
                )}
                <button ref={optionsButtonRef} type="button" onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                  className={`${styles.iconButton} ${styles.optionsToggle}`} aria-label="Tùy chọn trình phát"
                  aria-expanded={isOptionsOpen} aria-controls="player-options" style={isOptionsOpen ? { color: accent } : undefined}>
                  <SlidersHorizontal size={19} />
                </button>
                <button type="button" onClick={() => setPlayerBarHidden(true)} className={`${styles.iconButton} ${styles.desktopHide}`}
                  aria-label="Ẩn thanh phát nhạc" title="Ẩn thanh phát nhạc">
                  <ChevronDown size={20} />
                </button>
              </div>
            </div>

            <div className={styles.transport}>
              <div className={styles.playback}>
                <button type="button" disabled={isAdPlaying} onClick={toggleShuffle} className={styles.iconButton}
                  aria-label="Phát ngẫu nhiên" aria-pressed={isShuffle} title={`Phát ngẫu nhiên: ${isShuffle ? "Bật" : "Tắt"}`}>
                  <Shuffle size={18} />
                </button>
                <button type="button" disabled={isAdPlaying} onClick={prevTrack} className={styles.iconButton} aria-label="Bài trước">
                  <SkipBack size={21} fill="currentColor" />
                </button>
                <button type="button" disabled={isAdPlaying} onClick={togglePlay}
                  className={`${styles.playButton} ${isVipButtonsActive ? currentVipTheme.primaryBtnClass : "bg-gradient-to-tr from-purple-500 to-pink-500 text-white"}`}
                  aria-label={isPlaying ? "Tạm dừng" : "Phát nhạc"} aria-busy={isBuffering}>
                  {isBuffering ? <Loader2 size={23} className="animate-spin" /> : isPlaying ?
                    <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" className="ml-0.5" />}
                </button>
                <button type="button" disabled={isAdPlaying} onClick={nextTrack} className={styles.iconButton} aria-label="Bài tiếp theo">
                  <SkipForward size={21} fill="currentColor" />
                </button>
                <button type="button" disabled={isAdPlaying} onClick={toggleRepeat} className={styles.iconButton}
                  aria-label={`Lặp lại: ${repeatLabel}`} aria-pressed={repeatMode !== "off"} title={`Lặp lại: ${repeatLabel}`}>
                  {repeatMode === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>
              </div>
              <div className={styles.timeline}>
                <span>{isAdPlaying ? "QC" : formatSeconds(currentTime)}</span>
                <div className={styles.seekTrack}>
                  <div className={styles.seekRail}>
                    <div className={`${styles.seekFill} ${isVipButtonsActive ? `bg-gradient-to-r ${currentVipTheme.equalizerGradient}` : "bg-gradient-to-r from-purple-500 via-pink-500 to-amber-300"}`}
                      style={{ width: `${isAdPlaying ? 100 : progressPercent}%` }} />
                  </div>
                  <input type="range" min={0} max={duration > 0 ? duration : 0} step={0.1}
                    value={Math.min(Math.max(0, currentTime), Math.max(0, duration))}
                    disabled={isAdPlaying || duration <= 0} onChange={(event) => seek(Number(event.target.value))}
                    aria-label="Tiến độ bài hát" aria-valuetext={`${formatSeconds(currentTime)} trên ${formatSeconds(duration)}`}
                    className={styles.seekInput} />
                </div>
                <span>{isAdPlaying ? "0:15" : formatSeconds(duration)}</span>
              </div>
            </div>

            <div id="player-options" className={`${styles.utilities} ${isOptionsOpen ? styles.utilitiesOpen : ""}`}>
              <label className={styles.speed}>
                <Gauge size={16} aria-hidden="true" />
                <span className={styles.optionLabel}>Tốc độ</span>
                <select aria-label="Tốc độ phát" value={playbackRate} disabled={isAdPlaying}
                  onChange={(event) => setPlaybackRate(Number(event.target.value))}>
                  {SPEED_OPTIONS.map((rate) => <option key={rate} value={rate}>{rate}x</option>)}
                </select>
              </label>
              {!isAdPlaying && (
                <div className={styles.extraActions}>
                  <TrackActionMenu track={currentTrack} isLiked={liked} onLikeChange={setLiked} className={styles.iconButton} />
                  <button type="button" onClick={() => setIsShareModalOpen(true)} className={styles.iconButton} aria-label="Chia sẻ bài hát">
                    <Share2 size={18} />
                  </button>
                </div>
              )}
              <div className={styles.volume}>
                <button type="button" onClick={toggleMute} className={styles.iconButton} aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}>
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input type="range" min={0} max={1} step={0.02} value={isMuted ? 0 : volume}
                  onChange={(event) => setVolume(Number(event.target.value))} aria-label="Âm lượng" />
              </div>
              <button type="button" onClick={() => { setIsOptionsOpen(false); setPlayerBarHidden(true); }}
                className={`${styles.iconButton} ${styles.mobileHide}`} aria-label="Ẩn thanh phát nhạc">
                <ChevronDown size={18} /><span>Thu gọn</span>
              </button>
              {isPremiumUser && <span className={styles.vip} style={{ color: accent }}><ShieldCheck size={14} /> VIP</span>}
            </div>
          </div>
        </section>
      )}
      <ShareSongCardModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} track={currentTrack} currentTime={currentTime} />
    </>
  );
}
