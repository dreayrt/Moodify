"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getValidAccessToken,
  type UserProfileResponse,
} from "@/lib/auth-client";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let generation = 0;
    let mounted = true;
    async function checkAuth() {
      const request = ++generation;
      const current = () => mounted && request === generation;
      try {
      const accessToken = await getValidAccessToken();
      if (!current()) return;
      if (!accessToken) {
        setUser(null);
        setLoading(false);
        return;
      }

        const userData = await getCurrentUser(accessToken);
        if (current()) setUser(userData);
      } catch (error) {
        if (current()) console.error("Auth check failed:", error);
      } finally {
        if (current()) setLoading(false);
      }
    }

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "moodify.auth.session") void checkAuth();
    };
    void checkAuth();
    window.addEventListener("moodify-auth-changed", checkAuth);
    window.addEventListener("storage", onStorage);
    return () => {
      mounted = false;
      window.removeEventListener("moodify-auth-changed", checkAuth);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { user, loading, router };
}
