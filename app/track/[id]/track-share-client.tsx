"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Share2,
  ExternalLink,
  Check,
  Disc,
  Music,
  ArrowRight,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Clock,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/logo-mark";
import ShareSongCardModal from "@/components/dashboard/share-song-card-modal";

interface TrackShareClientProps {
  trackId: string;
  initialTrack: any;
}

export default function TrackShareClient({
  trackId,
  initialTrack,
}: TrackShareClientProps) {
  const router = useRouter();
  const [track, setTrack] = useState(initialTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && Boolean(navigator.share)) {
      setCanShare(true);
    }
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio source resolution
  const audioSrc = track?.audioUrl || (track?.localPath ? `http://158.178.247.33/${track.localPath.replace(/^\/+/, "")}` : undefined);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || (track?.durationMs ? track.durationMs / 1000 : 0));
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [track]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.warn("Playback error:", e));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleNativeShare = async () => {
    if (typeof window === "undefined") return;
    const shareUrl = window.location.href;
    const shareData = {
      title: `${track?.name} - ${track?.artistName} | Moodify`,
      text: `Nghe bài hát "${track?.name}" của ${track?.artistName} trên Moodify 🎧`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("Share error:", err);
        }
      }
    }
    handleCopyLink();
  };

  const handleOpenApp = () => {
    const targetParam = track?.spotifyId || track?.id || trackId;
    router.push(`/dashboard/user?track=${encodeURIComponent(targetParam)}`);
  };

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!track) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-4">
          <Music className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-200 mb-2">Không tìm thấy bài hát</h1>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          Liên kết bài hát này có thể đã hết hạn hoặc không tồn tại trên hệ thống Moodify.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25"
        >
          Về Trang chủ Moodify
        </Link>
      </div>
    );
  }

  const coverImage = track.imageUrl || "https://moodify.vn/Brand/moodify_brand_assets/web/og-image.png";

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col relative overflow-hidden select-none font-sans">
      {/* Background Ambient Glow & Blur derived from Album Cover */}
      <div
        className="absolute inset-0 bg-cover bg-center filter blur-[100px] opacity-25 scale-125 pointer-events-none"
        style={{ backgroundImage: `url(${coverImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-slate-950/85 to-[#07090e] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandLogo className="h-8 w-auto" />
        </Link>

        <button
          onClick={handleOpenApp}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
        >
          <span>Mở Ứng dụng</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 animate-in fade-in zoom-in-95 duration-300">
          {/* Left Column: Vinyl Disc with Album Art */}
          <div className="relative group shrink-0">
            {/* Glow outer ring */}
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-2xl group-hover:bg-cyan-500/35 transition-all" />

            {/* Vinyl Record */}
            <div
              className={`relative w-56 h-56 sm:w-68 sm:h-68 rounded-full bg-slate-950 border-4 border-white/15 shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-700 ${
                isPlaying ? "animate-[spin_12s_linear_infinite]" : ""
              }`}
            >
              {/* Concentric Grooves */}
              <div className="absolute inset-4 rounded-full border border-white/5 pointer-events-none" />
              <div className="absolute inset-8 rounded-full border border-white/5 pointer-events-none" />
              <div className="absolute inset-12 rounded-full border border-white/5 pointer-events-none" />
              <div className="absolute inset-16 rounded-full border border-white/5 pointer-events-none" />

              {/* Center Cover Artwork */}
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-white/40 shadow-xl relative z-10">
                <img
                  src={coverImage}
                  alt={track.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10" />
              </div>

              {/* Center Spindle Hole */}
              <div className="w-4 h-4 rounded-full bg-slate-950 border-2 border-white/80 absolute z-20 shadow-md" />
            </div>

            {/* Floating Live Badge */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/80 border border-white/15 backdrop-blur-md flex items-center gap-2 shadow-lg text-[11px] font-medium text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-cyan-400 animate-ping" : "bg-slate-500"}`} />
              <span>{isPlaying ? "Đang phát thử" : "Bản thu âm chất lượng cao"}</span>
            </div>
          </div>

          {/* Right Column: Track Details, Audio Player, Actions */}
          <div className="flex-1 w-full flex flex-col justify-between text-center md:text-left">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>BÀI HÁT ĐƯỢC CHIA SẺ TRÊN MOODIFY</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {track.name}
              </h1>

              <p className="text-base sm:text-lg font-medium text-slate-300 mt-1">
                {track.artistName}
              </p>

              {track.albumName && (
                <p className="text-xs text-slate-400 mt-1 flex items-center justify-center md:justify-start gap-1">
                  <Disc className="w-3.5 h-3.5 text-slate-500" />
                  <span>Album: {track.albumName}</span>
                </p>
              )}

              {/* Genres tags */}
              {track.genres && track.genres.length > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 mt-3">
                  {track.genres.slice(0, 3).map((g: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] capitalize"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Audio Player Controls */}
            {audioSrc && (
              <div className="my-6 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                <audio ref={audioRef} src={audioSrc} preload="metadata" />

                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black flex items-center justify-center shadow-lg shadow-cyan-500/25 transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                      <span>{formatSeconds(currentTime)}</span>
                      <span>{formatSeconds(duration || (track.durationMs ? track.durationMs / 1000 : 0))}</span>
                    </div>
                  </div>

                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleOpenApp}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-bold text-sm sm:text-base shadow-xl shadow-cyan-500/30 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>Nghe trọn vẹn trên Moodify (Có lời &amp; VIP)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span>Tạo Story &amp; Card nghệ thuật</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                  title="Sao chép link bài hát"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "Đã copy link" : "Copy Link"}</span>
                </button>

                {canShare && (
                  <button
                    onClick={handleNativeShare}
                    className="p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-all cursor-pointer"
                    title="Chia sẻ nhanh qua Zalo, Messenger, Stories"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-6 text-xs text-slate-500">
        Moodify Music • Nền tảng phát nhạc trực tuyến cá nhân hóa theo cảm xúc
      </footer>

      {/* Share Song Card Modal */}
      <ShareSongCardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        track={{
          id: track.id,
          spotifyId: track.spotifyId,
          name: track.name,
          artistName: track.artistName,
          albumName: track.albumName,
          imageUrl: track.imageUrl,
          durationMs: track.durationMs,
          lyricsPlain: track.lyricsPlain,
          lyricsSynced: track.lyricsSynced,
        }}
        currentTime={currentTime}
      />
    </div>
  );
}
