import { Headphones, Laptop, Radio } from "lucide-react";

const FEATURES = [
  {
    title: "Bắt trọn nhịp cảm xúc",
    description:
      "Nhận diện tâm trạng để gợi ý danh sách nhạc phù hợp, không mất thời gian tìm kiếm.",
    icon: Headphones,
    color: "purple",
  },
  {
    title: "Đồng bộ đa thiết bị",
    description:
      "Trải nghiệm liền mạch từ máy tính đến thiết bị di động mọi lúc mọi nơi.",
    icon: Laptop,
    color: "cyan",
  },
  {
    title: "Không gian nghệ sĩ",
    description:
      "Hỗ trợ nghệ sĩ và người phụ trách nội dung tải lên bài hát, tiếp cận thính giả có cùng gu âm nhạc.",
    icon: Radio,
    color: "amber",
  },
] as const;

export default function UserFeatureHighlights() {
  return (
    <section aria-label="Tính năng Moodify" className="grid gap-4 md:grid-cols-3">
      {FEATURES.map(({ title, description, icon: Icon, color }) => (
        <article
          key={title}
          className="flex flex-col gap-3.5 rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition hover:border-white/15 sm:p-6"
        >
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
              color === "purple"
                ? "border-purple-500/20 bg-purple-500/15 text-purple-400"
                : color === "cyan"
                  ? "border-cyan-500/20 bg-cyan-500/15 text-cyan-400"
                  : "border-amber-500/20 bg-amber-500/15 text-amber-400"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="font-display text-base font-bold text-white sm:text-lg">
            {title}
          </h2>
          <p className="text-xs leading-relaxed text-white/60 sm:text-sm">
            {description}
          </p>
        </article>
      ))}
    </section>
  );
}
