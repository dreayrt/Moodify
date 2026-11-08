import RecommendationSections from "@/components/dashboard/recommendation-sections";

export default function RecommendationsPage() {
  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-8"><div><p className="mb-2 text-xs uppercase tracking-widest text-purple-300">Dành riêng cho bạn</p><h1 className="font-display text-3xl font-bold text-white">Nhạc và bản phối của bạn</h1><p className="mt-3 text-sm text-white/50">Từ những bài bạn nghe, lưu và khám phá mỗi ngày.</p></div><RecommendationSections /></div>;
}
