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
  featuredArtists?: string;
  albumName?: string;
  explicit?: boolean;
  lyricsPlain?: string;
  spotifyId?: string;
  spotifyUrl?: string;
  downloadStatus?: string;
  moderationStatus?: string;
  moderationScore?: number;
  description?: string;
  license?: SongLicense;
};

export type LicenseType =
  | "DIGITAL_STREAMING"
  | "MASTER_LICENSE"
  | "DIRECT_LICENSE"
  | "STREAMING_PENDING";

export type LicenseStatus = "ACTIVE" | "PENDING" | "EXPIRED" | "REVOKED";

export interface SongLicense {
  id?: string;
  trackId?: string;
  distributorId?: number | null;
  distributionContractId?: number | null;
  licenseType: LicenseType;
  copyrightOwner: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  status: LicenseStatus;
  documentUrl?: string | null;
  documentName?: string | null;
}

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
