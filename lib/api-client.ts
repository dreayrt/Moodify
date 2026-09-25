// API Base URL - Luôn đảm bảo có tiền tố /api
const rawBase = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
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
export async function fetchTracks(options?: {
  page?: number;
  size?: number;
  query?: string;
  genre?: string;
}): Promise<TrackPageResponse> {
  const params = new URLSearchParams();
  
  if (options?.page !== undefined) params.set('page', options.page.toString());
  if (options?.size !== undefined) params.set('size', options.size.toString());
  if (options?.query) params.set('query', options.query);
  if (options?.genre) params.set('genre', options.genre);

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
 * Get streaming audio URL for a track
 */
export function getTrackStreamUrl(trackIdOrSpotifyId: string): string {
  return `${API_BASE}/tracks/${trackIdOrSpotifyId}/stream`;
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
  tier: "INDIVIDUAL" | "FAMILY" | "FREE";
  packageName: string;
  price?: number;
  daysRemaining: number;
  startAt?: string;
  expiresAt?: string;
  benefits: string[];
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

export async function devTogglePremium(
  enable: boolean,
  days: number = 30
): Promise<{ success: boolean; message: string; isPremium: boolean }> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/subscriptions/dev-toggle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ enable, days }),
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


