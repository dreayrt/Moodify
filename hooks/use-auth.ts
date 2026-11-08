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
    async function checkAuth() {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const userData = await getCurrentUser(accessToken);
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
