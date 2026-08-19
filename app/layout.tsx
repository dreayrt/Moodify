import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Moodify",
  description: "Moodify — music that moves with your mood.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link
          href="https://db.onlinewebfonts.com/c/ca3d10781128664daddf89bf2e2d1305?family=Graphik+LCG+Regular+Regular"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
