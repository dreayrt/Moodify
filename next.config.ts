import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  async rewrites() {
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
    if (!apiBase) {
      return [];
    }
    return [
      {
        source: "/uploads/:path*",
        destination: `${apiBase}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
