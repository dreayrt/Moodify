import type { Metadata } from "next";
import KaraokeHomePage from "@/features/dashboard/karaoke/components/karaoke-home-page";

export const metadata: Metadata = {
  title: "Chọn chế độ Karaoke | Moodify",
  description: "Chọn hát một mình hoặc hát cùng mọi người trên Moodify.",
};

export default function KaraokePage() {
  return <KaraokeHomePage />;
}
