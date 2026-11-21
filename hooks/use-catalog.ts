"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadCatalog, type CatalogSnapshot } from "@/lib/progressive-catalog";
import type { Track } from "@/lib/api-client";

export function useCatalog(genre?: string) {
  const [revision, setRevision] = useState(0);
  const key = `${genre ?? ""}:${revision}`;
  const [state, setState] = useState<CatalogSnapshot & { key: string; loading: boolean; error: boolean }>({
    key, tracks: [], total: 0, complete: false, loading: true, error: false,
  });
  const job = useRef<{ genre?: string; promise: Promise<Track[]>; signal: AbortSignal } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const promise = loadCatalog(genre, controller.signal, (next) => {
      if (!controller.signal.aborted) {
        setState({ ...next, key, loading: false, error: false });
      }
    });
    job.current = { genre, promise, signal: controller.signal };
    void promise.catch(() => {
      if (!controller.signal.aborted) setState((previous) => ({ ...(previous.key === key ? previous : { tracks: [], total: 0, complete: false }), key, error: true, loading: false }));
    });
    return () => controller.abort();
  }, [genre, key]);

  const ensureComplete = useCallback(async () => {
    const active = job.current;
    if (!active || active.genre !== genre) throw new DOMException("Catalog changed", "AbortError");
    const tracks = await active.promise;
    active.signal.throwIfAborted();
    if (job.current !== active) throw new DOMException("Catalog changed", "AbortError");
    return tracks;
  }, [genre]);
  const current = state.key === key ? state : { tracks: [], total: 0, complete: false, loading: true, error: false };
  return { ...current, ensureComplete, retry: () => setRevision((v) => v + 1) };
}
