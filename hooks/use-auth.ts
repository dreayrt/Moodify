"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getStoredAuthSession,
  getCurrentUser,
  type UserProfileResponse,
} from "@/lib/auth-client";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const session = getStoredAuthSession();
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        const userData = await getCurrentUser(session.accessToken);
        setUser(userData);
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  return { user, loading, router };
}
