export type AdminTab =
  | "overview"
  | "users"
  | "moderation"
  | "catalog"
  | "monetization"
  | "licensing"
  | "settings";

export type AdminUserRole = "USER" | "CONTENT_LEAD" | "MODERATOR" | "ADMIN" | "ARTIST";
export type AdminUserStatus = "ACTIVE" | "INACTIVE" | "BANNED";

export type AdminUser = {
  id: number;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  avatarUrl: string | null;
  artistSpotifyId: string | null;
  staffCode: string | null;
  banReason?: string;
  bannedUntil?: string;
  devicesCount: number;
  lastLoginAt: string | null;
  createdAt: string;
};

export type UserDevice = {
  id: number;
  userId: number;
  deviceUuid: string;
  platform: "ANDROID" | "IOS" | "OTHER";
  deviceName: string;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
};

export type ReviewRequest = {
  id: number;
  artistUserId: number;
  artistName: string;
  contentType: "TRACK" | "ALBUM";
  contentId: string;
  title: string;
  coverUrl: string;
  genre: string;
  requestType: "PUBLISH" | "UPDATE";
  status: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
  submittedAt: string;
  resolvedAt: string | null;
  audioUrl?: string;
  lyricsPlain?: string;
  audioFeatures?: {
    bpm: number;
    energy: number;
    danceability: number;
    valence: number;
    acousticness: number;
    keySignature: string;
  };
};

export type ReviewAction = {
  id: number;
  reviewRequestId: number;
  moderatorUserId: number;
  moderatorName: string;
  action: "START_REVIEW" | "APPROVE" | "REJECT" | "RETURN_FOR_EDIT";
  reason: string | null;
  createdAt: string;
};

export type CatalogTrack = {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  vibeCategory: "Energetic" | "Chill" | "Sadness" | "Focus" | "Romance";
  duration: string;
  coverUrl: string;
  audioUrl?: string;
  plays: number;
  likes: number;
  status: "published" | "draft" | "flagged" | "taken_down";
  moderationScore: number;
  bpm: number;
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  keySignature: string;
  createdAt: string;
};

export type ServicePackage = {
  id: number;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  displayOrder: number;
  status: "ACTIVE" | "INACTIVE";
  subscribersCount?: number;
  features?: string[];
};

export type PaymentTransaction = {
  id: number;
  subscriptionId: number;
  userName: string;
  userEmail: string;
  packageName: string;
  amount: number;
  paymentMethod: string;
  provider: "VNPAY" | "MOMO" | "CARD" | "QR";
  providerTransactionId: string;
  status: "SUCCESS" | "PENDING" | "FAILED" | "CANCELLED" | "REFUNDED";
  paidAt: string;
};

export type Distributor = {
  id: number;
  companyName: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: "ACTIVE" | "INACTIVE";
  contractCount: number;
};

export type DistributionContract = {
  id: number;
  distributorId: number;
  distributorName: string;
  contractCode: string;
  title: string;
  signedDate: string;
  effectiveFrom: string;
  effectiveTo: string;
  revenueShare: number; // percentage e.g. 70.0 = 70%
  status: "ACTIVE" | "DRAFT" | "EXPIRED" | "TERMINATED";
  documentUrl: string;
};

export type SongLicense = {
  id: number;
  trackId: string;
  trackTitle: string;
  distributorName?: string;
  licenseType: string;
  copyrightOwner: string;
  issueDate: string;
  expiryDate: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | "PENDING";
  documentUrl?: string;
};

export type SystemAuditLog = {
  id: string;
  timestamp: string;
  operatorName: string;
  operatorRole: string;
  category: "SECURITY" | "IAM" | "MODERATION" | "CATALOG" | "BILLING" | "SYSTEM";
  action: string;
  target: string;
  details: string;
  severity: "info" | "warning" | "critical";
};

export type AdminToast = {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
};
