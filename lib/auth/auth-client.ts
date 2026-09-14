export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  userId: number;
  fullName: string;
  email: string;
  username: string;
  role: string;
  status: string;
};

export type UserProfileResponse = {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  artistSpotifyId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ArtistProfileResponse = {
  id: string;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  followers: number | null;
  popularity: number | null;
  genres: string[] | null;
  genresRaw: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ArtistTrackResponse = {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  genre: string;
  duration: string;
  status: "draft" | "published" | "scheduled";
  visibility: "public" | "private" | "unlisted";
  plays: number;
  likes: number;
  commentsCount: number;
  bpm: number | null;
  key: string | null;
  coverUrl: string | null;
  audioUrl: string | null;
  spotifyUrl: string | null;
  downloadStatus: string | null;
  moderationStatus: string | null;
  moderationScore: number | null;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ArtistAlbumResponse = {
  id: string;
  spotifyId: string;
  name: string;
  artistName: string;
  artistSpotifyId: string;
  imageUrl: string | null;
  releaseDate: string | null;
  totalTracks: number | null;
  downloadedTracksCount: number | null;
  fullyDownloaded: boolean | null;
  trackIds: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ArtistCatalogResponse = {
  artist: ArtistProfileResponse;
  tracks: ArtistTrackResponse[];
  albums: ArtistAlbumResponse[];
  page: number;
  size: number;
  totalTracks: number;
  totalTrackPages: number;
};

export type StoredAuthSession = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8080";

const STORAGE_KEY = "moodify.auth.session";

type RequestOptions = {
  body?: unknown;
  keepalive?: boolean;
  method?: "GET" | "POST";
  token?: string;
};

export function getStoredAuthSession(): StoredAuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredAuthSession;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuthSession(auth: AuthResponse) {
  if (typeof window === "undefined") {
    return;
  }

  const now = Date.now();
  const session: StoredAuthSession = {
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    accessTokenExpiresAt: now + auth.expiresIn * 1000,
    refreshTokenExpiresAt: now + auth.refreshExpiresIn * 1000,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}


//main auth functions
export async function login(payload: { identifier: string; password: string }) {
  return requestJson<AuthResponse>("/api/auth/login", {
    body: payload,
  });
}

export async function register(payload: {
  fullName: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  role?: string;
  avatarUrl?: string;
  stageName?: string;
}) {
  return requestJson<AuthResponse>("/api/auth/register", {
    body: payload,
  });
}

export async function refresh(refreshToken: string) {
  return requestJson<AuthResponse>("/api/auth/refresh", {
    body: { refreshToken },
  });
}

export async function logout(refreshToken?: string) {
  const session = getStoredAuthSession();
  const token = session?.accessToken;
  const tokenToRevoke = refreshToken ?? session?.refreshToken;

  console.log("[AuthClient] 🚀 Calling logout API:", {
    token: token ? `${token.slice(0, 15)}...` : null,
    refreshToken: tokenToRevoke ? `${tokenToRevoke.slice(0, 15)}...` : null,
  });

  return requestJson<void>("/api/auth/logout", {
    keepalive: true,
    method: "POST",
    token,
    body: tokenToRevoke ? { refreshToken: tokenToRevoke } : undefined,
  });
}

export async function uploadAvatar(
  accessToken: string,
  file: File,
): Promise<UserProfileResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const fullUrl = `${API_BASE_URL}/api/auth/avatar`;
  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorMsg = await extractErrorMessage(response);
    throw new Error(errorMsg);
  }

  return (await response.json()) as UserProfileResponse;
}

export async function getCurrentUser(accessToken: string) {
  return requestJson<UserProfileResponse>("/api/auth/me", {
    token: accessToken,
  });
}

export async function getCurrentArtistCatalog(
  accessToken: string,
  params: { page?: number; size?: number; query?: string } = {},
) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page ?? 0));
  searchParams.set("size", String(params.size ?? 50));
  if (params.query?.trim()) {
    searchParams.set("query", params.query.trim());
  }

  return requestJson<ArtistCatalogResponse>(
    `/api/artists/me/catalog?${searchParams.toString()}`,
    { token: accessToken },
  );
}

export async function getValidAccessToken(): Promise<string | null> {
  const session = getStoredAuthSession();
  if (!session) {
    return null;
  }

  const now = Date.now();
  if (session.accessTokenExpiresAt > now + 15_000) {
    return session.accessToken;
  }

  if (session.refreshTokenExpiresAt <= now) {
    clearAuthSession();
    return null;
  }

  try {
    const refreshed = await refresh(session.refreshToken);
    saveAuthSession(refreshed);
    return refreshed.accessToken;
  } catch {
    clearAuthSession();
    return null;
  }
}

async function requestJson<T>(
  path: string,
  { body, keepalive, method, token }: RequestOptions = {},
): Promise<T> {
  const fullUrl = `${API_BASE_URL}${path}`;
  const requestMethod = method ?? (body ? "POST" : "GET");

  console.log(`[RequestJson] 📡 Sending ${requestMethod} ${fullUrl}`, {
    hasToken: !!token,
    hasBody: !!body,
    body,
  });

  const response = await fetch(fullUrl, {
    keepalive,
    method: requestMethod,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  console.log(`[RequestJson] 📥 Response status:`, response.status, response.statusText);

  if (!response.ok) {
    const errorMsg = await extractErrorMessage(response);
    console.error(`[RequestJson] ❌ Request failed (${response.status}):`, errorMsg);
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

async function extractErrorMessage(response: Response) {
  try {
    const text = await response.text();
    if (!text) {
      return `Request failed with status ${response.status}`;
    }
    try {
      const payload = JSON.parse(text) as {
        message?: string;
        error?: string;
      };
      return payload.message || payload.error || text;
    } catch {
      return text;
    }
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
