"use client";

import type { ComponentProps } from "react";

const COVER_PLACEHOLDER = "/images/cover-placeholder.svg";

type Props = Omit<ComponentProps<"img">, "src"> & { src?: string | null };

export function AdminCoverImage({ src, alt, onError, ...props }: Props) {
  return (
    // Remote catalog images may expire; keep an explicit local missing-cover state.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={src?.trim() || COVER_PLACEHOLDER}
      alt={alt}
      onError={(event) => {
        if (event.currentTarget.getAttribute("src") !== COVER_PLACEHOLDER) {
          event.currentTarget.src = COVER_PLACEHOLDER;
        }
        onError?.(event);
      }}
    />
  );
}
