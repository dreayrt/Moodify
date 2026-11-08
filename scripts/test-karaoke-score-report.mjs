import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
function compile(relative, customRequire = require) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: customRequire });
  return exports;
}
const duration = compile("../features/dashboard/karaoke/score-duration-summary.ts");
const Details = compile("../features/dashboard/karaoke/components/karaoke-score-details.tsx", id => {
  if (id === "../score-duration-summary") return duration;
  if (id.endsWith(".module.css")) return {};
  return require(id);
}).default;
const result = {
  status: "completed", scoring_version: "pitch-rhythm-v5-easy40",
  score: { overall: 75, pitch: 64.93, rhythm: 71.7, coverage: 82.36 },
  diagnostics: { reference_duration_seconds: 240.8985941043084, recording_duration_seconds: 240.8986394557823,
    reference_voiced_seconds: 113.592, paired_voiced_seconds: 69.915, recording_voiced_seconds: 103.886,
    recording_start_offset_ms: 0, pitch_accuracy_when_detected: 33.97 },
};
const solo = renderToStaticMarkup(React.createElement(Details, { result, mode: "solo" }));
assert.ok(!solo.includes("Chấm giải trí") && !solo.includes("Độ khó 40%"));
assert.ok(!solo.includes("debug") && !solo.includes("<details") && !solo.includes("<button"));
assert.ok(solo.includes("100.0% thời gian bài") && solo.includes("64.9") && solo.includes("71.7") && solo.includes("82.4"));
const room = renderToStaticMarkup(React.createElement(Details, { result, mode: "room" }));
assert.ok(!room.includes("thời gian bài") && !room.includes("debug") && !room.includes("Độ khó") && room.includes("82.4"));
console.log("4 karaoke score presentation checks passed");
