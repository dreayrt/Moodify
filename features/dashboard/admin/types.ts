export type AdminTab =
  | "overview"
  | "analytics"
  | "catalog"
  | "favorites"
  | "users"
  | "moderation"
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

export type UserSubscription = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  servicePackageId: number;
  packageName: string;
  startAt: string;
  endAt: string;
  autoRenew: boolean;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "SUSPENDED" | "PENDING";
  price: number;
};

export type PlatformAnalytics = {
  streaming: {
    totalStreams: number;
    weeklyGrowth: number;
    totalListenedHours: number;
    completionRate: number; // e.g. 84.6%
    skipRate: number; // e.g. 15.4%
    sources: { source: string; label: string; percentage: number; count: number }[];
    devices: { device: string; label: string; percentage: number; count: number }[];
    dailyVelocity: { date: string; day: string; streams: number; listeners: number }[];
  };
  emotions: {
    distribution: { vibe: string; label: string; percentage: number; count: number; color: string }[];
    avgConfidence: number; // e.g. 86.8%
    timeOfDayHeatmap: { timeSlot: string; topVibe: string; description: string; activityLevel: number }[];
    topSearchKeywords: { keyword: string; count: number; emotion: string }[];
  };
  financial: {
    totalRevenue: number;
    mrr: number; // Monthly recurring revenue
    arpu: number; // Average revenue per user
    vipConversionRate: number; // % free to paid
    packageShare: { packageName: string; revenue: number; percentage: number; subscribers: number }[];
    providerShare: { provider: string; percentage: number; amount: number }[];
    monthlyTrend: { month: string; revenue: number; newSubs: number }[];
  };
  topCharts: {
    topTracks: { id: string; title: string; artist: string; coverUrl: string; streams: number; vibe: string }[];
    topArtists: { id: string; name: string; avatarUrl: string; followers: number; streams: number; genre: string }[];
  };
  systemHealth: {
    mysqlStatus: "healthy" | "degraded" | "down";
    mysqlLatencyMs: number;
    mysqlConnections: number;
    mongoStatus: "healthy" | "degraded" | "down";
    mongoLatencyMs: number;
    mongoDocsCount: number;
  };
};


export type FavoriteRecord = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  type: "SONG" | "ARTIST" | "ALBUM";
  targetId: string;
  targetTitle: string;
  targetSubtitle?: string;
  targetCoverUrl: string;
  audioUrl?: string;
  createdAt: string;
};

export type FavoriteLeaderboardItem = {
  targetId: string;
  targetTitle: string;
  targetSubtitle?: string;
  targetCoverUrl: string;
  audioUrl?: string;
  favoriteCount: number;
  type: "SONG" | "ARTIST" | "ALBUM";
};

