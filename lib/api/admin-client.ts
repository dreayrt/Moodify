import { getValidAccessToken } from "../auth/auth-client";
import {
  AdminUser,
  CatalogTrack,
  DistributionContract,
  Distributor,
  FavoriteLeaderboardItem,
  FavoriteRecord,
  PaymentTransaction,
  ReviewRequest,
  ServicePackage,
  SongLicense,
  UserDevice,
} from "../../features/dashboard/admin/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8088";

async function adminRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
  } = {}
): Promise<T> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error("Phiên đăng nhập quản trị viên đã hết hạn.");
  }

  const method = options.method ?? (options.body ? "POST" : "GET");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorMsg = `Yêu cầu thất bại với mã ${response.status}`;
    try {
      const errPayload = await response.json();
      errorMsg = errPayload.message || errPayload.error || errorMsg;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return (await response.json()) as T;
}

// 1. Overview KPI
export type AdminOverviewResponse = {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  artistUsers: number;
  moderatorUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  totalTracks: number;
  publishedTracks: number;
  pendingReviews: number;
  totalStreams: number;
  totalFavorites: number;
  topListenedTracks: {
    trackId: string;
    title: string;
    artist: string;
    coverUrl: string;
    duration: string;
    genre: string;
    audioUrl?: string;
    streamCount: number;
  }[];
  topFavoritedTracks: {
    trackId: string;
    title: string;
    artist: string;
    coverUrl: string;
    duration: string;
    genre: string;
    audioUrl?: string;
    favoriteCount: number;
  }[];
  listeningTrend: {
    date: string;
    label: string;
    streams: number;
  }[];
  recentActivities: {
    id: string;
    type: "PAYMENT" | "FAVORITE";
    title: string;
    detail: string;
    timestamp: string;
  }[];
};

export async function fetchAdminOverview(): Promise<AdminOverviewResponse> {
  return adminRequest<AdminOverviewResponse>("/api/admin/overview");
}

// 2. Users Management
export async function fetchAdminUsers(params?: {
  role?: string;
  status?: string;
  query?: string;
}): Promise<AdminUser[]> {
  const searchParams = new URLSearchParams();
  if (params?.role && params.role !== "ALL") searchParams.set("role", params.role);
  if (params?.status && params.status !== "ALL") searchParams.set("status", params.status);
  if (params?.query?.trim()) searchParams.set("query", params.query.trim());

  const qs = searchParams.toString();
  return adminRequest<AdminUser[]>(`/api/admin/users${qs ? `?${qs}` : ""}`);
}

export async function updateAdminUserStatus(
  userId: number,
  status: "ACTIVE" | "INACTIVE" | "BANNED",
  reason?: string
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/users/${userId}/status`,
    {
      method: "PATCH",
      body: { status, reason },
    }
  );
}

export async function updateAdminUserRole(
  userId: number,
  role: string,
  extra?: { staffCode?: string; artistSpotifyId?: string }
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/users/${userId}/role`,
    {
      method: "PATCH",
      body: {
        role,
        staffCode: extra?.staffCode,
        artistSpotifyId: extra?.artistSpotifyId,
      },
    }
  );
}

export async function resetAdminUserPassword(
  userId: number
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/users/${userId}/reset-password`,
    { method: "POST" }
  );
}

export async function updateAdminUserProfile(
  userId: number,
  data: { fullName?: string; email?: string; phone?: string }
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/users/${userId}`,
    {
      method: "PUT",
      body: data,
    }
  );
}

export async function createAdminUser(
  data: {
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    role: string;
    password?: string;
    status?: string;
  }
): Promise<{ success: boolean; message: string; user?: AdminUser }> {
  return adminRequest<{ success: boolean; message: string; user?: AdminUser }>(
    `/api/admin/users`,
    {
      method: "POST",
      body: data,
    }
  );
}

export async function deleteAdminUser(
  userId: number
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/users/${userId}`,
    { method: "DELETE" }
  );
}

export async function fetchAdminUserDevices(
  userId: number
): Promise<UserDevice[]> {
  return adminRequest<UserDevice[]>(`/api/admin/users/${userId}/devices`);
}

export async function revokeAdminDevice(
  deviceId: number
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/devices/${deviceId}/revoke`,
    { method: "PATCH" }
  );
}

