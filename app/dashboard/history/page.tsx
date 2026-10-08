import UserListeningHistoryPage from "@/features/dashboard/user/components/user-listening-history-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lịch Sử Nghe Nhạc | Moodify",
  description: "Lịch sử phát các bài hát gần đây trên Moodify.",
};

export default function HistoryPage() {
  return <UserListeningHistoryPage />;
}
