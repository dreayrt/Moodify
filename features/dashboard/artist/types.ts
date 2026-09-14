export type TrackStatus = "draft" | "published" | "scheduled";

export type TrackVisibility = "public" | "private" | "unlisted";

export type ArtistTrack = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: string;
  status: TrackStatus;
  visibility: TrackVisibility;
  plays: number;
  likes: number;
  commentsCount: number;
  updatedAt: string;
  createdAt: string;
  bpm?: number;
  key?: string;
  coverGradient?: string;
  coverUrl?: string;
  audioUrl?: string;
  spotifyId?: string;
  spotifyUrl?: string;
  downloadStatus?: string;
  moderationStatus?: string;
  moderationScore?: number;
  description?: string;
};

export type TrackFilterStatus = "all" | "draft" | "published";

export type TrackFilterVisibility = "all" | "public" | "private" | "unlisted";

export type TrackSortOption =
  | "newest"
  | "oldest"
  | "most_played"
  | "most_liked"
  | "title_asc"
  | "title_desc";

export type ToastMessage = {
  id: string;
  type: "success" | "info" | "warning" | "error";
  message: string;
};
