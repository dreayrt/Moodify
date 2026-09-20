import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";

import { I18nProvider } from "@/components/i18n/i18n-provider";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-manrope",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sora",
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
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var clean = function(node) {
                    if (node && node.nodeType === 1 && node.hasAttribute('bis_skin_checked')) {
                      node.removeAttribute('bis_skin_checked');
                    }
                  };
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
                        clean(m.target);
                      } else if (m.type === 'childList') {
                        for (var j = 0; j < m.addedNodes.length; j++) {
                          clean(m.addedNodes[j]);
                          if (m.addedNodes[j].querySelectorAll) {
                            var nested = m.addedNodes[j].querySelectorAll('[bis_skin_checked]');
                            for (var k = 0; k < nested.length; k++) {
                              nested[k].removeAttribute('bis_skin_checked');
                            }
                          }
                        }
                      }
                    }
                  });
                  observer.observe(document.documentElement, {
                    attributes: true,
                    childList: true,
                    subtree: true,
                    attributeFilter: ['bis_skin_checked']
                  });
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${manrope.variable} ${sora.variable}`} suppressHydrationWarning>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
