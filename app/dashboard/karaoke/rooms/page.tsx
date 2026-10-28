import type { Metadata } from "next";
import KaraokeRoomsPage from "@/features/dashboard/karaoke/components/karaoke-rooms-page";

export const metadata: Metadata = {
  title: "Chọn phòng Karaoke | Moodify",
  description: "Chọn một phòng karaoke hoặc tạo phòng mới.",
};

export default function KaraokeRoomsRoute() {
  return <KaraokeRoomsPage />;
}
