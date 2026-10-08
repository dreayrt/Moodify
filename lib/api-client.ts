// API Base URL - Luôn đảm bảo có tiền tố /api
const rawBase = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8088').replace(/\/$/, '');
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

import { getValidAccessToken } from './auth-client';

// ============================================================================
// Types
// ============================================================================

export type Track = {
  id: string;
  spotifyId: string;
  name: string;
  artistName: string;
  artistSpotifyId: string;
  albumName: string;
  durationMs: number;
  popularity: number;
  previewUrl: string | null;
  imageUrl: string | null;
  genres: string[];
  lyricsPlain?: string | null;
  lyricsSynced?: string | null;
  localPath?: string | null;
  audioUrl?: string | null;
};

export type TrackPageResponse = {
  content: Track[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type LibraryTrack = Track & {
  addedAt: string;
};

export type LibraryPageResponse = {
  tracks: LibraryTrack[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
};

export type Artist = {
  id: string;
  spotifyId: string;
  name: string;
  genres: string[];
  followers: number;
  popularity: number;
  imageUrl: string | null;
};

export type Playlist = {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  username: string;
  isPublic: boolean;
  trackCount: number;
  tracks: Track[];
  createdAt: string;
  updatedAt: string;
};

export type CreatePlaylistRequest = {
  name: string;
  description?: string;
  coverUrl?: string;
  isPublic?: boolean;
};

// ============================================================================
// Track APIs
// ============================================================================

/**
 * Fetch tracks with optional filters
 */
export type EmotionInfo = {
  text: string;
  label: string;
  emoji: string;
  confidence: number;
  probabilities?: Record<string, number>;
  music_recommendation?: {
    strategy?: string;
    mood_analysis?: string;
    target_valence?: number;
    target_energy?: number;
    seed_genres?: string[];
  };
};

export type MoodRecommendationResponse = {
  emotion: EmotionInfo;
  tracks: Track[];
  totalMatched: number;
};

/**
 * Recommend tracks based on user emotion text
 */
export async function fetchMoodRecommendation(
  text: string,
  strategy: string = 'empathy',
  limit: number = 50
): Promise<MoodRecommendationResponse> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  try {
    const token = await getValidAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {}

  const response = await fetch(`${API_BASE}/emotions/recommend`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, strategy, limit }),
  });

  if (!response.ok) {
    throw new Error(`Failed to recommend tracks by mood: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch tracks with optional filters
 */
export async function fetchTracks(options?: {
  page?: number;
  size?: number;
  query?: string;
  genre?: string;
  mode?: string;
}): Promise<TrackPageResponse> {
  const params = new URLSearchParams();
  
  if (options?.page !== undefined) params.set('page', options.page.toString());
  if (options?.size !== undefined) params.set('size', options.size.toString());
  if (options?.query) params.set('query', options.query);
  if (options?.genre) params.set('genre', options.genre);
  if (options?.mode) params.set('mode', options.mode);

  const headers: HeadersInit = {};
  try {
    const token = await getValidAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {}

  const response = await fetch(`${API_BASE}/tracks?${params.toString()}`, { headers });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tracks: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch a single track by ID
 */
export async function fetchTrackById(id: string): Promise<Track> {
  const response = await fetch(`${API_BASE}/tracks/${id}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Track not found');
    }
    throw new Error(`Failed to fetch track: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Máy chủ âm nhạc trực tuyến (Oracle Music Cloud Server) lưu trữ toàn bộ kho nhạc MP3
 */
export const ONLINE_AUDIO_SERVER_URL =
  process.env.NEXT_PUBLIC_AUDIO_SERVER_URL?.replace(/\/+$/, "") || "http://158.178.247.33";

/**
 * Trả về trực tiếp URL phát nhạc từ máy chủ đám mây trực tuyến trên mạng (Public IP Oracle)
 * thay vì phụ thuộc vào tệp cục bộ trên máy.
 */
export function resolveTrackAudioUrl(track: {
  audioUrl?: string | null;
  localPath?: string | null;
  spotifyId?: string;
  id?: string;
}): string {
  if (track.audioUrl && (track.audioUrl.startsWith("http://") || track.audioUrl.startsWith("https://"))) {
    return track.audioUrl;
  }
  if (track.localPath && !track.localPath.startsWith("http")) {
    const clean = track.localPath.replace(/^\/+/, "");
    return `${ONLINE_AUDIO_SERVER_URL}/${clean}`;
  }
  if (track.localPath && (track.localPath.startsWith("http://") || track.localPath.startsWith("https://"))) {
    return track.localPath;
  }
  return getTrackStreamUrl(track.spotifyId || track.id || "");
}

/**
 * Get streaming audio URL for a track
 */
export function getTrackStreamUrl(trackIdOrSpotifyId: string): string {
  return `${API_BASE}/tracks/${trackIdOrSpotifyId}/stream`;
}

/**
 * Resolve đường dẫn tĩnh trên backend (vd: /uploads/ads/xxx.mp3) thành URL đầy đủ.
 */
export function getBackendFileUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : rawBase;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Fetch tracks by artist
 */
export async function fetchArtistTracks(
  artistId: string,
  page?: number,
  size?: number
): Promise<TrackPageResponse> {
  const params = new URLSearchParams();
  
  if (page !== undefined) params.set('page', page.toString());
  if (size !== undefined) params.set('size', size.toString());

  const response = await fetch(
    `${API_BASE}/artists/${artistId}/tracks?${params.toString()}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch artist tracks: ${response.status}`);
  }
  
  return response.json();
}

// ============================================================================
// Library APIs (Authenticated)
// ============================================================================

/**
 * Add track to user library
 */
export async function addToLibrary(trackSpotifyId: string): Promise<void> {
  const token = await getValidAccessToken();
  
  const response = await fetch(
    `${API_BASE}/users/me/library/tracks/${trackSpotifyId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Track not found');
    } else if (response.status === 401) {
      throw new Error('Unauthorized - please login again');
    }
    throw new Error('Failed to add track to library');
  }
}

/**
 * Remove track from user library
 */
export async function removeFromLibrary(trackSpotifyId: string): Promise<void> {
  const token = await getValidAccessToken();
  
  const response = await fetch(
    `${API_BASE}/users/me/library/tracks/${trackSpotifyId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please login again');
    }
    throw new Error('Failed to remove track from library');
  }
}

/**
 * Fetch user's library tracks
 */
export async function fetchUserLibrary(
  page?: number,
  size?: number
): Promise<LibraryPageResponse> {
  const token = await getValidAccessToken();
  
  const params = new URLSearchParams();
  if (page !== undefined) params.set('page', page.toString());
  if (size !== undefined) params.set('size', size.toString());

  const response = await fetch(
    `${API_BASE}/users/me/library/tracks?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please login again');
    }
    throw new Error('Failed to fetch library');
  }
  
  return response.json();
}

