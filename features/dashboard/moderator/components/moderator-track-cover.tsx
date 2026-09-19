"use client";

import { useState, useEffect } from "react";
import { Music2 } from "lucide-react";

export function resolveMediaUrl(url?: string): string {
  if (!url || typeof url !== "string" || !url.trim()) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8080";
  return `${apiBase.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}

interface ModeratorTrackCoverProps {
  coverUrl?: string;
  title: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-10 w-10 rounded-lg text-[11px]",
  md: "h-12 w-12 rounded-xl text-[12px]",
  lg: "h-20 w-20 rounded-xl text-[16px]",
  xl: "h-28 w-28 rounded-2xl text-[22px]",
};

export function ModeratorTrackCover({
  coverUrl,
  title,
  size = "md",
  className = "",
}: ModeratorTrackCoverProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = resolveMediaUrl(coverUrl);

  // Reset error status if coverUrl changes
  useEffect(() => {
    setHasError(false);
  }, [coverUrl]);

  const initials = (title || "Track")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .slice(0, 2)
    .toUpperCase() || "TR";

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  if (!resolvedUrl || hasError) {
    return (
      <div
        className={`relative shrink-0 select-none overflow-hidden border border-white/10 bg-gradient-to-br from-[#2a1b12] via-[#1a1c28] to-[#0f111a] font-bold text-white/90 shadow-md flex items-center justify-center ${sizeClass} ${className}`}
      >
        {/* Decorative background aura */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#ff7a2c]/20 to-transparent pointer-events-none" />
        <span className="relative z-10 tracking-wider text-white/80 font-semibold drop-shadow">
          {initials}
        </span>
        <div className="absolute bottom-1 right-1 opacity-25">
          <Music2 className="h-3 w-3 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-white/10 bg-black/40 shadow-md ${sizeClass} ${className}`}
    >
      <img
        src={resolvedUrl}
        alt=""
        onError={() => setHasError(true)}
        className="h-full w-full object-cover transition-opacity duration-200"
      />
    </div>
  );
}
