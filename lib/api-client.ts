// API Base URL - Luôn đảm bảo có tiền tố /api
const rawBase = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8088').replace(/\/$/, '');
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

function safeEncodeParam(id: string): string {
  if (!id) return '';
  try {
    return encodeURIComponent(decodeURIComponent(id).trim());
  } catch {
    return encodeURIComponent(id.trim());
  }
}

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
  moodMatchDistance?: number | null;
  moodFeatureCoverage?: number | null;
  moodMatchedTags?: string[] | null;
  moodFeatureDistances?: Record<string, MoodFeatureDistance> | null;
};

export type MoodFeatureDistance = {
  weight: number;
  targetValue: number | null;
  actualValue: number | null;
  normalizedDistance: number | null;
  weightedSquaredError: number | null;
  insideRecommendedRange: boolean | null;
};

export type MoodCatalogDiagnostics = {
  tracksWithAudioFeatures: number;
  tracksWithCompleteAudioFeatures: number;
  tracksWithGenreTags: number;
  tracksWithMoodTags: number;
  averageFeatureCoverage: number;
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
    target_danceability?: number;
    target_acousticness?: number;
    target_tempo?: string;
    target_mode?: string;
    seed_genres?: string[];
  };
};

export type MoodRecommendationResponse = {
  emotion: EmotionInfo;
  tracks: Track[];
  totalMatched: number;
  candidateCount?: number;
  matchStatus?: "MATCHED" | "LIMITED" | "NO_CANDIDATES" | string;
  rankingVersion?: string;
  maxMatchDistance?: number;
  catalogDiagnostics?: MoodCatalogDiagnostics | null;
};

export type SearchHistoryType = "ALL" | "TRACK" | "ARTIST" | "ALBUM" | "PLAYLIST" | "EMOTION";

export type SearchHistoryItem = {
  id: number;
  keyword: string;
  searchType: SearchHistoryType;
  detectedEmotion: string | null;
  emotionConfidence: number | null;
  selectedTargetType: string | null;
  selectedTargetId: string | null;
  searchedAt: string;
};

export type SearchHistoryPage = {
  content: SearchHistoryItem[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

/**
 * Recommend tracks based on user emotion text
 */
export async function fetchMoodRecommendation(
  text: string,
  strategy: string = 'empathy',
  limit: number = 50,
  signal?: AbortSignal
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
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as { detail?: string; message?: string; title?: string } | null;
    throw new Error(errorBody?.detail || errorBody?.message || errorBody?.title || `Không thể tìm nhạc theo cảm xúc (${response.status})`);
  }

  return response.json();
}

export async function recordMySearchHistory(input: {
  keyword: string;
  searchType: SearchHistoryType;
  detectedEmotion?: string;
  emotionConfidence?: number;
}): Promise<SearchHistoryItem> {
  const token = await getValidAccessToken().catch(() => null);
  if (!token) throw new Error("Vui lòng đăng nhập để lưu lịch sử tìm kiếm");

  const response = await fetch(`${API_BASE}/users/me/search-history`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Không thể lưu lịch sử tìm kiếm");
  return response.json();
}

export async function selectMySearchHistoryResult(
  historyId: number,
  targetType: "TRACK" | "ARTIST" | "ALBUM" | "PLAYLIST",
  targetId: string
): Promise<SearchHistoryItem> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Vui lòng đăng nhập để lưu kết quả đã chọn");

  const response = await fetch(`${API_BASE}/users/me/search-history/${historyId}/selection`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ targetType, targetId }),
  });
  if (!response.ok) throw new Error("Không thể lưu kết quả tìm kiếm đã chọn");
  return response.json();
}

