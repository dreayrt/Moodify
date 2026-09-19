"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import LumenHero from "@/components/dashboard/lumen-hero";

export default function DashboardPage() {
  const { user, loading, router } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60">Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <LumenHero />;
}
