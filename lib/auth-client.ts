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
  status: string;
  createdAt: string;
  updatedAt: string;
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

export async function logout(refreshToken: string) {
  return requestJson<void>("/api/auth/logout", {
    body: { refreshToken },
  });
}

export async function getCurrentUser(accessToken: string) {
  return requestJson<UserProfileResponse>("/api/auth/me", {
    token: accessToken,
  });
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
  { body, token }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function extractErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {
      message?: string;
      error?: string;
    };
    return payload.message || payload.error || "Request failed";
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
