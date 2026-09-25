import Link from "next/link";

import { BrandLogo } from "@/components/shared/logo-mark";
import { HeroCarousel } from "@/features/home/components/hero-carousel";

const HOME_ROUTE = "/";

const playlists = [
  {
    title: "Midnight Drift",
    meta: "Synthwave, alt-pop, giai điệu đêm muộn",
    accent: "from-[#f56600] via-[#ff9151] to-[#fbcfb2]",
  },
  {
    title: "Quiet Focus",
    meta: "Lo-fi, ambient, giai điệu piano nhẹ nhàng",
    accent: "from-[#275d73] via-[#4da5a4] to-[#d6f1eb]",
  },
  {
    title: "Underground Heat",
    meta: "Club edits, afro-house, khám phá rap mới",
    accent: "from-[#462449] via-[#8c4dd6] to-[#f2b3ff]",
  },
];

const footerLinks = [
  "Giới thiệu",
  "Nghệ sĩ",
  "Tin tức",
  "Bản quyền",
  "Hỗ trợ",
  "Quyền riêng tư",
  "Cookie",
  "Nhà phát triển",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-5 pb-14 pt-6 sm:px-8 lg:gap-14 lg:px-10">
        <HeroCarousel />

        <section className="flex flex-col items-center gap-6">
          <div className="flex w-full max-w-3xl items-center gap-3 rounded-full border border-white/10 bg-white/6 px-6 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur">
            <SearchIcon />
            <input
              aria-label="Tìm kiếm nghệ sĩ, bài hát và danh sách phát"
              className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/45"
              placeholder="Tìm kiếm nghệ sĩ, nhóm nhạc, bài hát, danh sách phát..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#101010] transition hover:scale-[1.01] cursor-pointer">
              Tải nhạc của bạn
            </button>
            <button className="rounded-full border border-white/12 bg-white/6 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 cursor-pointer">
              Khám phá công cụ nghệ sĩ
            </button>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col justify-between rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-7 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.32)]">
            <div>
              <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-[var(--text-muted)] font-mono">
                Nghe nhạc mọi nơi
              </p>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight leading-snug title-gradient-flow">
                Âm nhạc không ngừng nghỉ
              </h2>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center">
              <div className="grid h-[150px] w-[150px] shrink-0 grid-cols-6 gap-1 rounded-[1.25rem] bg-white p-2.5">
                {Array.from({ length: 36 }).map((_, index) => (
                  <div
                    key={index}
                    className={`rounded-[3px] ${
                      index % 5 === 0 || index % 7 === 0
                        ? "bg-[#111111]"
                        : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm leading-6 desc-readable">
                Moodify tương thích mượt mà trên web, máy tính bảng, điện thoại và loa thông minh.
                Trải nghiệm thị giác hiện đại, giúp bạn dễ dàng khám phá và lắng nghe âm nhạc mọi lúc mọi nơi.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between overflow-hidden rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(255,112,43,0.24),transparent_38%),linear-gradient(145deg,#17171c,#0d0d10_62%,#17171f)] p-7 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.36)]">
            <div className="grid gap-6 sm:grid-cols-[200px_1fr] sm:items-center">
              <div className="h-[220px] overflow-hidden rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] p-3">
                <div className="relative h-full overflow-hidden rounded-[1.15rem] bg-[linear-gradient(180deg,#173246_0%,#0d1220_58%,#090a0f_100%)]">
                  <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(255,154,104,0.55),transparent_58%)]" />
                  <div className="absolute -bottom-8 left-2 h-44 w-32 rounded-[1.5rem] bg-[linear-gradient(180deg,#ff7f3f,#ef4a17)] opacity-90 shadow-[0_0_60px_rgba(255,101,37,0.28)]" />
                  <div className="absolute bottom-0 left-16 h-52 w-40 rounded-t-[45%] rounded-b-[18%] bg-[linear-gradient(180deg,#f3f3f3_0%,#979797_32%,#202020_100%)]" />
                  <div className="absolute right-4 top-4 h-16 w-16 rounded-full border border-white/35 bg-[radial-gradient(circle_at_35%_35%,#ffffff_0%,#8e7aff_28%,#201c35_72%,#09090c_100%)] shadow-[0_0_30px_rgba(139,120,255,0.3)]" />
                  <div className="absolute bottom-3 right-3 max-w-[150px] rounded-2xl border border-white/10 bg-black/40 p-2.5 backdrop-blur">
                    <p className="text-[10px] tracking-[0.08em] text-white/55 font-mono">
                      Bộ sáng tạo
                    </p>
                    <p className="mt-1 text-xs leading-4 font-medium text-white/80 desc-readable">
                      Không gian hình ảnh nghệ thuật cho các bản phát hành.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--text-muted)] font-mono">
                  Dành cho nhà sáng tạo
                </p>
                <h2 className="font-display text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight leading-snug title-hover-glow">
                  Mở khóa tiềm năng sáng tạo
                </h2>
                <p className="mt-3 text-sm leading-6 desc-readable">
                  Không gian chuyên biệt dành cho các nghệ sĩ, quản lý bản phát hành và tiếp cận hàng triệu thính giả trên Moodify.
                </p>
                <button className="mt-6 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-[#111111] transition hover:scale-[1.02] cursor-pointer">
                  Tìm hiểu thêm
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.08em] text-[#ff7a2c] font-mono">
                Xu hướng hiện tại
              </p>
              <h2 className="font-display mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight leading-snug title-hover-glow">
                Lắng nghe giai điệu mới
              </h2>
            </div>
            <button className="w-fit rounded-full border border-white/12 bg-white/6 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10 cursor-pointer">
              Khám phá danh sách phát thịnh hành
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {playlists.map((playlist) => (
              <article
                key={playlist.title}
                className="group overflow-hidden rounded-[1.75rem] border border-white/8 bg-white/4"
              >
                <div
                  className={`h-40 bg-gradient-to-br ${playlist.accent} transition duration-500 group-hover:scale-[1.04]`}
                />
                <div className="space-y-2 p-5">
                  <h3 className="text-xl font-semibold text-white">
                    {playlist.title}
                  </h3>
                  <p className="text-sm leading-6 desc-readable">
                    {playlist.meta}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="border-t border-white/8 pt-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex items-center gap-4 text-white/65">
              <SocialIcon label="X" />
              <SocialIcon label="Discord" />
              <SocialIcon label="TikTok" />
              <SocialIcon label="Instagram" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-white/45">
              {footerLinks.map((item) => (
                <Link href={HOME_ROUTE} key={item} className="transition hover:text-white/75">
                  {item}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <BrandLogo variant="horizontal" className="h-7 w-auto opacity-75 hover:opacity-100 transition duration-200" />
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-white/55"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0a7 7 0 0114 0z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SocialIcon({ label }: { label: string }) {
  return (
    <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-white/10 bg-white/4 px-3 text-xs font-semibold uppercase tracking-[0.2em] transition hover:border-white/20 hover:text-white">
      {label}
    </span>
  );
}
