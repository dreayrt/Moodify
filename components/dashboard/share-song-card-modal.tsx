"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Music,
  Quote,
  Palette,
  Smartphone,
  Square,
  RectangleVertical,
  Radio,
  ExternalLink,
} from "lucide-react";
import { PlayerTrack } from "./player-context";
import { parseLyrics, LyricLine } from "./realtime-lyrics";

export interface ShareSongCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: PlayerTrack | null;
  currentTime?: number;
}

type AspectRatio = "story" | "square" | "portrait";

type ThemePreset = {
  id: string;
  name: string;
  bgGradient: string;
  canvasBg: [string, string, string];
  accentColor: string;
  textColor: string;
  badgeBg: string;
  borderGlow: string;
};

const THEMES: ThemePreset[] = [
  {
    id: "aura",
    name: "Aura Neon",
    bgGradient: "from-indigo-950 via-purple-950 to-slate-950",
    canvasBg: ["#1e1b4b", "#3b0764", "#020617"],
    accentColor: "#a855f7",
    textColor: "#f3e8ff",
    badgeBg: "rgba(168, 85, 247, 0.2)",
    borderGlow: "rgba(168, 85, 247, 0.4)",
  },
  {
    id: "sunset",
    name: "Sunset Rose",
    bgGradient: "from-rose-950 via-amber-950 to-slate-950",
    canvasBg: ["#4c0519", "#451a03", "#020617"],
    accentColor: "#f43f5e",
    textColor: "#ffe4e6",
    badgeBg: "rgba(244, 63, 94, 0.2)",
    borderGlow: "rgba(244, 63, 94, 0.4)",
  },
  {
    id: "emerald",
    name: "Emerald Mist",
    bgGradient: "from-teal-950 via-emerald-950 to-slate-950",
    canvasBg: ["#042f2e", "#022c22", "#020617"],
    accentColor: "#10b981",
    textColor: "#d1fae5",
    badgeBg: "rgba(16, 185, 129, 0.2)",
    borderGlow: "rgba(16, 185, 129, 0.4)",
  },
  {
    id: "obsidian",
    name: "Obsidian Gold",
    bgGradient: "from-amber-950/60 via-stone-900 to-black",
    canvasBg: ["#292524", "#1c1917", "#000000"],
    accentColor: "#f59e0b",
    textColor: "#fef3c7",
    badgeBg: "rgba(245, 158, 11, 0.2)",
    borderGlow: "rgba(245, 158, 11, 0.4)",
  },
];

