import type { Metadata } from "next";
import ContentLeadDashboardPage from "@/features/dashboard/content-lead/components/dashboard-content-lead-page";

export const metadata: Metadata = {
  title: "Moodify — Quản lý nội dung",
  description: "Trung tâm quản lý nội dung âm nhạc và phát hành tác phẩm Moodify",
};

export default function DashboardContentLeadPage() {
  return <ContentLeadDashboardPage />;
}