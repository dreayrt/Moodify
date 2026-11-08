import { getValidAccessToken } from "@/lib/auth-client";
import { getCurrentDeviceUuid } from "@/lib/auth/device-helper";
import type { Track, Playlist } from "@/lib/api-client";
import type { PlayerTrack } from "@/components/dashboard/player-context";

const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8088").replace(/\/$/, "");
const API = base.endsWith("/api") ? base : `${base}/api`;

export type RecommendationEntity = "TRACK" | "PLAYLIST" | "PERSONALIZED_PLAYLIST";
export type RecommendationItem = {
  itemId: string; entityType: RecommendationEntity; entityId: string; versionId: string | null;
  title: string; subtitle: string | null; imageUrl: string | null; trackCount: number;
  reasonCode: string; reason: string; score: number; attributionToken: string; track: Track | null;
};
export type RecommendationHome = {
  requestId: string; generatedAt: string; expiresAt: string; modelVersion: string; policyVersion: string;
  coldStart: boolean; sections: { id: string; title: string; description: string; items: RecommendationItem[] }[];
};
export type PersonalizedMix = {
  id: string; mixType: "DAILY_MIX" | "WEEKLY_DISCOVERY" | "TREND_FOR_YOU";
  name: string; description: string; imageUrl: string | null; versionId: string;
  generatedAt: string; refreshDueAt: string; trackCount: number; tracks: Track[]; modelVersion: string;
};
export type PlaybackQueue = {
  queueId: string; entityType: RecommendationEntity; entityId: string; versionId: string | null;
  expiresAt: string; tracks: { track: Track; queueToken: string; position: number }[];
};

export class RecommendationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function recommendationRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getValidAccessToken();
  if (!token) throw new RecommendationError(401, "Vui lòng đăng nhập để xem gợi ý của bạn.");
  const response = await fetch(`${API}${path}`, {
    ...options, cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`,
      "X-Device-Uuid": getCurrentDeviceUuid(), ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = response.status === 503 ? "Gợi ý cá nhân đang được chuẩn bị. Bạn vẫn có thể nghe nhạc từ thư viện." :
      response.status === 429 ? "Bạn vừa làm mới bản phối. Hãy thử lại sau vài phút." :
      response.status === 404 ? "Nội dung này không còn khả dụng hoặc bạn chưa có quyền xem." :
      body.message || "Chưa thể tải nội dung. Vui lòng thử lại.";
    throw new RecommendationError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export const fetchRecommendationHome = (signal?: AbortSignal) => recommendationRequest<RecommendationHome>("/recommendations/home", { signal });
export const fetchPersonalizedMix = (id: string) => recommendationRequest<PersonalizedMix>(`/me/personalized-playlists/${encodeURIComponent(id)}`);
export const refreshPersonalizedMix = (id: string) => recommendationRequest<PersonalizedMix>(`/me/personalized-playlists/${encodeURIComponent(id)}/refresh`, { method: "POST" });
export const copyPersonalizedMix = (id: string, versionId: string, requestId: string) => recommendationRequest<Playlist>(
  `/me/personalized-playlists/${encodeURIComponent(id)}/copies`, { method: "POST", body: JSON.stringify({ versionId, requestId }) });
export const fetchPlaylistContinuation = (id: string) => recommendationRequest<RecommendationHome>(`/recommendations/playlist-continuation?playlistId=${encodeURIComponent(id)}`);
export const recommendationFeedback = (item: Pick<RecommendationItem, "entityType" | "entityId">, enabled: boolean) => recommendationRequest<{ success: boolean }>(
  "/recommendations/feedback", { method: "PUT", body: JSON.stringify({ entityType: item.entityType, entityId: item.entityId, feedbackType: item.entityType === "TRACK" ? "NOT_INTERESTED" : "HIDE", enabled }) });

export const createRecommendationQueue = (item: Pick<RecommendationItem, "entityType" | "entityId" | "versionId"> & { attributionToken?: string }) =>
  recommendationRequest<PlaybackQueue>("/playback/queues", { method: "POST", body: JSON.stringify({ entityType: item.entityType,
    entityId: item.entityId, versionId: item.versionId, attributionToken: item.attributionToken }) });

export function queuePlayerTracks(queue: PlaybackQueue): PlayerTrack[] {
  return queue.tracks.map(({ track, queueToken }) => ({ ...track, spotifyId: track.spotifyId || track.id,
    playbackContext: { source: queue.entityType === "TRACK" ? "HOME" : "PLAYLIST",
      sourceId: queue.entityType === "TRACK" ? undefined : queue.entityId, queueToken, expiresAt: queue.expiresAt } }));
}

export function rememberRecommendation(item: RecommendationItem) {
  try { sessionStorage.setItem(`moodify_recommendation_${item.itemId}`, JSON.stringify({ item, savedAt: Date.now() })); }
  catch { /* Opening directly remains supported without attribution. */ }
}
export function recalledRecommendation(itemId: string | null): RecommendationItem | null {
  if (!itemId) return null;
  try {
    const stored = JSON.parse(sessionStorage.getItem(`moodify_recommendation_${itemId}`) || "null");
    return stored && Date.now() - stored.savedAt < 25 * 60_000 ? stored.item : null;
  } catch { return null; }
}

type QueuedEvent = { eventId: string; eventType: "IMPRESSION" | "OPEN"; attributionToken: string; occurredAt: string; attempts: number };
let pending: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let flushing = false;

async function flushEvents() {
  timer = undefined;
  if (flushing || pending.length === 0) return;
  flushing = true;
  const batch = pending.splice(0, 50);
  try {
    await recommendationRequest("/recommendations/events", { method: "POST", keepalive: true,
      body: JSON.stringify({ events: batch.map(event => ({ eventId: event.eventId, eventType: event.eventType,
        attributionToken: event.attributionToken, occurredAt: event.occurredAt })) }) });
  } catch (error) {
    if (!(error instanceof RecommendationError) || error.status >= 500) {
      pending = [...batch.filter(e => e.attempts < 2).map(e => ({ ...e, attempts: e.attempts + 1 })), ...pending].slice(0, 100);
    }
  } finally {
    flushing = false;
    if (pending.length && !timer) timer = setTimeout(flushEvents, 5000);
  }
}

export function recordRecommendationEvent(item: RecommendationItem, type: "IMPRESSION" | "OPEN") {
  pending.push({ eventId: crypto.randomUUID(), eventType: type, attributionToken: item.attributionToken,
    occurredAt: new Date().toISOString(), attempts: 0 });
  if (!timer) timer = setTimeout(flushEvents, 500);
}