export default function ShareSongCardModal({
  isOpen,
  onClose,
  track,
  currentTime = 0,
}: ShareSongCardModalProps) {
  const [aspect, setAspect] = useState<AspectRatio>("story");
  const [activeTheme, setActiveTheme] = useState<ThemePreset>(THEMES[0]);
  const [customQuote, setCustomQuote] = useState("");
  const [selectedLyricIndex, setSelectedLyricIndex] = useState<number>(-1);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  const previewCardRef = useRef<HTMLDivElement | null>(null);

  // Parse lyrics
  const lyricLines = useMemo(() => {
    if (!track) return [];
    const raw = track.lyricsSynced || track.lyricsPlain || "";
    return parseLyrics(raw, (track.durationMs || 180000) / 1000);
  }, [track]);

  // Preselect lyric line matching current playback time or first line
  useEffect(() => {
    if (lyricLines.length > 0 && selectedLyricIndex === -1) {
      const idx = lyricLines.findIndex(
        (l) => currentTime >= l.time && currentTime <= l.endTime
      );
      if (idx >= 0) {
        setSelectedLyricIndex(idx);
        setCustomQuote(lyricLines[idx].text);
      } else {
        setSelectedLyricIndex(0);
        setCustomQuote(lyricLines[0].text);
      }
    } else if (lyricLines.length === 0 && !customQuote) {
      setCustomQuote("Giai điệu chạm đến từng nhịp cảm xúc...");
    }
  }, [lyricLines, currentTime, selectedLyricIndex, customQuote]);

  if (!isOpen || !track) return null;

  const currentDisplayQuote = customQuote.trim() || (track ? `Đang nghe "${track.name}" trên Moodify` : "");

  // Generate PNG via high-resolution HTML5 Canvas
  const generateCanvasImage = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");

    // Dimensions
    let width = 1080;
    let height = 1920; // 9:16
    if (aspect === "square") {
      height = 1080; // 1:1
    } else if (aspect === "portrait") {
      height = 1350; // 4:5
    }

    canvas.width = width;
    canvas.height = height;

    // 1. Draw rich background gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, activeTheme.canvasBg[0]);
    grad.addColorStop(0.5, activeTheme.canvasBg[1]);
    grad.addColorStop(1, activeTheme.canvasBg[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative radial aura glow
    const radial = ctx.createRadialGradient(
      width / 2,
      height * 0.35,
      50,
      width / 2,
      height * 0.35,
      width * 0.7
    );
    radial.addColorStop(0, activeTheme.borderGlow);
    radial.addColorStop(1, "transparent");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw card container
    const margin = 80;
    const cardX = margin;
    const cardY = aspect === "story" ? 180 : 80;
    const cardW = width - margin * 2;
    const cardH = height - (aspect === "story" ? 360 : 160);

    // Rounded card background with glass effect
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 24;

    ctx.beginPath();
    const radius = 48;
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fillStyle = "rgba(10, 15, 30, 0.75)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // 3. Top Branding Tag inside Card
    const tagY = cardY + 70;
    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = activeTheme.accentColor;
    ctx.textAlign = "center";
    ctx.fillText("✨ MOODIFY MUSIC • BẢN GHI ÂM SỐ", width / 2, tagY);

    // 4. Draw Album Artwork (or stylized vinyl fallback)
    const artSize = aspect === "story" ? 540 : aspect === "portrait" ? 440 : 380;
    const artX = (width - artSize) / 2;
    const artY = tagY + 50;

    let imageLoaded = false;
    if (track.imageUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = track.imageUrl!;
        });

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(artX, artY, artSize, artSize, 36);
        ctx.clip();
        ctx.drawImage(img, artX, artY, artSize, artSize);
        ctx.restore();

        // Stroke border
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(artX, artY, artSize, artSize, 36);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

        imageLoaded = true;
      } catch (_) {
        imageLoaded = false;
      }
    }

    if (!imageLoaded) {
      // Fallback stylized vinyl disc
      ctx.save();
      const discCenterX = width / 2;
      const discCenterY = artY + artSize / 2;
      const discR = artSize / 2;

      ctx.beginPath();
      ctx.arc(discCenterX, discCenterY, discR, 0, Math.PI * 2);
      ctx.fillStyle = "#090d16";
      ctx.fill();
      ctx.strokeStyle = activeTheme.accentColor;
      ctx.lineWidth = 6;
      ctx.stroke();

      // Grooves
      for (let r = discR - 30; r > 60; r -= 25) {
        ctx.beginPath();
        ctx.arc(discCenterX, discCenterY, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Center label
      ctx.beginPath();
      ctx.arc(discCenterX, discCenterY, 65, 0, Math.PI * 2);
      ctx.fillStyle = activeTheme.accentColor;
      ctx.fill();
      ctx.restore();
    }

    // 5. Track Title & Artist Name
    const titleY = artY + artSize + 70;
    ctx.textAlign = "center";
    ctx.font = "bold 44px sans-serif";
    ctx.fillStyle = "#ffffff";

    let displayTitle = track.name;
    if (displayTitle.length > 28) {
      displayTitle = displayTitle.slice(0, 26) + "...";
    }
    ctx.fillText(displayTitle, width / 2, titleY);

    ctx.font = "500 32px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText(track.artistName, width / 2, titleY + 50);

    // 6. Audio Waveform Bars (Decorative)
    const waveY = titleY + 95;
    const totalBars = 32;
    const barWidth = 6;
    const barGap = 10;
    const totalWaveW = totalBars * (barWidth + barGap);
    const waveStartX = (width - totalWaveW) / 2;

    for (let i = 0; i < totalBars; i++) {
      const barH = 12 + Math.abs(Math.sin((i / totalBars) * Math.PI * 3)) * 42;
      const x = waveStartX + i * (barWidth + barGap);
      const y = waveY - barH / 2;

      ctx.fillStyle = i < totalBars / 2 ? activeTheme.accentColor : "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 3);
      ctx.fill();
    }

    // 7. Lyric Quote Box
    const quoteBoxY = waveY + 45;
    const quoteBoxW = cardW - 100;
    const quoteBoxX = (width - quoteBoxW) / 2;

    if (currentDisplayQuote) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(quoteBoxX, quoteBoxY, quoteBoxW, aspect === "story" ? 220 : 150, 24);
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.fill();
      ctx.strokeStyle = activeTheme.borderGlow;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Quote symbol
      ctx.font = "bold 48px serif";
      ctx.fillStyle = activeTheme.accentColor;
      ctx.textAlign = "left";
      ctx.fillText("“", quoteBoxX + 28, quoteBoxY + 52);

      // Quote text wrapped
      ctx.font = "italic 32px sans-serif";
      ctx.fillStyle = activeTheme.textColor;
      ctx.textAlign = "center";

      const words = currentDisplayQuote.split(" ");
      let line = "";
      const lines: string[] = [];
      const maxWidth = quoteBoxW - 100;

      for (const w of words) {
        const testLine = line + w + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== "") {
          lines.push(line);
          line = w + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      const maxLinesToDraw = aspect === "story" ? 3 : 2;
      const displayedLines = lines.slice(0, maxLinesToDraw);
      const lineHeight = 42;
      const textStartY = quoteBoxY + 68 + (displayedLines.length === 1 ? 20 : 0);

      displayedLines.forEach((l, idx) => {
        ctx.fillText(l.trim(), width / 2, textStartY + idx * lineHeight);
      });

      ctx.restore();
    }

    // 8. Bottom Moodify Stamp & URL
    const footerY = cardY + cardH - 50;
    ctx.textAlign = "center";
    ctx.font = "600 24px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillText("🎧 Nghe trọn vẹn tại moodify.vn", width / 2, footerY);

    return canvas;
  };

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      const canvas = await generateCanvasImage();
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      const cleanName = track.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.download = `moodify-${cleanName}-${aspect}.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
      alert("Không thể tải ảnh. Vui lòng thử lại!");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    try {
      setIsExporting(true);
      const canvas = await generateCanvasImage();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.clipboard && (window as any).ClipboardItem) {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ "image/png": blob }),
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2500);
        } else {
          handleDownload();
        }
      });
    } catch (err) {
      console.warn("Copy image not supported:", err);
      handleDownload();
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/dashboard/search?q=${encodeURIComponent(
      track.name
    )}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareFacebook = () => {
    const url = `${window.location.origin}/dashboard/search?q=${encodeURIComponent(
      track.name
    )}`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  const handleShareTwitter = () => {
    const url = `${window.location.origin}/dashboard/search?q=${encodeURIComponent(
      track.name
    )}`;
    const text = `Đang nghe "${track.name}" của ${track.artistName} trên Moodify 🎵`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  return typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl bg-slate-950/95 border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col md:flex-row">
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* LEFT: Live Interactive Card Preview */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-white/[0.04] to-transparent overflow-y-auto min-h-[460px]">
              <div
                ref={previewCardRef}
                className={`relative transition-all duration-300 rounded-3xl p-5 border shadow-2xl flex flex-col items-center justify-between text-center overflow-hidden bg-gradient-to-br ${activeTheme.bgGradient}`}
                style={{
                  borderColor: activeTheme.borderGlow,
                  width: aspect === "story" ? "270px" : aspect === "portrait" ? "296px" : "310px",
                  height: aspect === "story" ? "480px" : aspect === "portrait" ? "370px" : "310px",
                  boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 30px ${activeTheme.borderGlow}`,
                }}
              >
                {/* Background Ambient Glow */}
                <div
                  className="absolute -top-12 -left-12 w-40 h-40 rounded-full blur-3xl opacity-40 pointer-events-none"
                  style={{ backgroundColor: activeTheme.accentColor }}
                />

                {/* Top Badge */}
                <div className="relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-white/20 bg-white/10 backdrop-blur-md text-white">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>
                    {aspect === "story"
                      ? "MOODIFY STORY"
                      : aspect === "portrait"
                      ? "MOODIFY FEED"
                      : "MOODIFY MUSIC"}
                  </span>
                </div>

                {/* Artwork - Clean, centered with sleek shadow */}
                <div className="relative z-10 my-auto flex items-center justify-center">
                  <div
                    className="relative rounded-2xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.6)] border border-white/20 bg-slate-900 mx-auto transition-transform hover:scale-105 duration-300"
                    style={{
                      width: aspect === "story" ? "148px" : aspect === "portrait" ? "134px" : "118px",
                      height: aspect === "story" ? "148px" : aspect === "portrait" ? "134px" : "118px",
                    }}
                  >
                    {track.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.imageUrl}
                        alt={track.name}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-900/50">
                        <Music className="w-10 h-10 text-purple-300" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Song Info */}
                <div className="relative z-10 w-full px-2">
                  <h3 className="font-bold text-white text-sm sm:text-base leading-tight truncate">
                    {track.name}
                  </h3>
                  <p className="text-xs text-white/70 truncate mt-0.5">
                    {track.artistName}
                  </p>

                  {/* Audio Bars visualizer */}
                  <div className="flex items-center justify-center gap-1 my-2">
                    {[16, 28, 20, 36, 24, 40, 18, 30, 22, 34, 16].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 rounded-full animate-pulse"
                        style={{
                          height: `${Math.round(h * (aspect === "square" ? 0.35 : 0.45))}px`,
                          backgroundColor:
                            i % 2 === 0
                              ? activeTheme.accentColor
                              : "rgba(255,255,255,0.4)",
                          animationDelay: `${i * 120}ms`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Lyric Quote */}
                  {currentDisplayQuote && (
                    <div className="relative px-3 py-1.5 rounded-xl bg-white/[0.08] border border-white/15 backdrop-blur-md text-[11px] font-medium italic text-white/90 leading-snug line-clamp-2 shadow-sm">
                      &ldquo;{currentDisplayQuote}&rdquo;
                    </div>
                  )}
                </div>

                {/* Footer Brand */}
                <div className="relative z-10 text-[9.5px] font-medium text-white/50 tracking-wider">
                  moodify.vn • Cảm xúc âm nhạc
                </div>
              </div>
            </div>

            {/* RIGHT: Customization & Export Controls */}
            <div className="w-full md:w-[380px] p-6 bg-slate-900/80 border-t md:border-t-0 md:border-l border-white/10 flex flex-col justify-between overflow-y-auto max-h-[85vh] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
              <div className="space-y-5">
                <div className="pr-8">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-purple-400 shrink-0" />
                    <span>Tạo Card &amp; Story bài hát</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Tùy biến tấm card nghệ thuật để chia sẻ lên Story Instagram, Facebook hoặc bạn bè.
                  </p>
                </div>

                {/* Format selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Kích thước Card
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAspect("story")}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                        aspect === "story"
                          ? "bg-purple-500/20 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Story (9:16)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAspect("square")}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                        aspect === "square"
                          ? "bg-purple-500/20 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Square className="w-4 h-4" />
                      <span>Vuông (1:1)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAspect("portrait")}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                        aspect === "portrait"
                          ? "bg-purple-500/20 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <RectangleVertical className="w-4 h-4" />
                      <span>Feed (4:5)</span>
                    </button>
                  </div>
                </div>

                {/* Theme Palette */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-cyan-400" />
                    Phong cách màu sắc
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {THEMES.map((thm) => (
                      <button
                        key={thm.id}
                        type="button"
                        onClick={() => setActiveTheme(thm)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition cursor-pointer text-left ${
                          activeTheme.id === thm.id
                            ? "border-white/40 bg-white/15 text-white shadow-md"
                            : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: thm.accentColor }}
                        />
                        <span className="truncate">{thm.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lyric Quote Selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-pink-400" />
                    Câu hát / Lời nhắn tâm đắc
                  </label>

                  {lyricLines.length > 0 && (
                    <div className="mb-2 max-h-24 overflow-y-auto space-y-1 p-1 bg-black/30 rounded-xl border border-white/10 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
                      {lyricLines.slice(0, 12).map((line, idx) => (
                        <button
                          key={line.id}
                          type="button"
                          onClick={() => {
                            setSelectedLyricIndex(idx);
                            setCustomQuote(line.text);
                          }}
                          className={`w-full text-left px-2.5 py-1 rounded-lg text-xs truncate transition cursor-pointer ${
                            selectedLyricIndex === idx
                              ? "bg-purple-500/25 text-purple-200 font-semibold"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          &ldquo;{line.text}&rdquo;
                        </button>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={customQuote}
                    onChange={(e) => setCustomQuote(e.target.value)}
                    placeholder="Nhập câu hát hoặc caption của bạn..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 border-t border-white/10 space-y-2 mt-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-bold shadow-[0_4px_15px_rgba(168,85,247,0.4)] transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExporting ? "Đang tạo..." : "Tải ảnh HD (PNG)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyImage}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {copiedImage ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copiedImage ? "Đã chép ảnh" : "Chép ảnh"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs border border-white/10 transition cursor-pointer"
                  >
                    {copiedLink ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedLink ? "Đã copy link" : "Sao chép link"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareFacebook}
                    className="px-3 py-2 rounded-xl bg-[#1877f2]/20 hover:bg-[#1877f2]/30 text-[#1877f2] text-xs font-semibold border border-[#1877f2]/30 transition cursor-pointer"
                    title="Chia sẻ Facebook"
                  >
                    FB
                  </button>

                  <button
                    type="button"
                    onClick={handleShareTwitter}
                    className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-xs font-semibold border border-sky-500/30 transition cursor-pointer"
                    title="Chia sẻ X / Twitter"
                  >
                    X
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
}
