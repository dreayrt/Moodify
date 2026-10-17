import { Metadata } from "next";
import UserSearchHistoryPage from "@/features/dashboard/user/components/user-search-history-page";

export const metadata: Metadata = {
  title: "Lịch Sử Tìm Kiếm | Moodify",
  description: "Xem, tìm lại và quản lý lịch sử tìm kiếm của bạn trên Moodify.",
};

export default function SearchHistoryPage() {
  return <UserSearchHistoryPage />;
}
