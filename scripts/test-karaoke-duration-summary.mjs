import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync(new URL("../features/dashboard/karaoke/score-duration-summary.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exports = {};
vm.runInNewContext(output, { exports });
const summary = diagnostics => exports.scoreDurationSummary({ status: "completed", score: null, diagnostics });
const report = summary({ reference_duration_seconds: 240.8985941043084, recording_duration_seconds: 240.8986394557823,
  reference_voiced_seconds: 113.592, paired_voiced_seconds: 69.915, recording_start_offset_ms: 0 });
assert.equal(report.captured_song_percent, 100);
assert.ok(Math.abs(report.pitch_detection_overlap_percent - 61.55) < 0.01);
assert.equal(summary({ reference_duration_seconds: 100, recording_duration_seconds: 70, recording_start_offset_ms: 30000 }).captured_song_percent, 70);
assert.equal(summary({ reference_duration_seconds: 100, recording_duration_seconds: 100, recording_start_offset_ms: -10000 }).captured_song_percent, 90);
assert.equal(summary({ reference_duration_seconds: 100, recording_duration_seconds: 100, capture_latency_ms: 500 }).captured_song_percent, 100);
assert.equal(summary({ reference_duration_seconds: 100, recording_duration_seconds: 0 }).captured_song_percent, 0);
assert.equal(summary({ reference_duration_seconds: 0, recording_duration_seconds: 100 }).captured_song_percent, undefined);
assert.equal(summary(undefined).captured_song_percent, undefined);
console.log("8 karaoke duration checks passed");
