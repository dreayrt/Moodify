import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/shared/logo-mark";
import { AppDownloadButtons } from "@/components/shared/app-download-buttons";
import { MOBILE_DOWNLOADS } from "@/lib/mobile-downloads";

export function AppDownloadFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="mt-16 border-t border-white/10 text-white">
      <div className="grid gap-8 py-9 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:items-center xl:gap-12">
        <div className="max-w-md">
          <BrandLogo className="mb-4 h-6 w-auto opacity-80" />
          <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
            Âm nhạc theo bạn.<br />
            <span className="text-white/55">Cảm xúc mọi nơi.</span>
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">
            Mang những giai điệu yêu thích từ máy tính đến điện thoại.
            Tải Moodify cho Android và iOS.
          </p>
          {children && <div className="mt-5">{children}</div>}
          <p className="mt-4 text-[11px] text-white/40">© 2026 Moodify </p>
        </div>

        <div className="min-w-0">
          <p className="mb-3 text-sm font-semibold">Tải ứng dụng Moodify</p>
          <AppDownloadButtons />
          <Link
            href={MOBILE_DOWNLOADS.page}
            className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs text-violet-300 transition-colors hover:text-violet-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300"
          >
            Hướng dẫn cài đặt
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

    </footer>
  );
}
