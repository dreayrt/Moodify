import { Download } from "lucide-react";
import { MOBILE_DOWNLOADS } from "@/lib/mobile-downloads";

export function MobilePlatformIcon({
  platform,
  className = "h-7 w-7",
}: {
  platform: "android" | "ios";
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {platform === "android" ? (
        <>
          <path d="m6.8 3.2-1-1.7a.5.5 0 0 1 .86-.5L7.7 2.8a8.5 8.5 0 0 1 8.6 0L17.34 1a.5.5 0 0 1 .86.5l-1 1.7A7 7 0 0 1 20 8H4a7 7 0 0 1 2.8-4.8ZM8 5a.75.75 0 1 0 0 1.5A.75.75 0 0 0 8 5Zm8 0a.75.75 0 1 0 0 1.5A.75.75 0 0 0 16 5ZM4 9h16v9a2 2 0 0 1-2 2h-1v2a1 1 0 0 1-2 0v-2H9v2a1 1 0 0 1-2 0v-2H6a2 2 0 0 1-2-2V9ZM1 10a1 1 0 0 1 2 0v7a1 1 0 0 1-2 0v-7Zm20 0a1 1 0 0 1 2 0v7a1 1 0 0 1-2 0v-7Z" />
        </>
      ) : (
        <path d="M17.05 12.54c.03 3.14 2.75 4.19 2.78 4.2-.02.07-.43 1.49-1.43 2.95-.87 1.26-1.77 2.52-3.19 2.55-1.39.03-1.84-.82-3.43-.82-1.59 0-2.09.79-3.4.85-1.37.05-2.41-1.37-3.28-2.63-1.78-2.57-3.14-7.26-1.31-10.43a5.1 5.1 0 0 1 4.31-2.62c1.35-.02 2.63.92 3.45.92.83 0 2.37-1.14 3.99-.97.68.03 2.57.28 3.79 2.07-.1.06-2.26 1.32-2.24 3.93ZM14.44 4.8c.72-.87 1.2-2.08 1.07-3.3-1.04.04-2.3.69-3.05 1.56-.67.77-1.26 2-1.1 3.19 1.16.09 2.35-.59 3.08-1.45Z" />
      )}
    </svg>
  );
}

export function AppDownloadButtons({ className = "", iosNoteId }: { className?: string; iosNoteId?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <a
        href={MOBILE_DOWNLOADS.android}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Tải Moodify cho Android, file APK mới nhất từ GitHub"
        className="group flex min-h-16 min-w-0 items-center gap-3 rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-white transition-colors hover:border-violet-300/60 hover:bg-violet-400/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300"
      >
        <MobilePlatformIcon platform="android" className="h-7 w-7 shrink-0 text-[#a8dfb2]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] leading-4 text-white/60">Tải file APK</span>
          <span className="block text-base font-semibold leading-5">Android</span>
        </span>
        <Download className="hidden h-4 w-4 shrink-0 text-white/40 transition-colors group-hover:text-white sm:block" aria-hidden="true" />
      </a>
      <a
        href={MOBILE_DOWNLOADS.ios}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Tải Moodify cho iOS, file IPA mới nhất từ GitHub"
        aria-describedby={iosNoteId}
        className="group flex min-h-16 min-w-0 items-center gap-3 rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-white transition-colors hover:border-violet-300/60 hover:bg-violet-400/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300"
      >
        <MobilePlatformIcon platform="ios" className="h-7 w-7 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] leading-4 text-white/60">Tải file IPA</span>
          <span className="block text-base font-semibold leading-5">iOS</span>
        </span>
        <Download className="hidden h-4 w-4 shrink-0 text-white/40 transition-colors group-hover:text-white sm:block" aria-hidden="true" />
      </a>
    </div>
  );
}
