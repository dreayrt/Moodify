import { ArtistTrack } from "./types";

export const INITIAL_ARTIST_TRACKS: ArtistTrack[] = [
  {
    id: "trk-001",
    title: "Midnight Echoes (feat. Maya)",
    artist: "You (Artist Studio)",
    genre: "EDM / Melodic House",
    duration: "3:42",
    status: "published",
    visibility: "public",
    plays: 14820,
    likes: 1240,
    commentsCount: 88,
    bpm: 124,
    key: "F# Min",
    updatedAt: "2 giờ trước",
    createdAt: "2026-03-01",
    coverGradient: "linear-gradient(135deg, #ff7a2c, #7a5cff)",
    description: "Single mới nhất trong chiến dịch mùa hè 2026.",
  },
  {
    id: "trk-002",
    title: "Cyberpunk Tokyo Drift (VIP Mix)",
    artist: "You (Artist Studio)",
    genre: "Synthwave / Cyberpunk",
    duration: "4:05",
    status: "published",
    visibility: "public",
    plays: 38500,
    likes: 3120,
    commentsCount: 215,
    bpm: 128,
    key: "A Min",
    updatedAt: "1 ngày trước",
    createdAt: "2026-02-18",
    coverGradient: "linear-gradient(135deg, #5cffd1, #2c2c52)",
    description: "Bản phối VIP dành riêng cho các sự kiện DJ và biểu diễn trực tiếp.",
  },
  {
    id: "trk-003",
    title: "Acoustic Rain & Piano - Demo v3",
    artist: "You (Artist Studio)",
    genre: "Lo-fi / Ambient",
    duration: "2:58",
    status: "draft",
    visibility: "private",
    plays: 0,
    likes: 0,
    commentsCount: 0,
    bpm: 78,
    key: "C Maj",
    updatedAt: "3 ngày trước",
    createdAt: "2026-03-10",
    coverGradient: "linear-gradient(135deg, #bff0d8, #3da080)",
    description: "Bản nháp thu âm mộc tại phòng thu cá nhân, đang chờ hòa âm phối khí.",
  },
  {
    id: "trk-004",
    title: "Neon Horizon (Club Extended Edit)",
    artist: "You (Artist Studio)",
    genre: "Progressive House",
    duration: "5:12",
    status: "draft",
    visibility: "unlisted",
    plays: 142,
    likes: 19,
    commentsCount: 4,
    bpm: 126,
    key: "D Min",
    updatedAt: "5 ngày trước",
    createdAt: "2026-03-05",
    coverGradient: "linear-gradient(135deg, #ff8fbf, #7a1c4a)",
    description: "Bản gửi duyệt độc quyền cho các label và curators thử nghiệm.",
  },
  {
    id: "trk-005",
    title: "Sunset Boulevard - Master 96k",
    artist: "You (Artist Studio)",
    genre: "Future Bass",
    duration: "3:30",
    status: "published",
    visibility: "public",
    plays: 52400,
    likes: 4200,
    commentsCount: 340,
    bpm: 140,
    key: "E Maj",
    updatedAt: "2 tuần trước",
    createdAt: "2026-01-20",
    coverGradient: "linear-gradient(135deg, #ffae5a, #9a4d2a)",
    description: "Bản Master chất lượng cao chuẩn bị phát hành phiên bản đĩa Vinyl giới hạn.",
  },
  {
    id: "trk-006",
    title: "Deep Resonance - Sub Bass Test",
    artist: "You (Artist Studio)",
    genre: "Deep Tech / Minimal",
    duration: "2:15",
    status: "draft",
    visibility: "private",
    plays: 35,
    likes: 2,
    commentsCount: 1,
    bpm: 122,
    key: "G Min",
    updatedAt: "1 tháng trước",
    createdAt: "2026-01-05",
    coverGradient: "linear-gradient(135deg, #a0b0ff, #1f1f3f)",
    description: "File kiểm tra dải trầm subwoofer và dynamic range trước khi hoàn thiện.",
  },
];

const STORAGE_KEY = "moodify_artist_tracks_v1";

export function getSavedArtistTracks(): ArtistTrack[] {
  if (typeof window === "undefined") {
    return INITIAL_ARTIST_TRACKS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ARTIST_TRACKS));
      return INITIAL_ARTIST_TRACKS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_ARTIST_TRACKS;
  } catch {
    return INITIAL_ARTIST_TRACKS;
  }
}

export function saveArtistTracks(tracks: ArtistTrack[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
  } catch (err) {
    console.error("Failed to save tracks to localStorage:", err);
  }
}