// 3. Tracks & Catalog (MongoDB)
export async function fetchAdminCatalog(params?: {
  query?: string;
  status?: string;
}): Promise<CatalogTrack[]> {
  const searchParams = new URLSearchParams();
  if (params?.query?.trim()) searchParams.set("query", params.query.trim());
  if (params?.status && params.status !== "ALL") searchParams.set("status", params.status);

  const qs = searchParams.toString();
  return adminRequest<CatalogTrack[]>(`/api/admin/tracks${qs ? `?${qs}` : ""}`);
}

export async function takedownAdminTrack(
  trackId: string
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/tracks/${trackId}/takedown`,
    { method: "PATCH" }
  );
}

export async function restoreAdminTrack(
  trackId: string
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/tracks/${trackId}/restore`,
    { method: "PATCH" }
  );
}

// 4. Content Moderation
export async function fetchAdminModerationQueue(): Promise<ReviewRequest[]> {
  return adminRequest<ReviewRequest[]>("/api/admin/moderation");
}

export async function submitAdminReviewDecision(
  requestId: number,
  action: "APPROVE" | "REJECT" | "RETURN_FOR_EDIT",
  reason?: string
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/moderation/${requestId}/decision`,
    {
      method: "POST",
      body: { action, reason },
    }
  );
}

// 5. Monetization & Packages
export async function fetchAdminPackages(): Promise<ServicePackage[]> {
  return adminRequest<ServicePackage[]>("/api/admin/packages");
}

export async function updateAdminPackagePrice(
  packageId: number,
  price: number
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/packages/${packageId}/price`,
    {
      method: "PUT",
      body: { price },
    }
  );
}

export async function createAdminPackage(
  data: Partial<ServicePackage>
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/packages`,
    {
      method: "POST",
      body: data,
    }
  );
}

export async function updateAdminPackageDetails(
  packageId: number,
  data: Partial<ServicePackage>
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/packages/${packageId}`,
    {
      method: "PUT",
      body: data,
    }
  );
}

export async function toggleAdminPackageStatus(
  packageId: number
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/packages/${packageId}/status`,
    { method: "PATCH" }
  );
}

export async function deleteAdminPackage(
  packageId: number
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/packages/${packageId}`,
    { method: "DELETE" }
  );
}

export async function fetchAdminTransactions(): Promise<PaymentTransaction[]> {
  return adminRequest<PaymentTransaction[]>("/api/admin/transactions");
}

export async function refundAdminTransaction(
  transactionId: number
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/transactions/${transactionId}/refund`,
    { method: "POST" }
  );
}

// 6. Licensing & Distributors
export type AdminLicensingResponse = {
  distributors: Distributor[];
  contracts: DistributionContract[];
  licenses: SongLicense[];
};

export async function fetchAdminLicensing(): Promise<AdminLicensingResponse> {
  return adminRequest<AdminLicensingResponse>("/api/admin/licensing");
}


// 8. Favorites Management
export type AdminFavoritesResponse = {
  items: FavoriteRecord[];
  total: number;
  page: number;
  size: number;
  type: string;
};

export async function fetchAdminFavorites(params?: {
  type?: "SONG" | "ARTIST" | "ALBUM";
  query?: string;
  page?: number;
  size?: number;
}): Promise<AdminFavoritesResponse> {
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  if (params?.query) q.set("query", params.query);
  if (params?.page !== undefined) q.set("page", String(params.page));
  if (params?.size !== undefined) q.set("size", String(params.size));
  const qs = q.toString();
  return adminRequest<AdminFavoritesResponse>(`/api/admin/favorites${qs ? `?${qs}` : ""}`);
}

export async function fetchAdminFavoritesLeaderboard(): Promise<FavoriteLeaderboardItem[]> {
  return adminRequest<FavoriteLeaderboardItem[]>("/api/admin/favorites/leaderboard");
}

export async function deleteAdminFavorite(
  id: number
): Promise<{ success: boolean; message: string }> {
  return adminRequest<{ success: boolean; message: string }>(
    `/api/admin/favorites/${id}`,
    {
      method: "DELETE",
    }
  );
}
