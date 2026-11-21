import { fetchTracks, type Track } from "@/lib/api-client";

export type CatalogSnapshot = { tracks: Track[]; total: number; complete: boolean };
const completed = new Map<string, { expires: number; snapshot: CatalogSnapshot }>();

// Cache only complete catalogs. Failed or cancelled pages must never shorten a queue.
export async function loadCatalog(
  genre: string | undefined,
  signal: AbortSignal,
  onProgress: (snapshot: CatalogSnapshot) => void,
): Promise<Track[]> {
  signal.throwIfAborted();
  const key = genre ?? "";
  const cached = completed.get(key);
  if (cached && cached.expires > Date.now()) {
    onProgress(cached.snapshot);
    return cached.snapshot.tracks;
  }
  const first = await fetchTracks({ genre, size: 100, signal });
  signal.throwIfAborted();
  if (genre && first.totalElements === 0) return loadCatalog(undefined, signal, onProgress);
  const tracks = [...first.content];
  onProgress({ tracks: [...tracks], total: first.totalElements, complete: first.totalPages <= 1 });
  // Two pages at a time keeps the initial route responsive and preserves API order.
  for (let page = 1; page < first.totalPages; page += 2) {
    const pages = await Promise.all(
      Array.from({ length: Math.min(2, first.totalPages - page) }, (_, offset) =>
        fetchTracks({ genre, page: page + offset, size: 100, signal })),
    );
    signal.throwIfAborted();
    for (const result of pages) tracks.push(...result.content);
    onProgress({ tracks: [...tracks], total: first.totalElements, complete: page + 2 >= first.totalPages });
  }
  const snapshot = { tracks, total: first.totalElements, complete: true };
  if (completed.size >= 8) completed.delete(completed.keys().next().value!);
  completed.set(key, { expires: Date.now() + 60_000, snapshot });
  return tracks;
}
