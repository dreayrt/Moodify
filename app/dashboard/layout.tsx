import { PlayerProvider } from "@/components/dashboard/player-context";
import { GlobalPlayerBar } from "@/components/dashboard/global-player";
import DashboardShell from "@/components/dashboard/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlayerProvider>
      <DashboardShell>
        {children}
      </DashboardShell>
      <GlobalPlayerBar />
    </PlayerProvider>
  );
}
