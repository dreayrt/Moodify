import type { Metadata } from "next";
import KaraokeRoomPage from "@/features/dashboard/karaoke/components/karaoke-room-page";

export const metadata: Metadata = {
  title: "Phòng Karaoke | Moodify",
  description: "Giao diện phòng hát cùng nhau trên Moodify.",
};

export default async function KaraokeSharedRoomRoute({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { roomId } = await params;
  const search = await searchParams;
  const name = search.name;
  const roomName = Array.isArray(name) ? name[0] : name;
  return <KaraokeRoomPage roomId={roomId} roomName={roomName} />;
}
