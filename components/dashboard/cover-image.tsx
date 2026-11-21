"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type Props = Omit<ImageProps, "src" | "fill"> & { src: string };

export default function CoverImage({ src, alt, width = 320, height = 320, sizes = "160px", onError, ...props }: Props) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  let optimize = src.startsWith("/covers/") || src.startsWith("/images/");
  try {
    const url = new URL(src);
    optimize ||= url.protocol === "https:" && (
      ["i.scdn.co", "images.unsplash.com"].includes(url.hostname) ||
      (["moodify.click", "api.moodify.click"].includes(url.hostname) && url.pathname.startsWith("/uploads/"))
    );
  } catch { /* Relative or custom media keeps its original URL. */ }
  return <Image {...props} src={src} alt={alt} width={width} height={height} sizes={sizes}
    loading={props.loading ?? "lazy"} decoding="async" unoptimized={!optimize || failedSource === src}
    onError={(event) => {
      if (optimize && failedSource !== src) setFailedSource(src);
      else onError?.(event);
    }} />;
}
