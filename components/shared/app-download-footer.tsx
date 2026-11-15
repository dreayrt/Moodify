import type { ReactNode } from "react";
import { BrandLogo } from "@/components/shared/logo-mark";

export function AppDownloadFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="mt-16 border-t border-white/10 pb-6 pt-5 text-white">
      {children && <div className="mb-5">{children}</div>}
      <div className="flex items-center justify-between gap-4">
        <BrandLogo className="h-5 w-auto opacity-70" />
        <p className="text-[11px] text-white/40">© 2026 Moodify</p>
      </div>
    </footer>
  );
}
