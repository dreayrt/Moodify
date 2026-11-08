import type { KaraokeScoreResponse } from "@/lib/api-client";

export function scoreDurationSummary(result: KaraokeScoreResponse) {
  const d = result.diagnostics;
  const valid = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
  const song = valid(d?.reference_duration_seconds) ? d.reference_duration_seconds : undefined;
  const recording = valid(d?.recording_duration_seconds) ? d.recording_duration_seconds : undefined;
  const rawOffset = d?.recording_start_offset_ms;
  const start = typeof rawOffset === "number" && Number.isFinite(rawOffset) ? rawOffset / 1000 : 0;
  const covered = song !== undefined && song > 0 && recording !== undefined
    ? Math.max(0, Math.min(song, start + recording) - Math.max(0, start)) : undefined;
  const expected = d?.reference_voiced_seconds;
  const paired = d?.paired_voiced_seconds;
  return {
    song_seconds: song,
    recording_seconds: recording,
    captured_song_seconds: covered,
    captured_song_percent: covered !== undefined && song ? 100 * covered / song : undefined,
    pitch_detection_overlap_percent: valid(expected) && expected > 0 && valid(paired)
      ? Math.min(100, 100 * paired / expected) : undefined,
  };
}
