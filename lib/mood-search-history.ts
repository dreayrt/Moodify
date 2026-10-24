const PENDING_EMOTION_SEARCH_KEY = "moodify.pending-emotion-search-history";
const PENDING_EMOTION_SEARCH_EVENT = "moodify-emotion-search-submitted";
const MAX_PENDING_AGE_MS = 5 * 60 * 1000;

type PendingEmotionSearch = {
  keyword: string;
  createdAt: number;
};

export function queueEmotionSearchHistory(keyword: string): void {
  if (typeof window === "undefined") return;
  const normalized = keyword.trim();
  if (!normalized) return;

  const pending: PendingEmotionSearch = { keyword: normalized, createdAt: Date.now() };
  window.sessionStorage.setItem(PENDING_EMOTION_SEARCH_KEY, JSON.stringify(pending));
  window.dispatchEvent(new Event(PENDING_EMOTION_SEARCH_EVENT));
}

export function takePendingEmotionSearchHistory(keyword: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.sessionStorage.getItem(PENDING_EMOTION_SEARCH_KEY);
  if (!raw) return false;

  let pending: PendingEmotionSearch;
  try {
    pending = JSON.parse(raw) as PendingEmotionSearch;
  } catch {
    window.sessionStorage.removeItem(PENDING_EMOTION_SEARCH_KEY);
    return false;
  }

  if (
    typeof pending.keyword !== "string" ||
    typeof pending.createdAt !== "number" ||
    Date.now() - pending.createdAt > MAX_PENDING_AGE_MS
  ) {
    window.sessionStorage.removeItem(PENDING_EMOTION_SEARCH_KEY);
    return false;
  }
  if (pending.keyword !== keyword.trim()) return false;

  window.sessionStorage.removeItem(PENDING_EMOTION_SEARCH_KEY);
  return true;
}

export function onEmotionSearchSubmitted(listener: () => void): () => void {
  window.addEventListener(PENDING_EMOTION_SEARCH_EVENT, listener);
  return () => window.removeEventListener(PENDING_EMOTION_SEARCH_EVENT, listener);
}
