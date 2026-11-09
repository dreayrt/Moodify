import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync(new URL("../lib/lyrics-import.ts", import.meta.url), "utf8");
const exports = {};
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports, TextDecoder });
const { parseLyricsContent, readLyricsFile, MAX_LYRICS_FILE_SIZE } = exports;

test("plain Vietnamese lyrics retain line breaks and stanzas", () => {
  const parsed = parseLyricsContent("\uFEFFÔi hóa ra là người say\r\n\r\nKhóc rất nhiều\r\n");
  assert.equal(parsed.lyricsPlain, "Ôi hóa ra là người say\n\nKhóc rất nhiều");
  assert.equal(parsed.lyricsSynced, "");
});

test("LRC produces readable lyrics and preserves precise playback times", () => {
  const parsed = parseLyricsContent("[ti:Bài hát]\n[00:13.80]Ôi hóa ra là người say\n[01:04.8]Lần này anh buông");
  assert.equal(parsed.lyricsPlain, "Ôi hóa ra là người say\nLần này anh buông");
  assert.equal(parsed.lyricsSynced, "[00:13.800]Ôi hóa ra là người say\n[01:04.800]Lần này anh buông");
});

test("repeated timestamps and offsets are expanded in chronological order", () => {
  const parsed = parseLyricsContent("[offset:-200]\n[01:02.123][00:02.00]Điệp khúc\n[00:00.10]Mở đầu\n[00:05.00]");
  assert.equal(parsed.lyricsSynced, "[00:00.000]Mở đầu\n[00:01.800]Điệp khúc\n[00:04.800]\n[01:01.923]Điệp khúc");
  assert.equal(parsed.lyricsPlain, "Điệp khúc\nMở đầu");
});

test("file import validates type, size, content, encoding, and LRC timestamps", async () => {
  const file = (name, content) => new File([content], name);
  for (const [input, error] of [
    [file("lyrics.pdf", "hello"), "lyricsInvalidType"],
    [file("lyrics.txt", "x".repeat(MAX_LYRICS_FILE_SIZE + 1)), "lyricsTooLarge"],
    [file("lyrics.txt", " \n"), "lyricsEmpty"],
    [file("lyrics.lrc", "plain lyrics"), "lyricsInvalidLrc"],
    [file("lyrics.lrc", "[00:99.00]Bad time"), "lyricsInvalidLrc"],
    [file("lyrics.lrc", "[ar:Artist]"), "lyricsEmpty"],
    [file("lyrics.txt", new Uint8Array([0xff, 0xfe])), "lyricsReadError"],
    [file("lyrics.txt", "binary\0data"), "lyricsReadError"],
  ]) await assert.rejects(readLyricsFile(input), { message: error });
  const imported = await readLyricsFile(file("LYRICS.LRC", "[00:13.80]Ôi hóa ra là người say"));
  assert.equal(imported.lyrics.lyricsPlain, "Ôi hóa ra là người say");
  assert.equal(imported.lyrics.lyricsSynced, "[00:13.800]Ôi hóa ra là người say");
});
