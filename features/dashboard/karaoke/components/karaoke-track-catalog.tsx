"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { fetchKaraokeTracks, type KaraokeTrackSummary } from "@/lib/api-client";
import styles from "./karaoke-track-catalog.module.css";

type Props = {
  selectedSongId: string | null;
  onSelect: (track: KaraokeTrackSummary) => void;
  pageSize?: number;
  autoSelectFirst?: boolean;
  compact?: boolean;
};

function formatDuration(durationMs: number | null): string {
  if (!durationMs || durationMs < 0) return "--:--";
  const seconds = Math.floor(durationMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function getInitials(title: string): string {
  return (
    title
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toLocaleUpperCase("vi-VN") || "♫"
  );
}

function safeImageUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export default function KaraokeTrackCatalog({
  selectedSongId,
  onSelect,
  pageSize = 8,
  autoSelectFirst = true,
  compact = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{
    content: KaraokeTrackSummary[];
    totalElements: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        setError("");
        fetchKaraokeTracks({
          query: query.trim(),
          page,
          size: pageSize,
          signal: controller.signal,
        })
          .then(setResult)
          .catch((reason: unknown) => {
            if (!controller.signal.aborted) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : "Không thể tải danh sách bài Karaoke.",
              );
              setResult(null);
            }
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      query ? 250 : 0,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, pageSize, query]);

  useEffect(() => {
    const firstTrack = result?.content[0];
    if (autoSelectFirst && !selectedSongId && firstTrack) onSelect(firstTrack);
  }, [autoSelectFirst, onSelect, result, selectedSongId]);

  const countLabel = `${result?.totalElements ?? 0} bài hát`;

  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(0);
  };

  return (
    <section
      className={`${styles.catalog} ${compact ? styles.compact : ""}`}
      aria-label="Danh sách bài hát karaoke"
    >
      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Search size={16} aria-hidden="true" />
          <span className={styles.visuallyHidden}>Tìm bài hát hoặc ca sĩ</span>
          <input
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Tìm bài hát, ca sĩ..."
          />
        </label>
        <span className={styles.count}>
          {loading ? "Đang tải..." : countLabel}
        </span>
      </div>

      {error && (
        <div className={styles.state} role="alert">
          {error}
        </div>
      )}
      {!error && loading && !result && (
        <div className={styles.state} role="status">
          Đang tải kho bài hát Karaoke...
        </div>
      )}
      {!error && !loading && result?.content.length === 0 && (
        <div className={styles.state} role="status">
          Không tìm thấy bài Karaoke phù hợp.
        </div>
      )}

      {result?.content.length ? (
        <div className={styles.trackGrid} aria-busy={loading}>
          {result.content.map((track, index) => {
            const selected = selectedSongId === track.songId;
            const initials = getInitials(track.title);
            const coverUrl = safeImageUrl(track.imageUrl);
            return (
              <button
                className={`${styles.track} ${selected ? styles.selected : ""}`}
                type="button"
                key={track.songId}
                aria-pressed={selected}
                onClick={() => onSelect(track)}
              >
                <span className={styles.trackNumber}>
                  {String(page * pageSize + index + 1).padStart(2, "0")}
                </span>
                <span
                  className={styles.cover}
                  role="img"
                  aria-label={`Ảnh bìa ${track.title}`}
                  style={
                    coverUrl
                      ? {
                          backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.22)), url(${JSON.stringify(coverUrl)})`,
                        }
                      : undefined
                  }
                >
                  {!coverUrl && <span>{initials}</span>}
                </span>
                <span className={styles.trackCopy}>
                  <strong title={track.title}>{track.title}</strong>
                  <span title={track.artist}>
                    {track.artist || "Chưa rõ nghệ sĩ"}
                  </span>
                </span>
                <span className={styles.trackMeta}>
                  <span className={styles.duration}>
                    {formatDuration(track.durationMs)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {(result?.totalPages ?? 0) > 1 && (
        <nav
          className={styles.pagination}
          aria-label="Phân trang danh sách bài hát"
        >
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0 || loading}
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} /> Trước
          </button>
          <span>
            Trang {page + 1} / {result?.totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((current) =>
                Math.min((result?.totalPages ?? 1) - 1, current + 1),
              )
            }
            disabled={page + 1 >= (result?.totalPages ?? 1) || loading}
            aria-label="Trang tiếp"
          >
            Tiếp <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </section>
  );
}
