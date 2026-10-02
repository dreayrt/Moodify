"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Headphones,
  Laptop,
  Music,
  Radio,
  Search,
  Smile,
  Sparkles,
  Zap,
} from "lucide-react";

import { BrandLogo } from "@/components/shared/logo-mark";
import { HeroCarousel } from "@/features/home/components/hero-carousel";

const HOME_ROUTE = "/";

interface FunMood {
  id: string;
  emoji: string;
  label: string;
  vibeText: string;
  color: string;
}

const FUN_MOODS: FunMood[] = [
  { id: "chill", emoji: "☕", label: "Cày deadline", vibeText: "Bật chút lo-fi nhẹ nhàng để giữ tỉnh táo và chạy deadline xuyên màn đêm.", color: "from-amber-500/20 to-orange-500/10" },
  { id: "sad", emoji: "🌧️", label: "Tự nhiên buồn", vibeText: "Một góc yên tĩnh, mưa rơi ngoài cửa sổ và vài bài nhạc indie thì thầm.", color: "from-blue-500/20 to-cyan-500/10" },
  { id: "hype", emoji: "⚡", label: "Bật nóc nhà", vibeText: "Bass dồn dập, kéo năng lượng lên 200% để quẩy hết mình.", color: "from-pink-500/20 to-purple-500/10" },
  { id: "lazy", emoji: "🛋️", label: "Lười biếng", vibeText: "Nằm dài trên sofa, không nghĩ ngợi gì, thả trôi theo giai điệu êm ái.", color: "from-emerald-500/20 to-teal-500/10" },
  { id: "drive", emoji: "🌙", label: "Đi dạo đêm", vibeText: "Gió mát rười rượi, phố vắng đèn vàng và những thanh âm city pop.", color: "from-violet-500/20 to-indigo-500/10" },
];

export default function Home() {
  const [selectedMood, setSelectedMood] = useState<FunMood>(FUN_MOODS[0]);

  const handleOpenRegister = () => {
    const regBtn = document.querySelector<HTMLButtonElement>(
      'button[data-auth-trigger="register"]',
    );
    if (regBtn) {
      regBtn.click();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-12 px-4 pb-14 pt-4 sm:px-6 sm:gap-14 lg:px-8">
        {/* Hero Carousel */}
        <HeroCarousel />

        {/* Fun Mood Picker Interactive Section */}
        <section className="relative flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-7 sm:p-10 text-center shadow-xl backdrop-blur-md">
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 blur-2xl opacity-60" />

          <div className="relative z-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              <Sparkles className="h-3.5 w-3.5 text-[#FF7A2C]" />
              <span>Hôm nay bạn đang thấy thế nào?</span>
            </span>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Chọn tâm trạng, Moodify lo phần nhạc
            </h2>
          </div>

          {/* Emojis selection */}
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {FUN_MOODS.map((item) => {
              const isSelected = selectedMood.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedMood(item)}
                  className={`group flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border border-white/40 bg-white text-[#101010] shadow-[0_0_25px_rgba(255,255,255,0.35)] scale-105"
                      : "border border-white/10 bg-white/[0.04] text-white/75 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <span className="text-xl sm:text-2xl">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Mood Bubble */}
          <div className="relative z-10 max-w-lg rounded-2xl border border-white/12 bg-black/40 px-5 py-4 text-xs sm:text-sm text-white/80 backdrop-blur-md transition-all">
            <span className="text-base mr-2">{selectedMood.emoji}</span>
            <span>{selectedMood.vibeText}</span>
          </div>

          {/* Direct CTA Button */}
          <div className="relative z-10 pt-2">
            <button
              onClick={handleOpenRegister}
              className="flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-[#101010] shadow-lg transition hover:scale-105 hover:bg-white/90 active:scale-95 cursor-pointer"
            >
              <span>Vào trải nghiệm ngay</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* 3 Quick Fun Highlights - Super minimal, low text */}
        <section className="grid gap-5 md:grid-cols-3">
          {/* Card 1 */}
          <div className="flex flex-col items-center text-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-6 sm:p-7 hover:border-white/15 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500/20 to-pink-500/20 text-[#A855F7]">
              <Headphones className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Đúng mood, đúng lúc
            </h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Không cần lục tìm playlist cả tiếng đồng hồ. Chỉ cần chọn cảm xúc là nhạc tự phát.
            </p>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col items-center text-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-6 sm:p-7 hover:border-white/15 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-[#00F0FF]">
              <Laptop className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Nghe đâu cũng tiện
            </h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Mở trên laptop khi làm việc, hoặc lướt app điện thoại khi ra đường. Luôn đồng bộ mượt mà.
            </p>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col items-center text-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-6 sm:p-7 hover:border-white/15 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 text-[#FF7A2C]">
              <Radio className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Góc cho nghệ sĩ
            </h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Bạn tự làm nhạc? Tải lên Creator Studio và đưa tác phẩm đến đúng những ai cần nghe.
            </p>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="border-t border-white/8 pt-8 pb-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <BrandLogo variant="horizontal" className="h-7 w-auto opacity-75 hover:opacity-100 transition duration-200" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/50">
            <Link href={HOME_ROUTE} className="hover:text-white transition">Giới thiệu</Link>
            <Link href="/dashboard/content-lead" className="hover:text-white transition">Dành cho nghệ sĩ</Link>
            <Link href={HOME_ROUTE} className="hover:text-white transition">Hỗ trợ</Link>
            <Link href={HOME_ROUTE} className="hover:text-white transition">Điều khoản</Link>
          </div>

          <p className="text-[11px] text-white/35">
            © 2026 Moodify. Đeo tai nghe vào và tận hưởng thôi!
          </p>
        </footer>
      </div>
    </main>
  );
}
