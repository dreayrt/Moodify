import type { Metadata } from "next";
import ContentLeadDashboardPage from "@/features/dashboard/content-lead/components/dashboard-content-lead-page";

export const metadata: Metadata = {
  title: "Moodify — Content Lead Studio",
  description: "Trung tâm quản trị nội dung âm nhạc và phát hành tác phẩm Moodify",
};

export default function DashboardContentLeadPage() {
  return <ContentLeadDashboardPage />;
}