export async function fetchMySearchHistory(params: {
  page?: number;
  size?: number;
  type?: SearchHistoryType | "";
  query?: string;
} = {}): Promise<SearchHistoryPage> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Vui lòng đăng nhập để xem lịch sử tìm kiếm");

  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  if (params.type) query.set("type", params.type);
  if (params.query?.trim()) query.set("q", params.query.trim());

  const response = await fetch(`${API_BASE}/users/me/search-history?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) throw new Error("Vui lòng đăng nhập để xem lịch sử tìm kiếm");
  if (!response.ok) throw new Error("Không thể tải lịch sử tìm kiếm");
  return response.json();
}

export async function deleteMySearchHistoryItem(historyId: number): Promise<void> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Vui lòng đăng nhập để xóa lịch sử tìm kiếm");

  const response = await fetch(`${API_BASE}/users/me/search-history/${historyId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Không thể xóa mục lịch sử tìm kiếm");
}

export async function clearMySearchHistory(): Promise<{ deletedCount: number }> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Vui lòng đăng nhập để xóa lịch sử tìm kiếm");

  const response = await fetch(`${API_BASE}/users/me/search-history`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Không thể xóa lịch sử tìm kiếm");
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
  signal?: AbortSignal;
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

  const response = await fetch(`${API_BASE}/tracks?${params.toString()}`, {
    headers,
    signal: options?.signal,
  });
  
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
export async function fetchLikedTrackIds(signal?: AbortSignal): Promise<string[]> {
  const token = await getValidAccessToken().catch(() => null);
  if (!token) return [];

  const response = await fetch(`${API_BASE}/users/me/library/track-ids`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
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
export async function fetchArtists(query?: string, signal?: AbortSignal): Promise<Artist[]> {
  const params = new URLSearchParams();
  if (query?.trim()) {
    params.set('query', query.trim());
  }

  const queryStr = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE}/artists${queryStr}`, { signal });
  
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
 * Search public playlists
 */
export async function fetchPublicPlaylists(query?: string): Promise<Playlist[]> {
  const token = await getValidAccessToken().catch(() => null);
  const params = new URLSearchParams();
  if (query && query.trim()) params.set('q', query.trim());

  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/playlists?${params.toString()}`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch public playlists: ${response.status}`);
  }
  return response.json();
}

/**
 * Update playlist visibility (Public / Private)
 */
export async function updatePlaylistVisibility(
  playlistId: string,
  isPublic: boolean
): Promise<Playlist> {
  const token = await getValidAccessToken();
  const response = await fetch(
    `${API_BASE}/playlists/${playlistId}/visibility?isPublic=${isPublic}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to update playlist visibility: ${response.status}`);
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
  tier_id?: "INDIVIDUAL_BASIC" | "INDIVIDUAL_FULL" | "FAMILY" | string;
  tierId?: "INDIVIDUAL_BASIC" | "INDIVIDUAL_FULL" | "FAMILY" | string;
}

export interface PackageQuote extends ServicePackage {
  baseAmount: number;
  discountAmount: number;
  discountPercent: number;
  discountApplied: boolean;
  amount: number;
  action: "NEW" | "RENEWAL" | "UPGRADE" | "DOWNGRADE" | "AFTER_SCHEDULED";
  actionLabel: string;
  actionDescription: string;
  startAt: string;
  expiresAt: string;
  bonusDays: number;
  isCurrentPackage: boolean;
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

export interface SubscriptionManagementPayment {
  id: number;
  amount: number;
  paymentMethod: string | null;
  provider: string | null;
  orderCode: string | null;
  providerReference: string | null;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED" | string;
  paidAt: string | null;
  createdAt: string | null;
}

export interface ManagedSubscription {
  id: number;
  packageId: number;
  packageName: string;
  packageDescription: string | null;
  catalogPrice: number;
  durationDays: number;
  tierId: string | null;
  tierName: string | null;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
  autoRenew: boolean;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "SUSPENDED" | string;
  isCurrent: boolean;
  isScheduled: boolean;
  canCancel: boolean;
  cancelKind: "PENDING_ORDER" | "SCHEDULED_PAID" | null;
  payments: SubscriptionManagementPayment[];
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

export async function fetchPackageQuotes(): Promise<PackageQuote[]> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/subscriptions/package-quotes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Không thể tải báo giá gói dịch vụ");
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

export async function fetchMySubscriptionManagement(): Promise<ManagedSubscription[]> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/subscriptions/me/management`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Không thể tải danh sách gói dịch vụ");
  return res.json();
}

export async function cancelMyManagedSubscription(
  subscriptionId: number
): Promise<{ success: boolean; subscriptionId: number; message: string; refundIssued: boolean }> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/subscriptions/me/${subscriptionId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || "Không thể hủy gói dịch vụ này");
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
  baseAmount: number;
  discountAmount: number;
  discountPercent: number;
  discountApplied: boolean;
  amount: number;
  action: PackageQuote["action"];
  actionLabel: string;
  actionDescription: string;
  startAt: string;
  expiresAt: string;
  bonusDays: number;
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
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  amount?: number;
  packageName?: string;
  paidAt?: string;
  startAt?: string;
  expiresAt?: string;
  isPremium?: boolean;
  isEffectiveNow?: boolean;
}

export async function createCheckoutPayment(
  packageId: number
): Promise<CheckoutResponse> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(`${API_BASE}/subscriptions/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ packageId }),
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

// Album APIs (MySQL Hybrid Architecture)
// ============================================================================

export type Album = {
  id: number;
  title: string;
  description: string | null;
  coverUrl: string;
  releaseDate: string | null;
  isPublic: boolean;
  status: string;
  userId: number | null;
  authorName: string;
  authorAvatar: string | null;
  trackCount: number;
  isFavorited?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AlbumDetail = Album & {
  tracks: Track[];
};

export type AlbumPageResponse = {
  content: Album[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export async function fetchPublicAlbums(
  q?: string,
  page: number = 0,
  size: number = 20
): Promise<AlbumPageResponse> {
  const token = await getValidAccessToken().catch(() => null);
  const params = new URLSearchParams();
  if (q && q.trim()) params.set("q", q.trim());
  params.set("page", page.toString());
  params.set("size", size.toString());

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/albums?${params.toString()}`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch albums: ${res.status}`);
  return res.json();
}

export async function fetchAlbumDetail(id: number | string): Promise<AlbumDetail> {
  const token = await getValidAccessToken().catch(() => null);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/albums/${id}`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch album detail: ${res.status}`);
  return res.json();
}

export async function createAlbum(data: {
  title: string;
  description?: string;
  coverUrl?: string;
  isPublic?: boolean;
}): Promise<Album> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/albums`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create album: ${res.status}`);
  return res.json();
}

export async function updateAlbum(
  id: number | string,
  data: {
    title?: string;
    description?: string;
    coverUrl?: string;
    isPublic?: boolean;
  }
): Promise<Album> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/albums/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update album: ${res.status}`);
  return res.json();
}

export async function deleteAlbum(id: number | string): Promise<void> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/albums/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to delete album: ${res.status}`);
}

export async function addTrackToAlbum(
  albumId: number | string,
  trackId: string
): Promise<AlbumDetail> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/albums/${albumId}/tracks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trackId }),
  });
  if (!res.ok) throw new Error(`Failed to add track to album: ${res.status}`);
  return res.json();
}

export async function removeTrackFromAlbum(
  albumId: number | string,
  trackId: string
): Promise<AlbumDetail> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/albums/${albumId}/tracks/${encodeURIComponent(trackId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to remove track from album: ${res.status}`);
  return res.json();
}

