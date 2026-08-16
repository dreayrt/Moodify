import Link from "next/link";

import { HeroCarousel } from "@/components/landing/hero-carousel";

const playlists = [
  {
    title: "Midnight Drift",
    meta: "Synthwave, alt-pop, after-hours cuts",
    accent: "from-[#f56600] via-[#ff9151] to-[#fbcfb2]",
  },
  {
    title: "Quiet Focus",
    meta: "Lo-fi, ambient textures, piano sketches",
    accent: "from-[#275d73] via-[#4da5a4] to-[#d6f1eb]",
  },
  {
    title: "Underground Heat",
    meta: "Club edits, afro-house, rap discoveries",
    accent: "from-[#462449] via-[#8c4dd6] to-[#f2b3ff]",
  },
];

const footerLinks = [
  "About",
  "Artists",
  "Newsroom",
  "Licensing",
  "Support",
  "Privacy",
  "Cookies",
  "Developers",
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
              aria-label="Search artists, tracks and playlists"
              className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/45"
              placeholder="Search for artists, bands, tracks, playlists"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#101010] transition hover:scale-[1.01]">
              Upload your own
            </button>
            <button className="rounded-full border border-white/12 bg-white/6 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Explore artist tools
            </button>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.32)]">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
              Listen Anywhere
            </p>
            <h2 className="font-display max-w-md text-4xl font-black uppercase leading-[0.92] sm:text-5xl">
              Never Stop Listening
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
              <div className="grid h-[180px] w-[180px] grid-cols-6 gap-1 rounded-[1.5rem] bg-white p-3">
                {Array.from({ length: 36 }).map((_, index) => (
                  <div
                    key={index}
                    className={`rounded-[4px] ${
                      index % 5 === 0 || index % 7 === 0
                        ? "bg-[#111111]"
                        : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
              <p className="max-w-md text-base leading-7 text-[var(--text-secondary)]">
                Moodify looks great on web, tablet, mobile and smart speakers.
                Keep the visual direction bold while letting the content stay
                centered and easy to scan.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(255,112,43,0.24),transparent_38%),linear-gradient(145deg,#17171c,#0d0d10_62%,#17171f)] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.36)]">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div className="min-h-[300px] overflow-hidden rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] p-5">
                <div className="relative h-full min-h-[260px] overflow-hidden rounded-[1.35rem] bg-[linear-gradient(180deg,#173246_0%,#0d1220_58%,#090a0f_100%)]">
                  <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(255,154,104,0.55),transparent_58%)]" />
                  <div className="absolute -bottom-10 left-4 h-56 w-40 rounded-[2rem] bg-[linear-gradient(180deg,#ff7f3f,#ef4a17)] opacity-90 shadow-[0_0_80px_rgba(255,101,37,0.28)]" />
                  <div className="absolute bottom-0 left-24 h-64 w-52 rounded-t-[45%] rounded-b-[18%] bg-[linear-gradient(180deg,#f3f3f3_0%,#979797_32%,#202020_100%)]" />
                  <div className="absolute right-6 top-6 h-24 w-24 rounded-full border border-white/35 bg-[radial-gradient(circle_at_35%_35%,#ffffff_0%,#8e7aff_28%,#201c35_72%,#09090c_100%)] shadow-[0_0_40px_rgba(139,120,255,0.3)]" />
                  <div className="absolute bottom-6 right-6 max-w-[180px] rounded-3xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.28em] text-white/55">
                      Creator kit
                    </p>
                    <p className="mt-2 text-sm font-medium text-white/80">
                      Abstract visual block you can swap with generated banner
                      art later.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
                  For Creators
                </p>
                <h2 className="font-display text-4xl font-black uppercase leading-[0.92] sm:text-5xl">
                  Calling All Creators
                </h2>
                <p className="mt-5 max-w-md text-base leading-7 text-[var(--text-secondary)]">
                  This block matches the hero direction and gives you a reusable
                  area for campaigns, creator onboarding or spotlight releases.
                </p>
                <button className="mt-8 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#111111] transition hover:scale-[1.01]">
                  Find out more
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
                Trending Now
              </p>
              <h2 className="font-display mt-2 text-3xl font-black uppercase sm:text-4xl">
                Hear What&apos;s Next
              </h2>
            </div>
            <button className="w-fit rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Explore trending playlists
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
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
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
                <Link href="/" key={item} className="transition hover:text-white/75">
                  {item}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3 text-white/80">
              <LogoMark />
              <span className="text-sm font-semibold uppercase tracking-[0.32em]">
                Moodify
              </span>
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

function LogoMark() {
  return (
    <svg
      aria-hidden="true"
      className="h-8 w-8"
      fill="none"
      viewBox="0 0 32 32"
    >
      <path
        d="M4 18.2a2 2 0 012-2h1v8H6a2 2 0 01-2-2v-4zm4-4.3a2 2 0 012-2h1v12H10a2 2 0 01-2-2V13.9zm4-3.2a2 2 0 012-2h1v15.2h-1a2 2 0 01-2-2V10.7zm4-3.2a2 2 0 012-2h1v18.4h-1a2 2 0 01-2-2V7.5zm4 2.4a8 8 0 010 16H8.8v-3.4H20a4.6 4.6 0 000-9.2h-1.2V9.9H20z"
        fill="currentColor"
      />
    </svg>
  );
}
