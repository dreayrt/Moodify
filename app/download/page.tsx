import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { BrandLogo, LogoMark } from "@/components/shared/logo-mark";
import {
  AppDownloadButtons,
  MobilePlatformIcon,
} from "@/components/shared/app-download-buttons";
import { MOBILE_DOWNLOADS } from "@/lib/mobile-downloads";

export const metadata: Metadata = {
  title: "Tải ứng dụng Moodify cho Android và iOS",
  description:
    "Tải APK và IPA mới nhất từ GitHub cho điện thoại Android và iPhone, kèm hướng dẫn cài đặt Moodify.",
};

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#080710] text-white selection:bg-violet-500/40">
      <div className="mx-auto max-w-5xl px-5 pb-10 sm:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 py-6">
          <Link href="/dashboard/user" aria-label="Về trang chủ Moodify">
            <BrandLogo className="h-8 w-auto" />
          </Link>
          <Link
            href="/dashboard/user"
            className="inline-flex items-center gap-2 py-2 text-xs text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Nghe trên web
          </Link>
        </header>

        <section
          className="relative py-12 text-center sm:py-16"
          aria-labelledby="download-title"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.18),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-lg">
            <div className="flex justify-center">
              <LogoMark
                variant="icon"
                className="h-20 w-20 rounded-[22px] shadow-[0_0_60px_rgba(139,92,246,0.16)]"
                priority
              />
            </div>
            <h1
              id="download-title"
              className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl"
            >
              Giai điệu của bạn.
              <br />
              <span className="text-white/50">Luôn ở bên bạn.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              Chọn phiên bản dành cho điện thoại của bạn và tiếp tục tận hưởng
              âm nhạc cùng Moodify.
            </p>
            <AppDownloadButtons
              className="mx-auto mt-8 max-w-md text-left"
              iosNoteId="ios-install-note"
            />
            <p
              id="ios-install-note"
              className="mt-4 text-xs leading-relaxed text-white/50"
            >
              APK và IPA mới nhất từ GitHub · Bản iOS cần ký để cài đặt.
            </p>
          </div>
        </section>

        <section
          className="grid gap-4 sm:grid-cols-2"
          aria-label="Hướng dẫn cài đặt Moodify"
        >
          <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <MobilePlatformIcon
                platform="android"
                className="h-6 w-6 text-[#a8dfb2]"
              />
              <h2 className="text-lg font-semibold">Cài trên Android</h2>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/50">
              Tải trực tiếp từ bản phát hành mới nhất của Moodify.
            </p>
            <ol className="mt-5 list-decimal space-y-3 pl-4 text-sm leading-relaxed text-white/70 marker:text-violet-300">
              <li>
                Chọn{" "}
                <strong className="font-medium text-white">Tải file APK</strong>{" "}
                và chờ tải xong.
              </li>
              <li>
                Mở file APK. Nếu được hỏi, cho phép ứng dụng vừa dùng tải file
                cài đặt ứng dụng từ nguồn này.
              </li>
              <li>
                Chọn <strong className="font-medium text-white">Cài đặt</strong>
                , sau đó mở Moodify.
              </li>
            </ol>
            <a
              href={MOBILE_DOWNLOADS.releases}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-8 items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
            >
              Xem bản phát hành trên GitHub{" "}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <MobilePlatformIcon platform="ios" className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Cài trên iPhone</h2>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/50">
              Tải file IPA từ bản phát hành mới nhất của Moodify trên GitHub.
            </p>
            <ol className="mt-5 list-decimal space-y-3 pl-4 text-sm leading-relaxed text-white/70 marker:text-violet-300">
              <li>
                Tải file{" "}
                <strong className="font-medium text-white">Moodify.ipa</strong>{" "}
                về máy tính.
              </li>
              <li>
                Dùng công cụ như Sideloadly để ký và cài file IPA lên iPhone.
              </li>
              <li>
                Làm theo hướng dẫn của công cụ để hoàn tất cài đặt và mở
                Moodify.
              </li>
            </ol>
            <p className="mt-5 text-xs leading-relaxed text-white/50">
              File IPA không cài trực tiếp bằng cách mở trong Safari.
            </p>
            <a
              href="https://sideloadly.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-8 items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
            >
              Hướng dẫn từ Sideloadly{" "}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </article>
        </section>

        <footer className="mt-10 border-t border-white/10 pt-6 text-center text-[11px] text-white/40">
          © 2026 Moodify
        </footer>
      </div>
    </main>
  );
}
