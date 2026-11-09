export const MAX_LYRICS_FILE_SIZE = 1024 * 1024;

export type LyricsContent = {
  lyricsPlain: string;
  lyricsSynced: string;
};

/** Keep readable lyrics separate from the timestamped version used by the player. */
export function parseLyricsContent(content: string): LyricsContent {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  const lines = normalized.split("\n");
  const offset = Number(normalized.match(/^\[offset:([+-]?\d+)\]\s*$/im)?.[1] || 0);
  const timed: Array<{ milliseconds: number; text: string }> = [];
  const plain: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[[a-z]+:.*\]$/i.test(trimmed)) continue;
    const prefix = trimmed.match(/^(?:\[\d{1,2}:[0-5]\d(?:\.\d{1,3})?\])+/)?.[0];
    if (!prefix) {
      if (/^\[\d+:/.test(trimmed)) throw new Error("lyricsInvalidLrc");
      plain.push(line);
      continue;
    }
    const text = trimmed.slice(prefix.length).trim();
    if (/^\[\d+:/.test(text)) throw new Error("lyricsInvalidLrc");
    if (text) plain.push(text);
    for (const stamp of prefix.matchAll(/\[(\d+):(\d{2})(?:\.(\d{1,3}))?\]/g)) {
      const milliseconds = Math.max(0,
        Number(stamp[1]) * 60000 + Number(stamp[2]) * 1000 +
        Number((stamp[3] || "").padEnd(3, "0")) + offset);
      timed.push({ milliseconds, text });
    }
  }

  const lyricsSynced = timed.sort((a, b) => a.milliseconds - b.milliseconds).map(({ milliseconds, text }) => {
    const minutes = Math.floor(milliseconds / 60000).toString().padStart(2, "0");
    const seconds = Math.floor(milliseconds % 60000 / 1000).toString().padStart(2, "0");
    const fraction = (milliseconds % 1000).toString().padStart(3, "0");
    return `[${minutes}:${seconds}.${fraction}]${text}`;
  }).join("\n");

  return { lyricsPlain: plain.join("\n").trim(), lyricsSynced };
}

export async function readLyricsFile(file: File): Promise<{ content: string; lyrics: LyricsContent }> {
  if (!/\.(txt|lrc)$/i.test(file.name)) throw new Error("lyricsInvalidType");
  if (file.size > MAX_LYRICS_FILE_SIZE) throw new Error("lyricsTooLarge");
  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    throw new Error("lyricsReadError");
  }
  content = content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!content) throw new Error("lyricsEmpty");
  if (content.includes("\0")) throw new Error("lyricsReadError");
  const lyrics = parseLyricsContent(content);
  if (!lyrics.lyricsPlain) throw new Error("lyricsEmpty");
  if (/\.lrc$/i.test(file.name) && !lyrics.lyricsSynced) throw new Error("lyricsInvalidLrc");
  return { content, lyrics };
}
