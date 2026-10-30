import { Headphones, Laptop, Radio } from "lucide-react";

const FEATURES = [
  {
    title: "Bắt trọn nhịp cảm xúc",
    description:
      "Nhận diện và phân tích tâm trạng theo thời gian thực để gợi ý danh sách nhạc tương thích, không mất thời gian tìm kiếm.",
    icon: Headphones,
    color: "purple",
  },
  {
    title: "Đồng bộ đa thiết bị",
    description:
      "Trải nghiệm liền mạch từ không gian làm việc trên máy tính tới tai nghe di động khi di chuyển ngoài đường.",
    icon: Laptop,
    color: "cyan",
  },
  {
    title: "Không gian nghệ sĩ độc lập",
    description:
      "Creator Studio hỗ trợ nghệ sĩ tải lên bài hát, tiếp cận cộng đồng thính giả có cùng rung cảm âm nhạc.",
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
