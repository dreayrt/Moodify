"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Headphones,
  Laptop,
  Play,
  Radio,
} from "lucide-react";

import { BrandLogo } from "@/components/shared/logo-mark";
import { HeroCarousel } from "@/features/home/components/hero-carousel";

const HOME_ROUTE = "/";

interface MoodCard {
  id: string;
  title: string;
  genre: string;
  cover: string;
}

const MOOD_CARDS: MoodCard[] = [
  {
    id: "focus",
    title: "Tập trung",
    genre: "Lo-Fi Beats",
    cover: "/covers/focus-flow.jpg",
  },
  {
    id: "melancholy",
    title: "Mưa & Suy tư",
    genre: "Indie Ballad",
    cover: "/covers/saigon-rain.jpg",
  },
  {
    id: "energy",
    title: "Bùng nổ",
    genre: "Electronic",
    cover: "/covers/neon-pulse.jpg",
  },
  {
    id: "chill",
    title: "Thư giãn",
    genre: "Neo-Soul",
    cover: "/covers/echoes-soul.jpg",
  },
  {
    id: "midnight",
    title: "Đêm muộn",
    genre: "City Pop",
    cover: "/covers/midnight-mirage.jpg",
  },
];

export default function Home() {
  const handleOpenLogin = () => {
    const loginBtn = document.querySelector<HTMLButtonElement>(
      'button[data-auth-trigger="login"]',
    );
    if (loginBtn) {
      loginBtn.click();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-4 pb-14 pt-4 sm:px-6 sm:gap-12 lg:px-8">
        {/* Hero Carousel */}
        <HeroCarousel />

        {/* Mood Discovery - Clean & Minimal */}
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
              Giai điệu theo tâm trạng
            </h2>
            <p className="text-xs sm:text-sm text-white/50">
              Chọn cảm xúc của bạn để bắt đầu nghe
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {MOOD_CARDS.map((item) => (
              <button
                key={item.id}
                onClick={handleOpenLogin}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] text-left transition-all duration-300 hover:border-white/30 hover:scale-[1.02] cursor-pointer"
              >
                <Image
                  src={item.cover}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                {/* Floating Play Icon on hover */}
                <div className="absolute right-3 top-3 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1">
                  <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current ml-0.5" />
                </div>

                {/* Card Title & Genre */}
                <div className="absolute bottom-0 inset-x-0 p-3.5 sm:p-4">
                  <span className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#FF7A2C]">
                    {item.genre}
                  </span>
                  <h3 className="font-display font-bold text-sm sm:text-base text-white mt-0.5 leading-snug">
                    {item.title}
                  </h3>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Feature Highlights - 3 Asymmetric Editorial Cards */}
        <section className="grid gap-5 md:grid-cols-3">
          {/* Card 1 */}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-white/8 bg-white/[0.02] p-6 sm:p-7 hover:border-white/15 transition">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
              <Headphones className="h-5 w-5" />
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-white">
              Bắt trọn nhịp cảm xúc
            </h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Nhận diện và phân tích tâm trạng theo thời gian thực để gợi ý danh sách nhạc tương thích, không mất thời gian tìm kiếm.
            </p>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-white/8 bg-white/[0.02] p-6 sm:p-7 hover:border-white/15 transition">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
              <Laptop className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Đồng bộ đa thiết bị
            </h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Trải nghiệm liền mạch từ không gian làm việc trên máy tính tới tai nghe di động khi di chuyển ngoài đường.
            </p>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-white/8 bg-white/[0.02] p-6 sm:p-7 hover:border-white/15 transition">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Radio className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Không gian nghệ sĩ độc lập
            </h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Creator Studio hỗ trợ nghệ sĩ tải lên bài hát, tiếp cận cộng đồng thính giả có cùng rung cảm âm nhạc.
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
