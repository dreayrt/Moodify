"use client";

import type { KaraokeScoreResponse } from "@/lib/api-client";
import styles from "./karaoke-score-details.module.css";
import { scoreDurationSummary } from "../score-duration-summary";

function number(value: number | null | undefined, suffix = "", digits = 1) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) + suffix : "—";
}

export default function KaraokeScoreDetails({ result, mode }: {
  result: KaraokeScoreResponse;
  sessionId?: string;
  songId?: string;
  mode: "solo" | "room";
  capture?: unknown;
}) {
  const duration = scoreDurationSummary(result);

  return <div className={styles.root}>
    {result.score && <dl className={styles.scores}>
      {([
        ["Cao độ · 30%", result.score.pitch],
        ["Nhịp · 20%", result.score.rhythm],
        ["Điểm độ phủ · 50%", result.score.coverage],
      ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number(value)}<small>/100</small></dd></div>)}
    </dl>}
    {mode === "solo" && duration.captured_song_percent !== undefined && <p>Đã thu {number(duration.recording_seconds, " giây")} / bài {number(duration.song_seconds, " giây")} · Bao phủ {number(duration.captured_song_percent, "%")} thời gian bài.</p>}
    {!result.score && <p>Chưa đủ dữ liệu để chấm điểm{result.quality?.status === "insufficient_audio" ? ": tín hiệu thu bị vỡ tiếng quá nhiều." : result.quality?.status === "reference_unreliable" ? ": bản tham chiếu chưa đủ tin cậy." : "."}</p>}
  </div>;
}