export async function fetchUserAlbums(): Promise<Album[]> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/albums/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch user albums: ${res.status}`);
  return res.json();
}

export async function fetchLikedAlbums(): Promise<Album[]> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/albums/favorites/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch liked albums: ${res.status}`);
  return res.json();
}

export async function toggleFavoriteAlbum(
  albumId: number | string
): Promise<{ favorited: boolean; albumId: string }> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/albums/${albumId}/favorite`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to toggle favorite album: ${res.status}`);
  return res.json();
}

// ============================================================================
// Artist Public Profile, Reviews & Follow
// ============================================================================

export type ArtistPublicProfile = {
  artistId: string;
  name: string;
  imageUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  genres: string[];
  verified: boolean;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  followersCount: number;
  isFollowed: boolean;
  averageRating: number;
  reviewsCount: number;
  topTracks: Track[];
  albums: Album[];
  appearsOn: Track[];
};

export type ArtistReview = {
  id: number;
  userId: number | null;
  userName: string;
  userAvatar: string | null;
  rating: number;
  comment: string | null;
  status: string;
  artistReply: string | null;
  artistRepliedAt: string | null;
  createdAt: string;
};

export type ArtistReviewsPage = {
  content: ArtistReview[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  averageRating: number;
};

export type FollowArtistResponse = {
  artistId: string;
  isFollowed: boolean;
  followersCount: number;
  message: string;
};

export type FollowedArtist = {
  artistId: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  verified: boolean;
  followersCount: number;
  followedAt: string;
};

export async function fetchFollowedArtists(signal?: AbortSignal): Promise<FollowedArtist[]> {
  const token = await getValidAccessToken().catch(() => null);
  if (!token) return [];
  const res = await fetch(`${API_BASE}/artists/followed`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchFollowedArtistIds(signal?: AbortSignal): Promise<string[]> {
  const token = await getValidAccessToken().catch(() => null);
  if (!token) return [];
  const res = await fetch(`${API_BASE}/artists/followed-ids`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchArtistPublicProfile(
  artistId: string,
  signal?: AbortSignal
): Promise<ArtistPublicProfile> {
  const token = await getValidAccessToken().catch(() => null);
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/artists/${safeEncodeParam(artistId)}`, {
    headers,
    signal,
  });
  if (!res.ok) throw new Error(`Không thể tải thông tin nghệ sĩ (${res.status})`);
  return res.json();
}

export async function toggleFollowArtist(artistId: string): Promise<FollowArtistResponse> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Vui lòng đăng nhập để theo dõi nghệ sĩ");

  const res = await fetch(`${API_BASE}/artists/${safeEncodeParam(artistId)}/follow`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Không thể thay đổi trạng thái theo dõi (${res.status})`);
  const data: FollowArtistResponse = await res.json();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("moodify-artist-followed", {
        detail: {
          artistId,
          canonicalId: data.artistId,
          isFollowed: data.isFollowed,
          followersCount: data.followersCount,
        },
      })
    );
    window.dispatchEvent(
      new CustomEvent("moodify-library-updated", {
        detail: { type: "artist", artistId, isFollowed: data.isFollowed },
      })
    );
  }

  return data;
}

export async function fetchArtistReviews(
  artistId: string,
  page: number = 0,
  size: number = 10,
  signal?: AbortSignal
): Promise<ArtistReviewsPage> {
  const res = await fetch(
    `${API_BASE}/artists/${safeEncodeParam(artistId)}/reviews?page=${page}&size=${size}`,
    { signal }
  );
  if (!res.ok) throw new Error(`Không thể tải đánh giá nghệ sĩ (${res.status})`);
  return res.json();
}

export async function submitArtistReview(
  artistId: string,
  rating: number,
  comment?: string
): Promise<ArtistReview> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Vui lòng đăng nhập để gửi nhận xét");

  const res = await fetch(`${API_BASE}/artists/${safeEncodeParam(artistId)}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rating, comment }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || `Không thể gửi nhận xét (${res.status})`);
  }
  return res.json();
}

export async function replyArtistReview(
  artistId: string,
  reviewId: number,
  reply: string
): Promise<ArtistReview> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Vui lòng đăng nhập");

  const res = await fetch(
    `${API_BASE}/artists/${safeEncodeParam(artistId)}/reviews/${reviewId}/reply`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reply }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || `Không thể phản hồi nhận xét (${res.status})`);
  }
  return res.json();
}


