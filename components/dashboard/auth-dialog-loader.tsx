"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { UserProfileResponse } from "@/lib/auth-client";

const AuthDialogs = dynamic(() => import("@/features/home/components/hero-carousel").then(module => module.HeroCarousel));

export default function AuthDialogLoader({ onAuthenticated }: { onAuthenticated: (user: UserProfileResponse) => void }) {
  const [request, setRequest] = useState<{ mode: "login" | "register"; sequence: number } | null>(null);
  useEffect(() => {
    const open = (event: Event) => {
      const mode = (event as CustomEvent<{ mode?: string }>).detail?.mode;
      if (mode === "login" || mode === "register") setRequest(previous => ({ mode, sequence: (previous?.sequence ?? 0) + 1 }));
    };
    window.addEventListener("moodify-open-auth", open);
    return () => window.removeEventListener("moodify-open-auth", open);
  }, []);
  return request ? <AuthDialogs authOnly authRequest={request} onAuthenticated={onAuthenticated} /> : null;
}
