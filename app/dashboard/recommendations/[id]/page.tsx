import { Suspense } from "react";
import RecommendedPlaylistDetail from "@/components/dashboard/recommended-playlist-detail";

export default async function RecommendationPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense fallback={<div className="p-8 text-white/50">Đang tải playlist...</div>}><RecommendedPlaylistDetail key={id} id={id} /></Suspense>;
}