/**
 * Fetch all liked track Spotify IDs for current user
 */
export async function fetchLikedTrackIds(): Promise<string[]> {
  const token = await getValidAccessToken().catch(() => null);
  if (!token) return [];

  const response = await fetch(`${API_BASE}/users/me/library/track-ids`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      return [];
    }
    throw new Error('Failed to fetch liked track IDs');
  }

  return response.json();
}

/**
 * Check if track is in user library
 */
export async function isTrackInLibrary(trackSpotifyId: string): Promise<boolean> {
  const token = await getValidAccessToken().catch(() => null);
  if (!token) return false;
  
  const response = await fetch(
    `${API_BASE}/users/me/library/tracks/${trackSpotifyId}/exists`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (!response.ok) {
    if (response.status === 401) {
      return false;
    }
    throw new Error('Failed to check library status');
  }
  
  const data = await response.json();
  return data.exists;
}

// ============================================================================
// Artist APIs
// ============================================================================

/**
 * Search for artists
 */
export async function fetchArtists(query: string): Promise<Artist[]> {
  if (!query || query.trim() === '') {
    return [];
  }

  const params = new URLSearchParams();
  params.set('query', query.trim());

  const response = await fetch(`${API_BASE}/artists?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch artists: ${response.status}`);
  }
  
  return response.json();
}

