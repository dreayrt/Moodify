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
  albumName: string | null;
  featuredArtists: string | null;
  duration: string;
  status: "draft" | "published" | "scheduled";
  visibility: "public" | "private" | "unlisted";
  plays: number;
  likes: number;
  commentsCount: number;
  coverUrl: string | null;
  audioUrl: string | null;
  spotifyUrl: string | null;
  downloadStatus: string | null;
  moderationStatus: string | null;
  moderationScore: number | null;
  description: string | null;
  explicit: boolean;
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
const USER_STORAGE_KEY = "moodify.auth.user";

type RequestOptions = {
  body?: unknown;
  keepalive?: boolean;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
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

    // Auto synchronize cookies if not present yet
    if (typeof document !== "undefined" && !document.cookie.includes("moodify_token=")) {
      const userRaw = window.localStorage.getItem(USER_STORAGE_KEY);
      let role = "USER";
      if (userRaw) {
        try {
          const userObj = JSON.parse(userRaw);
          if (userObj.role) role = userObj.role;
        } catch {}
      }
      document.cookie = "moodify_token=" + encodeURIComponent(parsed.accessToken) + "; path=/; max-age=86400; SameSite=Lax";
      document.cookie = "moodify_role=" + encodeURIComponent(role) + "; path=/; max-age=86400; SameSite=Lax";
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
  window.localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({
      id: auth.userId,
      fullName: auth.fullName,
      email: auth.email,
      username: auth.username,
      role: auth.role,
      status: auth.status,
    }),
  );

  // Synchronize token and role with cookies for Next.js Middleware route protection
  const maxAge = auth.expiresIn || 86400;
  document.cookie = "moodify_token=" + encodeURIComponent(auth.accessToken) + "; path=/; max-age=" + maxAge + "; SameSite=Lax";
  document.cookie = "moodify_role=" + encodeURIComponent(auth.role) + "; path=/; max-age=" + maxAge + "; SameSite=Lax";
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);

  // Clear cookies for Next.js Middleware
  document.cookie = "moodify_token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "moodify_role=; path=/; max-age=0; SameSite=Lax";
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
  genres?: string[];
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

export async function uploadArtistTrack(
  formData: FormData,
  token?: string
): Promise<ArtistTrackResponse> {
  const validToken = token || (await getValidAccessToken());
  if (!validToken) {
    throw new Error("Phiên làm việc đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại tài khoản Nghệ sĩ.");
  }
  const fullUrl = `${API_BASE_URL}/api/artists/me/tracks`;
  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${validToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Phiên đăng nhập đã hết hạn hoặc tài khoản không có quyền Nghệ sĩ (ARTIST). Vui lòng đăng xuất và đăng nhập lại.");
    }
    const errorMsg = await extractErrorMessage(response);
    throw new Error(errorMsg);
  }

  return (await response.json()) as ArtistTrackResponse;
}

export async function updateArtistTrack(
  trackId: string,
  payload: {
    title: string;
    genre: string;
    featuredArtists?: string;
    albumName?: string;
    status: "draft" | "published" | "scheduled";
    visibility: "public" | "private" | "unlisted";
    explicit?: boolean;
    lyricsPlain?: string;
    description?: string;
  },
  token?: string,
): Promise<ArtistTrackResponse> {
  const validToken = token || (await getValidAccessToken());
  if (!validToken) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại tài khoản Nghệ sĩ.");
  }

  return requestJson<ArtistTrackResponse>(`/api/artists/me/tracks/${encodeURIComponent(trackId)}`, {
    method: "PATCH",
    token: validToken,
    body: payload,
  });
}

export async function deleteArtistTrack(trackId: string, token?: string): Promise<void> {
  const validToken = token || (await getValidAccessToken());
  if (!validToken) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại tài khoản Nghệ sĩ.");
  }

  return requestJson<void>(`/api/artists/me/tracks/${encodeURIComponent(trackId)}`, {
    method: "DELETE",
    token: validToken,
  });
}

export async function getModeratorQueue(token?: string) {
  const validToken = token || (await getValidAccessToken());
  if (!validToken) {
    throw new Error("Phiên đăng nhập kiểm duyệt đã hết hạn. Vui lòng đăng nhập lại.");
  }
  return requestJson<Record<string, unknown>[]>("/api/moderator/queue", {
    token: validToken,
  });
}

export async function getModeratorHistory(token?: string) {
  const validToken = token || (await getValidAccessToken());
  if (!validToken) {
    throw new Error("Phiên đăng nhập kiểm duyệt đã hết hạn. Vui lòng đăng nhập lại.");
  }
  return requestJson<Record<string, unknown>[]>("/api/moderator/history", {
    token: validToken,
  });
}

export async function submitModeratorDecision(
  payload: {
    trackId: string;
    actionType: "approve" | "reject" | "needs_revision";
    rejectionReason?: string;
    internalNote?: string;
    explicitTag?: boolean;
  },
  token?: string
) {
  const validToken = token || (await getValidAccessToken());
  if (!validToken) {
    throw new Error("Phiên đăng nhập kiểm duyệt đã hết hạn. Vui lòng đăng nhập lại.");
  }
  return requestJson<{ message: string }>("/api/moderator/decision", {
    token: validToken,
    body: payload,
  });
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
    console.warn(`[RequestJson] Request failed (${response.status}):`, errorMsg);
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
