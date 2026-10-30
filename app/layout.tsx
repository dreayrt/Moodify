import type { Metadata } from "next";
import localFont from "next/font/local";

import { I18nProvider } from "@/components/i18n/i18n-provider";

import "./globals.css";

const sora = localFont({
  src: "./fonts/sora-latin.woff2",
  weight: "400 800",
  variable: "--font-sora",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin.woff2",
  weight: "400 700",
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Moodify — Music for a Brighter You",
  description: "Moodify — music that moves with your mood. Nền tảng phát nhạc trực tuyến cá nhân hóa theo cảm xúc.",
  icons: {
    icon: [
      { url: "/Brand/moodify_brand_assets/web/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/Brand/moodify_brand_assets/web/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/Brand/moodify_brand_assets/web/favicon.ico" },
    ],
    apple: [
      { url: "/Brand/moodify_brand_assets/web/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/Brand/moodify_brand_assets/web/site.webmanifest",
  openGraph: {
    title: "Moodify — Music for a Brighter You",
    description: "Nền tảng phát nhạc trực tuyến cá nhân hóa theo cảm xúc.",
    images: [
      {
        url: "/Brand/moodify_brand_assets/web/og-image.png",
        width: 1200,
        height: 630,
        alt: "Moodify Brand Banner",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${sora.variable} ${spaceGrotesk.variable}`}
    >
      <head />
      <body className="font-sans" suppressHydrationWarning>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
