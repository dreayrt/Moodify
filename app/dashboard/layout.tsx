"use client";

import { usePathname } from "next/navigation";
import { PlayerProvider } from "@/components/dashboard/player-context";
import { GlobalPlayerBar } from "@/components/dashboard/global-player";
import DashboardShell from "@/components/dashboard/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isStudioRoute =
    pathname?.startsWith("/dashboard/artist") ||
    pathname?.startsWith("/dashboard/moderator");

  if (isStudioRoute) {
    return <>{children}</>;
  }

  return (
    <PlayerProvider>
      <DashboardShell>{children}</DashboardShell>
      <GlobalPlayerBar />
    </PlayerProvider>
  );
}
