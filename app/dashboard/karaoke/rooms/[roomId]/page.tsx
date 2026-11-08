import type { Metadata } from "next";
import KaraokeRoomPage from "@/features/dashboard/karaoke/components/karaoke-room-page";

export const metadata: Metadata = {
  title: "Phòng Karaoke | Moodify",
  description: "Giao diện phòng hát cùng nhau trên Moodify.",
};

export default async function KaraokeSharedRoomRoute({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <KaraokeRoomPage roomId={roomId} />;
}