// ============================================================================
// Playlist APIs (Authenticated & Public)
// ============================================================================

/**
 * Fetch current user's playlists
 */
export async function fetchUserPlaylists(): Promise<Playlist[]> {
  const token = await getValidAccessToken();

  const response = await fetch(`${API_BASE}/playlists/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please login again');
    }
    throw new Error('Failed to fetch playlists');
  }

  return response.json();
}

/**
 * Fetch a playlist by ID (with its tracks)
 */
export async function fetchPlaylistById(id: string): Promise<Playlist> {
  const token = await getValidAccessToken().catch(() => null);
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/playlists/${id}`, { headers });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Playlist not found');
    }
    throw new Error(`Failed to fetch playlist: ${response.status}`);
  }

  return response.json();
}

/**
 * Create a new playlist
 */
export async function createPlaylist(
  payload: CreatePlaylistRequest
): Promise<Playlist> {
  const token = await getValidAccessToken();

  const response = await fetch(`${API_BASE}/playlists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please login again');
    }
    throw new Error('Failed to create playlist');
  }

  return response.json();
}

/**
 * Add a track to a playlist
 */
export async function addTrackToPlaylist(
  playlistId: string,
  trackSpotifyId: string
): Promise<Playlist> {
  const token = await getValidAccessToken();

  const response = await fetch(`${API_BASE}/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trackSpotifyId }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please login again');
    }
    throw new Error('Failed to add track to playlist');
  }

  return response.json();
}

/**
 * Remove a track from a playlist
 */
export async function removeTrackFromPlaylist(
  playlistId: string,
  trackSpotifyId: string
): Promise<Playlist> {
  const token = await getValidAccessToken();

  const response = await fetch(
    `${API_BASE}/playlists/${playlistId}/tracks/${trackSpotifyId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please login again');
    }
    throw new Error('Failed to remove track from playlist');
  }

  return response.json();
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(playlistId: string): Promise<void> {
  const token = await getValidAccessToken();

  const response = await fetch(`${API_BASE}/playlists/${playlistId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please login again');
    }
    throw new Error('Failed to delete playlist');
  }
}

// ============================================================================
// Subscription & Package APIs
// ============================================================================

export interface ServicePackage {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  display_order: number;
}

export interface SubscriptionInfo {
  isPremium: boolean;
  tier: "INDIVIDUAL" | "INDIVIDUAL_BASIC" | "INDIVIDUAL_FULL" | "FAMILY" | "FREE";
  packageName: string;
  price?: number;
  daysRemaining: number;
  startAt?: string;
  expiresAt?: string;
  benefits: string[];
  entitlements?: PackageEntitlements;
}

// Quyền hạn theo gói (đồng bộ với PackageEntitlements ở admin types
// và features_json phía backend). Quyết định hạn mức quảng cáo/skip/offline thật.
export interface PackageEntitlements {
  tier?: "FAMILY" | "INDIVIDUAL_FULL" | "INDIVIDUAL_BASIC" | "FREE";
  adPolicy: "NO_ADS" | "DAILY_QUOTA" | "FULL_ADS";
  adFreeDailyLimit: number;
  adIntervalAfterLimit: number;
  skipPolicy: "UNLIMITED" | "LIMITED";
  skipDailyLimit: number;
  offlineAllowed: boolean;
  offlineMaxTracks: number;
  maxDevices: number;
  syncedLyrics?: boolean;
  vipBadge?: boolean;
  familySharing?: boolean;
  familyMembers?: number;
}

