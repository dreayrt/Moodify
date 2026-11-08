import Link from "next/link";
import type { ReactNode } from "react";

/** Liên hệ chung xuất hiện trên các trang pháp lý (chính sách, điều khoản, xóa dữ liệu). */
export const LEGAL_CONTACT_EMAIL = "lamthuan271019@gmail.com";

export interface LegalPageProps {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}

/** Khung trình bày chung cho các trang pháp lý công khai (không cần đăng nhập). */
export function LegalPage({ title, updated, intro, children }: LegalPageProps) {
  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-200 antialiased">
      <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-20">
        <Link
          href="/"
          className="text-sm text-neutral-400 transition-colors hover:text-white"
        >
          ← Về Moodify
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-neutral-400">Cập nhật lần cuối: {updated}</p>
        <p className="mt-6 leading-7 text-neutral-300">{intro}</p>
        <div className="mt-10 space-y-8">{children}</div>
      </div>
    </main>
  );
}

export interface LegalSectionProps {
  heading: string;
  children: ReactNode;
}

export function LegalSection({ heading, children }: LegalSectionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white">{heading}</h2>
      <div className="mt-3 space-y-3 leading-7 text-neutral-300">{children}</div>
    </section>
  );
}

export function LegalBulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
