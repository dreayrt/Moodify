"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getStoredAuthSession } from "@/lib/auth/auth-client";

function extractRoleFromJwt(token?: string): string | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    const payload = JSON.parse(json) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

function getActiveAdminRole(): string | null {
  const session = getStoredAuthSession();
  if (!session) return null;
  const now = Date.now();
  const hasLiveToken =
    session.accessTokenExpiresAt > now || session.refreshTokenExpiresAt > now;
  if (!hasLiveToken) return null;

  const tokenRole =
    extractRoleFromJwt(session.accessToken) ?? extractRoleFromJwt(session.refreshToken);
  if (tokenRole) return tokenRole;

  try {
    const rawUser = window.localStorage.getItem("moodify.auth.user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as { role?: unknown };
      if (typeof parsed.role === "string") {
        return parsed.role.trim().toUpperCase();
      }
    }
  } catch {
    // Ignore storage parse failure
  }
  return null;
}

export function AdminRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const enforceAdminConfinement = () => {
      const role = getActiveAdminRole();
      if (role === "ADMIN" && pathname && !pathname.startsWith("/dashboard/admin")) {
        router.replace("/dashboard/admin");
      }
    };

    enforceAdminConfinement();
    const handleStorage = (event: StorageEvent) => {
      if (
        !event.key ||
        event.key === "moodify.auth.session" ||
        event.key === "moodify.auth.user"
      ) {
        enforceAdminConfinement();
      }
    };
    window.addEventListener("moodify-auth-changed", enforceAdminConfinement);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("moodify-auth-changed", enforceAdminConfinement);
      window.removeEventListener("storage", handleStorage);
    };
  }, [pathname, router]);

  return null;
}