export const FREE_ENTITLEMENTS: PackageEntitlements = {
  tier: "FREE",
  adPolicy: "FULL_ADS",
  adFreeDailyLimit: 0,
  adIntervalAfterLimit: 2,
  skipPolicy: "LIMITED",
  skipDailyLimit: 6,
  offlineAllowed: false,
  offlineMaxTracks: 0,
  maxDevices: 1,
  syncedLyrics: false,
  vipBadge: false,
  familySharing: false,
};

// ============================================================================
// Thông báo (notification) — hộp thư người dùng
// ============================================================================

export type MoodifyNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string | null;
};

export async function fetchMyNotifications(): Promise<{
  items: MoodifyNotification[];
  unreadCount: number;
}> {
  const token = await getValidAccessToken().catch(() => null);
  if (!token) return { items: [], unreadCount: 0 };

  try {
    const res = await fetch(`${API_BASE}/notifications/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { items: [], unreadCount: 0 };
    return res.json();
  } catch {
    return { items: [], unreadCount: 0 };
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const token = await getValidAccessToken().catch(() => null);
  if (!token) return;
  try {
    await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // best-effort
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const token = await getValidAccessToken().catch(() => null);
  if (!token) return;
  try {
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // best-effort
  }
}

// ============================================================================
// Quảng cáo public — player lấy danh sách chiến dịch đang hiệu lực
// ============================================================================

export type ActiveAd = {
  id: string;
  title: string;
  advertiser: string | null;
  audioUrl: string;
  durationSeconds: number | null;
};

export async function fetchActiveAdCampaigns(): Promise<ActiveAd[]> {
  try {
    const res = await fetch(`${API_BASE}/ads/active`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function recordAdImpression(adId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/ads/${adId}/impression`, { method: "POST" });
  } catch {
    // impression là best-effort, không chặn phát quảng cáo
  }
}

export async function fetchServicePackages(): Promise<ServicePackage[]> {
  const res = await fetch(`${API_BASE}/packages`);
  if (!res.ok) throw new Error("Failed to fetch packages");
  return res.json();
}

export async function fetchMySubscription(): Promise<SubscriptionInfo> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/subscriptions/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    return {
      isPremium: false,
      tier: "FREE",
      packageName: "Tài khoản Miễn phí",
      daysRemaining: 0,
      benefits: [],
    };
  }
  return res.json();
}

export async function subscribePackage(
  packageId: number,
  paymentMethod: string = "QR_TRANSFER"
): Promise<{ success: boolean; message: string; isPremium: boolean }> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/subscriptions/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ packageId, paymentMethod }),
  });
  if (!res.ok) throw new Error("Đăng ký gói không thành công");
  return res.json();
}

export interface CheckoutResponse {
  success: boolean;
  orderCode: string;
  paymentId: number;
  subscriptionId: number;
  packageId: number;
  packageName: string;
  amount: number;
  bankAccount: string;
  bankName: string;
  accountName: string;
  transferContent: string;
  qrUrl: string;
  status: string;
  message: string;
}

export interface PaymentStatusResponse {
  orderCode: string;
  status: 'PENDING' | 'SUCCESS' | 'CANCELLED' | 'EXPIRED';
  amount?: number;
  packageName?: string;
  paidAt?: string;
  expiresAt?: string;
  isPremium?: boolean;
}

export async function createCheckoutPayment(
  packageId: number,
  idempotencyKey?: string
): Promise<CheckoutResponse> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const res = await fetch(`${API_BASE}/subscriptions/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ packageId, idempotencyKey }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Tạo đơn thanh toán thất bại');
  }
  return res.json();
}

export async function getPaymentStatus(
  orderCode: string
): Promise<PaymentStatusResponse> {
  const res = await fetch(`${API_BASE}/subscriptions/payment-status/${orderCode}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error('Không thể kiểm tra trạng thái thanh toán');
  }
  return res.json();
}

