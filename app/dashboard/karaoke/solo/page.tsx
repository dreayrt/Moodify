import type { Metadata } from "next";
import KaraokeSoloPage from "@/features/dashboard/karaoke/components/karaoke-solo-page";

export const metadata: Metadata = {
  title: "Hát một mình | Moodify Karaoke",
  description: "Sân khấu karaoke cá nhân của bạn.",
};

export default function KaraokeSoloRoute() {
  return <KaraokeSoloPage />;
}
