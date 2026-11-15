import { getValidAccessToken } from "../auth/auth-client";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8088";
const ROOT = "/api/admin/karaoke";
export type ProcessingJob = {
  id: string; songId: string; title: string; artist: string; status: string; stage: string;
  assetVersion: string; sourceName: string; sourceType: string; createdBy: string;
  createdAt: string; startedAt?: string; finishedAt?: string; updatedAt?: string; publishedAt?: string; error?: string; cancelRequested: boolean;
  events?: { stage: string; at: string }[];
};
export type KaraokeVersion = {
  id?: string; songId: string; assetVersion: string; status: string; jobId?: string; createdAt?: string;
  publishedAt?: string; publishedBy?: string; createdBy?: string;
  source?: { filename?: string; durationSeconds?: number; sampleRate?: number };
  assets?: Record<string, { storageKey: string; bytes: number; sha256: string }>;
  scoringReference?: { status: string; warnings?: string[] };
  processing?: { modelFilename?: string; device?: string; totalSeconds?: number };
};
export type KaraokeResource = {
  songId: string; title: string; artist: string; imageUrl?: string; durationMs?: number;
  sourceAvailable: boolean; status: string; published?: KaraokeVersion; latestJob?: ProcessingJob;
};
export type ResourceList = {
  items: KaraokeResource[]; total: number; page: number; size: number; counts: Record<string, number>;
  worker: { online: boolean; heartbeatAt?: string; capacity?: { available: boolean; reason?: string; freeDiskBytes?: number; availableMemoryBytes?: number } };
};
export type ResourceDetail = { songId: string; title: string; artist: string; sourceAvailable: boolean; versions: KaraokeVersion[]; publishedVersion: string; jobs?: ProcessingJob[] };

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Phiên đăng nhập đã hết hạn.");
  const response = await fetch(`${BASE}${ROOT}${path}`, { ...options, cache: "no-store", headers: { ...options.headers, Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.detail || `Yêu cầu thất bại (${response.status}).`);
  }
  return response;
}
export async function listKaraokeResources(page: number, query = "", status = "all"): Promise<ResourceList> {
  return (await request(`/resources?${new URLSearchParams({ page: String(page), size: "20", query, status })}`)).json();
}
export async function getKaraokeResource(songId: string): Promise<ResourceDetail> { return (await request(`/resources/${songId}`)).json(); }
export async function listKaraokeJobs(page: number, status: "active" | "history"): Promise<{ items: ProcessingJob[]; total: number }> {
  return (await request(`/jobs?page=${page}&size=20&status=${status}`)).json();
}
export async function createKaraokeJob(songId: string, file?: File): Promise<ProcessingJob> {
  const form = new FormData(); form.set("songId", songId); if (file) form.set("file", file);
  return (await request("/jobs", { method: "POST", body: form })).json();
}
export async function cancelKaraokeJob(id: string) { await request(`/jobs/${id}/cancel`, { method: "POST" }); }
export async function retryKaraokeJob(id: string) { await request(`/jobs/${id}/retry`, { method: "POST" }); }
export async function publishKaraokeVersion(songId: string, version: string) { await request(`/resources/${songId}/versions/${version}/publish`, { method: "POST" }); }
export async function karaokeSourceBlob(songId: string, jobId?: string) {
  return (await request(`/resources/${songId}/source${jobId ? `?jobId=${encodeURIComponent(jobId)}` : ""}`)).blob();
}
export function karaokeAssetUrl(version: KaraokeVersion, role: string): string {
  const key = version.assets?.[role]?.storageKey;
  if (!key || !/^karaoke\/[a-f0-9]{24}\/[a-f0-9]{24}\/(instrumental\.wav|vocals\.wav|pitch_reference\.json)$/.test(key)) return "";
  return `https://moodify.click/${key}`;
}