export async function devTogglePremium(
  enable: boolean,
  days: number = 30,
  packageId?: number
): Promise<{ success: boolean; message: string; isPremium: boolean; tier?: string }> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/subscriptions/dev-toggle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ enable, days, packageId }),
  });
  if (!res.ok) throw new Error("Chuyển trạng thái thất bại");
  return res.json();
}

export async function downloadTrackFile(
  spotifyId: string,
  trackName: string = "track"
): Promise<void> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error("Vui lòng đăng nhập để tải bài hát.");
  }
  const res = await fetch(
    `${API_BASE}/subscriptions/tracks/${encodeURIComponent(spotifyId)}/download`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (res.status === 403) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(
      errorJson.message ||
        "Tính năng tải nhạc ngoại tuyến chỉ dành cho tài khoản Moodify Premium."
    );
  }

  if (!res.ok) {
    throw new Error("Không thể tải bài hát vào lúc này.");
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  const safeFilename = trackName.replace(/[/\\?%*:|"<>]/g, "_").trim() || "track";
  anchor.download = `${safeFilename}.mp3`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}

// ============================================================================
// User Listening History & Activity Trace
// ============================================================================

export type UserListeningHistoryItem = {
  id: number;
  trackId: string;
  spotifyId?: string;
  title: string;
  trackTitle?: string;
  artist: string;
  artistName?: string;
  coverUrl: string;
  audioUrl?: string;
  durationMs: number;
  totalDuration: string;
  genre: string;
  startedAt: string;
  endedAt: string;
  listenedDurationMs: number;
  listenedDurationSeconds: number;
  listenedDurationFormatted: string;
  lastPositionMs: number;
  lastPositionSeconds: number;
  lastPositionFormatted: string;
  source: string;
  sourceId?: string;
  deviceType: string;
  eventCount: number;
  completionRatePercent: number;
  isCompleted: boolean;
  lyricsSynced?: string;
  lyricsPlain?: string;
};

export type UserListeningHistorySummary = {
  totalListenedTracks: number;
  totalListenedMinutes: number;
  totalListenedHours: number;
  completionRatePercent: number;
  totalCompletedSessions: number;
};

export type UserListeningHistoryResponse = {
  items: UserListeningHistoryItem[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  summary: UserListeningHistorySummary;
};

export type UserHistoryTraceEvent = {
  id: number;
  listeningHistoryId: number;
  eventType: "PLAY" | "PAUSE" | "RESUME" | "SEEK" | "SKIP_NEXT" | "SKIP_PREVIOUS" | "COMPLETE" | string;
  positionMs: number;
  positionFormatted: string;
  targetPositionMs: number;
  targetPositionFormatted: string;
  occurredAt: string;
};

export async function fetchMyListeningHistory(params: {
  page?: number;
  size?: number;
  search?: string;
} = {}): Promise<UserListeningHistoryResponse> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Chưa đăng nhập");
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size !== undefined) query.set("size", String(params.size));
  if (params.search) query.set("search", params.search);

  const res = await fetch(`${API_BASE}/analytics/my-history?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Không thể tải lịch sử nghe");
  return res.json();
}

export async function fetchMyHistoryTraceEvents(historyId: number): Promise<{
  historyId: number;
  items: UserHistoryTraceEvent[];
  totalEvents: number;
}> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Chưa đăng nhập");
  const res = await fetch(`${API_BASE}/analytics/my-history/${historyId}/events`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Không thể tải chi tiết sự kiện");
  return res.json();
}

export async function deleteMyHistoryItem(historyId: number): Promise<{ success: boolean; message: string }> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Chưa đăng nhập");
  const res = await fetch(`${API_BASE}/analytics/my-history/${historyId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Không thể xóa bài hát khỏi lịch sử");
  return res.json();
}

export async function clearMyListeningHistory(): Promise<{ success: boolean; deletedCount: number; message: string }> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Chưa đăng nhập");
  const res = await fetch(`${API_BASE}/analytics/my-history`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Không thể xóa toàn bộ lịch sử nghe");
  return res.json();
}


