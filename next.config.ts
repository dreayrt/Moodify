import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    qualities: [75, 88, 95],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/downloads/Moodify.ipa",
        destination: "https://github.com/Kandesfx/moodify-mobile/releases/latest/download/Moodify.ipa",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8088")
      .replace(/\/+$/, "").replace(/\/api$/, "");
    return [
      {
        source: "/api/auth/:path*",
        destination: `${apiBase}/api/auth/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiBase}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
