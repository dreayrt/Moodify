import type { Metadata } from "next";
import TrackShareClient from "./track-share-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const rawBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
const API_BASE = rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;

async function getTrackData(id: string) {
  try {
    const res = await fetch(`${API_BASE}/tracks/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Error fetching track metadata:", err);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const track = await getTrackData(id);

  if (!track) {
    return {
      title: "Bài hát không tồn tại | Moodify",
      description: "Không tìm thấy bài hát trên Moodify.",
    };
  }

  const title = `${track.name} - ${track.artistName} | Moodify`;
  const description = `Nghe bài hát "${track.name}" của ${track.artistName} trên Moodify. Âm thanh chất lượng cao cùng lời bài hát chạy trực tiếp.`;
  const imageUrl = track.imageUrl || "https://moodify.vn/Brand/moodify_brand_assets/web/og-image.png";

  const appBase = process.env.NEXT_PUBLIC_APP_URL || "https://moodify.vn";

  return {
    metadataBase: new URL(appBase),
    title,
    description,
    openGraph: {
      title: `${track.name} • ${track.artistName}`,
      description: `Nghe bài hát "${track.name}" của ${track.artistName} trên Moodify 🎧`,
      url: `/track/${encodeURIComponent(id)}`,
      siteName: "Moodify Music",
      type: "music.song",
      locale: "vi_VN",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${track.name} - ${track.artistName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${track.name} • ${track.artistName}`,
      description: `Nghe bài hát "${track.name}" của ${track.artistName} trên Moodify 🎧`,
      images: [imageUrl],
    },
  };
}

export default async function TrackSharePage({ params }: PageProps) {
  const { id } = await params;
  const track = await getTrackData(id);

  return <TrackShareClient trackId={id} initialTrack={track} />;
}
